(function (root, factory) {
  const api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.ImageEngine = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  const SUPPORTED_INPUT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
  const SUPPORTED_OUTPUT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
  const DEFAULT_LARGE_FILE_BYTES = 25 * 1024 * 1024;

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

  function getImageCore() {
    const core = root && root.ImageCore;
    if (!core) throw new ImageStudioError('missing-core', 'Image sizing helpers did not load.');
    return core;
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
      if (typeof image.decode === 'function') {
        await image.decode();
      } else {
        await new Promise((resolve, reject) => {
          image.onload = resolve;
          image.onerror = reject;
        });
      }
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
        return {
          drawable: bitmap,
          width: bitmap.width,
          height: bitmap.height,
          kind: 'bitmap',
          close: () => bitmap.close && bitmap.close(),
        };
      } catch (_) {
        // Fall through to the image-element path for browsers/codecs whose
        // createImageBitmap support is incomplete.
      }
    }

    const image = await loadImageElement(file);
    if (typeof createImageBitmap === 'function') {
      try {
        const bitmap = await createImageBitmap(image);
        return {
          drawable: bitmap,
          width: bitmap.width,
          height: bitmap.height,
          kind: 'bitmap',
          close: () => bitmap.close && bitmap.close(),
        };
      } catch (_) {
        // The DOM image itself is still a valid CanvasImageSource.
      }
    }

    return {
      drawable: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      kind: 'image-element',
      close: () => {},
    };
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

  async function renderToBlob(decoded, options) {
    if (!isSupportedOutputType(options.outputMime)) {
      throw new ImageStudioError('unsupported-output', `Unsupported output format: ${options.outputMime || 'unknown'}`);
    }

    const core = getImageCore();
    const dimensions = core.computeTargetSize(decoded.width, decoded.height, options.resize || { mode: 'original' });
    const quality = qualityForMime(options.outputMime, options.quality);
    let blob = null;

    const mayUseOffscreen =
      decoded.kind === 'bitmap' &&
      typeof OffscreenCanvas !== 'undefined';

    if (mayUseOffscreen) {
      const canvas = new OffscreenCanvas(dimensions.width, dimensions.height);
      const context = canvas.getContext('2d', { alpha: true });
      if (!context) throw new ImageStudioError('canvas-unavailable', 'Could not create an image canvas.');
      draw(context, decoded, dimensions.width, dimensions.height, options);
      try {
        blob = await canvas.convertToBlob({ type: options.outputMime, quality });
      } catch (_) {
        throw new ImageStudioError('encode-failed', `This browser could not encode ${options.outputMime}.`);
      }
    } else {
      if (typeof document === 'undefined') {
        throw new ImageStudioError('canvas-unavailable', 'Canvas is unavailable in this environment.');
      }
      const canvas = document.createElement('canvas');
      canvas.width = dimensions.width;
      canvas.height = dimensions.height;
      const context = canvas.getContext('2d', { alpha: true });
      if (!context) throw new ImageStudioError('canvas-unavailable', 'Could not create an image canvas.');
      draw(context, decoded, dimensions.width, dimensions.height, options);
      blob = await new Promise((resolve) => canvas.toBlob(resolve, options.outputMime, quality));
    }

    if (!blob) throw new ImageStudioError('encode-failed', 'The browser returned no encoded image.');
    if (blob.type !== options.outputMime) {
      throw new ImageStudioError('unsupported-output', `The browser cannot encode ${options.outputMime} reliably.`);
    }

    return { blob, width: dimensions.width, height: dimensions.height };
  }

  async function convertFile(file, options) {
    const decoded = await decodeFile(file);
    try {
      const rendered = await renderToBlob(decoded, options);
      const core = getImageCore();
      return {
        ...rendered,
        name: core.makeOutputName(file.name || 'image', options.outputMime),
        sourceName: file.name || 'image',
        sourceSize: Number(file.size) || 0,
        outputSize: rendered.blob.size,
        outputMime: rendered.blob.type,
      };
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
        const converted = await convertFile(file, options);
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
    if (!fflateApi || typeof fflateApi.zip !== 'function') {
      throw new ImageStudioError('zip-unavailable', 'ZIP support could not be loaded.');
    }
    const files = {};
    for (const entry of successfulResults) {
      const result = entry.result || entry;
      files[result.name] = [new Uint8Array(await result.blob.arrayBuffer()), { level: 0 }];
    }
    const archive = await new Promise((resolve, reject) => {
      fflateApi.zip(files, (error, data) => {
        if (error) reject(new ImageStudioError('zip-failed', 'Could not create ZIP archive.'));
        else resolve(data);
      });
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
    decodeFile,
    renderToBlob,
    convertFile,
    processBatch,
    createZipBlob,
  };
});
