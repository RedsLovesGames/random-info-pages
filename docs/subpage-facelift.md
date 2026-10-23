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

* **U.S. Congress Age Explorer**: task-focused quick filters (all members, House, Senate, youngest, oldest), reset, clearer frozen-snapshot wording. The sourced congressional roster and profile links are unchanged.


## Third pass: guided workflows in five more active applications

* **Algorithm Visualizer** – three experiment launchers use the existing sorting and pathfinding engines without changing algorithms, data, or run metrics.
* **100-Statement Political Survey** – explanation-first participation guide, clearly labeled X-selection progress, and selected-only statement review; no changes to question text or submission/storage models.
* **Group Availability Planner** – optional study/dinner/hangout templates prefill a few schedule fields but never create or share an event automatically. Date selection and confirmation remain manual.
* **September 11: Message Timeline** – restrained documentary chapter navigation to source-linked events already present in the chronology; no additional historical events, pager counts, or private messages are generated.
* **Random Choice Wheel** – prominent touch-friendly Spin button delegates to original canvas logic; stage rows resize to retain the complete wheel and the existing presentation mode.

Regression tests: `tests/third-pass-redesign.test.mjs`, invoked by the existing Pages workflow. Browser-rendered QA still required for exact sizing and focus order at all device widths.


## Fourth pass: evidence, exhibits, exact-scale stories, and social play

Five additional active applications have unique, use-case-specific improvements:

* **Belief Atlas** — four action paths for research gaps, local evidence, person lookup, and methodology. Live evidence-record count reflects the original browser-local research storage. No belief claims or public-figure evidence are added or altered.
* **Cryptography Museum** — three gallery starting routes and an adaptive continue-your-visit link based on the existing local passport. The seven cryptographic exhibits, demonstrations, challenges, and historic material remain unchanged.
* **One Million** — exact numerical examples (10%/1%/0.1%; one in a million; 250 in 10,000), fed through the existing validated comparisons and renderer. These are explicitly mathematical illustrations.
* **10Groups Heatmap** — top-of-page wayfinding between full heatmap, one circle, and coordinate table, with a short interpretation guide; original circle geometry and color logic are untouched.
* **Friend Group Hub** — magazine-style spotlight selecting a real quote from the existing quote JSON, a link to find that quote in the archive, and optional number keys for the Guess Who game. No new or synthesized quotes.

Regression checks: `tests/fourth-pass-redesign.test.mjs`; deployed through the existing GitHub Pages workflow. All legacy app data and archive routes remain intact.

Remaining bespoke projects: Novel Writing & Revision, AI Video Scene Director, and Nerdcore Song Prompt Builder. Rendered interaction and mobile QA are still needed across the collection.
