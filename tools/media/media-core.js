export function clampTrimRange(start, end, duration) {
  const total = Math.max(0, Number(duration) || 0);
  let a = Math.max(0, Math.min(total, Number(start) || 0));
  let b = Math.max(0, Math.min(total, Number(end) || total));
  if (a > b) [a, b] = [b, a];
  return { start: a, end: b, duration: Math.max(0, b - a) };
}

export function detectMediaKind(file) {
  const type = String(file?.type || '').toLowerCase();
  if (type.startsWith('audio/')) return 'audio';
  if (type.startsWith('video/')) return 'video';
  const name = String(file?.name || '').toLowerCase();
  if (/\.(mp3|wav|ogg|oga|flac|m4a|aac|opus)$/.test(name)) return 'audio';
  if (/\.(mp4|m4v|webm|mov|mkv|ogv)$/.test(name)) return 'video';
  return 'unknown';
}

export function formatDuration(seconds) {
  const value = Math.max(0, Number(seconds) || 0);
  const wholeMinutes = Math.floor(value / 60);
  const secs = value - wholeMinutes * 60;
  return `${String(wholeMinutes).padStart(2, '0')}:${secs.toFixed(3).padStart(6, '0')}`;
}

const NOTE_INDEX = { C:0, 'C#':1, Db:1, D:2, 'D#':3, Eb:3, E:4, F:5, 'F#':6, Gb:6, G:7, 'G#':8, Ab:8, A:9, 'A#':10, Bb:10, B:11 };

export function noteFrequency(note = 'A4') {
  const match = /^([A-G](?:#|b)?)(-?\d+)$/.exec(String(note).trim());
  if (!match || NOTE_INDEX[match[1]] == null) return Number.NaN;
  const midi = (Number(match[2]) + 1) * 12 + NOTE_INDEX[match[1]];
  return 440 * 2 ** ((midi - 69) / 12);
}

export function estimatePcmWavBytes(duration, sampleRate = 48000, channels = 2, bitsPerSample = 16) {
  const frames = Math.max(0, Math.round((Number(duration) || 0) * sampleRate));
  return 44 + frames * channels * (bitsPerSample / 8);
}

export function outputBaseName(filename) {
  const safe = String(filename || 'media').split(/[\\/]/).pop();
  const dot = safe.lastIndexOf('.');
  return dot > 0 ? safe.slice(0, dot) : safe;
}
