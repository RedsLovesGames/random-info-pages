# Tideborne Fish Wiki reference

Primary reference site:

- https://redslovesgames.github.io/Tide-2-Addons/fish/
- source: `RedsLovesGames/Tide-2-Addons`

This is the main project-specific UX and information-architecture reference for the new `/tideborne/fish/` database.

## What to preserve

The existing Fish Wiki already solves several hard problems well:

- clear Fish Wiki identity inside the larger documentation site;
- category navigation by fishing/journal group;
- search across fish name, source mod, ID and habitat;
- filters for source mod, rarity/stars and habitat;
- visible result counts and active filter state;
- source-authentic fish renders;
- clear missing-render states instead of invented art;
- compact fish cards that surface FishScore and size context;
- detailed fish views with stable namespace-safe links;
- previous/next fish navigation;
- provenance information for catalog data and renders;
- responsive/mobile behavior;
- keyboard-accessible search/filter interactions.

## Changes for the new Tideborne site

The new `/tideborne/fish/` should improve on the older catalog rather than copy it byte-for-byte.

### Catalog

Keep:

- grid/card catalog;
- category tabs;
- search;
- source mod filter;
- rarity/stars filter;
- habitat filter;
- sorting;
- active-filter chips;
- result count;
- real fish renders.

Change:

- sorting belongs with the filters/sidebar;
- no List view toggle;
- no user-facing Preview-state filter;
- search should remain visually prominent and reliable;
- render area must show the whole fish without clipping;
- cards should use simpler labels for low-English readers.

### Fish card information

Each card should prioritize:

1. fish render;
2. fish name;
3. source mod;
4. rarity/stars;
5. normal size range;
6. full trait-aware size range when useful;
7. FishScore range/context;
8. short habitat label.

Do not overload cards with exact IDs or long conditions.

### Fish detail

Open fish details in a large modal/detail overlay over the catalog.

The URL/hash must still change to a stable namespace-safe deep link, for example:

```text
/tideborne/fish/#tide__tuna
```

Refresh, copy, Back and Forward must work.

The detail view should contain, in this order:

1. large source-authentic render;
2. fish name and source mod;
3. rarity/stars;
4. quick facts;
5. habitat and catch conditions;
6. normal size range;
7. trait-aware size range;
8. FishScore context;
9. Body Type / Condition / Pigmentation / Quality possibilities;
10. render variants where source-backed variants exist;
11. related gear/bait/requirements;
12. Journal/category information;
13. exact registry ID in an Advanced/Reference section;
14. data provenance and render provenance.

### Render policy

A render may only be shown as exact/current when it comes from legitimate source assets or a validated reconstruction.

If a render is unavailable:

- say `Render unavailable` or similar;
- explain the source is missing/unsupported when known;
- never create a fake replacement merely to fill the card.

Giant, Dwarf, Albino, Iridescent, Scarred and Parasite-Ridden variants should only be shown when source-backed or correctly generated from the authoritative rendering pipeline.

### Data authority

The old Tide-2-Addons Fish Wiki is a design/reference source, not the current gameplay authority.

Before publishing values in the new catalog, revalidate them against:

1. current Tide 2 data/source;
2. current Tideborne data/source/tests;
3. current compatibility data for supported fish mods.

Do not copy the old embedded FishScore formula into the new site unless it is proven identical to current Tideborne FishScore V2.

## Readability

Target low-English readers.

Prefer:

- `Where to catch` over `Acquisition conditions`;
- `Size` over `Physical length envelope`;
- `Source mod` over `Namespace owner`;
- `Needs` over `Prerequisites`;
- `FishScore` plus a short explanation;
- one idea per sentence;
- short headings;
- icons/images paired with text, never images alone.

Technical terms may appear in an Advanced section with a simple definition first.

## Mobile

On phones:

- filters become a drawer;
- fish cards stay large enough to read;
- fish renders remain fully visible;
- modal/detail view becomes a full-screen sheet;
- close/back action stays visible;
- no horizontal scrolling;
- touch targets remain comfortable.

## Reuse rule

Reuse the Tide-2-Addons interaction model and project-specific patterns aggressively.

Reuse current Tideborne design tokens and site shell so the new Fish Wiki still feels like one site.

Do not blindly copy old version labels, old FishScore formulas, stale values, or obsolete compatibility assumptions.
