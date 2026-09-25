import { createHistory } from '../shared/history.js';
import { downloadBlob, formatBytes, safeFilename } from '../shared/files.js';
import {
  createPdfState, rotatePages, deletePages, duplicatePages, reorderPage,
  appendSourcePages, insertBlankPage, setWatermark, setPageNumbers,
  subsetState, parsePageRanges, normalizeSelection,
} from './pdf-core.js';
import {
  readPdfFile, openPdfBytes, renderDescriptor, buildWorkingPdf, buildImagePdf,
  extractText, getMetadata, pagesToZip, rasterCompressPdf, ocrPages,
} from './pdf-engine.js';

const $ = selector => document.querySelector(selector);
const drop = $('#pdfDrop'), input = $('#pdfInput'), workspace = $('#pdfWorkspace');
const sourceName = $('#sourceName'), sourceMeta = $('#sourceMeta'), pageCount = $('#pageCount');
const rail = $('#pageRail'), preview = $('#pdfPreview'), selectionCount = $('#selectionCount');
const selectionHint = $('#selectionHint'), panel = $('#actionPanel'), progress = $('#pdfProgress');
const progressBar = $('#progressBar'), progressLabel = $('#progressLabel'), progressValue = $('#progressValue');
const historyPanel = $('#historyPanel'), historyList = $('#historyList');
const mergeInput = $('#mergeInput'), imagePdfInput = $('#imagePdfInput');

let sources = [];
let state = null;
let history = null;
let selection = new Set();
let currentPage = 1;
let renderToken = 0;
let thumbObserver = null;
let dragFrom = null;

function selectedPages({ fallbackCurrent = true } = {}) {
  const selected = normalizeSelection([...selection], state?.pages.length || 0);
  if (selected.length) return selected;
  return fallbackCurrent && state?.pages.length ? [Math.min(currentPage, state.pages.length)] : [];
}

function snapshot(label, nextState) {
  state = nextState;
  history.push({ label, state });
  currentPage = Math.min(currentPage, state.pages.length);
  selection = new Set(normalizeSelection([...selection], state.pages.length));
  if (!selection.size && state.pages.length) selection.add(currentPage);
  renderAll();
}

function setBusy(label, value = 0) {
  progress.hidden = false;
  progressLabel.textContent = label;
  updateProgress(value);
}

function updateProgress(value) {
  const safe = Math.max(0, Math.min(1, Number(value) || 0));
  progressBar.value = safe;
  progressValue.textContent = `${Math.round(safe * 100)}%`;
}

function clearBusy() { progress.hidden = true; }

function fail(error) {
  clearBusy();
  showPanel('Something went wrong', `<p class="pdf-note">${escapeHtml(error?.message || String(error))}</p>`);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[ch]));
}

function showPanel(title, html = '', bind = null) {
  panel.innerHTML = `<div class="pdf-panel-head"><strong>${escapeHtml(title)}</strong><button class="tb-toolbutton" type="button" data-close-panel>Close</button></div>${html}`;
  panel.hidden = false;
  panel.querySelector('[data-close-panel]')?.addEventListener('click', () => panel.hidden = true);
  bind?.(panel);
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function closePanel() { panel.hidden = true; panel.innerHTML = ''; }

async function loadPrimary(file) {
  if (!file) return;
  setBusy('Loading PDF…', .05);
  try {
    const source = await readPdfFile(file);
    sources = [source];
    state = createPdfState(source.pageCount, 0);
    history = createHistory(state, { initialLabel: `Loaded ${file.name}` });
    selection = new Set(source.pageCount ? [1] : []);
    currentPage = 1;
    sourceName.textContent = file.name;
    drop.hidden = true;
    workspace.hidden = false;
    closePanel();
    renderAll();
    updateProgress(1);
    setTimeout(clearBusy, 120);
  } catch (error) { fail(error); }
}

async function mergeFiles(files) {
  const pdfs = [...files].filter(file => file.type === 'application/pdf' || /\.pdf$/i.test(file.name));
  if (!pdfs.length) return;
  setBusy(`Adding ${pdfs.length} PDF${pdfs.length === 1 ? '' : 's'}…`, 0);
  try {
    let next = state;
    for (let i = 0; i < pdfs.length; i++) {
      const source = await readPdfFile(pdfs[i]);
      const sourceDoc = sources.length;
      sources.push(source);
      next = appendSourcePages(next, sourceDoc, source.pageCount);
      updateProgress((i + 1) / pdfs.length);
    }
    snapshot(`Merged ${pdfs.length} PDF${pdfs.length === 1 ? '' : 's'}`, next);
    currentPage = Math.max(1, state.pages.length - pdfs.reduce((n, file) => n, 0));
    closePanel();
  } catch (error) { fail(error); }
  finally { clearBusy(); }
}

async function addImagesAsPdf(files) {
  const images = [...files].filter(file => /image\/(png|jpeg)/.test(file.type) || /\.(png|jpe?g)$/i.test(file.name));
  if (!images.length) return;
  setBusy('Converting images to PDF pages…', .1);
  try {
    const bytes = await buildImagePdf(images);
    const source = await openPdfBytes(bytes, 'images.pdf');
    const sourceDoc = sources.length;
    sources.push(source);
    snapshot(`Added ${images.length} image${images.length === 1 ? '' : 's'}`, appendSourcePages(state, sourceDoc, source.pageCount));
  } catch (error) { fail(error); }
  finally { clearBusy(); }
}

function renderAll() {
  if (!state) return;
  sourceMeta.textContent = `${state.pages.length} page${state.pages.length === 1 ? '' : 's'} · ${formatBytes(sources.reduce((sum, source) => sum + (source.size || source.bytes.byteLength || 0), 0))} source data`;
  pageCount.textContent = state.pages.length;
  renderSelection();
  renderRail();
  renderPreview();
  renderHistory();
  $('#undoPdf').disabled = !history?.canUndo();
  $('#redoPdf').disabled = !history?.canRedo();
}

function renderSelection() {
  const selected = selectedPages({ fallbackCurrent: false });
  selectionCount.textContent = selected.length ? `${selected.length} page${selected.length === 1 ? '' : 's'} selected` : 'No pages selected';
  selectionHint.textContent = selected.length > 1 ? selected.join(', ') : 'Click a page. Ctrl/Cmd-click adds to selection.';
}

function renderRail() {
  if (thumbObserver) thumbObserver.disconnect();
  rail.innerHTML = '';
  state.pages.forEach((descriptor, index) => {
    const pageNumber = index + 1;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `pdf-thumb${selection.has(pageNumber) ? ' selected' : ''}${currentPage === pageNumber ? ' current' : ''}`;
    button.dataset.page = pageNumber;
    button.draggable = true;
    button.innerHTML = `<canvas width="120" height="156" aria-hidden="true"></canvas><span class="pdf-thumb-label"><span>Page ${pageNumber}</span><span>${descriptor.rotation ? `${descriptor.rotation}°` : descriptor.blank ? 'Blank' : ''}</span></span>`;
    button.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey) {
        selection.has(pageNumber) ? selection.delete(pageNumber) : selection.add(pageNumber);
      } else if (event.shiftKey && selection.size) {
        const start = Math.min(...selection), end = pageNumber;
        selection = new Set(Array.from({ length: Math.abs(end - start) + 1 }, (_, i) => Math.min(start, end) + i));
      } else {
        selection = new Set([pageNumber]);
      }
      currentPage = pageNumber;
      renderAll();
    });
    button.addEventListener('dragstart', () => { dragFrom = pageNumber; rail.classList.add('dragging'); });
    button.addEventListener('dragend', () => { dragFrom = null; rail.classList.remove('dragging'); rail.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over')); });
    button.addEventListener('dragover', event => { event.preventDefault(); button.classList.add('drag-over'); });
    button.addEventListener('dragleave', () => button.classList.remove('drag-over'));
    button.addEventListener('drop', event => {
      event.preventDefault(); button.classList.remove('drag-over');
      if (!dragFrom || dragFrom === pageNumber) return;
      snapshot(`Moved page ${dragFrom} to ${pageNumber}`, reorderPage(state, dragFrom, pageNumber));
      currentPage = pageNumber;
      selection = new Set([pageNumber]);
    });
    rail.append(button);
  });
  thumbObserver = new IntersectionObserver(entries => {
    entries.filter(entry => entry.isIntersecting).forEach(async entry => {
      const button = entry.target;
      if (button.dataset.rendered) return;
      button.dataset.rendered = '1';
      const pageNumber = Number(button.dataset.page), descriptor = state.pages[pageNumber - 1];
      try {
        const source = descriptor.blank ? null : sources[descriptor.sourceDoc];
        await renderDescriptor(source, descriptor, button.querySelector('canvas'), { maxWidth: 130, maxHeight: 180 });
      } catch { button.querySelector('canvas').style.background = '#2b1717'; }
      thumbObserver?.unobserve(button);
    });
  }, { root: rail, rootMargin: '100px' });
  rail.querySelectorAll('.pdf-thumb').forEach(el => thumbObserver.observe(el));
}

async function renderPreview() {
  const token = ++renderToken;
  if (!state.pages.length) return;
  currentPage = Math.max(1, Math.min(currentPage, state.pages.length));
  $('#previewPageLabel').textContent = `Page ${currentPage} of ${state.pages.length}`;
  const descriptor = state.pages[currentPage - 1];
  try {
    const source = descriptor.blank ? null : sources[descriptor.sourceDoc];
    const width = Math.max(320, Math.min(920, $('.pdf-preview-stage').clientWidth - 52));
    await renderDescriptor(source, descriptor, preview, { maxWidth: width, maxHeight: 1200 });
    if (token !== renderToken) return;
  } catch (error) { if (token === renderToken) fail(error); }
}

function renderHistory() {
  if (!history) return;
  const entries = history.entries();
  historyList.innerHTML = entries.map(entry => `<li${entry.current ? ' style="color:var(--acid)"' : ''}>${escapeHtml(entry.label)}</li>`).join('');
}

async function downloadState(targetState = state, filename = null) {
  setBusy('Building PDF…', .1);
  try {
    const bytes = await buildWorkingPdf(sources, targetState);
    downloadBlob(new Blob([bytes], { type: 'application/pdf' }), filename || safeFilename(sourceName.textContent.replace(/\.pdf$/i, '') + '-edited.pdf'));
    updateProgress(1);
  } catch (error) { fail(error); }
  finally { setTimeout(clearBusy, 120); }
}

function selectedOrAll() {
  const chosen = selectedPages({ fallbackCurrent: false });
  return chosen.length ? chosen : state.pages.map((_, i) => i + 1);
}

async function runAction(action) {
  const selected = selectedPages();
  try {
    switch (action) {
      case 'merge': mergeInput.click(); break;
      case 'reorder': showPanel('Reorder pages', '<p class="pdf-note">Drag page thumbnails up or down in the page rail. The change is recorded in History and can be undone.</p>'); break;
      case 'rotate': snapshot(`Rotated ${selected.length} page${selected.length === 1 ? '' : 's'}`, rotatePages(state, selected, 90)); break;
      case 'delete': snapshot(`Deleted ${selected.length} page${selected.length === 1 ? '' : 's'}`, deletePages(state, selected)); break;
      case 'duplicate': snapshot(`Duplicated ${selected.length} page${selected.length === 1 ? '' : 's'}`, duplicatePages(state, selected)); break;
      case 'blank': snapshot('Inserted blank page', insertBlankPage(state, currentPage)); break;
      case 'extract': await downloadState(subsetState(state, selected), `pages-${selected.join('-')}.pdf`); break;
      case 'split': showSplitPanel(); break;
      case 'page-numbers': showPageNumberPanel(); break;
      case 'watermark': showWatermarkPanel(); break;
      case 'pdf-images': await exportImages(); break;
      case 'extract-text': await extractDocumentText(false); break;
      case 'ocr': await extractDocumentText(true); break;
      case 'compress': showCompressPanel(); break;
      case 'metadata': await showMetadata(); break;
      case 'flatten': snapshot('Flatten forms on export', { ...state, flattenForms: true }); showPanel('Flatten forms', '<p class="pdf-note">Form fields will be flattened into page content when you download the working PDF.</p>'); break;
    }
  } catch (error) { fail(error); }
}

function showSplitPanel() {
  showPanel('Split PDF', `<form class="pdf-action-form" id="splitForm"><label>Page ranges<input id="splitRanges" value="1-${state.pages.length}" placeholder="1-3, 4-8"></label><p class="pdf-note">Each comma-separated range downloads as its own PDF. Use a single range to extract one section.</p><div class="pdf-actions-row"><button class="pdf-primary" type="submit">Split & download</button></div></form>`, root => {
    root.querySelector('#splitForm').addEventListener('submit', async event => {
      event.preventDefault();
      const raw = root.querySelector('#splitRanges').value;
      const tokens = raw.split(',').map(v => v.trim()).filter(Boolean);
      if (!tokens.length) throw new Error('Enter at least one page range.');
      for (let i = 0; i < tokens.length; i++) {
        const pages = parsePageRanges(tokens[i], state.pages.length);
        await downloadState(subsetState(state, pages), `split-${i + 1}-pages-${pages[0]}-${pages.at(-1)}.pdf`);
      }
    });
  });
}

function showPageNumberPanel() {
  showPanel('Page numbers', `<form class="pdf-action-form" id="numbersForm"><label>Start number<input id="numberStart" type="number" min="1" value="${state.pageNumbers?.start || 1}"></label><div class="pdf-actions-row"><button class="pdf-primary" type="submit">Apply</button><button class="tb-toolbutton" type="button" id="removeNumbers">Remove</button></div></form>`, root => {
    root.querySelector('#numbersForm').addEventListener('submit', event => { event.preventDefault(); snapshot('Added page numbers', setPageNumbers(state, { start: root.querySelector('#numberStart').value })); closePanel(); });
    root.querySelector('#removeNumbers').addEventListener('click', () => { snapshot('Removed page numbers', setPageNumbers(state, false)); closePanel(); });
  });
}

function showWatermarkPanel() {
  showPanel('Watermark', `<form class="pdf-action-form" id="watermarkForm"><label>Text<input id="watermarkText" maxlength="160" value="${escapeHtml(state.watermark?.text || 'DRAFT')}"></label><label>Opacity<input id="watermarkOpacity" type="range" min="0.03" max="0.8" step="0.01" value="${state.watermark?.opacity || .18}"></label><label>Angle<input id="watermarkAngle" type="number" min="-180" max="180" value="${state.watermark?.angle ?? -35}"></label><div class="pdf-actions-row"><button class="pdf-primary" type="submit">Apply</button><button class="tb-toolbutton" type="button" id="removeWatermark">Remove</button></div></form>`, root => {
    root.querySelector('#watermarkForm').addEventListener('submit', event => { event.preventDefault(); snapshot('Updated watermark', setWatermark(state, { text: root.querySelector('#watermarkText').value, opacity: root.querySelector('#watermarkOpacity').value, angle: root.querySelector('#watermarkAngle').value })); closePanel(); });
    root.querySelector('#removeWatermark').addEventListener('click', () => { snapshot('Removed watermark', setWatermark(state, null)); closePanel(); });
  });
}

async function exportImages() {
  const pages = selectedOrAll();
  setBusy(`Rendering ${pages.length} page${pages.length === 1 ? '' : 's'}…`, .05);
  try {
    const zip = await pagesToZip(sources, state, pages, { type: 'image/png', scale: 1.5 });
    downloadBlob(zip, 'pdf-pages.zip');
    updateProgress(1);
  } finally { setTimeout(clearBusy, 120); }
}

async function extractDocumentText(useOcr) {
  const pages = selectedOrAll();
  setBusy(useOcr ? 'Running local OCR…' : 'Extracting text…', .02);
  try {
    const text = useOcr
      ? await ocrPages(sources, state, pages, { onProgress: updateProgress })
      : await extractText(sources, state, pages);
    updateProgress(1);
    showPanel(useOcr ? 'OCR result' : 'Extracted text', `<div class="pdf-result" id="textResult">${escapeHtml(text || 'No text found.')}</div><div class="pdf-actions-row" style="margin-top:12px"><button class="tb-toolbutton" id="copyText" type="button">Copy</button><button class="tb-toolbutton" id="downloadText" type="button">Download TXT</button></div>`, root => {
      root.querySelector('#copyText').addEventListener('click', () => navigator.clipboard.writeText(text));
      root.querySelector('#downloadText').addEventListener('click', () => downloadBlob(new Blob([text], { type: 'text/plain;charset=utf-8' }), `${sourceName.textContent.replace(/\.pdf$/i, '')}-${useOcr ? 'ocr' : 'text'}.txt`));
    });
  } finally { setTimeout(clearBusy, 120); }
}

function showCompressPanel() {
  showPanel('Compress copy', `<form class="pdf-action-form" id="compressForm"><p class="pdf-note">This mode rasterizes pages into JPEG images. It can greatly reduce scan/image-heavy PDFs, but selectable text, forms, links, and vector content will be flattened. Your working document is not changed.</p><label>Quality<select id="compressQuality"><option value="0.82">Light</option><option value="0.68" selected>Balanced</option><option value="0.5">Maximum</option></select></label><div class="pdf-actions-row"><button class="pdf-primary" type="submit">Create compressed copy</button></div></form>`, root => {
    root.querySelector('#compressForm').addEventListener('submit', async event => {
      event.preventDefault();
      setBusy('Compressing pages…', 0);
      try {
        const bytes = await rasterCompressPdf(sources, state, { quality: Number(root.querySelector('#compressQuality').value), onProgress: updateProgress });
        downloadBlob(new Blob([bytes], { type: 'application/pdf' }), `${sourceName.textContent.replace(/\.pdf$/i, '')}-compressed.pdf`);
      } catch (error) { fail(error); }
      finally { setTimeout(clearBusy, 120); }
    });
  });
}

async function showMetadata() {
  setBusy('Reading metadata…', .2);
  try {
    const meta = await getMetadata(sources[0]);
    const rows = { ...meta.info, ...meta.metadata, WorkingPages: state.pages.length, SourceFiles: sources.length };
    const html = Object.entries(rows).filter(([, value]) => value != null && String(value).trim()).map(([key, value]) => `<div><strong>${escapeHtml(key)}</strong><br><span class="pdf-note">${escapeHtml(value)}</span></div>`).join('<hr style="border:0;border-top:1px solid var(--line);margin:10px 0">');
    showPanel('PDF metadata', html || '<p class="pdf-note">No document metadata found.</p>');
  } finally { clearBusy(); }
}

drop.addEventListener('click', () => input.click());
drop.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); input.click(); } });
for (const type of ['dragenter','dragover']) drop.addEventListener(type, event => { event.preventDefault(); drop.classList.add('drag'); });
for (const type of ['dragleave','drop']) drop.addEventListener(type, event => { event.preventDefault(); drop.classList.remove('drag'); });
drop.addEventListener('drop', event => loadPrimary([...event.dataTransfer.files].find(file => file.type === 'application/pdf' || /\.pdf$/i.test(file.name))));
input.addEventListener('change', () => loadPrimary(input.files[0]));
$('#replacePdf').addEventListener('click', () => { input.value = ''; input.click(); });
$('#addPdf').addEventListener('click', () => mergeInput.click());
$('#addImages').addEventListener('click', () => imagePdfInput.click());
mergeInput.addEventListener('change', () => mergeFiles(mergeInput.files));
imagePdfInput.addEventListener('change', () => addImagesAsPdf(imagePdfInput.files));

document.querySelectorAll('[data-pdf-action]').forEach(button => button.addEventListener('click', () => runAction(button.dataset.pdfAction)));
$('#selectAllPages').addEventListener('click', () => { selection = new Set(state.pages.map((_, i) => i + 1)); renderAll(); });
$('#clearSelection').addEventListener('click', () => { selection.clear(); renderSelection(); renderRail(); });
$('#prevPage').addEventListener('click', () => { currentPage = Math.max(1, currentPage - 1); selection = new Set([currentPage]); renderAll(); });
$('#nextPage').addEventListener('click', () => { currentPage = Math.min(state.pages.length, currentPage + 1); selection = new Set([currentPage]); renderAll(); });
$('#undoPdf').addEventListener('click', () => { if (!history?.canUndo()) return; state = history.undo(); currentPage = Math.min(currentPage, state.pages.length); selection = new Set([currentPage]); renderAll(); });
$('#redoPdf').addEventListener('click', () => { if (!history?.canRedo()) return; state = history.redo(); currentPage = Math.min(currentPage, state.pages.length); selection = new Set([currentPage]); renderAll(); });
$('#showHistory').addEventListener('click', () => { historyPanel.hidden = !historyPanel.hidden; renderHistory(); });
$('#closeHistory').addEventListener('click', () => historyPanel.hidden = true);
$('#downloadPdf').addEventListener('click', () => downloadState());

const requestedAction = new URL(location.href).searchParams.get('action');
if (requestedAction) {
  input.addEventListener('change', () => setTimeout(() => document.querySelector(`[data-pdf-action="${CSS.escape(requestedAction)}"]`)?.focus(), 200), { once: true });
}
