# Random Info Pages Toolbox Design

## Goal
Build a fast, ad-free, local-first toolbox inside Random Info Pages that replaces several cluttered single-purpose utility sites with a consistent interface. The first release contains a named time-zone board/slider, a browser-local image studio, a long-range inflation and currency calculator, and lightweight text utilities.

## Product principles
- Keep the existing Random Info Pages static GitHub Pages architecture.
- No account, backend, upload server, tracking, advertising, or mandatory API key.
- Prefer processing in the browser. User images must remain local to the device.
- Mobile and desktop must both be first-class.
- Match the current hyper-clean Random Info Pages visual language rather than cloning source-project UIs.
- Reuse mature open-source logic when its license permits it. Do not copy code merely because it is public.
- Record reused projects, licenses, and meaningful modifications in a toolbox attribution file.
- Every tool must remain directly addressable by a stable URL.

## Scope and routes
The toolbox lives at `/tools/` and acts as the index for the following tools:

1. `/tools/time/` - Time Zone Board
2. `/tools/image/` - Image Studio
3. `/tools/money/` - Money Through Time
4. `/tools/text/` - compact text utilities: word/character counter, case converter, and whitespace/line cleanup

The main Random Info Pages homepage adds Toolbox as a Tools entry without removing or changing the existing Wheel or When We Meet routes.

## Architecture
Use standalone static HTML/CSS/JavaScript modules consistent with the repository's current deployment model. Shared toolbox presentation code may live under `/tools/shared/`, but each tool must still load independently and fail independently.

No framework migration is part of this project. External libraries should be vendored or loaded in a way compatible with GitHub Pages. Heavy modules such as FFmpeg WASM and background-removal models should be lazy-loaded only when the user invokes the relevant operation.

LocalStorage is permitted for preferences, named clocks, recent settings, and other small state. Large image/video blobs must not be persisted by default.

## Open-source reuse policy
Before implementing each subsystem, inspect current upstream repositories, confirm the exact license at the commit/tag being used, and prefer this order:

1. permissively licensed implementation that can be adapted cleanly;
2. permissively licensed focused library/package;
3. fresh implementation against browser standards;
4. copyleft code only as behavioral/reference material unless its obligations are intentionally accepted for the affected deliverable.

Candidate sources to investigate include FFmpeg WASM for animated media processing, browser image codecs/canvas APIs for conversion and resizing, a browser-compatible background-removal implementation/model, mature IANA-time-zone helpers, and IT-Tools-style utility patterns as reference. Candidate names from the earlier research such as ZoneMap, Alatify, PicBrew/ImageToolkit, and Light Converter are not automatically approved for copying: repository identity, maintenance state, and license must be verified first.

Create `/tools/OPEN_SOURCE.md` containing repository URL, upstream revision/tag, license, files/logic reused, modifications, and required attribution for every incorporated source.

## Time Zone Board
### User experience
The page opens as a clean board of named clocks. A user can add a clock by entering a display name and selecting an IANA time zone. Each card shows the custom name, city/time-zone label, local time, date, UTC offset, and day difference relative to the reference clock.

A horizontal time slider lets the user move the reference instant backward or forward. Every clock updates simultaneously, making it easy to answer questions such as what 7 PM for one person means for everyone else. A Now control resets the reference instant to the current time.

### Persistence
Named clocks, ordering, 12/24-hour preference, and reference-zone preference persist locally. No PIN is required for local-only use. If the earlier "name and pin" idea is intended for cross-device private boards, that is explicitly deferred because a real PIN-backed shared board requires storage/authentication beyond static GitHub Pages.

### Correctness
Use IANA time-zone identifiers and `Intl.DateTimeFormat` or a well-maintained helper. Daylight-saving transitions must derive from the selected instant, not from a hard-coded offset. Invalid/obsolete zones should be rejected or mapped only through a documented alias.

## Image Studio
### Operations
One workspace supports:
- PNG/JPEG/WebP conversion where the browser codec supports it;
- resize by dimensions or percentage;
- aspect-ratio lock;
- quality/compression control for lossy outputs;
- crop/fit behavior;
- GIF creation from multiple still images;
- GIF/video-to-supported-output processing where FFmpeg WASM makes it practical;
- background removal using a browser-local model/implementation;
- preview, output size, and explicit save/download action.

### Privacy and performance
All image content stays in the browser. The UI must state this plainly. Decode and processing errors must not destroy the original selection. Heavy work should expose progress and cancellation where the underlying library supports it. FFmpeg/model code must not block initial page load.

Very large files should receive a warning before expensive processing. Object URLs and temporary buffers must be released when replaced or when the page unloads.

## Money Through Time
### Inflation
The primary inflation calculator supports U.S. dollars across the longest defensible annual historical series available from a reputable public source. Data provenance and coverage must be displayed. Do not fabricate years before the chosen source supports them.

The calculation converts an amount from a source year's price level into a target year's equivalent using the selected CPI/index values. Results show the multiplier, percentage price-level change, and equivalent amount.

### Currency conversion
A currency panel allows one amount to be converted into many currencies on one page. Current exchange rates must identify their source and effective date. Because GitHub Pages is static, current FX data may be fetched from a public endpoint at runtime; failure must degrade gracefully and must not break the historical inflation calculator.

Historical FX is not required for v1 unless a reliable no-key source can be incorporated without materially increasing complexity.

### Data handling
Version static historical inflation data in the repository with a source note and update date. Runtime FX responses may be cached locally for a short period and must visibly disclose when cached/stale data is being shown.

## Text utilities
`/tools/text/` contains intentionally small utilities rather than separate pages: live word/character/line counts, upper/lower/title/sentence case transforms, trim/collapse whitespace, remove blank lines, and line deduplication. Processing is entirely local and supports copy-to-clipboard.

## Toolbox index and visual design
`/tools/` is a compact launch surface rather than a marketing page. It should inherit the editorial, dark, high-contrast, highly typographic direction of the current Random Info Pages homepage while making utility controls more conventional and obvious.

Each tool gets a short description, privacy/data indicator, and direct route. Keyboard focus, labels, touch targets, reduced-motion behavior, and responsive layouts are required.

## Error handling
- Unsupported image formats: identify the unsupported input/output rather than failing silently.
- Image/model/FFmpeg load failure: keep basic conversion/resizing available when possible and show a scoped error for the unavailable feature.
- FX endpoint unavailable: use a clearly dated cached response if available; otherwise explain that live conversion is unavailable.
- Missing inflation data: disable impossible year pairs rather than extrapolating without evidence.
- Time-zone failure: retain the rest of the clock board and identify only the invalid clock.
- LocalStorage unavailable/corrupt: fall back to an in-memory/default state and permit the tool to continue.

## Testing and verification
Add deterministic repository tests/smoke checks for routes and critical static assets. Add focused JavaScript tests for pure calculation/transform logic where the current repository test harness supports them.

Required behavioral checks include:
- DST boundary conversion for at least one U.S. time zone;
- persisted clock-board state survives reload serialization/deserialization;
- image dimension/aspect calculations and invalid dimension rejection;
- inflation formula against known fixture index values;
- missing-year handling;
- FX stale-cache labeling logic;
- text transformation edge cases;
- every toolbox route and homepage link resolves under the GitHub Pages base path.

Before completion, run the repository's existing tests plus the new toolbox checks and inspect the deployed/static pages at mobile and desktop widths for overflow, clipping, inaccessible controls, and broken relative paths.

## Delivery order
1. Toolbox shell/index and shared primitives.
2. Time Zone Board.
3. Image Studio basic convert/resize/compress.
4. Image Studio GIF and background-removal enhancements.
5. Money Through Time inflation calculator.
6. Multi-currency conversion.
7. Text utilities.
8. Homepage integration, attribution documentation, full regression/deployment verification.

Each stage should leave the site usable and should not break existing Random Info Pages projects.

## Explicit non-goals for v1
- User accounts.
- Server-side image processing.
- Cloud file storage.
- PIN-authenticated cross-device clock boards.
- Building a general backend solely to support the toolbox.
- Replacing the existing Wheel or When We Meet tools.
- Migrating Random Info Pages to a JavaScript framework.
- Historical FX reconstruction unless a simple reliable source falls naturally out of implementation research.
