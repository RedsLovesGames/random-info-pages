# Random Info Pages Toolbox Expansion Design

## Goal
Expand the existing Random Info Pages Toolbox from four deep local-first utilities into thirteen deep workspaces that cover the planned utility surface without turning `/tools/` into a directory of tiny single-purpose pages.

## Explicit scope
The expansion includes:

1. Time & Scheduling
2. Image Studio
3. Money & Finance
4. Text Studio
5. PDF & Documents
6. File & Archive Lab
7. Media Studio
8. Data Studio
9. Developer Lab
11. Math & Science Lab
12. Random & Decision Lab
13. Codes & Generator Lab
14. Network & System Lab

**Explicitly excluded:** #10 Web & Design Lab.

The numbering above intentionally preserves the previously approved fourteen-workspace concept so the omitted #10 remains obvious.

## Existing product boundaries
Random Info Pages remains a personal archive of standalone projects. Toolbox absorbs only reusable general-purpose utilities.

The following remain separate standalone projects and must not be replaced:
- `/wheel/` remains the full weighted wheel experience. Random & Decision Lab may link to it as the advanced wheel.
- `/whenwemeet/` remains the collaborative cross-device availability application. Time & Scheduling may link to it for shared availability workflows.
- `/school-schedule/`, `/friends/`, Tideborne/Tide2, VCT Scout, politics/data pages, and other archive projects remain independent.

## Product model
Each Toolbox card represents a coherent workspace/domain rather than one operation. Subtools live inside the workspace as tabs, modes, commands, or routed state.

Toolbox search indexes both workspace metadata and subtool metadata. A search for `base64` should surface `Developer Lab → Base64`; `merge pdf` should surface `PDF & Documents → Merge`; `sha256 file` should surface `File & Archive Lab → Checksums`.

Every workspace remains directly addressable by a stable route. Individual modes may use URL hashes/query parameters for deep-linking but should not require separate HTML pages.

## Architecture
Keep the existing static HTML/CSS/JavaScript GitHub Pages architecture. No framework migration is part of this expansion.

Shared code under `/tools/shared/` should grow from basic favorites/recent state into a small Toolbox platform:
- registry and searchable subtool metadata
- lazy dependency loader
- local preference/state helpers
- file drop/picker helpers
- download/copy helpers
- split-pane, tab, status, progress, modal and queue primitives
- worker helpers for long-running browser-local operations
- consistent error/status semantics

Each workspace owns its domain logic and can fail independently. Heavy dependencies and WASM modules load only when a user enters the mode that needs them.

## Dependency policy
Follow the existing `tools/OPEN_SOURCE.md` policy:
1. browser/platform APIs first when practical;
2. permissive focused libraries second;
3. adapted permissive upstream implementation where that clearly reduces risk;
4. GPL/AGPL projects as behavioral/reference material only unless their obligations are explicitly accepted.

Every incorporated third-party dependency must be pinned, license-checked, and recorded in `tools/OPEN_SOURCE.md`.

## Workspace definitions

### 1. Time & Scheduling
Preserve the existing Time Zone Board and add:
- date difference/add/subtract
- age and weekday/business-day calculations
- Unix/ISO/local/UTC timestamp conversion
- ICS event builder/export
- recurring-event/RRULE builder
- cron expression builder/preview
- local availability calculations
- explicit link to When We Meet for cross-device group submissions

### 2. Image Studio
Preserve current convert/resize/crop/compress/GIF/background-removal behavior and add:
- annotation/arrows/text/boxes
- blur/redaction
- simple filters and grayscale/invert/sharpen where browser-local processing is reliable
- screenshot composition/stitching
- metadata/EXIF inspection and stripping where supported
- additional browser/WASM codecs only when they justify their weight

### 3. Money & Finance
Preserve inflation and live FX, then add:
- compound growth and savings targets
- APY/APR comparison
- loan payment/amortization/early payoff
- CAGR and inflation-adjusted return
- DCA projections
- hourly/salary conversion, overtime, raise comparison and paycheck estimation with clear limitations

### 4. Text Studio
Preserve cleaner/list/Markdown features and add:
- plain and regex find/replace
- readability/reading-time/frequency analysis
- text diff
- slug and simple text generators
- Unicode normalization/invisible-character inspection
- Markdown helpers such as tables and sanitized HTML export

### 5. PDF & Documents
One loaded-document workspace supporting:
- merge/split/reorder/delete/rotate/extract pages
- watermark/page numbers
- images to PDF and PDF pages to images
- text/image extraction
- metadata inspection/editing where safe
- scan/photo cleanup handoff
- OCR and searchable-text export where practical
- password/protection features only if the chosen permissive engine can implement them reliably client-side

### 6. File & Archive Lab
One arbitrary-file workspace supporting:
- file/type/size/header inspection
- bulk rename and filename transforms
- hashes/checksum compare
- duplicate detection by hash
- metadata/EXIF inspection
- ZIP creation/extraction
- broader archive reading through a vetted browser/WASM engine where practical
- compression comparison and archive recompression

### 7. Media Studio
One audio/video/recording workspace supporting:
- video trim/crop/rotate/flip/resize/speed/volume/mute/loop/convert
- video to GIF and audio extraction
- audio trim/join/speed/pitch/volume/normalize/reverse/basic EQ/convert
- waveform display
- screen, microphone, webcam and combined browser-supported recording
- tone generator, frequency sweep and metronome
- media metadata/codec/bitrate/duration inspection

Native browser APIs should handle recording/playback/simple operations where possible. FFmpeg WASM is lazy-loaded only for operations that genuinely need it.

### 8. Data Studio
One structured-data workspace supporting:
- CSV/TSV/JSON/JSONL/XLSX/Parquet import where supported
- table viewing/editing/sorting/filtering/searching
- column rename/type conversion/removal
- dedupe/missing-value handling
- structured conversion and flatten/unflatten
- group/pivot/basic descriptive statistics
- DuckDB-Wasm SQL over supported files
- SQLite browsing through a separate lazy engine where justified
- basic charts and export to common formats

### 9. Developer Lab
One split-pane/chained-operation workspace supporting:
- JSON/YAML/XML formatting, validation and conversion
- Base64/URL/HTML entities/Unicode/hex/binary encoding and decoding
- regex tester and replacement preview
- JWT/PEM/X.509/CSR inspection where safe
- UUID/random token generation for developer use
- URL parser/query editor
- text/structured diff
- JSON Schema validation and JSONPath/XPath where practical
- SQL formatting
- lightweight API request builder subject to browser CORS
- sandboxed HTML/CSS/JS playground
- Mermaid preview if added, without becoming the excluded Web & Design Lab

### 11. Math & Science Lab
One calculation framework with modes for:
- standard/scientific/fraction/percentage calculations
- broad unit conversion
- matrices and common algebra operations
- function graphing and tables
- geometry
- common physics calculations
- chemistry calculations such as molar mass/dilution/moles/gas laws/concentration
- electronics helpers such as Ohm's law, resistor codes and dividers
- grade/weighted-grade/final-score calculators

Every mode must show variables/units clearly and distinguish calculator output from explanatory reference content.

### 12. Random & Decision Lab
A fast utility companion to the standalone Wheel:
- random item
- weighted item
- shuffle
- random teams/groups
- random unique numbers/sampling
- coin/dice/custom probability
- seeded reproducible RNG
- simple probability experiment/simulation
- advanced-wheel link to `/wheel/`

### 13. Codes & Generator Lab
One generate/scan/export workspace supporting:
- QR for URL/text/Wi-Fi/email/SMS/vCard/calendar data
- QR scanning from camera and uploaded image
- common barcode generation/scanning where the chosen engine supports it
- secure password/passphrase generation
- UUID/GUID and secure random token generation

### 14. Network & System Lab
One technical-calculation/inspection workspace supporting:
- IPv4/IPv6 parsing
- CIDR/subnet masks/host ranges/private-public classification
- data-size conversions including decimal/binary units
- bandwidth/download/upload time
- bitrate/storage duration/file-size calculations
- display resolution/aspect/PPI calculations
- browser/device capability inspection that does not fingerprint users beyond information already exposed locally

## Shared UX requirements
- One obvious primary workspace per page with secondary modes in tabs or a compact command switcher.
- File-based workspaces accept drag/drop and file picker.
- Original user files are not mutated; outputs are explicit downloads.
- Long work exposes progress and cancellation where technically possible.
- Mobile and desktop are first-class.
- Search can deep-link to a workspace mode.
- Privacy status is explicit: local-only, runtime-data fetch, or browser-network request.
- Unsupported browser features degrade to scoped feature errors rather than breaking the workspace.

## Persistence
Use localStorage for small preferences/history/favorites and IndexedDB only when a workspace benefits from larger local state. Do not persist large source files by default.

## Testing strategy
Keep the current lightweight Node `.mjs` test approach. Pure transformation/calculation logic must be exported into testable modules. Add route/static-asset smoke tests and deterministic fixtures for each workspace. Browser-heavy features get a small manual verification matrix for Chromium and Firefox at phone and desktop widths.

Critical regression rule: every existing Random Info Pages standalone route and the current four Toolbox behaviors must keep working as new workspaces are added.

## Delivery strategy
Build shared infrastructure once, then ship workspaces in dependency-aware waves. Each wave must leave the public Toolbox coherent and deployable. New workspaces can launch with their core modes first and receive deeper modes in a later wave, but no placeholder cards should appear on the public index.

## Non-goals
- Web & Design Lab (#10).
- Account system or general Toolbox backend.
- Cloud file storage.
- Replacing Wheel, When We Meet, School Schedule, Friend Group Hub, or game/reference projects.
- Framework migration.
- Remote processing of private user files when a practical local implementation exists.
- Copying GPL/AGPL implementations into the repository without an explicit licensing decision.
