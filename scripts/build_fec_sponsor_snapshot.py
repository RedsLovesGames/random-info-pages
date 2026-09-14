#!/usr/bin/env python3
"""Build a current-cycle sponsor snapshot for Old Ass Politic from FEC bulk files.

This intentionally avoids the browser-facing OpenFEC DEMO_KEY. It joins current
members to their authorized committees, groups itemized individual contributions
by reported employer, and groups direct committee/PAC contributions by the
source FEC committee. The output is a compact JSON file consumed by the member
profile page.
"""

from __future__ import annotations

import datetime as dt
import io
import json
import os
import re
import sqlite3
import sys
import tempfile
import urllib.request
import zipfile
from collections import defaultdict
from pathlib import Path

YEAR = dt.datetime.now(dt.timezone.utc).year
CYCLE = YEAR if YEAR % 2 == 0 else YEAR + 1
BASE = f"https://www.fec.gov/files/bulk-downloads/{CYCLE}"
ROSTER_URL = "https://cdn.jsdelivr.net/gh/unitedstates/congress-legislators@73e2fcd181e1c48d1b0580d417e8d0314b22f7c9/legislators-current.json"
URLS = {
    "ccl": f"{BASE}/ccl{str(CYCLE)[-2:]}.zip",
    "cm": f"{BASE}/cm{str(CYCLE)[-2:]}.zip",
    "indiv": f"{BASE}/indiv{str(CYCLE)[-2:]}.zip",
    "pas2": f"{BASE}/pas2{str(CYCLE)[-2:]}.zip",
}

GENERIC_EMPLOYERS = {
    "", "NONE", "N/A", "NA", "UNKNOWN", "NOT APPLICABLE", "NOT EMPLOYED",
    "UNEMPLOYED", "RETIRED", "HOMEMAKER", "INFORMATION REQUESTED",
    "REQUESTED", "SELF", "SELF EMPLOYED", "SELF-EMPLOYED",
}
DIRECT_PAC_TYPES = {"24K", "24P", "24Z"}
ORG_TYPES = {
    "C": "Corporation", "L": "Labor organization", "M": "Membership organization",
    "T": "Trade association", "V": "Cooperative", "W": "Corporation without capital stock",
}
CMTE_TYPES = {
    "C": "Communication cost filer", "D": "Delegate committee", "E": "Electioneering communication filer",
    "H": "House campaign committee", "I": "Independent expenditor", "N": "PAC - nonqualified",
    "O": "Super PAC", "P": "Presidential campaign committee", "Q": "PAC - qualified",
    "S": "Senate campaign committee", "U": "Single-candidate independent expenditure",
    "V": "Hybrid PAC - nonqualified", "W": "Hybrid PAC - qualified", "X": "Party - nonqualified",
    "Y": "Party - qualified", "Z": "National party nonfederal account",
}


def fetch_bytes(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "OldAssPolitic-FEC-Snapshot/1.0"})
    with urllib.request.urlopen(req, timeout=180) as r:
        return r.read()


def download(url: str, dest: Path) -> None:
    print(f"Downloading {url}", flush=True)
    req = urllib.request.Request(url, headers={"User-Agent": "OldAssPolitic-FEC-Snapshot/1.0"})
    with urllib.request.urlopen(req, timeout=180) as r, dest.open("wb") as f:
        while True:
            chunk = r.read(1024 * 1024)
            if not chunk:
                break
            f.write(chunk)
    print(f"  {dest.stat().st_size / 1024 / 1024:.1f} MiB", flush=True)


def zip_text_lines(path: Path):
    with zipfile.ZipFile(path) as zf:
        names = [n for n in zf.namelist() if not n.endswith("/")]
        if not names:
            raise RuntimeError(f"No files inside {path}")
        # FEC bulk ZIPs normally contain one pipe-delimited text file.
        name = max(names, key=lambda n: zf.getinfo(n).file_size)
        with zf.open(name) as raw, io.TextIOWrapper(raw, encoding="latin-1", errors="replace", newline="") as text:
            for line in text:
                yield line.rstrip("\r\n").split("|")


def current_member_maps(roster):
    cand_to_bio = {}
    bio_meta = {}
    for x in roster:
        terms = x.get("terms") or []
        if not terms:
            continue
        term = terms[-1]
        chamber = "Senate" if term.get("type") == "sen" else "House"
        prefix = "S" if chamber == "Senate" else "H"
        fec = x.get("id", {}).get("fec") or []
        if isinstance(fec, str):
            fec = [fec]
        fec = [v for v in fec if isinstance(v, str) and v.startswith(prefix)]
        bio = x.get("id", {}).get("bioguide")
        if not bio:
            continue
        name = x.get("name", {}).get("official_full") or " ".join(
            str(x.get("name", {}).get(k) or "") for k in ("first", "middle", "last", "suffix")
        ).strip()
        bio_meta[bio] = {
            "name": name,
            "state": term.get("state") or "",
            "chamber": chamber,
            "district": None if chamber == "Senate" else term.get("district"),
            "candidate_ids": fec,
        }
        for cid in fec:
            cand_to_bio[cid] = bio
    return cand_to_bio, bio_meta


def normalize_employer(value: str):
    raw = re.sub(r"\s+", " ", (value or "").strip())
    key = raw.upper().replace("&AMP;", "&")
    key = re.sub(r"\s+", " ", key)
    if key in GENERIC_EMPLOYERS:
        return None
    if len(key) < 2:
        return None
    return key, raw


def to_float(value: str) -> float:
    try:
        return float(value or 0)
    except ValueError:
        return 0.0


def to_int(value: str) -> int:
    try:
        return int(value or 0)
    except ValueError:
        return 0


def main() -> int:
    out = Path(sys.argv[1] if len(sys.argv) > 1 else "oldasspolitic/member/fec-sponsors.json")
    out.parent.mkdir(parents=True, exist_ok=True)

    roster = json.loads(fetch_bytes(ROSTER_URL).decode("utf-8"))
    cand_to_bio, bio_meta = current_member_maps(roster)
    if len(bio_meta) < 500:
        raise RuntimeError(f"Current congressional roster unexpectedly small: {len(bio_meta)}")

    with tempfile.TemporaryDirectory(prefix="oap-fec-") as td:
        td = Path(td)
        files = {}
        for key, url in URLS.items():
            p = td / f"{key}.zip"
            download(url, p)
            files[key] = p

        # Candidate -> authorized/principal current-cycle committees.
        committee_to_bio = {}
        committees_by_bio = defaultdict(set)
        for row in zip_text_lines(files["ccl"]):
            if len(row) < 7:
                continue
            cand_id, _, fec_year, cmte_id, _, designation, _ = row[:7]
            bio = cand_to_bio.get(cand_id)
            if not bio or not cmte_id or designation not in {"A", "P"}:
                continue
            if fec_year and fec_year != str(CYCLE):
                continue
            committee_to_bio[cmte_id] = bio
            committees_by_bio[bio].add(cmte_id)

        # Committee metadata also gives a useful candidate linkage fallback.
        committee_meta = {}
        for row in zip_text_lines(files["cm"]):
            if len(row) < 15:
                continue
            cmte_id, cmte_name = row[0], row[1]
            designation, cmte_type = row[8], row[9]
            org_type, connected_org, cand_id = row[12], row[13], row[14]
            committee_meta[cmte_id] = {
                "name": cmte_name or cmte_id,
                "designation": designation,
                "committee_type_code": cmte_type,
                "committee_type": CMTE_TYPES.get(cmte_type, cmte_type or "Committee"),
                "organization_type_code": org_type,
                "organization_type": ORG_TYPES.get(org_type, ""),
                "connected_org": connected_org or "",
            }
            bio = cand_to_bio.get(cand_id)
            if bio and designation in {"A", "P"}:
                committee_to_bio.setdefault(cmte_id, bio)
                committees_by_bio[bio].add(cmte_id)

        print(f"Mapped {len(committee_to_bio)} authorized committees to {len(committees_by_bio)} current members", flush=True)

        db = sqlite3.connect(td / "fec.sqlite")
        db.executescript("""
            PRAGMA journal_mode=OFF;
            PRAGMA synchronous=OFF;
            PRAGMA temp_store=MEMORY;
            CREATE TABLE indiv (
              txkey TEXT PRIMARY KEY,
              bio TEXT NOT NULL,
              employer_key TEXT NOT NULL,
              employer_display TEXT NOT NULL,
              amount REAL NOT NULL,
              file_num INTEGER NOT NULL
            );
            CREATE TABLE pac (
              txkey TEXT PRIMARY KEY,
              bio TEXT NOT NULL,
              committee_id TEXT NOT NULL,
              amount REAL NOT NULL,
              file_num INTEGER NOT NULL
            );
        """)

        indiv_sql = """
            INSERT INTO indiv(txkey,bio,employer_key,employer_display,amount,file_num)
            VALUES(?,?,?,?,?,?)
            ON CONFLICT(txkey) DO UPDATE SET
              bio=excluded.bio,
              employer_key=excluded.employer_key,
              employer_display=excluded.employer_display,
              amount=excluded.amount,
              file_num=excluded.file_num
            WHERE excluded.file_num >= indiv.file_num
        """
        batch = []
        scanned = kept = 0
        for row in zip_text_lines(files["indiv"]):
            scanned += 1
            if len(row) < 21:
                continue
            cmte_id = row[0]
            bio = committee_to_bio.get(cmte_id)
            if not bio:
                continue
            employer = normalize_employer(row[11])
            amount = to_float(row[14])
            if not employer or amount <= 0:
                continue
            rpt_tp, pgi, tran_id, file_num, sub_id = row[2], row[3], row[16], to_int(row[17]), row[20]
            txkey = f"{cmte_id}|{rpt_tp}|{pgi}|{tran_id or sub_id}"
            batch.append((txkey, bio, employer[0], employer[1], amount, file_num))
            kept += 1
            if len(batch) >= 10000:
                db.executemany(indiv_sql, batch)
                batch.clear()
        if batch:
            db.executemany(indiv_sql, batch)
        db.commit()
        print(f"Individual records scanned {scanned:,}, relevant {kept:,}", flush=True)

        pac_sql = """
            INSERT INTO pac(txkey,bio,committee_id,amount,file_num)
            VALUES(?,?,?,?,?)
            ON CONFLICT(txkey) DO UPDATE SET
              bio=excluded.bio,
              committee_id=excluded.committee_id,
              amount=excluded.amount,
              file_num=excluded.file_num
            WHERE excluded.file_num >= pac.file_num
        """
        batch = []
        scanned = kept = 0
        for row in zip_text_lines(files["pas2"]):
            scanned += 1
            if len(row) < 22:
                continue
            tran_type = row[5]
            if tran_type not in DIRECT_PAC_TYPES:
                continue
            cand_id = row[16]
            bio = cand_to_bio.get(cand_id)
            if not bio:
                continue
            source_cmte = row[0]
            amount = to_float(row[14])
            if not source_cmte or amount <= 0:
                continue
            rpt_tp, pgi, tran_id, file_num, sub_id = row[2], row[3], row[17], to_int(row[18]), row[21]
            txkey = f"{source_cmte}|{cand_id}|{rpt_tp}|{pgi}|{tran_id or sub_id}"
            batch.append((txkey, bio, source_cmte, amount, file_num))
            kept += 1
            if len(batch) >= 10000:
                db.executemany(pac_sql, batch)
                batch.clear()
        if batch:
            db.executemany(pac_sql, batch)
        db.commit()
        print(f"Committee-to-candidate records scanned {scanned:,}, direct-support rows {kept:,}", flush=True)

        employers = defaultdict(list)
        for bio, key, display, amount, count in db.execute("""
            SELECT bio, employer_key, MAX(employer_display), SUM(amount), COUNT(*)
            FROM indiv
            GROUP BY bio, employer_key
            HAVING SUM(amount) > 0
            ORDER BY bio, SUM(amount) DESC
        """):
            if len(employers[bio]) < 100:
                employers[bio].append({"name": display or key, "amount": round(amount, 2), "count": count})

        pacs = defaultdict(list)
        for bio, cmte_id, amount, count in db.execute("""
            SELECT bio, committee_id, SUM(amount), COUNT(*)
            FROM pac
            GROUP BY bio, committee_id
            HAVING SUM(amount) > 0
            ORDER BY bio, SUM(amount) DESC
        """):
            if len(pacs[bio]) >= 100:
                continue
            meta = committee_meta.get(cmte_id, {})
            pacs[bio].append({
                "committee_id": cmte_id,
                "name": meta.get("name") or cmte_id,
                "amount": round(amount, 2),
                "count": count,
                "connected_org": meta.get("connected_org") or "",
                "organization_type": meta.get("organization_type") or "",
                "committee_type": meta.get("committee_type") or "Committee",
            })

        members = {}
        for bio, meta in bio_meta.items():
            emps = employers.get(bio, [])
            pcs = pacs.get(bio, [])
            if not emps and not pcs:
                continue
            members[bio] = {
                **meta,
                "committee_ids": sorted(committees_by_bio.get(bio, set())),
                "employers": emps,
                "pacs": pcs,
            }

        payload = {
            "generated_at": dt.datetime.now(dt.timezone.utc).isoformat(),
            "cycle": CYCLE,
            "member_count": len(members),
            "employer_group_count": sum(len(v["employers"]) for v in members.values()),
            "pac_group_count": sum(len(v["pacs"]) for v in members.values()),
            "members": members,
            "sources": {
                "roster": ROSTER_URL,
                "candidate_committee_linkages": URLS["ccl"],
                "committee_master": URLS["cm"],
                "individual_contributions": URLS["indiv"],
                "committee_candidate_activity": URLS["pas2"],
            },
            "methodology": {
                "employers": "Itemized individual contributions to current members' authorized committees, grouped by the employer reported by each donor.",
                "pacs": "Direct committee-to-candidate contribution transaction types 24K, 24P and 24Z from the FEC PAS2 bulk file, grouped by source committee.",
                "amendments": "For repeated electronic transaction IDs, the row from the highest FEC file number is retained before aggregation.",
            },
        }
        out.write_text(json.dumps(payload, separators=(",", ":"), ensure_ascii=False), encoding="utf-8")
        print(
            f"Wrote {out}: {len(members)} members, "
            f"{payload['employer_group_count']} employer groups, {payload['pac_group_count']} PAC groups",
            flush=True,
        )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
