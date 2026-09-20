#!/usr/bin/env python3
"""Refresh the Random Info Pages VCT scout snapshot from public VLR data.

The page is a scouting aid, not an official Riot product. This script keeps only
matches whose event metadata identifies them as top-level 2026 VCT competition,
then summarizes team map compositions for the current Champions map pool.
"""

from __future__ import annotations

import json
import time
from collections import Counter, defaultdict
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

import vlrdevapi

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "vct-scout" / "data.json"
WINDOW_START = date(2026, 7, 1)
MAP_POOL = ["Abyss", "Ascent", "Haven", "Lotus", "Split", "Summit", "Sunset"]

TEAMS = [
    (120, "100 Thieves", "100T", "Americas"),
    (6961, "LOUD", "LOUD", "Americas"),
    (1034, "NRG", "NRG", "Americas"),
    (11058, "G2 Esports", "G2", "Americas"),
    (731, "TYLOO", "TYL", "China"),
    (13576, "JD Gaming", "JDG", "China"),
    (1120, "EDward Gaming", "EDG", "China"),
    (13581, "Xi Lai Gaming", "XLG", "China"),
    (8877, "Karmine Corp", "KC", "EMEA"),
    (474, "Team Liquid", "TL", "EMEA"),
    (1184, "FUT Esports", "FUT", "EMEA"),
    (2059, "Team Vitality", "VIT", "EMEA"),
    (918, "Global Esports", "GE", "Pacific"),
    (11060, "Nongshim RedForce", "NS", "Pacific"),
    (624, "Paper Rex", "PRX", "Pacific"),
    (14, "T1", "T1", "Pacific"),
]


def load_previous() -> dict[str, Any]:
    try:
        return json.loads(OUT.read_text(encoding="utf-8"))
    except Exception:
        return {}


def is_official_vct(event_name: str) -> bool:
    n = (event_name or "").lower()
    if "game changers" in n:
        return False
    return any(
        token in n
        for token in (
            "vct 2026",
            "valorant champions tour 2026",
            "valorant champions 2026",
            "champions 2026",
        )
    )


def iso_match_date(raw: str) -> str:
    raw = (raw or "").strip()
    for fmt in ("%Y/%m/%d", "%Y-%m-%d", "%m/%d/%Y"):
        try:
            return datetime.strptime(raw, fmt).date().isoformat()
        except ValueError:
            pass
    return raw.replace("/", "-")


def pct(num: int, den: int) -> float | None:
    if not den:
        return None
    return round(100.0 * num / den, 1)


def safe_int(value: Any) -> int:
    try:
        return int(value or 0)
    except (TypeError, ValueError):
        return 0


def summarize_map(map_stats: Any) -> dict[str, Any] | None:
    comp_rows: list[dict[str, Any]] = []
    latest_candidates: list[tuple[str, tuple[str, ...], dict[str, Any]]] = []
    agent_counts: Counter[str] = Counter()
    total_games = total_wins = 0
    attack_won = attack_lost = defense_won = defense_lost = 0

    for comp in getattr(map_stats, "compositions", None) or []:
        agents = tuple(sorted(str(a) for a in (getattr(comp, "agents", None) or [])))
        if not agents:
            continue

        kept_matches: list[dict[str, Any]] = []
        for match in getattr(comp, "matches", None) or []:
            event_name = str(getattr(match, "event_name", "") or "")
            if not is_official_vct(event_name):
                continue

            match_date = iso_match_date(str(getattr(match, "date", "") or ""))
            won = bool(getattr(match, "is_win", False))
            aw = safe_int(getattr(match, "attack_rounds_won", 0))
            al = safe_int(getattr(match, "attack_rounds_lost", 0))
            dw = safe_int(getattr(match, "defense_rounds_won", 0))
            dl = safe_int(getattr(match, "defense_rounds_lost", 0))

            row = {
                "date": match_date,
                "series_id": safe_int(getattr(match, "series_id", 0)),
                "opponent": str(getattr(match, "opponent_name", "") or ""),
                "opponent_tag": str(getattr(match, "opponent_tag", "") or ""),
                "result": "W" if won else "L",
                "team_score": safe_int(getattr(match, "team_score", 0)),
                "opponent_score": safe_int(getattr(match, "opponent_score", 0)),
                "event": event_name,
                "stage": str(getattr(match, "stage", "") or ""),
                "patch": str(getattr(match, "patch", "") or ""),
                "attack_rounds_won": aw,
                "attack_rounds_lost": al,
                "defense_rounds_won": dw,
                "defense_rounds_lost": dl,
            }
            kept_matches.append(row)
            latest_candidates.append((match_date, agents, row))

            total_games += 1
            total_wins += 1 if won else 0
            attack_won += aw
            attack_lost += al
            defense_won += dw
            defense_lost += dl
            for agent in agents:
                agent_counts[agent] += 1

        if not kept_matches:
            continue

        kept_matches.sort(key=lambda m: m["date"], reverse=True)
        wins = sum(1 for m in kept_matches if m["result"] == "W")
        comp_rows.append(
            {
                "agents": list(agents),
                "games": len(kept_matches),
                "wins": wins,
                "losses": len(kept_matches) - wins,
                "win_rate": pct(wins, len(kept_matches)),
                "last_used": kept_matches[0]["date"],
                "matches": kept_matches[:10],
            }
        )

    if not total_games:
        return None

    comp_rows.sort(key=lambda c: (c["games"], c["last_used"]), reverse=True)
    latest_candidates.sort(key=lambda x: x[0], reverse=True)
    latest_date, latest_agents, latest_match = latest_candidates[0]

    agent_pick_rates = [
        {"agent": agent, "picks": count, "rate": round(100.0 * count / total_games, 1)}
        for agent, count in agent_counts.most_common()
    ]

    return {
        "games": total_games,
        "wins": total_wins,
        "losses": total_games - total_wins,
        "win_rate": pct(total_wins, total_games),
        "attack_round_win_rate": pct(attack_won, attack_won + attack_lost),
        "defense_round_win_rate": pct(defense_won, defense_won + defense_lost),
        "latest": {
            "date": latest_date,
            "agents": list(latest_agents),
            **latest_match,
        },
        "common": comp_rows[0],
        "compositions": comp_rows[:8],
        "agent_pick_rates": agent_pick_rates,
    }


def fetch_team(team_id: int, name: str, tag: str, region: str) -> dict[str, Any]:
    stats = vlrdevapi.team.stats(
        team_id=team_id,
        date_start=WINDOW_START,
        date_end=date.today(),
        agent_composition="detailed",
    )

    maps: dict[str, Any] = {}
    for map_stats in getattr(stats, "maps", []) or []:
        map_name = str(getattr(map_stats, "map_name", "") or "")
        if map_name not in MAP_POOL:
            continue
        summary = summarize_map(map_stats)
        if summary:
            maps[map_name] = summary

    return {
        "id": team_id,
        "name": name,
        "tag": tag,
        "region": region,
        "maps": maps,
    }


def build_meta(teams: list[dict[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for map_name in MAP_POOL:
        observations = 0
        agent_counts: Counter[str] = Counter()
        comp_counts: Counter[tuple[str, ...]] = Counter()
        comp_wins: Counter[tuple[str, ...]] = Counter()
        latest_date = ""

        for team in teams:
            row = team.get("maps", {}).get(map_name)
            if not row:
                continue
            observations += safe_int(row.get("games"))
            latest_date = max(latest_date, row.get("latest", {}).get("date", ""))
            for ap in row.get("agent_pick_rates", []):
                agent_counts[ap["agent"]] += safe_int(ap.get("picks"))
            for comp in row.get("compositions", []):
                key = tuple(sorted(comp.get("agents", [])))
                comp_counts[key] += safe_int(comp.get("games"))
                comp_wins[key] += safe_int(comp.get("wins"))

        if not observations:
            continue

        agents = [
            {"agent": agent, "picks": count, "rate": round(100.0 * count / observations, 1)}
            for agent, count in agent_counts.most_common()
        ]
        comps = []
        for key, games in comp_counts.most_common(10):
            wins = comp_wins[key]
            comps.append(
                {
                    "agents": list(key),
                    "games": games,
                    "wins": wins,
                    "losses": games - wins,
                    "win_rate": pct(wins, games),
                }
            )
        result[map_name] = {
            "team_side_maps": observations,
            "latest_date": latest_date,
            "agent_pick_rates": agents,
            "top_compositions": comps,
        }
    return result


def main() -> None:
    previous = load_previous()
    previous_by_id = {t.get("id"): t for t in previous.get("teams", [])}
    teams: list[dict[str, Any]] = []
    errors: list[dict[str, Any]] = []
    refreshed = 0

    for team_id, name, tag, region in TEAMS:
        print(f"Refreshing {name} ({team_id})...")
        try:
            row = fetch_team(team_id, name, tag, region)
            if row["maps"]:
                refreshed += 1
            teams.append(row)
        except Exception as exc:
            print(f"  failed: {exc}")
            errors.append({"team_id": team_id, "team": name, "error": str(exc)[:240]})
            fallback = previous_by_id.get(team_id)
            if fallback:
                teams.append(fallback)
            else:
                teams.append({"id": team_id, "name": name, "tag": tag, "region": region, "maps": {}})
        time.sleep(0.4)

    status = "live" if not errors else ("partial" if refreshed else "seed")
    payload = {
        "schema_version": 1,
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "window_start": WINDOW_START.isoformat(),
        "window_end": date.today().isoformat(),
        "status": status,
        "source_note": "Public VLR match data, filtered to 2026 top-level VCT events. Team-side map observations are used for composition and agent rates.",
        "map_pool": MAP_POOL,
        "teams": teams,
        "meta_by_map": build_meta(teams),
        "stage2_seed": previous.get("stage2_seed", {}),
        "errors": errors,
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {OUT} with {refreshed}/{len(TEAMS)} freshly populated teams; status={status}")


if __name__ == "__main__":
    main()
