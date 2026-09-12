#!/usr/bin/env python3
"""Build the compact, modpack-scoped Fish Wiki render index used by the browser."""

from __future__ import annotations

import argparse
import gzip
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FISH_ROOT = ROOT / "tideborne/assets/fish"


def load_records() -> list[dict]:
    records: list[dict] = []
    for name in ("fish-wiki-data-0.json.gz", "fish-wiki-data-1.json.gz"):
        with gzip.open(FISH_ROOT / name, "rt", encoding="utf-8") as handle:
            payload = json.load(handle)
        records.extend(payload.get("records", []))
    return records


def namespace(record_id: str) -> str:
    return record_id.split(":", 1)[0] if ":" in record_id else "minecraft"


def compact_variant(value: object) -> dict:
    if not isinstance(value, dict):
        return {}
    return {
        key: value[key]
        for key in ("file", "status", "error")
        if key in value and value[key] not in (None, "")
    }


def build(output: Path) -> dict:
    manifest = json.loads((FISH_ROOT / "fish-render-manifest.json").read_text(encoding="utf-8"))
    scope = json.loads((FISH_ROOT / "modpack-scope.json").read_text(encoding="utf-8"))
    allowed_mods = set(scope.get("mod_ids", []))
    if scope.get("include_minecraft", True):
        allowed_mods.add("minecraft")

    ids = {
        str(record.get("id", ""))
        for record in load_records()
        if record.get("id")
        and (not allowed_mods or namespace(str(record["id"])) in allowed_mods)
    }

    keep_variants = scope.get("visual_variants_enabled") is True
    source_fish = manifest.get("fish", {})
    fish: dict[str, dict] = {}
    render_count = 0

    for record_id in sorted(ids):
        source = source_fish.get(record_id)
        if not isinstance(source, dict):
            continue

        entry: dict[str, object] = {
            key: source[key]
            for key in ("status", "error")
            if key in source and source[key] not in (None, "")
        }
        variants = source.get("variants", {})
        compact: dict[str, dict] = {}
        if isinstance(variants, dict):
            keys = variants.keys() if keep_variants else ("normal",)
            for key in keys:
                variant = compact_variant(variants.get(key))
                if variant:
                    compact[str(key)] = variant
                    if variant.get("file") and variant.get("status") != "unavailable":
                        render_count += 1
        entry["variants"] = compact
        fish[record_id] = entry

    payload = {
        "generated": True,
        "scope": "tideborne-modpack",
        "visual_variants_enabled": keep_variants,
        "counts": {"fish": len(fish), "render_variants": render_count},
        "fish": fish,
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, separators=(",", ":"), ensure_ascii=False), encoding="utf-8")
    return payload


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--output",
        type=Path,
        default=FISH_ROOT / "fish-render-index.json",
        help="Output path for the compact render index.",
    )
    args = parser.parse_args()
    payload = build(args.output)
    size = args.output.stat().st_size
    print(f"Built {args.output.relative_to(ROOT)}: {payload['counts']['fish']} fish, {size:,} bytes")


if __name__ == "__main__":
    main()
