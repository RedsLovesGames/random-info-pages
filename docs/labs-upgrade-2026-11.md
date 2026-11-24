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
