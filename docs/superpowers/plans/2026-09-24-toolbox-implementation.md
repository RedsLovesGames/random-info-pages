# Random Info Pages Toolbox Implementation Plan

> Branch: `toolbox`
> Approved design: `docs/superpowers/specs/2026-09-24-toolbox-design.md`

## Goal
Implement the approved Toolbox as a static, GitHub-Pages-compatible extension of Random Info Pages without changing unrelated existing tools. Work only on the existing `toolbox` branch until the feature is ready for review.

## Guardrails
- Do not create additional branches.
- Do not modify `main` during implementation.
- Preserve Wheel, When We Meet, and all existing routes.
- Keep the existing static HTML/CSS/JavaScript architecture. Do not migrate the repository to React/Vite or another framework.
- User image processing stays local to the browser.
- Heavy media/ML dependencies load only when invoked.
- Verify third-party licenses before copying implementation code.
- Record every incorporated third-party source in `/tools/OPEN_SOURCE.md`.
- Commit in small functional stages and run deterministic checks before claiming completion.

## Phase 0 — Upstream and repository audit

### Task 0.1: Confirm repository baseline
Inspect the `toolbox` branch and current homepage/navigation. Record the exact existing paths that must remain stable.

Expected existing files to inspect include:
- `index.html`
- `CHATGPT.md` if present
- current Wheel route/files
- current When We Meet route/files
- any shared CSS/JS/assets

Do not alter behavior in this task.

### Task 0.2: Verify candidate open-source components
Research and record exact repository, current revision/tag, license, and useful subsystem for each candidate before reuse:
- ZoneMap or a better permissively licensed alternative for time-zone/city/time-scrubbing ideas.
- Alatify and/or PicBrew/ImageToolkit or better alternatives for browser-local image conversion/resizing/compression patterns.
- Light Converter or a better permissively licensed browser-local background-removal implementation.
- `ffmpeg.wasm` for animated-media/video operations.
- IT-Tools only as behavioral/UX reference unless its copyleft obligations are deliberately accepted.

Prefer browser standards over dependencies when the implementation is simple, especially `Intl.DateTimeFormat`, Canvas, `createImageBitmap`, `toBlob`, localStorage, and native file APIs.

### Task 0.3: Create attribution ledger
Create `/tools/OPEN_SOURCE.md` before importing third-party implementation code. For each incorporated source record:
- project and repository URL
- revision/tag
- license
- exact code/logic/assets used
- local modifications
- attribution/notice requirements

If a candidate is only studied and no code is incorporated, it does not need to be represented as incorporated code, but notes may identify it as a reference.

---

## Phase 1 — Toolbox shell

### Task 1.1: Add shared Toolbox primitives
Create:
- `/tools/shared/toolbox.css`
- `/tools/shared/toolbox.js`

Shared behavior should cover only genuinely common functionality such as:
- local preference helpers
- favorite/recent-tool storage
- clipboard helper
- lightweight status/toast handling
- common navigation/header behavior

Keep tools independently loadable.

### Task 1.2: Build `/tools/index.html`
Implement a compact launch surface with:
- Time Zone Board
- Image Studio
- Money Through Time
- Text Tools
- search/filter
- favorites
- recent tools
- privacy/data-processing labels

Use the current Random Info Pages visual language while keeping utility controls conventional and obvious.

### Task 1.3: Add smoke check for routes
Add a small deterministic script/test suitable for the repository that verifies the Toolbox index and required relative paths exist. Do not add a large test framework solely for this.

Commit target: `feat: add toolbox shell`

---

## Phase 2 — Time Zone Board

### Task 2.1: Write pure time/state logic first
Create `/tools/time/time.js` with separable functions for:
- formatting an instant in an IANA zone
- deriving UTC offset from the selected instant
- calculating day difference from the reference zone
- validating supported time-zone identifiers
- serializing/deserializing saved board state

Add deterministic checks for:
- a normal multi-zone conversion
- a U.S. DST boundary
- day rollover across zones
- corrupt/missing saved state fallback

### Task 2.2: Build Time Zone Board UI
Create `/tools/time/index.html` and its scoped styles/scripts.

Required behavior:
- add named clock
- choose/search time zone
- edit/remove clock
- reorder clocks
- select reference clock/zone
- 12/24-hour preference
- master time slider
- Now reset
- show date and day difference
- persist board locally

Use `Intl.DateTimeFormat` unless verified upstream code materially improves city/time-zone selection without adding unnecessary weight.

### Task 2.3: Add overlap visualization
Allow optional waking/available hours and calculate visible overlap. Keep this secondary to the primary clock comparison workflow.

### Task 2.4: Manual checks
Verify at phone and desktop widths, including DST-sensitive zones and date rollover.

Commit target: `feat: add time zone board`

---

## Phase 3 — Image Studio core

### Task 3.1: Write image-dimension helpers first
Create pure helpers for:
- aspect-ratio-preserving resize
- percentage resize
- fit/fill dimensions
- invalid/zero dimension rejection

Add deterministic checks before UI integration.

### Task 3.2: Build local file workspace
Create `/tools/image/index.html` plus scoped JS/CSS supporting:
- drag/drop and file picker
- preview
- original dimensions/type/size
- output format
- width/height
- aspect lock
- percentage resize
- quality slider where supported
- PNG/JPEG/WebP output
- crop/fit behavior where practical
- explicit save/download

Use native browser image APIs first. Do not add FFmpeg for operations Canvas can perform reliably.

### Task 3.3: Batch workflow
Add multiple-file queue, per-file status, and batch export. ZIP support may use a small permissively licensed dependency if verified and justified.

### Task 3.4: Resource/error handling
- preserve original selection on transform failure
- reject unsupported outputs clearly
- warn before very large processing jobs
- release object URLs/buffers
- keep expensive work off the main UI path where practical

Commit target: `feat: add local image studio`

---

## Phase 4 — GIF and background-removal enhancements

### Task 4.1: GIF creation
After license verification, integrate the lightest practical implementation for GIF creation from stills. Use FFmpeg WASM only where it provides meaningful capability not reasonably covered by a smaller focused encoder.

Required controls:
- frame order
- FPS/delay
- dimensions
- loop
- output preview/download

### Task 4.2: Animated/video processing
Lazy-load `ffmpeg.wasm` only when the user invokes a media operation requiring it. Show load/progress/failure state and keep basic Image Studio functions available if FFmpeg fails.

### Task 4.3: Local background removal
Verify the chosen upstream implementation/model and license. Integrate on-device background removal with:
- transparent PNG output
- WebGPU path when available
- documented fallback when available
- model lazy loading
- progress/error state

Do not send source images to a remote inference service.

Commit target: `feat: add advanced image tools`

---

## Phase 5 — Money Through Time: inflation

### Task 5.1: Freeze a defensible CPI dataset
Use a reputable public source for the longest defensible U.S. annual series. Prefer modern official BLS CPI where applicable and clearly identify earlier reconstructed/estimated history if a long-run series such as the Federal Reserve Bank of Minneapolis series is used.

Create a versioned static data file under `/tools/money/data/` with:
- year
- index value
- source/methodology marker where needed
- source/update metadata

Do not fabricate missing years.

### Task 5.2: Write calculation logic first
Create pure functions for:
- equivalent purchasing power
- multiplier
- cumulative percentage price-level change
- missing-year handling

Add fixture-based checks with known index values.

### Task 5.3: Build inflation UI
Create `/tools/money/index.html` with:
- amount
- source year
- target year
- equivalent amount
- multiplier
- cumulative change
- source/methodology disclosure
- compact visualization if it materially improves comprehension

Commit target: `feat: add historical inflation calculator`

---

## Phase 6 — Multi-currency conversion

### Task 6.1: Select live FX source
Choose a reputable, browser-accessible, no-user-key endpoint suitable for a static GitHub Pages application. Record:
- provider
- terms/license
- rate date semantics
- supported currencies
- CORS behavior
- failure behavior

Do not hardcode a provider until this is verified.

### Task 6.2: Implement fetch/cache layer
Implement:
- live fetch
- effective-date display
- short local cache
- stale-cache labeling
- graceful unavailable state

Add deterministic tests for cache freshness/staleness logic independent of the network.

### Task 6.3: Add one-to-many currency UI
Allow selected target currencies on the same page. Keep inflation adjustment and FX conversion visually and computationally distinct.

Commit target: `feat: add multi-currency conversion`

---

## Phase 7 — Text utilities

### Task 7.1: Write transformation functions and checks
Implement pure local functions for:
- word/character/line counts
- upper/lower/title/sentence case
- trim lines
- collapse whitespace
- remove blank lines
- line deduplication

Cover Unicode, blank input, repeated whitespace, and duplicate-line edge cases.

### Task 7.2: Build `/tools/text/index.html`
Provide a simple input/output workspace with immediate results and copy controls. Do not split trivial transforms into many separate pages.

Commit target: `feat: add text utilities`

---

## Phase 8 — Homepage integration and final verification

### Task 8.1: Integrate Toolbox into homepage
Modify the existing homepage minimally so Toolbox is discoverable in the Tools area. Preserve Wheel, When We Meet, and unrelated existing content.

### Task 8.2: Finish attribution
Audit `/tools/OPEN_SOURCE.md` against actual incorporated code and assets. Remove references to candidates that were never incorporated if they are described as dependencies. Include required license notices.

### Task 8.3: Full deterministic verification
Run every existing repository check plus new Toolbox checks. Verify at minimum:
- all Toolbox routes resolve under the GitHub Pages base path
- existing routes still resolve
- time-zone DST boundary
- date rollover
- saved clock serialization/deserialization
- image dimension/aspect logic
- PNG/JPEG/WebP conversion with representative fixtures
- batch image flow
- GIF flow if shipped
- background removal if shipped
- inflation fixture calculation
- missing inflation year behavior
- FX cache stale/fresh behavior
- text edge cases
- no broken relative asset paths

### Task 8.4: Manual UI verification
Inspect mobile and desktop layouts for:
- horizontal overflow
- clipped controls
- touch target size
- keyboard focus
- contrast
- reduced motion
- long filenames
- long clock names
- slow/failed optional dependency loads

### Task 8.5: Production readiness
Verify the exact static files that GitHub Pages will serve. Do not claim deployment success unless the deployed/static target was actually checked.

Commit target: `feat: complete toolbox integration`

---

## Definition of Done
The Toolbox v1 is done only when:
- the shell and four primary routes work independently;
- Time Zone Board is DST-correct and persistent;
- basic Image Studio processing is local and usable on mobile;
- optional GIF/background-removal functionality degrades safely;
- inflation calculations use versioned sourced data;
- live FX clearly identifies source/effective date and handles failure;
- text utilities work locally;
- open-source reuse is license-audited and documented;
- existing Random Info Pages routes remain intact;
- deterministic checks have actually been run and observed;
- mobile/desktop manual validation has actually been performed.

## Execution rule
Execute this plan sequentially on the existing `toolbox` branch. Do not create another branch. If an implementation discovery requires changing the approved architecture materially, update the design/plan explicitly before proceeding rather than silently introducing a parallel architecture.