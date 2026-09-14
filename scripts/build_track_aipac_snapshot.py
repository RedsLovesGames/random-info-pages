#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import subprocess
import sys
import unicodedata
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.request import Request, urlopen

SOURCE_URL = "https://www.trackaipac.com/congress"
METHODOLOGY_URL = "https://www.trackaipac.com/blog/updated-methodology"
SEAT_RE = re.compile(r"^(?P<state>[A-Z]{2})-(?P<seat>SEN|AL|\d{1,2})(?:\s*\[(?P<party>[DIR])\])?$")
MONEY_RE = re.compile(r"\$([0-9][0-9,]*(?:\.\d{1,2})?)")
NOISE = {
    "Download Graphics",
    "Members of Congress",
    "Candidates for Congress",
    "Our Endorsed Candidates",
    "Donate Now",
    "Store",
}


class TextCollector(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.lines: list[str] = []
        self._skip_depth = 0

    def handle_starttag(self, tag, attrs):
        if tag in {"script", "style", "noscript"}:
            self._skip_depth += 1

    def handle_endtag(self, tag):
        if tag in {"script", "style", "noscript"} and self._skip_depth:
            self._skip_depth -= 1

    def handle_data(self, data):
        if self._skip_depth:
            return
        text = re.sub(r"\s+", " ", data).strip()
        if text:
            self.lines.append(text)


def clean_name(value: str) -> str:
    value = value.strip()
    value = re.sub(r"^(?:Rep\.|Sen\.|Representative|Senator)\s+", "", value, flags=re.I)
    return value


def norm_name(value: str) -> str:
    value = unicodedata.normalize("NFKD", clean_name(value)).encode("ascii", "ignore").decode("ascii")
    value = re.sub(r"\b(?:jr|sr|ii|iii|iv)\.?\b", "", value, flags=re.I)
    value = re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()
    return re.sub(r"\s+", " ", value)


def money(line: str) -> float | None:
    match = MONEY_RE.search(line)
    if not match:
        return None
    return float(match.group(1).replace(",", ""))


def is_group_line(line: str) -> bool:
    if not line or ":" in line:
        return False
    if line.startswith(("Track AIPAC", "This ", "We encourage", "Next Election", "Up for", "Running for", "Retiring", "Signed", "✔", "WARNING")):
        return False
    tokens = re.findall(r"\b[A-Z][A-Z0-9]{1,11}\b", line)
    return len(tokens) >= 1 and ("," in line or line.strip() in tokens or "AIPAC" in line or "JSTREET" in line)


def rating_from(block: list[str]) -> tuple[str, str]:
    joined = " ".join(block)
    if "Track AIPAC Approved!" in joined:
        return "approved", "Track AIPAC Approved"
    for line in block:
        lower = line.lower()
        if "poor legislative record" in lower:
            return "poor", line
        if "continue improving" in lower and "legislative record" in lower:
            return "improving", line
        if "newly elected" in lower and "evaluat" in lower:
            return "evaluating", line
        if "warning" in lower:
            return "warning", line
    return "not_explicit", "No explicit qualitative legislative-record note shown on this Track AIPAC card."


def previous_name(lines: list[str], idx: int) -> str:
    for j in range(idx - 1, max(-1, idx - 8), -1):
        candidate = lines[j].strip()
        if not candidate or candidate in NOISE or SEAT_RE.match(candidate):
            continue
        if candidate.lower().startswith(("image:", "download graphics", "israel lobby total", "pacs:", "donations:", "ie:")):
            continue
        if len(candidate) > 80:
            continue
        return clean_name(candidate)
    return "Unknown"


def parse(html: str) -> list[dict]:
    parser = TextCollector()
    parser.feed(html)
    lines = [x for x in parser.lines if x]
    entries: list[dict] = []

    seat_positions = [i for i, line in enumerate(lines) if SEAT_RE.match(line)]
    for n, idx in enumerate(seat_positions):
        seat_match = SEAT_RE.match(lines[idx])
        if not seat_match:
            continue
        end = seat_positions[n + 1] if n + 1 < len(seat_positions) else min(len(lines), idx + 40)
        block = lines[idx + 1 : min(end, idx + 40)]
        name = previous_name(lines, idx)
        state = seat_match.group("state")
        seat_token = seat_match.group("seat")
        if seat_token == "SEN":
            seat_key = f"{state}-SEN"
        elif seat_token == "AL":
            seat_key = f"{state}-AL"
        else:
            seat_key = f"{state}-{int(seat_token):02d}"

        total = pacs = ie = None
        support_label = None
        groups = ""
        for line in block:
            if line.startswith("Israel Lobby Total:"):
                total = money(line)
            elif line.startswith("PACs:"):
                pacs = money(line)
                support_label = "PACs"
            elif line.startswith("Donations:"):
                pacs = money(line)
                support_label = "Donations"
            elif line.startswith("IE:"):
                ie = money(line)
            elif not groups and is_group_line(line):
                groups = line

        rating_code, rating_text = rating_from(block)
        groups_list = [g.strip() for g in groups.split(",") if g.strip()] if groups else []
        aipac_named = any(re.search(r"\bAIPAC\b", g, re.I) for g in groups_list)

        if name == "Unknown" and total is None and rating_code == "not_explicit":
            continue

        entries.append(
            {
                "name": name,
                "name_key": norm_name(name),
                "seat": seat_key,
                "party": seat_match.group("party") or "",
                "israel_lobby_total": total,
                "pac_or_donation_total": pacs,
                "support_label": support_label or "PACs / donations",
                "independent_expenditures": ie,
                "groups_text": groups,
                "groups": groups_list,
                "aipac_named": aipac_named,
                "rating_code": rating_code,
                "rating_text": rating_text,
            }
        )

    deduped: list[dict] = []
    seen: set[tuple[str, str]] = set()
    for entry in entries:
        key = (entry["name_key"], entry["seat"])
        if key in seen:
            continue
        seen.add(key)
        deduped.append(entry)
    return deduped


def bundle_profile_assets(repo_root: Path) -> None:
    pairs = [
        (
            repo_root / "oldasspolitic/member/track-aipac.js",
            repo_root / "oldasspolitic/member/fec-bulk.js",
            "OAP_FEC_BULK_JS_BUNDLE",
            "/* {} */\n",
        ),
        (
            repo_root / "oldasspolitic/member/track-aipac.css",
            repo_root / "oldasspolitic/member/fec-bulk.css",
            "OAP_FEC_BULK_CSS_BUNDLE",
            "/* {} */\n",
        ),
    ]
    for target, addon, marker, marker_fmt in pairs:
        target_text = target.read_text(encoding="utf-8")
        if marker in target_text:
            continue
        addon_text = addon.read_text(encoding="utf-8")
        target.write_text(target_text.rstrip() + "\n\n" + marker_fmt.format(marker) + addon_text.rstrip() + "\n", encoding="utf-8")
        print(f"Bundled {addon.name} into {target.name}")


def build_fec_sponsors(repo_root: Path, out_dir: Path) -> dict:
    builder = repo_root / "scripts/build_fec_sponsor_snapshot.py"
    tmp = out_dir / ".fec-sponsors.tmp.json"
    result = subprocess.run([sys.executable, str(builder), str(tmp)], cwd=repo_root)
    if result.returncode != 0:
        raise RuntimeError(f"FEC sponsor snapshot builder failed with exit code {result.returncode}")
    data = json.loads(tmp.read_text(encoding="utf-8"))
    tmp.unlink(missing_ok=True)

    members = int(data.get("member_count") or 0)
    employers = int(data.get("employer_group_count") or 0)
    pacs = int(data.get("pac_group_count") or 0)
    if members < 300 or employers < 1000 or pacs < 100:
        raise RuntimeError(
            f"FEC sponsor snapshot unexpectedly sparse: {members} members, {employers} employer groups, {pacs} PAC groups"
        )
    return data


def main() -> int:
    out = Path(sys.argv[1] if len(sys.argv) > 1 else "oldasspolitic/member/track-aipac.json")
    repo_root = Path(__file__).resolve().parents[1]

    req = Request(
        SOURCE_URL,
        headers={
            "User-Agent": "Mozilla/5.0 (compatible; RandomInfoPages/1.0; +https://redslovesgames.github.io/random-info-pages/)",
            "Accept": "text/html,application/xhtml+xml",
        },
    )
    with urlopen(req, timeout=30) as response:
        html = response.read().decode("utf-8", "replace")

    entries = parse(html)
    if len(entries) < 400:
        print("ERROR: parsed fewer than 400 Track AIPAC congressional cards", file=sys.stderr)
        return 2

    try:
        fec_sponsors = build_fec_sponsors(repo_root, out.parent)
        bundle_profile_assets(repo_root)
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 3

    payload = {
        "source": SOURCE_URL,
        "methodology": METHODOLOGY_URL,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "record_count": len(entries),
        "entries": entries,
        "fec_sponsors": fec_sponsors,
    }
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(
        f"Combined profile snapshot: {len(entries)} Track AIPAC entries, "
        f"{fec_sponsors['member_count']} FEC sponsor members -> {out}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
