/*
 * Background-removal orchestration adapted for the Random Info Pages static
 * architecture from Suemura/client-side-image-converter (MIT), revision
 * 4bde3a9b07af41585df18ce61dd493d58bfc7cf9.
 *
 * U²-Net u2netp model: Apache-2.0, distributed by danielgatis/rembg and
 * mirrored at the pinned upstream revision below. Images never leave the
 * browser; only runtime/model assets are downloaded on first use.
 */
(function (root, factory) {
  const api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.BgRemove = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  const ORT_VERSION = '1.30.0';
  const ORT_WEBGPU_URL = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/ort.webgpu.min.js`;
  const ORT_WASM_URL = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/ort.min.js`;
  const ORT_ASSET_BASE = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/`;
  const MODEL_URL = 'https://cdn.jsdelivr.net/gh/Suemura/client-side-image-converter@4bde3a9b07af41585df18ce61dd493d58bfc7cf9/public/models/u2netp.onnx';
  const MODEL_CACHE = 'rip-toolbox-models-v1';
  const LARGE_PIXEL_WARNING = 20_000_000;

  let ortPromise = null;
  let sessionPromise = null;

  function outputFileName(filename) {
    const clean = String(filename || 'image').trim() || 'image';
    const slash = Math.max(clean.lastIndexOf('/'), clean.lastIndexOf('\\'));
    const base = clean.slice(slash + 1);
    const dot = base.lastIndexOf('.');
    const stem = dot > 0 ? base.slice(0, dot) : base;
    return `${stem || 'image'}-no-bg.png`;
  }

  function progressPercent(loaded, total) {
    const l = Number(loaded);
    const t = Number(total);
    if (!Number.isFinite(l) || !Number.isFinite(t) || t <= 0) return null;
    return Math.max(0, Math.min(100, Math.round((l / t) * 100)));
  }

  function loadScript(url, marker) {
    if (!root?.document) return Promise.reject(new Error('Background removal requires a browser.'));
    return new Promise((resolve, reject) => {
      const existing = root.document.querySelector(`script[${marker}]`);
      const done = () => root.ort ? resolve(root.ort) : reject(new Error('ONNX Runtime did not initialize.'));
      if (existing) {
        if (root.ort) return resolve(root.ort);
        existing.addEventListener('load', done, { once: true });
        existing.addEventListener('error', () => reject(new Error('Could not load ONNX Runtime.')), { once: true });
        return;
      }
      const script = root.document.createElement('script');
      script.setAttribute(marker, 'true');
      script.src = url;
      script.crossOrigin = 'anonymous';
      script.onload = done;
      script.onerror = () => reject(new Error('Could not load ONNX Runtime.'));
      root.document.head.append(script);
    });
  }

  async function loadOrt(onStage) {
    if (root?.ort) return root.ort;
    if (!ortPromise) {
      ortPromise = (async () => {
        onStage?.('runtime', 0, null);
        try {
          await loadScript(ORT_WEBGPU_URL, 'data-ort-webgpu');
        } catch (_) {
          await loadScript(ORT_WASM_URL, 'data-ort-wasm');
        }
        const ort = root.ort;
        if (!ort?.InferenceSession || !ort?.Tensor) throw new Error('ONNX Runtime is unavailable.');
        ort.env.wasm.wasmPaths = ORT_ASSET_BASE;
        ort.env.wasm.numThreads = root.crossOriginIsolated ? Math.max(1, Math.min(4, root.navigator?.hardwareConcurrency || 1)) : 1;
        ort.env.wasm.proxy = false;
        onStage?.('runtime', 1, 1);
        return ort;
      })().catch((error) => {
        ortPromise = null;
        throw error;
      });
    }
    return ortPromise;
  }

  async function readResponseWithProgress(response, onProgress) {
    const header = response.headers.get('content-length');
    const total = header ? Number.parseInt(header, 10) : null;
    if (!response.body) {
      const bytes = new Uint8Array(await response.arrayBuffer());
      onProgress?.(bytes.length, total || bytes.length);
      return bytes;
    }
    const reader = response.body.getReader();
    const chunks = [];
    let loaded = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      loaded += value.length;
      onProgress?.(loaded, total);
    }
    const output = new Uint8Array(loaded);
    let offset = 0;
    for (const chunk of chunks) {
      output.set(chunk, offset);
      offset += chunk.length;
    }
    return output;
  }

  async function loadModel(onStage) {
    let cache = null;
    if (root?.caches) {
      try { cache = await root.caches.open(MODEL_CACHE); } catch (_) {}
    }
    try {
      const cached = await cache?.match(MODEL_URL);
      if (cached) {
        const bytes = new Uint8Array(await cached.arrayBuffer());
        onStage?.('model', bytes.length, bytes.length);
        return bytes;
      }
    } catch (_) {}

    const response = await root.fetch(MODEL_URL, { mode: 'cors', cache: 'force-cache' });
    if (!response.ok) throw new Error(`Could not download background-removal model (${response.status}).`);
    const bytes = await readResponseWithProgress(response, (loaded, total) => onStage?.('model', loaded, total));
    try {
      await cache?.put(MODEL_URL, new Response(bytes.slice().buffer, {
        headers: { 'content-type': 'application/octet-stream', 'content-length': String(bytes.length) },
      }));
    } catch (_) {}
    return bytes;
  }

  async function warmup(ort, session) {
    const core = root.BgRemoveCore;
    const size = core.INPUT_SIZE;
    const input = new ort.Tensor('float32', new Float32Array(3 * size * size), [1, 3, size, size]);
    try {
      const results = await session.run({ [session.inputNames[0]]: input });
      for (const tensor of Object.values(results)) tensor?.dispose?.();
    } finally {
      input.dispose?.();
    }
  }

  async function createSession(onStage) {
    if (sessionPromise) return sessionPromise;
    sessionPromise = (async () => {
      const core = root.BgRemoveCore;
      if (!core) throw new Error('Background-removal core did not load.');
      const ort = await loadOrt(onStage);
      const model = await loadModel(onStage);
      const canWebGpu = Boolean(root.navigator?.gpu) && !/iPad|iPhone|iPod/i.test(root.navigator?.userAgent || '');
      if (canWebGpu) {
        let gpuSession = null;
        try {
          onStage?.('session-webgpu', 0, null);
          gpuSession = await ort.InferenceSession.create(model, { executionProviders: ['webgpu'], graphOptimizationLevel: 'all' });
          await warmup(ort, gpuSession);
          onStage?.('session-webgpu', 1, 1);
          return { ort, session: gpuSession, backend: 'webgpu' };
        } catch (_) {
          try { gpuSession?.release?.(); } catch (_) {}
        }
      }
      onStage?.('session-wasm', 0, null);
      const wasmSession = await ort.InferenceSession.create(model, { executionProviders: ['wasm'], graphOptimizationLevel: 'all' });
      onStage?.('session-wasm', 1, 1);
      return { ort, session: wasmSession, backend: 'wasm' };
    })().catch((error) => {
      sessionPromise = null;
      throw error;
    });
    return sessionPromise;
  }

  async function removeBackgroundRgba(rgba, width, height, onStage) {
    const core = root.BgRemoveCore;
    if (!core) throw new Error('Background-removal core did not load.');
    if (!core.isRemovableSize(width, height)) throw new Error(`Background removal supports images up to ${core.MAX_INPUT_DIMENSION}px on the longest side.`);

    onStage?.('preprocess', 0, 1);
    const resized = core.resizeRgbaBilinear(rgba, width, height, core.INPUT_SIZE, core.INPUT_SIZE);
    const inputData = core.rgbaToNormalizedTensor(resized, core.INPUT_SIZE, core.INPUT_SIZE);
    onStage?.('preprocess', 1, 1);

    const handle = await createSession(onStage);
    onStage?.('inference', 0, 1, handle.backend);
    const input = new handle.ort.Tensor('float32', inputData, [1, 3, core.INPUT_SIZE, core.INPUT_SIZE]);
    let saliency;
    try {
      const results = await handle.session.run({ [handle.session.inputNames[0]]: input });
      const output = results[handle.session.outputNames[0]];
      saliency = Float32Array.from(output.data);
      for (const tensor of Object.values(results)) tensor?.dispose?.();
    } finally {
      input.dispose?.();
    }
    onStage?.('inference', 1, 1, handle.backend);

    onStage?.('postprocess', 0, 1, handle.backend);
    const normalized = core.normalizeMaskMinMax(saliency);
    const mask = core.resizeMaskBilinear(normalized, core.INPUT_SIZE, core.INPUT_SIZE, width, height);
    const output = core.applyMaskToAlpha(rgba, mask);
    onStage?.('postprocess', 1, 1, handle.backend);
    return { rgba: output, backend: handle.backend };
  }

  function initBrowserUi() {
    if (!root?.document) return;
    const $ = (selector) => root.document.querySelector(selector);
    const openButton = $('#removeBgSelected');
    const dialog = $('#bgRemoveDialog');
    const preview = $('#bgRemovePreview');
    const runButton = $('#bgRemoveRun');
    const applyButton = $('#bgRemoveApply');
    const downloadButton = $('#bgRemoveDownload');
    const status = $('#bgRemoveStatus');
    const progress = $('#bgRemoveProgress');
    const backendLabel = $('#bgRemoveBackend');
    if (!openButton || !dialog || !preview || !runButton || !status) return;

    let sourceFile = null;
    let sourceUrl = null;
    let resultBlob = null;
    let resultUrl = null;
    let busy = false;
    let generation = 0;

    function app() { return root.ImageStudioApp; }
    function releaseSource() { if (sourceUrl) root.URL.revokeObjectURL(sourceUrl); sourceUrl = null; }
    function releaseResult() { if (resultUrl) root.URL.revokeObjectURL(resultUrl); resultUrl = null; resultBlob = null; }
    function clearAssets() {
      releaseSource();
      releaseResult();
      preview.removeAttribute('src');
      preview.hidden = true;
    }
    function setStatus(message, kind = '') {
      status.textContent = message || '';
      status.className = `status-line${kind ? ` ${kind}` : ''}`;
    }
    function updateButtons() {
      const selected = app()?.getSelectedItem?.();
      openButton.disabled = !selected || Boolean(app()?.isBusy?.()) || busy;
      runButton.disabled = busy || !sourceFile;
      applyButton.disabled = busy || !resultBlob;
      downloadButton.disabled = busy || !resultBlob;
    }
    function stageMessage(stage, loaded, total, backend) {
      const percent = progressPercent(loaded, total);
      if (progress) progress.style.width = percent == null ? '0%' : `${percent}%`;
      if (stage === 'runtime') return percent == null ? 'Loading ONNX Runtime…' : `Loading ONNX Runtime · ${percent}%`;
      if (stage === 'model') return percent == null ? 'Downloading U²-Net model…' : `Downloading U²-Net model · ${percent}%`;
      if (stage === 'session-webgpu') return 'Starting WebGPU inference engine…';
      if (stage === 'session-wasm') return 'Starting WASM inference engine…';
      if (stage === 'preprocess') return 'Preparing image locally…';
      if (stage === 'inference') return `Removing background locally${backend ? ` · ${backend.toUpperCase()}` : ''}…`;
      if (stage === 'postprocess') return 'Applying transparency mask…';
      return 'Working locally…';
    }
    function onStage(stage, loaded, total, backend) {
      setStatus(stageMessage(stage, loaded, total, backend));
      if (backend && backendLabel) backendLabel.textContent = backend.toUpperCase();
    }

    async function openDialog() {
      const file = app()?.getInputFile?.();
      if (!file || busy) return;
      generation += 1;
      clearAssets();
      sourceFile = file;
      sourceUrl = root.URL.createObjectURL(file);
      preview.src = sourceUrl;
      preview.hidden = false;
      if (progress) progress.style.width = '0%';
      if (backendLabel) backendLabel.textContent = 'AUTO';
      setStatus('Ready. First use downloads the local AI runtime and ~4.6 MB model; later runs can use the browser cache.');
      if (!dialog.open) dialog.showModal();
      updateButtons();
    }

    async function runRemoval() {
      if (!sourceFile || busy) return;
      const token = ++generation;
      busy = true;
      releaseResult();
      updateButtons();
      onStage('preprocess', 0, 1);
      let decoded = null;
      try {
        decoded = await root.ImageEngine.decodeFile(sourceFile);
        if (token !== generation) return;
        const width = decoded.width;
        const height = decoded.height;
        if (!root.BgRemoveCore.isRemovableSize(width, height)) throw new Error(`Image is too large. Maximum side: ${root.BgRemoveCore.MAX_INPUT_DIMENSION}px.`);
        if (width * height > LARGE_PIXEL_WARNING && !root.confirm(`This image is ${(width * height / 1_000_000).toFixed(1)} megapixels. Background removal may use substantial memory. Continue?`)) {
          setStatus('Background removal cancelled.');
          return;
        }
        const canvas = root.document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d', { alpha: true, willReadFrequently: true });
        if (!context) throw new Error('Could not create background-removal canvas.');
        context.drawImage(decoded.drawable, 0, 0, width, height);
        const imageData = context.getImageData(0, 0, width, height);
        decoded.close();
        decoded = null;

        const removed = await removeBackgroundRgba(imageData.data, width, height, onStage);
        if (token !== generation) return;
        const output = new ImageData(removed.rgba, width, height);
        context.putImageData(output, 0, 0);
        resultBlob = await new Promise((resolve, reject) => {
          canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Could not encode transparent PNG.')), 'image/png');
        });
        if (token !== generation) return;
        resultUrl = root.URL.createObjectURL(resultBlob);
        preview.src = resultUrl;
        preview.hidden = false;
        if (progress) progress.style.width = '100%';
        if (backendLabel) backendLabel.textContent = removed.backend.toUpperCase();
        setStatus(`Background removed · ${removed.backend.toUpperCase()} · ${(resultBlob.size / 1024).toFixed(1)} KB.`, 'good');
      } catch (error) {
        if (token === generation) setStatus(error.message || String(error), 'error');
      } finally {
        decoded?.close?.();
        if (token === generation) busy = false;
        updateButtons();
      }
    }

    function applyResult() {
      if (!resultBlob || !sourceFile) return;
      const edited = new File([resultBlob], outputFileName(sourceFile.name), { type: 'image/png', lastModified: Date.now() });
      app()?.applyWorkingFile?.(edited);
      dialog.close('applied');
    }

    function downloadResult() {
      if (!resultBlob || !sourceFile) return;
      const url = root.URL.createObjectURL(resultBlob);
      const anchor = root.document.createElement('a');
      anchor.href = url;
      anchor.download = outputFileName(sourceFile.name);
      root.document.body.append(anchor);
      anchor.click();
      anchor.remove();
      root.setTimeout(() => root.URL.revokeObjectURL(url), 1000);
    }

    openButton.addEventListener('click', openDialog);
    runButton.addEventListener('click', runRemoval);
    applyButton.addEventListener('click', applyResult);
    downloadButton.addEventListener('click', downloadResult);
    dialog.addEventListener('close', () => {
      generation += 1;
      busy = false;
      sourceFile = null;
      clearAssets();
      if (progress) progress.style.width = '0%';
      updateButtons();
    });
    root.addEventListener('imagestudio:selectionchange', updateButtons);
    root.addEventListener('beforeunload', clearAssets);
    updateButtons();
  }

  if (root?.document) {
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', initBrowserUi, { once: true });
    else initBrowserUi();
  }

  return {
    ORT_VERSION,
    MODEL_URL,
    outputFileName,
    progressPercent,
    loadOrt,
    loadModel,
    createSession,
    removeBackgroundRgba,
  };
});
