# Random Info OS Core Pack Design

## Goal

Turn the existing Random Info OS into a more functional little computer by adding six native applications: Calculator, Notepad, Minesweeper, Snake, 2048, and Reaction Test.

The applications must run inside the existing authentic Win95 React shell used by the 3D computer, preserve every current project/game shortcut, and remain fully static for GitHub Pages.

## Canonical Source and Build Contract

Random Info OS is not authored directly in the committed `/os/` bundle. `scripts/import-henry-win95.ps1` pins `henryjeff/portfolio-inner-site` at commit `23cf84acd5c76d2c719e1d04c3d976dc4b0b49f8`, selectively imports its React Win95 shell into generated `os-src/`, then overlays repo-owned files from `scripts/win95-overrides/` before building `/os/`.

Therefore all durable core-pack source changes belong in `scripts/win95-overrides/` and tests/workflows, not in generated `os-src/` or compiled `/os/` assets.

## Existing Architecture to Reuse

The imported shell already provides:

- draggable windows
- resizable windows
- maximize/restore
- minimize/close lifecycle
- taskbar buttons
- z-index/focus management
- Windows 95 styling and icons
- existing Doom, Oregon Trail, Scrabble, RIP Wordle, and Random Info Explorer applications

No second window manager or iframe application framework will be added. Each core-pack app will be a native React component rendered inside the existing `Window` component and registered through the existing `Desktop.tsx` lifecycle.

## Constraints

- Keep the `/computer/` Three.js experience and monitor input forwarding unchanged.
- Keep Doom, Oregon Trail, Scrabble, RIP Wordle, Random Info Explorer, and all existing Random Info project links working.
- Keep the upstream Win95 source pinned and imported through the existing script.
- Do not add a backend, account system, database, or new runtime dependency.
- Do not edit generated `os-src/` as source-of-truth.
- Prefer React 17, TypeScript 4.6, existing CRA/Jest tooling, and localStorage.
- Keep `main` untouched until the feature branch is verified.

## Core App Structure

Core applications live under:

`/scripts/win95-overrides/src/components/applications/core/`

Each interactive game separates deterministic state transitions from presentation where useful so Jest can test rules without relying on pixel/UI behavior.

Shared files provide:

- `CoreAppWindow.tsx`: thin wrapper around the existing Win95 `Window` with standard sizing/icon/status defaults.
- `coreStyles.ts`: reusable Win95-compatible content styles for buttons, inset panels, labels, score rows, boards, and utility layouts.
- `storage.ts`: namespaced safe localStorage helpers that degrade to in-memory state when storage is unavailable or malformed.

## Desktop Integration

`Desktop.tsx` remains the single owner of open/minimize/focus/close lifecycle.

The static app registry is extended with six core apps. Existing shortcuts retain their current keys and behavior. The new apps use existing generic icons (`windowExplorerIcon` for utilities, `windowGameIcon` for games) in the first release to avoid adding binary icon assets.

Shortcut ordering keeps Random Info Explorer and current games intact, followed by the new core applications. A later pass may reorganize shortcuts into folders, but folder hierarchy work is outside this core-pack scope.

## Applications

### Calculator

- four-function arithmetic
- decimal input
- clear and backspace
- keyboard number/operator support
- repeated calculations use the displayed result
- divide-by-zero produces a recoverable error state instead of throwing

### Notepad

- plain-text editing
- autosave to namespaced localStorage
- New/Clear command
- word count and character count
- gracefully falls back if storage is unavailable

### Minesweeper

- beginner 9×9 board with 10 mines
- first-click safety
- reveal/flood-fill for empty cells
- flag/unflag
- win/loss detection
- elapsed timer
- mines-remaining display
- best completed time persisted locally

### Snake

- keyboard arrow/WASD controls
- fixed-step grid movement
- food never spawns on the snake
- wall/self collision ends the run
- restart and pause
- pause on window/document blur
- score and persisted high score

### 2048

- 4×4 board
- keyboard arrow controls
- standard compress/merge/compress behavior
- each tile merges at most once per move
- score and persisted best score
- restart
- win and game-over status

### Reaction Test

- idle, waiting, ready, result states
- randomized wait before ready
- false-start handling
- recent-attempt history
- persisted best reaction time
- timers cleaned up on restart/unmount

## Error Handling

- localStorage reads/writes never crash an app.
- Invalid persisted values fall back to defaults.
- Keyboard apps prevent default behavior only for keys they consume.
- Timers and listeners are cleaned up on unmount.
- Opening an already-open app raises/restores it through the existing desktop state rather than creating duplicate lifecycle state.

## Testing and Verification

### Unit tests

Use the imported CRA/Jest toolchain to test deterministic logic and critical state helpers. Tests live with the override source and are copied into generated `os-src/` by the overlay process.

Coverage must include:

- calculator operation/error behavior
- storage malformed/unavailable fallback
- Minesweeper first-click safety and win/loss rules
- Snake movement/collision/food placement
- 2048 merge-once rules and game-over detection
- Reaction Test false-start/result state transitions

### Repository contracts

Extend `tests/computer-*.test.mjs` or add a focused computer core-pack contract test to confirm the importer/override tree contains all six app registrations and does not remove existing applications.

### CI

`computer-ci.yml` continues to:

1. build the Three.js computer
2. import/build the Win95 OS
3. run computer contracts
4. stage the local Pages prefix
5. run Chromium smoke tests

Add the generated OS Jest suite after the Win95 import succeeds and before browser smoke testing.

### Browser smoke

Extend the Chromium smoke flow to verify at least:

- the OS loads through `/computer/`
- an existing application still opens
- one utility app opens and accepts input
- one keyboard game opens and responds to its controls
- minimize/restore still works

## Out of Scope

- JS Paint
- Webamp
- additional emulator runtimes
- Solitaire
- virtual pet
- screensavers
- terminal
- virtual filesystem
- backend synchronization
- shortcut folders/reorganization beyond registering the six apps

## Success Criteria

The feature is complete when all six native apps launch in the authentic Random Info OS window system, core rules pass Jest tests, state persistence behaves safely, existing applications and Random Info links remain intact, the computer CI workflow passes, and Chromium smoke testing confirms the apps still function through the 3D CRT integration.
