const PDFLIB_URL = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/+esm';
const PDFJS_URL = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.3.289/build/pdf.min.mjs';
const PDFJS_WORKER_URL = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.3.289/build/pdf.worker.min.mjs';
const FFLATE_URL = 'https://cdn.jsdelivr.net/npm/fflate@0.8.3/+esm';
const TESSERACT_URL = 'https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/tesseract.esm.min.js';

let pdfLibPromise;
let pdfJsPromise;
let fflatePromise;
let tesseractPromise;

export async function loadPdfLib() {
  pdfLibPromise ||= import(PDFLIB_URL);
  return pdfLibPromise;
}

export async function loadPdfJs() {
  pdfJsPromise ||= import(PDFJS_URL).then(pdfjs => {
    pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
    return pdfjs;
  });
  return pdfJsPromise;
}

async function loadFflate() {
  fflatePromise ||= import(FFLATE_URL);
  return fflatePromise;
}

async function loadTesseract() {
  tesseractPromise ||= import(TESSERACT_URL);
  return tesseractPromise;
}

export async function readPdfFile(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdfjs = await loadPdfJs();
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(bytes) });
  const pdfjsDoc = await loadingTask.promise;
  return { name: file.name, bytes, pdfjsDoc, pageCount: pdfjsDoc.numPages, size: file.size };
}

export async function openPdfBytes(bytes, name = 'document.pdf') {
  const safeBytes = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const pdfjs = await loadPdfJs();
  const pdfjsDoc = await pdfjs.getDocument({ data: new Uint8Array(safeBytes) }).promise;
  return { name, bytes: safeBytes, pdfjsDoc, pageCount: pdfjsDoc.numPages, size: safeBytes.byteLength };
}

export async function renderDescriptor(source, descriptor, canvas, { maxWidth = 900, maxHeight = 1180, scale = null } = {}) {
  const ctx = canvas.getContext('2d', { alpha: false });
  if (descriptor.blank) {
    const ratio = (descriptor.height || 792) / (descriptor.width || 612);
    canvas.width = Math.max(1, Math.min(maxWidth, descriptor.width || 612));
    canvas.height = Math.max(1, Math.round(canvas.width * ratio));
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return { width: canvas.width, height: canvas.height };
  }
  const page = await source.pdfjsDoc.getPage(descriptor.sourceIndex + 1);
  const base = page.getViewport({ scale: 1, rotation: ((page.rotate || 0) + (descriptor.rotation || 0)) % 360 });
  const fitScale = scale || Math.min(maxWidth / base.width, maxHeight / base.height, 2);
  const viewport = page.getViewport({ scale: Math.max(.1, fitScale), rotation: ((page.rotate || 0) + (descriptor.rotation || 0)) % 360 });
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport }).promise;
  return { width: canvas.width, height: canvas.height, page, viewport };
}

export async function renderDescriptorBlob(source, descriptor, { type = 'image/png', quality = .9, scale = 1.5 } = {}) {
  const canvas = document.createElement('canvas');
  await renderDescriptor(source, descriptor, canvas, { maxWidth: 10000, maxHeight: 10000, scale });
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Could not encode page image.')), type, quality));
}

async function loadSourceDocs(sources) {
  const { PDFDocument } = await loadPdfLib();
  return Promise.all(sources.map(source => PDFDocument.load(source.bytes, { ignoreEncryption: false })));
}

function drawOverlays(page, state, pageIndex, font, rgb, degrees) {
  const { width, height } = page.getSize();
  if (state.watermark?.text) {
    const text = state.watermark.text.slice(0, 160);
    const size = Math.max(16, Math.min(64, Math.min(width, height) / 10));
    const textWidth = font.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: Math.max(18, (width - textWidth) / 2), y: Math.max(18, height / 2), size, font,
      color: rgb(.45, .45, .45), opacity: Math.max(.03, Math.min(.9, Number(state.watermark.opacity ?? .18))),
      rotate: degrees(Number(state.watermark.angle ?? -35)),
    });
  }
  if (state.pageNumbers) {
    const label = String((Number(state.pageNumbers.start) || 1) + pageIndex);
    const size = 10;
    const textWidth = font.widthOfTextAtSize(label, size);
    page.drawText(label, { x: (width - textWidth) / 2, y: 18, size, font, color: rgb(.25, .25, .25) });
  }
}

export async function buildWorkingPdf(sources, state) {
  const { PDFDocument, StandardFonts, rgb, degrees } = await loadPdfLib();
  const sourceDocs = await loadSourceDocs(sources);
  const output = await PDFDocument.create();
  const font = await output.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < state.pages.length; i++) {
    const descriptor = state.pages[i];
    let page;
    if (descriptor.blank) {
      page = output.addPage([descriptor.width || 612, descriptor.height || 792]);
    } else {
      const src = sourceDocs[descriptor.sourceDoc];
      if (!src) throw new Error('A source PDF used by this page is no longer available.');
      [page] = await output.copyPages(src, [descriptor.sourceIndex]);
      output.addPage(page);
      const existing = page.getRotation()?.angle || 0;
      page.setRotation(degrees(((existing + Number(descriptor.rotation || 0)) % 360 + 360) % 360));
    }
    drawOverlays(page, state, i, font, rgb, degrees);
  }
  return new Uint8Array(await output.save({ useObjectStreams: true, addDefaultPage: false, updateFieldAppearances: true }));
}

export async function buildImagePdf(files) {
  const { PDFDocument } = await loadPdfLib();
  const doc = await PDFDocument.create();
  for (const file of files) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const isPng = file.type === 'image/png' || /\.png$/i.test(file.name);
    const image = isPng ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
    const { width, height } = image.scale(1);
    const page = doc.addPage([width, height]);
    page.drawImage(image, { x: 0, y: 0, width, height });
  }
  return new Uint8Array(await doc.save({ useObjectStreams: true }));
}

export async function extractText(sources, state, pageNumbers) {
  const chosen = pageNumbers?.length ? new Set(pageNumbers) : null;
  const chunks = [];
  for (let i = 0; i < state.pages.length; i++) {
    if (chosen && !chosen.has(i + 1)) continue;
    const descriptor = state.pages[i];
    if (descriptor.blank) { chunks.push(`--- Page ${i + 1} ---\n`); continue; }
    const page = await sources[descriptor.sourceDoc].pdfjsDoc.getPage(descriptor.sourceIndex + 1);
    const content = await page.getTextContent();
    const text = content.items.map(item => item.str || '').join(' ').replace(/\s+/g, ' ').trim();
    chunks.push(`--- Page ${i + 1} ---\n${text}`);
  }
  return chunks.join('\n\n');
}

export async function getMetadata(source) {
  const result = await source.pdfjsDoc.getMetadata();
  return { info: result.info || {}, metadata: result.metadata?.getAll?.() || {}, pageCount: source.pdfjsDoc.numPages };
}

export async function pagesToZip(sources, state, pageNumbers, { type = 'image/png', quality = .9, scale = 1.5 } = {}) {
  const { zipSync } = await loadFflate();
  const chosen = pageNumbers?.length ? pageNumbers : state.pages.map((_, i) => i + 1);
  const entries = {};
  for (const pageNumber of chosen) {
    const descriptor = state.pages[pageNumber - 1];
    const source = descriptor.blank ? null : sources[descriptor.sourceDoc];
    const blob = await renderDescriptorBlob(source, descriptor, { type, quality, scale });
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const ext = type.includes('jpeg') ? 'jpg' : 'png';
    entries[`page-${String(pageNumber).padStart(3, '0')}.${ext}`] = bytes;
  }
  return new Blob([zipSync(entries, { level: 0 })], { type: 'application/zip' });
}

export async function rasterCompressPdf(sources, state, { quality = .68, scale = 1.15, onProgress = () => {} } = {}) {
  const { PDFDocument } = await loadPdfLib();
  const output = await PDFDocument.create();
  for (let i = 0; i < state.pages.length; i++) {
    const descriptor = state.pages[i];
    const canvas = document.createElement('canvas');
    if (descriptor.blank) {
      await renderDescriptor(null, descriptor, canvas, { scale });
    } else {
      await renderDescriptor(sources[descriptor.sourceDoc], descriptor, canvas, { maxWidth: 10000, maxHeight: 10000, scale });
    }
    const jpeg = await new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Could not encode compressed page.')), 'image/jpeg', quality));
    const embedded = await output.embedJpg(new Uint8Array(await jpeg.arrayBuffer()));
    const pageWidth = descriptor.blank ? (descriptor.width || 612) : canvas.width / scale;
    const pageHeight = descriptor.blank ? (descriptor.height || 792) : canvas.height / scale;
    const page = output.addPage([pageWidth, pageHeight]);
    page.drawImage(embedded, { x: 0, y: 0, width: pageWidth, height: pageHeight });
    onProgress((i + 1) / state.pages.length);
  }
  return new Uint8Array(await output.save({ useObjectStreams: true }));
}

export async function ocrPages(sources, state, pageNumbers, { language = 'eng', onProgress = () => {} } = {}) {
  const { createWorker } = await loadTesseract();
  const selected = pageNumbers?.length ? pageNumbers : state.pages.map((_, i) => i + 1);
  const worker = await createWorker(language, undefined, { logger: message => {
    if (message.status === 'recognizing text' && Number.isFinite(message.progress)) onProgress(message.progress);
  }});
  const chunks = [];
  try {
    for (let i = 0; i < selected.length; i++) {
      const pageNumber = selected[i];
      const descriptor = state.pages[pageNumber - 1];
      const canvas = document.createElement('canvas');
      if (descriptor.blank) await renderDescriptor(null, descriptor, canvas, { scale: 1.6 });
      else await renderDescriptor(sources[descriptor.sourceDoc], descriptor, canvas, { maxWidth: 10000, maxHeight: 10000, scale: 1.6 });
      const result = await worker.recognize(canvas);
      chunks.push(`--- Page ${pageNumber} ---\n${String(result.data?.text || '').trim()}`);
      onProgress((i + 1) / selected.length);
    }
  } finally {
    await worker.terminate();
  }
  return chunks.join('\n\n');
}
