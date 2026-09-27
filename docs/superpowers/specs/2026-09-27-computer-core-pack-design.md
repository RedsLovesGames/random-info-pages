# Random Info OS Core Pack Design

## Goal

Turn the existing Random Info OS from primarily a Win95-styled launcher into a small functional desktop that can host self-contained apps inside the 3D computer without changing the Three.js shell or breaking existing project links.

The first release will ship six native apps: Calculator, Notepad, Minesweeper, Snake, 2048, and Reaction Test.

## Constraints

- Keep the existing `/computer/` 3D experience and monitor input forwarding intact.
- Keep existing folders and routes working exactly as they do now.
- Keep the implementation static-site compatible for GitHub Pages.
- No backend, accounts, database, or new build system.
- Prefer vanilla HTML/CSS/JS and localStorage.
- Keep `main` untouched until the feature branch is verified.

## Current Architecture

`computer-src/src/Application/World/MonitorScreen.ts` embeds the same-origin `../os/` route in the CRT iframe. The OS itself is a small vanilla HTML/CSS/JS desktop with draggable Explorer-like windows, taskbar buttons, folder shortcuts, and legacy game placeholders.

The existing generic Explorer window is intentionally small and fixed-size, so it should remain the folder/document window rather than becoming the application runtime.

## Chosen Approach

Add a lightweight application layer to the existing OS instead of rewriting the shell.

- Keep `FOLDERS` and existing link behavior unchanged.
- Add an `APPS` registry in `os/app.js` describing app title, route, dimensions, and resize/maximize behavior.
- Add `openAppWindow(appKey)` to create application windows that host same-origin app iframes.
- Extend the window manager with optional dimensions, maximize/restore, and resize support while preserving current Explorer behavior.
- Put each app in its own directory under `os/apps/`.
- Add shared Win95 app styling and a tiny storage helper under `os/shared/`.

This isolates failures. A broken game should not break the desktop shell, another app, or the 3D computer.

## Alternatives Considered

### 1. Put every app directly into `os/app.js`

Fast for the first app but creates a large coupled file, makes styling difficult, and risks regressions across unrelated programs. Rejected.

### 2. Rewrite Random Info OS in React or another framework

Would provide stronger component structure but adds a build system and substantially increases migration risk for a small static desktop. Rejected.

### 3. Self-contained iframe apps with a thin native window manager extension

Selected because it preserves the current OS, keeps apps independent, remains GitHub Pages compatible, and makes third-party apps such as JS Paint or Webamp easier to integrate later.

## App Runtime

Each app entry will support fields equivalent to:

```js
{
  title: 'Minesweeper',
  src: './apps/minesweeper/',
  width: 460,
  height: 520,
  minWidth: 320,
  minHeight: 300,
  resizable: true,
  maximizable: true
}
```

`openAppWindow()` will:

1. Look up the app definition.
2. Create an OS window through the existing window manager.
3. Insert an iframe pointing to the app route.
4. Add a taskbar button through the existing taskbar flow.
5. Forward focus correctly when the app is clicked.
6. Allow minimize, close, maximize/restore, and resize as configured.

App iframes will remain same-origin so future controlled messaging between the shell and apps is possible without cross-origin workarounds.

## Window Manager Changes

The existing `createWindow()` behavior will remain the default for folders and legacy dialogs.

New optional behavior:

- custom width and height
- minimum width and height
- maximize/restore button
- resize handle
- viewport clamping
- state restoration after maximize

The implementation must not change current folder sizing unless explicitly requested through options.

## Shared App Infrastructure

### `os/shared/win95.css`

Reusable controls for app interiors:

- buttons
- inset fields
- panels
- menu bars
- status bars
- tabs
- game panels
- utility spacing

### `os/shared/storage.js`

A tiny namespaced wrapper around localStorage:

```js
RIPStorage.get(key, fallback)
RIPStorage.set(key, value)
RIPStorage.remove(key)
```

It must tolerate malformed stored JSON and fall back safely.

## Core Apps

### Calculator

- four-function arithmetic
- decimal input
- clear/backspace
- keyboard number/operator support
- divide-by-zero handled without crashing

### Notepad

- plain-text editor
- autosave to localStorage
- clear/new action
- word and character counts
- no rich-text dependency

### Minesweeper

- beginner board by default
- first-click safety
- flagging
- win/loss detection
- timer
- mines remaining counter
- best time persisted locally

### Snake

- keyboard controls
- restart
- score and high score
- deterministic collision rules
- pause on window blur so input focus changes do not cause accidental loss

### 2048

- arrow-key controls
- correct merge-once-per-move rules
- score and persisted best score
- restart
- win/game-over state

### Reaction Test

- waiting/random delay/ready/result states
- false-start handling
- recent attempts
- persisted best result

## Desktop Integration

The first pass will add an `Accessories` folder and expand `Games` rather than crowding the desktop with every app.

Suggested grouping:

- Accessories: Calculator, Notepad
- Games: Minesweeper, Snake, 2048, Reaction Test, plus existing project links

A small number of direct desktop shortcuts may be added later after the folder experience is verified.

## Error Handling

- Missing app definitions should fail silently rather than creating broken windows.
- App iframe loading failures should show a simple in-window error state.
- localStorage failures should degrade to in-memory behavior for the current session.
- App code must not assume the outer 3D shell exists.
- Keyboard-driven games must prevent only the keys they actively own so browser/OS interactions are not broadly blocked.

## Testing

Verification will include:

1. Syntax checks for all new JavaScript files.
2. Existing computer/OS CI where available.
3. Static route checks for every new app entry.
4. Desktop behavior checks: open, drag, minimize, restore, maximize, resize, close, taskbar focus.
5. App-specific deterministic tests for game logic where practical.
6. Manual browser validation inside `/os/` and through `/computer/` to confirm iframe input forwarding still works.
7. Mobile/coarse-pointer smoke test to ensure existing single-tap shortcut behavior is preserved.

## Out of Scope for the Core Pack

- JS Paint
- Webamp
- Doom or emulator runtimes
- Solitaire
- virtual pet
- screensavers
- terminal
- virtual filesystem
- backend synchronization

These can be layered on after the core runtime is stable.

## Success Criteria

The feature is complete when the six core apps launch from Random Info OS, coexist in independent movable windows, preserve their intended local state, work inside the 3D CRT, and all pre-existing OS folders/project links still work without regression.
