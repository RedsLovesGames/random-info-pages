import { ipv4CidrInfo, ipv6CidrInfo, convertDataSize, transferSeconds, mediaBytes, displayMetrics } from './network-core.js';

const $ = selector => document.querySelector(selector);
const modes = [...document.querySelectorAll('[data-network-mode]')];
const panels = [...document.querySelectorAll('[data-network-panel]')];

function show(value) { $('#networkResult').textContent = typeof value === 'string' ? value : JSON.stringify(value, null, 2); }
function setMode(mode, { updateUrl = true } = {}) {
  if (!panels.some(panel => panel.dataset.networkPanel === mode)) mode = 'subnet';
  modes.forEach(button => button.classList.toggle('active', button.dataset.networkMode === mode));
  panels.forEach(panel => panel.hidden = panel.dataset.networkPanel !== mode);
  if (updateUrl) history.replaceState(null, '', `?action=${encodeURIComponent(mode)}`);
}
function prettySeconds(seconds) {
  if (seconds < 60) return `${seconds.toFixed(2)} seconds`;
  if (seconds < 3600) return `${(seconds / 60).toFixed(2)} minutes`;
  if (seconds < 86400) return `${(seconds / 3600).toFixed(2)} hours`;
  return `${(seconds / 86400).toFixed(2)} days`;
}
function prettyBytes(bytes) {
  const units = ['B','KB','MB','GB','TB'];
  let value = Number(bytes); let unit = units[0];
  for (let i = 0; i < units.length - 1 && Math.abs(value) >= 1000; i += 1) { value /= 1000; unit = units[i + 1]; }
  return `${value.toFixed(value >= 100 ? 1 : 3)} ${unit}`;
}

modes.forEach(button => button.addEventListener('click', () => setMode(button.dataset.networkMode)));
$('#ipVersion').addEventListener('change', () => {
  const v6 = $('#ipVersion').value === '6';
  $('#ipAddress').value = v6 ? '2001:db8::1234' : '192.168.1.130';
  $('#ipPrefix').max = v6 ? '128' : '32';
  $('#ipPrefix').value = v6 ? '64' : '24';
});

$('#calculateSubnet').addEventListener('click', () => {
  try {
    const info = $('#ipVersion').value === '6'
      ? ipv6CidrInfo($('#ipAddress').value, Number($('#ipPrefix').value))
      : ipv4CidrInfo($('#ipAddress').value, Number($('#ipPrefix').value));
    show(info);
  } catch (error) { show(`Error: ${error.message}`); }
});
$('#convertStorage').addEventListener('click', () => {
  try {
    const value = convertDataSize(Number($('#storageValue').value), $('#storageFrom').value, $('#storageTo').value);
    show(`${$('#storageValue').value} ${$('#storageFrom').value} = ${value.toLocaleString(undefined, { maximumSignificantDigits: 12 })} ${$('#storageTo').value}`);
  } catch (error) { show(`Error: ${error.message}`); }
});
$('#calculateTransfer').addEventListener('click', () => {
  try {
    const seconds = transferSeconds({ size: Number($('#transferSize').value), sizeUnit: $('#transferSizeUnit').value, speed: Number($('#transferSpeed').value), speedUnit: $('#transferSpeedUnit').value });
    show(`${prettySeconds(seconds)}\n${seconds.toFixed(4)} seconds`);
  } catch (error) { show(`Error: ${error.message}`); }
});
$('#calculateMediaSize').addEventListener('click', () => {
  try {
    const bytes = mediaBytes({ bitrate: Number($('#mediaBitrate').value), bitrateUnit: $('#mediaBitrateUnit').value, durationSeconds: Number($('#mediaDuration').value) });
    show(`${prettyBytes(bytes)}\n${bytes.toLocaleString()} bytes`);
  } catch (error) { show(`Error: ${error.message}`); }
});
$('#calculateDisplay').addEventListener('click', () => {
  try {
    const metrics = displayMetrics({ widthPx: Number($('#displayWidth').value), heightPx: Number($('#displayHeight').value), diagonalInches: Number($('#displayDiagonal').value) });
    show(`Aspect ratio: ${metrics.aspectRatio}\nPPI: ${metrics.ppi.toFixed(4)}\nPhysical width: ${metrics.widthInches.toFixed(3)} in\nPhysical height: ${metrics.heightInches.toFixed(3)} in\nPixel diagonal: ${metrics.diagonalPx.toFixed(2)} px`);
  } catch (error) { show(`Error: ${error.message}`); }
});
$('#inspectDevice').addEventListener('click', async () => {
  const rows = [
    ['Viewport', `${innerWidth}×${innerHeight}`],
    ['Device pixel ratio', String(devicePixelRatio)],
    ['Logical processors', String(navigator.hardwareConcurrency || 'unknown')],
    ['Device memory', navigator.deviceMemory ? `${navigator.deviceMemory} GiB (reported)` : 'not exposed'],
    ['WebGL', (() => { const c=document.createElement('canvas'); return Boolean(c.getContext('webgl2') || c.getContext('webgl')); })() ? 'available' : 'unavailable'],
    ['WebGPU', navigator.gpu ? 'available' : 'unavailable'],
    ['WebAssembly', typeof WebAssembly === 'object' ? 'available' : 'unavailable'],
    ['Clipboard', navigator.clipboard ? 'available' : 'unavailable'],
    ['File System Access', 'showOpenFilePicker' in window ? 'available' : 'unavailable'],
    ['BarcodeDetector', 'BarcodeDetector' in window ? 'available' : 'unavailable'],
    ['MediaRecorder', 'MediaRecorder' in window ? 'available' : 'unavailable'],
    ['Online', navigator.onLine ? 'yes' : 'no'],
  ];
  $('#deviceCapabilities').innerHTML = rows.map(([name,value]) => `<div><strong>${name}</strong><span>${value}</span></div>`).join('');
  show(rows.map(([name,value]) => `${name}: ${value}`).join('\n'));
});
$('#copyNetworkResult').addEventListener('click', async () => { try { await navigator.clipboard.writeText($('#networkResult').textContent); } catch {} });

setMode(new URLSearchParams(location.search).get('action') || 'subnet', { updateUrl: false });
