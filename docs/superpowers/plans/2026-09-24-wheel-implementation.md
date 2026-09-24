# Random Info Pages Wheel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `/wheel/` as a simple, dependable, near-feature-parity Wheel of Names replacement with a cleaner interface, secure winner selection, local persistence, sharing, customization, and multiple-wheel support.

**Architecture:** Implement a dependency-free static application under `wheel/`. Pure state, selection, serialization, and geometry logic live in focused JavaScript modules that can be tested with Node's built-in test runner; Canvas 2D handles wheel drawing and animation; `app.js` binds those modules to semantic HTML controls and browser storage APIs. The deployed app requires no backend.

**Tech Stack:** Static GitHub Pages, HTML5, CSS, vanilla ES modules, Canvas 2D, Web Crypto API, localStorage, File/Blob APIs, Node built-in test runner, existing GitHub Actions Pages workflow.

**Spec:** `docs/superpowers/specs/2026-09-24-wheel-design.md`

## Global Constraints

- Functional reimplementation only: do not copy Wheel of Names source code, branding, proprietary assets, or internal implementation.
- No server, user accounts, cloud database, Firebase, Supabase, analytics, or ads in the initial release.
- Winner selection must use `crypto.getRandomValues()` in production and must be decided before animation begins.
- Duplicate text entries remain independent entries unless the user explicitly selects an all-matches action.
- Blank entries and entries with non-positive/invalid effective weights are ineligible for selection.
- The default UI stays simple; uncommon controls are progressively disclosed through Settings or secondary menus.
- The application must work under the GitHub Pages project path `/random-info-pages/wheel/`; no root-absolute asset URLs.
- Current valid state must survive malformed imports, malformed share data, and recoverable storage failures.
- Mobile and desktop layouts are both first-class.
- Use no heavyweight framework or runtime dependency.

## Review Focus

1. **Selection integrity:** boundary random values, duplicate names, invalid weights, and large weights must never select an ineligible entry or bias segment mapping.
2. **State safety:** corrupt JSON, unsupported schema versions, storage quota errors, and malformed share payloads must fail without replacing the current valid wheel.
3. **Animation correctness:** the visual wheel must stop on the winner chosen before animation, including weighted segments and reduced-motion mode.
4. **Project-path hosting:** every script, stylesheet, icon, share link, and root-page link must resolve correctly from `/random-info-pages/wheel/` rather than assuming domain root hosting.
5. **Large/mobile inputs:** hundreds of entries, long labels, image entries, narrow screens, and touch interaction must remain usable even when not every wheel label can be drawn.

---

## File Structure

### Create

- `wheel/index.html` — semantic application shell, canvas, entry editor, dialogs/sheets, menus, status regions.
- `wheel/styles.css` — responsive desktop/mobile layout, appearance themes, dialogs, presentation mode, reduced-motion treatment.
- `wheel/model.js` — versioned application-state schema, factories, sanitization, wheel/entry mutations.
- `wheel/random.js` — unbiased Web Crypto random integer/value helpers and weighted winner selection.
- `wheel/geometry.js` — weighted segment geometry, angle normalization, pointer/winner mapping, final landing-angle calculation.
- `wheel/storage.js` — autosave, named saves, schema-safe parsing, import/export, share serialization/deserialization.
- `wheel/render.js` — Canvas 2D wheel renderer, text/image placement, palette/contrast helpers.
- `wheel/spin.js` — presentation-only spin controller, easing, tick-boundary detection, reduced-motion path.
- `wheel/app.js` — DOM binding, event handling, dialogs/settings, multi-wheel orchestration, notifications.
- `wheel/model.test.mjs`
- `wheel/random.test.mjs`
- `wheel/geometry.test.mjs`
- `wheel/storage.test.mjs`
- `wheel/spin.test.mjs`

### Modify

- `index.html` — add Wheel card and direct-index link without redesigning unrelated content.
- `.github/workflows/pages.yml` — run wheel unit/syntax/static checks before staging, then smoke-check deployed `/wheel/` assets.
- `README.md` — add the public Wheel route to the small route list.

---

## Stable Interfaces

These names are fixed for the plan so later tasks do not invent parallel abstractions.

```js
// model.js
export const SCHEMA_VERSION = 1;
export function createEntry(label = '');
export function createWheel(name = 'Wheel');
export function createDefaultState();
export function sanitizeState(input);
export function getActiveWheel(state);
export function eligibleEntries(wheel);

// random.js
export function secureUint32(cryptoObj = globalThis.crypto);
export function secureUnitFloat(cryptoObj = globalThis.crypto);
export function pickWeightedEntry(entries, unitRandom);

// geometry.js
export function buildSegments(entries);
export function normalizeAngle(angle);
export function winnerIndexAtPointer(segments, rotation, pointerAngle = -Math.PI / 2);
export function landingRotationForIndex(segments, winnerIndex, currentRotation, extraTurns = 6, pointerAngle = -Math.PI / 2);

// storage.js
export function parseStateJSON(text);
export function exportStateJSON(state);
export function encodeShareState(state);
export function decodeShareState(hash);
export function createStorageAdapter(storage);

// render.js
export function drawWheel(ctx, canvas, wheel, rotation, options = {});

// spin.js
export function createSpinPlan({ segments, winnerIndex, currentRotation, durationMs, extraTurns, reducedMotion });
export function easeOutQuint(t);
```

---

### Task 1: Build and test the versioned state model

**Files:**
- Create: `wheel/model.js`
- Create: `wheel/model.test.mjs`

**Produces:** `SCHEMA_VERSION`, state/entry/wheel factories, sanitization, active-wheel lookup, eligible-entry filtering, immutable-enough mutation helpers used by `app.js`.

- [ ] **Step 1: Write failing model tests**

Cover defaults, duplicate-label independence, blank-entry exclusion, invalid weight normalization, missing active-wheel recovery, and malformed nested settings.

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultState, sanitizeState, eligibleEntries } from './model.js';

test('duplicate labels remain separate eligible entries', () => {
  const state = createDefaultState();
  state.wheels[0].entries = [
    { id: 'a', label: 'Alex', weight: 1 },
    { id: 'b', label: 'Alex', weight: 1 }
  ];
  assert.deepEqual(eligibleEntries(state.wheels[0]).map(e => e.id), ['a', 'b']);
});

test('blank and non-positive entries are excluded', () => {
  const state = sanitizeState({ schemaVersion: 1, activeWheelId: 'w', wheels: [{ id: 'w', name: 'Wheel', entries: [
    { id: 'a', label: ' ', weight: 1 },
    { id: 'b', label: 'B', weight: 0 },
    { id: 'c', label: 'C', weight: 2 }
  ]}] });
  assert.deepEqual(eligibleEntries(state.wheels[0]).map(e => e.id), ['c']);
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `node --test wheel/model.test.mjs`

Expected: FAIL because `wheel/model.js` does not exist.

- [ ] **Step 3: Implement the minimal versioned model**

Use stable generated IDs (`crypto.randomUUID()` when available, timestamp/counter fallback only for identity, never winner randomness), defaults for appearance/spin/winner settings, and defensive sanitization that returns a valid state instead of mutating untrusted input.

- [ ] **Step 4: Add Review Focus tests owned by this task**

Add tests for 500-entry state sanitization, extremely long labels remaining strings rather than throwing, and unsupported schema versions being rejected by the parser layer rather than silently reinterpreted.

- [ ] **Step 5: Run tests**

Run: `node --test wheel/model.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add wheel/model.js wheel/model.test.mjs
git commit -m "feat(wheel): add versioned wheel state model"
```

---

### Task 2: Implement unbiased weighted winner selection

**Files:**
- Create: `wheel/random.js`
- Create: `wheel/random.test.mjs`

**Consumes:** `eligibleEntries(wheel)` returns sanitized entries with positive weights.

**Produces:** deterministic `pickWeightedEntry(entries, unitRandom)` plus production Web Crypto helpers.

- [ ] **Step 1: Write boundary tests before implementation**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { pickWeightedEntry } from './random.js';

const entries = [
  { id: 'a', weight: 1 },
  { id: 'b', weight: 3 }
];

test('weighted boundaries map to the correct entry', () => {
  assert.equal(pickWeightedEntry(entries, 0).id, 'a');
  assert.equal(pickWeightedEntry(entries, 0.249999).id, 'a');
  assert.equal(pickWeightedEntry(entries, 0.25).id, 'b');
  assert.equal(pickWeightedEntry(entries, 0.999999999).id, 'b');
});
```

Also test empty input, a single entry, duplicate labels with distinct IDs, and invalid unit random values.

- [ ] **Step 2: Run and verify failure**

Run: `node --test wheel/random.test.mjs`

Expected: FAIL because module is missing.

- [ ] **Step 3: Implement secure randomness and deterministic selection**

`secureUnitFloat()` must derive from `crypto.getRandomValues(new Uint32Array(1))` and divide by `2 ** 32`. `pickWeightedEntry()` must not call randomness internally; it receives a unit value so tests and animation remain independent.

- [ ] **Step 4: Add a statistical sanity test that is tolerant, not a proof**

Use a deterministic pseudo-random test sequence over 40,000 samples for weights 1:3 and assert the second entry falls in a broad 73%-77% band. This guards accidental equal-weight selection without making CI flaky.

- [ ] **Step 5: Run tests**

Run: `node --test wheel/random.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add wheel/random.js wheel/random.test.mjs
git commit -m "feat(wheel): add secure weighted selection"
```

---

### Task 3: Build deterministic weighted wheel geometry

**Files:**
- Create: `wheel/geometry.js`
- Create: `wheel/geometry.test.mjs`

**Consumes:** sanitized eligible entries.

**Produces:** weighted angular segments and exact landing rotations consumed by renderer/spin controller.

- [ ] **Step 1: Write failing geometry tests**

Test equal thirds, 1:3 weighted arcs, angle wrapping above/below `2π`, and landing rotation for every segment.

```js
test('landing rotation maps back to the preselected winner', () => {
  const segments = buildSegments([
    { id: 'a', label: 'A', weight: 1 },
    { id: 'b', label: 'B', weight: 2 },
    { id: 'c', label: 'C', weight: 1 }
  ]);
  for (let i = 0; i < segments.length; i++) {
    const rotation = landingRotationForIndex(segments, i, 0.37, 6);
    assert.equal(winnerIndexAtPointer(segments, rotation), i);
  }
});
```

- [ ] **Step 2: Run and verify failure**

Run: `node --test wheel/geometry.test.mjs`

- [ ] **Step 3: Implement segment geometry**

Each segment is `{ entry, index, startAngle, endAngle, centerAngle, fraction }`. Arc sizes derive from weight/totalWeight. Use one normalization convention throughout.

- [ ] **Step 4: Add Review Focus tests**

Test very small and very large weight ratios, final-angle precision, current rotations greater than 100 turns, and pointer mapping at exact boundaries using a documented half-open interval rule.

- [ ] **Step 5: Run tests and commit**

```bash
node --test wheel/geometry.test.mjs
git add wheel/geometry.js wheel/geometry.test.mjs
git commit -m "feat(wheel): add weighted wheel geometry"
```

---

### Task 4: Add safe persistence, named saves, import/export, and sharing

**Files:**
- Create: `wheel/storage.js`
- Create: `wheel/storage.test.mjs`

**Consumes:** `sanitizeState()` and `SCHEMA_VERSION`.

**Produces:** safe storage adapter, JSON round-trip, compact URL-fragment sharing.

- [ ] **Step 1: Write failing round-trip and failure-safety tests**

Use an in-memory fake `Storage` object. Verify autosave load/save, named save/load/delete, export/import equivalence, malformed JSON rejection, malformed fragment rejection, and quota-like `setItem()` exceptions.

- [ ] **Step 2: Run and verify failure**

Run: `node --test wheel/storage.test.mjs`

- [ ] **Step 3: Implement storage keys and schema-safe parsing**

Use namespaced keys such as:

```js
const AUTOSAVE_KEY = 'rip-wheel:autosave:v1';
const SAVES_KEY = 'rip-wheel:named-saves:v1';
```

`parseStateJSON()` parses first, validates schema version, sanitizes into a new state, and throws a concise typed error on failure. Never clear the current state as part of parsing.

- [ ] **Step 4: Implement backend-free share encoding**

Serialize a compact state projection to UTF-8 JSON and encode it into `#wheel=<base64url>`. Enforce a practical final URL length ceiling of 8,000 characters; return `{ ok:false, reason:'too-large' }` instead of generating an unreliable URL.

- [ ] **Step 5: Add Review Focus tests**

Test Unicode/emoji labels, a corrupt saved-state string, a storage adapter that throws on reads and writes, an overlong share payload, and shared-state decoding that leaves a pre-existing autosave untouched.

- [ ] **Step 6: Run tests and commit**

```bash
node --test wheel/storage.test.mjs
git add wheel/storage.js wheel/storage.test.mjs
git commit -m "feat(wheel): add local saves import export and sharing"
```

---

### Task 5: Render the wheel with Canvas 2D

**Files:**
- Create: `wheel/render.js`

**Consumes:** `buildSegments(entries)`, wheel appearance state, current rotation.

**Produces:** `drawWheel(ctx, canvas, wheel, rotation, options)`.

- [ ] **Step 1: Implement DPR-aware canvas sizing and segment drawing**

Resize backing dimensions to CSS size × device pixel ratio. Draw all weighted arcs from geometry, a fixed pointer, center hub, borders, and automatic/custom palette colors.

- [ ] **Step 2: Implement readable label policy**

For modest entry counts, draw rotated/truncated text. For dense wheels, reduce label frequency rather than rendering unreadable overlaps. Long labels are ellipsized based on available radial width.

- [ ] **Step 3: Implement optional images and center image**

Load browser-supported image files through object/data URLs, clip per-entry images to a bounded region, and fall back to text if an image fails. Never let image failure prevent spinning.

- [ ] **Step 4: Implement contrast-aware text**

Convert segment hex colors to relative luminance and choose dark/light text with a deterministic threshold.

- [ ] **Step 5: Syntax-check**

Run: `node --check wheel/render.js`

Expected: no output / exit code 0.

- [ ] **Step 6: Commit**

```bash
git add wheel/render.js
git commit -m "feat(wheel): render responsive canvas wheel"
```

---

### Task 6: Implement spin presentation without coupling it to winner selection

**Files:**
- Create: `wheel/spin.js`
- Create: `wheel/spin.test.mjs`

**Consumes:** winner index selected by `random.js`; final rotation from `geometry.js`.

**Produces:** spin plan/easing/tick events used by `app.js`.

- [ ] **Step 1: Write failing tests**

Verify `easeOutQuint(0) === 0`, `easeOutQuint(1) === 1`, monotonic easing, ordinary spin duration/turns, and reduced-motion plan shortening without changing final rotation.

- [ ] **Step 2: Run and verify failure**

Run: `node --test wheel/spin.test.mjs`

- [ ] **Step 3: Implement spin plan and animator helpers**

`createSpinPlan()` calculates start/end rotations and duration only. Browser `requestAnimationFrame` orchestration stays in `app.js`, which renders interpolation through `easeOutQuint`.

- [ ] **Step 4: Test winner/animation separation explicitly**

Create a fixed winner index, build a spin plan twice with different durations, and assert both end at a rotation that maps to the same winner.

- [ ] **Step 5: Run tests and commit**

```bash
node --test wheel/spin.test.mjs
git add wheel/spin.js wheel/spin.test.mjs
git commit -m "feat(wheel): add deterministic spin presentation"
```

---

### Task 7: Build the simple responsive application shell

**Files:**
- Create: `wheel/index.html`
- Create: `wheel/styles.css`

**Consumes:** module scripts from later `app.js` and existing Random Info Pages visual direction without copying the root page wholesale.

- [ ] **Step 1: Build semantic HTML shell**

Include:

- compact header with Wheel title, Save, Share, Settings, overflow
- canvas area and fixed visual pointer
- primary `Spin` button
- entries panel with multiline quick-entry textarea plus optional row/details editor
- Shuffle, Sort, Add controls
- wheel-tabs region hidden when only one wheel exists
- winner dialog with Spin again / Remove winner / Remove all matching / Keep
- settings dialog/sheet grouped into Appearance, Spin, Result, Advanced
- named saves dialog
- history drawer
- toast/status live region
- hidden file inputs for images and JSON import

- [ ] **Step 2: Implement desktop layout**

Use a two-column app shell with the wheel receiving the majority of width and the entry editor in a bounded side panel. Keep the spin control visually adjacent to the wheel.

- [ ] **Step 3: Implement mobile layout**

At narrow width, stack header, wheel, Spin, then entries. Avoid horizontal scrolling and keep tap targets at least roughly 44 CSS pixels.

- [ ] **Step 4: Implement light/dark/system tokens and presentation mode**

Presentation mode hides editing chrome without depending on Fullscreen API. Add `@media (prefers-reduced-motion: reduce)` CSS protections.

- [ ] **Step 5: Static checks**

Run:

```bash
grep -Fq '<canvas' wheel/index.html
grep -Fq 'id="spinButton"' wheel/index.html
grep -Fq 'aria-live="polite"' wheel/index.html
grep -Fq '@media' wheel/styles.css
```

- [ ] **Step 6: Commit**

```bash
git add wheel/index.html wheel/styles.css
git commit -m "feat(wheel): add simple responsive wheel interface"
```

---

### Task 8: Wire entries, spinning, results, settings, history, and accessibility

**Files:**
- Create: `wheel/app.js`
- Modify: `wheel/index.html` if wiring reveals missing semantic hooks.

**Consumes:** all stable interfaces from Tasks 1-7.

- [ ] **Step 1: Initialize safely**

Load a shared fragment first into an ephemeral state; otherwise load autosave; otherwise create defaults. Shared state must not immediately overwrite autosave.

- [ ] **Step 2: Wire entry editing**

Support newline paste, direct edits, add/remove, duplicates, sort, Fisher-Yates shuffle using secure random integers, optional weight/color/image details, and clear with confirmation where destructive.

- [ ] **Step 3: Wire the spin flow exactly in this order**

```js
const entries = eligibleEntries(activeWheel);
const winner = pickWeightedEntry(entries, secureUnitFloat());
const winnerIndex = entries.findIndex(e => e.id === winner.id);
const segments = buildSegments(entries);
const endRotation = landingRotationForIndex(segments, winnerIndex, rotation);
// Animate only after winner/endRotation are fixed.
```

Disable geometry-changing controls during the active spin. When animation ends, record history and open the result dialog.

- [ ] **Step 4: Wire winner actions**

`Remove winner` removes only the selected entry ID. `Remove all matching` removes entries whose current label exactly matches the winner label. `Keep` changes nothing. `Spin again` closes the result and starts a new independently selected spin.

- [ ] **Step 5: Wire settings and effects**

Support duration, palettes/custom colors, center/background images, sound toggles, confetti toggle, page appearance, reduced-motion preference, and winner behavior. Use a tiny Web Audio oscillator/click generator for ticks/winner sound rather than shipping copied sound assets.

- [ ] **Step 6: Wire keyboard/accessibility behavior**

Space/Enter spins only when focus is not in an input/textarea/select/button/contenteditable. Escape closes the topmost dialog/sheet. Update an accessible status string with the selected winner. Preserve visible focus styles.

- [ ] **Step 7: Add browser-resilience guards**

Catch localStorage quota/security exceptions, image decode failures, clipboard/share API failures, and fullscreen API failures; show concise toasts while preserving state.

- [ ] **Step 8: Syntax-check and commit**

```bash
node --check wheel/app.js
git add wheel/app.js wheel/index.html
git commit -m "feat(wheel): wire editing spinning results and settings"
```

---

### Task 9: Add multiple wheels, named saves, import/export, sharing, and presentation controls

**Files:**
- Modify: `wheel/app.js`
- Modify: `wheel/index.html`
- Modify: `wheel/styles.css`

- [ ] **Step 1: Implement multi-wheel controls**

Add, rename, duplicate, delete, switch, and sequential `Spin all`. Prevent deleting the final wheel by resetting it instead. Keep tabs hidden until there is more than one wheel.

- [ ] **Step 2: Implement named saves**

Create, rename, duplicate, load, delete. Loading a named save replaces working state only after validation succeeds.

- [ ] **Step 3: Implement JSON export/import**

Download `wheel-<safe-name>.json` using `Blob` + object URL. Import reads text, validates through `parseStateJSON`, then replaces state only on success.

- [ ] **Step 4: Implement Share**

Generate the current-page URL with `encodeShareState`. Prefer `navigator.share()` where suitable, otherwise copy to clipboard, otherwise expose a selectable URL. If too large, tell the user to export JSON instead.

- [ ] **Step 5: Implement fullscreen/presentation mode**

Presentation UI must work independently. Fullscreen button may call `document.documentElement.requestFullscreen()` when available, but failure must not disable presentation mode.

- [ ] **Step 6: Run full unit suite and syntax checks**

```bash
node --test wheel/model.test.mjs wheel/random.test.mjs wheel/geometry.test.mjs wheel/storage.test.mjs wheel/spin.test.mjs
node --check wheel/model.js
node --check wheel/random.js
node --check wheel/geometry.js
node --check wheel/storage.js
node --check wheel/render.js
node --check wheel/spin.js
node --check wheel/app.js
```

Expected: all PASS / exit code 0.

- [ ] **Step 7: Commit**

```bash
git add wheel/
git commit -m "feat(wheel): add saves sharing and multiple wheels"
```

---

### Task 10: Integrate the Wheel into Random Info Pages

**Files:**
- Modify: `index.html`
- Modify: `README.md`

- [ ] **Step 1: Add a root-page card**

Add a searchable card linking with a relative URL `./wheel/`, copy along the lines of: `Customizable random picker with weighted entries, saves, sharing, and multiple wheels.` Do not redesign the rest of the home page.

- [ ] **Step 2: Add Direct index entry**

Add `Wheel` / `/wheel` beside the other routes.

- [ ] **Step 3: Add README route**

Use the public URL `https://redslovesgames.github.io/random-info-pages/wheel/`.

- [ ] **Step 4: Static path checks**

```bash
grep -Fq 'href="./wheel/"' index.html
grep -Fq '/random-info-pages/wheel/' README.md
! grep -R 'src="/\|href="/' wheel/index.html wheel/*.js wheel/*.css
```

- [ ] **Step 5: Commit**

```bash
git add index.html README.md
git commit -m "feat: link wheel from random info pages"
```

---

### Task 11: Add CI and deployed smoke verification

**Files:**
- Modify: `.github/workflows/pages.yml`

- [ ] **Step 1: Add pre-deploy wheel verification**

Add a workflow step before staging:

```yaml
      - name: Verify wheel
        run: |
          node --test wheel/model.test.mjs wheel/random.test.mjs wheel/geometry.test.mjs wheel/storage.test.mjs wheel/spin.test.mjs
          node --check wheel/model.js
          node --check wheel/random.js
          node --check wheel/geometry.js
          node --check wheel/storage.js
          node --check wheel/render.js
          node --check wheel/spin.js
          node --check wheel/app.js
          grep -Fq '<canvas' wheel/index.html
          grep -Fq 'href="./wheel/"' index.html
```

- [ ] **Step 2: Add post-deploy route smoke check**

After deployment, fetch `$base/wheel/`, `$base/wheel/app.js`, and `$base/wheel/styles.css`; assert HTTP success and key identifiers such as `spinButton`, `pickWeightedEntry`, and the CSS app-shell selector.

- [ ] **Step 3: Run/sanity-check workflow syntax**

Inspect the resulting YAML carefully and preserve all existing VCT, school-schedule, branding, Tideborne, staging, and deployment steps.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/pages.yml
git commit -m "ci: verify wheel before and after pages deploy"
```

---

### Task 12: Manual acceptance pass and defect cleanup

**Files:**
- Modify only files implicated by observed defects.

- [ ] **Step 1: Fresh-load desktop acceptance**

Open `/wheel/` with no prior storage. Confirm default entries render, edit immediately, spin, winner dialog appears, and no console errors occur.

- [ ] **Step 2: Entry-behavior acceptance**

Paste at least 50 entries including duplicates and long labels. Add/remove/edit/sort/shuffle. Assign a clear 1:5 weight difference and verify the visual segment geometry changes correspondingly.

- [ ] **Step 3: Winner correctness acceptance**

Run repeated spins; every result must be eligible. For a known preselected test winner, verify final visual pointer position resolves to the same winner through `winnerIndexAtPointer`.

- [ ] **Step 4: Persistence acceptance**

Verify autosave reload, named save/load/delete, export/import round trip, share-link round trip, and malformed import/share rejection without current-state loss.

- [ ] **Step 5: Multiple-wheel acceptance**

Add, rename, duplicate, switch, delete, and `Spin all`; confirm history remains associated with its wheel.

- [ ] **Step 6: Mobile acceptance**

Check at approximately 390×844 CSS pixels: no horizontal page scroll, wheel fits, primary controls remain reachable, dialogs/sheets fit viewport, and touch does not accidentally trigger text selection during spin.

- [ ] **Step 7: Accessibility/reduced-motion acceptance**

Keyboard-only spin/dialog flow works; focus is visible; Escape closes overlays; winner text is announced; reduced-motion mode reaches the same preselected result with shortened presentation.

- [ ] **Step 8: Project-path acceptance**

Open the deployed GitHub Pages URL directly at `https://redslovesgames.github.io/random-info-pages/wheel/`; refresh it; confirm all local assets load. Open the root Random Info Pages page and follow the Wheel card.

- [ ] **Step 9: Final deterministic verification**

Run the complete Node test and syntax-check commands from Task 9 once more and inspect the deployed smoke-check workflow result. Fix discovered defects before claiming completion.

- [ ] **Step 10: Final commit if acceptance required fixes**

```bash
git add wheel index.html README.md .github/workflows/pages.yml
git commit -m "fix(wheel): resolve acceptance issues"
```

---

## Execution Order

1. State model
2. Secure selection
3. Weighted geometry
4. Persistence/share serialization
5. Canvas renderer
6. Spin presentation
7. Responsive UI shell
8. Main application behavior
9. Advanced parity features
10. Root-site integration
11. CI/deployed verification
12. Manual acceptance and fixes

## Completion Standard

The feature is complete only when:

- a new user can paste names and spin immediately;
- production winner selection uses Web Crypto and occurs before animation;
- weighted entries affect both selection and visual segment size consistently;
- duplicate labels remain independent and removal-by-ID vs removal-all-matches behaves correctly;
- the wheel visually stops on the preselected winner;
- local autosave, named saves, import/export, and share links round-trip safely;
- malformed data and storage failures do not destroy the current valid state;
- multiple wheels work without cluttering the single-wheel default UI;
- customization, sounds/confetti, history, presentation mode, and reduced-motion behavior function without a backend;
- desktop and mobile layouts are usable;
- the root page links to `/wheel/` using project-path-safe URLs;
- all Node tests, syntax checks, GitHub Actions pre-deploy checks, post-deploy smoke checks, and the manual acceptance pass are observed passing before completion is claimed.
