# Toolbox Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand Random Info Pages Toolbox from four deep utilities to thirteen coherent, local-first workspaces while excluding #10 Web & Design Lab and preserving every standalone Random Info Pages project.

**Architecture:** Keep the existing static HTML/CSS/JavaScript GitHub Pages model. First turn `/tools/shared/` into a tiny registry/workspace platform, then expand the four existing tools and add nine new routes. Heavy browser/WASM engines stay lazy-loaded and each workspace keeps pure logic in testable modules.

**Tech Stack:** Static HTML/CSS/ES modules, browser platform APIs, Web Workers where useful, localStorage/IndexedDB/Cache Storage, Node `node:test` `.mjs` tests, selectively pinned permissive browser/WASM libraries recorded in `tools/OPEN_SOURCE.md`.

**Spec:** `docs/superpowers/specs/2026-09-24-toolbox-expansion-design.md`

## Global Constraints

- Work on the existing `toolbox` branch; do not modify `main` during implementation.
- Preserve all existing routes and standalone apps, especially `/wheel/`, `/whenwemeet/`, `/school-schedule/`, `/friends/`, game/reference pages, and the four current Toolbox routes.
- Exclude #10 Web & Design Lab from this expansion.
- Do not migrate the repository to React/Vite or another framework.
- Prefer browser/platform APIs first; add dependencies only when they materially reduce complexity or improve correctness.
- Pin and license-check every incorporated dependency; update `tools/OPEN_SOURCE.md` in the same task that introduces it.
- Do not upload user files to a remote service when a practical local implementation exists.
- Heavy engines/models/WASM must load only when their feature is opened.
- No placeholder cards on `/tools/`; add a workspace to the public index only when its core mode is working and tested.
- Every workspace needs deterministic pure-logic tests plus route/static smoke coverage.
- Run `node --test tests/*.test.mjs` after every task group that changes shared infrastructure or a shipped workspace.

## Review Focus

1. **Large local files**: processing must fail gracefully without freezing the entire Toolbox; add size guards, progress, cancellation where possible, and release object URLs/buffers.
2. **Missing browser capabilities**: unsupported APIs/WASM/WebGPU/MediaRecorder/File System Access must disable only the affected feature, not the entire workspace.
3. **Corrupt saved state**: registry preferences, workspace state and caches must fall back to defaults without throwing during page load.
4. **Deep links**: `/tools/<workspace>/?mode=<mode>` or hash links returned by Toolbox search must open the intended mode and still work under the GitHub Pages base path.
5. **Third-party load/network failure**: lazy dependency failure must produce a scoped error and preserve all browser-native modes that do not need that dependency.

---

# Delivery order

The expansion is executed in seven waves:

1. **Foundation**: registry/search/deep links/shared loaders/workspace primitives/test harness.
2. **Existing-tool expansion**: Time, Text, Money, Image.
3. **Document/file stack**: PDF & Documents, File & Archive.
4. **Media/data stack**: Media Studio, Data Studio.
5. **Developer/technical stack**: Developer Lab, Network & System Lab.
6. **General utility stack**: Math & Science, Random & Decision, Codes & Generator.
7. **Integration/hardening**: full index, search metadata, performance budgets, browser/mobile regression, attribution audit.

This order is deliberate: later workspaces reuse the shared registry, file-workspace shell, lazy loader, worker helper, download helper and split-pane/table primitives established earlier.

---

## Task 1: Build the shared Toolbox platform

**Files:**
- Modify: `tools/shared/toolbox.js`
- Modify: `tools/shared/toolbox.css`
- Create: `tools/shared/registry.js`
- Create: `tools/shared/loader.js`
- Create: `tools/shared/files.js`
- Create: `tools/shared/workers.js`
- Create: `tools/shared/workspace.js`
- Modify: `tools/index.html`
- Modify: `tests/toolbox-shell.test.mjs`
- Create: `tests/toolbox-registry.test.mjs`

**Interfaces:**
- `TOOLBOX_REGISTRY: Array<WorkspaceDefinition>` where each workspace contains `id`, `title`, `route`, `description`, `keywords`, `privacy`, and `modes[]`.
- `findToolboxMatches(query)` returns ranked workspace/mode matches.
- `loadScriptOnce(key, url, options)` and `loadModuleOnce(key, url)` deduplicate lazy dependency requests.
- `pickLocalFiles(options)`, `downloadBlob(blob, filename)`, `safeObjectUrl(blob)` centralize local file I/O.
- `openWorkspaceMode(modeId)` and `readRequestedMode()` standardize deep-link behavior.

- [ ] **Step 1: Add failing registry tests**

Add tests asserting the registry contains the thirteen in-scope workspaces, excludes `web-design`, contains mode aliases such as `merge pdf`, `base64`, `cidr`, and can rank exact mode matches above broad workspace matches.

Run:
```bash
node --test tests/toolbox-registry.test.mjs
```
Expected: FAIL because registry/search modules do not exist.

- [ ] **Step 2: Implement registry and deep-link helpers**

Create the registry with current four workspaces plus the nine planned routes. Do not render unfinished routes in the public index yet; store `status: 'planned' | 'ready'` and filter index cards to `ready`.

- [ ] **Step 3: Add lazy-load/file/worker helpers**

Implement request deduplication, dependency-load error caching/reset, object URL cleanup, download naming, worker creation/termination helpers, and a small status/progress API.

- [ ] **Step 4: Refactor Toolbox index to render from registry**

Remove the hard-coded four-card metadata duplication from `tools/index.html`; render ready cards, favorites and recent entries from the registry and include subtool search matches that deep-link into modes.

- [ ] **Step 5: Run regression tests**

```bash
node --test tests/*.test.mjs
```
Expected: all existing tests plus registry tests PASS.

- [ ] **Step 6: Commit**

```bash
git add tools/shared tools/index.html tests
 git commit -m "feat: add toolbox registry and shared workspace platform"
```

---

## Task 2: Expand Time Zone Board into Time & Scheduling

**Files:**
- Modify: `tools/time/index.html`
- Modify: `tools/time/time.css`
- Modify: `tools/time/time-app.js`
- Modify: `tools/time/time.js`
- Create: `tools/time/date-core.js`
- Create: `tools/time/rrule-core.js`
- Create: `tools/time/ics-core.js`
- Modify: `tests/toolbox-time.test.mjs`

**Modes:** `World Time`, `Date Math`, `Timestamps`, `Calendar`, `Recurring`, `Availability`.

- [ ] Add failing pure tests for date differences, business-day counting, Unix↔ISO conversion, DST-sensitive timestamp conversion, basic RRULE serialization and ICS escaping.
- [ ] Implement `date-core.js`, `rrule-core.js`, and `ics-core.js` without changing existing clock-board behavior.
- [ ] Add mode tabs and deep-link handling while preserving the current clock board as the default mode.
- [ ] Add ICS download and a visible link to `/whenwemeet/` from collaborative availability copy.
- [ ] Run `node --test tests/toolbox-time.test.mjs tests/toolbox-registry.test.mjs` and manually verify DST rollover on phone/desktop.
- [ ] Commit as `feat: expand toolbox time and scheduling`.

---

## Task 3: Expand Text Tools into Text Studio

**Files:**
- Modify: `tools/text/index.html`
- Modify: `tools/text/text.css`
- Modify: `tools/text/text-app.js`
- Modify: `tools/text/text-core.js`
- Create: `tools/text/diff-core.js`
- Create: `tools/text/unicode-core.js`
- Modify: `tests/toolbox-text.test.mjs`

**Modes:** `Clean`, `Lists`, `Find/Replace`, `Analyze`, `Compare`, `Markdown`.

- [ ] Add failing tests for regex replace preview, readability/reading-time fixtures, word-frequency normalization, text diff operations, Unicode NFC/NFD normalization and invisible-character detection.
- [ ] Implement pure logic modules first; use a small permissive diff library only if a clean local algorithm is not sufficient.
- [ ] Extend the existing tabbed UI instead of creating separate routes.
- [ ] Keep Markdown lazy loading and sanitized output behavior intact.
- [ ] Run text tests and full regression suite.
- [ ] Commit as `feat: expand toolbox text studio`.

---

## Task 4: Expand Money Through Time into Money & Finance

**Files:**
- Modify: `tools/money/index.html`
- Modify: `tools/money/money-app.js`
- Create/modify scoped money CSS as required
- Create: `tools/money/finance-core.js`
- Preserve: `tools/money/fx-core.js`
- Preserve: `tools/money/data/us-cpi.json`
- Modify: `tests/toolbox-money.test.mjs`

**Modes:** `Inflation`, `Currency`, `Savings`, `Loans`, `Investing`, `Income`.

- [ ] Add failing tests for compound growth, savings-goal contribution, loan payment/amortization totals, early-payoff comparison, CAGR, inflation-adjusted return, hourly↔salary and overtime math.
- [ ] Implement all deterministic finance math in `finance-core.js`; keep tax/paycheck outputs explicitly estimate-only and avoid pretending to model jurisdiction-specific withholding unless a verified dataset is later added.
- [ ] Add mode navigation while preserving CPI/FX defaults and source disclosures.
- [ ] Add compact amortization and growth tables generated locally.
- [ ] Run money tests and full suite.
- [ ] Commit as `feat: expand toolbox money and finance`.

---

## Task 5: Expand Image Studio

**Files:**
- Modify: `tools/image/index.html`
- Modify: `tools/image/image-app.js`
- Modify: `tools/image/image-engine.js`
- Create: `tools/image/annotate.js`
- Create: `tools/image/filters.js`
- Create: `tools/image/metadata.js`
- Create: `tools/image/compose.js`
- Create scoped CSS modules as needed
- Modify: `tests/toolbox-image.test.mjs`
- Modify: `tools/OPEN_SOURCE.md` for any new incorporated dependency

**Modes:** current `Output/Edit/Animate` workflow plus `Annotate`, `Compose`, `Metadata`.

- [ ] Add failing pure tests for filter parameter bounds, annotation coordinate transforms, stitch/composition dimensions and metadata-strip output naming/state.
- [ ] Implement Canvas-native grayscale/invert/basic sharpen/blur-redact first.
- [ ] Add annotations with non-destructive working-source state and undo/reset of the current edit session.
- [ ] Add vertical/horizontal screenshot stitching and framed composition without making this the excluded Web & Design Lab.
- [ ] Add metadata inspection/strip using browser APIs or a vetted permissive parser; pin and document it if introduced.
- [ ] Verify existing crop/GIF/background removal tests and manual workflows still pass.
- [ ] Commit as `feat: deepen toolbox image studio`.

---

## Task 6: Add PDF & Documents

**Files:**
- Create: `tools/pdf/index.html`
- Create: `tools/pdf/pdf.css`
- Create: `tools/pdf/pdf-app.js`
- Create: `tools/pdf/pdf-core.js`
- Create: `tools/pdf/pdf-render.js`
- Create: `tools/pdf/ocr.js`
- Create: `tests/toolbox-pdf.test.mjs`
- Modify: `tools/shared/registry.js`
- Modify: `tools/OPEN_SOURCE.md`

**Dependency candidates to license/pin in this task:** `pdf-lib`, PDF.js, Tesseract.js only for OCR mode. Do not add an additional PDF engine unless these cannot meet a documented requirement.

**Modes:** `Organize`, `Edit`, `Convert`, `Extract`, `OCR`, `Info`.

- [ ] Write failing tests for page-selection parsing, reorder maps, rotation normalization, output naming, watermark/page-number option normalization and OCR text-page association.
- [ ] Add dependency audit entries with exact pinned versions/revisions before integration.
- [ ] Implement one loaded-document state model used by merge/split/reorder/delete/rotate/extract operations.
- [ ] Build thumbnail/page-strip UI using PDF.js lazy loading; use `pdf-lib` for mutation/export.
- [ ] Add images→PDF and PDF pages→images.
- [ ] Add metadata/text/image extraction where engine support is reliable.
- [ ] Lazy-load Tesseract.js only in OCR mode; provide progress/cancel and keep non-OCR PDF operations usable if OCR fails to load.
- [ ] Mark PDF workspace `ready` in registry only after core Organize/Edit/Convert paths pass tests.
- [ ] Run full tests and manual multi-page PDF checks.
- [ ] Commit as `feat: add pdf and documents workspace`.

---

## Task 7: Add File & Archive Lab

**Files:**
- Create: `tools/files/index.html`
- Create: `tools/files/files.css`
- Create: `tools/files/files-app.js`
- Create: `tools/files/file-core.js`
- Create: `tools/files/hash-worker.js`
- Create: `tools/files/archive.js`
- Create: `tests/toolbox-files.test.mjs`
- Modify: `tools/shared/registry.js`
- Modify: `tools/OPEN_SOURCE.md`

**Modes:** `Inspect`, `Rename`, `Checksums`, `Duplicates`, `Metadata`, `Archives`.

- [ ] Add tests for rename templates, collision-safe names, extension transforms, duplicate grouping by hash, checksum comparison and archive path sanitization.
- [ ] Implement browser-native inspection and rename preview first.
- [ ] Use Web Crypto for supported hashes; introduce `hash-wasm` only for algorithms/streaming cases Web Crypto cannot handle, and run large hashing in a worker.
- [ ] Reuse existing `fflate` for ZIP where practical; add a broader permissive archive/WASM reader only after license/performance verification.
- [ ] Never write back over local originals; all renamed/archive outputs are downloads.
- [ ] Mark registry ready after Inspect/Rename/Checksums/ZIP are complete.
- [ ] Run full suite and manual large-file tests.
- [ ] Commit as `feat: add file and archive lab`.

---

## Task 8: Add Media Studio

**Files:**
- Create: `tools/media/index.html`
- Create: `tools/media/media.css`
- Create: `tools/media/media-app.js`
- Create: `tools/media/audio-core.js`
- Create: `tools/media/video-core.js`
- Create: `tools/media/record-core.js`
- Create: `tools/media/ffmpeg-engine.js`
- Create: `tests/toolbox-media.test.mjs`
- Modify: `tools/shared/registry.js`
- Modify: `tools/OPEN_SOURCE.md`

**Modes:** `Video`, `Audio`, `Record`, `Generate`, `Inspect`.

- [ ] Add tests for trim range validation, speed/pitch bounds, target dimensions, bitrate/file-size estimation and recording MIME preference selection.
- [ ] Build native playback, waveform, trim-range and Web Audio operations first.
- [ ] Add MediaRecorder screen/mic/webcam recording with capability checks and explicit source indicators.
- [ ] Add tone generator/metronome without external dependencies unless a library clearly reduces complexity.
- [ ] Integrate a pinned FFmpeg WASM build only for operations native APIs cannot reasonably export; lazy-load behind `ffmpeg-engine.js`.
- [ ] Add progress/cancel and release large buffers aggressively.
- [ ] Mark ready after core Audio/Video trim + Record + Inspect work, even if advanced codecs follow in the same task before completion.
- [ ] Run tests plus Chromium/Firefox recording/export manual matrix.
- [ ] Commit as `feat: add local media studio`.

---

## Task 9: Add Data Studio

**Files:**
- Create: `tools/data/index.html`
- Create: `tools/data/data.css`
- Create: `tools/data/data-app.js`
- Create: `tools/data/data-core.js`
- Create: `tools/data/table-adapter.js`
- Create: `tools/data/duckdb-engine.js`
- Create: `tools/data/spreadsheet-engine.js`
- Create: `tools/data/chart.js`
- Create: `tests/toolbox-data.test.mjs`
- Modify: `tools/shared/registry.js`
- Modify: `tools/OPEN_SOURCE.md`

**Modes:** `Table`, `Clean`, `Transform`, `Analyze`, `SQL`, `Chart`, `Export`.

- [ ] Add tests for delimiter detection, type inference, dedupe, missing-value preservation, column rename/type conversion, flatten/unflatten, descriptive statistics and SQL-engine load-state handling.
- [ ] Implement CSV/TSV/JSON/JSONL core parsing with deterministic local logic or Papa Parse after license/version audit.
- [ ] Add a table UI using a vetted permissive grid library or a focused custom virtualized table if dependency weight is excessive.
- [ ] Add XLSX import/export through a vetted SheetJS CE build; pin and document license/source.
- [ ] Lazy-load DuckDB-Wasm only when SQL/Parquet is opened; keep basic table/clean modes dependency-light.
- [ ] Add basic charts without turning this into the excluded Web & Design Lab; chart output is data analysis only.
- [ ] Preserve missing values as missing unless the user explicitly fills them.
- [ ] Mark ready after CSV/JSON table-clean-transform-export works; SQL/XLSX/Parquet remain part of task completion but may lazy-load.
- [ ] Run tests with fixtures for CSV, malformed CSV, JSON, empty cells and large-row sampling.
- [ ] Commit as `feat: add data studio`.

---

## Task 10: Add Developer Lab

**Files:**
- Create: `tools/developer/index.html`
- Create: `tools/developer/developer.css`
- Create: `tools/developer/developer-app.js`
- Create: `tools/developer/transform-core.js`
- Create: `tools/developer/regex-core.js`
- Create: `tools/developer/inspect-core.js`
- Create: `tools/developer/request-core.js`
- Create: `tools/developer/playground.js`
- Create: `tests/toolbox-developer.test.mjs`
- Modify: `tools/shared/registry.js`
- Modify: `tools/OPEN_SOURCE.md`

**Modes:** `Transform`, `Regex`, `Inspect`, `Diff`, `Schema`, `Request`, `Playground`.

- [ ] Add tests for Base64/URL/HTML entity round trips, hex/binary conversion, regex flags/replacement, JWT payload decoding without signature claims, URL query editing, safe request-header normalization and sandbox attribute generation.
- [ ] Implement common transforms as pure functions and support optional operation chaining in one input→operations→output workspace.
- [ ] Add JSON/YAML/XML format/validate/convert with vetted permissive parsers; never execute decoded payloads.
- [ ] Add certificate/JWT inspection as parsing only, with clear distinction between decoding and cryptographic verification.
- [ ] Add browser `fetch` request builder with explicit CORS limitation and no proxy/backend.
- [ ] Add sandboxed HTML/CSS/JS playground using a restrictive iframe sandbox; no access to parent localStorage/DOM.
- [ ] Add Mermaid preview only if the vetted dependency remains permissive and isolated as developer diagram preview; do not add broader design tooling.
- [ ] Run tests and manual XSS/sandbox cases.
- [ ] Commit as `feat: add developer lab`.

---

## Task 11: Add Network & System Lab

**Files:**
- Create: `tools/network/index.html`
- Create: `tools/network/network.css`
- Create: `tools/network/network-app.js`
- Create: `tools/network/ip-core.js`
- Create: `tools/network/transfer-core.js`
- Create: `tools/network/display-core.js`
- Create: `tests/toolbox-network.test.mjs`
- Modify: `tools/shared/registry.js`

**Modes:** `IP/Subnet`, `Data Size`, `Transfer`, `Media Size`, `Display`, `Capabilities`.

- [ ] Add tests for IPv4 CIDR boundaries, IPv6 normalization/compression, private/public classification, decimal/binary byte conversion, transfer-time calculation, bitrate-size calculation and PPI/aspect math.
- [ ] Implement pure network/math logic with no external dependency unless IPv6 correctness requires a small vetted parser.
- [ ] Add browser capability inspection limited to useful feature detection such as WebGPU, WASM, MediaRecorder, Clipboard, File System Access and OffscreenCanvas; avoid fingerprint-style uniqueness scores.
- [ ] Deep-link common searches such as `CIDR`, `download time`, `PPI` to the proper mode.
- [ ] Run tests and commit as `feat: add network and system lab`.

---

## Task 12: Add Math & Science Lab

**Files:**
- Create: `tools/math/index.html`
- Create: `tools/math/math.css`
- Create: `tools/math/math-app.js`
- Create: `tools/math/calc-core.js`
- Create: `tools/math/units-core.js`
- Create: `tools/math/science-core.js`
- Create: `tools/math/grade-core.js`
- Create: `tests/toolbox-math.test.mjs`
- Modify: `tools/shared/registry.js`
- Modify: `tools/OPEN_SOURCE.md` if math.js or another engine is incorporated

**Modes:** `Calculator`, `Units`, `Algebra`, `Graph`, `Geometry`, `Physics`, `Chemistry`, `Electronics`, `Grades`.

- [ ] Add tests for expression results, unit dimensions, matrix fixtures, geometry formulas, kinematics fixtures, molar-mass/dilution fixtures, Ohm's law/divider fixtures and weighted-grade/final-score calculations.
- [ ] Decide through a small dependency audit whether math.js meaningfully reduces error surface for expressions/units/matrices; if used, pin and document it.
- [ ] Keep domain calculators formula-driven and transparent: display variable names, units and formula used.
- [ ] Add simple graphing only after expression parser tests pass; isolate plotting from calculator core.
- [ ] Avoid symbolic-solver promises beyond the capabilities of the selected engine.
- [ ] Run deterministic fixtures and commit as `feat: add math and science lab`.

---

## Task 13: Add Random & Decision Lab

**Files:**
- Create: `tools/random/index.html`
- Create: `tools/random/random.css`
- Create: `tools/random/random-app.js`
- Create: `tools/random/random-core.js`
- Create: `tests/toolbox-random.test.mjs`
- Modify: `tools/shared/registry.js`

**Modes:** `Pick`, `Shuffle`, `Teams`, `Numbers`, `Chance`, `Seeded`, `Simulate`.

- [ ] Add tests for seeded determinism, Fisher-Yates permutation validity, weighted selection boundaries, unique sampling, team-size balancing and dice-distribution sanity with deterministic seeded fixtures.
- [ ] Use `crypto.getRandomValues()` for non-seeded secure randomness and a documented deterministic PRNG for seeded mode.
- [ ] Add an `Advanced wheel` link to `/wheel/`; do not duplicate Wheel's save/share/history/multi-wheel experience.
- [ ] Keep probability simulation client-side and cap iterations to a safe interactive maximum with a user override warning for larger runs.
- [ ] Run tests and commit as `feat: add random and decision lab`.

---

## Task 14: Add Codes & Generator Lab

**Files:**
- Create: `tools/codes/index.html`
- Create: `tools/codes/codes.css`
- Create: `tools/codes/codes-app.js`
- Create: `tools/codes/qr-core.js`
- Create: `tools/codes/secret-core.js`
- Create: `tests/toolbox-codes.test.mjs`
- Modify: `tools/shared/registry.js`
- Modify: `tools/OPEN_SOURCE.md`

**Modes:** `QR`, `Scan`, `Barcode`, `Passwords`, `Passphrases`, `IDs/Tokens`.

- [ ] Add tests for Wi-Fi QR escaping, vCard/calendar payload formatting, password character constraints, entropy-space calculation, UUID version/variant bits and secure-token byte length.
- [ ] Audit/pin one QR generation library and one scanning/barcode engine instead of stacking redundant libraries.
- [ ] Use camera scanning only after permission is explicitly requested from the Scan mode; uploaded-image scan remains available without camera access.
- [ ] Generate passwords/tokens with `crypto.getRandomValues()`. Never send generated secrets to analytics/network endpoints.
- [ ] Mark ready after QR generation/scanning and secure generators pass tests.
- [ ] Run tests and commit as `feat: add codes and generator lab`.

---

## Task 15: Toolbox-wide integration and search polish

**Files:**
- Modify: `tools/shared/registry.js`
- Modify: `tools/index.html`
- Modify: `tools/shared/toolbox.js`
- Modify: `tools/shared/toolbox.css`
- Modify: `tests/toolbox-shell.test.mjs`
- Modify: `tests/home-index.test.mjs` only if homepage copy/counts need updating

- [ ] Update all thirteen workspaces to `ready` only after their core feature sets are complete.
- [ ] Add registry aliases so common micro-tool searches resolve correctly: `merge pdf`, `compress image`, `base64`, `csv json`, `loan`, `timestamp`, `cidr`, `qr`, `random teams`, `unit converter`, and at least 40 additional common aliases drawn from the implemented modes.
- [ ] Add tests that every ready registry route exists and every mode deep link references a declared mode.
- [ ] Ensure favorites/recent state survives the registry-driven migration and ignores removed/unknown IDs safely.
- [ ] Verify the index remains visually compact despite thirteen cards using categories/filters rather than a giant unstructured grid if necessary.
- [ ] Run full suite.
- [ ] Commit as `feat: integrate expanded toolbox index`.

---

## Task 16: Performance, privacy and failure hardening

**Files:**
- Modify only affected workspace/shared files discovered by measurements
- Create: `tests/toolbox-static-budget.test.mjs`
- Modify: `tools/OPEN_SOURCE.md`

- [ ] Add static tests ensuring heavy dependency URLs/names are absent from initial HTML where they are intended to lazy-load.
- [ ] Verify each workspace can load its browser-native/default mode with the network blocked after the page shell is cached, except modes explicitly requiring live data such as FX or API requests.
- [ ] Confirm all local file workspaces avoid remote upload endpoints by searching source for `fetch`/XHR paths and reviewing each legitimate runtime dependency/data request.
- [ ] Audit object URL creation/revocation and worker termination paths.
- [ ] Verify corrupt localStorage does not stop Toolbox/index loading.
- [ ] Verify `prefers-reduced-motion`, keyboard focus and touch target behavior across new shared components.
- [ ] Update `tools/OPEN_SOURCE.md` so every incorporated source lists exact version/revision, license, integration location and modifications.
- [ ] Run full suite and commit as `chore: harden expanded toolbox runtime`.

---

## Task 17: Cross-browser and deployment verification

**Files:**
- No product changes unless verification finds defects
- Update tests alongside any defect fix

- [ ] Run:
```bash
node --test tests/*.test.mjs
```
Expected: all tests PASS.

- [ ] Serve the repository locally from its root and verify relative paths under a `/random-info-pages/` style base path, not only `/`.
- [ ] Desktop Chromium: open every workspace and at least one deep-linked mode.
- [ ] Desktop Firefox: repeat core paths, especially PDF render, local files, MediaRecorder, Web Workers and downloads.
- [ ] Phone-width responsive pass: 360–430 px widths for all thirteen pages; check overflow, clipping, dialogs, tabs, file queues and tables.
- [ ] Exercise failure paths by blocking CDN/runtime dependency requests and confirming scoped degradation.
- [ ] Verify existing standalone routes (`/wheel/`, `/whenwemeet/`, `/school-schedule/`, `/friends/`, Tideborne/Tide2, VCT Scout and existing archive pages) still open unchanged.
- [ ] Fix every discovered regression with a targeted test where deterministic reproduction is possible.
- [ ] Final commit only after observed verification: `test: verify expanded toolbox release`.

---

# Workspace dependency map

| Workspace | Primary shared pieces | Heavy/lazy candidates | Backend |
|---|---|---|---|
| Time & Scheduling | registry, tabs, download | none required for core | none |
| Image Studio | file workspace, progress, workers | existing Pica/Cropper/gifenc/ONNX; metadata parser if added | none |
| Money & Finance | tabs, data/source status | live FX endpoint only | none |
| Text Studio | split pane, copy | existing Marked/DOMPurify; optional diff lib | none |
| PDF & Documents | file workspace, progress, workers | pdf-lib, PDF.js, Tesseract.js | none |
| File & Archive | file queue, workers, download | existing fflate; optional hash/archive WASM | none |
| Media Studio | file workspace, progress, workers | FFmpeg WASM only when required | none |
| Data Studio | file workspace, table, workers | DuckDB-Wasm, XLSX engine, optional grid | none |
| Developer Lab | split pane, copy, lazy loader | YAML/XML/schema/diff/Mermaid libs as vetted | none; browser fetch only |
| Math & Science | tabs, result panels | math engine/plotter if vetted | none |
| Random & Decision | basic forms | none | none |
| Codes & Generator | camera/file input | QR/barcode engine | none |
| Network & System | basic forms | none or tiny IP parser | none |

# Recommended execution sequence

Execute tasks strictly in this order unless a failing dependency audit requires a swap:

`1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13 → 14 → 15 → 16 → 17`

The highest-value visible milestone is after Task 7: the existing four tools are deeper and the two most broadly useful new workspaces, PDF and File, are live. The next major milestone is after Task 10, when Media, Data and Developer capabilities are present.

# Definition of done

The expansion is complete only when:
- thirteen in-scope Toolbox workspaces are live and searchable;
- Web & Design Lab is absent;
- common micro-tool searches deep-link to the correct mode;
- all existing standalone Random Info Pages projects still work;
- all deterministic tests pass from one `node --test tests/*.test.mjs` run;
- heavy dependencies remain lazy-loaded;
- incorporated open-source dependencies are fully documented;
- phone and desktop layouts have been manually checked in Chromium and Firefox;
- failures of optional CDN/WASM/runtime dependencies degrade locally instead of taking down an entire workspace.
