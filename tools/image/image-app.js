(() => {
  const $ = (selector) => document.querySelector(selector);
  const picker = $('#picker');
  const drop = $('#drop');
  const preview = $('#preview');
  const sourceMeta = $('#sourceMeta');
  const queue = $('#queue');
  const format = $('#format');
  const resizeMode = $('#resizeMode');
  const width = $('#width');
  const height = $('#height');
  const percent = $('#percent');
  const preventUpscale = $('#preventUpscale');
  const quality = $('#quality');
  const qualityValue = $('#qualityValue');
  const qualityWrap = $('#qualityWrap');
  const dimensions = $('#dimensions');
  const percentWrap = $('#percentWrap');
  const targetSizeEnabled = $('#targetSizeEnabled');
  const targetSizeControls = $('#targetSizeControls');
  const targetSize = $('#targetSize');
  const targetUnit = $('#targetUnit');
  const preserveResolutionWrap = $('#preserveResolutionWrap');
  const preserveResolution = $('#preserveResolution');
  const targetSizeHint = $('#targetSizeHint');
  const processSelected = $('#processSelected');
  const processAll = $('#processAll');
  const downloadAll = $('#downloadAll');
  const cancelBatch = $('#cancelBatch');
  const clearAll = $('#clearAll');
  const progressBar = $('#progressBar');
  const status = $('#status');
  const showOriginal = $('#showOriginal');
  const showResult = $('#showResult');

  let items = [];
  let selectedId = null;
  let previewUrl = null;
  let batchController = null;
  let previewMode = 'original';
  let nextId = 1;

  function bytes(value) {
    const size = Number(value) || 0;
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  }

  function setStatus(message, kind = '') {
    status.textContent = message || '';
    status.className = `status-line${kind ? ` ${kind}` : ''}`;
  }

  function selectedItem() {
    return items.find((item) => item.id === selectedId) || null;
  }

  function inputFor(item) {
    return item?.workingFile || item?.file || null;
  }

  function announceSelection() {
    window.dispatchEvent(new CustomEvent('imagestudio:selectionchange', { detail: { item: selectedItem() } }));
  }

  function releasePreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = null;
  }

  function releaseResult(item) {
    if (item?.resultUrl) URL.revokeObjectURL(item.resultUrl);
    if (item) {
      item.resultUrl = null;
      item.result = null;
    }
  }

  function fileLabel(item) {
    if (item.status === 'processing') return 'Processing';
    if (item.status === 'done') {
      const target = item.result.targetReached === false ? ' · best effort' : '';
      return `${bytes(item.result.outputSize)} · ${item.result.width}×${item.result.height}${target}`;
    }
    if (item.status === 'error') return item.error || 'Failed';
    const source = inputFor(item);
    return `${bytes(source.size)} · ${source.type.replace('image/', '').toUpperCase()}${item.workingFile ? ' · edited' : ''}`;
  }

  function renderQueue() {
    queue.innerHTML = '';
    if (!items.length) {
      const empty = document.createElement('div');
      empty.className = 'queue-empty';
      empty.textContent = 'No files yet.';
      queue.append(empty);
    }
    for (const item of items) {
      const row = document.createElement('div');
      row.className = `queue-item${item.id === selectedId ? ' selected' : ''}`;
      const main = document.createElement('button');
      main.type = 'button';
      main.className = 'queue-main queue-btn';
      Object.assign(main.style, { textAlign: 'left', border: '0', background: 'transparent', padding: '0' });
      const name = document.createElement('span');
      name.className = 'queue-name';
      name.textContent = item.file.name;
      const meta = document.createElement('span');
      meta.className = 'queue-meta';
      const dot = document.createElement('span');
      dot.className = `status-dot ${item.status || 'pending'}`;
      meta.append(dot, document.createTextNode(fileLabel(item)));
      main.append(name, meta);
      main.addEventListener('click', () => selectItem(item.id));
      const actions = document.createElement('div');
      actions.className = 'queue-actions';
      if (item.result) {
        const download = document.createElement('button');
        download.type = 'button';
        download.className = 'queue-btn';
        download.textContent = 'Download';
        download.addEventListener('click', () => downloadResult(item));
        actions.append(download);
      }
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'queue-btn';
      remove.textContent = 'Remove';
      remove.disabled = Boolean(batchController);
      remove.addEventListener('click', () => removeItem(item.id));
      actions.append(remove);
      row.append(main, actions);
      queue.append(row);
    }
    const busy = Boolean(batchController);
    processSelected.disabled = !selectedItem() || busy;
    processAll.disabled = !items.length || busy;
    clearAll.disabled = !items.length || busy;
    downloadAll.disabled = !items.some((item) => item.result) || busy;
  }

  function updatePreviewButtons(item) {
    showOriginal.disabled = !item;
    showResult.disabled = !item || !item.result;
    showOriginal.classList.toggle('active', previewMode === 'original');
    showResult.classList.toggle('active', previewMode === 'result');
  }

  function showPreview(item, mode = previewMode) {
    releasePreview();
    preview.innerHTML = '';
    previewMode = mode === 'result' && item?.result ? 'result' : 'original';
    updatePreviewButtons(item);
    if (!item) {
      const empty = document.createElement('div');
      empty.className = 'preview-empty';
      empty.textContent = 'Choose an image to preview it.';
      preview.append(empty);
      sourceMeta.textContent = 'PNG, JPEG and WebP are processed entirely on this device.';
      return;
    }
    const source = previewMode === 'result' ? item.result.blob : inputFor(item);
    previewUrl = URL.createObjectURL(source);
    const image = new Image();
    image.alt = item.file.name;
    image.decoding = 'async';
    image.src = previewUrl;
    image.addEventListener('load', () => {
      if (previewMode === 'original') {
        item.width = image.naturalWidth;
        item.height = image.naturalHeight;
        if (!width.value) width.value = item.width;
        if (!height.value) height.value = item.height;
      }
      updateSourceMeta(item);
    });
    image.addEventListener('error', () => setStatus(`Could not preview ${item.file.name}.`, 'error'));
    preview.append(image);
    updateSourceMeta(item);
  }

  function updateSourceMeta(item) {
    if (!item) return;
    if (previewMode === 'result' && item.result) {
      const target = item.result.targetReached === false ? ' · target not reached' : item.result.targetReached ? ' · target reached' : '';
      const reduced = item.result.resolutionReduced ? ' · resolution reduced' : '';
      sourceMeta.textContent = `${item.result.name} · ${item.result.width}×${item.result.height} · ${bytes(item.result.outputSize)} · ${item.result.outputMime}${target}${reduced}`;
    } else {
      const source = inputFor(item);
      const dims = item.width && item.height ? ` · ${item.width}×${item.height}` : '';
      const edited = item.workingFile ? ' · edited source' : '';
      sourceMeta.textContent = `${source.name}${dims} · ${bytes(source.size)} · ${source.type}${edited}`;
    }
  }

  function selectItem(id) {
    selectedId = id;
    previewMode = items.find((item) => item.id === id)?.result ? 'result' : 'original';
    showPreview(selectedItem(), previewMode);
    renderQueue();
    announceSelection();
  }

  function removeItem(id) {
    const index = items.findIndex((item) => item.id === id);
    if (index < 0) return;
    const [removed] = items.splice(index, 1);
    releaseResult(removed);
    if (selectedId === id) {
      selectedId = items[Math.min(index, items.length - 1)]?.id || null;
      previewMode = selectedItem()?.result ? 'result' : 'original';
      showPreview(selectedItem(), previewMode);
    }
    renderQueue();
    announceSelection();
  }

  function addFiles(fileList) {
    const incoming = Array.from(fileList || []);
    const supported = incoming.filter((file) => ImageEngine.isSupportedInputType(file.type));
    const rejected = incoming.length - supported.length;
    for (const file of supported) items.push({ id: nextId++, file, workingFile: null, status: 'pending', result: null, resultUrl: null, error: '' });
    if (!selectedId && items.length) selectedId = items[0].id;
    if (selectedItem()) showPreview(selectedItem(), selectedItem().result ? 'result' : 'original');
    renderQueue();
    announceSelection();
    if (rejected) setStatus(`${rejected} unsupported file${rejected === 1 ? '' : 's'} skipped.`, 'error');
    else if (supported.length) setStatus(`${supported.length} image${supported.length === 1 ? '' : 's'} added.`);
  }

  function resizeOptions() {
    const mode = resizeMode.value;
    const base = { mode, preventUpscale: preventUpscale.checked };
    if (mode === 'width' || mode === 'max-width') base.width = Number(width.value);
    if (mode === 'height' || mode === 'max-height') base.height = Number(height.value);
    if (mode === 'percent') base.percent = Number(percent.value);
    if (mode === 'fit' || mode === 'fill' || mode === 'exact') {
      base.width = Number(width.value);
      base.height = Number(height.value);
    }
    return base;
  }

  function conversionOptions() {
    return { outputMime: format.value, quality: Number(quality.value), backgroundColor: '#ffffff', resize: resizeOptions() };
  }

  function activeTarget() {
    if (!targetSizeEnabled.checked || format.value === 'image/png') return null;
    return { bytes: ImageCore.parseTargetBytes(Number(targetSize.value), targetUnit.value), preserveResolution: preserveResolution.checked };
  }

  function warnForLarge(files) {
    const large = files.filter((file) => ImageEngine.shouldWarnForLargeFile(file));
    if (!large.length) return true;
    return window.confirm(`${large.length} selected image${large.length === 1 ? ' is' : 's are'} larger than 25 MB. Processing may use substantial memory. Continue?`);
  }

  async function processOne(item) {
    const source = inputFor(item);
    if (!item || !source || !warnForLarge([source])) return;
    item.status = 'processing';
    item.error = '';
    releaseResult(item);
    renderQueue();
    const target = activeTarget();
    setStatus(target ? `Searching for a result near ${bytes(target.bytes)}…` : `Processing ${source.name} locally…`);
    try {
      item.result = target
        ? await ImageEngine.compressToTarget(source, conversionOptions(), target.bytes, {
            preserveResolution: target.preserveResolution,
            onAttempt(info) { setStatus(`Trying ${Math.round(info.quality * 100)}% quality · ${bytes(info.outputBytes)} / ${bytes(info.targetBytes)} target…`); },
          })
        : await ImageEngine.convertFile(source, conversionOptions());
      item.resultUrl = URL.createObjectURL(item.result.blob);
      item.status = 'done';
      const note = item.result.targetReached === false ? ' Best effort: target was not reached.' : '';
      setStatus(`Finished ${item.result.name}: ${bytes(item.result.outputSize)}.${note}`, item.result.targetReached === false ? 'error' : 'good');
      showPreview(item, 'result');
    } catch (error) {
      item.status = 'error';
      item.error = error.message || String(error);
      setStatus(item.error, 'error');
    }
    renderQueue();
  }

  async function processBatch() {
    if (!items.length || batchController) return;
    const inputs = items.map(inputFor);
    if (!warnForLarge(inputs)) return;
    batchController = new AbortController();
    cancelBatch.hidden = false;
    progressBar.style.width = '0%';
    const target = activeTarget();
    setStatus(target ? `Processing ${items.length} images toward ${bytes(target.bytes)} each…` : `Processing ${items.length} images locally…`);
    for (const item of items) {
      releaseResult(item);
      item.status = 'pending';
      item.error = '';
    }
    renderQueue();
    const controller = batchController;
    const results = await ImageEngine.processBatch(inputs, conversionOptions(), {
      signal: controller.signal,
      targetBytes: target?.bytes,
      preserveResolution: target?.preserveResolution,
      onProgress(info) {
        const item = items[info.index];
        if (!item) return;
        item.status = info.status === 'done' ? 'done' : info.status === 'error' ? 'error' : 'processing';
        if (info.entry?.result) {
          item.result = info.entry.result;
          item.resultUrl = URL.createObjectURL(item.result.blob);
        }
        if (info.entry?.error) item.error = info.entry.error.message || String(info.entry.error);
        progressBar.style.width = `${Math.round(resultsSoFarCount() / items.length * 100)}%`;
        renderQueue();
      },
    });
    const aborted = controller.signal.aborted;
    batchController = null;
    cancelBatch.hidden = true;
    progressBar.style.width = aborted ? `${Math.round(results.length / items.length * 100)}%` : '100%';
    const succeeded = items.filter((item) => item.status === 'done').length;
    const failed = items.filter((item) => item.status === 'error').length;
    const misses = items.filter((item) => item.result?.targetReached === false).length;
    setStatus(aborted ? `Batch stopped. ${succeeded} completed.` : `${succeeded} completed${failed ? ` · ${failed} failed` : ''}${misses ? ` · ${misses} target miss${misses === 1 ? '' : 'es'}` : ''}.`, failed || misses ? 'error' : 'good');
    if (selectedItem()?.result) showPreview(selectedItem(), 'result');
    renderQueue();
  }

  function resultsSoFarCount() {
    return items.filter((item) => item.status === 'done' || item.status === 'error').length;
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function downloadResult(item) {
    if (item?.result) downloadBlob(item.result.blob, item.result.name);
  }

  function loadFflate() {
    if (window.fflate?.zip) return Promise.resolve(window.fflate);
    return new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-fflate]');
      if (existing) {
        existing.addEventListener('load', () => resolve(window.fflate), { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      }
      const script = document.createElement('script');
      script.dataset.fflate = 'true';
      script.src = 'https://cdn.jsdelivr.net/npm/fflate@0.8.3/umd/index.js';
      script.crossOrigin = 'anonymous';
      script.onload = () => window.fflate?.zip ? resolve(window.fflate) : reject(new Error('ZIP library did not initialize.'));
      script.onerror = () => reject(new Error('Could not load ZIP support. Individual downloads still work.'));
      document.head.append(script);
    });
  }

  async function downloadAllResults() {
    const successful = items.filter((item) => item.result).map((item) => ({ result: item.result }));
    if (!successful.length) return;
    if (successful.length === 1) return downloadBlob(successful[0].result.blob, successful[0].result.name);
    downloadAll.disabled = true;
    setStatus('Building ZIP locally…');
    try {
      const fflate = await loadFflate();
      const zip = await ImageEngine.createZipBlob(successful, fflate);
      downloadBlob(zip, 'random-info-pages-images.zip');
      setStatus(`ZIP ready · ${successful.length} files · ${bytes(zip.size)}.`, 'good');
    } catch (error) {
      setStatus(error.message || String(error), 'error');
    } finally {
      downloadAll.disabled = false;
    }
  }

  function applyWorkingFile(file) {
    const item = selectedItem();
    if (!item || !file) return;
    item.workingFile = file;
    item.status = 'pending';
    item.error = '';
    releaseResult(item);
    previewMode = 'original';
    showPreview(item, 'original');
    renderQueue();
    announceSelection();
    setStatus(`Source edit applied to ${item.file.name}.`, 'good');
  }

  function resetWorkingFile() {
    const item = selectedItem();
    if (!item?.workingFile) return;
    item.workingFile = null;
    item.status = 'pending';
    item.error = '';
    releaseResult(item);
    previewMode = 'original';
    showPreview(item, 'original');
    renderQueue();
    announceSelection();
    setStatus(`Restored original source for ${item.file.name}.`);
  }

  function updateControlVisibility() {
    const mode = resizeMode.value;
    dimensions.hidden = !['width', 'height', 'max-width', 'max-height', 'fit', 'fill', 'exact'].includes(mode);
    percentWrap.hidden = mode !== 'percent';
    width.closest('label').hidden = !['width', 'max-width', 'fit', 'fill', 'exact'].includes(mode);
    height.closest('label').hidden = !['height', 'max-height', 'fit', 'fill', 'exact'].includes(mode);
    qualityWrap.hidden = format.value === 'image/png';
    const targetAllowed = format.value !== 'image/png';
    targetSizeEnabled.disabled = !targetAllowed;
    if (!targetAllowed) targetSizeEnabled.checked = false;
    const targetOn = targetAllowed && targetSizeEnabled.checked;
    targetSizeControls.hidden = !targetOn;
    preserveResolutionWrap.hidden = !targetOn;
    targetSizeHint.hidden = !targetOn;
  }

  drop.addEventListener('click', () => picker.click());
  drop.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); picker.click(); }
  });
  picker.addEventListener('change', () => { addFiles(picker.files); picker.value = ''; });
  for (const type of ['dragenter', 'dragover']) drop.addEventListener(type, (event) => { event.preventDefault(); drop.classList.add('drag'); });
  for (const type of ['dragleave', 'drop']) drop.addEventListener(type, (event) => { event.preventDefault(); drop.classList.remove('drag'); });
  drop.addEventListener('drop', (event) => addFiles(event.dataTransfer.files));
  quality.addEventListener('input', () => { qualityValue.textContent = `${quality.value}%`; });
  resizeMode.addEventListener('change', updateControlVisibility);
  format.addEventListener('change', updateControlVisibility);
  targetSizeEnabled.addEventListener('change', updateControlVisibility);
  processSelected.addEventListener('click', () => processOne(selectedItem()));
  processAll.addEventListener('click', processBatch);
  downloadAll.addEventListener('click', downloadAllResults);
  cancelBatch.addEventListener('click', () => {
    if (batchController) { batchController.abort(); setStatus('Stopping after the current image…'); }
  });
  clearAll.addEventListener('click', () => {
    releasePreview();
    for (const item of items) releaseResult(item);
    items = [];
    selectedId = null;
    showPreview(null);
    renderQueue();
    announceSelection();
    setStatus('Queue cleared.');
    progressBar.style.width = '0%';
  });
  showOriginal.addEventListener('click', () => showPreview(selectedItem(), 'original'));
  showResult.addEventListener('click', () => showPreview(selectedItem(), 'result'));
  window.addEventListener('beforeunload', () => {
    releasePreview();
    for (const item of items) releaseResult(item);
  });

  window.ImageStudioApp = {
    getSelectedItem: selectedItem,
    getInputFile: () => inputFor(selectedItem()),
    applyWorkingFile,
    resetWorkingFile,
    setStatus,
    isBusy: () => Boolean(batchController),
  };

  updateControlVisibility();
  renderQueue();
  showPreview(null);
  announceSelection();
})();
