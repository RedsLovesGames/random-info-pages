import {
  buildCodePayload, generatePassword as makePassword, generatePassphrase,
  secureBytes, tokenFromBytes, generateUuid as makeUuid, barcodeOptions,
} from './codes-core.js';

const $ = selector => document.querySelector(selector);
const modes = [...document.querySelectorAll('[data-codes-mode]')];
const panels = [...document.querySelectorAll('[data-codes-panel]')];
const canvas = $('#codeCanvas');
let bwipPromise = null;

function show(value) { $('#codesResult').textContent = String(value); }
function setMode(mode, { updateUrl = true } = {}) {
  if (!panels.some(panel => panel.dataset.codesPanel === mode)) mode = 'qr';
  modes.forEach(button => button.classList.toggle('active', button.dataset.codesMode === mode));
  panels.forEach(panel => panel.hidden = panel.dataset.codesPanel !== mode);
  if (updateUrl) history.replaceState(null, '', `?action=${encodeURIComponent(mode)}`);
}

async function loadBwip() {
  if (window.bwipjs?.toCanvas) return window.bwipjs;
  if (!bwipPromise) bwipPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/bwip-js@4.11.4/dist/bwip-js-min.js';
    script.crossOrigin = 'anonymous';
    script.onload = () => window.bwipjs?.toCanvas ? resolve(window.bwipjs) : reject(new Error('Barcode renderer did not initialize.'));
    script.onerror = () => reject(new Error('Could not load the barcode renderer.'));
    document.head.append(script);
  }).catch(error => { bwipPromise = null; throw error; });
  return bwipPromise;
}

async function renderCode(options) {
  const bwip = await loadBwip();
  bwip.toCanvas(canvas, options);
}

function qrFields() {
  const type = $('#qrType').value;
  const primary = $('#qrPrimary').value;
  if (type === 'text') return { text: primary };
  if (type === 'url') return { url: primary };
  if (type === 'wifi') return { ssid: primary, password: $('#qrExtra1')?.value || '', security: $('#qrExtra2')?.value || 'WPA', hidden: $('#qrExtra3')?.checked || false };
  if (type === 'email') return { email: primary, subject: $('#qrExtra1')?.value || '', body: $('#qrExtra2')?.value || '' };
  if (type === 'sms') return { phone: primary, message: $('#qrExtra1')?.value || '' };
  if (type === 'vcard') return { name: primary, phone: $('#qrExtra1')?.value || '', email: $('#qrExtra2')?.value || '', organization: $('#qrExtra3')?.value || '' };
  if (type === 'calendar') return { title: primary, start: $('#qrExtra1')?.value || '', end: $('#qrExtra2')?.value || '', location: $('#qrExtra3')?.value || '' };
  return {};
}

function renderQrExtraFields() {
  const type = $('#qrType').value;
  const extra = $('#qrExtraFields');
  const fields = {
    wifi: '<label><span>Password</span><input id="qrExtra1" type="password"></label><label><span>Security</span><select id="qrExtra2"><option>WPA</option><option>WEP</option><option>nopass</option></select></label><label class="codes-check"><input id="qrExtra3" type="checkbox"> Hidden network</label>',
    email: '<label><span>Subject</span><input id="qrExtra1"></label><label><span>Body</span><input id="qrExtra2"></label>',
    sms: '<label><span>Message</span><input id="qrExtra1"></label>',
    vcard: '<label><span>Phone</span><input id="qrExtra1"></label><label><span>Email</span><input id="qrExtra2" type="email"></label><label><span>Organization</span><input id="qrExtra3"></label>',
    calendar: '<label><span>Start</span><input id="qrExtra1" type="datetime-local"></label><label><span>End</span><input id="qrExtra2" type="datetime-local"></label><label><span>Location</span><input id="qrExtra3"></label>',
  };
  extra.innerHTML = fields[type] || '';
}

modes.forEach(button => button.addEventListener('click', () => setMode(button.dataset.codesMode)));
$('#qrType').addEventListener('change', renderQrExtraFields);

$('#generateQr').addEventListener('click', async () => {
  try {
    const payload = buildCodePayload($('#qrType').value, qrFields());
    await renderCode(barcodeOptions('qrcode', payload));
    show(payload);
  } catch (error) { show(`Error: ${error.message || error}`); }
});

$('#generateBarcode').addEventListener('click', async () => {
  try {
    const text = $('#barcodeText').value;
    const options = barcodeOptions($('#barcodeFormat').value, text);
    await renderCode(options);
    show(`${options.bcid}: ${text}`);
  } catch (error) { show(`Error: ${error.message || error}`); }
});

function downloadCanvas(name) {
  canvas.toBlob(blob => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = name; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, 'image/png');
}
$('#downloadCode').addEventListener('click', () => downloadCanvas('toolbox-qr.png'));
$('#downloadBarcode').addEventListener('click', () => downloadCanvas('toolbox-barcode.png'));

$('#scanCode').addEventListener('click', async () => {
  const file = $('#scanFile').files?.[0];
  if (!file) return show('Choose an image first.');
  if (!('BarcodeDetector' in window)) return show('BarcodeDetector is not available in this browser. Generation still works locally.');
  try {
    const formats = await BarcodeDetector.getSupportedFormats();
    const detector = new BarcodeDetector({ formats });
    const bitmap = await createImageBitmap(file);
    const found = await detector.detect(bitmap);
    bitmap.close?.();
    show(found.length ? found.map(item => `${item.format}: ${item.rawValue}`).join('\n') : 'No supported code detected.');
  } catch (error) { show(`Scan error: ${error.message || error}`); }
});

$('#generatePassword').addEventListener('click', () => {
  try {
    show(makePassword({
      length: Number($('#passwordLength').value), lower: $('#passwordLower').value === 'true', upper: $('#passwordUpper').value === 'true',
      digits: $('#passwordDigits').value === 'true', symbols: $('#passwordSymbols').checked,
    }));
  } catch (error) { show(`Error: ${error.message}`); }
});
$('#generatePassphrase').addEventListener('click', () => {
  try { show(generatePassphrase({ words: 6, separator: '-', capitalize: false })); }
  catch (error) { show(`Error: ${error.message}`); }
});
$('#generateUuid').addEventListener('click', () => { try { show(makeUuid()); } catch (error) { show(`Error: ${error.message}`); } });
$('#generateToken').addEventListener('click', () => {
  try { show(tokenFromBytes(secureBytes(Number($('#tokenBytes').value)), $('#tokenFormat').value)); }
  catch (error) { show(`Error: ${error.message}`); }
});
$('#copyCodesResult').addEventListener('click', async () => { try { await navigator.clipboard.writeText($('#codesResult').textContent); } catch {} });

renderQrExtraFields();
setMode(new URLSearchParams(location.search).get('action') || 'qr', { updateUrl: false });
