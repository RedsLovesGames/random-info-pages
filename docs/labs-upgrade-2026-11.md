# Random Info Pages: November 2026 labs upgrade

## Music Microscope spectral candidates

The existing analysis worker computes a bounded FFT window at several points of the resampled audio and looks for strong narrow spectral lines that recur across at least 80% of the windows. These are **candidates for examination**, not verified external hum or noise: held notes and instruments may also qualify. Click a candidate to set a single notch band; compare bypassed and filtered playback before exporting.

## Marble Sequencer multitrack MIDI workspace

Import MIDI to reveal the per-track editor. Track edits include semitone transpose, velocity scaling, onset shift, and nondestructive mute for playback. Note edits include absolute note number, start time, duration and velocity. The workspace tracks up to 50,000 notes over 64 track indices, and MIDI changes support 32 levels of undo/redo. JSON project download/import preserves editable note data and mute choices.

**Format 1 export behavior:** PPQ-timed format 0/1 MIDI files retain their imported tempo changes when notes are exported. The editor maps edited start/end seconds back into ticks across those tempo changes. SMPTE-encoded sources, format 2 sequences, and legacy JSON without timing metadata use a fixed 120 BPM map. Track separation, MIDI channels, and program changes are retained. Arbitrary controller automation, aftertouch, expressive bends, and original track labels are not fully round-tripped. It is not a byte-for-byte reconstruction of the input.

## Compare Lab repeatable trial notebook

Two compatible projects can capture their current editable configuration. Restore that baseline, then run 5, 10, 15 or 30 second trials and export a JSON notebook of starting state, duration, before/after reported metrics, and timestamps. Import either a baseline or a previous notebook to restore two projects on a different device (provided the same project versions are available). On-demand capture is bounded to 2 MB and happens in the browser.

**Determinism limitation:** Fluid Dynamics state only saves user controls and selected preset. It does not capture the solver's full velocity, pressure or dye arrays, and the two projects do not share a single simulation clock. Adaptive quality, hardware, timers, input events, and browser scheduling may change outputs. Results represent reproducible initial settings and *approximately timed trials*, not guaranteed identical physics or frame-accurate benchmarks. Metrics are observational and not calibrated benchmarks.

## Fixed-step Fluid Dynamics comparisons

For two Fluid Dynamics panels, choose 30, 60 or 120 fixed solver steps. Each panel receives exactly that many `FluidTank.step()` updates from its restored initial preset with the same project version. The UI yields between batches of 10 steps to remain responsive and supports cancellation. Solver metrics report a compact hexadecimal fingerprint of velocity and RGB dye arrays, along with the actual simulation step count. This supports stronger reproducibility checks on one machine than a timed playback comparison.

The fingerprint is derived from Float32 bit representations and is not a guarantee of equality between engines, platforms, quality profiles, or devices. The starting configuration is restored from a preset, not a live raw-grid checkpoint.

## Visual piano-roll editing (November 24)

A responsive canvas editor shows a single selected MIDI track at a time, with pitch rows and a seconds ruler. Click a note to select it and edit numeric fields below; drag its body to change pitch and onset, or drag the trailing edge to resize duration. Changes are snapped to selectable 50, 125, 250 or 500 ms, one second, or unsnapped 1 ms. Each drag enters the existing 32-step MIDI undo history as one action. The track selector, note dropdown, numeric fields, and undo/redo remain keyboard-operable alternatives. Note IDs persist in editable JSON so selection remains stable after changing note start times and resorting events.

The renderer displays a bounded time/pitch viewport, not every note in a large source at once; choose a wider time window, pitch floor, or timeline scrollbar to see other sections.

## Trial notebook metrics and CSV export

Compare Lab now shows each completed trial's reported metrics separately for the left and right projects, along with an explicit matching/different/unavailable label for solver-state signatures. Its summary reports how many trials have comparable signatures and how many match. Results can be exported as a UTF-8 CSV for spreadsheet analysis, with before/after metrics, elapsed times, and fixed-step counts. CSV formula-like strings are escaped to reduce spreadsheet injection risk. The original JSON notebook and baseline import remain available. Clearing trial results does not remove the captured baseline.

### Piano-roll interaction safeguards

The canvas ignores pointer movement smaller than 5 CSS pixels so selecting an off-grid MIDI note does not inadvertently snap its start time. Deliberate drags show a continuously updated note, onset and duration before release. With the piano-roll canvas focused, Up/Down arrow keys move the selected note by one semitone, Left/Right move its onset by the active snap interval (10 ms when snap is off), and Shift+Left/Right resize its duration. The original numeric controls remain an alternative for keyboard and screen-reader use.

## Reliability phase: local MIDI recovery and complete notebook imports

Marble Sequencer automatically saves the latest MIDI workspace into **IndexedDB on the current device and browser** (with a localStorage fallback if IndexedDB is missing). Saving is debounced after edits; undo and redo also save, and tab visibility changes trigger another save attempt. On revisit, a clearly labeled recovery prompt offers **Restore saved draft** or **Discard recovery copy**; it never silently replaces the currently open song. The recovery slot contains MIDI events, track mute choices, source tempo metadata and stable note IDs, not original uploaded audio or arbitrary private files. Downloads of editable JSON remain available and are recommended for transfers or backups. Incognito/private mode, storage eviction, disk quota or browser restrictions can prevent recovery; the UI reports write failures and offers manual JSON download. One latest recovery slot is maintained, not a history of past projects.

Compare Lab `rip-compare-notebook-v1` import now restores **both the baseline and the recorded trial results** after the two target projects successfully restore their configurations. Old `rip-compare-scenario-v1` baselines remain importable. Imported trial metrics, dates, modes and numeric limits are validated before any active project is changed. Up to 500 trials and an 8 MB notebook are supported. Failed validation leaves the current workspace unchanged. CSV and JSON exports retain the same public filenames and formats.

### Live-browser verification

The independent <https://redslovesgames.github.io/random-info-pages/tests/browser-reliability.html> fixture exercises real browser IndexedDB persistence, MIDI note editing math, variable-tempo MIDI file export/import, and Compare Lab notebook compatibility. The fixture uses `rip-reliability-test` instead of the app's production draft database, so it never reads, changes, or deletes a user's saved MIDI work. For reload persistence, save the probe, refresh the page, then verify it. Automated Node tests remain part of GitHub Actions; a live-browser run supplements them, it does not substitute for cross-browser or mobile regression coverage.

### Automated real-browser acceptance

The GitHub Pages workflow now runs `scripts/browser-reliability.cjs` using headless Chromium and Playwright against the actual assembled `_site`, before uploading it. It tests five browser-only module assertions, IndexedDB persistence across a page reload, a synthetic MIDI file imported into Marble Sequencer followed by autosave and recovery, and Compare Lab restoration of notebook trial history with both Fluid Dynamics panels present. If these acceptance tests fail, the production artifact is not uploaded. It uses synthetic, isolated test data and cannot modify user projects.
