import {
  MAX_DURATION_SECONDS,
  validateAudioInput, estimateDecodedAudioBytes, parseAudioHeader,
  waveformPeaks, measureWindow, selectionBounds,
  filterSpec, bandLevels
} from './analysis.mjs';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const fileInput = $('#audioFile');
const dropzone = $('#dropzone');
const waveformCanvas = $('#waveform');
const spectrogramCanvas = $('#spectrogram');
const spectrumCanvas = $('#spectrum');
const stereoCanvas = $('#stereo');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const WAVEFORM_PAD = 12;

let audioContext = null;
let sourceNode = null;
let activeLoop = null;
let analyser = null;
let filterNode = null;
let dryGain = null;
let wetGain = null;
let outputGain = null;
let currentBuffer = null;
let currentMeta = null;
let duration = 0;
let playbackPosition = 0;
let playbackOffset = 0;
let playbackStartedAt = 0;
let playing = false;
let sourceSerial = 0;
let audioChannels = [];
let peaks = [];
let selection = null;
let dragSelection = null;
let panGesture = null;
let viewZoom = 1;
let viewStart = 0;
let analysisWorker = null;
let analysisRevision = 0;
let loadRequest = 0;
let spectralData = null;
let analysisSampleRate = 0;
let liveFrame = 0;
let lastMeterUpdate = 0;
let frameSpectrum = null;

function ensureAudioGraph() {
  if (audioContext) return audioContext;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) throw new Error('Web Audio is unavailable in this browser.');
  audioContext = new AudioContextClass();
  analyser = audioContext.createAnalyser(); analyser.fftSize = 4096; analyser.smoothingTimeConstant = 0.78;
  filterNode = audioContext.createBiquadFilter(); filterNode.type = 'lowpass'; filterNode.frequency.value = 2000; filterNode.Q.value = 0.7;
  dryGain = audioContext.createGain(); wetGain = audioContext.createGain(); outputGain = audioContext.createGain();
  dryGain.gain.value = 1; wetGain.gain.value = 0; outputGain.gain.value = Number($('#volume').value) / 100;
  dryGain.connect(analyser); filterNode.connect(wetGain); wetGain.connect(analyser); analyser.connect(outputGain); outputGain.connect(audioContext.destination);
  frameSpectrum = new Uint8Array(analyser.frequencyBinCount);
  return audioContext;
}

function formatTime(seconds, milliseconds = true) {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const mins = Math.floor(seconds / 60), secs = Math.floor(seconds % 60), millis = Math.floor((seconds % 1) * 1000);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}${milliseconds ? `.${String(millis).padStart(3, '0')}` : ''}`;
}

function formatRate(rate) { return rate >= 1000 ? `${(rate / 1000).toFixed(rate % 1000 === 0 ? 0 : 1)} kHz` : `${rate} Hz`; }
function dbfs(value) { return value > 0 ? `${(20 * Math.log10(value)).toFixed(1)} dBFS` : '−∞ dBFS'; }

function getPosition() {
  if (!playing || !audioContext || !currentBuffer) return playbackPosition;
  const elapsed = audioContext.currentTime - playbackStartedAt;
  if (activeLoop) {
    const span = activeLoop.end - activeLoop.start;
    return activeLoop.start + ((playbackOffset - activeLoop.start + elapsed) % span + span) % span;
  }
  return Math.min(duration, playbackOffset + elapsed);
}

function setButtonState() {
  $('#playButton').textContent = playing ? 'Ⅱ' : '▶';
  $('#playButton').setAttribute('aria-label', playing ? 'Pause' : 'Play');
}

function stopSource() {
  const old = sourceNode;
  sourceNode = null;
  activeLoop = null;
  if (old) {
    old.onended = null;
    try { old.stop(); } catch { /* already stopped */ }
    try { old.disconnect(); } catch { /* already disconnected */ }
  }
}

async function startPlayback() {
  if (!currentBuffer) return;
  try {
    ensureAudioGraph();
    if (audioContext.state === 'suspended') await audioContext.resume();
    if (playing) return;
    const loopOn = $('#loopSelection').checked && selection;
    if (loopOn && (playbackPosition < selection.start || playbackPosition >= selection.end)) playbackPosition = selection.start;
    if (playbackPosition >= duration) playbackPosition = 0;
    const node = audioContext.createBufferSource();
    node.buffer = currentBuffer;
    node.connect(dryGain); node.connect(filterNode);
    if (loopOn) { node.loop = true; node.loopStart = selection.start; node.loopEnd = selection.end; }
    sourceNode = node; sourceSerial += 1;
    activeLoop = loopOn ? { start: selection.start, end: selection.end } : null;
    playbackOffset = playbackPosition; playbackStartedAt = audioContext.currentTime; playing = true; setButtonState();
    const serial = sourceSerial;
    node.onended = () => {
      if (sourceNode !== node || serial !== sourceSerial) return;
      sourceNode = null; activeLoop = null; playing = false; playbackPosition = duration; setButtonState();
    };
    node.start(0, playbackPosition);
    startLiveLoop();
  } catch (error) {
    playing = false; setButtonState(); $('#trackStatus').textContent = error.message || 'Could not start audio playback.';
  }
}

function pausePlayback() {
  if (playing) playbackPosition = getPosition();
  playing = false; setButtonState(); stopSource();
  drawWaveform(); updateMeters(true);
}

function seekTo(seconds) {
  const wasPlaying = playing;
  if (wasPlaying) pausePlayback();
  playbackPosition = Math.max(0, Math.min(duration, seconds));
  $('#timeline').value = String(duration ? Math.round(playbackPosition / duration * 10000) : 0);
  $('#currentTime').textContent = formatTime(playbackPosition);
  drawWaveform(); updateMeters(true);
  if (wasPlaying) startPlayback();
}

function syncActiveLoop() {
  if (!sourceNode || !playing || !audioContext) return;
  const nextLoop = $('#loopSelection').checked && selection ? { start: selection.start, end: selection.end } : null;
  const position = getPosition();
  if (nextLoop && (position < nextLoop.start || position >= nextLoop.end)) {
    seekTo(nextLoop.start);
    return;
  }
  sourceNode.loop = Boolean(nextLoop);
  if (nextLoop) { sourceNode.loopStart = nextLoop.start; sourceNode.loopEnd = nextLoop.end; }
  activeLoop = nextLoop;
  playbackPosition = position;
  playbackOffset = position;
  playbackStartedAt = audioContext.currentTime;
}

function stopPlayback() {
  pausePlayback(); playbackPosition = 0;
  $('#timeline').value = '0'; $('#currentTime').textContent = formatTime(0); drawWaveform(); updateMeters(true);
}

function updateSelectionReadout() {
  const output = $('#selectionReadout');
  if (!selection) {
    output.textContent = '—'; $('#selectionResult').textContent = '';
    $('#loopSelection').checked = false; $('#loopSelection').disabled = true; $('#analyzeSelection').disabled = true;
  } else {
    output.textContent = `${formatTime(selection.start)} — ${formatTime(selection.end)} · ${formatTime(selection.end - selection.start)}`;
    $('#loopSelection').disabled = false; $('#analyzeSelection').disabled = false;
  }
}

function updateViewControls() {
  $('#waveZoom').value = String(viewZoom); $('#waveZoomLabel').textContent = `${viewZoom.toFixed(viewZoom % 1 ? 1 : 0)}×`;
  const viewDuration = duration ? duration / viewZoom : 0;
  const maxStart = Math.max(0, duration - viewDuration);
  $('#wavePan').value = String(maxStart ? Math.round(viewStart / maxStart * 100) : 0);
  $('#wavePan').disabled = !currentBuffer || maxStart <= 0;
  updateWaveAxis();
}

function setSelection(anchor, current) {
  if (!duration) return;
  selection = selectionBounds(anchor, current, duration);
  $('#selectionResult').textContent = '';
  updateSelectionReadout(); drawWaveform();
}

function waveformPlotRatio(clientX, rect) {
  const pad = Math.min(WAVEFORM_PAD, rect.width / 2);
  const plotWidth = Math.max(1, rect.width - pad * 2);
  const x = Math.max(pad, Math.min(rect.width - pad, clientX - rect.left));
  return (x - pad) / plotWidth;
}

function waveformTimeAt(clientX, rect) {
  return Math.max(0, Math.min(duration, viewStart + waveformPlotRatio(clientX, rect) * (duration / viewZoom)));
}

function setTrackFacts(buffer, meta) {
  $('#trackName').textContent = meta.name;
  $('#durationFact').textContent = formatTime(buffer.duration, false);
  $('#sampleRateFact').textContent = formatRate(buffer.sampleRate);
  $('#channelsFact').textContent = `${buffer.numberOfChannels}`;
  $('#formatFact').textContent = meta.format;
  $('#totalTime').textContent = formatTime(buffer.duration);
}

function updateEnabledState(enabled) {
  for (const selector of ['#playButton', '#stopButton', '#timeline', '#waveZoom', '#filterEnabled', '#cutoff', '#resonance']) $(selector).disabled = !enabled;
  $('#wavePan').disabled = !enabled || viewZoom <= 1;
  $('#loopSelection').disabled = !enabled || !selection;
  $('#analyzeSelection').disabled = !enabled || !selection;
}

function preparePeaks(buffer) {
  audioChannels = Array.from({ length: buffer.numberOfChannels }, (_, index) => buffer.getChannelData(index));
  const buckets = Math.max(1600, Math.min(50000, Math.ceil(buffer.duration * 240)));
  peaks = audioChannels.map(channel => waveformPeaks(channel, buckets));
}

function launchAnalysisWorker(buffer, revision) {
  if (analysisWorker) analysisWorker.terminate();
  spectralData = null; analysisSampleRate = 0;
  $('#analysisStatus').textContent = 'Preparing a bounded background analysis…';
  $('#onsetCount').textContent = '—'; $('#tempoCandidates').textContent = '—'; $('#frequencyEstimate').textContent = '—';
  $('#onsetNote').textContent = 'Analysis is running locally.'; $('#tempoNote').textContent = 'Candidates may be half-time or double-time.'; $('#frequencyNote').textContent = 'Strongest spectral peak, not necessarily the musical pitch.';
  try {
    analysisWorker = new Worker(new URL('./analysis-worker.js', import.meta.url), { type: 'module' });
  } catch {
    $('#analysisStatus').textContent = 'Background analysis is unavailable; playback and waveform tools still work.'; return;
  }
  analysisWorker.onmessage = event => {
    const message = event.data;
    if (message.id !== analysisRevision || revision !== analysisRevision) return;
    if (message.progress) { $('#analysisStatus').textContent = message.progress; return; }
    if (message.error) { $('#analysisStatus').textContent = message.error; return; }
    spectralData = message.spectrogram; analysisSampleRate = message.analysisRate;
    $('#analysisStatus').textContent = 'Background analysis complete · estimates are approximate.';
    $('#onsetCount').textContent = message.onsets.length ? message.onsets.length.toLocaleString() : 'None';
    $('#onsetNote').textContent = message.onsets.length ? `Detected attacks across ${formatTime(duration, false)}. Soft or sustained sounds can be missed.` : 'No clear transient pattern was detected.';
    const candidates = message.tempo.candidates || [];
    $('#tempoCandidates').textContent = candidates.length ? `~${candidates.map(item => item.bpm).join(' · ')} bpm` : 'No stable estimate';
    $('#tempoNote').textContent = message.tempo.note;
    $('#frequencyEstimate').textContent = message.frequency ? `${message.frequency.frequency.toFixed(message.frequency.frequency < 100 ? 1 : 0)} Hz · ${message.frequency.note}` : 'Not enough signal';
    $('#frequencyNote').textContent = message.frequency ? 'Strongest peak in a short whole-track sample; musical pitch may differ.' : 'A longer, stronger signal is needed for a stable peak.';
    $('#spectrogramNote').textContent = `${spectralData.frames.toLocaleString()} time slices · ${spectralData.bins} frequency bins · worker summarized with bounded resolution; no sample locations are invented.`;
    drawSpectrogram();
  };
  analysisWorker.onerror = () => { if (revision === analysisRevision) $('#analysisStatus').textContent = 'Background analysis stopped. Waveform and playback remain available.'; };
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, index) => buffer.getChannelData(index).slice());
  analysisWorker.postMessage({ id: revision, channels, sampleRate: buffer.sampleRate }, channels.map(channel => channel.buffer));
}

function setFilterControls() {
  if (!currentBuffer) return;
  const max = Math.max(100, Math.floor(currentBuffer.sampleRate * 0.475));
  $('#cutoff').max = String(max);
  if (Number($('#cutoff').value) > max) $('#cutoff').value = String(max);
  const spec = filterSpec($('#filterType').value, $('#cutoff').value, $('#resonance').value, currentBuffer.sampleRate);
  $('#cutoffLabel').textContent = `${Math.round(spec.frequency).toLocaleString()} Hz`;
  $('#resonanceLabel').textContent = `${spec.q.toFixed(1)} Q`;
  if (filterNode) { filterNode.type = spec.type; filterNode.frequency.setTargetAtTime(spec.frequency, audioContext.currentTime, 0.02); filterNode.Q.setTargetAtTime(spec.q, audioContext.currentTime, 0.02); }
}

function setFilterEnabled() {
  const enabled = $('#filterEnabled').checked;
  const now = audioContext?.currentTime || 0;
  if (dryGain && wetGain) {
    dryGain.gain.setTargetAtTime(enabled ? 0 : 1, now, 0.02);
    wetGain.gain.setTargetAtTime(enabled ? 1 : 0, now, 0.02);
  }
  $('#filterStatus').textContent = enabled ? `Filtered playback · ${$('#filterType').selectedOptions[0].textContent}, ${$('#cutoffLabel').textContent}, ${$('#resonanceLabel').textContent}. Toggle off to compare the original.` : 'Original playback · filter path bypassed.';
  setFilterControls();
}

function loadBuffer(buffer, meta) {
  if (buffer.duration <= 0 || buffer.duration > MAX_DURATION_SECONDS) throw new RangeError('Audio duration is outside the supported range of 0 to 180 seconds.');
  if (buffer.numberOfChannels > 8 || buffer.numberOfChannels < 1) throw new RangeError('This recording has an unsupported number of audio channels.');
  const decodedBytes = buffer.length * buffer.numberOfChannels * 4;
  validateAudioInput({ bytes: 1, decodedBytes });
  loadRequest += 1;
  pausePlayback(); stopSource();
  currentBuffer = buffer; currentMeta = meta; duration = buffer.duration; playbackPosition = 0;
  selection = null; viewZoom = 1; viewStart = 0;
  $('#loopSelection').checked = false; $('#filterEnabled').checked = false;
  preparePeaks(buffer); setTrackFacts(buffer, meta); updateEnabledState(true); updateSelectionReadout(); updateViewControls();
  $('#trackStatus').textContent = 'Ready · file decoding and analysis remain on this device.';
  $('#playButton').disabled = false; $('#stopButton').disabled = false; $('#timeline').disabled = false;
  $('#filterEnabled').disabled = false; $('#cutoff').disabled = false; $('#resonance').disabled = false;
  $('#filterStatus').textContent = 'Original playback · enable a filter to compare the signal.';
  try { ensureAudioGraph(); setFilterControls(); } catch (error) { $('#trackStatus').textContent = error.message; }
  const revision = ++analysisRevision;
  launchAnalysisWorker(buffer, revision);
  drawWaveform(); drawSpectrogram(); updateMeters(true); startLiveLoop();
}

async function readMediaDuration(file) {
  const objectUrl = URL.createObjectURL(file), media = document.createElement('audio');
  media.preload = 'metadata';
  let timeoutId;
  try {
    const duration = await new Promise((resolve, reject) => {
      timeoutId = setTimeout(() => reject(new Error('Audio metadata could not be read before decoding.')), 12_000);
      media.onloadedmetadata = () => resolve(media.duration);
      media.onerror = () => reject(new Error('The browser could not read metadata from this audio file.'));
      media.src = objectUrl;
      media.load();
    });
    if (!Number.isFinite(duration) || duration <= 0) throw new RangeError('Audio duration could not be checked before decoding.');
    return duration;
  } finally {
    clearTimeout(timeoutId);
    media.pause(); media.removeAttribute('src'); media.load();
    URL.revokeObjectURL(objectUrl);
  }
}

async function preflightAudioFile(file, extension) {
  const headerBytes = Math.min(file.size, 2 * 1024 * 1024);
  let bytes = new Uint8Array(await file.slice(0, headerBytes).arrayBuffer());
  let metadata = parseAudioHeader(bytes, extension);
  if (!metadata && ['m4a', 'mp4', 'm4b', 'mp4a'].includes(extension)) {
    const tailBytes = Math.min(file.size, 8 * 1024 * 1024);
    bytes = new Uint8Array(await file.slice(file.size - tailBytes).arrayBuffer());
    metadata = parseAudioHeader(bytes, extension);
  }
  bytes = null;
  if (!metadata) throw new RangeError('This audio layout could not be checked safely before decoding. Export it as WAV, AIFF, FLAC, MP3, AAC, OGG, M4A or WebM and try again.');
  const duration = await readMediaDuration(file);
  const decodedBytes = estimateDecodedAudioBytes(duration, audioContext.sampleRate, metadata.channels);
  validateAudioInput({ bytes: file.size, duration, channels: metadata.channels, decodedBytes });
  return { duration, ...metadata, decodedBytes };
}

async function loadFile(file) {
  $('#importError').hidden = true;
  const request = ++loadRequest;
  try {
    if (!file || !file.size) throw new RangeError('Choose a non-empty audio file.');
    const extension = file.name.split('.').pop().toLowerCase();
    const supported = (file.type || '').startsWith('audio/') || ['wav', 'mp3', 'm4a', 'aac', 'ogg', 'oga', 'flac', 'aiff', 'aif', 'webm'].includes(extension);
    if (!supported) throw new RangeError('This file does not look like a supported audio format.');
    validateAudioInput({ bytes: file.size });
    $('#trackStatus').textContent = 'Decoding locally in the browser…';
    ensureAudioGraph();
    const preflight = await preflightAudioFile(file, extension);
    if (request !== loadRequest) return;
    let bytes = await file.arrayBuffer();
    if (request !== loadRequest) return;
    const buffer = await audioContext.decodeAudioData(bytes);
    bytes = null;
    if (request !== loadRequest) return;
    if (buffer.numberOfChannels !== preflight.channels) throw new RangeError('The decoded channel count did not match the checked audio header. This file was not loaded.');
    validateAudioInput({ bytes: file.size, duration: buffer.duration, channels: buffer.numberOfChannels });
    validateAudioInput({ bytes: file.size, decodedBytes: buffer.length * buffer.numberOfChannels * 4 });
    const format = file.type ? file.type.replace('audio/', '').toUpperCase() : extension.toUpperCase();
    loadBuffer(buffer, { name: file.name, format });
  } catch (error) {
    $('#importError').textContent = error.message || 'The browser could not decode this audio file.';
    $('#importError').hidden = false;
    $('#trackStatus').textContent = 'Import failed. The previously loaded recording is unchanged.';
  } finally { fileInput.value = ''; }
}

function makeExample() {
  const sampleRate = 44100, durationSeconds = 12, length = sampleRate * durationSeconds;
  const buffer = new AudioBuffer({ numberOfChannels: 2, length, sampleRate });
  const left = buffer.getChannelData(0), right = buffer.getChannelData(1);
  const notes = [130.81, 164.81, 196, 261.63, 196, 164.81, 146.83, 220, 174.61, 261.63, 220, 164.81];
  let seedValue = 0x1234abcd;
  const random = () => { seedValue = (seedValue * 1664525 + 1013904223) >>> 0; return seedValue / 0x100000000; };
  for (let i = 0; i < length; i += 1) {
    const time = i / sampleRate;
    const beat = Math.floor(time / 0.5), within = time % 0.5;
    const note = notes[beat % notes.length], noteEnvelope = Math.min(1, within * 18) * Math.exp(-within * 1.3);
    const bass = Math.sin(2 * Math.PI * (note / 2) * time) * noteEnvelope * 0.18;
    const melody = (Math.sin(2 * Math.PI * note * time) + 0.35 * Math.sin(2 * Math.PI * note * 2 * time)) * noteEnvelope * 0.22;
    const kickAge = time % 0.5;
    const kick = kickAge < 0.18 ? Math.sin(2 * Math.PI * (75 - 180 * kickAge) * kickAge) * Math.exp(-kickAge * 24) * 0.4 : 0;
    const hatAge = time % 0.25;
    const hat = hatAge < 0.035 ? (random() * 2 - 1) * Math.exp(-hatAge * 105) * 0.035 : 0;
    left[i] = Math.max(-0.95, Math.min(0.95, bass + melody + kick + hat));
    right[i] = Math.max(-0.95, Math.min(0.95, bass * 0.96 + melody * 0.78 + kick * 0.85 + hat * 0.7));
  }
  loadBuffer(buffer, { name: 'Local reference · glass steps', format: 'Generated 44.1 kHz' });
  $('#trackStatus').textContent = 'Original synthesized reference · repeating 120 BPM pulse with a small melodic pattern.';
}

function viewWindow() { return { start: viewStart, length: duration / viewZoom }; }

function drawWaveform() {
  const canvas = waveformCanvas, rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const ratio = Math.min(2, window.devicePixelRatio || 1), width = rect.width, height = rect.height;
  canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
  const ctx = canvas.getContext('2d'); ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.fillStyle = '#101819'; ctx.fillRect(0, 0, width, height);
  const pad = WAVEFORM_PAD, bottom = height - 20, { start, length } = viewWindow();
  ctx.strokeStyle = '#273536'; ctx.lineWidth = 1;
  for (let tick = 0; tick <= 4; tick += 1) { const x = pad + (width - pad * 2) * tick / 4; ctx.beginPath(); ctx.moveTo(x, 8); ctx.lineTo(x, bottom); ctx.stroke(); }
  if (!currentBuffer || !peaks.length) { ctx.fillStyle = '#647572'; ctx.font = '11px monospace'; ctx.fillText('LOAD AUDIO TO DRAW THE WAVEFORM', 18, height / 2); return; }
  if (selection) {
    const x1 = pad + (selection.start - start) / length * (width - pad * 2);
    const x2 = pad + (selection.end - start) / length * (width - pad * 2);
    ctx.fillStyle = '#e4a15b26'; ctx.fillRect(Math.max(pad, x1), 8, Math.max(0, Math.min(width - pad, x2) - Math.max(pad, x1)), bottom - 8);
    ctx.strokeStyle = '#e4a15b'; ctx.beginPath(); ctx.moveTo(x1, 8); ctx.lineTo(x1, bottom); ctx.moveTo(x2, 8); ctx.lineTo(x2, bottom); ctx.stroke();
  }
  const channelCount = peaks.length, usableHeight = bottom - 12, channelHeight = usableHeight / channelCount;
  for (let channel = 0; channel < channelCount; channel += 1) {
    const values = peaks[channel], buckets = values.length / 2, center = 10 + channelHeight * (channel + 0.5);
    ctx.strokeStyle = channel === 0 ? '#68c5ba' : '#829fd1'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x < Math.floor(width - pad * 2); x += 1) {
      const time = start + x / (width - pad * 2) * length;
      const bucket = Math.max(0, Math.min(buckets - 1, Math.floor(time / duration * buckets)));
      const min = values[bucket * 2], max = values[bucket * 2 + 1];
      const y1 = center - max * channelHeight * 0.44, y2 = center - min * channelHeight * 0.44;
      const screenX = pad + x;
      ctx.moveTo(screenX, y1); ctx.lineTo(screenX, y2);
    }
    ctx.stroke();
    if (channelCount > 1) { ctx.fillStyle = '#647572'; ctx.font = '8px monospace'; ctx.fillText(channel === 0 ? 'L' : 'R', 2, center + 3); }
  }
  const position = getPosition();
  if (position >= start && position <= start + length) {
    const x = pad + (position - start) / length * (width - pad * 2);
    ctx.strokeStyle = '#f5d37e'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, 7); ctx.lineTo(x, bottom); ctx.stroke();
  }
}

function updateWaveAxis() {
  const axis = $('#waveAxis');
  if (!duration) { axis.replaceChildren(); return; }
  const { start, length } = viewWindow();
  const labels = Array.from({ length: 5 }, (_, i) => formatTime(start + length * i / 4, false));
  axis.replaceChildren(...labels.map(text => { const span = document.createElement('span'); span.textContent = text; return span; }));
}

function paletteColor(value) {
  const t = value / 255;
  if ($('#palette').value === 'mono') { const shade = Math.round(12 + t * 232); return [shade, shade, shade]; }
  if ($('#palette').value === 'ice') return [Math.round(12 + 50 * t), Math.round(24 + 190 * t), Math.round(31 + 220 * t)];
  const stops = [[13, 22, 27], [37, 67, 75], [115, 77, 75], [218, 139, 72], [255, 230, 150]];
  const position = t * (stops.length - 1), lower = Math.floor(position), frac = position - lower, a = stops[lower], b = stops[Math.min(stops.length - 1, lower + 1)];
  return a.map((channel, index) => Math.round(channel + (b[index] - channel) * frac));
}

function drawSpectrogram() {
  const canvas = spectrogramCanvas, rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const ratio = Math.min(2, window.devicePixelRatio || 1), width = Math.round(rect.width * ratio), height = Math.round(rect.height * ratio);
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = '#101819'; ctx.fillRect(0, 0, width, height);
  if (!spectralData?.frames || !spectralData?.pixels?.length || !duration) {
    ctx.fillStyle = '#657572'; ctx.font = `${11 * ratio}px monospace`; ctx.fillText('BACKGROUND SPECTRAL ANALYSIS WILL APPEAR HERE', 14 * ratio, height / 2); return;
  }
  const image = ctx.createImageData(width, height), bins = spectralData.bins, frames = spectralData.frames;
  const maxFrequency = analysisSampleRate / 2, logScale = $('#logFrequency').checked, minFrequency = 20;
  const { start, length } = viewWindow();
  for (let y = 0; y < height; y += 1) {
    const vertical = 1 - y / Math.max(1, height - 1);
    const frequency = logScale ? minFrequency * Math.pow(maxFrequency / minFrequency, vertical) : maxFrequency * vertical;
    const bin = Math.max(0, Math.min(bins - 1, Math.round(frequency / maxFrequency * (bins - 1))));
    for (let x = 0; x < width; x += 1) {
      const time = start + x / Math.max(1, width - 1) * length;
      const frame = Math.max(0, Math.min(frames - 1, Math.floor(time / duration * frames)));
      const value = spectralData.pixels[frame * bins + bin];
      const [red, green, blue] = paletteColor(value), offset = (y * width + x) * 4;
      image.data[offset] = red; image.data[offset + 1] = green; image.data[offset + 2] = blue; image.data[offset + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  const axis = $('#spectrogramAxis');
  const labels = Array.from({ length: 5 }, (_, i) => formatTime(start + length * i / 4, false));
  axis.replaceChildren(...labels.map(text => { const span = document.createElement('span'); span.textContent = text; return span; }));
  updateFrequencyAxis();
}

function updateFrequencyAxis() {
  const container = $('.frequency-axis'), labels = $$('.frequency-axis span');
  if (!analysisSampleRate || !container) return;
  const nyquist = analysisSampleRate / 2, min = 20, useLog = $('#logFrequency').checked;
  const frequencies = [nyquist, Math.min(6000, nyquist * 2 / 3), Math.min(1000, nyquist / 3), min];
  labels.forEach((label, index) => {
    const frequency = frequencies[index];
    label.textContent = index === 0 ? `${(frequency / 1000).toFixed(frequency >= 1000 ? 1 : 0)} kHz` : index === 1 && nyquist < 6000 ? `${Math.round(frequency)} Hz` : `${Math.round(frequency)} Hz`;
    const fraction = useLog ? (Math.log(Math.max(min, frequency)) - Math.log(min)) / Math.max(.0001, Math.log(nyquist) - Math.log(min)) : frequency / nyquist;
    label.style.top = `${(1 - fraction) * 100}%`;
  });
}

function drawSpectrum() {
  const canvas = spectrumCanvas, rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const ratio = Math.min(2, window.devicePixelRatio || 1), width = rect.width, height = rect.height;
  canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
  const ctx = canvas.getContext('2d'); ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.fillStyle = '#101819'; ctx.fillRect(0, 0, width, height);
  if (!analyser || !frameSpectrum || !playing) { ctx.fillStyle = '#657572'; ctx.font = '9px monospace'; ctx.fillText(currentBuffer ? 'PLAY TO READ LIVE SPECTRUM' : 'LOAD AUDIO TO READ SPECTRUM', 12, height / 2); return; }
  analyser.getByteFrequencyData(frameSpectrum);
  const rate = audioContext.sampleRate, max = rate / 2;
  ctx.strokeStyle = '#293a39'; ctx.lineWidth = 1;
  for (const frequency of [100, 1000, 10000]) {
    if (frequency >= max) continue;
    const x = Math.log(frequency / 20) / Math.log(max / 20) * width;
    ctx.beginPath(); ctx.moveTo(x, 8); ctx.lineTo(x, height - 18); ctx.stroke();
    ctx.fillStyle = '#70817c'; ctx.font = '8px monospace'; ctx.fillText(frequency >= 1000 ? `${frequency / 1000}k` : String(frequency), x + 3, height - 5);
  }
  ctx.beginPath();
  for (let x = 0; x < width; x += 1) {
    const frequency = 20 * Math.pow(max / 20, x / Math.max(1, width - 1));
    const bin = Math.max(0, Math.min(frameSpectrum.length - 1, Math.round(frequency / max * (frameSpectrum.length - 1))));
    const y = height - 14 - frameSpectrum[bin] / 255 * (height - 28);
    if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = '#68c5ba'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.lineTo(width, height - 14); ctx.lineTo(0, height - 14); ctx.closePath(); ctx.fillStyle = '#68c5ba18'; ctx.fill();
  const bars = bandLevels(frameSpectrum, rate, analyser.fftSize);
  bars.forEach(band => {
    const row = $(`.band-row[data-band="${band.name}"]`);
    if (row) { $('.band-fill', row).style.width = `${Math.max(0, Math.min(100, band.level * 140))}%`; $('output', row).textContent = `${Math.round(band.level * 100)}%`; }
  });
}

function createBandRows() {
  const container = $('#bands');
  const names = ['Sub', 'Bass', 'Low-mid', 'Mid', 'High-mid', 'Air'];
  container.replaceChildren(...names.map(name => {
    const row = document.createElement('div'); row.className = 'band-row'; row.dataset.band = name;
    const label = document.createElement('span'); label.textContent = name;
    const track = document.createElement('div'); track.className = 'band-track';
    const fill = document.createElement('div'); fill.className = 'band-fill'; track.append(fill);
    const output = document.createElement('output'); output.textContent = '—'; row.append(label, track, output); return row;
  }));
}

function updateMeters(force = false) {
  if (!currentBuffer) return;
  const now = performance.now(); if (!force && now - lastMeterUpdate < 120) return;
  lastMeterUpdate = now;
  const position = getPosition(), windowSize = 0.08, start = Math.max(0, position - windowSize / 2), end = Math.min(duration, position + windowSize / 2);
  const measures = audioChannels.map(channel => measureWindow(channel, currentBuffer.sampleRate, start, end));
  const peak = Math.max(0, ...measures.map(item => item.peak));
  const rms = Math.sqrt(measures.reduce((sum, item) => sum + item.rms * item.rms, 0) / Math.max(1, measures.length));
  $('#peakValue').textContent = `${dbfs(peak)} · ${peak.toFixed(3)}`;
  $('#rmsValue').textContent = `${dbfs(rms)} · ${rms.toFixed(3)}`;
  const left = measures[0]?.rms || 0, right = measures[1]?.rms ?? left;
  $('#leftLevel').textContent = `${dbfs(left)} · ${left.toFixed(3)}`; $('#rightLevel').textContent = `${dbfs(right)} · ${right.toFixed(3)}`;
  drawStereo(left, right);
}

function drawStereo(left, right) {
  const canvas = stereoCanvas, rect = canvas.getBoundingClientRect(); if (!rect.width || !rect.height) return;
  const ratio = Math.min(2, window.devicePixelRatio || 1), width = rect.width, height = rect.height;
  canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
  const ctx = canvas.getContext('2d'); ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.fillStyle = '#101819'; ctx.fillRect(0, 0, width, height);
  const rows = [{ value: left, label: 'LEFT', color: '#68c5ba' }, { value: right, label: 'RIGHT', color: '#829fd1' }];
  rows.forEach((row, index) => {
    const y = 30 + index * 52, barWidth = Math.max(0, Math.min(width - 80, row.value * (width - 80) * 2));
    ctx.fillStyle = '#273536'; ctx.fillRect(48, y, width - 70, 12);
    ctx.fillStyle = row.color; ctx.fillRect(48, y, barWidth, 12);
    ctx.fillStyle = '#9ca9a5'; ctx.font = '8px monospace'; ctx.textAlign = 'left'; ctx.fillText(row.label, 8, y + 9);
    ctx.textAlign = 'right'; ctx.fillText(`${(row.value * 100).toFixed(1)}%`, width - 8, y + 9);
  });
}

function liveLoop() {
  liveFrame = 0;
  const tick = () => {
    if (!currentBuffer) { liveFrame = 0; return; }
    playbackPosition = getPosition();
    if (!playing) playbackPosition = Math.max(0, Math.min(duration, playbackPosition));
    $('#currentTime').textContent = formatTime(playbackPosition);
    $('#timeline').value = String(duration ? Math.round(playbackPosition / duration * 10000) : 0);
    if (playing) {
      drawWaveform(); drawSpectrum(); updateMeters(false);
      liveFrame = requestAnimationFrame(tick);
    } else {
      if (playbackPosition >= duration && sourceNode === null) playbackPosition = duration;
      updateMeters(true); liveFrame = 0;
    }
  };
  if (!liveFrame) liveFrame = requestAnimationFrame(tick);
}

function startLiveLoop() { if (!liveFrame && currentBuffer) liveLoop(); }

waveformCanvas.addEventListener('pointerdown', event => {
  if (!currentBuffer) return;
  waveformCanvas.setPointerCapture(event.pointerId);
  const rect = waveformCanvas.getBoundingClientRect();
  if (event.shiftKey) panGesture = { x: event.clientX, start: viewStart, length: duration / viewZoom, plotWidth: Math.max(1, rect.width - Math.min(WAVEFORM_PAD, rect.width / 2) * 2) };
  else {
    const time = waveformTimeAt(event.clientX, rect);
    dragSelection = { anchor: time, x: event.clientX };
    setSelection(time, time);
  }
});
waveformCanvas.addEventListener('pointermove', event => {
  const rect = waveformCanvas.getBoundingClientRect();
  if (panGesture) {
    const maxStart = Math.max(0, duration - duration / viewZoom);
    viewStart = Math.max(0, Math.min(maxStart, panGesture.start - (event.clientX - panGesture.x) / panGesture.plotWidth * panGesture.length));
    updateViewControls(); drawWaveform(); drawSpectrogram();
  } else if (dragSelection) {
    setSelection(dragSelection.anchor, waveformTimeAt(event.clientX, rect));
  }
});
function finishWavePointer() {
  if (panGesture) scheduleRedraw();
  const selectionChanged = Boolean(dragSelection);
  panGesture = null; dragSelection = null;
  if (selectionChanged) syncActiveLoop();
}
function scheduleRedraw() { drawWaveform(); drawSpectrogram(); }
waveformCanvas.addEventListener('pointerup', finishWavePointer);
waveformCanvas.addEventListener('pointercancel', finishWavePointer);
waveformCanvas.addEventListener('wheel', event => {
  if (!currentBuffer) return;
  event.preventDefault();
  const rect = waveformCanvas.getBoundingClientRect(), anchor = waveformPlotRatio(event.clientX, rect);
  const anchorTime = viewStart + anchor * (duration / viewZoom);
  viewZoom = Math.max(1, Math.min(12, viewZoom * Math.exp(-event.deltaY * 0.001)));
  viewStart = Math.max(0, Math.min(duration - duration / viewZoom, anchorTime - anchor * (duration / viewZoom)));
  updateViewControls(); drawWaveform(); drawSpectrogram();
}, { passive: false });

$('#waveZoom').addEventListener('input', event => {
  const center = viewStart + duration / viewZoom / 2;
  viewZoom = Number(event.target.value);
  viewStart = Math.max(0, Math.min(duration - duration / viewZoom, center - duration / viewZoom / 2));
  updateViewControls(); drawWaveform(); drawSpectrogram();
});
$('#wavePan').addEventListener('input', event => {
  const viewDuration = duration / viewZoom;
  viewStart = (duration - viewDuration) * Number(event.target.value) / 100;
  updateViewControls(); drawWaveform(); drawSpectrogram();
});

fileInput.addEventListener('change', () => loadFile(fileInput.files?.[0]));
$('#exampleButton').addEventListener('click', makeExample);
for (const type of ['dragenter', 'dragover']) dropzone.addEventListener(type, event => { event.preventDefault(); dropzone.classList.add('is-over'); });
for (const type of ['dragleave', 'drop']) dropzone.addEventListener(type, event => { event.preventDefault(); dropzone.classList.remove('is-over'); });
dropzone.addEventListener('drop', event => { const file = event.dataTransfer?.files?.[0]; if (file) loadFile(file); });
$('#playButton').addEventListener('click', () => playing ? pausePlayback() : startPlayback());
$('#stopButton').addEventListener('click', stopPlayback);
$('#timeline').addEventListener('input', event => seekTo(Number(event.target.value) / 10000 * duration));
$('#loopSelection').addEventListener('change', () => {
  if (playing) syncActiveLoop();
  else if ($('#loopSelection').checked && selection && (playbackPosition < selection.start || playbackPosition >= selection.end)) seekTo(selection.start);
});
$('#volume').addEventListener('input', event => {
  if (outputGain && audioContext) outputGain.gain.setTargetAtTime(Number(event.target.value) / 100, audioContext.currentTime, 0.02);
});
$('#analyzeSelection').addEventListener('click', () => {
  if (!selection || !currentBuffer) return;
  const measures = audioChannels.map(channel => measureWindow(channel, currentBuffer.sampleRate, selection.start, selection.end));
  const peak = Math.max(...measures.map(item => item.peak));
  const rms = Math.sqrt(measures.reduce((sum, item) => sum + item.rms ** 2, 0) / measures.length);
  $('#selectionResult').textContent = `PEAK ${dbfs(peak)} · RMS ${dbfs(rms)} · ${formatTime(selection.end - selection.start)} REGION`;
});
$('#filterEnabled').addEventListener('change', setFilterEnabled);
$('#filterType').addEventListener('change', () => { setFilterControls(); if ($('#filterEnabled').checked) setFilterEnabled(); });
$('#cutoff').addEventListener('input', setFilterControls);
$('#resonance').addEventListener('input', setFilterControls);
$('#palette').addEventListener('change', drawSpectrogram);
$('#logFrequency').addEventListener('change', () => { drawSpectrogram(); updateFrequencyAxis(); });

window.addEventListener('keydown', event => {
  const target = event.target;
  if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement || target instanceof HTMLButtonElement) return;
  if (event.code === 'Space') { event.preventDefault(); if (playing) pausePlayback(); else startPlayback(); }
  else if (event.key === 'ArrowLeft' && currentBuffer) { event.preventDefault(); seekTo(getPosition() - 1); }
  else if (event.key === 'ArrowRight' && currentBuffer) { event.preventDefault(); seekTo(getPosition() + 1); }
  else if (event.key.toLowerCase() === 'l' && selection) { $('#loopSelection').checked = !$('#loopSelection').checked; $('#loopSelection').dispatchEvent(new Event('change')); }
});

window.addEventListener('resize', () => { drawWaveform(); drawSpectrogram(); drawSpectrum(); drawStereo(0, 0); });
createBandRows();
drawWaveform(); drawSpectrogram(); drawStereo(0, 0);
