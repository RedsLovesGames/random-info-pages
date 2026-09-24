# Random Info Pages Wheel Design

Date: 2026-09-24
Status: Proposed
Target route: `/wheel/`

## Goal

Build a simple, dependable wheel picker for Random Info Pages that reproduces the core useful behavior of Wheel of Names as closely as practical while using a cleaner, simpler interface and remaining suitable for static GitHub Pages hosting.

This is a functional reimplementation, not a copy of Wheel of Names source code, branding, proprietary assets, or internal implementation.

## Success criteria

The feature is successful when a user can open `/wheel/`, paste or type a list of entries, spin immediately, get an unbiased winner, remove or keep that winner, and continue without needing an account or setup flow.

Advanced functionality should be available without making the default screen feel complicated. The page must work well on current desktop and mobile browsers and must persist ordinary use locally between visits.

## Product principles

1. Simple first. The default screen exposes only the wheel, entries, spin action, and a small set of obvious controls.
2. Functional parity over visual imitation. Reproduce useful behavior, not Wheel of Names branding or layout details.
3. Static by default. Do not introduce a backend unless a required feature cannot reasonably work in-browser.
4. Progressive disclosure. Advanced settings live behind Settings or secondary controls.
5. Fast and resilient. The wheel should still work with no account, no network APIs, and no external service dependency after the page loads.
6. Mobile is first-class, not a reduced version.

## Architecture

The feature will live in a standalone `wheel/` directory and follow the repository's existing standalone-page model.

Recommended implementation:

- `wheel/index.html` for page structure
- `wheel/styles.css` for layout and responsive presentation
- `wheel/app.js` for state, wheel rendering, spinning, persistence, sharing, import/export, and UI behavior
- optional small local asset directory for original icons or sounds created for this project

No server is required for the initial release.

### Client-side state

Maintain one serializable application state object containing:

- schema version
- active wheel id
- wheel collection
- entries per wheel
- per-entry weight, color, and optional image data/reference
- wheel appearance settings
- spin settings
- winner behavior
- history
- global UI preferences

Persist the working state to `localStorage` after user-visible changes with lightweight debouncing.

Named saves should also live in `localStorage` and use a versioned schema so future migrations are possible.

### Random selection

Winner selection must be separate from animation.

Use `crypto.getRandomValues()` to obtain randomness. Convert it into a uniform random value without relying on `Math.random()` for winner selection. Weighted entries should be selected according to their positive weights. The animation then rotates the wheel to the already-selected winner.

This prevents animation timing or frame rate from determining the result.

### Rendering

Use Canvas 2D for the wheel because it supports many segments efficiently, simplifies rotation, and avoids generating large DOM trees for large entry lists.

The entries editor remains ordinary HTML controls for accessibility and easy editing.

## Default UI

### Desktop

The page uses a two-column layout:

- large wheel area on the left
- entries panel on the right

A compact top bar contains the page title plus Save, Share, Settings, and overflow controls.

The primary Spin action should be obvious and usable by mouse, touch, and keyboard. Clicking/tapping the wheel may also spin when it is not already spinning.

### Mobile

The layout becomes vertical:

1. compact top bar
2. wheel
3. Spin action
4. entries panel
5. secondary controls

The wheel should fit within the viewport without horizontal scrolling. Entry editing must remain comfortable on a phone.

### Progressive disclosure

The default surface shows:

- wheel
- entry editor
- Spin
- add/remove entries
- Shuffle
- Sort
- Save
- Share
- Settings

Settings contains the less common controls:

- weights
- colors/themes
- images
- spin duration
- sound
- confetti
- winner behavior
- wheel center image
- page background
- multi-wheel controls
- fullscreen/presentation behavior
- accessibility preferences

## Core entry behavior

Users can:

- paste newline-separated entries
- type entries directly
- add and remove rows
- preserve duplicates
- reorder entries
- shuffle entries
- sort entries
- clear the list
- assign positive numeric weights
- assign optional per-entry colors
- optionally associate images with entries

Blank entries should not participate in selection.

Duplicate text values are independent entries unless the user explicitly chooses an action affecting all matching entries.

## Spin behavior

When Spin is activated:

1. validate that at least one eligible entry exists
2. securely choose the winner
3. calculate a final wheel angle that places the selected segment under the pointer
4. add several full rotations for presentation
5. animate with smooth deceleration
6. optionally play tick feedback as segment boundaries pass the pointer
7. stop exactly on the selected entry
8. show the winner result
9. record the result in history

During a spin, state-changing controls that could invalidate the wheel geometry should be disabled or deferred.

Reduced-motion users should get a substantially shorter/non-spinning transition while preserving the same winner selection.

## Winner result

The result dialog/sheet should show the winner clearly and offer:

- Spin again
- Remove winner
- Remove all matching entries
- Close/keep winner

Optional confetti and winner sound are controlled in Settings.

History should record recent winners per wheel and provide a clear-history action.

## Multiple wheels

Support multiple wheels in one saved configuration.

Users can:

- add a wheel
- rename a wheel
- duplicate a wheel
- delete a wheel
- switch among wheels
- spin the active wheel
- optionally spin all wheels sequentially

Multi-wheel controls should stay out of the main UI until more than one wheel exists or the user opens the relevant menu.

## Appearance customization

Support:

- automatic palette
- predefined palettes
- custom segment colors
- light/dark/system page appearance
- optional page background color/image
- optional wheel center image
- optional per-entry images

Customization must never prevent the wheel from remaining readable. Use contrast-aware text selection when practical.

## Persistence

### Autosave

The current working wheel state is automatically stored locally.

### Named saves

Users can create, rename, load, duplicate, and delete named local saves.

### Import/export

Allow exporting a complete wheel configuration as a JSON file and importing the same format later.

The JSON format includes a schema version and must reject malformed input gracefully without destroying the user's current wheel.

## Sharing

Initial release sharing should not require a backend.

Encode a compact serialized wheel configuration into a URL fragment or query payload when the size is reasonable. The shared page reconstructs that wheel on load.

If the configuration is too large for a practical URL, offer JSON export instead of silently producing a broken link.

Shared URLs must not overwrite the recipient's existing local autosave until the recipient explicitly edits/saves the imported configuration or chooses to replace it.

## Fullscreen / presentation mode

Provide a presentation mode that emphasizes the wheel and result while minimizing editing controls. It should work with browser fullscreen where supported but must not require fullscreen APIs to function.

## Keyboard and accessibility

Minimum keyboard behavior:

- Space/Enter can spin when focus is not inside a text-editing control
- Escape closes dialogs/sheets
- all buttons and menus are keyboard reachable

Use semantic controls for editors and dialogs, visible focus indicators, useful labels, and reduced-motion support.

Canvas content must have an accessible textual counterpart through the entries list and winner/result status text.

## Performance targets

Normal interaction should remain smooth with hundreds of entries.

For very large lists, wheel labels may be selectively hidden or abbreviated rather than attempting to render unreadable text on every segment. Selection accuracy must remain correct regardless of visual label density.

Avoid heavyweight frameworks or dependencies unless they materially reduce implementation risk.

## Error handling

The page should recover cleanly from:

- empty lists
- invalid weights
- corrupt imported JSON
- unsupported image files
- localStorage quota failures
- overlong share URLs
- malformed shared state

Failures should produce concise user-facing messages without losing the current valid state.

## Home-page integration

Add a card/link on the repository root page pointing to `/wheel/` with a short description such as:

> Wheel - customizable random picker with weighted entries, saves, sharing, and multiple wheels.

Do not redesign unrelated Random Info Pages content as part of this task.

## Out of scope for initial release

Do not add unless later requested:

- user accounts
- cloud database
- Firebase/Supabase backend
- collaborative real-time editing
- public gallery/community wheels
- analytics/tracking
- ads
- copied Wheel of Names branding/assets/code

## Verification requirements

Before considering the implementation complete, verify at minimum:

1. fresh page load with default entries
2. paste/edit/add/remove entries
3. duplicate entries remain independent
4. repeated spins only select eligible entries
5. weighted selection implementation is deterministic with injected test randomness and statistically sanity-checked separately
6. animation lands on the winner chosen before animation
7. remove winner and remove-all-matches behavior
8. local autosave survives reload
9. named save/load/delete
10. export then import round trip
11. share-link round trip
12. corrupt import/share data does not destroy current state
13. multiple wheel add/switch/duplicate/delete
14. mobile viewport layout
15. desktop viewport layout
16. keyboard spin/dialog behavior
17. reduced-motion behavior
18. no console errors during normal use
19. root-page link resolves correctly under GitHub Pages project-path hosting
20. direct `/wheel/` GitHub Pages URL loads all local assets correctly

## Implementation direction

The implementation should favor a small dependency-free static app. The internal model should be versioned and serializable from the start so saving, sharing, import/export, and later migrations all use the same state format.

The core selection function should be isolated from drawing and animation so it can be tested independently. Wheel geometry should likewise be deterministic from state, with animation acting only as presentation of an already-selected outcome.
