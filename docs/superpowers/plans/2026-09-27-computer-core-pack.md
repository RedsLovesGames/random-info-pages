# Random Info OS Core Pack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Calculator, Notepad, Minesweeper, Snake, 2048, and Reaction Test as functional native applications inside Random Info OS.

**Architecture:** The shipping OS is the pinned Henry Heffernan Win95 React shell rebuilt by `scripts/import-henry-win95.ps1`, with repo-owned source changes applied from `scripts/win95-overrides/`. Therefore the implementation will extend that existing native React window system rather than the generated `/os/` snapshot. A single `Core Apps` desktop shortcut opens a launcher window, and each core app runs as its own existing Win95 `Window` instance managed by `Desktop.tsx`.

**Tech Stack:** React 17, TypeScript, existing Win95 shell/components, browser `localStorage`, Node 18 test runner, Playwright Chromium smoke tests.

**Spec:** `docs/superpowers/specs/2026-09-27-computer-core-pack-design.md`

## Global Constraints

- Keep `/computer/` and monitor input forwarding intact.
- Keep existing Random Info Explorer folders/routes and current static games working.
- Source changes belong under `scripts/win95-overrides/`; generated `/os/` is not the source of truth.
- Keep GitHub Pages compatibility and the importer/build workflow.
- No backend, accounts, database, or new build system.
- Persist only user-local state through guarded `localStorage` access.
- `main` remains untouched; all work stays on `computer-core-pack` until explicitly merged.

## Ruling from repository inspection

The approved design assumed `/os/` was the editable shell. CI proves `/os/` is regenerated from the pinned upstream React shell and `scripts/win95-overrides/`. Implementing iframe apps in generated `/os/` would be overwritten during CI/deployment. The plan therefore preserves the approved user-facing behavior but implements the apps as native React applications inside the existing resizable Win95 window manager. This removes redundant window-manager work and is the fastest safe path.

## Review Focus

- Core Apps must remain reachable at narrow viewport sizes without forcing horizontal page overflow.
- Keyboard games must own only their control keys and must not break the outer CRT key bridge.
- Malformed or unavailable localStorage must not crash any app.
- Opening a second app must not close or replace another open app; taskbar focus/minimize behavior must remain correct.
- Existing Random Info Explorer, Doom, Oregon Trail, Scrabble, RIP Wordle, and embedded Toolbox must continue to launch after the core pack is added.

---

### Task 1: Core Apps launcher and application registry

**Files:**
- Create: `scripts/win95-overrides/src/components/applications/CoreAppCatalog.ts`
- Create: `scripts/win95-overrides/src/components/applications/CoreAppsExplorer.tsx`
- Modify: `scripts/win95-overrides/src/components/os/Desktop.tsx`
- Modify: `scripts/computer_browser_smoke.mjs`

**Interfaces:**
- Produces: `CoreAppKey`, `CoreAppDefinition`, `CORE_APPS`, and `CoreAppsExplorerProps.onLaunchApp(app)`.
- `Desktop.tsx` owns lifecycle state and maps each `CoreAppKey` to the corresponding application component in later tasks.

- [ ] **Step 1: Write the failing browser-smoke assertions**
  - Assert a `Core Apps` desktop shortcut exists.
  - Click it and assert a `Core Apps` Win95 window appears.
  - Assert launcher buttons for Calculator, Notepad, Minesweeper, Snake, 2048, and Reaction Test exist.
  - Assert existing Random Info Explorer and Toolbox flows still work.

- [ ] **Step 2: Run CI on the test-only commit and verify RED**
  - Expected: browser smoke fails because `Core Apps` does not exist yet.

- [ ] **Step 3: Implement the catalog and launcher**
  - `CORE_APPS` contains exactly the six approved applications.
  - `CoreAppsExplorer` uses the existing `Window` component and launches apps through `onLaunchApp`.
  - `Desktop.tsx` adds one `Core Apps` static shortcut and supports independent windows keyed as `core:<key>`.

- [ ] **Step 4: Run importer/build + computer browser smoke through CI**
  - Expected: launcher assertions pass and existing explorer/toolbox checks remain green.

- [ ] **Step 5: Commit**
  - Commit message: `feat: add Random Info OS core app launcher`.

---

### Task 2: Shared persistence and utility apps

**Files:**
- Create: `scripts/win95-overrides/src/components/applications/core/CoreAppFrame.tsx`
- Create: `scripts/win95-overrides/src/components/applications/core/storage.ts`
- Create: `scripts/win95-overrides/src/components/applications/core/Calculator.tsx`
- Create: `scripts/win95-overrides/src/components/applications/core/Notepad.tsx`
- Create: `scripts/win95-overrides/src/components/applications/core/ReactionTest.tsx`
- Modify: `scripts/win95-overrides/src/components/os/Desktop.tsx`
- Modify: `scripts/computer_browser_smoke.mjs`

**Interfaces:**
- Produces: guarded `loadLocal<T>(key, fallback)` and `saveLocal<T>(key, value)` helpers.
- Produces three `React.FC<WindowAppProps>` app components.
- Consumes the Task 1 registry and Desktop lifecycle callbacks.

- [ ] **Step 1: Add failing smoke coverage**
  - Calculator: launch, enter `7 × 8 =`, assert `56`; clear and divide by zero without page error.
  - Notepad: launch, type text, assert character/word count changes; reload OS and verify autosaved text returns.
  - Reaction Test: launch and verify idle/start UI, then expose a deterministic test hook/query-mode delay so the smoke can reach READY without random waits; false-start state must also render correctly.
  - Storage failure: override `localStorage.setItem` in a direct OS page and verify utility apps still open without a page error.

- [ ] **Step 2: Run CI and verify RED**
  - Expected: smoke fails on missing app windows or controls.

- [ ] **Step 3: Implement shared frame/storage and the three utility apps**
  - Calculator supports four arithmetic operations, decimal input, clear, backspace, keyboard digits/operators, and a non-crashing divide-by-zero display.
  - Notepad is plain text with guarded autosave, New/Clear, and live word/character counts.
  - Reaction Test implements idle → waiting → ready → result plus false-start handling; best and recent attempts persist locally.

- [ ] **Step 4: Run CI and verify GREEN**
  - Expected: all new utility smoke assertions and pre-existing computer tests pass.

- [ ] **Step 5: Commit**
  - Commit message: `feat: add calculator notepad and reaction test`.

---

### Task 3: Minesweeper, Snake, and 2048

**Files:**
- Create: `scripts/win95-overrides/src/components/applications/core/Minesweeper.tsx`
- Create: `scripts/win95-overrides/src/components/applications/core/Snake.tsx`
- Create: `scripts/win95-overrides/src/components/applications/core/Game2048.tsx`
- Modify: `scripts/win95-overrides/src/components/os/Desktop.tsx`
- Modify: `scripts/computer_browser_smoke.mjs`

**Interfaces:**
- Produces three `React.FC<WindowAppProps>` game components.
- Consumes Task 2 persistence helper and the Task 1 registry.

- [ ] **Step 1: Add failing browser-smoke coverage**
  - Minesweeper: launch, reset, first-click a cell, assert it cannot immediately be a mine; flag/unflag changes mine counter; verify reset works.
  - Snake: launch, verify score `0`, start/pause/restart controls, deterministic food placement under smoke-test mode, and persisted high-score label.
  - 2048: launch, verify initial tile count, send a deterministic test-mode board through an explicit app test hook and assert a left move merges `[2,2,2,2]` into `[4,4,0,0]` with the expected score increment; restart works.
  - Keyboard controls are exercised inside each app without adding unexpected outer-page errors.

- [ ] **Step 2: Run CI and verify RED**
  - Expected: smoke fails because the game components are not registered yet.

- [ ] **Step 3: Implement the three games**
  - Minesweeper: beginner 9×9 board with 10 mines, first-click safety, reveal flood-fill, right-click flags, win/loss, timer, persisted best time.
  - Snake: fixed-grid game, arrow/WASD controls, pause on blur, restart, score, persisted high score, deterministic collision behavior.
  - 2048: 4×4 board, arrow controls, merge-once-per-move semantics, score, persisted best score, restart, win/game-over state.

- [ ] **Step 4: Run CI and verify GREEN**
  - Expected: game smoke assertions and the full existing computer regression suite pass.

- [ ] **Step 5: Commit**
  - Commit message: `feat: add minesweeper snake and 2048`.

---

### Task 4: Final branch verification and cleanup

**Files:**
- Modify only if verification finds a defect.

**Interfaces:**
- Consumes all prior tasks.

- [ ] **Step 1: Run/inspect full Random Info Computer CI at branch HEAD**
  - Expected: importer succeeds, React OS builds, Node contracts pass, existing Pages regressions pass, Chromium computer smoke passes.

- [ ] **Step 2: Inspect the `main...computer-core-pack` diff**
  - Confirm changes are limited to the core-pack spec/plan, override source, tests/smoke code, and any directly required importer contract adjustments.

- [ ] **Step 3: Review for regressions**
  - Existing desktop shortcuts remain.
  - Existing Random Info Explorer still auto-opens.
  - Existing embedded Toolbox path retains Pages prefix handling.
  - Direct narrow OS remains horizontally contained.
  - No generated `/os/` build artifacts are committed as source changes.

- [ ] **Step 4: Fix any Critical/Important findings with RED→GREEN evidence**

- [ ] **Step 5: Leave branch unmerged for user review**
