# Tideborne website content audit

## Authoritative sources

- `RedsLovesGames/TIDEBORNE`: current Tideborne gameplay, config, IDs, assets, P10 UI behavior, compatibility and validation.
- `Lightning-64/Tide-2`: **the base mod for Tideborne** and the authoritative source for current Tide-owned fishing behavior, player onboarding, fish/resource data and Tide-owned equipment.
- `RedsLovesGames/Tide-2-Addons`: **primary visual and information-architecture reference for this website**, especially the existing Fish Wiki at `/fish/`. Reuse its successful catalog patterns, render policy, fish information hierarchy, filters, search, deep links, and specimen presentation, but refresh all gameplay values against current Tide 2 + Tideborne before publishing them as current.
- `Lightning-64/tide-wiki`: secondary visual archive for official Tide renders/screenshots and older general-wiki material. Some mechanics pages explicitly document older behavior, so their prose is not treated as current gameplay authority.
- `/tide2/`: existing Tideborne Fishing System 2.0 visual guide, exact-mechanics reference and interactive calculator concepts.

## Preserve

The existing `/tide2/` site remains live until the new `/tideborne/` site reaches content/tool parity. Existing URLs are not deleted during construction.

The existing Tide-2-Addons Fish Wiki also remains a reference target while the new `/tideborne/fish/` catalog is rebuilt. Do not silently copy old FishScore formulas or stale version-specific values from it.

## Content migration decisions

- Existing Fishing 2.0 hero/catch pipeline -> Fishing landing page.
- Fishing Luck, Trait Luck, Body Type, Perfect Catch, Momentum and FishScore calculators -> Tools + linked mechanic pages.
- Existing exact-mechanics page -> `/tideborne/reference/mechanics/`.
- Current Tide 2 README/game flow -> Getting Started and Tide Foundations narrative.
- `/tideborne/tide/` must present Tide 2 as the base mod. It should explain Tide 2 first, then explain what Tideborne adds.
- `Tide-2-Addons` documentation shell -> main reference for player-facing wiki organization, compact documentation density, navigation, source/provenance notes and catalog interaction patterns.
- `Tide-2-Addons/fish/` -> main reference for the new Fish Database UX and information hierarchy.
- Old Tide wiki renders -> optional visual enrichment throughout Tide Foundations, Gallery, Gear, Journal and Getting Started.
- P10 config categories -> Configuration hierarchy.
- P10 Satchel presentation -> Satchel visual guide.
- Historical compatibility IDs -> Reference/Developer only unless a player needs them for troubleshooting.

## Fish Wiki direction

The new `/tideborne/fish/` should keep the strongest parts of the Tide-2-Addons Fish Wiki:

- a fast searchable catalog;
- Journal/category navigation;
- source mod, rarity/stars and habitat filtering;
- sorting in the filter/sidebar area;
- large source-authentic fish renders;
- compact cards with the most useful numbers first;
- namespace-safe deep links that survive refresh/copy/Back/Forward;
- detailed fish views with source, rarity, habitat/conditions, size information, FishScore context, specimen variants, related gear and exact IDs;
- clear data provenance and render provenance;
- unavailable source-backed renders labeled as unavailable rather than replaced by invented art.

For the new site, keep the catalog in grid/card form. Do not add a List mode or a user-facing Preview-state filter. Fish details should open in a large, readable modal/detail overlay while preserving a stable URL/hash and smooth return to the catalog.

## Authority rule

For Tide-owned behavior:

1. current Tide 2 code/current Tide 2 documentation;
2. current Tideborne integration behavior when Tideborne changes or extends presentation/interaction;
3. Tide-2-Addons wiki for layout/information architecture and any values that are independently revalidated;
4. old Tide wiki only for images, historical context and organization.

For Tideborne-owned behavior, current Tideborne code/tests/reference data take priority.

## Readability rule

Player-facing pages should follow `READABILITY_STANDARD.md`.

The target includes readers with low English proficiency, including readers around EF EPI 450–499 and below 450. Important information must not depend on advanced vocabulary or long sentences. Exact mechanics may use technical terms, but those terms should be defined in simple English.

Fish cards should use short labels such as `Size`, `FishScore`, `Habitat`, `Rarity`, and `Source`. Detailed explanations should use short sentences and define uncommon terms.

## UI source strategy

Use original Tideborne styling with interaction patterns inspired by shadcn/ui (command palette, sidebar, sheet/drawer, tabs, data table), Cult UI (shift/cutout cards, directional tabs, pixel accents), Aceternity-style restrained hero lighting/bento composition, and Radix/Base-UI accessibility conventions.

For fish and other reference databases, use the existing Tide-2-Addons Fish Wiki as the project-specific interaction reference before reaching for a generic component library. Do not copy paid/proprietary template source.
