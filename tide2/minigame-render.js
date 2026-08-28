(() => {
  const extractBackgroundUrl = (element) => {
    if (!element) return '';
    const value = getComputedStyle(element).backgroundImage || '';
    const match = value.match(/^url\(["']?(.*?)["']?\)$/);
    return match ? match[1] : '';
  };

  const loadImage = (src) => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });

  const apply = async () => {
    const root = document.querySelector('#tide-real-game');
    const bar = root?.querySelector('.tr-bar');
    const bg = root?.querySelector('.tr-bg');
    const fill = document.querySelector('#tr-fill');
    const overlay = root?.querySelector('.tr-overlay');
    const marker = document.querySelector('#tr-marker');
    const areaOutput = document.querySelector('#tr-area-o');
    const posOutput = document.querySelector('#tr-pos-o');
    const medium = document.querySelector('#tr-medium');
    if (!root || !bar || !bg || !fill || !overlay || !marker || !areaOutput || !posOutput || !medium) return false;
    if (root.dataset.canvasRenderer === '1') return true;
    root.dataset.canvasRenderer = '1';

    const canvas = document.createElement('canvas');
    canvas.className = 'tr-canvas';
    canvas.width = 60;
    canvas.height = 9;
    canvas.setAttribute('aria-hidden', 'true');
    bar.appendChild(canvas);

    const style = document.createElement('style');
    style.id = 'tide-minigame-canvas-renderer';
    style.textContent = `
      #tide-real-game .tr-bar{
        width:calc(60px * var(--tide-ui-scale, 6))!important;
        height:calc(9px * var(--tide-ui-scale, 6))!important;
        overflow:visible!important;
        background:none!important;
      }
      #tide-real-game .tr-bg,
      #tide-real-game .tr-fill,
      #tide-real-game .tr-overlay,
      #tide-real-game .tr-marker,
      #tide-real-game .tr-perfect{
        visibility:hidden!important;
      }
      #tide-real-game .tr-canvas{
        position:absolute;
        inset:0;
        width:100%;
        height:100%;
        display:block;
        image-rendering:pixelated;
        image-rendering:crisp-edges;
        pointer-events:none;
      }
    `;
    document.head.appendChild(style);

    const ctx = canvas.getContext('2d', { alpha: true });
    ctx.imageSmoothingEnabled = false;

    const [bgImage, overlayImage, markerImage] = await Promise.all([
      loadImage(bg.src),
      loadImage(overlay.src),
      loadImage(marker.src)
    ]);

    const fillCache = new Map();
    let lastFillUrl = '';
    let lastFillImage = null;

    const getFillImage = async () => {
      const url = extractBackgroundUrl(fill);
      if (!url) return null;
      if (url === lastFillUrl && lastFillImage) return lastFillImage;
      if (!fillCache.has(url)) fillCache.set(url, loadImage(url));
      lastFillUrl = url;
      lastFillImage = await fillCache.get(url);
      return lastFillImage;
    };

    // Tide's older renderer used this exact horizontal slice geometry for
    // fishing/minigame_fill: 2 px left border, 2 px middle, 2 px right border.
    // Modern blitSprite uses the sprite metadata to achieve the same scalable fill.
    const drawFillNineSlice = (image, x, y, width) => {
      if (!image || width <= 0) return;
      const h = 7;
      if (width <= 4) {
        ctx.drawImage(image, 0, 0, 6, 7, x, y, width, h);
        return;
      }
      ctx.drawImage(image, 0, 0, 2, 7, x, y, 2, h);
      ctx.drawImage(image, 2, 0, 2, 7, x + 2, y, width - 4, h);
      ctx.drawImage(image, 4, 0, 2, 7, x + width - 2, y, 2, h);
    };

    let fillImage = await getFillImage();
    medium.addEventListener('change', () => {
      requestAnimationFrame(async () => {
        fillImage = await getFillImage();
      });
    });

    const draw = async () => {
      if (!fillImage) fillImage = await getFillImage();

      const area = Math.max(0, Math.min(1, Number.parseFloat(areaOutput.textContent) || 0));
      const pos = Math.max(-1, Math.min(1, Number.parseFloat(posOutput.textContent) || 0));

      // Exact Tide 2.1.1 renderer geometry.
      const areaOffset = Math.round(30 * (1 - area));
      const areaSize = Math.max(0, 60 - (2 * areaOffset));
      const markerX = 28 + Math.round(pos * 28);

      ctx.clearRect(0, 0, 60, 9);
      ctx.imageSmoothingEnabled = false;

      // The 7 px bar is vertically centered inside the 9 px marker canvas.
      ctx.drawImage(bgImage, 0, 0, 60, 7, 0, 1, 60, 7);
      drawFillNineSlice(fillImage, areaOffset, 1, areaSize);
      ctx.drawImage(overlayImage, 0, 0, 60, 7, 0, 1, 60, 7);
      ctx.drawImage(markerImage, 0, 0, 4, 9, markerX, 0, 4, 9);

      requestAnimationFrame(draw);
    };

    requestAnimationFrame(draw);
    return true;
  };

  const start = () => {
    apply().catch((error) => console.error('Tide canvas renderer failed:', error));
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }

  const observer = new MutationObserver(() => {
    if (!document.querySelector('#tide-real-game')?.dataset.canvasRenderer) start();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
