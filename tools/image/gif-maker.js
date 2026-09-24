(function (root, factory) {
  const api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.GifMaker = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  const GIFENC_URL = 'https://cdn.jsdelivr.net/npm/gifenc@1.0.3/+esm';
  let gifencPromise = null;

  function delayFromFps(value) {
    const numeric = Number(value);
    const fps = Number.isFinite(numeric) ? Math.min(100, Math.max(1, numeric)) : 10;
    return Math.max(10, Math.round(1000 / fps));
  }

  function repeatFromLoop(value) {
    if (value === 'once') return -1;
    if (value === 'twice') return 1;
    if (value === 'three') return 2;
    return 0;
  }

  function containRect(sourceWidth, sourceHeight, targetWidth, targetHeight) {
    const sw = Number(sourceWidth);
    const sh = Number(sourceHeight);
    const tw = Number(targetWidth);
    const th = Number(targetHeight);
    if (![sw, sh, tw, th].every((value) => Number.isFinite(value) && value > 0)) {
      throw new Error('Frame dimensions must be positive numbers.');
    }
    const scale = Math.min(tw / sw, th / sh);
    const width = Math.max(1, Math.round(sw * scale));
    const height = Math.max(1, Math.round(sh * scale));
    return {
      x: Math.round((tw - width) / 2),
      y: Math.round((th - height) / 2),
      width,
      height,
    };
  }

  function moveFrame(frames, from, to) {
    const list = Array.from(frames || []);
    if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || from >= list.length || to < 0 || to >= list.length || from === to) return list;
    const [item] = list.splice(from, 1);
    list.splice(to, 0, item);
    return list;
  }

  function loadGifenc() {
    if (!gifencPromise) {
      gifencPromise = import(GIFENC_URL).catch((error) => {
        gifencPromise = null;
        throw new Error(`Could not load GIF encoder: ${error.message || error}`);
      });
    }
    return gifencPromise;
  }

  function initBrowserUi() {
    if (!root?.document) return;
    const $ = (selector) => root.document.querySelector(selector);
    const openButton = $('#gifMaker');
    const dialog = $('#gifDialog');
    const picker = $('#gifPicker');
    const addFramesButton = $('#gifAddFrames');
    const frameList = $('#gifFrameList');
    const widthInput = $('#gifWidth');
    const heightInput = $('#gifHeight');
    const fpsInput = $('#gifFps');
    const delayLabel = $('#gifDelayLabel');
    const loopInput = $('#gifLoop');
    const colorsInput = $('#gifColors');
    const createButton = $('#gifCreate');
    const cancelButton = $('#gifCancel');
    const downloadButton = $('#gifDownload');
    const preview = $('#gifPreview');
    const status = $('#gifStatus');
    if (!openButton || !dialog || !picker || !frameList) return;

    let frames = [];
    let outputBlob = null;
    let outputUrl = null;
    let encoding = false;
    let cancelRequested = false;

    function setStatus(message, kind = '') {
      status.textContent = message || '';
      status.className = `status-line${kind ? ` ${kind}` : ''}`;
    }

    function cleanupOutput() {
      if (outputUrl) root.URL.revokeObjectURL(outputUrl);
      outputUrl = null;
      outputBlob = null;
      preview.removeAttribute('src');
      preview.hidden = true;
      downloadButton.disabled = true;
    }

    function renderFrames() {
      frameList.innerHTML = '';
      if (!frames.length) {
        const empty = root.document.createElement('div');
        empty.className = 'queue-empty';
        empty.textContent = 'Add at least two images to make an animation.';
        frameList.append(empty);
      }
      frames.forEach((file, index) => {
        const row = root.document.createElement('div');
        row.className = 'gif-frame';
        const label = root.document.createElement('div');
        label.className = 'gif-frame-name';
        label.textContent = `${index + 1}. ${file.name}`;
        const actions = root.document.createElement('div');
        actions.className = 'queue-actions';
        const up = root.document.createElement('button');
        up.type = 'button';
        up.className = 'queue-btn';
        up.textContent = '↑';
        up.disabled = encoding || index === 0;
        up.setAttribute('aria-label', `Move ${file.name} earlier`);
        up.addEventListener('click', () => { frames = moveFrame(frames, index, index - 1); cleanupOutput(); renderFrames(); });
        const down = root.document.createElement('button');
        down.type = 'button';
        down.className = 'queue-btn';
        down.textContent = '↓';
        down.disabled = encoding || index === frames.length - 1;
        down.setAttribute('aria-label', `Move ${file.name} later`);
        down.addEventListener('click', () => { frames = moveFrame(frames, index, index + 1); cleanupOutput(); renderFrames(); });
        const remove = root.document.createElement('button');
        remove.type = 'button';
        remove.className = 'queue-btn';
        remove.textContent = 'Remove';
        remove.disabled = encoding;
        remove.addEventListener('click', () => { frames.splice(index, 1); cleanupOutput(); renderFrames(); });
        actions.append(up, down, remove);
        row.append(label, actions);
        frameList.append(row);
      });
      createButton.disabled = encoding || frames.length < 2;
      addFramesButton.disabled = encoding;
      cancelButton.hidden = !encoding;
      delayLabel.textContent = `${delayFromFps(fpsInput.value)} ms/frame`;
    }

    function addFrames(fileList) {
      const incoming = Array.from(fileList || []);
      const supported = incoming.filter((file) => root.ImageEngine?.isSupportedInputType?.(file.type));
      const rejected = incoming.length - supported.length;
      frames.push(...supported);
      cleanupOutput();
      renderFrames();
      if (rejected) setStatus(`${rejected} unsupported file${rejected === 1 ? '' : 's'} skipped.`, 'error');
      else if (supported.length) setStatus(`${supported.length} frame${supported.length === 1 ? '' : 's'} added.`);
    }

    async function decodeFrame(file, canvas, context) {
      const decoded = await root.ImageEngine.decodeFile(file);
      try {
        context.clearRect(0, 0, canvas.width, canvas.height);
        const rect = containRect(decoded.width, decoded.height, canvas.width, canvas.height);
        context.imageSmoothingEnabled = true;
        if ('imageSmoothingQuality' in context) context.imageSmoothingQuality = 'high';
        context.drawImage(decoded.drawable, rect.x, rect.y, rect.width, rect.height);
        return context.getImageData(0, 0, canvas.width, canvas.height);
      } finally {
        decoded.close();
      }
    }

    async function createGif() {
      if (frames.length < 2 || encoding) return;
      const outputWidth = Math.max(1, Math.min(2048, Math.round(Number(widthInput.value) || 480)));
      const outputHeight = Math.max(1, Math.min(2048, Math.round(Number(heightInput.value) || 480)));
      const maxPixels = outputWidth * outputHeight * frames.length;
      if (maxPixels > 180000000 && !root.confirm('This GIF is very large and may use substantial memory. Continue?')) return;

      encoding = true;
      cancelRequested = false;
      cleanupOutput();
      renderFrames();
      setStatus('Loading GIF encoder…');
      try {
        const { GIFEncoder, quantize, applyPalette } = await loadGifenc();
        const gif = GIFEncoder();
        const canvas = root.document.createElement('canvas');
        canvas.width = outputWidth;
        canvas.height = outputHeight;
        const context = canvas.getContext('2d', { alpha: true, willReadFrequently: true });
        if (!context) throw new Error('Could not create GIF canvas.');
        const delay = delayFromFps(fpsInput.value);
        const repeat = repeatFromLoop(loopInput.value);
        const colors = Math.min(256, Math.max(16, Number(colorsInput.value) || 128));

        for (let index = 0; index < frames.length; index += 1) {
          if (cancelRequested) throw new Error('GIF creation cancelled.');
          setStatus(`Encoding frame ${index + 1} of ${frames.length}…`);
          const imageData = await decodeFrame(frames[index], canvas, context);
          const palette = quantize(imageData.data, colors, {
            format: 'rgba4444',
            oneBitAlpha: 127,
            clearAlpha: true,
          });
          const indexed = applyPalette(imageData.data, palette, 'rgba4444');
          const transparentIndex = palette.findIndex((color) => color.length > 3 && color[3] === 0);
          gif.writeFrame(indexed, outputWidth, outputHeight, {
            palette,
            delay,
            repeat,
            transparent: transparentIndex >= 0,
            transparentIndex: transparentIndex >= 0 ? transparentIndex : 0,
          });
          await new Promise((resolve) => root.requestAnimationFrame(resolve));
        }

        gif.finish();
        outputBlob = new Blob([gif.bytes()], { type: 'image/gif' });
        outputUrl = root.URL.createObjectURL(outputBlob);
        preview.src = outputUrl;
        preview.hidden = false;
        downloadButton.disabled = false;
        setStatus(`GIF ready · ${outputWidth}×${outputHeight} · ${(outputBlob.size / 1024).toFixed(1)} KB.`, 'good');
      } catch (error) {
        setStatus(error.message || String(error), cancelRequested ? '' : 'error');
      } finally {
        encoding = false;
        cancelRequested = false;
        renderFrames();
      }
    }

    function downloadGif() {
      if (!outputBlob) return;
      const url = root.URL.createObjectURL(outputBlob);
      const anchor = root.document.createElement('a');
      anchor.href = url;
      anchor.download = 'random-info-pages.gif';
      root.document.body.append(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => root.URL.revokeObjectURL(url), 1000);
    }

    openButton.addEventListener('click', () => {
      if (!dialog.open) dialog.showModal();
      renderFrames();
    });
    addFramesButton.addEventListener('click', () => picker.click());
    picker.addEventListener('change', () => { addFrames(picker.files); picker.value = ''; });
    fpsInput.addEventListener('input', renderFrames);
    createButton.addEventListener('click', createGif);
    cancelButton.addEventListener('click', () => { cancelRequested = true; setStatus('Stopping after the current frame…'); });
    downloadButton.addEventListener('click', downloadGif);
    dialog.addEventListener('close', () => { if (encoding) cancelRequested = true; });
    root.addEventListener('beforeunload', cleanupOutput);
    renderFrames();
  }

  if (root?.document) {
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', initBrowserUi, { once: true });
    else initBrowserUi();
  }

  return { delayFromFps, repeatFromLoop, containRect, moveFrame, loadGifenc };
});
