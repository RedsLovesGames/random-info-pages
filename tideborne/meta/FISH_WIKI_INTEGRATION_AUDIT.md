# Fish Wiki Integration Audit

## Scope

This audit defines the source, dependencies, path rules, and migration boundaries for replacing the Tideborne Fish page redirect with a native Fish Wiki inside Random Info Pages.

## Verified baselines

- Target repository: `RedsLovesGames/random-info-pages`
- Target branch: `main`
- Target baseline before integration: `ff0eca51789ab02e3e9e2fc00f7d0e0d4ef686d1`
- Source repository: `RedsLovesGames/Tide-2-Addons`
- Source branch inspected: `main`
- Source commit inspected: `518150bd302ba47d9de0ea039e2ba6a63be167b5`
- Source tree for that commit: `512c97a1c76c4ce2f8787b525d891585d5adf896`
- Render manifest records its own source-generation revision: `562044f09719cf024c4a5c2b398c9baf7456a576`

The target baseline matched the expected integration specification exactly before edits began.

No root `AGENTS.md` exists in the target repository at the verified baseline.

## Current target state

`tideborne/fish/index.html` is currently only an immediate redirect to the Tide-2-Addons Pages Fish Wiki. The native integration must replace that redirect.

The existing Tideborne shell is already centralized in:

- `tideborne/assets/site.css`
- `tideborne/assets/site.js`

The Fish Wiki must reuse that global shell rather than ship a second global header, sidebar, footer, search system, or mobile navigation implementation.

## Current source Fish Wiki dependencies

The current `Tide-2-Addons/fish/index.html` loads these CSS layers:

- `assets/styles.css`
- `assets/fish-wiki.css`
- `assets/fish-wiki-release.css`
- `assets/fish-wiki-v2.css`
- `assets/fish-catalog-redesign.css`
- `assets/fish-readability.css`
- `assets/fish-render-fit.css`
- `assets/fish-specimen-lab.css`
- `assets/fish-specimen-lab-stable.css`

It loads these JavaScript files:

- `assets/fish-runtime.js`
- `assets/fish-wiki.js`
- `assets/fish-specimen-lab.js`

The native port will not copy these layers wholesale. Their behavior and visual language are the reference. Fish-only target CSS and JS will be scoped under the Tideborne shell and obsolete controls will be removed.

## Runtime data dependencies

The verified `fish-runtime.js` loads exactly:

- `assets/fish-wiki-data-0.json.gz`
- `assets/fish-wiki-data-1.json.gz`
- `assets/fish-render-manifest.json`
- `fish/render-data/modpack-scope.json`

There is no requirement to hand-author fish cards or duplicate fish records into HTML.

The native target will vendor the required runtime data under a single namespace:

```text
tideborne/assets/fish/
```

The target runtime will resolve files relative to its own script URL so GitHub Pages deployment under `/random-info-pages/tideborne/` does not depend on domain-root paths.

## Render pipeline audit

The current render manifest contains:

- 157 fish records
- 150 fish with a normal source-backed render
- 7 fish with no valid render because the runtime entity renderer failed
- 900 requested variant states
- 900 available variant states for renderable fish

Unavailable fish and unavailable render states must stay unavailable in the public UI. The target will show `Render unavailable` rather than inventing art or entity geometry.

The source manifest points at render files under the source repository's Fish Wiki path. The target runtime must remap those filenames into the target-local render directory instead of preserving old relative-path assumptions.

## Source scope

The source `modpack-scope.json` limits the catalog to the Fish Wiki's approved namespaces and labels source mods. The native target will preserve this scope behavior and vendor the scope file locally.

## Controls retained

The native catalog keeps:

- category navigation
- fish search
- search suggestions
- source mod filter
- rarity filter
- star filter
- habitat filter
- sort
- reset
- active filter chips
- result count
- source-backed renders
- explicit missing-render states

## Controls removed or moved

The native public UI removes:

- Grid/List mode toggle
- Preview-state filter

Grid is the only catalog mode.

Sort moves into the Fish Wiki filter area.

The source Fish Wiki global top bar and global docs navigation are not ported. The existing Random Info Pages Tideborne shell owns global navigation.

## Detail behavior target

Fish cards open a large native detail dialog rather than navigating to a separate Fish Wiki page.

The detail route uses a namespace-safe hash such as:

```text
#tide__tuna
```

The implementation must support:

- direct URL load
- refresh
- copied URLs
- browser Back and Forward
- previous and next fish
- Escape to close
- focus restoration
- modal focus containment
- near/full-screen mobile detail

## FishScore and current-mechanics risk

The inspected Tide-2-Addons runtime includes an embedded FishScore calculation. It is historical source behavior, not automatically current Tideborne authority.

The integration will not treat that formula as current until it is checked against the current Tideborne canonical implementation/tests. FishScore, specimen size envelopes, Body Type, Condition, Pigmentation, Quality, and Perfect Specimen wording must come from current Tideborne behavior before final acceptance.

Current specimen terminology to preserve:

- Body Type: Normal, Giant, Dwarf
- Condition: Normal, Scarred, Parasite-Ridden
- Pigmentation: Normal, Albino, Iridescent
- Quality: current canonical values, including Perfect Specimen where supported

## Asset migration strategy

The render library is too large to maintain safely as hundreds of hand-written API changes. The integration uses a reproducible vendoring workflow pinned to the verified source commit.

The workflow copies only required data and source-backed render assets into the target repository. Core Fish Wiki browsing does not make runtime requests to Tide-2-Addons or its GitHub Pages site.

Expected vendored target data:

```text
tideborne/assets/fish/
  fish-wiki-data-0.json.gz
  fish-wiki-data-1.json.gz
  fish-render-manifest.json
  modpack-scope.json
  renders/
```

Target-specific Fish Wiki CSS and JavaScript will live in the same namespace but will be authored for the Random Info Pages shell rather than copied as an independent site.

## GitHub Pages path rules

The public base is:

```text
/random-info-pages/tideborne/
```

Implementation rules:

- no domain-root `/tideborne/...` asset assumptions
- no source-repository `../fish/...` render assumptions
- asset URLs resolve from the target Fish Wiki script or page location
- hash routing never rewrites the Pages base path
- all global navigation remains relative/base-safe

## Performance boundaries

- catalog renders use lazy loading
- active detail render may load eagerly
- no duplicate render copies
- optional render metadata failures must not make text/data browsing unusable
- specimen-lab code is not loaded unless retained for an actual visible feature
- catalog filtering should update only the catalog/result state needed

## Accessibility boundaries

Required before completion:

- semantic controls
- visible focus states
- accessible dialog semantics
- focus containment in detail dialog
- focus restoration after close
- Escape support
- keyboard search/suggestion navigation
- screen-reader result count
- useful render alt text
- accessible rarity/star labels
- reduced-motion behavior
- no color-only state

## Site-wide scope

After the Fish Wiki is native, small visual-language updates may be made to Home, Fishing, Gear, and Journal so Fish Wiki cards, chips, and compact stat rows feel native to the whole Tideborne site.

This phase does not authorize a full site rewrite. `/tide2/` must remain intact.

## Planned checkpoints

- [x] F1: dependency/source audit
- [ ] F2: native runtime/data/render port
- [ ] F3: Tideborne shell integration and catalog controls
- [ ] F4: detail overlay, routing, history, and mobile behavior
- [ ] F5: current Tide 2/Tideborne data validation
- [ ] F6: light site-wide visual harmonization
- [ ] F7: desktop/mobile/keyboard/path/deployment QC
