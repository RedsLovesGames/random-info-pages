(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.ImageCore = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  const MIME_EXTENSIONS = Object.freeze({
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  });

  function positive(...values) {
    if (values.some((value) => !Number.isFinite(Number(value)) || Number(value) <= 0)) {
      throw new Error('Dimensions must be positive numbers');
    }
  }

  function round(value) {
    return Math.max(1, Math.round(Number(value)));
  }

  function computeTargetSize(srcWidth, srcHeight, options = {}) {
    positive(srcWidth, srcHeight);
    const source = { width: round(srcWidth), height: round(srcHeight) };
    const mode = options.mode || 'original';
    const preventUpscale = Boolean(options.preventUpscale);
    const preserveAspectRatio = options.preserveAspectRatio !== false;

    switch (mode) {
      case 'original':
        return source;
      case 'width': {
        positive(options.width);
        let width = Number(options.width);
        if (preventUpscale) width = Math.min(width, source.width);
        const height = preserveAspectRatio
          ? source.height * (width / source.width)
          : Number(options.height || source.height);
        positive(height);
        return { width: round(width), height: round(height) };
      }
      case 'height': {
        positive(options.height);
        let height = Number(options.height);
        if (preventUpscale) height = Math.min(height, source.height);
        const width = preserveAspectRatio
          ? source.width * (height / source.height)
          : Number(options.width || source.width);
        positive(width);
        return { width: round(width), height: round(height) };
      }
      case 'percent': {
        positive(options.percent);
        let percent = Number(options.percent);
        if (preventUpscale) percent = Math.min(percent, 100);
        return {
          width: round(source.width * percent / 100),
          height: round(source.height * percent / 100),
        };
      }
      case 'max-width': {
        positive(options.width);
        const limit = Number(options.width);
        if (source.width <= limit) return source;
        return {
          width: round(limit),
          height: round(source.height * limit / source.width),
        };
      }
      case 'max-height': {
        positive(options.height);
        const limit = Number(options.height);
        if (source.height <= limit) return source;
        return {
          width: round(source.width * limit / source.height),
          height: round(limit),
        };
      }
      case 'fit': {
        positive(options.width, options.height);
        let scale = Math.min(Number(options.width) / source.width, Number(options.height) / source.height);
        if (preventUpscale) scale = Math.min(scale, 1);
        return { width: round(source.width * scale), height: round(source.height * scale) };
      }
      case 'fill': {
        positive(options.width, options.height);
        let scale = Math.max(Number(options.width) / source.width, Number(options.height) / source.height);
        if (preventUpscale) scale = Math.min(scale, 1);
        return { width: round(source.width * scale), height: round(source.height * scale) };
      }
      case 'exact':
        positive(options.width, options.height);
        return { width: round(options.width), height: round(options.height) };
      default:
        throw new Error(`Unsupported resize mode: ${mode}`);
    }
  }

  function resizeFromWidth(width, height, newWidth) {
    return computeTargetSize(width, height, { mode: 'width', width: newWidth, preserveAspectRatio: true });
  }

  function resizeFromHeight(width, height, newHeight) {
    return computeTargetSize(width, height, { mode: 'height', height: newHeight, preserveAspectRatio: true });
  }

  function resizeByPercent(width, height, percent) {
    return computeTargetSize(width, height, { mode: 'percent', percent });
  }

  function fitDimensions(width, height, maxWidth, maxHeight) {
    return computeTargetSize(width, height, { mode: 'fit', width: maxWidth, height: maxHeight });
  }

  function fillDimensions(width, height, minWidth, minHeight) {
    return computeTargetSize(width, height, { mode: 'fill', width: minWidth, height: minHeight });
  }

  function extensionForMime(mime) {
    const extension = MIME_EXTENSIONS[mime];
    if (!extension) throw new Error(`Unsupported output MIME type: ${mime}`);
    return extension;
  }

  function makeOutputName(filename, mime) {
    const extension = extensionForMime(mime);
    const clean = String(filename || 'image').trim() || 'image';
    const lastSlash = Math.max(clean.lastIndexOf('/'), clean.lastIndexOf('\\'));
    const basename = clean.slice(lastSlash + 1);
    const dot = basename.lastIndexOf('.');
    const stem = dot > 0 ? basename.slice(0, dot) : basename;
    return `${stem || 'image'}.${extension}`;
  }

  function uniqueName(filename, usedNames) {
    const used = usedNames || new Set();
    if (!used.has(filename)) {
      used.add(filename);
      return filename;
    }
    const dot = filename.lastIndexOf('.');
    const stem = dot > 0 ? filename.slice(0, dot) : filename;
    const extension = dot > 0 ? filename.slice(dot) : '';
    let attempt = 2;
    let candidate = `${stem}-${attempt}${extension}`;
    while (used.has(candidate)) {
      attempt += 1;
      candidate = `${stem}-${attempt}${extension}`;
    }
    used.add(candidate);
    return candidate;
  }

  function parseTargetBytes(value, unit = 'KB') {
    positive(value);
    const normalized = String(unit).toUpperCase();
    const multiplier = normalized === 'B' ? 1 : normalized === 'KB' ? 1024 : normalized === 'MB' ? 1024 * 1024 : null;
    if (!multiplier) throw new Error(`Unsupported size unit: ${unit}`);
    return Math.round(Number(value) * multiplier);
  }

  return {
    computeTargetSize,
    resizeFromWidth,
    resizeFromHeight,
    resizeByPercent,
    fitDimensions,
    fillDimensions,
    extensionForMime,
    makeOutputName,
    uniqueName,
    parseTargetBytes,
  };
});
