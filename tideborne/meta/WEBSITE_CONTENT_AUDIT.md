# Tideborne website content audit

## Authoritative sources

- `RedsLovesGames/TIDEBORNE`: current gameplay, config, IDs, assets, P10 UI behavior, compatibility and validation.
- `Lightning-64/Tide-2`: upstream Tide fishing concepts, player-facing onboarding, fish/resource data and Tide-owned equipment.
- `/tide2/`: existing Tideborne Fishing System 2.0 visual guide, exact-mechanics reference and interactive calculator concepts.

## Preserve

The existing `/tide2/` site remains live until the new `/tideborne/` site reaches content/tool parity. Existing URLs are not deleted during construction.

## Content migration decisions

- Existing Fishing 2.0 hero/catch pipeline -> Fishing landing page.
- Fishing Luck, Trait Luck, Body Type, Perfect Catch, Momentum and FishScore calculators -> Tools + linked mechanic pages.
- Existing exact-mechanics page -> `/tideborne/reference/mechanics/`.
- Tide README onboarding order -> Getting Started narrative, clearly separating Tide-owned and Tideborne-owned behavior.
- P10 config categories -> Configuration hierarchy.
- P10 Satchel presentation -> Satchel visual guide.
- Historical compatibility IDs -> Reference/Developer only unless a player needs them for troubleshooting.

## UI source strategy

Use original Tideborne styling with interaction patterns inspired by shadcn/ui (command palette, sidebar, sheet/drawer, tabs, data table), Cult UI (shift/cutout cards, directional tabs, pixel accents), Aceternity-style restrained hero lighting/bento composition, and Radix/Base-UI accessibility conventions. Do not copy paid/proprietary template source.
