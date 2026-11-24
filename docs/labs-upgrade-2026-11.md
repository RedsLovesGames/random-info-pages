# Random Info Pages: November 2026 labs upgrade

## Music Microscope spectral candidates

The existing analysis worker computes a bounded FFT window at several points of the resampled audio and looks for strong narrow spectral lines that recur across at least 80% of the windows. These are **candidates for examination**, not verified external hum or noise: held notes and instruments may also qualify. Click a candidate to set a single notch band; compare bypassed and filtered playback before exporting.

## Marble Sequencer multitrack MIDI workspace

Import MIDI to reveal the per-track editor. Track edits include semitone transpose, velocity scaling, onset shift, and nondestructive mute for playback. Note edits include absolute note number, start time, duration and velocity. The workspace tracks up to 50,000 notes over 64 track indices, and MIDI changes support 32 levels of undo/redo. JSON project download/import preserves editable note data and mute choices.

**Format 1 export limitation:** the existing parser normalizes imported notes into seconds and does not retain the original tempo-change events or controller automation. Export restores note timestamps and durations at a constant 120 BPM, with distinct track chunks, MIDI channels, and program-change events. It is not a byte-for-byte reconstruction of the original song.

## Compare Lab repeatable trial notebook

Two compatible projects can capture their current editable configuration. Restore that baseline, then run 5, 10, 15 or 30 second trials and export a JSON notebook of starting state, duration, before/after reported metrics, and timestamps. Import either a baseline or a previous notebook to restore two projects on a different device (provided the same project versions are available). On-demand capture is bounded to 2 MB and happens in the browser.

**Determinism limitation:** Fluid Dynamics state only saves user controls and selected preset. It does not capture the solver's full velocity, pressure or dye arrays, and the two projects do not share a single simulation clock. Adaptive quality, hardware, timers, input events, and browser scheduling may change outputs. Results represent reproducible initial settings and *approximately timed trials*, not guaranteed identical physics or frame-accurate benchmarks. Metrics are observational and not calibrated benchmarks.

## Fixed-step Fluid Dynamics comparisons

For two Fluid Dynamics panels, choose 30, 60 or 120 fixed solver steps. Each panel receives exactly that many `FluidTank.step()` updates from its restored initial preset with the same project version. The UI yields between batches of 10 steps to remain responsive and supports cancellation. Solver metrics report a compact hexadecimal fingerprint of velocity and RGB dye arrays, along with the actual simulation step count. This supports stronger reproducibility checks on one machine than a timed playback comparison.

The fingerprint is derived from Float32 bit representations and is not a guarantee of equality between engines, platforms, quality profiles, or devices. The starting configuration is restored from a preset, not a live raw-grid checkpoint.
