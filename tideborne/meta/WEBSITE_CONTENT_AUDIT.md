# Tideborne website content audit

## Authoritative sources

- `RedsLovesGames/TIDEBORNE`: current gameplay, config, IDs, assets, P10 UI behavior, compatibility and validation.
- `Lightning-64/Tide-2`: upstream Tide fishing concepts, current player-facing onboarding, fish/resource data and Tide-owned equipment.
- `Lightning-64/tide-wiki`: upstream general-wiki structure plus official Tide renders/screenshots for rods, Angling Table, accessories, Journal, minigame, loot crates and other world items. Some mechanics pages explicitly document older/outdated behavior, so their prose is not treated as current Tideborne authority.
- `/tide2/`: existing Tideborne Fishing System 2.0 visual guide, exact-mechanics reference and interactive calculator concepts.

## Preserve

The existing `/tide2/` site remains live until the new `/tideborne/` site reaches content/tool parity. Existing URLs are not deleted during construction.

## Content migration decisions

- Existing Fishing 2.0 hero/catch pipeline -> Fishing landing page.
- Fishing Luck, Trait Luck, Body Type, Perfect Catch, Momentum and FishScore calculators -> Tools + linked mechanic pages.
- Existing exact-mechanics page -> `/tideborne/reference/mechanics/`.
- Tide README onboarding order -> Getting Started narrative, clearly separating Tide-owned and Tideborne-owned behavior.
- General Tide wiki structure -> `/tideborne/tide/` context page plus visual enrichment throughout relevant player pages.
- Official Tide wiki renders/screenshots -> `/tideborne/gallery/` plus contextual media on Getting Started, Gear, Journal and Home. They are loaded from the upstream repository and labeled as upstream visual reference.
- P10 config categories -> Configuration hierarchy.
- P10 Satchel presentation -> Satchel visual guide.
- Historical compatibility IDs -> Reference/Developer only unless a player needs them for troubleshooting.

## Authority rule for old Tide wiki content

Use the old Tide wiki for visual identity, item-family organization, historical context and source media. Do not silently copy old formulas or behavior claims into Tideborne when the current Tide/Tideborne code disagrees. Current Tideborne reference data and current Tide 2 source/README take priority.

## UI source strategy

Use original Tideborne styling with interaction patterns inspired by shadcn/ui (command palette, sidebar, sheet/drawer, tabs, data table), Cult UI (shift/cutout cards, directional tabs, pixel accents), Aceternity-style restrained hero lighting/bento composition, and Radix/Base-UI accessibility conventions. Do not copy paid/proprietary template source.
