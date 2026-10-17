import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_AUDIO_BYTES, MAX_DECODED_AUDIO_BYTES, MAX_DURATION_SECONDS, bandLevels, computeSpectrogram,
  detectOnsets, estimateTempo, fftMagnitudes, filterSpec, frequencyToNote,
  measureWindow, prominentFrequency, selectionBounds, validateAudioInput,
  waveformPeaks, estimateDecodedAudioBytes, parseAudioHeader
} from '../music-microscope/analysis.mjs';

function sine(frequency, sampleRate = 48_000, seconds = 1, amplitude = 0.7) {
  return Float32Array.from({ length: Math.floor(sampleRate * seconds) }, (_, index) => amplitude * Math.sin(2 * Math.PI * frequency * index / sampleRate));
}

test('local audio inputs respect size, duration and channel limits', () => {
  assert.equal(validateAudioInput({ bytes: 1, duration: 180, channels: 8 }), true);
  assert.equal(MAX_AUDIO_BYTES, 60 * 1024 * 1024);
  assert.equal(MAX_DECODED_AUDIO_BYTES, 32 * 1024 * 1024);
  assert.equal(MAX_DURATION_SECONDS, 180);
  assert.throws(() => validateAudioInput({ bytes: 0 }), /non-empty/);
  assert.throws(() => validateAudioInput({ bytes: MAX_AUDIO_BYTES + 1 }), /60 MB/);
  assert.throws(() => validateAudioInput({ bytes: 1, duration: 180.01 }), /three minutes/);
  assert.throws(() => validateAudioInput({ bytes: 1, channels: 9 }), /eight channels/);
  assert.throws(() => validateAudioInput({ bytes: 1, decodedBytes: MAX_DECODED_AUDIO_BYTES + 1 }), /32 MB/);
  assert.equal(estimateDecodedAudioBytes(10, 48_000, 2), 4_992_000);
  assert.throws(() => estimateDecodedAudioBytes(0, 48_000, 2), /safely/);
});

test('audio metadata headers expose channel counts before full decoding', () => {
  const wav = new Uint8Array(44), view = new DataView(wav.buffer);
  const text = (offset, value) => [...value].forEach((character, index) => { wav[offset + index] = character.charCodeAt(0); });
  text(0, 'RIFF'); view.setUint32(4, 36, true); text(8, 'WAVE'); text(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 2, true);
  view.setUint32(24, 44_100, true); view.setUint32(28, 176_400, true); view.setUint16(32, 4, true); view.setUint16(34, 16, true);
  text(36, 'data'); view.setUint32(40, 0, true);
  assert.deepEqual(parseAudioHeader(wav, 'wav'), { channels: 2, sampleRate: 44_100 });
  assert.deepEqual(parseAudioHeader(new Uint8Array([0xff, 0xfb, 0x90, 0x64]), 'mp3'), { channels: 2, sampleRate: 44_100 });
  const webmHeader = Uint8Array.from([
    0x1a, 0x45, 0xdf, 0xa3, 0x80,
    0x18, 0x53, 0x80, 0x67, 0xff,
    0x16, 0x54, 0xae, 0x6b, 0x90,
    0xae, 0x8e, 0x83, 0x81, 0x02, 0xe1, 0x89,
    0x9f, 0x81, 0x02, 0xb5, 0x84, 0x47, 0x3b, 0x80, 0x00
  ]);
  assert.deepEqual(parseAudioHeader(webmHeader, 'webm'), { channels: 2, sampleRate: 48_000 });
  assert.equal(parseAudioHeader(new Uint8Array([1, 2, 3, 4]), 'unknown'), null);
});

test('FFT and prominent-frequency analysis find a known sine tone', () => {
  const samples = sine(440, 48_000, 0.25);
  const spectrum = fftMagnitudes(samples, 0, 4096);
  const peakBin = spectrum.indexOf(Math.max(...spectrum));
  const peakHz = peakBin * 48_000 / 4096;
  assert.ok(Math.abs(peakHz - 440) < 12, `${peakHz} Hz`);
  const prominent = prominentFrequency(samples, 48_000);
  assert.ok(Math.abs(prominent.frequency - 440) < 2, `${prominent.frequency} Hz`);
  assert.equal(prominent.note, 'A4');
  assert.equal(frequencyToNote(0), null);
  assert.throws(() => fftMagnitudes(samples, 0, 3000), /power of two/);
});

test('waveform buckets, peak and RMS agree with controlled samples', () => {
  const samples = Float32Array.from([-1, -0.5, 0.25, 1, 0, 0.5, -0.5, 0]);
  assert.deepEqual([...waveformPeaks(samples, 4)], [-1, -0.5, 0.25, 1, 0, 0.5, -0.5, 0]);
  const measure = measureWindow(samples, 8, 0.125, 0.5);
  assert.equal(measure.start, 1);
  assert.equal(measure.end, 4);
  assert.equal(measure.peak, 1);
  assert.ok(Math.abs(measure.rms - Math.sqrt((0.25 + 0.0625 + 1) / 3)) < 1e-12);
  assert.equal(measureWindow(samples, 8, 2, 3).samples, 0);
});

test('selection bounds clamp, normalize direction and preserve a useful minimum', () => {
  assert.deepEqual(selectionBounds(0.8, 0.2, 2), { start: 0.2, end: 0.8 });
  assert.deepEqual(selectionBounds(-2, -2, 2), { start: 0, end: 0.02 });
  assert.deepEqual(selectionBounds(1.99, 1.99, 2), { start: 1.98, end: 2 });
  assert.throws(() => selectionBounds(0, 1, 0), /Duration/);
});

test('native filter parameters stay in the valid Nyquist range', () => {
  assert.deepEqual(filterSpec('lowpass', 18_000, 0.7, 48_000), { type: 'lowpass', frequency: 18_000, q: 0.7 });
  assert.deepEqual(filterSpec('highpass', 99_000, 50, 48_000), { type: 'highpass', frequency: 22_800, q: 20 });
  assert.equal(filterSpec('bandpass', 1, -1, 44_100).frequency, 20);
  assert.throws(() => filterSpec('not-a-filter', 200, 1, 48_000), /Choose/);
});

test('spectrogram, onset and tempo estimators produce bounded evidence from synthetic audio', () => {
  const tone = sine(1000, 16_000, 2, 0.5);
  const spectrogram = computeSpectrogram(tone, 16_000, { fftSize: 512, hop: 128, maxFrames: 120 });
  assert.ok(spectrogram.frames <= 120);
  assert.equal(spectrogram.bins, 257);
  assert.equal(spectrogram.pixels.length, spectrogram.frames * spectrogram.bins);
  assert.ok(spectrogram.pixels.some(value => value > 180));

  const sampleRate = 16_000;
  const pulseTrain = new Float32Array(sampleRate * 5);
  for (let time = 0.1; time < 4.6; time += 0.5) {
    const start = Math.floor(time * sampleRate);
    for (let i = 0; i < 1200; i += 1) pulseTrain[start + i] = 0.8 * Math.exp(-i / 190) * Math.sin(2 * Math.PI * 900 * i / sampleRate);
  }
  const onsets = detectOnsets(pulseTrain, sampleRate);
  assert.ok(onsets.length >= 6, `detected ${onsets.length} attacks`);
  const tempo = estimateTempo(onsets);
  assert.ok(tempo.candidates.some(candidate => Math.abs(candidate.bpm - 120) <= 3));
  assert.ok(tempo.confidence > 0 && tempo.confidence <= 1);
  assert.deepEqual(estimateTempo([]).candidates, []);
});

test('frequency bands expose distinct ranges from FFT magnitudes', () => {
  const samples = sine(440, 44_100, 0.2);
  const magnitudes = fftMagnitudes(samples, 0, 2048);
  const levels = bandLevels(Uint8Array.from(magnitudes, value => Math.min(255, Math.round(value * 255))), 44_100, 2048);
  assert.deepEqual(levels.map(level => level.name), ['Sub', 'Bass', 'Low-mid', 'Mid', 'High-mid', 'Air']);
  assert.ok(levels[2].level > levels[0].level);
});
