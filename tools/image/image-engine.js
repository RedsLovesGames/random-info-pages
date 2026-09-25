(function (root, factory) {
  const api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.ImageEngine = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  const SUPPORTED_INPUT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
  const SUPPORTED_OUTPUT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
  const DEFAULT_LARGE_FILE_BYTES = 25 * 1024 * 1024;
  const PICA_URL = 'https://cdn.jsdelivr.net/npm/pica@10.0.3/dist/pica.min.js';
  let picaPromise = null;

  class ImageStudioError extends Error {
    constructor(code, message) {
      super(message);
      this.name = 'ImageStudioError';
      this.code = code;
    }
  }

  function normalizeQuality(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 0.86;
    return Math.min(100, Math.max(1, numeric)) / 100;
  }

  function qualityForMime(mime, value) {
    return mime === 'image/png' ? undefined : normalizeQuality(value);
  }

  function isSupportedInputType(type) {
    return SUPPORTED_INPUT_TYPES.has(String(type || '').toLowerCase());
  }

  function isSupportedOutputType(type) {
    return SUPPORTED_OUTPUT_TYPES.has(String(type || '').toLowerCase());
  }

  function shouldWarnForLargeFile(file, threshold = DEFAULT_LARGE_FILE_BYTES) {
    return Boolean(file && Number(file.size) > threshold);
  }

  function shouldUseHighQualityResize(sourceWidth, sourceHeight, targetWidth, targetHeight) {
    return Number(sourceWidth) !== Number(targetWidth) || Number(sourceHeight) !== Number(targetHeight);
  }

  function adjustQualityBounds({ low, high, quality, outputBytes, targetBytes }) {
    return outputBytes <= targetBytes ? { low: quality, high } : { low, high: quality };
  }

  function getImageCore() {
    const core = root && root.ImageCore;
    if (!core) throw new ImageStudioError('missing-core', 'Image sizing helpers did not load.');
    return core;
  }

  async function loadPica() {
    if (root && typeof root.pica === 'function') return root.pica();
    if (typeof document === 'undefined') throw new ImageStudioError('pica-unavailable', 'High-quality resize is unavailable.');
    if (!picaPromise) {
      picaPromise = new Promise((resolve, reject) => {
        const existing = document.querySelector('script[data-pica]');
        if (existing) {
          existing.addEventListener('load', () => resolve(root.pica()), { once: true });
          existing.addEventListener('error', () => reject(new ImageStudioError('pica-unavailable', 'High-quality resize could not load.')), { once: true });
          return;
        }
        const script = document.createElement('script');
        script.dataset.pica = 'true';
        script.src = PICA_URL;
        script.crossOrigin = 'anonymous';
        script.onload = () => typeof root.pica === 'function'
          ? resolve(root.pica())
          : reject(new ImageStudioError('pica-unavailable', 'High-quality resize did not initialize.'));
        script.onerror = () => reject(new ImageStudioError('pica-unavailable', 'High-quality resize could not load.'));
        document.head.append(script);
      }).catch((error) => {
        picaPromise = null;
        throw error;
      });
    }
    return picaPromise;
  }

  async function loadImageElement(file) {
    if (typeof document === 'undefined' || typeof Image === 'undefined' || typeof URL === 'undefined') {
      throw new ImageStudioError('decode-unavailable', 'This browser cannot decode images on this page.');
    }
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.decoding = 'async';
      image.src = url;
      if (typeof image.decode === 'function') await image.decode();
      else await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; });
      if (!image.naturalWidth || !image.naturalHeight) {
        throw new ImageStudioError('decode-failed', `Could not decode ${file.name || 'image'}.`);
      }
      return image;
    } catch (error) {
      if (error instanceof ImageStudioError) throw error;
      throw new ImageStudioError('decode-failed', `Could not decode ${file.name || 'image'}.`);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function decodeFile(file) {
    if (!file || !isSupportedInputType(file.type)) {
      throw new ImageStudioError('unsupported-input', `Unsupported input format: ${(file && file.type) || 'unknown'}`);
    }
    if (typeof createImageBitmap === 'function') {
      try {
        const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
        return { drawable: bitmap, width: bitmap.width, height: bitmap.height, kind: 'bitmap', close: () => bitmap.close && bitmap.close() };
      } catch (_) {}
    }
    const image = await loadImageElement(file);
    if (typeof createImageBitmap === 'function') {
      try {
        const bitmap = await createImageBitmap(image);
        return { drawable: bitmap, width: bitmap.width, height: bitmap.height, kind: 'bitmap', close: () => bitmap.close && bitmap.close() };
      } catch (_) {}
    }
    return { drawable: image, width: image.naturalWidth, height: image.naturalHeight, kind: 'image-element', close: () => {} };
  }

  function draw(context, decoded, width, height, options) {
    if (options.outputMime === 'image/jpeg') {
      context.fillStyle = options.backgroundColor || '#ffffff';
      context.fillRect(0, 0, width, height);
    }
    context.imageSmoothingEnabled = true;
    if ('imageSmoothingQuality' in context) context.imageSmoothingQuality = 'high';
    context.drawImage(decoded.drawable, 0, 0, width, height);
  }

  async function renderWithPica(decoded, dimensions, options, quality) {
    if (typeof document === 'undefined') return null;
    if (!shouldUseHighQualityResize(decoded.width, decoded.height, dimensions.width, dimensions.height)) return null;
    try {
      const pica = await loadPica();
      const source = document.createElement('canvas');
      source.width = decoded.width;
      source.height = decoded.height;
      const sourceContext = source.getContext('2d', { alpha: true });
      if (!sourceContext) return null;
      if (options.outputMime === 'image/jpeg') {
        sourceContext.fillStyle = options.backgroundColor || '#ffffff';
        sourceContext.fillRect(0, 0, source.width, source.height);
      }
      sourceContext.drawImage(decoded.drawable, 0, 0, source.width, source.height);
      const target = document.createElement('canvas');
      target.width = dimensions.width;
      target.height = dimensions.height;
      await pica.resize(source, target, { alpha: options.outputMime !== 'image/jpeg' });
      const blob = await pica.toBlob(target, options.outputMime, quality);
      if (!blob || blob.type !== options.outputMime) {
        throw new ImageStudioError('unsupported-output', `The browser cannot encode ${options.outputMime} reliably.`);
      }
      return blob;
    } catch (error) {
      if (error instanceof ImageStudioError && error.code === 'unsupported-output') throw error;
      return null;
    }
  }

  async function renderToBlob(decoded, options) {
    if (!isSupportedOutputType(options.outputMime)) {
      throw new ImageStudioError('unsupported-output', `Unsupported output format: ${options.outputMime || 'unknown'}`);
    }
    const core = getImageCore();
    const dimensions = core.computeTargetSize(decoded.width, decoded.height, options.resize || { mode: 'original' });
    const quality = qualityForMime(options.outputMime, options.quality);
    let blob = await renderWithPica(decoded, dimensions, options, quality);

    if (!blob) {
      const mayUseOffscreen = decoded.kind === 'bitmap' && typeof OffscreenCanvas !== 'undefined';
      if (mayUseOffscreen) {
        const canvas = new OffscreenCanvas(dimensions.width, dimensions.height);
        const context = canvas.getContext('2d', { alpha: true });
        if (!context) throw new ImageStudioError('canvas-unavailable', 'Could not create an image canvas.');
        draw(context, decoded, dimensions.width, dimensions.height, options);
        try { blob = await canvas.convertToBlob({ type: options.outputMime, quality }); }
        catch (_) { throw new ImageStudioError('encode-failed', `This browser could not encode ${options.outputMime}.`); }
      } else {
        if (typeof document === 'undefined') throw new ImageStudioError('canvas-unavailable', 'Canvas is unavailable in this environment.');
        const canvas = document.createElement('canvas');
        canvas.width = dimensions.width;
        canvas.height = dimensions.height;
        const context = canvas.getContext('2d', { alpha: true });
        if (!context) throw new ImageStudioError('canvas-unavailable', 'Could not create an image canvas.');
        draw(context, decoded, dimensions.width, dimensions.height, options);
        blob = await new Promise((resolve) => canvas.toBlob(resolve, options.outputMime, quality));
      }
    }

    if (!blob) throw new ImageStudioError('encode-failed', 'The browser returned no encoded image.');
    if (blob.type !== options.outputMime) throw new ImageStudioError('unsupported-output', `The browser cannot encode ${options.outputMime} reliably.`);
    return { blob, width: dimensions.width, height: dimensions.height };
  }

  function toResult(file, rendered, options) {
    const core = getImageCore();
    return {
      ...rendered,
      name: core.makeOutputName(file.name || 'image', options.outputMime),
      sourceName: file.name || 'image',
      sourceSize: Number(file.size) || 0,
      outputSize: rendered.blob.size,
      outputMime: rendered.blob.type,
    };
  }

  async function convertFile(file, options) {
    const decoded = await decodeFile(file);
    try { return toResult(file, await renderToBlob(decoded, options), options); }
    finally { decoded.close(); }
  }

  async function searchTargetQuality(decoded, file, options, width, height, targetBytes, onAttempt) {
    let low = 0.05;
    let high = normalizeQuality(options.quality || 100);
    let best = null;
    let smallest = null;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const quality = (low + high) / 2;
      const rendered = await renderToBlob(decoded, {
        ...options,
        quality: quality * 100,
        resize: { mode: 'exact', width, height },
      });
      const result = toResult(file, rendered, options);
      if (!smallest || result.outputSize < smallest.outputSize) smallest = result;
      if (result.outputSize <= targetBytes && (!best || result.outputSize > best.outputSize)) best = result;
      onAttempt && onAttempt({ attempt, quality, outputBytes: result.outputSize, targetBytes, width, height });
      const bounds = adjustQualityBounds({ low, high, quality, outputBytes: result.outputSize, targetBytes });
      low = bounds.low;
      high = bounds.high;
      if (best && best.outputSize >= targetBytes * 0.92) break;
    }
    return { best, smallest };
  }

  async function compressToTarget(file, options, targetBytes, settings = {}) {
    if (!Number.isFinite(Number(targetBytes)) || Number(targetBytes) <= 0) {
      throw new ImageStudioError('invalid-target', 'Target size must be greater than zero.');
    }
    if (options.outputMime === 'image/png') {
      throw new ImageStudioError('target-size-png', 'Target-size compression is available for JPEG and WebP outputs.');
    }
    const decoded = await decodeFile(file);
    try {
      const initial = getImageCore().computeTargetSize(decoded.width, decoded.height, options.resize || { mode: 'original' });
      const scales = settings.preserveResolution ? [1] : [1, 0.85, 0.7, 0.55, 0.4];
      let smallest = null;
      for (const scale of scales) {
        const w = Math.max(1, Math.round(initial.width * scale));
        const h = Math.max(1, Math.round(initial.height * scale));
        const searched = await searchTargetQuality(decoded, file, options, w, h, Number(targetBytes), settings.onAttempt);
        if (searched.smallest && (!smallest || searched.smallest.outputSize < smallest.outputSize)) smallest = searched.smallest;
        if (searched.best) return { ...searched.best, targetReached: true, resolutionReduced: scale < 1 };
      }
      return { ...smallest, targetReached: false, resolutionReduced: smallest ? (smallest.width < initial.width || smallest.height < initial.height) : false };
    } finally {
      decoded.close();
    }
  }

  async function processBatch(files, options, callbacks = {}) {
    const list = Array.from(files || []);
    const results = [];
    const usedNames = new Set();
    const core = getImageCore();
    for (let index = 0; index < list.length; index += 1) {
      const file = list[index];
      if (callbacks.signal && callbacks.signal.aborted) break;
      callbacks.onProgress && callbacks.onProgress({ index, total: list.length, file, status: 'processing' });
      try {
        const converted = callbacks.targetBytes
          ? await compressToTarget(file, options, callbacks.targetBytes, { preserveResolution: callbacks.preserveResolution, onAttempt: callbacks.onCompressionAttempt })
          : await convertFile(file, options);
        converted.name = core.uniqueName(converted.name, usedNames);
        const entry = { ok: true, file, result: converted };
        results.push(entry);
        callbacks.onProgress && callbacks.onProgress({ index, total: list.length, file, status: 'done', entry });
      } catch (error) {
        const entry = { ok: false, file, error };
        results.push(entry);
        callbacks.onProgress && callbacks.onProgress({ index, total: list.length, file, status: 'error', entry });
      }
    }
    return results;
  }

  async function createZipBlob(successfulResults, fflateApi) {
    if (!fflateApi || typeof fflateApi.zip !== 'function') throw new ImageStudioError('zip-unavailable', 'ZIP support could not be loaded.');
    const files = {};
    for (const entry of successfulResults) {
      const result = entry.result || entry;
      files[result.name] = [new Uint8Array(await result.blob.arrayBuffer()), { level: 0 }];
    }
    const archive = await new Promise((resolve, reject) => {
      fflateApi.zip(files, (error, data) => error ? reject(new ImageStudioError('zip-failed', 'Could not create ZIP archive.')) : resolve(data));
    });
    return new Blob([archive], { type: 'application/zip' });
  }

  return {
    ImageStudioError,
    SUPPORTED_INPUT_TYPES,
    SUPPORTED_OUTPUT_TYPES,
    normalizeQuality,
    qualityForMime,
    isSupportedInputType,
    isSupportedOutputType,
    shouldWarnForLargeFile,
    shouldUseHighQualityResize,
    adjustQualityBounds,
    decodeFile,
    renderToBlob,
    convertFile,
    compressToTarget,
    processBatch,
    createZipBlob,
  };
});
