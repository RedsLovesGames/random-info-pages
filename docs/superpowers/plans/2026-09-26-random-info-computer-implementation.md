# Random Info Computer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vendor Henry Heffernan's pinned outer 3D portfolio into Random Info Pages, make it build and run at `/computer/`, and replace its remote monitor OS with a local minimal `/os/` placeholder without regressing the existing site.

**Architecture:** Preserve the upstream TypeScript/Three.js/Webpack project under `computer-src/` with minimal porting changes. The existing static Random Info Pages site remains the primary site; CI builds `computer-src/public/` and overlays that output into `_site/computer/`, while `/os/` remains an ordinary static sibling route loaded by the CRT iframe.

**Tech Stack:** TypeScript, Three.js 0.137.x, CSS3DRenderer, camera-controls, GSAP, Webpack 5, vanilla HTML/CSS/JS for `/os/`, Node test runner, Playwright Chromium, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-09-26-random-info-computer-design.md`

## Global Constraints

- Work only on branch `computer-experience` until the branch build and browser checks are green.
- Vendor upstream `henryjeff/portfolio-website` at exact commit `c53c5a50183655eb83d70048403a5084f5d1214c`.
- Preserve the upstream outer project architecture for V1; no dependency modernization or broad refactor.
- Keep `computer-src/LICENSE.md` and add `computer-src/README-RIP.md` with upstream provenance and pinned commit.
- Generate and commit `computer-src/package-lock.json`; all later CI installs use `npm ci`.
- Do not copy Henry's separate `portfolio-inner-site` into V1.
- Do not replace the existing root `index.html` or make the 3D bundle load from the normal homepage.
- Production deployment remains static GitHub Pages; the upstream Express server is not required at runtime.
- The CRT monitor must load a same-origin Random Info Pages `/os/` route, never `https://os.henryheffernan.com/`.
- V1 `/os/` is a minimal interactive placeholder only; full desktop/window-manager/ARG features are follow-up work.
- Generated `computer-src/public/` output is not committed.

## Review Focus

- **Project-subpath assets:** every model, texture, audio file, Draco decoder, CSS file, and hashed bundle must resolve from `/random-info-pages/computer/`, not domain root.
- **Slow or unavailable WebGL:** `/computer/` must show a usable fallback link to `/os/` and the normal archive instead of staying blank.
- **Iframe event bridge:** mouse and keyboard events from same-origin `/os/` must not recurse, duplicate uncontrollably, or throw when the iframe is not yet ready.
- **Narrow viewport:** 360–430px widths must render either the 3D scene or an intentional fallback without horizontal overflow or a dead interaction surface.
- **Existing Pages staging:** building/staging `/computer/` must not copy `computer-src/node_modules`, overwrite root static projects, or change existing Wheel/VCT/School checks.

---

## File Structure

### Vendored upstream source

- Create: `computer-src/.babelrc`
- Create: `computer-src/.prettierrc`
- Create: `computer-src/LICENSE.md`
- Create: `computer-src/package.json`
- Create: `computer-src/package-lock.json`
- Create: `computer-src/README-RIP.md`
- Create: `computer-src/bundler/**`
- Create: `computer-src/src/**`
- Create: `computer-src/static/audio/**`
- Create: `computer-src/static/draco/**`
- Create: `computer-src/static/images/**`
- Create: `computer-src/static/models/**`
- Create: `computer-src/static/textures/**`

### Random Info Pages integration

- Create: `os/index.html`
- Create: `os/styles.css`
- Create: `os/app.js`
- Create: `tests/computer-vendor.test.mjs`
- Create: `tests/computer-build.test.mjs`
- Create: `tests/computer-os.test.mjs`
- Create: `scripts/computer_browser_smoke.mjs`
- Create: `.github/workflows/computer-ci.yml`
- Modify: `.github/workflows/pages.yml`
- Modify: `index.html` only in the final integration task, adding an optional `/computer/` entry without changing archive structure.

### Upstream files expected to receive V1 changes

- Modify: `computer-src/bundler/webpack.common.js` — project-subpath-safe emitted asset URLs.
- Modify: `computer-src/src/Application/World/MonitorScreen.ts` — same-origin `/os/` iframe URL and robust event bridge target checks.
- Modify: `computer-src/src/index.html` — fallback surface hooks/metadata only as needed.
- Modify: `computer-src/src/style.css` — fallback/narrow/reduced-motion behavior only as needed.

---

### Task 1: Vendor the Pinned Upstream Baseline

**Files:**
- Create: `computer-src/**` from upstream commit `c53c5a50183655eb83d70048403a5084f5d1214c`
- Create: `computer-src/README-RIP.md`
- Create: `computer-src/package-lock.json`
- Create: `tests/computer-vendor.test.mjs`

**Interfaces:**
- Consumes: upstream Git tree at the pinned commit.
- Produces: a complete local `computer-src/` source tree that later tasks may build and edit; `package-lock.json` used by all CI jobs.

- [ ] **Step 1: Write the failing vendor-integrity test**

Create `tests/computer-vendor.test.mjs` with assertions that:
- `computer-src/LICENSE.md` exists and contains `Copyright 2024 Henry Heffernan`.
- `computer-src/package.json` exists and declares `three`, `webpack`, `camera-controls`, and `gsap`.
- `computer-src/src/Application/World/MonitorScreen.ts` exists.
- `computer-src/static/models`, `static/textures`, `static/audio`, and `static/draco` exist.
- `computer-src/README-RIP.md` contains the exact pinned SHA.
- `computer-src/package-lock.json` exists and its root package dependency keys include the upstream runtime/build dependencies.

- [ ] **Step 2: Run the vendor test and verify RED**

Run: `node --test tests/computer-vendor.test.mjs`
Expected: FAIL because `computer-src/` does not yet exist.

- [ ] **Step 3: Vendor the complete tracked upstream outer repository**

Copy every tracked file from the pinned upstream commit into `computer-src/`, excluding nested `.git` metadata and generated `public/` output. Preserve upstream relative paths unchanged.

- [ ] **Step 4: Add provenance documentation**

Create `computer-src/README-RIP.md` containing:
- upstream repository `henryjeff/portfolio-website`;
- pinned commit `c53c5a50183655eb83d70048403a5084f5d1214c`;
- statement that `computer-src/` is the outer 3D portfolio source adapted for Random Info Pages;
- note that generated `public/` is intentionally untracked.

- [ ] **Step 5: Generate the dependency lockfile without changing declared dependency versions**

Run from `computer-src/`: `npm install --package-lock-only --ignore-scripts`
Expected: `package-lock.json` created; `package.json` remains semantically unchanged except only if npm requires harmless metadata normalization.

- [ ] **Step 6: Run the vendor-integrity test**

Run: `node --test tests/computer-vendor.test.mjs`
Expected: PASS.

- [ ] **Step 7: Commit the vendored baseline**

Commit message: `feat: vendor 3d computer experience baseline`

---

### Task 2: Make the Upstream Build Work at `/computer/`

**Files:**
- Modify: `computer-src/bundler/webpack.common.js`
- Modify only if required by failing tests: `computer-src/src/Application/sources.ts`
- Create: `tests/computer-build.test.mjs`

**Interfaces:**
- Consumes: vendored upstream source and `computer-src/package-lock.json`.
- Produces: `npm run build` output in `computer-src/public/` whose HTML, bundle, and copied static assets work when served with `/computer/` as the document path.

- [ ] **Step 1: Write the failing build contract test**

Create `tests/computer-build.test.mjs` to assert after a build fixture/run that:
- `computer-src/public/index.html` exists;
- at least one `bundle.*.js` exists;
- copied `models/`, `textures/`, `audio/`, and `draco/` directories exist in `public/`;
- generated `index.html` does not contain root-only asset references such as `src="/bundle.` or `href="/main.`;
- `webpack.common.js` configures emitted assets to resolve relative to the current `/computer/` document path.

- [ ] **Step 2: Install with the committed lock and run the production build to establish baseline behavior**

Run: `cd computer-src && npm ci && npm run build`
Then: `node --test tests/computer-build.test.mjs`
Expected: build may succeed, but the new subpath contract test must fail until Webpack path behavior is explicitly pinned.

- [ ] **Step 3: Make Webpack output project-subpath safe**

In `computer-src/bundler/webpack.common.js`, set the output/public asset behavior so generated bundle/CSS URLs are relative to `computer-src/public/index.html`. Keep `CopyWebpackPlugin` copying `static/` to the output root because upstream resource paths such as `models/Computer/computer_setup.glb` are already document-relative.

- [ ] **Step 4: Rebuild and run the build contract test**

Run: `cd computer-src && npm run build && cd .. && node --test tests/computer-build.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `build: support computer experience subpath`

---

### Task 3: Add the Minimal Local Random Info OS and Switch the CRT Iframe

**Files:**
- Create: `os/index.html`
- Create: `os/styles.css`
- Create: `os/app.js`
- Modify: `computer-src/src/Application/World/MonitorScreen.ts`
- Create: `tests/computer-os.test.mjs`

**Interfaces:**
- Consumes: outer monitor iframe/event model from `MonitorScreen.ts`.
- Produces: static `/os/` surface; `os/app.js` function `forwardEvent(type, event)` posts normalized pointer/keyboard event data to `parent`; monitor iframe URL resolves as a sibling route via `new URL('../os/', window.location.href).href` or equivalent same-origin-safe construction.

- [ ] **Step 1: Write the failing OS integration tests**

Create `tests/computer-os.test.mjs` asserting:
- `os/index.html` includes visible `RANDOM INFO OS` text and references `./styles.css` and `./app.js`;
- it includes an archive link resolving to `../`;
- `os/app.js` listens for `mousemove`, `mousedown`, `mouseup`, `keydown`, and `keyup` and posts only normalized event data to `parent`;
- `MonitorScreen.ts` no longer contains `https://os.henryheffernan.com/`;
- `MonitorScreen.ts` constructs a same-origin sibling `/os/` URL;
- message handling rejects events whose `source` is not the monitor iframe window or whose origin is not the current origin.

- [ ] **Step 2: Run the OS test and verify RED**

Run: `node --test tests/computer-os.test.mjs`
Expected: FAIL because `/os/` is absent and the monitor still targets Henry's hosted OS.

- [ ] **Step 3: Implement the minimal `/os/` page**

Create a lightweight late-90s-style placeholder with:
- title/heading `RANDOM INFO OS`;
- ready/boot status;
- a small fixed set of non-functional placeholder app icons;
- a working `Back to archive` link to `../`;
- no window manager, terminal, or nested app iframe yet.

- [ ] **Step 4: Implement normalized event forwarding in `os/app.js`**

`forwardEvent(type, event)` sends `{ type, clientX, clientY }` for pointer events and `{ type, key }` for keyboard events. Do not serialize or post the full DOM event object.

- [ ] **Step 5: Switch and harden the monitor iframe bridge**

In `MonitorScreen.ts`:
- set iframe source to the same-origin sibling OS URL;
- retain upstream coordinate scaling;
- ignore `message` events not originating from that iframe window/current origin;
- retain the existing synthetic event bridge expected by camera/input logic.

- [ ] **Step 6: Run OS tests and rebuild**

Run: `node --test tests/computer-os.test.mjs && cd computer-src && npm run build`
Expected: PASS and successful build.

- [ ] **Step 7: Commit**

Commit message: `feat: connect computer monitor to Random Info OS`

---

### Task 4: Add WebGL Failure, Reduced-Motion, and Narrow-Screen Fallbacks

**Files:**
- Modify: `computer-src/src/index.html`
- Modify: `computer-src/src/style.css`
- Modify minimally as required: `computer-src/src/script.ts` or `computer-src/src/Application/Application.ts`
- Extend: `tests/computer-build.test.mjs`

**Interfaces:**
- Consumes: upstream application startup.
- Produces: a DOM fallback surface identified by `#computer-fallback` with links to `../os/` and `../`; startup code exposes/shows it when WebGL initialization fails rather than leaving a blank page.

- [ ] **Step 1: Extend build tests with fallback contracts**

Assert source contains:
- `id="computer-fallback"`;
- links to `../os/` and `../`;
- reduced-motion CSS disabling nonessential transition/animation duration;
- narrow-screen CSS that prevents fallback/overlay horizontal overflow;
- application startup catches initialization failure and activates the fallback.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/computer-build.test.mjs`
Expected: FAIL on missing fallback contracts.

- [ ] **Step 3: Add the fallback markup and styles**

Keep it visually consistent with the dark/retro experience but independent of WebGL so it remains usable if renderer setup fails.

- [ ] **Step 4: Guard application initialization**

Catch synchronous startup failure at the narrowest top-level entry point and show `#computer-fallback`. Do not wrap individual Three.js subsystems or suppress normal console errors during development.

- [ ] **Step 5: Add reduced-motion and 360–430px-safe CSS**

Reduced motion must preserve functionality. Narrow screens may show either the scene or fallback, but no dead offscreen-only controls.

- [ ] **Step 6: Rebuild and run focused tests**

Run: `cd computer-src && npm run build && cd .. && node --test tests/computer-build.test.mjs`
Expected: PASS.

- [ ] **Step 7: Commit**

Commit message: `fix: add computer experience fallbacks`

---

### Task 5: Add End-to-End Chromium Smoke Coverage

**Files:**
- Create: `scripts/computer_browser_smoke.mjs`

**Interfaces:**
- Consumes: staged/static routes `/computer/` and `/os/`.
- Produces: deterministic Playwright smoke command `node scripts/computer_browser_smoke.mjs` with nonzero exit on page errors, broken assets, iframe mismatch, or mobile overflow.

- [ ] **Step 1: Write the browser smoke script before CI wiring**

The smoke must assert:
- `/computer/` returns and renders a canvas/WebGL surface or intentional fallback;
- no uncaught `pageerror` occurs during load;
- critical model/texture/audio/Draco requests do not return 404;
- `#computer-screen` iframe appears when WebGL is available;
- iframe URL belongs to the same origin and ends in `/os/`;
- iframe body contains `RANDOM INFO OS`;
- dispatching keyboard input inside `/os/` results in a corresponding message/bridge activity without exceptions;
- desktop 1280×800 has no catastrophic blank screen;
- mobile 390×844 has no horizontal document overflow and retains a usable path to `/os/`/archive;
- emulated `prefers-reduced-motion: reduce` still reaches a usable state.

- [ ] **Step 2: Run smoke against a local staging layout and verify any failures are product failures, not test assumptions**

Serve a directory containing the built output at `/computer/` and the repository `os/` at `/os/`, then run `node scripts/computer_browser_smoke.mjs`.
Expected: RED until all path/fallback/event issues are correct.

- [ ] **Step 3: Fix only issues exposed by the smoke in their owning source files**

Do not weaken assertions to accommodate broken pathing or interaction.

- [ ] **Step 4: Re-run smoke to GREEN**

Run: `node scripts/computer_browser_smoke.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `test: add computer experience browser smoke`

---

### Task 6: Add Feature-Branch CI and Production Pages Build/Staging

**Files:**
- Create: `.github/workflows/computer-ci.yml`
- Modify: `.github/workflows/pages.yml`

**Interfaces:**
- Consumes: committed lockfile, build tests, browser smoke.
- Produces: feature-branch CI that does not deploy; production Pages workflow that builds `computer-src` and overlays `computer-src/public/` into `_site/computer/`.

- [ ] **Step 1: Add a failing static workflow contract to `tests/computer-build.test.mjs`**

Assert:
- `computer-ci.yml` triggers on `computer-experience` pushes affecting `computer-src/**`, `os/**`, computer tests/smoke, or the workflow itself;
- branch CI runs `npm ci`, `npm run build`, Node computer tests, and Chromium smoke;
- `pages.yml` sets up Node, runs `npm ci`/build in `computer-src`, and copies only `computer-src/public/` to `_site/computer/` after normal site staging;
- `pages.yml` excludes `computer-src/node_modules`, `computer-src/public`, and source-only `computer-src` from the ordinary rsync staging before overlaying the built output.

- [ ] **Step 2: Run the contract and verify RED**

Run: `node --test tests/computer-build.test.mjs`
Expected: FAIL because workflows are not wired yet.

- [ ] **Step 3: Create `.github/workflows/computer-ci.yml`**

Use Node 22 and Playwright Chromium. The workflow must:
- checkout the branch;
- run `npm ci` in `computer-src`;
- build;
- run `node --test tests/computer-*.test.mjs`;
- assemble a temporary static staging directory;
- serve it locally;
- run `node scripts/computer_browser_smoke.mjs`.

- [ ] **Step 4: Update `.github/workflows/pages.yml` without removing existing checks**

Insert computer dependency/build steps before `Stage static site`. Update staging exclusions and overlay `computer-src/public/` at `_site/computer/`. Add post-deploy HTTP checks for `/computer/` and `/os/` that verify the generated computer page and `RANDOM INFO OS` marker.

- [ ] **Step 5: Run static tests**

Run: `node --test tests/computer-*.test.mjs`
Expected: PASS.

- [ ] **Step 6: Commit**

Commit message: `ci: build and verify Random Info Computer`

---

### Task 7: Add the Optional Homepage Entry and Run Full Regression Verification

**Files:**
- Modify: `index.html`
- Modify: `tests/home-index.test.mjs`
- Extend if needed: `scripts/computer_browser_smoke.mjs`

**Interfaces:**
- Consumes: stable `/computer/` route.
- Produces: one optional homepage route to `/computer/` without changing the existing six-folder archive taxonomy or preloading 3D code.

- [ ] **Step 1: Add the failing homepage contract**

Extend `tests/home-index.test.mjs` to assert:
- root page contains a link to `./computer/`;
- the normal archive project list/folders remain present;
- root HTML does not directly reference Three.js, `computer-src`, or generated computer bundles.

- [ ] **Step 2: Run the homepage test and verify RED**

Run: `node --test tests/home-index.test.mjs`
Expected: FAIL only on missing computer entry.

- [ ] **Step 3: Add a small secondary `ENTER ARCHIVE COMPUTER →` link**

Place it in the existing homepage without changing the 12-file archive count unless the computer experience is intentionally promoted as a thirteenth archive file. For V1, treat it as an alternate entrance rather than another archive project card.

- [ ] **Step 4: Run all repository deterministic tests relevant to Pages plus computer tests**

Run at minimum:
- `node --test tests/home-index.test.mjs`
- `node --test tests/computer-*.test.mjs`
- `node --test wheel/*.test.mjs`
- the VCT test commands already required by `pages.yml`.
Expected: all PASS.

- [ ] **Step 5: Run final local production build + browser smoke**

Run: `cd computer-src && npm ci && npm run build`, assemble staging exactly as CI will, then run `node scripts/computer_browser_smoke.mjs`.
Expected: PASS on desktop, mobile, and reduced-motion cases with zero page errors.

- [ ] **Step 6: Push and require exact-head feature-branch CI GREEN**

Verify the latest `computer-experience` branch head SHA exactly matches the successful `computer-ci.yml` workflow head SHA before claiming V1 complete.

- [ ] **Step 7: Commit final integration if Step 3 was not already committed**

Commit message: `feat: add immersive archive computer entry`

---

## Final Completion Gate

V1 is complete only when:

- the branch contains the pinned vendored upstream source and committed lockfile;
- `computer-src/public/` is generated successfully but not tracked;
- `/computer/` runs from the GitHub Pages project subpath;
- the CRT iframe loads the local `/os/` and no source references Henry's hosted OS;
- desktop/mobile/reduced-motion browser smoke is green;
- existing root/Wheel/VCT/School deployment checks remain green;
- the current `computer-experience` head is exactly the SHA verified by the latest successful branch CI run;
- no merge to `main` occurs until that exact-head gate is satisfied.
