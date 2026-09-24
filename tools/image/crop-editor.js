(function (root, factory) {
  const api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.CropEditor = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  const CROPPER_URL = 'https://cdn.jsdelivr.net/npm/cropperjs@2.2.0/dist/cropper.min.js';
  let cropperPromise = null;
  let cropper = null;
  let sourceUrl = null;
  let flipX = 1;
  let flipY = 1;

  function parseAspectRatio(value) {
    if (value === 'free' || value === '' || value == null) return Number.NaN;
    const ratio = Number(value);
    return Number.isFinite(ratio) && ratio > 0 ? ratio : Number.NaN;
  }

  function croppedFileName(filename) {
    const clean = String(filename || 'image').trim() || 'image';
    const slash = Math.max(clean.lastIndexOf('/'), clean.lastIndexOf('\\'));
    const basename = clean.slice(slash + 1);
    const dot = basename.lastIndexOf('.');
    const stem = dot > 0 ? basename.slice(0, dot) : basename;
    return `${stem || 'image'}-crop.png`;
  }

  function resolveCropperConstructor() {
    const candidate = root && root.Cropper;
    return typeof candidate === 'function'
      ? candidate
      : candidate && typeof candidate.default === 'function'
        ? candidate.default
        : null;
  }

  function loadCropper() {
    const ready = resolveCropperConstructor();
    if (ready) return Promise.resolve(ready);
    if (!root || !root.document) return Promise.reject(new Error('Cropper.js requires a browser.'));
    if (!cropperPromise) {
      cropperPromise = new Promise((resolve, reject) => {
        const existing = root.document.querySelector('script[data-cropperjs]');
        const finish = () => {
          const Constructor = resolveCropperConstructor();
          if (Constructor) resolve(Constructor);
          else reject(new Error('Cropper.js did not initialize.'));
        };
        if (existing) {
          existing.addEventListener('load', finish, { once: true });
          existing.addEventListener('error', () => reject(new Error('Could not load Cropper.js.')), { once: true });
          return;
        }
        const script = root.document.createElement('script');
        script.dataset.cropperjs = 'true';
        script.src = CROPPER_URL;
        script.crossOrigin = 'anonymous';
        script.onload = finish;
        script.onerror = () => reject(new Error('Could not load Cropper.js.'));
        root.document.head.append(script);
      }).catch((error) => {
        cropperPromise = null;
        throw error;
      });
    }
    return cropperPromise;
  }

  function cleanupEditor(cropImage) {
    if (cropper) {
      try { cropper.destroy(); } catch (_) {}
      cropper = null;
    }
    if (sourceUrl && root?.URL) root.URL.revokeObjectURL(sourceUrl);
    sourceUrl = null;
    if (cropImage) cropImage.removeAttribute('src');
    flipX = 1;
    flipY = 1;
  }

  function initBrowserUi() {
    if (!root?.document) return;
    const $ = (selector) => root.document.querySelector(selector);
    const cropSelected = $('#cropSelected');
    const resetCrop = $('#resetCrop');
    const dialog = $('#cropDialog');
    const cropStage = $('#cropStage');
    const cropImage = $('#cropImage');
    const cropRatio = $('#cropRatio');
    const applyCrop = $('#applyCrop');
    const rotateLeft = $('#cropRotateLeft');
    const rotateRight = $('#cropRotateRight');
    const flipXButton = $('#cropFlipX');
    const flipYButton = $('#cropFlipY');
    const cropStatus = $('#cropStatus');
    if (!cropSelected || !dialog || !cropStage || !cropImage) return;

    function app() { return root.ImageStudioApp; }
    function setCropStatus(message, kind = '') {
      cropStatus.textContent = message || '';
      cropStatus.className = `status-line${kind ? ` ${kind}` : ''}`;
    }
    function updateButtons() {
      const current = app()?.getSelectedItem?.();
      const busy = app()?.isBusy?.();
      cropSelected.disabled = !current || Boolean(busy);
      resetCrop.disabled = !current?.workingFile || Boolean(busy);
    }
    function selection() { return cropper?.getCropperSelection?.() || null; }
    function cropperImageElement() { return cropper?.getCropperImage?.() || null; }

    async function openEditor() {
      const currentApp = app();
      const file = currentApp?.getInputFile?.();
      if (!file || currentApp?.isBusy?.()) return;
      cleanupEditor(cropImage);
      setCropStatus('Loading crop editor…');
      try {
        sourceUrl = root.URL.createObjectURL(file);
        cropImage.src = sourceUrl;
        cropImage.alt = file.name || 'Crop source';
        if (typeof cropImage.decode === 'function') await cropImage.decode();
        else await new Promise((resolve, reject) => { cropImage.onload = resolve; cropImage.onerror = reject; });
        if (!dialog.open) dialog.showModal();
        const CropperConstructor = await loadCropper();
        cropper = new CropperConstructor(cropImage, { container: cropStage });
        cropRatio.value = 'free';
        flipX = 1;
        flipY = 1;
        setCropStatus('Drag the crop box or choose an aspect ratio.');
      } catch (error) {
        setCropStatus(error.message || String(error), 'error');
        app()?.setStatus?.(`Crop editor unavailable: ${error.message || error}`, 'error');
      }
    }

    cropSelected.addEventListener('click', openEditor);
    resetCrop.addEventListener('click', () => {
      app()?.resetWorkingFile?.();
      updateButtons();
    });

    cropRatio.addEventListener('change', () => {
      const current = selection();
      if (!current) return;
      current.aspectRatio = parseAspectRatio(cropRatio.value);
      if (typeof current.$center === 'function') current.$center();
    });

    rotateLeft.addEventListener('click', () => cropperImageElement()?.$rotate?.('-90deg'));
    rotateRight.addEventListener('click', () => cropperImageElement()?.$rotate?.('90deg'));
    flipXButton.addEventListener('click', () => {
      const image = cropperImageElement();
      if (!image?.$scale) return;
      flipX *= -1;
      image.$scale(flipX, flipY);
    });
    flipYButton.addEventListener('click', () => {
      const image = cropperImageElement();
      if (!image?.$scale) return;
      flipY *= -1;
      image.$scale(flipX, flipY);
    });

    applyCrop.addEventListener('click', async () => {
      const current = selection();
      const selected = app()?.getSelectedItem?.();
      if (!current || !selected) return;
      applyCrop.disabled = true;
      setCropStatus('Rendering crop locally…');
      try {
        const canvas = await current.$toCanvas();
        const blob = await new Promise((resolve, reject) => {
          canvas.toBlob((value) => value ? resolve(value) : reject(new Error('Could not encode crop.')), 'image/png');
        });
        const file = new File([blob], croppedFileName(selected.file.name), { type: 'image/png', lastModified: Date.now() });
        app()?.applyWorkingFile?.(file);
        dialog.close('applied');
      } catch (error) {
        setCropStatus(error.message || String(error), 'error');
      } finally {
        applyCrop.disabled = false;
      }
    });

    dialog.addEventListener('close', () => {
      cleanupEditor(cropImage);
      setCropStatus('');
      updateButtons();
    });
    root.addEventListener('imagestudio:selectionchange', updateButtons);
    updateButtons();
  }

  if (root?.document) {
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', initBrowserUi, { once: true });
    else initBrowserUi();
  }

  return { parseAspectRatio, croppedFileName, loadCropper };
});
