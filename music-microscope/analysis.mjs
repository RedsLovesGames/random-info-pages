export const MAX_AUDIO_BYTES = 60 * 1024 * 1024;
export const MAX_DECODED_AUDIO_BYTES = 32 * 1024 * 1024;
export const MAX_DURATION_SECONDS = 180;
export const MAX_ANALYSIS_SAMPLES = 2_500_000;

export function validateAudioInput({ bytes, duration = 0, channels = 0, decodedBytes = 0 }) {
  if (!Number.isFinite(bytes) || bytes <= 0) throw new RangeError('Choose a non-empty audio file.');
  if (bytes > MAX_AUDIO_BYTES) throw new RangeError('This file is over the 60 MB local-analysis limit. Try a shorter or smaller file.');
  if (duration > MAX_DURATION_SECONDS) throw new RangeError('This file is longer than three minutes. Shorten it before importing.');
  if (channels > 8) throw new RangeError('Files with more than eight channels are not supported here.');
  if (decodedBytes > MAX_DECODED_AUDIO_BYTES) throw new RangeError('Decoded audio would use more than 32 MB of memory. Try a shorter recording.');
  return true;
}

const bytesText = (bytes, start, length) => String.fromCharCode(...bytes.subarray(start, start + length));
const viewOf = bytes => new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

function parseWaveHeader(bytes) {
  const view = viewOf(bytes), bigEndian = bytesText(bytes, 0, 4) === 'RIFX';
  if ((!bigEndian && bytesText(bytes, 0, 4) !== 'RIFF') || bytesText(bytes, 8, 4) !== 'WAVE') return null;
  const read16 = offset => view.getUint16(offset, !bigEndian), read32 = offset => view.getUint32(offset, !bigEndian);
  const end = Math.min(bytes.length, read32(4) + 8);
  for (let offset = 12; offset + 8 <= end;) {
    const size = read32(offset + 4), payload = offset + 8;
    if (bytesText(bytes, offset, 4) === 'fmt ' && size >= 16 && payload + 16 <= end) {
      const channels = read16(payload + 2), sampleRate = read32(payload + 4);
      return channels > 0 && sampleRate > 0 ? { channels, sampleRate } : null;
    }
    if (size > end - payload) break;
    offset = payload + size + (size & 1);
  }
  return null;
}

function extendedFloat80(bytes, offset) {
  const view = viewOf(bytes), sign = view.getUint8(offset) & 0x80 ? -1 : 1;
  const exponent = ((view.getUint8(offset) & 0x7f) << 8) | view.getUint8(offset + 1);
  let mantissa = 0;
  for (let index = 0; index < 8; index += 1) mantissa = mantissa * 256 + view.getUint8(offset + 2 + index);
  return exponent ? sign * mantissa / 2 ** 63 * 2 ** (exponent - 16383) : 0;
}

function parseAiffHeader(bytes) {
  if (bytesText(bytes, 0, 4) !== 'FORM' || !['AIFF', 'AIFC'].includes(bytesText(bytes, 8, 4))) return null;
  const view = viewOf(bytes), end = Math.min(bytes.length, view.getUint32(4, false) + 8);
  for (let offset = 12; offset + 8 <= end;) {
    const size = view.getUint32(offset + 4, false), payload = offset + 8;
    if (bytesText(bytes, offset, 4) === 'COMM' && size >= 18 && payload + 18 <= end) {
      const channels = view.getUint16(payload, false), sampleRate = Math.round(extendedFloat80(bytes, payload + 8));
      return channels > 0 && sampleRate > 0 ? { channels, sampleRate } : null;
    }
    if (size > end - payload) break;
    offset = payload + size + (size & 1);
  }
  return null;
}

function parseFlacHeader(bytes) {
  if (bytesText(bytes, 0, 4) !== 'fLaC') return null;
  const view = viewOf(bytes);
  for (let offset = 4; offset + 4 <= bytes.length;) {
    const header = view.getUint8(offset), type = header & 0x7f;
    const size = (view.getUint8(offset + 1) << 16) | (view.getUint8(offset + 2) << 8) | view.getUint8(offset + 3);
    const payload = offset + 4;
    if (type === 0 && size === 34 && payload + size <= bytes.length) {
      const sampleRate = (view.getUint8(payload + 10) << 12) | (view.getUint8(payload + 11) << 4) | (view.getUint8(payload + 12) >> 4);
      const channels = ((view.getUint8(payload + 12) >> 1) & 7) + 1;
      return sampleRate > 0 ? { channels, sampleRate } : null;
    }
    if (size > bytes.length - payload) break;
    offset = payload + size;
    if (header & 0x80) break;
  }
  return null;
}

function parseOggHeader(bytes) {
  if (bytesText(bytes, 0, 4) !== 'OggS') return null;
  const search = (needle, from = 0) => {
    outer: for (let index = from; index + needle.length <= bytes.length; index += 1) {
      for (let offset = 0; offset < needle.length; offset += 1) if (bytes[index + offset] !== needle.charCodeAt(offset)) continue outer;
      return index;
    }
    return -1;
  };
  const opus = search('OpusHead');
  if (opus >= 0 && opus + 10 <= bytes.length) {
    const channels = bytes[opus + 9];
    return channels > 0 ? { channels, sampleRate: 48_000 } : null;
  }
  const vorbis = search('vorbis');
  if (vorbis >= 1 && vorbis + 15 <= bytes.length && bytes[vorbis - 1] === 1) {
    const view = viewOf(bytes), channels = bytes[vorbis + 10], sampleRate = view.getUint32(vorbis + 11, true);
    return channels > 0 && sampleRate > 0 ? { channels, sampleRate } : null;
  }
  return null;
}

function parseMp3Header(bytes) {
  const view = viewOf(bytes);
  let start = bytesText(bytes, 0, 3) === 'ID3' && bytes.length >= 10
    ? 10 + ((bytes[6] & 0x7f) << 21) + ((bytes[7] & 0x7f) << 14) + ((bytes[8] & 0x7f) << 7) + (bytes[9] & 0x7f) + ((bytes[5] & 0x10) ? 10 : 0)
    : 0;
  const limit = Math.min(bytes.length - 4, 65_536);
  for (let offset = start; offset <= limit; offset += 1) {
    if (bytes[offset] !== 0xff || (bytes[offset + 1] & 0xe0) !== 0xe0) continue;
    const version = (bytes[offset + 1] >> 3) & 3, layer = (bytes[offset + 1] >> 1) & 3;
    const rateIndex = (bytes[offset + 2] >> 2) & 3, channelMode = bytes[offset + 3] >> 6;
    if (version === 1 || layer === 0 || rateIndex === 3) continue;
    const base = [44_100, 48_000, 32_000][rateIndex];
    const sampleRate = version === 3 ? base : version === 2 ? base / 2 : base / 4;
    return { channels: channelMode === 3 ? 1 : 2, sampleRate };
  }
  return null;
}

function parseAacHeader(bytes) {
  const view = viewOf(bytes), rates = [96_000, 88_200, 64_000, 48_000, 44_100, 32_000, 24_000, 22_050, 16_000, 12_000, 11_025, 8_000, 7_350];
  const limit = Math.min(bytes.length - 7, 65_536);
  for (let offset = 0; offset <= limit; offset += 1) {
    if (bytes[offset] !== 0xff || (bytes[offset + 1] & 0xf6) !== 0xf0) continue;
    const rateIndex = (bytes[offset + 2] >> 2) & 15;
    const configuration = ((bytes[offset + 2] & 1) << 2) | (bytes[offset + 3] >> 6);
    if (!rates[rateIndex] || !configuration) continue;
    const channels = [0, 1, 2, 3, 4, 5, 6, 8][configuration] || 0;
    if (channels) return { channels, sampleRate: rates[rateIndex] };
  }
  return null;
}

function mp4Boxes(bytes, start, end) {
  const view = viewOf(bytes), boxes = [];
  for (let offset = start; offset + 8 <= end;) {
    let size = view.getUint32(offset, false), header = 8;
    const type = bytesText(bytes, offset + 4, 4);
    if (size === 1) {
      if (offset + 16 > end) break;
      const extended = view.getBigUint64(offset + 8, false);
      if (extended > BigInt(Number.MAX_SAFE_INTEGER)) break;
      size = Number(extended); header = 16;
    } else if (size === 0) size = end - offset;
    if (size < header || size > end - offset) break;
    boxes.push({ type, start: offset, payload: offset + header, end: offset + size });
    offset += size;
  }
  return boxes;
}

function parseMp4Header(bytes) {
  const top = mp4Boxes(bytes, 0, bytes.length);
  let moov = top.find(box => box.type === 'moov');
  if (!moov) {
    for (let index = 4; index + 4 <= bytes.length; index += 1) {
      if (bytesText(bytes, index, 4) !== 'moov') continue;
      const start = index - 4, size = viewOf(bytes).getUint32(start, false);
      if (size >= 8 && size <= bytes.length - start) { moov = { type: 'moov', start, payload: start + 8, end: start + size }; break; }
    }
  }
  if (!moov) return null;
  const moovChildren = mp4Boxes(bytes, moov.payload, moov.end);
  for (const track of moovChildren.filter(box => box.type === 'trak')) {
    const mdia = mp4Boxes(bytes, track.payload, track.end).find(box => box.type === 'mdia');
    if (!mdia) continue;
    const mdiaChildren = mp4Boxes(bytes, mdia.payload, mdia.end);
    const handler = mdiaChildren.find(box => box.type === 'hdlr');
    if (!handler || bytesText(bytes, handler.payload + 8, 4) !== 'soun') continue;
    const minf = mdiaChildren.find(box => box.type === 'minf');
    const stbl = minf && mp4Boxes(bytes, minf.payload, minf.end).find(box => box.type === 'stbl');
    const stsd = stbl && mp4Boxes(bytes, stbl.payload, stbl.end).find(box => box.type === 'stsd');
    if (!stsd || stsd.payload + 8 > stsd.end) continue;
    const entries = mp4Boxes(bytes, stsd.payload + 8, stsd.end);
    const audio = entries.find(box => ['mp4a', 'alac', 'Opus', 'lpcm', 'sowt', 'twos', 'in24', 'fl32', 'fl64', 'ulaw', 'alaw'].includes(box.type));
    if (!audio || audio.start + 36 > audio.end) continue;
    const view = viewOf(bytes), channels = view.getUint16(audio.start + 24, false), sampleRate = view.getUint32(audio.start + 32, false) >>> 16;
    if (channels > 0 && sampleRate > 0) return { channels, sampleRate };
  }
  return null;
}

function ebmlVint(bytes, offset, retainMarker = false) {
  if (offset >= bytes.length) return null;
  const first = bytes[offset];
  let length = 1, mask = 0x80;
  while (length <= 8 && !(first & mask)) { length += 1; mask >>= 1; }
  if (length > 8 || offset + length > bytes.length) return null;
  let value = retainMarker ? first : first & (mask - 1);
  for (let index = 1; index < length; index += 1) value = value * 256 + bytes[offset + index];
  const unknown = !retainMarker && value === 2 ** (7 * length) - 1;
  return { value, length, unknown };
}

function parseWebmHeader(bytes) {
  if (bytesText(bytes, 0, 4) !== '\x1aE\xdf\xa3') return null;
  const elements = (start, end) => {
    const result = [];
    for (let offset = start; offset < end;) {
      const id = ebmlVint(bytes, offset, true), size = id && ebmlVint(bytes, offset + id.length);
      if (!id || !size) break;
      const payload = offset + id.length + size.length;
      const elementEnd = size.unknown || id.value === 0x18538067 ? end : payload + size.value;
      if (elementEnd > end || elementEnd < payload) break;
      result.push({ id: id.value, payload, end: elementEnd });
      if (size.unknown) break;
      offset = elementEnd;
    }
    return result;
  };
  const segment = elements(0, bytes.length).find(item => item.id === 0x18538067);
  if (!segment) return null;
  const tracks = elements(segment.payload, segment.end).find(item => item.id === 0x1654ae6b);
  if (!tracks) return null;
  const view = viewOf(bytes);
  for (const entry of elements(tracks.payload, tracks.end).filter(item => item.id === 0xae)) {
    const fields = elements(entry.payload, entry.end), type = fields.find(item => item.id === 0x83);
    if (!type || type.end - type.payload !== 1 || view.getUint8(type.payload) !== 2) continue;
    const audio = fields.find(item => item.id === 0xe1);
    if (!audio) continue;
    const settings = elements(audio.payload, audio.end), channelField = settings.find(item => item.id === 0x9f);
    const channels = channelField ? readEbmlUnsigned(view, channelField) : 1;
    const rateField = settings.find(item => item.id === 0xb5);
    const sampleRate = rateField && [4, 8].includes(rateField.end - rateField.payload)
      ? rateField.end - rateField.payload === 4 ? view.getFloat32(rateField.payload, false) : view.getFloat64(rateField.payload, false)
      : 48_000;
    if (channels > 0 && Number.isFinite(sampleRate) && sampleRate > 0) return { channels, sampleRate };
  }
  return null;
}

function readEbmlUnsigned(view, element) {
  const length = element.end - element.payload;
  if (length < 1 || length > 4) return 0;
  let value = 0;
  for (let index = 0; index < length; index += 1) value = value * 256 + view.getUint8(element.payload + index);
  return value;
}

export function parseAudioHeader(input, format = '') {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  const extension = String(format).toLowerCase().replace(/^.*\./, '').replace(/^audio\//, '');
  return parseWaveHeader(bytes) || parseAiffHeader(bytes) || parseFlacHeader(bytes) || parseOggHeader(bytes)
    || parseWebmHeader(bytes) || (['mp3', 'mpeg'].includes(extension) ? parseMp3Header(bytes) : null)
    || (['aac'].includes(extension) ? parseAacHeader(bytes) : null)
    || (['m4a', 'mp4', 'm4b', 'mp4a'].includes(extension) ? parseMp4Header(bytes) : null)
    || parseMp3Header(bytes) || parseAacHeader(bytes) || parseMp4Header(bytes);
}

export function estimateDecodedAudioBytes(duration, sampleRate, channels) {
  if (![duration, sampleRate, channels].every(Number.isFinite) || duration <= 0 || sampleRate <= 0 || channels < 1) {
    throw new RangeError('Audio dimensions cannot be estimated safely.');
  }
  return Math.ceil((duration + 3) * sampleRate * channels * 4);
}

export function waveformPeaks(samples, buckets = 1200) {
  buckets = Math.max(1, Math.min(samples.length || 1, Math.floor(buckets)));
  const result = new Float32Array(buckets * 2);
  for (let bucket = 0; bucket < buckets; bucket += 1) {
    const start = Math.floor(bucket * samples.length / buckets);
    const end = Math.max(start + 1, Math.floor((bucket + 1) * samples.length / buckets));
    let min = 1, max = -1;
    for (let i = start; i < Math.min(end, samples.length); i += 1) { min = Math.min(min, samples[i]); max = Math.max(max, samples[i]); }
    result[bucket * 2] = samples.length ? min : 0;
    result[bucket * 2 + 1] = samples.length ? max : 0;
  }
  return result;
}

export function fftMagnitudes(samples, start = 0, size = 2048) {
  if (!Number.isInteger(size) || size < 8 || (size & (size - 1)) !== 0) throw new RangeError('FFT size must be a power of two of at least 8.');
  const real = new Float64Array(size), imaginary = new Float64Array(size);
  for (let i = 0; i < size; i += 1) {
    const sample = samples[start + i] || 0;
    const window = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (size - 1));
    real[i] = sample * window;
  }
  for (let i = 1, j = 0; i < size; i += 1) {
    let bit = size >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [real[i], real[j]] = [real[j], real[i]]; [imaginary[i], imaginary[j]] = [imaginary[j], imaginary[i]]; }
  }
  for (let length = 2; length <= size; length <<= 1) {
    const angle = -2 * Math.PI / length, half = length >> 1;
    for (let offset = 0; offset < size; offset += length) {
      for (let j = 0; j < half; j += 1) {
        const cos = Math.cos(angle * j), sin = Math.sin(angle * j);
        const even = offset + j, odd = even + half;
        const tre = real[odd] * cos - imaginary[odd] * sin;
        const tim = real[odd] * sin + imaginary[odd] * cos;
        real[odd] = real[even] - tre; imaginary[odd] = imaginary[even] - tim;
        real[even] += tre; imaginary[even] += tim;
      }
    }
  }
  const bins = new Float32Array(size / 2 + 1);
  for (let i = 0; i < bins.length; i += 1) bins[i] = Math.hypot(real[i], imaginary[i]) * 2 / size;
  return bins;
}

export function measureWindow(samples, sampleRate, startSeconds = 0, endSeconds = samples.length / sampleRate) {
  const start = Math.max(0, Math.min(samples.length, Math.floor(startSeconds * sampleRate)));
  const end = Math.max(start, Math.min(samples.length, Math.ceil(endSeconds * sampleRate)));
  if (end <= start) return { start, end, samples: 0, peak: 0, rms: 0, duration: 0 };
  let peak = 0, squareSum = 0;
  for (let i = start; i < end; i += 1) { const value = samples[i]; peak = Math.max(peak, Math.abs(value)); squareSum += value * value; }
  return { start, end, samples: end - start, peak, rms: Math.sqrt(squareSum / (end - start)), duration: (end - start) / sampleRate };
}

export function selectionBounds(anchor, current, duration, minimum = 0.02) {
  if (!Number.isFinite(duration) || duration <= 0) throw new RangeError('Duration must be greater than zero.');
  let start = Math.max(0, Math.min(duration, Math.min(anchor, current)));
  let end = Math.max(0, Math.min(duration, Math.max(anchor, current)));
  if (end - start < minimum) {
    const center = (start + end) / 2;
    start = Math.max(0, center - minimum / 2);
    end = Math.min(duration, start + minimum);
    start = Math.max(0, end - minimum);
  }
  return { start, end };
}

export function filterSpec(type, cutoff, resonance, sampleRate) {
  if (!['lowpass', 'highpass', 'bandpass'].includes(type)) throw new RangeError('Choose a low-pass, high-pass, or band-pass filter.');
  if (!Number.isFinite(sampleRate) || sampleRate <= 0) throw new RangeError('Sample rate must be positive.');
  const frequency = Math.max(20, Math.min(sampleRate * 0.475, Number(cutoff) || 20));
  const q = Math.max(0.0001, Math.min(20, Number(resonance) || 0.0001));
  return { type, frequency, q };
}

export function computeSpectrogram(samples, sampleRate, { fftSize = 1024, hop = 384, maxFrames = 2400 } = {}) {
  if (!samples.length || sampleRate <= 0) return { pixels: new Uint8Array(), frames: 0, bins: fftSize / 2 + 1, hop };
  const frameCount = Math.min(maxFrames, Math.max(1, Math.ceil(Math.max(0, samples.length - fftSize) / hop) + 1));
  const actualHop = Math.max(hop, Math.ceil(Math.max(0, samples.length - fftSize) / Math.max(1, frameCount - 1)));
  const frames = Math.min(maxFrames, Math.ceil(Math.max(0, samples.length - fftSize) / actualHop) + 1);
  const bins = fftSize / 2 + 1, pixels = new Uint8Array(frames * bins);
  for (let frame = 0; frame < frames; frame += 1) {
    const magnitudes = fftMagnitudes(samples, Math.min(frame * actualHop, Math.max(0, samples.length - fftSize)), fftSize);
    for (let bin = 0; bin < bins; bin += 1) {
      const db = 20 * Math.log10(Math.max(1e-6, magnitudes[bin]));
      pixels[frame * bins + bin] = Math.max(0, Math.min(255, Math.round((db + 84) / 84 * 255)));
    }
  }
  return { pixels, frames, bins, hop: actualHop, fftSize, sampleRate };
}

export function detectOnsets(samples, sampleRate) {
  const window = 1024, hop = 256, energies = [];
  for (let start = 0; start + window <= samples.length; start += hop) {
    let sum = 0;
    for (let i = start; i < start + window; i += 1) sum += samples[i] * samples[i];
    energies.push(Math.sqrt(sum / window));
  }
  if (energies.length < 4) return [];
  const flux = energies.map((value, index) => Math.max(0, value - (energies[index - 1] || 0)));
  const sorted = [...flux].sort((a, b) => a - b), median = sorted[Math.floor(sorted.length / 2)] || 0;
  const average = flux.reduce((sum, value) => sum + value, 0) / flux.length;
  const threshold = Math.max(median * 2.1, average * 1.7, 0.002);
  const peaks = [];
  let previous = -Infinity;
  for (let i = 1; i < flux.length - 1; i += 1) {
    if (flux[i] > threshold && flux[i] >= flux[i - 1] && flux[i] > flux[i + 1] && (i - previous) * hop / sampleRate >= 0.16) {
      peaks.push({ time: i * hop / sampleRate, strength: flux[i] }); previous = i;
    }
  }
  return peaks;
}

export function estimateTempo(onsets) {
  if (onsets.length < 6) return { candidates: [], confidence: 0, note: 'Not enough clear attacks for a tempo estimate.' };
  const histogram = new Map();
  for (let i = 0; i < onsets.length; i += 1) {
    for (let j = i + 1; j < Math.min(onsets.length, i + 5); j += 1) {
      const delta = onsets[j].time - onsets[i].time;
      if (delta < 0.28 || delta > 2.4) continue;
      let bpm = 60 / delta;
      while (bpm < 65) bpm *= 2;
      while (bpm > 180) bpm /= 2;
      const rounded = Math.round(bpm);
      histogram.set(rounded, (histogram.get(rounded) || 0) + 1);
    }
  }
  const candidates = [...histogram].map(([bpm, score]) => ({ bpm, score })).sort((a, b) => b.score - a.score || a.bpm - b.bpm).slice(0, 3);
  const total = [...histogram.values()].reduce((sum, score) => sum + score, 0) || 1;
  return { candidates, confidence: candidates[0]?.score / total || 0, note: candidates.length ? 'Candidates are approximate and may be half-time or double-time.' : 'No stable pulse was found.' };
}

export function prominentFrequency(samples, sampleRate) {
  if (samples.length < 1024 || sampleRate <= 0) return null;
  const size = Math.min(4096, 2 ** Math.floor(Math.log2(samples.length)));
  const start = Math.max(0, Math.floor((samples.length - size) / 2));
  const spectrum = fftMagnitudes(samples, start, size);
  let best = 1;
  for (let i = 2; i < spectrum.length - 1; i += 1) if (spectrum[i] > spectrum[best]) best = i;
  const left = Math.log(Math.max(1e-12, spectrum[best - 1]));
  const center = Math.log(Math.max(1e-12, spectrum[best]));
  const right = Math.log(Math.max(1e-12, spectrum[best + 1]));
  const denominator = left - 2 * center + right;
  const offset = denominator ? 0.5 * (left - right) / denominator : 0;
  const frequency = (best + offset) * sampleRate / size;
  return { frequency, amplitude: spectrum[best], note: frequencyToNote(frequency) };
}

export function frequencyToNote(frequency) {
  if (!Number.isFinite(frequency) || frequency <= 0) return null;
  const notes = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  const midi = 69 + 12 * Math.log2(frequency / 440);
  const rounded = Math.round(midi);
  return `${notes[((rounded % 12) + 12) % 12]}${Math.floor(rounded / 12) - 1}`;
}

export function bandLevels(frequencyBins, sampleRate, fftSize) {
  const bands = [{ name: 'Sub', low: 20, high: 60 }, { name: 'Bass', low: 60, high: 250 }, { name: 'Low-mid', low: 250, high: 500 }, { name: 'Mid', low: 500, high: 2000 }, { name: 'High-mid', low: 2000, high: 6000 }, { name: 'Air', low: 6000, high: 16000 }];
  const binHz = sampleRate / fftSize;
  return bands.map(band => {
    const start = Math.max(0, Math.floor(band.low / binHz)), end = Math.min(frequencyBins.length - 1, Math.ceil(band.high / binHz));
    let sum = 0, count = 0;
    for (let i = start; i <= end; i += 1) { sum += frequencyBins[i]; count += 1; }
    return { ...band, level: count ? sum / count / 255 : 0 };
  });
}
