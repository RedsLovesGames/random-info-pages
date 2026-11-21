import {
  templates, sizes, layouts, patterns, fonts, emblems, palettes, shapes, backStyles,
  newProject, presetStyle, validateProject, limits,
} from './presets.mjs';
import { drawCard, cardDescription } from './render.mjs';
import { barcodeOptions } from '../tools/codes/codes-core.js';
import { loadBwip } from '../tools/codes/bwip-loader.js';

const get = id => document.getElementById(id);
const form = get('card-form');
const card = get('card');
const gallery = get('gallery');
const fieldList = get('custom-fields');
const save = get('save');
const status = get('save-status');
const photoStatus = get('photo-status');
const draftKey = 'rip-id-card-project-v1';
const imageTypes = ['photo', 'logo', 'background'];
const textKeys = ['title', 'name', 'role', 'organization', 'serial'];
const styleOptions = { layout: layouts, size: Object.fromEntries(Object.entries(sizes).map(([key, value]) => [key, value.label])),
  font: fonts, emblem: emblems, pattern: patterns, shape: shapes };
const rangeKeys = ['intensity', 'corners', 'photoZoom', 'photoX', 'photoY', 'backgroundOpacity'];
const colorKeys = ['paper', 'ink', 'accent'];
const backText = { 'back-title': ['title', limits.backTitle], 'back-note': ['note', limits.backNote], 'back-payload': ['payload', limits.payload] };
const canDraw = Boolean(card.getContext('2d'));
let project = newProject();
try {
  const draft = localStorage.getItem(draftKey);
  if (draft) {
    project = validateProject(JSON.parse(draft));
    get('project-status').textContent = 'Draft restored on this device';
  }
} catch {
  get('project-status').textContent = 'Draft could not be restored';
}
let activeSide = 'front';
let filter = 'All';
let draftTimer;
let lastTyping = null;
const past = [];
const future = [];
const imageCache = new Map();
const imageJobs = new Map();
let code = { key: '', canvas: null, message: '' };
let codeTimer;
let exporting = false;

function flushDraft() {
  if (!draftTimer) return;
  clearTimeout(draftTimer);
  draftTimer = null;
  try {
    localStorage.setItem(draftKey, JSON.stringify(project));
    get('project-status').textContent = 'Draft saved on this device';
  } catch {
    get('project-status').textContent = 'Autosave unavailable · Save editable project';
  }
}
window.addEventListener('pagehide', flushDraft);

function change(update, { typing = '', sync = true, fields = false } = {}) {
  if (!typing || lastTyping?.key !== typing || Date.now() - lastTyping.time > 650) {
    past.push(structuredClone(project));
    if (past.length > 32) past.shift();
  }
  lastTyping = typing ? { key: typing, time: Date.now() } : null;
  future.length = 0;
  update();
  finishChange(sync, fields);
}

function finishChange(sync, fields) {
  if (sync) syncControls();
  if (fields) renderFields();
  updateHistory();
  updatePreview();
  clearTimeout(draftTimer);
  get('project-status').textContent = 'Saving draft…';
  draftTimer = setTimeout(flushDraft, 400);
}

function updateHistory() {
  get('undo').disabled = !past.length;
  get('redo').disabled = !future.length;
}
function moveHistory(from, to) {
  if (!from.length) return;
  to.push(project);
  project = from.pop();
  lastTyping = null;
  imageJobs.clear();
  photoStatus.textContent = '';
  finishChange(true, true);
}

function addOptions(select, options) {
  select.replaceChildren(...Object.entries(options).map(([value, text]) => new Option(text, value)));
}
for (const [key, opts] of Object.entries(styleOptions)) addOptions(get(key), opts);
addOptions(get('back-design'), backStyles);
for (const key of textKeys) get(key).maxLength = limits[key];
for (const [id, [, maxLength]] of Object.entries(backText)) get(id).maxLength = maxLength;

function setSide(side) {
  activeSide = side;
  syncBackControls();
  updatePreview();
}
function syncBackControls() {
  get('front-details').hidden = activeSide !== 'front';
  get('back-details').hidden = activeSide !== 'back';
  get('code-details').hidden = project.back.code === 'none';
  get('code-content').hidden = project.back.useSerial;
  document.querySelectorAll('[data-side]').forEach(button => {
    button.setAttribute('aria-pressed', button.dataset.side === activeSide);
  });
}
function syncControls() {
  for (const key of textKeys) get(key).value = project[key];
  get('title').placeholder = templates[project.template].title;
  for (const key of [...Object.keys(styleOptions), ...rangeKeys, ...colorKeys]) get(key).value = project.style[key];
  for (const [id, [key]] of Object.entries(backText)) get(id).value = project.back[key];
  get('back-code').value = project.back.code;
  get('back-design').value = project.back.design;
  get('code-serial').checked = project.back.useSerial;
  syncBackControls();
  syncSelections();
}
function syncSelections() {
  gallery.querySelectorAll('[data-template]').forEach(button => {
    button.setAttribute('aria-pressed', button.dataset.template === project.template);
  });
  get('palettes').querySelectorAll('[data-palette]').forEach(button => {
    button.setAttribute('aria-pressed', button.dataset.palette === project.style.palette);
  });
}
function selectTemplate(key) {
  change(() => {
    const crop = Object.fromEntries(rangeKeys.slice(2).map(name => [name, project.style[name]]));
    project.template = key;
    project.style = { ...presetStyle(key), ...crop };
  });
}

const templateButtons = Object.entries(templates).map(([key, preset]) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'template-card';
  button.dataset.template = key;
  const thumb = document.createElement('span');
  thumb.className = 'thumb';
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  thumb.append(canvas);
  const title = document.createElement('span');
  title.className = 'template-title';
  title.textContent = preset.title;
  button.append(thumb, title);
  const sample = { ...newProject(), template: key, style: presetStyle(key), name: key === 'blank' ? '' : 'Alex Rivera' };
  drawCard(canvas, sample, 'front', {}, .22);
  button.addEventListener('click', () => selectTemplate(key));
  return { preset, button, canvas, sample, key };
});
const categoryButtons = ['All', ...new Set(Object.values(templates).map(preset => preset.category))].map(category => {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = category;
  button.addEventListener('click', () => {
    filter = category;
    renderGallery();
  });
  get('categories').append(button);
  return [category, button];
});

function renderGallery() {
  const matches = templateButtons.filter(({ preset }) => filter === 'All' || preset.category === filter);
  gallery.replaceChildren(...matches.map(item => item.button));
  gallery.scrollTop = 0;
  get('template-count').textContent = `${matches.length} ${matches.length === 1 ? 'template' : 'templates'}`;
  for (const [category, button] of categoryButtons) button.setAttribute('aria-pressed', category === filter);
  syncSelections();
}

for (const [key, colors] of Object.entries(palettes)) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'palette';
  button.dataset.palette = key;
  button.title = key[0].toUpperCase() + key.slice(1);
  button.setAttribute('aria-label', button.title + ' palette');
  for (const color of colors) {
    const chip = document.createElement('span');
    chip.style.backgroundColor = color;
    button.append(chip);
  }
  button.addEventListener('click', () => change(() => {
    colorKeys.forEach((name, i) => { project.style[name] = colors[i]; });
    project.style.palette = key;
  }));
  get('palettes').append(button);
}

function labeledControl(labelText, control) {
  const label = document.createElement('label');
  label.textContent = labelText;
  label.append(control);
  return label;
}
function renderFields() {
  fieldList.replaceChildren(...project.fields.map((field, index) => {
    const group = document.createElement('fieldset');
    group.className = 'custom-field form-grid';
    const legend = document.createElement('legend');
    legend.textContent = 'Field ' + (index + 1);
    const row = document.createElement('div');
    row.className = 'form-grid two';
    for (const [key, limit, placeholder] of [['label', limits.fieldLabel, 'e.g. Department'], ['value', limits.fieldValue, 'Optional']]) {
      const input = document.createElement('input');
      input.value = field[key];
      input.maxLength = limit;
      input.placeholder = placeholder;
      input.addEventListener('input', () => change(() => { field[key] = input.value; }, { typing: index + '-' + key, sync: false }));
      row.append(labeledControl(key === 'label' ? 'Label' : 'Value', input));
    }
    const bottom = document.createElement('div');
    bottom.className = 'bottom';
    const side = document.createElement('select');
    addOptions(side, { front: 'Front', back: 'Back', both: 'Both sides' });
    side.value = field.side;
    side.addEventListener('change', () => change(() => { field.side = side.value; }, { sync: false }));
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = 'Remove';
    remove.setAttribute('aria-label', 'Remove field ' + (index + 1));
    remove.addEventListener('click', () => {
      change(() => { project.fields.splice(index, 1); }, { sync: false, fields: true });
      (fieldList.children[Math.min(index, fieldList.children.length - 1)]?.querySelector('input') || get('add-field')).focus();
    });
    bottom.append(labeledControl('Show on', side), remove);
    group.append(legend, row, bottom);
    return group;
  }));
  get('add-field').disabled = project.fields.length >= 6;
}

function decodeImage(src) {
  const image = new Image();
  image.src = src;
  return image.decode().then(() => image);
}

async function prepareImage(file, key) {
  const url = URL.createObjectURL(file);
  try {
    const image = await decodeImage(url);
    const max = key === 'logo' ? 500 : 1200;
    const scale = Math.min(1, max / Math.max(image.naturalWidth, image.naturalHeight));
    const out = document.createElement('canvas');
    out.width = Math.max(1, Math.round(image.naturalWidth * scale));
    out.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = out.getContext('2d');
    context.drawImage(image, 0, 0, out.width, out.height);
    return out.toDataURL('image/webp', .85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function getAssets() {
  const assets = { code: code.canvas };
  for (const key of imageTypes) {
    const src = project.images[key];
    get(key + '-controls')?.toggleAttribute('hidden', !src);
    document.querySelector(`[data-remove="${key}"]`).hidden = !src && !imageJobs.has(key);
    let entry = imageCache.get(key);
    if (!src) { imageCache.delete(key); continue; }
    if (entry?.src !== src) {
      entry = { src, image: null, pending: true };
      imageCache.set(key, entry);
      decodeImage(src).then(image => { entry.image = image; }).catch(() => {
        if (project.images[key] === src) photoStatus.textContent = 'An image could not be opened. Remove it and try another.';
      }).finally(() => { entry.pending = false; updatePreview(); });
    }
    if (entry.image) assets[key] = entry.image;
  }
  return assets;
}

for (const key of imageTypes) {
  const input = get(key);
  const remove = document.querySelector(`[data-remove="${key}"]`);
  input.addEventListener('change', async () => {
    const file = input.files[0];
    input.value = '';
    if (!file) return;
    const token = Symbol(key);
    imageJobs.set(key, token);
    photoStatus.textContent = 'Loading image…';
    updatePreview();
    try {
      const src = await prepareImage(file, key);
      if (imageJobs.get(key) !== token) return;
      if (src.length > 2100000) throw new Error('Image too large.');
      change(() => { project.images[key] = src; }, { sync: false });
      photoStatus.textContent = 'Image added.';
    } catch {
      if (imageJobs.get(key) === token) photoStatus.textContent = 'This image could not be opened. Try a JPEG, PNG, or WebP.';
    } finally {
      if (imageJobs.get(key) === token) imageJobs.delete(key);
      updatePreview();
    }
  });
  remove.addEventListener('click', () => {
    imageJobs.delete(key);
    change(() => { project.images[key] = ''; }, { sync: false });
    photoStatus.textContent = 'Image removed.';
    input.focus();
  });
}

function updateCode() {
  const { code: format, payload, useSerial } = project.back;
  const value = (useSerial ? project.serial : payload).trim();
  const key = format + '\n' + value;
  if (key === code.key) return;
  clearTimeout(codeTimer);
  const next = code = { key, canvas: null, message: '' };
  if (format === 'none') return;
  if (!value) {
    next.message = useSerial ? 'Enter or generate a card number.' : 'Enter the content to encode.';
    return;
  }
  try {
    if (format === 'code128' && value.length > 32) throw new Error('Use 32 characters or fewer for a readable barcode.');
    const opts = barcodeOptions(format === 'qr' ? 'qrcode' : format, value);
    if (format === 'qr') {
      opts.padding = 16;
      opts.eclevel = 'M';
    } else {
      opts.includetext = false;
      opts.height = 15;
      opts.paddingwidth = 12;
    }
    opts.backgroundcolor = 'ffffff';
    next.message = 'Generating code…';
    codeTimer = setTimeout(async () => {
      try {
        const bwip = await loadBwip();
        const out = document.createElement('canvas');
        bwip.toCanvas(out, opts);
        next.canvas = out;
        next.message = 'Code ready.';
      } catch (error) {
        next.message = error.message;
        next.retry = true;
      } finally {
        if (code === next) updatePreview();
      }
    }, 140);
  } catch (error) {
    next.message = error.message;
  }
}

function updatePreview() {
  updateCode();
  const assets = getAssets();
  get('code-status').textContent = code.message;
  get('retry-code').hidden = !code.retry;
  get('stage').dataset.format = project.style.size;
  const size = sizes[project.style.size];
  get('card-format').textContent = `${size.label} · ${size.width} × ${size.height} px`;
  card.setAttribute('aria-label', cardDescription(project, activeSide));
  if (canDraw) drawCard(card, project, activeSide, assets);
  const mode = get('export-mode').value;
  const includesBack = mode !== 'active' || activeSide === 'back';
  const codeMissing = includesBack && project.back.code !== 'none' && !code.canvas;
  updateSaveState();
  get('export-scale').hidden = mode === 'print';
  save.textContent = mode === 'print' ? 'Print / PDF' : 'Download';
  status.textContent = !canDraw ? 'This browser cannot draw or export cards.' : codeMissing ? code.message : '';
  return assets;
}

for (const key of textKeys) get(key).addEventListener('input', event => {
  change(() => { project[key] = event.target.value; }, { typing: key, sync: false });
});
for (const [id, [key]] of Object.entries(backText)) get(id).addEventListener('input', event => {
  change(() => { project.back[key] = event.target.value; }, { typing: id, sync: false });
});
for (const key of Object.keys(styleOptions)) get(key).addEventListener('change', event => {
  change(() => { project.style[key] = event.target.value; }, { sync: false });
});
for (const key of rangeKeys) get(key).addEventListener('input', event => {
  change(() => { project.style[key] = Number(event.target.value); }, { typing: key, sync: false });
});
for (const key of colorKeys) get(key).addEventListener('input', event => {
  change(() => {
    project.style[key] = event.target.value;
    project.style.palette = 'custom';
    syncSelections();
  }, { typing: key, sync: false });
});
get('back-design').addEventListener('change', event => {
  change(() => { project.back.design = event.target.value; }, { sync: false });
});
get('back-code').addEventListener('change', event => {
  change(() => { project.back.code = event.target.value; syncBackControls(); }, { sync: false });
});
get('code-serial').addEventListener('change', event => {
  change(() => { project.back.useSerial = event.target.checked; syncBackControls(); }, { sync: false });
});
get('retry-code').addEventListener('click', () => { code.key = ''; updatePreview(); });

get('shuffle').addEventListener('click', () => {
  const candidates = templateButtons.filter(({ key, preset }) => key !== project.template &&
    (filter === 'All' || preset.category === filter));
  if (candidates.length) selectTemplate(candidates[Math.floor(Math.random() * candidates.length)].key);
});
get('reset-style').addEventListener('click', () => change(() => { project.style = presetStyle(project.template); }));
get('generate-serial').addEventListener('click', () => change(() => {
  const bytes = crypto.getRandomValues(new Uint8Array(3));
  project.serial = 'RIP-' + Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
}));
get('add-field').addEventListener('click', () => {
  if (project.fields.length >= 6) return;
  change(() => { project.fields.push({ label: '', value: '', side: activeSide }); }, { sync: false, fields: true });
  fieldList.lastElementChild.querySelector('input').focus();
});
get('undo').addEventListener('click', () => moveHistory(past, future));
get('redo').addEventListener('click', () => moveHistory(future, past));
get('reset').addEventListener('click', () => {
  closeMenu();
  change(() => { project = newProject(); imageJobs.clear(); }, { fields: true });
  photoStatus.textContent = '';
  filter = 'All';
  renderGallery();
  setSide('front');
  get('tab-templates').click();
  get('tab-templates').focus();
});

form.addEventListener('submit', event => event.preventDefault());
get('view-preview').addEventListener('click', () => {
  get('preview-heading').focus({ preventScroll: true });
  get('preview-heading').scrollIntoView({ block: 'start' });
});
document.querySelectorAll('[data-side]').forEach(button => button.addEventListener('click', () => setSide(button.dataset.side)));

const tabs = [...form.querySelectorAll('[role=tab]')];
function activateTab(tab, focus = false) {
  for (const button of tabs) {
    const active = tab === button;
    button.setAttribute('aria-selected', active);
    button.tabIndex = active ? 0 : -1;
    get(button.getAttribute('aria-controls')).hidden = !active;
  }
  if (focus) tab.focus();
}
tabs.forEach((button, index) => {
  button.addEventListener('click', () => activateTab(button));
  button.addEventListener('keydown', event => {
    const target = { ArrowLeft: (index + tabs.length - 1) % tabs.length, ArrowRight: (index + 1) % tabs.length, Home: 0, End: tabs.length - 1 }[event.key];
    if (target === undefined) return;
    event.preventDefault();
    activateTab(tabs[target], true);
  });
});

const menuToggle = get('open-project');
const menu = get('project-menu');
function closeMenu() {
  menu.hidden = true;
  menuToggle.setAttribute('aria-expanded', 'false');
}
menuToggle.addEventListener('click', () => {
  const open = menu.hidden;
  menu.hidden = !open;
  menuToggle.setAttribute('aria-expanded', open);
});
document.addEventListener('click', event => {
  if (!event.target.closest('.project-menu')) closeMenu();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !menu.hidden) {
    closeMenu();
    menuToggle.focus();
  }
  if (!(event.ctrlKey || event.metaKey) || event.altKey || event.target.closest?.('input,textarea,select,[contenteditable]')) return;
  const key = event.key.toLowerCase();
  if (key === 'z' || key === 'y') {
    event.preventDefault();
    if (key === 'y' || event.shiftKey) moveHistory(future, past);
    else moveHistory(past, future);
  }
});

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
get('save-project').addEventListener('click', () => {
  closeMenu();
  downloadBlob(new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' }), 'novelty-id-project.json');
  menuToggle.focus();
});
const importInput = get('project-file');
get('import-project').addEventListener('click', () => { closeMenu(); importInput.click(); menuToggle.focus(); });
importInput.addEventListener('change', async () => {
  const [file] = importInput.files;
  importInput.value = '';
  if (!file) return;
  try {
    if (file.size > 6800000) throw new Error('This project file is too large.');
    const next = validateProject(JSON.parse(await file.text()));
    await Promise.all(Object.values(next.images).filter(Boolean).map(decodeImage));
    change(() => { project = next; imageJobs.clear(); }, { fields: true });
    status.textContent = 'Project opened.';
  } catch (error) {
    status.textContent = error instanceof SyntaxError ? 'Choose a valid project JSON file.' : error.message || 'Could not open this project.';
  }
});

function exportCanvases(mode, scale, assets) {
  const sides = mode === 'active' ? [activeSide] : ['front', 'back'];
  return sides.map(side => {
    const canvas = document.createElement('canvas');
    drawCard(canvas, project, side, assets, scale);
    return canvas;
  });
}

function printCards(assets) {
  const size = sizes[project.style.size];
  const figures = exportCanvases('print', 2, assets).map((canvas, index) => {
    const figure = document.createElement('figure');
    const caption = document.createElement('figcaption');
    caption.textContent = index ? 'Back' : 'Front';
    canvas.style.width = size.mmWidth + 'mm';
    canvas.style.height = size.mmHeight + 'mm';
    figure.append(caption, canvas);
    return figure;
  });
  get('print-sheet').replaceChildren(...figures);
  window.print();
}

get('export-mode').addEventListener('change', updatePreview);
save.addEventListener('click', async () => {
  if (save.disabled) return;
  const assets = updatePreview();
  const mode = get('export-mode').value;
  if (mode === 'print') { printCards(assets); return; }
  const scale = Number(get('export-scale').value);
  const side = activeSide;
  const canvases = exportCanvases(mode, scale, assets);
  let canvas = canvases[0];
  if (canvases.length > 1) {
    const gap = 32 * scale;
    canvas = document.createElement('canvas');
    canvas.width = canvases[0].width * 2 + gap;
    canvas.height = canvases[0].height;
    const context = canvas.getContext('2d');
    canvases.forEach((part, index) => context.drawImage(part, index * (part.width + gap), 0));
  }
  exporting = true;
  save.disabled = true;
  try {
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('Could not create a PNG.');
    const suffix = mode === 'active' ? side : 'front-and-back';
    downloadBlob(blob, 'novelty-id-' + suffix + '.png');
    status.textContent = 'PNG downloaded.';
  } catch {
    status.textContent = 'Could not create a PNG. Try downloading again.';
  } finally {
    exporting = false;
    updateSaveState();
  }
});

function updateSaveState() {
  const mode = get('export-mode').value;
  const needsBack = mode !== 'active' || activeSide === 'back';
  const pending = imageJobs.size > 0 || [...imageCache.values()].some(entry => entry.pending);
  save.disabled = !canDraw || exporting || pending || (needsBack && project.back.code !== 'none' && !code.canvas);
}

renderGallery();
renderFields();
syncControls();
updatePreview();
if (document.fonts) document.fonts.load('700 64px "Instrument Serif"').then(() => {
  templateButtons.forEach(({ canvas, sample }) => drawCard(canvas, sample, 'front', {}, .22));
  updatePreview();
}).catch(() => {});
