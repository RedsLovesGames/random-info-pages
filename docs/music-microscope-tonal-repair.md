# Music Microscope: local tonal repair

The tonal repair panel targets **stable, narrowband noise**, for example a 50 Hz/60 Hz electrical hum, its integer harmonics, or a constant-pitch electronic whine. It is not broadband denoising. Microphone rumble, desk-borne vibration, bursts, fluctuating fans and broadband hiss generally require different techniques.

## User flow

1. Load an audio recording or generate the reference sample.
2. Play it and set the filter to 50 Hz or 60 Hz, or press **Pick from spectrum** and click a frequency in the live log-frequency spectrum. The click selects a target, not a verified noise source.
3. Start with 1–3 harmonics and Q between 12 and 25. Wider attenuation corresponds to lower Q; high Q is narrower. Toggle the filter to compare the original with the processed preview.
4. Select a region on the waveform if needed. Press **Export processed WAV** to create a local 16-bit PCM copy. The original WAV export button still exports the untouched original.
5. The existing low/high/bandpass experiment is separate; **Export processed WAV** applies only the tonal notch settings, not that other filter.

## Engineering and limits

Both paths use the same notch bands: target frequency and its successive integer multiples below 92% of Nyquist. The live path uses Web Audio BiquadFilterNodes. Export uses mathematically corresponding RBJ notch biquads in a module Worker. A 250 ms pre-roll warms the offline filter if the selected region starts after zero. Each channel has independent states. The offline result is encoded with the existing PCM16 WAV serializer.

The original decoded AudioBuffer is never changed. Selected samples are copied into transferable Float32Arrays before the Worker receives them. Input validation limits work to 10 million frames, 1–2 channels, at most 6 bands, and a 90-second processing timeout; the existing import and WAV export limits also apply. The processing stays in the browser with no network requests. The audio spectrum view is tapped *before* the notches and remains an analysis of the source rather than proof of cleaned output. Output may differ slightly from preview because the browser Biquad implementation and offline float math can differ.

This is a subtractive tool: it can remove parts of musical notes if the frequencies overlap. Try short regions and listen A/B before exporting. No automatic claim of noise identification or professional-grade restoration is made.
