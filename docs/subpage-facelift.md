# Random Info Pages / subpage facelift

Scope: 19 active project entry points, 13 Toolbox utility screens, and 2 nested data views. Archived VCT Scout, Tideborne wiki, Fishing System 2.0 and their nested pages are excluded.

Architecture:
- `design-system/rip.css`: isolated global project rail, accessible searchable project switcher and skip-free navigation.
- `design-system/rip.js`: progressive, local navigation; no alterations to project state or project-specific event handlers.
- `design-system/project-polish.css`: active-project-specific typography, layout and interaction improvements. All selectors are scoped under `body[data-rip-page]`.
- Existing page stylesheets, scripts and localStorage keys remain in place.
- Avoid `Ctrl+K` interception because some existing applications use it.
- Never render the cross-project rail inside previews/iframes.
- Preserve former routes exactly and keep the classic page unchanged.
- Design language: Swiss-aligned labels/typography, minimalist controls, isolated visual accents, and a deliberately small number of animations.

Review checklist:
- Desktop and mobile widths: 360, 768, 1280, and 1600 px.
- All archived directories remain unchanged.
- Full 19-project navigation remains searchable across apps.
- Existing projects still start and retain saved data.
- Basic keyboard traversal, focus rings, reduced-motion preference, image/canvas interactions.


## Second pass: purposeful, screen-specific interactions

Implemented in the existing GitHub Pages source, without modifying archived projects:

* **Toolbox** (13 utilities): new “Everything / Create & edit / Plan & calculate / Data & technical” filters, accurate result counts, one-click reset for no matches. Favorites and recently used tools retain their original `rip.toolbox.v1` storage.
* **Class & Assignment Planner**: course filtering, hide/show completed, unique-task completion progress, synchronized duplicate deadline checkboxes. Distinct DOM IDs now prevent duplicated weekly/upcoming assignments from targeting the wrong label. Existing `school:` completion keys stay in place.
* **Stock Fights**: stage-first page navigation, arena-only focus view, controls and keyboard-help dialog. Existing simulation engine, replay seed and custom asset storage are untouched.
* **U.S. Infrastructure Report Cards**: clear entry points to existing map, ranking, compare and insights panels; prominent explanation of ASCE-published versus dashboard-calculated grades.
* **Music & Audio Analyzer**: guided loading/analysis/filter experience and concise explanations of waveform, spectrogram, and live spectrum, without touching audio processing.

Deep-redesign regression tests: `tests/deep-redesign.test.mjs`. The Pages workflow executes them along with the existing homepage and subpage tests.

### Deliberately not changed
* VCT Scout, Tideborne Fishing Guide, Fishing System 2.0 or their nested documentation.
* Project URLs, calculation models, audio engine, combat engine, source data, or persistent app storage schemas.
* Classic archived homepage.

### Remaining work
* Full rendered desktop/mobile QA in a browser, especially very narrow screen widths and full-screen simulations.
* Bespoke interaction/layout work in the other active apps beyond the shared site layer.
* Accessibility testing with a screen reader and keyboard-only playthrough.
