# Project Studio integration

Random Info Pages shares a single project registry at `design-system/projects.js`. Do not add a second hard-coded project list to `design-system/rip.js` or `index.html`.

## New project checklist

1. Add an entry with the canonical project path, searchable keywords, category, and topic to `projects.js`.
2. Keep the existing page usable without the shared Studio. Include `design-system/rip.css`, `rip.js`, and `appearance.js` using the correct relative directory paths.
3. If the page is a stateful editor, optionally expose `window.RIPStudio` with:
   - `getState(): object|Promise<object>` returning a JSON-serializable snapshot
   - `setState(state): void|Promise<void>` validating all incoming values before modifying project state
   - `capture(): Promise<Blob>` for a meaningful image of the active work surface
   - `setQuality(level)` when the page supports adjustable rendering quality
4. Keep project-specific persistence formats intact. The shared Studio stores a versioned wrapper around each page's own state.
5. Add a guided walkthrough to `tours.mjs` using controls present in the page. Avoid selectors inside closed dialogs.
6. Run the related Node tests and verify the page in a real browser, including a mobile viewport.

## Shared actions

- **Save/open** work only with a page adapter and are explicitly disabled otherwise.
- **Compare Lab** opens two isolated live copies of a project. They have independent simulations and browser state. Scroll synchronization is proportional to page scroll height, not physics time. Copy state only works when both pages are the same project and expose compatible adapters.
- **Canvas video** captures the selected visible canvas for at most 45 seconds and 120 MB. It is silent and local, never a full-page or microphone recording.
- **Diagnostics** shows animation-frame cadence, canvas size and optional device hints. It is not a physics solver benchmark.
- **Tours** are user-invoked, non-modal, and do not execute project actions automatically.
- **Offline cache** is network-first for eligible same-origin static assets; visited pages may work offline, but server-backed games and external resources still require an internet connection.

## Security and accessibility

Do not put secrets, passwords, or unrelated personal data into `getState`. Validate imported states and handle missing browser APIs. Use visible labels, focus styles, keyboard actions, and reduced-motion fallbacks. Do not silently transmit or upload a user's project.
