# Random Info OS Full Port — Design Spec

Date: 2026-09-26
Branch: `random-info-os-port`
Status: Design approved in chat; implementation not started

## Goal

Replace the current lightweight hand-built `/os/` desktop with a full Random Info OS based on the original `henryjeff/portfolio-inner-site` windowing/application framework, while keeping Random Info Pages as the actual content source.

The finished experience should behave like a real Windows-95-style desktop running inside the existing 3D CRT:

- Random Info Pages folders appear as desktop/Explorer objects.
- Existing Random Info Pages projects open **inside draggable/resizable desktop windows** instead of navigating away from the OS.
- The existing projects retain their own native UI and behavior inside those windows.
- The original desktop games are ported into this repository and run locally.
- User-facing Henry Heffernan portfolio/personal content is removed or replaced with Random Info Pages content.
- The outer `/computer/` Three.js CRT experience remains the entry shell and is not substantially redesigned in this phase.

The normal root Random Info Pages homepage remains available as the fast non-3D interface.

## Current Production Baseline

This phase starts from deployed `main` after the Random Info Computer customization merge:

- Production merge commit at design time: `4fbb839393a976417d4a58afa4073eefee21f432`
- `/computer/` contains the adapted outer 3D CRT experience.
- `/os/` currently contains a lightweight vanilla HTML/CSS/JS Windows-95-style desktop.
- The CRT monitor loads the same-origin `/os/` route.
- The current OS already exposes archive folders and legacy Doom/Oregon Trail shortcut artwork, but it does not contain the full original application/window framework or working original games.

This phase replaces the implementation behind `/os/`; it does not replace `/computer/`.

## Upstream Inner-OS Baseline

Port from:

- Repository: `henryjeff/portfolio-inner-site`
- Pinned commit: `23cf84acd5c76d2c719e1d04c3d976dc4b0b49f8`
- Framework: React 17 + TypeScript + Create React App 5
- Window/animation dependencies: Framer Motion and existing custom Win95 components
- DOS runtime: `js-dos` / DOSBox WebAssembly assets

Important upstream components already present at the pinned commit include:

- `src/components/os/Desktop.tsx`
- `src/components/os/Window.tsx`
- `src/components/os/Toolbar.tsx`
- `src/components/os/DesktopShortcut.tsx`
- drag/resize indicators
- Win95 icons and fonts
- `src/components/dos/DosPlayer.tsx`
- Doom application
- Oregon Trail application
- Scrabble application
- Henordle / Wordle engine
- Credits application

The upstream desktop registry exposes four playable applications that matter for this port:

1. Doom
2. The Oregon Trail
3. Scrabble
4. Henordle

`public/digger.jsdos` also exists upstream, but it is not registered as an application in the original desktop. It is therefore **not** part of the required acceptance criteria. It may be preserved as an optional diagnostic/bonus bundle if importing it costs essentially nothing.

## Core Design Decision

Do **not** keep extending the current vanilla `/os/` implementation.

Instead:

1. import the proven upstream inner-OS framework as editable source under `os-src/`;
2. remove or replace Henry-specific portfolio content;
3. preserve the upstream window manager/taskbar/desktop mechanics where they are useful;
4. add a Random Info Pages application registry and Explorer layer;
5. build the React OS in CI and deploy its compiled output to `/os/`.

This avoids reimplementing window focus, resize, minimize, taskbar, drag behavior, game integration, and js-dos runtime handling from scratch.

## Repository Layout

Target layout:

```text
random-info-pages/
├── computer-src/                  # existing outer Three.js CRT source
│
├── os-src/                        # imported/adapted inner OS source
│   ├── package.json
│   ├── package-lock.json
│   ├── tsconfig.json
│   ├── public/
│   │   ├── js-dos/
│   │   ├── doom.jsdos
│   │   ├── trail.jsdos
│   │   ├── scrabble.jsdos
│   │   └── ...required runtime files
│   └── src/
│       ├── assets/
│       ├── components/
│       │   ├── os/
│       │   ├── applications/
│       │   ├── dos/
│       │   └── wordle/
│       └── ...
│
├── os/                            # current legacy static OS during migration only
│
├── scripts/
│   ├── computer_browser_smoke.mjs
│   └── random_info_os_browser_smoke.mjs
│
├── tools/
├── friends/
├── school-schedule/
├── tideborne/
├── tide2/
├── vct-scout/
├── wheel/
├── whenwemeet/
├── oldasspolitic/
├── heatmap/
├── wanuiv2/
├── nerdcore-prompts/
└── ...
```

The final production `/os/` route is generated from `os-src/` during CI. Generated React build output is **not committed**.

The existing committed static `os/` implementation remains only until the React replacement is proven green. The implementation plan should remove or retire it only after the new OS passes browser smoke.

## Import Strategy

### Why use a local import script

The upstream inner repository contains several binary/runtime assets that are inefficient to recreate through individual GitHub API writes:

- `doom.jsdos` (~5.5 MB)
- `trail.jsdos` (~1.9 MB)
- `scrabble.jsdos` (~1.6 MB)
- js-dos JavaScript runtime
- DOSBox WASM binaries (~1.5 MB each)
- fonts/icons and other binary UI assets

Therefore the implementation plan should include a one-time Windows PowerShell import script for the user to run in a local workspace clone of `RedsLovesGames/random-info-pages`.

The script must:

1. verify the current repository/branch before writing;
2. require the implementation feature branch, never `main`;
3. clone `henryjeff/portfolio-inner-site` into a temporary directory;
4. checkout exactly `23cf84acd5c76d2c719e1d04c3d976dc4b0b49f8`;
5. create/populate `os-src/`;
6. copy only the required OS/game/runtime source and assets;
7. omit Henry-specific personal portfolio/resume/contact/media assets that are not needed;
8. avoid committing or pushing automatically;
9. print a manifest and `git status` summary at completion;
10. leave the temporary clone removable after verification.

The script is an import accelerator, not a source-of-truth generator. After its output is committed, `os-src/` becomes normal repository source.

### Import allowlist

The initial copy should preserve at minimum:

- root package/TypeScript/CRA configuration required to build;
- `src/components/os/` windowing/taskbar/desktop primitives;
- `src/components/dos/`;
- `src/components/wordle/`;
- application wrappers needed for Doom, Oregon Trail, Scrabble and Wordle;
- required shared general components;
- Win95 icons used by the retained applications/window controls;
- MSSansSerif and any other font actually referenced by retained UI;
- js-dos public runtime files;
- required `.jsdos` bundles.

Do not wholesale retain Henry's personal showcase pages, resume, contact pages, personal photographs, personal audio projects, or portfolio project media unless a retained OS component has a verified runtime dependency on them.

## Random Info Pages Application Model

### Application registry

Replace the Henry-oriented `APPLICATIONS` registry with a Random Info OS registry that can represent four application types:

```ts
type RipApplication =
  | { type: 'folder'; ... }
  | { type: 'web'; ... }
  | { type: 'dos-game'; ... }
  | { type: 'native'; ... };
```

Required top-level folders:

- Tools
- School
- Friends
- Games
- Data
- Experiments

Each folder contains the projects already represented by the root archive homepage.

The registry should be data-driven so adding a future RIP page normally requires adding metadata, not new window-management code.

### Web application windows

Existing Random Info Pages projects should keep their current page implementation and run inside a Win95 application/browser window using a same-origin iframe.

Examples:

- Toolbox → `../tools/`
- Wheel → `../wheel/`
- When We Meet → `../whenwemeet/`
- School Schedule → `../school-schedule/`
- Friend Group Hub → `../friends/`
- Tideborne → `../tideborne/`
- Fishing System 2.0 → `../tide2/`
- VCT Scout → `../vct-scout/`
- Old Ass Politic → `../oldasspolitic/`
- 10Groups Heatmap → `../heatmap/`
- Emperor Director → `../wanuiv2/`
- Nerdcore Prompts → `../nerdcore-prompts/`

The iframe URL must be calculated safely for GitHub Pages subpath hosting and must not assume domain root `/`.

A web-app window should include:

- Win95 title bar
- project name/icon
- minimize
- maximize/restore
- close
- drag
- resize
- taskbar entry
- focus/z-index behavior
- an address/status area or equivalent chrome
- an `Open externally` control for cases where iframe embedding is undesirable or unsupported

The iframe content itself is not restyled to Windows 95.

### Window identity and multiplicity

For V1 of this phase, each registered project may have at most one active window instance at a time. Reopening an already-open project should restore/focus it rather than create unlimited duplicates.

Different applications must be able to coexist simultaneously.

## Explorer/Folders

The current top-level RIP categories become real Explorer-style folder windows.

Opening a category should not navigate away from the desktop. It should open a Win95 Explorer window containing shortcut/file icons for that category's projects.

Required behaviors:

- folder window opens on double-click;
- folder window can be moved/resized/minimized/closed;
- project item double-click opens/focuses its application window;
- category contents match the production archive homepage taxonomy;
- folder/project labels do not expose Henry portfolio content.

The taskbar should represent both folder windows and app/game windows.

## Games

### Doom

Port the upstream Doom application and `doom.jsdos` bundle. It should run locally inside a resizable Win95 game window using the imported js-dos runtime.

### The Oregon Trail

Port the upstream Oregon Trail application and `trail.jsdos` bundle with the same local-window behavior.

### Scrabble

Port the upstream Scrabble application and `scrabble.jsdos` bundle with the same local-window behavior.

### RIP Wordle

Retain the upstream Henordle/Wordle engine but remove Henry-specific naming/content.

Rename the application to **RIP Wordle** (or `Wordle` in very constrained UI surfaces).

Requirements:

- no `Henordle` user-facing name;
- no Henry copyright/footer string;
- normal Wordle-style gameplay remains functional;
- initial word list may remain the upstream generic word list unless it is Henry-specific;
- friend-group/custom word modes are explicitly out of scope for this phase.

### Digger

The upstream `digger.jsdos` asset is optional because the original desktop does not expose it. If imported, do not add it to the production desktop unless separately requested.

## Credits and Henry-Facing Content Removal

The goal is to remove Henry Heffernan as a visible identity/personality from the desktop, not to erase technical provenance from source documentation.

Remove or rewrite user-facing references from:

- default desktop application list
- Credits window body/footer
- Showcase/My Showcase
- About/contact/resume pages
- shutdown/reboot dialogue
- Henordle naming/footer
- status-bar copyright text
- start menu labels or personal links
- any automatic window opened on startup

The old Showcase app is removed rather than repurposed wholesale.

A new lightweight **About Random Info OS** / Credits application may include unobtrusive technical provenance such as:

> Random Info OS — Random Info Pages, 2026
>
> Original OS foundation adapted from Henry Heffernan's portfolio project.

The large Henry-branded Credits experience shown in the original site is not retained.

## Startup Experience

The OS should boot to a clean desktop by default.

Do not automatically open Henry's `My Showcase` replacement.

A future first-run welcome dialog may be added separately, but it is not required here.

The existing outer 3D CRT remains responsible for the immersive entry sequence. Once the monitor reaches the OS, the desktop should already be usable.

## Outer CRT Integration

The current outer `/computer/` implementation remains the source of truth for:

- 3D room
- monitor geometry
- CSS3D iframe surface
- camera movement
- screen focus/entry interaction
- CRT overlays
- mouse/keyboard forwarding
- WebGL fallback
- reduced-motion behavior

The new React OS must continue to support the existing same-origin message bridge from `/computer/`.

Do not create a second nested desktop iframe around the OS itself. The CRT iframe directly loads `/os/`; individual RIP web apps then use their own child iframes inside Win95 windows.

## Input and Focus Model

There will be two iframe layers for embedded RIP pages:

```text
/computer/ 3D shell
  └── iframe → /os/
        └── app-window iframe → /tools/, /vct-scout/, etc.
```

This requires explicit focus handling.

Required behavior:

- pointer interaction on an app iframe should focus/raise its desktop window;
- keyboard events intended for the app should not be swallowed by desktop shortcut handlers;
- desktop/taskbar shortcuts continue to work when no child app owns focus;
- close/minimize/maximize controls remain reachable around the iframe;
- the existing outer CRT bridge must not recurse or duplicate events into child app iframes.

The implementation plan must include browser tests for this nested focus model.

## Same-Origin and Security Rules

All RIP project windows use same-origin repository routes.

Do not accept arbitrary external URL input into the application iframe registry.

Use explicit known routes from the registry.

For any future external URL application, use `Open externally` instead of embedding it by default.

The outer monitor `postMessage` validation already expects same-origin/source constraints; those protections should remain.

## Build System

### `os-src/`

Start with the pinned upstream React 17 / CRA 5 stack rather than simultaneously modernizing it.

The first goal is a deterministic successful build, not dependency modernization.

Use the imported upstream lockfile as the initial dependency baseline. If Node/npm compatibility requires a narrow transitive compatibility adjustment, document and pin it rather than performing a framework rewrite.

The OS build must support deployment under:

```text
/random-info-pages/os/
```

Asset and router configuration must not assume domain root.

### GitHub Pages workflow

Update `.github/workflows/pages.yml` to build both applications before staging:

1. install/build `computer-src/` as today;
2. install/build `os-src/`;
3. stage the ordinary static RIP site;
4. exclude source/build-only directories from `_site`;
5. overlay `computer-src/public/` into `_site/computer/`;
6. overlay `os-src/build/` into `_site/os/`;
7. verify both staged applications before upload;
8. deploy as one Pages artifact.

Failure of either application build must fail deployment.

Do not commit `os-src/node_modules/` or generated `os-src/build/`.

## CI and Testing

Extend the existing Random Info Computer CI rather than creating disconnected verification.

### Static/source contracts

At minimum verify:

- `os-src/` exists and records the pinned upstream source commit;
- required Win95 window components are present;
- required js-dos runtime assets exist;
- `doom.jsdos`, `trail.jsdos`, and `scrabble.jsdos` exist;
- no production app registry entry references `My Showcase`;
- no production UI source contains `Henordle`;
- no production UI source contains Henry personal contact/resume content;
- all expected RIP categories/projects appear in the registry;
- web app routes are GitHub-Pages-safe and same-origin.

### React build/tests

Run:

- locked dependency installation;
- TypeScript/CRA production build;
- targeted component/unit tests for registry/window lifecycle where practical.

### Browser smoke

The primary Chromium smoke should stage both `/computer/` and `/os/` and verify:

1. `/computer/` loads the real 3D scene;
2. the monitor iframe resolves to the built React `/os/`;
3. the desktop renders without Henry-facing portfolio UI;
4. Tools can be opened as an Explorer window;
5. Toolbox can be opened from Tools;
6. Toolbox appears **inside a Win95 application window** rather than replacing the OS;
7. another app can be opened concurrently;
8. taskbar focus/minimize/restore works;
9. maximize/restore works for a web application window;
10. close works;
11. keyboard/pointer input reaches an embedded RIP app without breaking outer CRT interaction;
12. Doom initializes the js-dos player without a critical asset 404;
13. Oregon Trail initializes;
14. Scrabble initializes;
15. RIP Wordle renders and accepts input;
16. direct `/os/` access works outside the CRT;
17. 390px/narrow behavior remains intentional rather than catastrophically overflowing;
18. reduced-motion outer experience remains functional.

The DOS smoke does not need to play through each game. It must prove the runtime and bundle initialize successfully.

## Performance

The outer 3D experience is already heavy, so this phase should avoid loading DOS runtimes/games until requested.

Requirements:

- js-dos runtime may load when the first DOS game opens, not at OS boot if practical;
- `.jsdos` bundles should not all preload on desktop startup;
- embedded RIP pages load only when their application window opens;
- closing a heavy app/game should release or suspend resources where the upstream runtime supports it;
- the normal root homepage still does not preload the 3D or OS applications.

No aggressive bundle splitting/framework migration is required if the upstream architecture already provides acceptable lazy behavior.

## Responsive Behavior

The CRT is primarily a desktop-oriented experience, but direct `/os/` access and small monitors must remain usable.

For narrow widths:

- windows must remain recoverable/reachable;
- titlebar controls cannot disappear permanently off-screen;
- newly opened windows should clamp initial position/size to available viewport;
- a maximized window should fit the OS viewport above the taskbar;
- game windows may use an intentional scaled/letterboxed presentation rather than forcing full native desktop sizes.

## Accessibility

Preserve/introduce basic keyboard and reduced-motion support without attempting to make a 1990s desktop metaphor perfectly modern-accessible in this phase.

Minimum:

- visible focus state for desktop/taskbar/window controls;
- buttons use actual interactive semantics where practical;
- titlebar close/minimize/maximize controls have accessible names;
- iframe windows have descriptive titles;
- reduced-motion setting from the outer experience remains respected;
- no essential operation depends exclusively on pixel-perfect drag input.

## Documentation and Attribution

Add `os-src/README-RIP.md` documenting:

- upstream repository;
- pinned commit;
- imported subsystems;
- removed Henry-specific portfolio subsystems;
- Random Info Pages adaptations;
- game/runtime notes;
- build instructions.

Technical attribution remains in source/docs and the small About/Credits surface. It should not dominate the desktop UI.

## Explicit Non-Goals

Do not include the following in this phase:

- rewriting every RIP project to visually match Windows 95 internally;
- merging all RIP project source into the React OS bundle;
- changing the root homepage into the OS;
- major redesign of the outer 3D room/CRT;
- React 18/19 migration;
- replacing Create React App solely for modernization;
- replacing js-dos/DOSBox with a new emulator stack;
- multiplayer DOS features;
- friend-group custom Wordle modes;
- arbitrary external URL browser functionality;
- persistent full desktop session restore across visits;
- multiple simultaneous instances of the same project;
- mobile-first redesign of the desktop metaphor;
- exposing upstream `digger.jsdos` as a required app.

## Acceptance Criteria

This phase is complete when all of the following are true on the feature branch:

1. The required subset of `henryjeff/portfolio-inner-site` at pinned commit `23cf84acd5c76d2c719e1d04c3d976dc4b0b49f8` is imported under `os-src/`.
2. The React OS builds deterministically in CI.
3. GitHub Pages staging serves the compiled React OS at `/os/` and the existing outer scene at `/computer/`.
4. The CRT loads the new React desktop with the existing same-origin interaction bridge intact.
5. Henry's personal portfolio/showcase/resume/contact identity is removed from normal user-facing OS flow.
6. The desktop/Explorer taxonomy represents Tools, School, Friends, Games, Data, and Experiments.
7. Every current homepage project represented in those categories can be opened from the desktop hierarchy.
8. Existing RIP project pages open inside draggable/resizable/minimizable/maximizable Win95 windows and retain their native internal UI.
9. At least two different RIP app windows can coexist and be focused through the taskbar.
10. Doom initializes locally from the repository bundle.
11. The Oregon Trail initializes locally.
12. Scrabble initializes locally.
13. Henordle is replaced by a Henry-neutral RIP Wordle surface using the retained Wordle engine.
14. Credits/About is Random Info OS branded and only contains unobtrusive upstream provenance.
15. No original `My Showcase` window auto-opens on boot.
16. Heavy game bundles are not eagerly loaded at initial desktop boot where avoidable.
17. Existing root homepage and non-OS project routes continue to pass their regression checks.
18. The full Chromium smoke passes on the exact feature-branch head before merge.
19. Production deployment remains blocked on build/staging failure of either the outer computer or inner OS.
20. Nothing is merged to `main` until the merged candidate is fully verified.

## Implementation Sequencing

The later implementation plan should execute this in stages rather than one giant replacement:

1. create/import `os-src/` from the pinned upstream subset;
2. prove the imported OS builds unchanged enough to run;
3. remove Henry-specific showcase/personal surfaces;
4. introduce the RIP application/folder registry;
5. implement embedded web application windows;
6. port/verify Doom, Oregon Trail, Scrabble and RIP Wordle;
7. connect taskbar/focus/maximize/minimize lifecycle;
8. integrate Pages build/staging;
9. strengthen browser smoke for nested iframe focus and games;
10. remove/retire the old static `/os/` source only after the replacement is green;
11. exact-head verification, then merge/deploy only on explicit approval.

This sequencing preserves a recoverable working desktop throughout the migration instead of replacing `/os/` with an unverified large port in one step.