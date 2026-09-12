# Tideborne website content audit

## Authoritative sources

- `RedsLovesGames/TIDEBORNE`: current Tideborne gameplay, config, IDs, assets, P10 UI behavior, compatibility and validation.
- `Lightning-64/Tide-2`: **the base mod for Tideborne** and the authoritative source for current Tide-owned fishing behavior, player onboarding, fish/resource data and Tide-owned equipment.
- `Lightning-64/tide-wiki`: visual/reference archive for official Tide renders, screenshots, item-family organization and older general-wiki material. Some mechanics pages explicitly document older/outdated behavior, so their prose is not treated as current gameplay authority.
- `/tide2/`: existing Tideborne Fishing System 2.0 visual guide, exact-mechanics reference and interactive calculator concepts.

## Preserve

The existing `/tide2/` site remains live until the new `/tideborne/` site reaches content/tool parity. Existing URLs are not deleted during construction.

## Content migration decisions

- Existing Fishing 2.0 hero/catch pipeline -> Fishing landing page.
- Fishing Luck, Trait Luck, Body Type, Perfect Catch, Momentum and FishScore calculators -> Tools + linked mechanic pages.
- Existing exact-mechanics page -> `/tideborne/reference/mechanics/`.
- Current Tide 2 README/game flow -> Getting Started and Tide Foundations narrative.
- `/tideborne/tide/` must present Tide 2 as the base mod. It should explain Tide 2 first, then explain what Tideborne adds.
- Old Tide wiki structure and renders -> visual enrichment throughout the site, especially Tide Foundations, Gallery, Gear, Journal and Getting Started.
- Official old-wiki renders/screenshots may be loaded from the upstream repository, but their old mechanics prose is not copied when it conflicts with current Tide 2 or Tideborne.
- P10 config categories -> Configuration hierarchy.
- P10 Satchel presentation -> Satchel visual guide.
- Historical compatibility IDs -> Reference/Developer only unless a player needs them for troubleshooting.

## Authority rule

For Tide-owned behavior:

1. current Tide 2 code/current Tide 2 documentation;
2. current Tideborne integration behavior when Tideborne changes or extends presentation/interaction;
3. old Tide wiki only for images, historical context and organization.

For Tideborne-owned behavior, current Tideborne code/tests/reference data take priority.

## Readability rule

Player-facing pages should follow `READABILITY_STANDARD.md`.

The target includes readers with low English proficiency, including readers around EF EPI 450–499 and below 450. Important information must not depend on advanced vocabulary or long sentences. Exact mechanics may use technical terms, but those terms should be defined in simple English.

## UI source strategy

Use original Tideborne styling with interaction patterns inspired by shadcn/ui (command palette, sidebar, sheet/drawer, tabs, data table), Cult UI (shift/cutout cards, directional tabs, pixel accents), Aceternity-style restrained hero lighting/bento composition, and Radix/Base-UI accessibility conventions. Do not copy paid/proprietary template source.
