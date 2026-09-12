#!/usr/bin/env python3
"""Static acceptance checks for the native Tideborne Fish Wiki integration."""

from __future__ import annotations

import gzip
import hashlib
import json
import re
import sys
from collections import defaultdict
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
PREFIX = "/random-info-pages/"
errors: list[str] = []
notes: list[str] = []


def check(condition: bool, message: str) -> None:
    if not condition:
        errors.append(message)


def text(path: str) -> str:
    file = ROOT / path
    check(file.is_file(), f"Missing required file: {path}")
    return file.read_text(encoding="utf-8") if file.is_file() else ""


def json_file(path: str):
    file = ROOT / path
    check(file.is_file(), f"Missing required JSON: {path}")
    if not file.is_file():
        return {}
    try:
        return json.loads(file.read_text(encoding="utf-8"))
    except Exception as exc:
        errors.append(f"Invalid JSON in {path}: {exc}")
        return {}


def gzip_json(path: str):
    file = ROOT / path
    check(file.is_file(), f"Missing required gzip JSON: {path}")
    if not file.is_file():
        return {}
    try:
        with gzip.open(file, "rt", encoding="utf-8") as handle:
            return json.load(handle)
    except Exception as exc:
        errors.append(f"Invalid gzip JSON in {path}: {exc}")
        return {}


required = [
    "tideborne/fish/index.html",
    "tideborne/assets/fish/fish-runtime.js",
    "tideborne/assets/fish/fish-scope.js",
    "tideborne/assets/fish/fish-mechanics.js",
    "tideborne/assets/fish/fish-wiki.js",
    "tideborne/assets/fish/fish-shell.js",
    "tideborne/assets/fish/fish-wiki.css",
    "tideborne/assets/fish/fish-shell.css",
    "tideborne/assets/fish/fish-detail.css",
    "tideborne/assets/fish/fish-render-manifest.json",
    "tideborne/assets/fish/modpack-scope.json",
    "tideborne/assets/fish/fish-wiki-data-0.json.gz",
    "tideborne/assets/fish/fish-wiki-data-1.json.gz",
    "tideborne/reference/mechanics/index.html",
    "tideborne/gear/index.html",
    "tide2/index.html",
]
for path in required:
    check((ROOT / path).is_file(), f"Missing required integration file: {path}")

fish_html = text("tideborne/fish/index.html")
runtime_js = text("tideborne/assets/fish/fish-runtime.js")
scope_js = text("tideborne/assets/fish/fish-scope.js")
mechanics_js = text("tideborne/assets/fish/fish-mechanics.js")
wiki_js = text("tideborne/assets/fish/fish-wiki.js")
shell_js = text("tideborne/assets/fish/fish-shell.js")
wiki_css = text("tideborne/assets/fish/fish-wiki.css")
detail_css = text("tideborne/assets/fish/fish-detail.css")
site_css = text("tideborne/assets/site.css")
mechanics_html = text("tideborne/reference/mechanics/index.html")
gear_html = text("tideborne/gear/index.html")

# Native integration and base-path safety.
core_browsing = "\n".join([fish_html, runtime_js, scope_js, mechanics_js, wiki_js, shell_js, wiki_css, detail_css])
check("tide-2-addons" not in core_browsing.lower(), "Core Fish Wiki browsing still depends on Tide-2-Addons.")
check("http-equiv=\"refresh\"" not in fish_html.lower(), "Fish Wiki page still contains an HTTP refresh redirect.")
check("location.replace(" not in core_browsing and "location.href='http" not in core_browsing.lower(), "Fish Wiki still contains an external navigation redirect.")
check("new URL('./',sourceScript" in runtime_js, "Fish runtime no longer derives its asset base from its own script URL.")
check("/random-info-pages/tideborne/assets/fish/" in fish_html, "Fish Wiki scripts/styles are not GitHub Pages base-path safe.")
check("fish-scope.js" in fish_html and fish_html.index("fish-runtime.js") < fish_html.index("fish-scope.js") < fish_html.index("fish-wiki.js"), "Fish render-scope guard is missing or loaded in the wrong order.")

# Catalog controls and grid-only behavior.
for control_id in [
    "fish-search", "fish-category-nav", "fish-filter-toggle", "fish-filters", "fish-group",
    "fish-source", "fish-rarity", "fish-stars", "fish-habitat", "fish-sort", "fish-reset",
    "fish-active-filters", "fish-results", "fish-empty", "fish-detail", "fish-detail-close",
]:
    check(f'id="{control_id}"' in fish_html, f"Fish Wiki control missing: {control_id}")
check('class="fish-grid"' in fish_html, "Fish results are no longer a grid.")
check('id="fish-list"' not in fish_html and "list view" not in fish_html.lower(), "A public Fish Wiki list mode has returned.")
check("preview state" not in fish_html.lower() and 'id="fish-preview"' not in fish_html, "A public Preview-state filter has returned.")
filters_start = fish_html.find('id="fish-filters"')
filters_end = fish_html.find('</aside>', filters_start)
sort_pos = fish_html.find('id="fish-sort"')
check(filters_start >= 0 and filters_start < sort_pos < filters_end, "Sort is not inside the Fish Wiki filter column.")

# Search, filtering, empty-state, details, deep links, history and keyboard behavior.
for token, label in [
    ("suggestionMatches()", "autocomplete suggestions"),
    ("filteredRecords()", "filtering"),
    ("els.empty.hidden", "empty state"),
    ("history.pushState", "history push state"),
    ("window.addEventListener('popstate'", "browser Back/Forward"),
    ("navigator.clipboard", "Copy URL"),
    ("showModal()", "native detail dialog"),
    ("els.dialog.addEventListener('cancel'", "Escape dialog close"),
    ("event.key!=='Tab'", "dialog focus trap"),
    ("event.key!=='/'", "Fish Wiki slash shortcut"),
    ("Render unavailable", "explicit missing-render state"),
]:
    check(token in wiki_js, f"Fish Wiki behavior missing: {label}")
check("Close fish filters" in shell_js and "event.key==='Escape'" in shell_js and "fish-filter-backdrop" in shell_js, "Mobile filter sheet close/backdrop/Escape behavior is incomplete.")
check("restoreFocus" in wiki_js, "Fish detail close no longer restores focus.")
check("hashFor(id)" in wiki_js and "recordFromHash()" in wiki_js and "seedDirectRoute()" in wiki_js, "Namespace-safe direct fish routes are incomplete.")

# Image loading and scoped variants.
check("detail?'eager':'lazy'" in wiki_js, "Card/detail image loading priorities changed unexpectedly.")
check('loading="lazy"' in wiki_js, "Variant images are not lazy-loaded.")
check("visual_variants_enabled===true" in scope_js and "entry.variants=normal?{normal}:{}" in scope_js, "Current modpack scope does not suppress unapproved visual-variant aliases.")

# Accessibility checks for the Fish Wiki surfaces.
check('<label class="sr-only" for="fish-search">' in fish_html, "Fish search is missing its label.")
check('aria-labelledby="fish-detail-title"' in fish_html and 'aria-modal="true"' in fish_html, "Fish detail dialog semantics are incomplete.")
check(":focus-visible" in wiki_css and ":focus-visible" in detail_css, "Fish Wiki interactive controls are missing visible focus treatment.")
check("prefers-reduced-motion:reduce" in site_css.replace(" ", ""), "Shared site CSS is missing reduced-motion handling.")
check("aria-live=\"polite\"" in fish_html and "role=\"status\"" in fish_html, "Fish Wiki result/status announcements are incomplete.")

# Current-mechanics guardrails. These stop old formulas from being reintroduced elsewhere in the wiki.
check("eee0cb429921803cf2f81b2b43b76f4fed9cad4f" in mechanics_html, "Exact Mechanics does not record the validated Tideborne source revision.")
check("FishScore = round(1 + 2999" in mechanics_html, "Exact Mechanics is missing the current linear FishScore formula.")
check("sqrt(clamp(normalized" not in mechanics_html, "Stale square-root FishScore normalization remains on Exact Mechanics.")
check("1.15×" in mechanics_html and "2.40×" in mechanics_html, "Exact Mechanics is missing current rarity trait multipliers.")
check("Copper</td><td>98%</td><td>101%</td><td>30%" in gear_html, "Gear page Copper leader values are stale.")
check("Iron</td><td>95%</td><td>103%</td><td>55%" in gear_html, "Gear page Iron leader values are stale.")
check("Diamond</td><td>82%</td><td>110%</td><td>95%" in mechanics_html, "Exact Mechanics leader values are stale.")
check("Tentacle</td>" not in gear_html and "Seafarer's</td>" not in gear_html, "Legacy non-leader items are still presented as material leaders.")
check('/random-info-pages/tide2/' in mechanics_html and (ROOT / "tide2/index.html").is_file(), "Verified link into /tide2/ is missing or broken.")

# Validate data shards, scope and source-backed render paths.
first = gzip_json("tideborne/assets/fish/fish-wiki-data-0.json.gz")
second = gzip_json("tideborne/assets/fish/fish-wiki-data-1.json.gz")
manifest = json_file("tideborne/assets/fish/fish-render-manifest.json")
scope = json_file("tideborne/assets/fish/modpack-scope.json")
records = []
for payload, name in [(first, "data-0"), (second, "data-1")]:
    shard_records = payload.get("records", []) if isinstance(payload, dict) else []
    check(isinstance(shard_records, list), f"{name} records is not a list.")
    if isinstance(shard_records, list):
        records.extend(shard_records)

allowed_mods = set(scope.get("mod_ids", [])) if isinstance(scope, dict) else set()
if isinstance(scope, dict) and scope.get("include_minecraft", True):
    allowed_mods.add("minecraft")


def namespace(record_id: str) -> str:
    return record_id.split(":", 1)[0] if ":" in record_id else "minecraft"

scoped_records = [record for record in records if not allowed_mods or namespace(str(record.get("id", ""))) in allowed_mods]
scoped_ids = [str(record.get("id", "")) for record in scoped_records]
check(bool(scoped_records), "Modpack-scoped fish catalog is empty.")
check(len(scoped_ids) == len(set(scoped_ids)), "Modpack-scoped fish IDs are not unique.")
check("crittersandcompanions:koi_fish" in scoped_ids, "F6/F7 Koi deep-link example is outside the current scope.")
check(len(scoped_records) <= 250, f"Fish grid DOM budget exceeded: {len(scoped_records)} records.")

fish_manifest = manifest.get("fish", {}) if isinstance(manifest, dict) else {}
render_root = ROOT / "tideborne/assets/fish/renders"
check(render_root.is_dir(), "Source-backed render directory is missing.")
missing_manifest = 0
unavailable = 0
referenced_render_files: set[str] = set()
for record_id in scoped_ids:
    entry = fish_manifest.get(record_id)
    if not isinstance(entry, dict):
        missing_manifest += 1
        continue
    variants = entry.get("variants", {})
    if not isinstance(variants, dict):
        errors.append(f"Render variants are invalid for {record_id}")
        continue
    normal = variants.get("normal", {}) if isinstance(variants.get("normal", {}), dict) else {}
    if entry.get("status") == "unavailable" or normal.get("status") == "unavailable" or not normal.get("file"):
        unavailable += 1
    for key, variant in variants.items():
        if not isinstance(variant, dict) or variant.get("status") == "unavailable" or not variant.get("file"):
            continue
        filename = Path(str(variant["file"]).replace("\\", "/")).name
        referenced_render_files.add(filename)
        check((render_root / filename).is_file(), f"Manifest render missing for {record_id} [{key}]: {filename}")
check(missing_manifest == 0, f"Scoped fish missing render-manifest entries: {missing_manifest}")
check(unavailable > 0, "QC expected honest unavailable-render states, but none were found.")

# Report source aliases without making the runtime load them. The current scope guard keeps only normal renders live.
hashes: dict[str, list[str]] = defaultdict(list)
for file in render_root.iterdir() if render_root.is_dir() else []:
    if file.is_file():
        digest = hashlib.sha256(file.read_bytes()).hexdigest()
        hashes[digest].append(file.name)
alias_files = sum(len(group) - 1 for group in hashes.values() if len(group) > 1)
notes.append(f"Scoped records: {len(scoped_records)}")
notes.append(f"Scoped entries with honest unavailable normal render: {unavailable}")
notes.append(f"Manifest-referenced render filenames present: {len(referenced_render_files)}")
notes.append(f"Source render content aliases retained in archive: {alias_files}; visual variants are disabled in the current runtime scope")

# Internal link and local asset sweep for Tideborne and the /tide2/ guide.
attr_pattern = re.compile(r"(?:href|src)\s*=\s*([\"'])(.*?)\1", re.IGNORECASE)
html_files = sorted((ROOT / "tideborne").rglob("*.html")) + [ROOT / "tide2/index.html"]
for source in html_files:
    source_text = source.read_text(encoding="utf-8")
    for _, raw_url in attr_pattern.findall(source_text):
        raw_url = raw_url.strip()
        if not raw_url or raw_url.startswith(("#", "mailto:", "tel:", "data:", "javascript:")):
            continue
        split = urlsplit(raw_url)
        if split.scheme or split.netloc:
            continue
        path = unquote(split.path)
        if not path:
            continue
        if path.startswith("/"):
            if not path.startswith(PREFIX):
                errors.append(f"Base-path unsafe local URL in {source.relative_to(ROOT)}: {raw_url}")
                continue
            relative = path[len(PREFIX):]
            target = ROOT / relative
        else:
            target = source.parent / path
        if path.endswith("/") or target.is_dir():
            target = target / "index.html"
        check(target.is_file(), f"Broken internal link/asset in {source.relative_to(ROOT)}: {raw_url} -> {target.relative_to(ROOT) if target.is_absolute() and ROOT in target.parents else target}")

# Keep feature-specific assets separate from the shared shell.
check((ROOT / "tideborne/assets/fish").is_dir(), "Fish-specific assets are not isolated under tideborne/assets/fish.")
check((ROOT / "tideborne/assets/site.css").is_file() and (ROOT / "tideborne/assets/site.js").is_file(), "Shared Tideborne shell assets are missing.")

if errors:
    print("Tideborne Fish Wiki QC failed:")
    for item in errors:
        print(f" - {item}")
    if notes:
        print("\nQC notes:")
        for item in notes:
            print(f" - {item}")
    sys.exit(1)

print("Tideborne Fish Wiki QC passed.")
for item in notes:
    print(f" - {item}")
