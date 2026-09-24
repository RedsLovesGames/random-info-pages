/*
 * Background-removal preprocessing/postprocessing adapted for plain JavaScript
 * from Suemura/client-side-image-converter (MIT), revision
 * 4bde3a9b07af41585df18ce61dd493d58bfc7cf9, src/utils/removeBgCore.ts.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.BgRemoveCore = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  const INPUT_SIZE = 320;
  const MAX_INPUT_DIMENSION = 8192;
  const NORM_MEAN = [0.485, 0.456, 0.406];
  const NORM_STD = [0.229, 0.224, 0.225];

  function isRemovableSize(width, height) {
    const w = Number(width);
    const h = Number(height);
    return Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0 && Math.max(w, h) <= MAX_INPUT_DIMENSION;
  }

  function resizeRgbaBilinear(rgba, srcWidth, srcHeight, dstWidth, dstHeight) {
    const dst = new Uint8ClampedArray(dstWidth * dstHeight * 4);
    const scaleX = srcWidth / dstWidth;
    const scaleY = srcHeight / dstHeight;
    for (let y = 0; y < dstHeight; y += 1) {
      const sourceY = Math.min(srcHeight - 1, Math.max(0, (y + 0.5) * scaleY - 0.5));
      const y0 = Math.floor(sourceY);
      const y1 = Math.min(srcHeight - 1, y0 + 1);
      const fy = sourceY - y0;
      for (let x = 0; x < dstWidth; x += 1) {
        const sourceX = Math.min(srcWidth - 1, Math.max(0, (x + 0.5) * scaleX - 0.5));
        const x0 = Math.floor(sourceX);
        const x1 = Math.min(srcWidth - 1, x0 + 1);
        const fx = sourceX - x0;
        const output = (y * dstWidth + x) * 4;
        for (let channel = 0; channel < 4; channel += 1) {
          const topLeft = rgba[(y0 * srcWidth + x0) * 4 + channel];
          const topRight = rgba[(y0 * srcWidth + x1) * 4 + channel];
          const bottomLeft = rgba[(y1 * srcWidth + x0) * 4 + channel];
          const bottomRight = rgba[(y1 * srcWidth + x1) * 4 + channel];
          const top = topLeft + (topRight - topLeft) * fx;
          const bottom = bottomLeft + (bottomRight - bottomLeft) * fx;
          dst[output + channel] = top + (bottom - top) * fy;
        }
      }
    }
    return dst;
  }

  function rgbaToNormalizedTensor(rgba, width, height, mean = NORM_MEAN, std = NORM_STD) {
    const plane = width * height;
    const tensor = new Float32Array(plane * 3);
    for (let i = 0; i < plane; i += 1) {
      const offset = i * 4;
      tensor[i] = (rgba[offset] / 255 - mean[0]) / std[0];
      tensor[plane + i] = (rgba[offset + 1] / 255 - mean[1]) / std[1];
      tensor[plane * 2 + i] = (rgba[offset + 2] / 255 - mean[2]) / std[2];
    }
    return tensor;
  }

  function normalizeMaskMinMax(mask) {
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    for (const value of mask) {
      if (value < min) min = value;
      if (value > max) max = value;
    }
    const output = new Float32Array(mask.length);
    const range = max - min;
    if (!(range > 0)) return output;
    for (let i = 0; i < mask.length; i += 1) output[i] = (mask[i] - min) / range;
    return output;
  }

  function resizeMaskBilinear(mask, srcWidth, srcHeight, dstWidth, dstHeight) {
    const dst = new Float32Array(dstWidth * dstHeight);
    const scaleX = srcWidth / dstWidth;
    const scaleY = srcHeight / dstHeight;
    for (let y = 0; y < dstHeight; y += 1) {
      const sourceY = Math.min(srcHeight - 1, Math.max(0, (y + 0.5) * scaleY - 0.5));
      const y0 = Math.floor(sourceY);
      const y1 = Math.min(srcHeight - 1, y0 + 1);
      const fy = sourceY - y0;
      for (let x = 0; x < dstWidth; x += 1) {
        const sourceX = Math.min(srcWidth - 1, Math.max(0, (x + 0.5) * scaleX - 0.5));
        const x0 = Math.floor(sourceX);
        const x1 = Math.min(srcWidth - 1, x0 + 1);
        const fx = sourceX - x0;
        const topLeft = mask[y0 * srcWidth + x0];
        const topRight = mask[y0 * srcWidth + x1];
        const bottomLeft = mask[y1 * srcWidth + x0];
        const bottomRight = mask[y1 * srcWidth + x1];
        const top = topLeft + (topRight - topLeft) * fx;
        const bottom = bottomLeft + (bottomRight - bottomLeft) * fx;
        dst[y * dstWidth + x] = top + (bottom - top) * fy;
      }
    }
    return dst;
  }

  function applyMaskToAlpha(rgba, mask) {
    const output = new Uint8ClampedArray(mask.length * 4);
    for (let i = 0; i < mask.length; i += 1) {
      const offset = i * 4;
      const alphaMask = Math.min(1, Math.max(0, mask[i]));
      output[offset] = rgba[offset];
      output[offset + 1] = rgba[offset + 1];
      output[offset + 2] = rgba[offset + 2];
      output[offset + 3] = rgba[offset + 3] * alphaMask;
    }
    return output;
  }

  return {
    INPUT_SIZE,
    MAX_INPUT_DIMENSION,
    NORM_MEAN,
    NORM_STD,
    isRemovableSize,
    resizeRgbaBilinear,
    rgbaToNormalizedTensor,
    normalizeMaskMinMax,
    resizeMaskBilinear,
    applyMaskToAlpha,
  };
});
