import { computeSpectrogram, detectOnsets, estimateTempo, prominentFrequency } from './analysis.mjs';

self.addEventListener('message', event => {
  const { id, channels, sampleRate } = event.data;
  try {
    const factor = Math.max(1, Math.ceil(sampleRate / 12000));
    const length = Math.ceil((channels[0]?.length || 0) / factor);
    const samples = new Float32Array(length);
    for (let index = 0; index < length; index += 1) {
      const start = index * factor, end = Math.min(channels[0].length, start + factor);
      let sum = 0, count = 0;
      for (const channel of channels) for (let frame = start; frame < end; frame += 1) { sum += channel[frame]; count += 1; }
      samples[index] = count ? sum / count : 0;
    }
    const analysisRate = sampleRate / factor;
    self.postMessage({ id, progress: 'Building a time-frequency map…' });
    const spectrogram = computeSpectrogram(samples, analysisRate, { fftSize: 1024, hop: 384, maxFrames: 2200 });
    const onsets = detectOnsets(samples, analysisRate);
    const tempo = estimateTempo(onsets);
    const frequency = prominentFrequency(samples, analysisRate);
    self.postMessage({ id, spectrogram, onsets, tempo, frequency, analysisRate }, [spectrogram.pixels.buffer]);
  } catch (error) {
    self.postMessage({ id, error: error instanceof Error ? error.message : 'Analysis failed.' });
  }
});
