(function (root, factory) {
  const api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.GifMaker = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  const GIFENC_URL = 'https://cdn.jsdelivr.net/npm/gifenc@1.0.3/+esm';
  const MAX_VIDEO_FRAMES = 300;
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

  function sampleTimes(start, end, fps, maxFrames = MAX_VIDEO_FRAMES) {
    const s = Number(start);
    const e = Number(end);
    const rawFps = Number(fps);
    const rate = Number.isFinite(rawFps) ? Math.min(100, Math.max(1, rawFps)) : 10;
    const limit = Math.max(1, Math.floor(Number(maxFrames) || MAX_VIDEO_FRAMES));
    if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) return [];

    const duration = e - s;
    const desiredCount = Math.max(1, Math.ceil(duration * rate - 1e-9));
    const count = Math.min(limit, desiredCount);
    const step = desiredCount > limit ? duration / count : 1 / rate;
    return Array.from({ length: count }, (_, index) => Number((s + index * step).toFixed(6)));
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
    const imagesModeButton = $('#gifImagesMode');
    const videoModeButton = $('#gifVideoMode');
    const imagePanel = $('#gifImagesPanel');
    const videoPanel = $('#gifVideoPanel');
    const videoPicker = $('#gifVideoPicker');
    const chooseVideoButton = $('#gifChooseVideo');
    const videoPreview = $('#gifVideoPreview');
    const videoStart = $('#gifVideoStart');
    const videoEnd = $('#gifVideoEnd');
    const videoMeta = $('#gifVideoMeta');
    if (!openButton || !dialog || !picker || !frameList || !createButton || !status) return;

    let frames = [];
    let sourceMode = 'images';
    let videoFile = null;
    let videoObjectUrl = null;
    let videoDuration = 0;
    let outputBlob = null;
    let outputUrl = null;
    let encoding = false;
    let cancelRequested = false;

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

    function cleanupOutput() {
      if (outputUrl) root.URL.revokeObjectURL(outputUrl);
      outputUrl = null;
      outputBlob = null;
      preview.removeAttribute('src');
      preview.hidden = true;
      downloadButton.disabled = true;
    }

    function cleanupVideo() {
      if (videoObjectUrl) root.URL.revokeObjectURL(videoObjectUrl);
      videoObjectUrl = null;
      videoFile = null;
      videoDuration = 0;
      if (videoPreview) {
        videoPreview.pause();
        videoPreview.removeAttribute('src');
        videoPreview.load();
        videoPreview.hidden = true;
      }
      if (videoStart) videoStart.value = '0';
      if (videoEnd) videoEnd.value = '';
      if (videoMeta) videoMeta.textContent = 'Choose a browser-decodable video. Nothing is uploaded.';
    }

    function updateCreateState() {
      const readyForImages = sourceMode === 'images' && frames.length >= 2;
      const start = Number(videoStart?.value);
      const end = Number(videoEnd?.value);
      const readyForVideo = sourceMode === 'video' && videoFile && videoDuration > 0 && Number.isFinite(start) && Number.isFinite(end) && end > start;
      createButton.disabled = encoding || !(readyForImages || readyForVideo);
      createButton.textContent = sourceMode === 'video' ? 'Create GIF from video' : 'Create GIF';
      addFramesButton.disabled = encoding;
      if (chooseVideoButton) chooseVideoButton.disabled = encoding;
      cancelButton.hidden = !encoding;
      delayLabel.textContent = `${delayFromFps(fpsInput.value)} ms/frame`;
    }

    function setSourceMode(mode) {
      sourceMode = mode === 'video' ? 'video' : 'images';
      if (imagePanel) imagePanel.hidden = sourceMode !== 'images';
      if (videoPanel) videoPanel.hidden = sourceMode !== 'video';
      imagesModeButton?.classList.toggle('active', sourceMode === 'images');
      videoModeButton?.classList.toggle('active', sourceMode === 'video');
      cleanupOutput();
      updateCreateState();
      if (sourceMode === 'images') setStatus(frames.length ? `${frames.length} image frame${frames.length === 1 ? '' : 's'} ready.` : 'Add two or more images. All frame pixels stay on this device.');
      else setStatus(videoFile ? 'Choose a clip range, then create the GIF.' : 'Choose a video. Decoding and frame sampling stay on this device.');
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
      updateCreateState();
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

    function outputDimensions() {
      return {
        width: Math.max(1, Math.min(2048, Math.round(Number(widthInput.value) || 480))),
        height: Math.max(1, Math.min(2048, Math.round(Number(heightInput.value) || 480))),
      };
    }

    function frameColors() {
      return Math.min(256, Math.max(16, Number(colorsInput.value) || 128));
    }

    function completeGif(gif, outputWidth, outputHeight) {
      gif.finish();
      outputBlob = new Blob([gif.bytes()], { type: 'image/gif' });
      outputUrl = root.URL.createObjectURL(outputBlob);
      preview.src = outputUrl;
      preview.hidden = false;
      downloadButton.disabled = false;
      setStatus(`GIF ready · ${outputWidth}×${outputHeight} · ${bytes(outputBlob.size)}.`, 'good');
    }

    async function createImageGif() {
      if (frames.length < 2 || encoding) return;
      const { width: outputWidth, height: outputHeight } = outputDimensions();
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
        const colors = frameColors();

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
        completeGif(gif, outputWidth, outputHeight);
      } catch (error) {
        setStatus(error.message || String(error), cancelRequested ? '' : 'error');
      } finally {
        encoding = false;
        cancelRequested = false;
        renderFrames();
      }
    }

    function waitForVideoEvent(video, successEvent, timeoutMs = 10000) {
      return new Promise((resolve, reject) => {
        let timer = null;
        const cleanup = () => {
          video.removeEventListener(successEvent, onSuccess);
          video.removeEventListener('error', onError);
          if (timer) root.clearTimeout(timer);
        };
        const onSuccess = () => { cleanup(); resolve(); };
        const onError = () => { cleanup(); reject(new Error('The browser could not decode this video.')); };
        video.addEventListener(successEvent, onSuccess, { once: true });
        video.addEventListener('error', onError, { once: true });
        timer = root.setTimeout(() => { cleanup(); reject(new Error('Video decoding timed out.')); }, timeoutMs);
      });
    }

    async function chooseVideo(file) {
      cleanupVideo();
      cleanupOutput();
      if (!file || !String(file.type || '').startsWith('video/')) {
        setStatus('Choose a supported video file.', 'error');
        updateCreateState();
        return;
      }
      videoFile = file;
      videoObjectUrl = root.URL.createObjectURL(file);
      videoPreview.hidden = false;
      videoPreview.src = videoObjectUrl;
      videoPreview.preload = 'metadata';
      videoPreview.muted = true;
      setStatus('Reading video metadata…');
      try {
        if (!(videoPreview.readyState >= 1 && Number.isFinite(videoPreview.duration))) {
          await waitForVideoEvent(videoPreview, 'loadedmetadata');
        }
        videoDuration = Number(videoPreview.duration);
        if (!(videoDuration > 0 && Number.isFinite(videoDuration))) throw new Error('This video has no readable duration.');
        videoStart.value = '0';
        videoEnd.value = String(Number(videoDuration.toFixed(3)));
        videoStart.max = String(videoDuration);
        videoEnd.max = String(videoDuration);
        const dimensions = videoPreview.videoWidth && videoPreview.videoHeight ? ` · ${videoPreview.videoWidth}×${videoPreview.videoHeight}` : '';
        videoMeta.textContent = `${file.name} · ${videoDuration.toFixed(2)} s${dimensions} · ${bytes(file.size)}`;
        setStatus('Video ready. Choose a clip range, then create the GIF.');
      } catch (error) {
        cleanupVideo();
        setStatus(error.message || String(error), 'error');
      }
      updateCreateState();
    }

    async function seekVideo(video, time) {
      const target = Math.max(0, Math.min(Number(video.duration) || Number.MAX_SAFE_INTEGER, Number(time) || 0));
      if (video.readyState >= 2 && Math.abs(video.currentTime - target) < 0.002) return;
      const pending = waitForVideoEvent(video, 'seeked', 12000);
      video.currentTime = target;
      await pending;
      if (video.readyState < 2) await waitForVideoEvent(video, 'loadeddata', 12000);
    }

    async function createVideoGif() {
      if (!videoFile || !(videoDuration > 0) || encoding) return;
      const start = Math.max(0, Math.min(videoDuration, Number(videoStart.value) || 0));
      const end = Math.max(0, Math.min(videoDuration, Number(videoEnd.value) || videoDuration));
      const samples = sampleTimes(start, end, fpsInput.value, MAX_VIDEO_FRAMES);
      if (!samples.length) {
        setStatus('End time must be after start time.', 'error');
        return;
      }

      const { width: outputWidth, height: outputHeight } = outputDimensions();
      const maxPixels = outputWidth * outputHeight * samples.length;
      if (maxPixels > 180000000 && !root.confirm(`This conversion will sample ${samples.length} frames and may use substantial memory. Continue?`)) return;

      encoding = true;
      cancelRequested = false;
      cleanupOutput();
      updateCreateState();
      setStatus('Loading GIF encoder…');
      try {
        const { GIFEncoder, quantize, applyPalette } = await loadGifenc();
        const gif = GIFEncoder();
        const canvas = root.document.createElement('canvas');
        canvas.width = outputWidth;
        canvas.height = outputHeight;
        const context = canvas.getContext('2d', { alpha: false, willReadFrequently: true });
        if (!context) throw new Error('Could not create GIF canvas.');
        const repeat = repeatFromLoop(loopInput.value);
        const colors = frameColors();
        const delay = Math.max(10, Math.round(((end - start) * 1000) / samples.length));
        const wasCapped = Math.ceil((end - start) * Math.min(100, Math.max(1, Number(fpsInput.value) || 10))) > samples.length;

        videoPreview.pause();
        for (let index = 0; index < samples.length; index += 1) {
          if (cancelRequested) throw new Error('GIF creation cancelled.');
          setStatus(`${wasCapped ? 'Sampling across clip' : 'Sampling video'} · frame ${index + 1} of ${samples.length}…`);
          await seekVideo(videoPreview, samples[index]);
          context.fillStyle = '#000000';
          context.fillRect(0, 0, outputWidth, outputHeight);
          const rect = containRect(videoPreview.videoWidth, videoPreview.videoHeight, outputWidth, outputHeight);
          context.imageSmoothingEnabled = true;
          if ('imageSmoothingQuality' in context) context.imageSmoothingQuality = 'high';
          context.drawImage(videoPreview, rect.x, rect.y, rect.width, rect.height);
          const imageData = context.getImageData(0, 0, outputWidth, outputHeight);
          const palette = quantize(imageData.data, colors, { format: 'rgb565' });
          const indexed = applyPalette(imageData.data, palette, 'rgb565');
          gif.writeFrame(indexed, outputWidth, outputHeight, { palette, delay, repeat });
          await new Promise((resolve) => root.requestAnimationFrame(resolve));
        }
        completeGif(gif, outputWidth, outputHeight);
        if (wasCapped) setStatus(`GIF ready · ${samples.length}-frame safety cap sampled across the full clip · ${bytes(outputBlob.size)}.`, 'good');
      } catch (error) {
        setStatus(error.message || String(error), cancelRequested ? '' : 'error');
      } finally {
        encoding = false;
        cancelRequested = false;
        updateCreateState();
      }
    }

    async function createGif() {
      if (sourceMode === 'video') await createVideoGif();
      else await createImageGif();
    }

    function downloadGif() {
      if (!outputBlob) return;
      const url = root.URL.createObjectURL(outputBlob);
      const anchor = root.document.createElement('a');
      anchor.href = url;
      anchor.download = sourceMode === 'video' ? 'random-info-pages-video.gif' : 'random-info-pages.gif';
      root.document.body.append(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => root.URL.revokeObjectURL(url), 1000);
    }

    openButton.addEventListener('click', () => {
      if (!dialog.open) dialog.showModal();
      renderFrames();
      updateCreateState();
    });
    imagesModeButton?.addEventListener('click', () => setSourceMode('images'));
    videoModeButton?.addEventListener('click', () => setSourceMode('video'));
    addFramesButton.addEventListener('click', () => picker.click());
    picker.addEventListener('change', () => { addFrames(picker.files); picker.value = ''; });
    chooseVideoButton?.addEventListener('click', () => videoPicker.click());
    videoPicker?.addEventListener('change', () => { chooseVideo(videoPicker.files?.[0]); videoPicker.value = ''; });
    videoStart?.addEventListener('input', updateCreateState);
    videoEnd?.addEventListener('input', updateCreateState);
    fpsInput.addEventListener('input', updateCreateState);
    createButton.addEventListener('click', createGif);
    cancelButton.addEventListener('click', () => { cancelRequested = true; setStatus('Stopping after the current frame…'); });
    downloadButton.addEventListener('click', downloadGif);
    dialog.addEventListener('close', () => { if (encoding) cancelRequested = true; });
    root.addEventListener('beforeunload', () => { cleanupOutput(); cleanupVideo(); });
    renderFrames();
    setSourceMode('images');
  }

  if (root?.document) {
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', initBrowserUi, { once: true });
    else initBrowserUi();
  }

  return { delayFromFps, repeatFromLoop, containRect, moveFrame, sampleTimes, loadGifenc };
});
