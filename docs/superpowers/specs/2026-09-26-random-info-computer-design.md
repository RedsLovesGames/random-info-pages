# Random Info Computer — Design Spec

Date: 2026-09-26
Branch: `computer-experience`
Status: Design approved in chat; implementation not started

## Goal

Add an optional immersive `/computer/` entrance to Random Info Pages by vendoring Henry Heffernan's open-source outer 3D portfolio project essentially wholesale, making only the changes required to build and host it under this repository, and replacing its remote monitor iframe with a local `/os/` placeholder.

The first implementation milestone is deliberately **not** a full Random Info OS redesign. V1 proves that the original 3D room/CRT/camera experience works reliably inside Random Info Pages on GitHub Pages. Custom RIP content comes after that baseline is stable.

The existing Random Info Pages homepage remains the primary fast navigation surface and is not replaced.

## Upstream Baseline

Vendor from:

- Repository: `henryjeff/portfolio-website`
- Upstream ref: `master`
- Pinned commit: `c53c5a50183655eb83d70048403a5084f5d1214c`
- Upstream architecture: TypeScript + Three.js + CSS3DRenderer + camera-controls + GSAP + Webpack
- Upstream production build: Webpack emits static files to `public/`

The upstream project's monitor is already implemented as a Three.js/CSS3D plane containing an iframe. The current upstream iframe points at `https://os.henryheffernan.com/`; V1 changes that target to the local Random Info Pages OS route.

The upstream MIT `LICENSE.md` remains with the vendored source. No separate licensing audit is a V1 blocker.

## Repository Layout

Use this layout:

```text
random-info-pages/
├── computer-src/
│   ├── .babelrc
│   ├── LICENSE.md
│   ├── package.json
│   ├── bundler/
│   ├── src/
│   ├── static/
│   └── ...remaining upstream outer-repo files
│
├── os/
│   ├── index.html
│   ├── styles.css
│   └── app.js
│
├── scripts/
│   └── computer_browser_smoke.mjs
│
└── .github/workflows/pages.yml
```

`computer-src/` is the editable vendored source tree. Generated Webpack output is **not committed**.

During GitHub Pages deployment, CI builds `computer-src/` and stages its `public/` output at:

```text
_site/computer/
```

Therefore the live route is:

```text
/random-info-pages/computer/
```

The ordinary static `/os/` directory is copied by the existing site staging process and remains available at:

```text
/random-info-pages/os/
```

## V1 Scope

### 1. Vendor the upstream outer project

Copy the complete tracked outer-project source at the pinned upstream commit into `computer-src/`, excluding only Git repository metadata that cannot exist as a nested repository.

Do not initially rewrite the architecture, convert build tools, replace Three.js, remove effects, or refactor upstream classes simply for cleanliness.

The guiding rule is:

> Preserve the original experience first; customize second.

### 2. GitHub Pages compatibility

Adapt the copied build so it works when served below `/random-info-pages/computer/` instead of at a domain root.

Required work may include:

- Webpack `publicPath` / generated asset path handling
- relative image/font/audio/model URLs
- removal or bypass of production Express assumptions
- ensuring generated HTML references hashed bundles correctly
- iframe routing to the sibling `/os/` path

The upstream Express server is not part of production deployment.

### 3. Local monitor target

Change the monitor iframe from Henry's hosted OS to Random Info Pages' own OS:

```text
../os/
```

or an equivalent GitHub-Pages-safe computed sibling URL.

Because `/computer/` and `/os/` are same-origin, the existing iframe event bridge can be retained and may be simplified later, but V1 should preserve the upstream interaction model unless necessary for correctness.

### 4. Minimal `/os/` placeholder

V1 `/os/` is intentionally small. Its purpose is to prove that a local interactive page can run inside the CRT.

It should contain:

- `RANDOM INFO OS` branding
- a visible boot/ready state
- a simple desktop-like surface
- a clear link/button back to the normal archive homepage
- a small set of placeholder app icons for future RIP projects
- mouse and keyboard event forwarding compatible with the outer shell

The first placeholder OS does **not** need draggable windows, terminal commands, nested project iframes, ARG content, or full retro desktop behavior.

### 5. Preserve the current homepage

Do not replace `index.html` with the 3D experience.

V1 may add a small optional link such as:

```text
ENTER ARCHIVE COMPUTER →
```

but this homepage integration is secondary to making `/computer/` stable and can be omitted until the final V1 integration commit if necessary.

## Experience Requirements

The copied experience should preserve, as far as practical:

- original room/environment composition
- original monitor model and placement
- camera movement/orbit behavior
- entering/focusing the CRT screen
- leaving the CRT interaction
- CSS3D monitor surface
- WebGL occlusion around the CSS screen
- CRT smudge/shadow/static/video overlays
- perspective dimming
- original transitions/animation timing
- mouse forwarding into the monitor iframe
- keyboard forwarding into the monitor iframe

No redesign of these behaviors is required for V1 unless a behavior is broken under the new hosting path.

## Build and Deployment

### Local build

`computer-src/package.json` remains the source of truth for the copied project dependencies and production build.

A production build must produce static output without requiring the upstream Express server afterward.

### GitHub Pages

Update `.github/workflows/pages.yml` so that before `Stage static site` it:

1. sets up an appropriate Node version;
2. installs `computer-src` dependencies deterministically;
3. runs the production build;
4. stages the rest of Random Info Pages as it already does;
5. overlays `computer-src/public/` into `_site/computer/`.

The workflow must fail if the computer build fails.

Do not copy `computer-src/node_modules/` or source-only build artifacts into the deployed `_site`.

### Branch CI

Because Pages deploys only from `main`, add a branch-safe verification path for `computer-experience` that at minimum runs:

- dependency install
- production Webpack build
- static existence checks for generated `public/index.html` and bundle assets
- browser smoke against a local static server

This may be a dedicated workflow or an extension of an existing test workflow, but it must not deploy the feature branch to production.

## Testing Strategy

### Static/build checks

Verify:

- upstream source is pinned/documented;
- `computer-src/LICENSE.md` exists;
- `npm install`/`npm ci` equivalent succeeds with the copied dependency graph;
- production Webpack build succeeds;
- generated computer HTML exists;
- generated asset references are valid under the `/computer/` base path;
- local `/os/` route exists;
- generated monitor code targets local `/os/`, not `os.henryheffernan.com`.

### Chromium smoke

`computer_browser_smoke.mjs` should verify at least:

1. `/computer/` loads without page errors;
2. a WebGL canvas is present;
3. the monitor iframe is created;
4. the iframe resolves to the local `/os/` route;
5. `/os/` renders `RANDOM INFO OS` inside the monitor;
6. pointer interaction with the screen does not throw;
7. keyboard input forwarded to the OS can be observed;
8. desktop viewport has no catastrophic overflow/blank-screen failure;
9. a narrow/mobile viewport gets either the 3D experience or an intentional fallback rather than a broken page.

The smoke does not need pixel-perfect comparison against Henry's live site.

## Performance and Fallbacks

V1 prioritizes fidelity over aggressive optimization, but it must avoid making the normal Random Info Pages homepage heavy.

Therefore:

- Three.js and the copied 3D assets load only when `/computer/` is opened.
- The root archive does not preload the computer bundle.
- Failure of WebGL must produce a usable fallback link to `/os/` and the ordinary archive.
- Reduced-motion users should receive a functional experience; exact animation reduction can be refined after baseline fidelity is proven.

## Attribution

Keep the upstream MIT license in `computer-src/LICENSE.md` and add a short source note in `computer-src/README-RIP.md` stating:

- original outer 3D portfolio by Henry Heffernan;
- upstream repository URL/name;
- pinned upstream commit;
- Random Info Pages adaptation notes.

This is documentation, not a user-facing branding requirement inside the experience.

## Explicit Non-Goals for V1

Do **not** include these in the baseline port:

- copying Henry's separate `portfolio-inner-site` as the RIP OS;
- full Random Info OS window manager;
- draggable application windows;
- ARG terminal or hidden lore;
- Friend Group integration;
- embedded Toolbox/VCT/Tideborne application windows;
- custom 3D room remodeling;
- new models or props;
- procedural wallpapers;
- custom games;
- replacing the main Random Info Pages homepage;
- major dependency modernization/refactoring.

Those are follow-up phases after the copied outer experience is stable.

## Acceptance Criteria

V1 is complete when all of the following are true on the feature branch:

1. The pinned Henry outer repository has been vendored under `computer-src/`.
2. Its production build succeeds in repository CI.
3. The generated experience works from a `/computer/` subpath rather than domain root.
4. The original major 3D/CRT interactions remain functional.
5. The monitor loads a same-origin `/os/` page rather than Henry's hosted OS.
6. `/os/` visibly identifies itself as `RANDOM INFO OS` and accepts interaction.
7. Existing Random Info Pages projects and homepage behavior are not regressed.
8. GitHub Pages deployment knows how to build and stage `/computer/` without committing generated bundles.
9. Chromium smoke passes on desktop and a narrow viewport.
10. No product change is merged to `main` until the feature branch build and browser checks are green.

## Follow-Up Phase After V1

Once this baseline is green, the next design can turn `/os/` into the actual Random Info OS:

- desktop icons mapped to current RIP projects;
- draggable/resizable windows;
- terminal commands and easter eggs;
- Recycle Bin for retired projects;
- system information/archive statistics;
- embedded existing pages where appropriate;
- optional homepage easter-egg entry;
- deeper visual rebranding of the room and CRT.

That customization phase should build on the proven port rather than be mixed into the initial copy.