# Toolbox Unified Workspace Master Plan

> **Branch:** `toolbox`
>
> **Scope:** Expand Random Info Pages Toolbox into 13 deep, local-first workspaces using one shared interaction model. **Web & Design Lab is explicitly excluded from this plan.**
>
> **Related design:** `docs/superpowers/specs/2026-09-24-toolbox-expansion-design.md`
>
> **Related earlier plan:** `docs/superpowers/plans/2026-09-24-toolbox-expansion-implementation.md`

## Goal

Turn Toolbox from a collection of separate utility pages into a coherent suite of deep workspaces where the user loads or enters the thing they are working on once, then applies any relevant operation from contextual icon tools without repeatedly re-uploading, re-entering, or navigating between tiny single-purpose pages.

The target is approximately **13 workspaces with 120-180 searchable actions**, not 120-180 separate pages.

The central UX rule is:

```text
LOAD / ENTER SOMETHING
          ↓
      WORK ON IT
          ↓
   ICONS FOR ACTIONS
          ↓
     UNDO / REDO
          ↓
  EXPORT OR SEND TO...
```

## Product Rules

- Keep Random Info Pages as the top-level archive of standalone projects.
- Keep `/wheel/`, `/whenwemeet/`, `/school-schedule/`, `/friends/`, game/reference pages, and other standalone projects separate.
- Keep Toolbox at `/tools/` as a general-purpose utility suite.
- Preserve the existing static GitHub Pages architecture. Do not migrate to React/Vite or another framework.
- Prefer browser-native APIs first, focused permissive libraries second, WASM only when justified.
- User files should remain on-device whenever practical.
- No account or backend should be required for normal Toolbox use.
- Heavy libraries, codecs, models, and WASM modules must load only when their feature is invoked.
- Every incorporated third-party source must be pinned, license-checked, and recorded in `tools/OPEN_SOURCE.md`.
- Mobile and desktop must both be first-class.
- Existing working engines should be adapted into the shared shell rather than rewritten solely for architectural purity.

---

# 1. Unified Workspace Architecture

Almost every Toolbox page fits one of three shells.

## 1.1 Asset Workspace

Used for:

- PDF & Documents
- Image Studio
- File & Archive Lab
- Media Studio
- Data Studio

Flow:

```text
Drop / choose source
        ↓
Inspect + preview
        ↓
Select all / part of source
        ↓
Contextual tool icons
        ↓
Apply non-destructive operations where possible
        ↓
Undo / redo / history
        ↓
Download or open result in another Toolbox workspace
```

## 1.2 Input Workspace

Used for:

- Text Studio
- Developer Lab
- Math & Science Lab
- Random & Decision Lab
- Codes & Generator Lab
- Network & System Lab

Flow:

```text
Paste / type / import input
        ↓
Detect or select input type
        ↓
Choose tool icon
        ↓
Configure options
        ↓
Live result / output
        ↓
Copy / download / pass to another workspace
```

## 1.3 Scenario Workspace

Used for:

- Time & Scheduling
- Money & Finance

Flow:

```text
Create scenario once
        ↓
Keep shared values/state
        ↓
Switch calculations/views
        ↓
Reuse scenario across modes
        ↓
Save locally / export when useful
```

---

# 2. Shared Workspace Components

Build these once under `tools/shared/` and reuse them everywhere.

## Core modules

Create or expand:

```text
tools/shared/
  toolbox.js
  toolbox.css
  registry.js
  workspace.js
  actions.js
  history.js
  session.js
  artifacts.js
  loader.js
  files.js
  workers.js
```

### `registry.js`

Owns all workspace and action metadata.

Each workspace registers:

- id
- title
- route
- description
- keywords
- workspace type
- privacy label
- supported inputs
- action list

Each action registers:

```js
{
  id: "rotate",
  title: "Rotate",
  icon: "rotate-cw",
  group: "organize",
  aliases: ["rotate pdf", "turn pages"],
  accepts: ["pdf"],
  selection: "pages",
  lazyDependency: null,
  run(context, options) {}
}
```

This metadata drives:

- icon grids
- workspace search
- global Toolbox search
- contextual action visibility
- deep links
- recent actions
- favorites
- keyboard command palette

### `workspace.js`

Provides the common workspace state contract:

```js
{
  source,
  workingState,
  selection,
  history,
  currentAction,
  outputs
}
```

Each workspace supplies adapters for:

- `loadSource()`
- `renderPreview()`
- `serializeState()`
- `restoreState()`
- `exportResult()`
- action definitions

### `history.js`

Use action history instead of full binary snapshots wherever possible.

Examples:

PDF:

```text
rotate page 4
move page 8 → 2
delete page 11
apply watermark
```

Image:

```text
crop
rotate
filter parameters
resize
```

Data:

```text
filter rows
rename column
dedupe
sort
```

History must support:

- undo
- redo
- clear history
- human-readable history panel
- optional checkpoints for expensive transformations

### `artifacts.js`

Use IndexedDB for temporary cross-tool handoffs.

Example:

```text
PDF → Extract images → temp artifact → Open in Image Studio
```

Requirements:

- artifacts stay local
- each artifact receives an ID
- automatic TTL cleanup, default 24 hours
- manual "Clear temporary Toolbox data" control
- metadata records original workspace and type
- never silently persist large files forever

### `loader.js`

Deduplicate lazy library/model loading.

Requirements:

- pinned URLs only
- load-on-demand
- visible load/progress/error state
- scoped failure: if a dependency fails, native/basic features continue working

### `files.js`

Shared helpers for:

- file picker
- drag/drop
- Blob downloads
- safe object URLs
- object URL cleanup
- filename collision handling
- MIME/type inspection
- size formatting

### `workers.js`

Shared Web Worker wrapper for expensive operations such as:

- hashing
- OCR
- compression
- database queries
- archive processing
- heavy parsing

---

# 3. Shared Visual System

Build reusable visual primitives instead of custom UI for every page.

```text
WorkspaceShell
SourceHeader
DropZone
PreviewPane
ThumbnailRail
ToolGrid
ToolGroup
ToolIcon
SelectionBar
ActionDialog
SettingsDrawer
HistoryPanel
ProgressOverlay
ExportBar
EmptyState
ErrorState
EditorPane
OutputPane
TablePane
ScenarioHeader
```

## Default page hierarchy

```text
← TOOLBOX

WORKSPACE NAME
Source/scenario metadata                 Replace / Add / Clear

┌──────────────────────────────────────────────────────────┐
│                   MAIN WORKING AREA                      │
└──────────────────────────────────────────────────────────┘

TOOLS

PRIMARY GROUP
[ icon ] [ icon ] [ icon ] [ icon ]

SECONDARY GROUP
[ icon ] [ icon ] [ icon ] [ icon ]

ADVANCED
[ icon ] [ icon ] [ icon ]

────────────────────────────────────────────────────────────
Undo   Redo   History                       Export / Download
```

Do not expose every control at once. Icons reveal dialogs/drawers only when needed.

## Contextual actions

Actions should react to the current source and selection.

Examples:

Three PDF pages selected:

```text
Rotate | Delete | Extract | Duplicate | Export images
```

Audio source:

```text
Trim | Volume | Speed | Normalize | Convert
```

Video source:

```text
Trim | Crop | Resize | Extract audio | GIF
```

Impossible actions should be hidden or clearly disabled with a reason.

---

# 4. Workspace Plans

## 4.1 Time & Scheduling

**Route:** `/tools/time/`

Expand the current Time Zone Board rather than replacing it.

### Working object

A named time/scheduling scenario containing people/places, IANA zones, reference instant, format preferences, and optional availability.

### Modes/actions

**World Time**
- named clocks
- DST-aware local time
- day offset
- shared reference slider
- Now reset

**Availability**
- per-person working/available hours
- overlap visualization
- selected instant availability

**Date Math**
- date difference
- age
- add/subtract days/months/years
- business days
- weekday counts
- ISO week number

**Timestamp**
- Unix seconds/milliseconds
- ISO 8601
- UTC/local conversion
- timezone conversion

**Calendar**
- `.ics` event builder
- recurring event builder
- RRULE visual builder

**Cron**
- cron builder
- human-readable explanation
- next-run preview

### Standalone handoff

When collaborative submissions are required:

```text
Need everyone to enter availability? → Open When We Meet
```

---

## 4.2 Image Studio

**Route:** `/tools/image/`

Retrofit the current working Image Studio into the common Asset Workspace while preserving existing engines.

### Working object

Selected image plus optional batch queue and non-destructive transformation state.

### Actions

**Transform**
- crop
- rotate
- flip
- resize
- canvas size
- aspect presets

**Edit**
- background removal
- blur/redact
- annotate
- brightness
- contrast
- saturation
- grayscale
- sharpen

**Convert**
- PNG
- JPEG
- WebP
- AVIF later if codec path is justified

**Compress**
- quality
- target size
- maximum dimensions
- prevent upscale

**Create**
- GIF
- image stitch
- screenshot composition

**Inspect**
- dimensions
- EXIF/metadata
- file size
- color/profile information where available

### State model

Keep original pixels plus transformation parameters until export where practical.

---

## 4.3 Money & Finance

**Route:** `/tools/money/`

Expand Money Through Time into a Scenario Workspace.

### Shared scenario

- amount
- currency
- optional time horizon
- rate assumptions where relevant

Values should carry across modes unless the user resets them.

### Modes/actions

**Purchasing Power**
- current CPI/inflation functionality

**Currency**
- current multi-currency FX functionality

**Growth**
- compound interest
- CAGR
- investment growth
- DCA projections
- inflation-adjusted growth

**Savings**
- savings target
- required monthly contribution
- time-to-goal

**Loans**
- monthly payment
- amortization
- total interest
- early payoff

**Income**
- hourly ↔ salary
- overtime
- raise percentage/value
- gross paycheck estimates

---

## 4.4 Text Studio

**Route:** `/tools/text/`

Keep human-text workflows distinct from Developer Lab.

### Working object

One persistent text input with non-destructive output/history.

### Actions

**Clean**
- trim
- collapse whitespace
- remove blank lines
- Unicode cleanup
- punctuation normalization

**Case**
- upper
- lower
- title
- sentence

**Lists**
- sort
- dedupe
- reverse
- shuffle
- bullets
- numbering
- separator ↔ lines

**Find/Replace**
- literal
- regex
- multi-replace

**Analyze**
- words
- characters
- sentences
- reading time
- word frequency
- readability

**Compare**
- text diff

**Markdown**
- preview
- sanitized HTML
- table helper

---

## 4.5 PDF & Documents

**Route:** `/tools/pdf/`

This is the reference implementation for the unified Asset Workspace.

### Initial state

One large drop/select target.

### After load

Show:

- source filename/size/page count
- page thumbnail rail
- main page preview
- page selection state
- contextual action icons
- undo/redo/history
- final Download PDF action

### Working model

Keep an original PDF plus a lightweight editable representation of page order/rotation/deletions and overlays. Do not regenerate the entire PDF after every simple action.

### Actions

**Organize**
- merge
- split
- reorder
- rotate
- delete
- duplicate
- extract pages
- add another PDF
- insert blank page

**Edit**
- page numbers
- watermark
- header/footer
- crop pages
- resize pages

**Convert / Extract**
- PDF → images
- images → PDF
- extract images
- extract text

**Scan / OCR**
- OCR selected/all pages
- image cleanup before OCR where practical
- searchable PDF output
- TXT/Markdown output

**Info**
- metadata
- page sizes
- file size
- fonts where practical

**Security**
- password protection where browser library support is reliable
- unlock user-supplied password-protected PDFs where permitted by the library
- flatten forms where practical

### Likely engines

Research and license-verify before integration:

- `pdf-lib`
- PDF.js
- Tesseract.js for OCR

### Cross-tool handoffs

- extracted images → Image Studio
- extracted text/OCR → Text Studio
- structured extracted data where appropriate → Data Studio

---

## 4.6 File & Archive Lab

**Route:** `/tools/files/`

### Working object

A file/folder collection with selection state.

### Actions

**Names**
- bulk rename
- find/replace
- prefix/suffix
- numbering
- case conversion
- extension cleanup

**Inspect**
- MIME/type
- size
- timestamps
- magic bytes/header
- metadata
- basic hex inspection

**Verify**
- SHA-256
- SHA-512
- compatibility hashes where useful
- compare checksum

**Find**
- duplicates by hash
- duplicate names
- empty files
- largest files

**Archive**
- create ZIP
- inspect archive
- extract selected files
- 7z/TAR/GZIP/RAR reading where practical

### Likely engines

- native File/Blob APIs
- `fflate`
- `hash-wasm`
- `libarchive.js` if the license/build is acceptable

### UX requirement

Bulk operations must preview proposed changes before applying/exporting.

---

## 4.7 Media Studio

**Route:** `/tools/media/`

### Working object

Audio/video source with one shared timeline/selection component.

### Video actions

- trim
- crop
- resize
- rotate/flip
- speed
- volume/mute
- loop
- extract audio
- video → GIF
- convert
- compress where practical

### Audio actions

- trim
- join
- fade
- normalize
- volume
- speed
- pitch
- reverse
- EQ
- convert

### Recording

- screen
- microphone
- webcam
- screen + microphone

### Generate

- tone
- frequency sweep
- metronome
- note frequency

### Inspect

- codec
- resolution
- FPS
- bitrate
- duration
- audio/video tracks
- estimated output size

### Implementation rule

Use native Web Audio, MediaRecorder, video decoding, Canvas, and browser codecs first. Lazy-load FFmpeg/WASM only for operations that materially require it.

---

## 4.8 Data Studio

**Route:** `/tools/data/`

### Inputs

- CSV
- TSV
- JSON/JSONL
- XLSX
- Parquet
- SQLite where practical

### Working object

A table/data source plus a transformation pipeline.

### Actions

**Table**
- sort
- filter
- search
- edit cells
- rename columns
- remove columns
- change types

**Clean**
- dedupe
- trim strings
- normalize dates
- missing-value handling

**Transform**
- split/combine columns
- transpose
- group
- join
- pivot
- flatten/unflatten

**Analyze**
- count
- mean/median
- SD
- percentiles
- frequency
- correlation
- outliers

**Query**
- DuckDB SQL
- saved query history

**Visualize**
- bar
- line
- scatter
- histogram
- box plot
- heatmap

**Convert / Export**
- CSV
- JSON
- XLSX
- Parquet when supported

### Likely engines

- Papa Parse
- Tabulator or equivalent permissive grid
- DuckDB-Wasm
- SheetJS CE after exact license/version verification

### History model

Show data transformations as a pipeline and allow undo/redo by changing the pipeline rather than repeatedly mutating source data.

---

## 4.9 Developer Lab

**Route:** `/tools/developer/`

### Working object

Text/binary source plus optional chained operation pipeline.

### Actions

**Format**
- JSON
- YAML
- XML
- CSV
- SQL
- HTML

**Encode / Decode**
- Base64
- URL
- HTML entities
- Unicode
- hex
- binary
- ASCII

**Inspect**
- JWT
- PEM
- X.509/CSR where practical
- UUID
- HTTP headers

**Test / Query**
- regex
- JSONPath
- XPath
- JSON Schema

**Compare**
- text diff
- JSON/structured diff

**Web / API**
- URL parser
- query parameter editor
- UTM builder
- request builder
- headers/body/result viewer

**Code**
- isolated HTML/CSS/JS playground
- console/output

### Operation chaining

Support pipelines such as:

```text
Base64 Decode
    ↓
Gunzip
    ↓
UTF-8
    ↓
JSON Pretty
```

CyberChef/IT-Tools-style projects may be studied for behavior, but code reuse must follow the existing permissive-license policy.

---

## 4.10 Math & Science Lab

**Route:** `/tools/math/`

### Shared input

Expression/value plus mode-specific structured inputs.

### Actions

**Calculator**
- standard
- scientific
- percentages
- fractions

**Units**
- length
- area
- volume
- mass
- temperature
- speed
- pressure
- energy
- power
- data size

**Algebra**
- quadratics
- systems
- matrices

**Graph**
- functions
- value tables
- intersections where practical

**Geometry**
- triangles
- circles
- polygons
- 3D solids

**Physics**
- vectors
- kinematics
- forces
- energy
- momentum
- circular motion
- waves

**Chemistry**
- molar mass
- moles
- concentration
- dilution
- gas laws

**Electronics**
- Ohm's law
- resistor color codes
- voltage divider
- series/parallel circuits

**School**
- weighted grade
- GPA where appropriate
- required final score

### Likely engine

Use `math.js` where it clearly improves correctness/breadth, with focused custom calculators for domain-specific forms.

---

## 4.11 Random & Decision Lab

**Route:** `/tools/random/`

### Working object

A persistent list plus optional weights/seed.

### Actions

**Pick**
- random item
- weighted item

**Shuffle**
- list/order

**Teams**
- N teams
- team size
- randomized grouping

**Sample**
- with replacement
- without replacement

**Chance**
- coin
- dice
- percentage chance

**Numbers**
- range
- unique numbers
- batches

**Reproduce**
- seeded RNG

### Standalone handoff

```text
Want the full animated picker? → Open Wheel
```

Do not duplicate Wheel's richer UI, sharing, save system, or spin experience.

---

## 4.12 Codes & Generator Lab

**Route:** `/tools/codes/`

### Shared input

Text/URL/contact/event data feeding generators and scanners.

### Actions

**QR**
- URL
- text
- Wi-Fi
- email
- SMS
- vCard
- calendar event

**Barcode**
- Code 128
- EAN
- UPC
- Data Matrix where supported

**Scan**
- camera
- uploaded image

**Credentials**
- password
- passphrase
- secure token
- entropy display

**IDs**
- UUID
- GUID-style output where useful
- identifier batches

### Likely engines

- QR generation library with permissive license
- ZXing browser library for scanning/barcodes
- Web Crypto for secure randomness

---

## 4.13 Network & System Lab

**Route:** `/tools/network/`

### Working input

IP/CIDR, transfer values, display dimensions, or device/system context.

### Actions

**IPv4 / IPv6**
- CIDR
- subnet mask
- network
- broadcast where applicable
- host range
- private/public classification

**Data size**
- bits/bytes
- decimal vs binary KB/MB/GB/TB

**Transfer**
- bandwidth
- download/upload duration

**Media storage**
- bitrate × duration
- estimated file size

**Display**
- aspect ratio
- resolution scaling
- PPI
- physical dimensions

**Device capabilities**
- browser
- screen
- WebGPU availability
- supported codecs/APIs where detectable

Network-service features requiring external lookups should be deferred unless a reliable no-key endpoint adds clear value.

---

# 5. Global Search and Deep Links

The Toolbox index should show only 13 deep workspace cards, but search should index every action and alias.

Examples:

```text
merge pdf
→ PDF & Documents / Merge
→ /tools/pdf/?action=merge

base64
→ Developer Lab / Base64
→ /tools/developer/?action=base64

subnet
→ Network & System / Subnet
→ /tools/network/?action=subnet

remove duplicate rows
→ Data Studio / Deduplicate
→ /tools/data/?action=dedupe
```

Add `Ctrl/Cmd + K` command search after workspace/action registry behavior is stable.

Search ranking priority:

1. exact action title
2. exact alias
3. workspace title
4. action keyword
5. workspace keyword/description

Deep links must work under the GitHub Pages base path.

---

# 6. Cross-Tool Handoffs

Every workspace output should consider whether another Toolbox workspace is a natural next step.

Examples:

```text
PDF OCR → Open in Text Studio
PDF images → Open in Image Studio
Video audio extraction → Continue in Media Studio audio mode
CSV JSON export → Open in Developer Lab
File metadata table → Open in Data Studio
```

Use local temporary artifacts in IndexedDB rather than uploading or embedding huge payloads in URLs.

All handoffs must also offer a normal download/copy option. Cross-tool transfer should never trap the result inside Toolbox.

---

# 7. Dependency Strategy

Default order for every capability:

1. browser-native API
2. small permissive focused library
3. permissive WASM engine
4. custom code when small and testable
5. reference-only study of copyleft/open-source projects when direct reuse is undesirable

Rules:

- exact version/revision must be pinned
- heavy dependency must be lazy
- failures must remain feature-scoped
- existing basic functionality must continue if optional dependency loading fails
- update `tools/OPEN_SOURCE.md` in the same change that introduces the dependency

---

# 8. Concrete Execution Sequence

## Phase 1 — Shared workspace engine

Build and test:

- registry
- actions
- workspace state
- history
- local session state
- IndexedDB artifact handoff
- lazy loader
- file helpers
- worker helper
- reusable visual primitives
- global/deep-link mode opening

Do not add new public Toolbox cards until their primary flow works.

## Phase 2 — PDF reference implementation

Build PDF & Documents first because it exercises almost every shared concept:

- large file loading
- thumbnails
- selection
- contextual actions
- dialogs
- history
- undo/redo
- non-destructive state
- lazy engines
- progress
- export
- cross-tool handoff

Use PDF as the interaction reference for later Asset Workspaces.

## Phase 3 — Retrofit Image Studio

Move the existing Image Studio UI onto shared workspace components while preserving working image processing logic.

Add missing contextual actions and history incrementally.

## Phase 4 — File & Archive + Media

Implement File & Archive Lab, then Media Studio.

These reuse:

- DropZone
- SourceHeader
- selection state
- workers
- progress UI
- download/export
- metadata rendering

## Phase 5 — Data Studio

Add table-specific primitives and transformation history.

This phase should establish a reusable transformation-pipeline view.

## Phase 6 — Text Studio + Developer Lab

Create shared editor/output/pipeline primitives, then retrofit Text Studio and build Developer Lab.

## Phase 7 — Time & Scheduling + Money & Finance

Implement the Scenario Workspace shell and expand the existing tools without removing their current primary capabilities.

## Phase 8 — Math + Random + Codes + Network

These should be comparatively fast once the Input Workspace, registry, action dialogs, and output components exist.

## Phase 9 — Cross-tool artifacts

Wire all justified "Open in..." paths through IndexedDB artifacts with TTL cleanup.

## Phase 10 — Global command/search system

Add `Ctrl/Cmd + K`, nested action search, aliases, recent actions, and deep links.

## Phase 11 — Hardening

- full `node:test` regression
- Chromium + Firefox manual checks
- mobile widths approximately 360-430 px
- desktop wide layouts
- keyboard-only navigation
- reduced motion
- unsupported API paths
- corrupt local state
- dependency/CDN failure
- large-file behavior
- object URL/resource cleanup
- GitHub Pages relative/base paths
- attribution/license audit
- performance/lazy-load audit

---

# 9. Testing Strategy

Keep the existing lightweight Node test approach.

Run the complete suite with:

```bash
node --test tests/*.test.mjs
```

## Shared tests

Add tests for:

- registry contains all 13 in-scope workspaces
- Web & Design Lab is absent
- action search aliases
- exact action ranking
- deep-link parsing
- corrupt state fallback
- history undo/redo behavior
- artifact TTL/cleanup metadata
- lazy-loader deduplication

## Per-workspace tests

Each workspace needs pure-logic tests separate from DOM behavior where practical.

Examples:

PDF:
- page reorder
- delete selection
- rotation state
- split range parsing

Image:
- dimensions
- fit/fill
- crop state
- output naming

File:
- bulk rename preview
- collision handling
- checksum formatting

Media:
- trim range validation
- bitrate/file-size calculations

Data:
- type inference
- dedupe
- transform pipeline
- statistics fixtures

Developer:
- encoding round trips
- JSON/YAML/XML transforms
- regex handling

Time:
- DST boundaries
- timestamp conversions
- recurrence parsing

Money:
- interest/amortization fixtures
- current inflation/FX regression

Math:
- calculator/unit/science fixtures

Random:
- deterministic seeded RNG
- team sizing

Codes:
- secure token constraints
- QR payload serialization

Network:
- CIDR/network/broadcast/host fixtures
- transfer-size calculations

---

# 10. Performance and Privacy Requirements

- Initial Toolbox index must not load heavy workspace engines.
- Workspace initial load must not preload unrelated engines.
- OCR/model/WASM/database/media engines load only on first use.
- Use workers for expensive work where practical.
- Warn before unusually large jobs.
- Provide progress and cancellation when the engine supports it.
- Revoke object URLs and release temporary buffers.
- Do not persist large source files by default.
- IndexedDB temporary handoffs must expire automatically.
- Display local-processing/privacy state clearly.
- Network-dependent features must disclose what is fetched and must not upload user content without explicit design approval.

---

# 11. Completion Criteria

The expansion is complete when:

1. `/tools/` shows exactly the 13 in-scope deep workspaces plus any intentionally retained existing labeling.
2. Search can find individual actions even though those actions are not separate cards.
3. PDF demonstrates the full upload-once, contextual-icons, undo/redo, export workflow.
4. Asset workspaces retain source/state across multiple operations without unnecessary re-upload.
5. Input workspaces retain entered data while switching operations.
6. Scenario workspaces retain shared values while switching calculations/views.
7. Cross-tool handoffs stay local and have download/copy fallbacks.
8. Heavy dependencies are lazy-loaded and failures stay feature-scoped.
9. Every new external dependency is documented in `tools/OPEN_SOURCE.md`.
10. All deterministic tests pass with `node --test tests/*.test.mjs`.
11. Mobile, desktop, Firefox, Chromium, keyboard navigation, reduced-motion, and GitHub Pages path checks have been manually verified.
12. Existing Random Info Pages standalone routes remain unchanged and functional.

## Final target

The user should experience Toolbox as roughly **13 small desktop-class applications**, not a directory of micro-tools.

The same interaction logic should be recognizable everywhere:

```text
ONE SOURCE / ONE SCENARIO
          ↓
CONTEXTUAL ICON TOOLS
          ↓
PERSISTENT WORKING STATE
          ↓
UNDO / REDO / HISTORY
          ↓
DOWNLOAD / COPY / OPEN IN...
```
