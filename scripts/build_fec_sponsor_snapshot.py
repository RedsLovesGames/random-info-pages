#!/usr/bin/env python3
"""Build a current-cycle FEC sponsor/occupation snapshot for Old Ass Politic.

Sources:
- current Congress roster
- FEC candidate/committee linkage bulk data
- FEC committee master bulk data
- FEC individual contributions bulk data
- FEC committee-to-candidate transactions (PAS2)

The output powers member-level sponsor lists, profession/sector charts, and
expandable sponsor profiles with party splits and top recipients.
"""

from __future__ import annotations

import datetime as dt
import io
import json
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
ROSTER_URL = (
    "https://cdn.jsdelivr.net/gh/unitedstates/congress-legislators@"
    "73e2fcd181e1c48d1b0580d417e8d0314b22f7c9/legislators-current.json"
)
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
GENERIC_OCCUPATIONS = {
    "", "NONE", "N/A", "NA", "UNKNOWN", "NOT APPLICABLE", "INFORMATION REQUESTED",
    "REQUESTED", "RETIRED", "HOMEMAKER", "UNEMPLOYED",
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
SECTOR_RULES = [
    ("Healthcare", (
        "PHYSICIAN", "DOCTOR", "SURGEON", "NURSE", "DENTIST", "MEDICAL", "MEDICINE",
        "HEALTH", "HOSPITAL", "PHARM", "THERAP", "PSYCH", "CLINIC", "VETERIN",
    )),
    ("Legal", ("ATTORNEY", "LAWYER", "COUNSEL", "LAW FIRM", "LEGAL", "JUDGE")),
    ("Finance & insurance", (
        "FINANCE", "FINANCIAL", "BANK", "INVEST", "HEDGE", "PRIVATE EQUITY", "VENTURE",
        "BROKER", "WEALTH", "INSUR", "ACCOUNTANT", "CPA", "ASSET MANAGEMENT",
    )),
    ("Technology & engineering", (
        "SOFTWARE", "TECHNOLOGY", "TECH ", "ENGINEER", "COMPUTER", "DATA ", "DATA SCI",
        "CYBER", "SEMICONDUCTOR", "INFORMATION TECHNOLOGY", "PROGRAMMER", "DEVELOPER",
    )),
    ("Education & research", (
        "PROFESSOR", "TEACHER", "EDUCATION", "UNIVERSITY", "COLLEGE", "SCHOOL",
        "RESEARCH", "SCIENTIST", "ACADEMIC", "FACULTY",
    )),
    ("Real estate & construction", (
        "REAL ESTATE", "REALTOR", "PROPERTY", "CONSTRUCTION", "ARCHITECT",
        "HOME BUILDER", "CONTRACTOR",
    )),
    ("Government & public service", (
        "GOVERNMENT", "FEDERAL", "STATE OF ", "CITY OF ", "COUNTY", "PUBLIC SERVICE",
        "CIVIL SERVANT", "MILITARY", "ARMY", "NAVY", "AIR FORCE", "POLICE", "FIREFIGHT",
    )),
    ("Media, arts & entertainment", (
        "MEDIA", "JOURNALIST", "WRITER", "ARTIST", "ENTERTAINMENT", "FILM", "MUSIC",
        "ACTOR", "PUBLISH", "PRODUCER", "DIRECTOR",
    )),
    ("Energy & utilities", (
        "ENERGY", "OIL", "GAS", "PETROLEUM", "UTILITY", "UTILITIES", "ELECTRIC",
        "SOLAR", "WIND", "MINING", "POWER",
    )),
    ("Manufacturing & industrial", (
        "MANUFACTUR", "INDUSTRIAL", "FACTORY", "AUTOMOTIVE", "AEROSPACE", "CHEMICAL",
        "MACHIN", "STEEL",
    )),
    ("Retail, food & hospitality", (
        "RETAIL", "RESTAURANT", "HOSPITALITY", "HOTEL", "FOOD", "BEVERAGE", "GROCERY",
    )),
    ("Agriculture", ("FARM", "AGRICULT", "RANCH", "CROP", "LIVESTOCK")),
    ("Nonprofit & advocacy", (
        "NONPROFIT", "NON-PROFIT", "FOUNDATION", "CHARITY", "ADVOCACY", "NGO",
        "ASSOCIATION", "PUBLIC INTEREST",
    )),
    ("Transportation & logistics", (
        "TRANSPORT", "LOGISTICS", "AIRLINE", "PILOT", "TRUCK", "SHIPPING", "RAIL",
        "FREIGHT", "DELIVERY",
    )),
    ("Consulting & professional services", (
        "CONSULTANT", "CONSULTING", "ADVISOR", "ADVISORY", "MANAGEMENT CONSULT",
    )),
    ("Business & executives", (
        "CEO", "CHIEF EXECUTIVE", "PRESIDENT", "EXECUTIVE", "OWNER", "ENTREPRENEUR",
        "BUSINESS OWNER", "FOUNDER",
    )),
]


def fetch_bytes(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "OldAssPolitic-FEC-Snapshot/2.0"})
    with urllib.request.urlopen(req, timeout=180) as r:
        return r.read()


def download(url: str, dest: Path) -> None:
    print(f"Downloading {url}", flush=True)
    req = urllib.request.Request(url, headers={"User-Agent": "OldAssPolitic-FEC-Snapshot/2.0"})
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
        name = max(names, key=lambda n: zf.getinfo(n).file_size)
        with zf.open(name) as raw, io.TextIOWrapper(raw, encoding="latin-1", errors="replace", newline="") as text:
            for line in text:
                yield line.rstrip("\r\n").split("|")


def clean_party(value: str) -> str:
    value = (value or "").strip()
    if value.startswith("Democrat"):
        return "Democrat"
    if value.startswith("Republican"):
        return "Republican"
    return "Independent / other"


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
        party = clean_party(term.get("party") or "")
        bio_meta[bio] = {
            "name": name,
            "party": party,
            "state": term.get("state") or "",
            "chamber": chamber,
            "district": None if chamber == "Senate" else term.get("district"),
            "candidate_ids": fec,
        }
        for cid in fec:
            cand_to_bio[cid] = bio
    return cand_to_bio, bio_meta


def normalize_label(value: str, generic: set[str]):
    raw = re.sub(r"\s+", " ", (value or "").strip())
    key = raw.upper().replace("&AMP;", "&")
    key = re.sub(r"\s+", " ", key)
    if not key or key in generic or len(key) < 2:
        return None
    return key, raw


def sector_for(occupation: str, employer: str) -> str:
    text = f"{occupation or ''} {employer or ''}".upper()
    for sector, needles in SECTOR_RULES:
        if any(n in text for n in needles):
            return sector
    return "Other / unclassified"


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


def recipient_row(bio: str, amount: float, count: int, bio_meta: dict):
    meta = bio_meta.get(bio, {})
    return {
        "bioguide": bio,
        "name": meta.get("name") or bio,
        "party": meta.get("party") or "Independent / other",
        "chamber": meta.get("chamber") or "",
        "state": meta.get("state") or "",
        "district": meta.get("district"),
        "amount": round(amount, 2),
        "count": count,
    }


def finalize_profile(profile: dict) -> dict:
    total = profile.get("total", 0.0)
    parties = profile.get("party_totals", {})
    top = profile.get("top_recipients", [])
    return {
        **profile,
        "total": round(total, 2),
        "party_totals": {k: round(v, 2) for k, v in parties.items()},
        "recipient_count": profile.get("recipient_count", len(top)),
        "top5_share": round(
            100 * sum(r["amount"] for r in top[:5]) / total, 2
        ) if total > 0 else 0,
    }


def main() -> int:
    out = Path(sys.argv[1] if len(sys.argv) > 1 else "oldasspolitic/member/fec-sponsors.json")
    out.parent.mkdir(parents=True, exist_ok=True)

    roster = json.loads(fetch_bytes(ROSTER_URL).decode("utf-8"))
    cand_to_bio, bio_meta = current_member_maps(roster)
    if len(bio_meta) < 500:
        raise RuntimeError(f"Current congressional roster unexpectedly small: {len(bio_meta)}")

    with tempfile.TemporaryDirectory(prefix="oap-fec-") as td_raw:
        td = Path(td_raw)
        files = {}
        for key, url in URLS.items():
            p = td / f"{key}.zip"
            download(url, p)
            files[key] = p

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

        print(
            f"Mapped {len(committee_to_bio)} authorized committees to "
            f"{len(committees_by_bio)} current members",
            flush=True,
        )

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
              occupation_key TEXT NOT NULL,
              occupation_display TEXT NOT NULL,
              sector TEXT NOT NULL,
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
            CREATE INDEX indiv_bio_idx ON indiv(bio);
            CREATE INDEX indiv_employer_idx ON indiv(employer_key);
            CREATE INDEX indiv_occupation_idx ON indiv(occupation_key);
            CREATE INDEX pac_bio_idx ON pac(bio);
            CREATE INDEX pac_committee_idx ON pac(committee_id);
        """)

        indiv_sql = """
            INSERT INTO indiv(
              txkey,bio,employer_key,employer_display,occupation_key,
              occupation_display,sector,amount,file_num
            )
            VALUES(?,?,?,?,?,?,?,?,?)
            ON CONFLICT(txkey) DO UPDATE SET
              bio=excluded.bio,
              employer_key=excluded.employer_key,
              employer_display=excluded.employer_display,
              occupation_key=excluded.occupation_key,
              occupation_display=excluded.occupation_display,
              sector=excluded.sector,
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
            amount = to_float(row[14])
            if amount <= 0:
                continue
            employer = normalize_label(row[11], GENERIC_EMPLOYERS)
            occupation = normalize_label(row[12], GENERIC_OCCUPATIONS)
            if not employer and not occupation:
                continue
            employer_key, employer_display = employer or ("", "")
            occupation_key, occupation_display = occupation or ("", "")
            sector = sector_for(occupation_display, employer_display)
            rpt_tp, pgi, tran_id, file_num, sub_id = (
                row[2], row[3], row[16], to_int(row[17]), row[20]
            )
            txkey = f"{cmte_id}|{rpt_tp}|{pgi}|{tran_id or sub_id}"
            batch.append((
                txkey, bio, employer_key, employer_display, occupation_key,
                occupation_display, sector, amount, file_num,
            ))
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
            if len(row) < 22 or row[5] not in DIRECT_PAC_TYPES:
                continue
            cand_id = row[16]
            bio = cand_to_bio.get(cand_id)
            if not bio:
                continue
            source_cmte = row[0]
            amount = to_float(row[14])
            if not source_cmte or amount <= 0:
                continue
            rpt_tp, pgi, tran_id, file_num, sub_id = (
                row[2], row[3], row[17], to_int(row[18]), row[21]
            )
            txkey = f"{source_cmte}|{cand_id}|{rpt_tp}|{pgi}|{tran_id or sub_id}"
            batch.append((txkey, bio, source_cmte, amount, file_num))
            kept += 1
            if len(batch) >= 10000:
                db.executemany(pac_sql, batch)
                batch.clear()
        if batch:
            db.executemany(pac_sql, batch)
        db.commit()
        print(
            f"Committee-to-candidate records scanned {scanned:,}, "
            f"direct-support rows {kept:,}",
            flush=True,
        )

        employers = defaultdict(list)
        for bio, key, display, amount, count in db.execute("""
            SELECT bio, employer_key, MAX(employer_display), SUM(amount), COUNT(*)
            FROM indiv
            WHERE employer_key <> ''
            GROUP BY bio, employer_key
            HAVING SUM(amount) > 0
            ORDER BY bio, SUM(amount) DESC
        """):
            if len(employers[bio]) < 100:
                employers[bio].append({
                    "key": key,
                    "name": display or key,
                    "amount": round(amount, 2),
                    "count": count,
                })

        occupations = defaultdict(list)
        for bio, key, display, amount, count in db.execute("""
            SELECT bio, occupation_key, MAX(occupation_display), SUM(amount), COUNT(*)
            FROM indiv
            WHERE occupation_key <> ''
            GROUP BY bio, occupation_key
            HAVING SUM(amount) > 0
            ORDER BY bio, SUM(amount) DESC
        """):
            if len(occupations[bio]) < 40:
                occupations[bio].append({
                    "key": key,
                    "name": display or key,
                    "amount": round(amount, 2),
                    "count": count,
                })

        sectors = defaultdict(list)
        for bio, sector, amount, count in db.execute("""
            SELECT bio, sector, SUM(amount), COUNT(*)
            FROM indiv
            GROUP BY bio, sector
            HAVING SUM(amount) > 0
            ORDER BY bio, SUM(amount) DESC
        """):
            if len(sectors[bio]) < 20:
                sectors[bio].append({
                    "name": sector,
                    "amount": round(amount, 2),
                    "count": count,
                })

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

        selected_employers = sorted({
            e["key"] for rows in employers.values() for e in rows if e.get("key")
        })
        db.execute("CREATE TEMP TABLE selected_employer(key TEXT PRIMARY KEY)")
        db.executemany(
            "INSERT OR IGNORE INTO selected_employer(key) VALUES(?)",
            [(k,) for k in selected_employers],
        )

        employer_profiles = {}
        for key, bio, display, amount, count in db.execute("""
            SELECT i.employer_key, i.bio, MAX(i.employer_display), SUM(i.amount), COUNT(*)
            FROM indiv i
            JOIN selected_employer s ON s.key = i.employer_key
            GROUP BY i.employer_key, i.bio
            HAVING SUM(i.amount) > 0
            ORDER BY i.employer_key, SUM(i.amount) DESC
        """):
            p = employer_profiles.setdefault(key, {
                "key": key,
                "name": display or key,
                "type": "Employer-grouped individual donors",
                "total": 0.0,
                "transaction_count": 0,
                "recipient_count": 0,
                "party_totals": defaultdict(float),
                "top_recipients": [],
            })
            p["total"] += amount
            p["transaction_count"] += count
            p["recipient_count"] += 1
            party = bio_meta.get(bio, {}).get("party") or "Independent / other"
            p["party_totals"][party] += amount
            if len(p["top_recipients"]) < 15:
                p["top_recipients"].append(recipient_row(bio, amount, count, bio_meta))

        employer_profiles = {
            k: finalize_profile({**v, "party_totals": dict(v["party_totals"])})
            for k, v in employer_profiles.items()
        }

        committee_profiles = {}
        for cmte_id, bio, amount, count in db.execute("""
            SELECT committee_id, bio, SUM(amount), COUNT(*)
            FROM pac
            GROUP BY committee_id, bio
            HAVING SUM(amount) > 0
            ORDER BY committee_id, SUM(amount) DESC
        """):
            meta = committee_meta.get(cmte_id, {})
            p = committee_profiles.setdefault(cmte_id, {
                "committee_id": cmte_id,
                "name": meta.get("name") or cmte_id,
                "connected_org": meta.get("connected_org") or "",
                "organization_type": meta.get("organization_type") or "",
                "committee_type": meta.get("committee_type") or "Committee",
                "type": "Direct PAC / committee contributions",
                "total": 0.0,
                "transaction_count": 0,
                "recipient_count": 0,
                "party_totals": defaultdict(float),
                "top_recipients": [],
            })
            p["total"] += amount
            p["transaction_count"] += count
            p["recipient_count"] += 1
            party = bio_meta.get(bio, {}).get("party") or "Independent / other"
            p["party_totals"][party] += amount
            if len(p["top_recipients"]) < 15:
                p["top_recipients"].append(recipient_row(bio, amount, count, bio_meta))

        committee_profiles = {
            k: finalize_profile({**v, "party_totals": dict(v["party_totals"])})
            for k, v in committee_profiles.items()
        }

        members = {}
        for bio, meta in bio_meta.items():
            emps = employers.get(bio, [])
            pcs = pacs.get(bio, [])
            occs = occupations.get(bio, [])
            sect = sectors.get(bio, [])
            if not emps and not pcs and not occs:
                continue
            members[bio] = {
                **meta,
                "committee_ids": sorted(committees_by_bio.get(bio, set())),
                "employers": emps,
                "pacs": pcs,
                "occupations": occs,
                "sectors": sect,
            }

        payload = {
            "generated_at": dt.datetime.now(dt.timezone.utc).isoformat(),
            "cycle": CYCLE,
            "member_count": len(members),
            "employer_group_count": sum(len(v["employers"]) for v in members.values()),
            "pac_group_count": sum(len(v["pacs"]) for v in members.values()),
            "occupation_group_count": sum(len(v["occupations"]) for v in members.values()),
            "members": members,
            "employer_profiles": employer_profiles,
            "committee_profiles": committee_profiles,
            "sources": {
                "roster": ROSTER_URL,
                "candidate_committee_linkages": URLS["ccl"],
                "committee_master": URLS["cm"],
                "individual_contributions": URLS["indiv"],
                "committee_candidate_activity": URLS["pas2"],
            },
            "methodology": {
                "employers": (
                    "Itemized individual contributions to current members' authorized "
                    "committees, grouped by the employer reported by each donor."
                ),
                "occupations": (
                    "Itemized individual contributions grouped by the occupation text "
                    "reported by each donor."
                ),
                "sectors": (
                    "Broad industry/profession sectors are heuristic keyword classifications "
                    "derived from reported occupation and employer text; they are not FEC "
                    "industry codes."
                ),
                "pacs": (
                    "Direct committee-to-candidate contribution transaction types 24K, 24P "
                    "and 24Z from the FEC PAS2 bulk file, grouped by source committee."
                ),
                "party_splits": (
                    "Party splits aggregate the same current-cycle records across current "
                    "members of Congress in the roster."
                ),
                "amendments": (
                    "For repeated electronic transaction IDs, the row from the highest FEC "
                    "file number is retained before aggregation."
                ),
            },
        }
        out.write_text(
            json.dumps(payload, separators=(",", ":"), ensure_ascii=False),
            encoding="utf-8",
        )
        print(
            f"Wrote {out}: {len(members)} members, "
            f"{payload['employer_group_count']} employer groups, "
            f"{payload['pac_group_count']} PAC groups, "
            f"{payload['occupation_group_count']} occupation groups, "
            f"{len(employer_profiles)} employer profiles, "
            f"{len(committee_profiles)} committee profiles",
            flush=True,
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
