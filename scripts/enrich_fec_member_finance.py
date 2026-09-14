#!/usr/bin/env python3
"""Add reliable FEC candidate-summary history to the Old Ass Politic sponsor snapshot.

This uses the FEC's public all-candidate summary bulk files instead of the browser
OpenFEC DEMO_KEY. The result gives each current member a compact per-cycle finance
ledger that can drive profile cards and charts even when the OpenFEC API is rate
limited or unavailable.
"""
from __future__ import annotations

import io
import json
import sys
import urllib.request
import zipfile
from collections import defaultdict
from pathlib import Path

ROSTER_URL = (
    "https://cdn.jsdelivr.net/gh/unitedstates/congress-legislators@"
    "73e2fcd181e1c48d1b0580d417e8d0314b22f7c9/legislators-current.json"
)
FIRST_CYCLE = 2008
UA = "OldAssPolitic-FEC-Finance/1.0"


def fetch_bytes(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=180) as response:
        return response.read()


def as_float(value: str) -> float:
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def all_candidate_ids(roster: list[dict]) -> tuple[dict[str, str], dict[str, list[str]]]:
    id_to_bio: dict[str, str] = {}
    ids_by_bio: dict[str, list[str]] = {}
    for person in roster:
        bio = (person.get("id") or {}).get("bioguide")
        if not bio:
            continue
        raw = (person.get("id") or {}).get("fec") or []
        if isinstance(raw, str):
            raw = [raw]
        ids = sorted({x for x in raw if isinstance(x, str) and x[:1] in {"H", "S"}})
        ids_by_bio[bio] = ids
        for candidate_id in ids:
            id_to_bio[candidate_id] = bio
    return id_to_bio, ids_by_bio


def rows_from_zip(payload: bytes):
    with zipfile.ZipFile(io.BytesIO(payload)) as archive:
        names = [name for name in archive.namelist() if not name.endswith("/")]
        if not names:
            return
        name = max(names, key=lambda n: archive.getinfo(n).file_size)
        with archive.open(name) as raw, io.TextIOWrapper(
            raw, encoding="latin-1", errors="replace", newline=""
        ) as text:
            for line in text:
                yield line.rstrip("\r\n").split("|")


def empty_cycle(cycle: int) -> dict:
    return {
        "cycle": cycle,
        "receipts": 0.0,
        "spent": 0.0,
        "receipts_raw": 0.0,
        "spent_raw": 0.0,
        "transfers_from_authorized": 0.0,
        "transfers_to_authorized": 0.0,
        "individual": 0.0,
        "pac": 0.0,
        "party": 0.0,
        "candidate": 0.0,
        "cash": 0.0,
        "debt": 0.0,
        "coverage_end": "",
        "candidate_ids": [],
    }


def main() -> int:
    path = Path(sys.argv[1] if len(sys.argv) > 1 else "oldasspolitic/member/fec-sponsors.json")
    data = json.loads(path.read_text(encoding="utf-8"))
    current_cycle = int(data.get("cycle") or 0)
    if current_cycle < FIRST_CYCLE or current_cycle % 2:
        raise RuntimeError(f"Unexpected FEC cycle: {current_cycle}")

    roster = json.loads(fetch_bytes(ROSTER_URL).decode("utf-8"))
    id_to_bio, ids_by_bio = all_candidate_ids(roster)
    current_members = data.get("members") or {}
    if len(current_members) < 400:
        raise RuntimeError(f"Sponsor snapshot unexpectedly small: {len(current_members)} members")

    cycle_rows: dict[str, dict[int, dict]] = defaultdict(dict)
    source_urls: list[str] = []

    for cycle in range(FIRST_CYCLE, current_cycle + 1, 2):
        url = f"https://www.fec.gov/files/bulk-downloads/{cycle}/weball{str(cycle)[-2:]}.zip"
        source_urls.append(url)
        print(f"Downloading candidate summary {cycle}: {url}", flush=True)
        payload = fetch_bytes(url)
        matched = 0
        for row in rows_from_zip(payload):
            if len(row) < 30:
                continue
            candidate_id = row[0]
            bio = id_to_bio.get(candidate_id)
            if not bio or bio not in current_members:
                continue
            matched += 1
            item = cycle_rows[bio].setdefault(cycle, empty_cycle(cycle))
            receipts_raw = as_float(row[5])
            transfers_from = as_float(row[6])
            spent_raw = as_float(row[7])
            transfers_to = as_float(row[8])
            item["receipts_raw"] += receipts_raw
            item["spent_raw"] += spent_raw
            item["transfers_from_authorized"] += transfers_from
            item["transfers_to_authorized"] += transfers_to
            item["receipts"] += max(0.0, receipts_raw - transfers_from)
            item["spent"] += max(0.0, spent_raw - transfers_to)
            item["cash"] += as_float(row[10])
            item["candidate"] += as_float(row[11])
            item["debt"] += as_float(row[16])
            item["individual"] += as_float(row[17])
            item["pac"] += as_float(row[25])
            item["party"] += as_float(row[26])
            coverage = (row[27] or "").strip()
            if coverage and coverage > item["coverage_end"]:
                item["coverage_end"] = coverage
            if candidate_id not in item["candidate_ids"]:
                item["candidate_ids"].append(candidate_id)
        print(f"  matched {matched} current-member candidate records", flush=True)

    members_with_finance = 0
    total_cycle_rows = 0
    for bio, member in current_members.items():
        rows = []
        for cycle in sorted(cycle_rows.get(bio, {})):
            item = cycle_rows[bio][cycle]
            for key in (
                "receipts", "spent", "receipts_raw", "spent_raw",
                "transfers_from_authorized", "transfers_to_authorized",
                "individual", "pac", "party", "candidate", "cash", "debt",
            ):
                item[key] = round(float(item[key]), 2)
            item["candidate_ids"].sort()
            rows.append(item)
        member["finance_cycles"] = rows
        member["all_candidate_ids"] = ids_by_bio.get(bio, member.get("candidate_ids") or [])
        if rows:
            members_with_finance += 1
            total_cycle_rows += len(rows)
            member["finance_coverage_start"] = rows[0]["cycle"]
            member["finance_coverage_end"] = rows[-1]["cycle"]

    data.setdefault("sources", {})["candidate_summaries"] = source_urls
    data.setdefault("methodology", {})["candidate_finance"] = (
        "FEC all-candidate summary bulk files, 2008 through the current cycle. "
        "Receipts subtract transfers from other authorized committees and spending subtracts "
        "transfers to other authorized committees to reduce internal-transfer double counting."
    )
    data["finance_member_count"] = members_with_finance
    data["finance_cycle_row_count"] = total_cycle_rows
    data["finance_first_cycle"] = FIRST_CYCLE
    path.write_text(json.dumps(data, separators=(",", ":"), ensure_ascii=False), encoding="utf-8")
    print(
        f"Enriched {path}: {members_with_finance} members, {total_cycle_rows} finance cycle rows",
        flush=True,
    )
    if members_with_finance < 400 or total_cycle_rows < 1000:
        raise RuntimeError(
            f"Historical finance enrichment unexpectedly sparse: {members_with_finance} members, "
            f"{total_cycle_rows} cycle rows"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
