# Tideborne Fish Wiki F7 QC

This document records the final acceptance gate for the native Fish Wiki integration.

## Scope

F7 validates the native `/random-info-pages/tideborne/fish/` catalog and its integration with the existing Tideborne site shell. It also checks the related Home, Fishing, Gear, Journal, Exact Mechanics, and `/tide2/` routes that the Fish Wiki now links into.

## Automated gate

`scripts/validate_tideborne_fish_wiki.py` runs before every Pages upload. It checks:

- native Fish Wiki assets and data shards exist locally;
- core browsing contains no Tide-2-Addons runtime dependency or redirect;
- search, autocomplete, filters, sort, reset, active chips, empty state, dialog, Copy URL, direct hashes, Back/Forward, Escape, focus trapping, focus return, and mobile filter-sheet hooks remain present;
- card images stay lazy and the primary detail image stays eager;
- unavailable render states remain explicit;
- current modpack scope suppresses unapproved visual-variant aliases while retaining the pinned source archive;
- the current FishScore, rarity-compensation, and leader values cannot silently regress to the old formulas;
- gzip fish data parses, scoped IDs are unique, render-manifest paths exist, and the Koi deep-link example resolves inside the active modpack scope;
- all static local links and assets under `tideborne/` plus the `/tide2/` entry route resolve under the GitHub Pages `/random-info-pages/` base path;
- Fish-specific source data and UI assets remain under `tideborne/assets/fish/`, separate from the shared Tideborne shell assets.

The Pages workflow also performs live HTTP smoke checks after deployment for:

- `/random-info-pages/tideborne/`
- `/random-info-pages/tideborne/fish/`
- `/random-info-pages/tideborne/fishing/`
- `/random-info-pages/tideborne/gear/`
- `/random-info-pages/tideborne/journal/`
- `/random-info-pages/tideborne/reference/mechanics/`
- `/random-info-pages/tide2/`
- the local Koi render
- both local gzip fish-data shards

## F7 corrections

The QC pass found and corrected two stale cross-site mechanics surfaces that would otherwise disagree with the native Fish Wiki:

1. Exact Mechanics still used the historical square-root FishScore normalization and older trait-rarity multipliers. It now follows the current linear 1 to 3000 FishScore implementation and current canonical trait probability rules validated from Tideborne revision `eee0cb429921803cf2f81b2b43b76f4fed9cad4f`.
2. Gear and Exact Mechanics still presented the old leader table. They now use the current Copper, Iron, Gold, and Diamond `LeaderTier` values. Iron retains the historical `steel_leader` registry identity for compatibility.

The active modpack scope declares `visual_variants_enabled: false`. F7 therefore keeps the pinned source render archive intact but limits the live runtime manifest to each fish's validated normal render. This prevents the UI from implying that byte-identical source aliases are distinct visual variants and avoids unnecessary variant image requests.

## Accessibility and performance notes

The Fish Wiki uses native semantic controls, labeled search and filters, a native dialog, visible focus styles, result/status live regions, keyboard navigation, Escape handling, and the shared site's reduced-motion rule. Cards are grid-only and the scoped catalog is intentionally small enough to render without a second list mode or virtualization layer.

A green Pages workflow is the final release gate for this phase.
