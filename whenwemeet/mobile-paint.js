(() => {
  const grid = document.querySelector('#availability-grid');
  if (!grid) return;

  // Make touch/stylus painting deterministic: the grid owns movement only while a stroke is active.
  let painting = false;
  let pointerId = null;
  let moved = false;

  const finish = () => {
    if (!painting) return;
    painting = false;
    pointerId = null;
    grid.classList.remove('is-painting');
  };

  grid.addEventListener('pointerdown', (event) => {
    const cell = event.target.closest('.slot-cell');
    if (!cell || cell.disabled || event.button > 0) return;
    painting = true;
    pointerId = event.pointerId;
    moved = false;
    grid.classList.add('is-painting');
  }, { capture: true });

  grid.addEventListener('pointermove', (event) => {
    if (!painting || event.pointerId !== pointerId) return;
    moved = true;
    // On touch/stylus, stop the browser from scrolling the page while the user paints.
    if (event.pointerType !== 'mouse') event.preventDefault();
  }, { passive: false, capture: true });

  document.addEventListener('pointerup', finish, true);
  document.addEventListener('pointercancel', finish, true);

  // Quick per-day controls. They reuse the existing painter by dispatching pointer events to cells,
  // so autosave/coverage stay owned by the existing runtime.
  const toolbar = document.createElement('div');
  toolbar.className = 'mobile-paint-help';
  toolbar.innerHTML = '<strong>Paint your availability</strong><span>Choose Available, If needed, or Unavailable, then drag across times. On phone/tablet, drag paints instead of scrolling.</span>';
  grid.parentElement?.insertBefore(toolbar, grid);

  const style = document.createElement('style');
  style.textContent = `
    #availability-grid{touch-action:pan-x;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}
    #availability-grid.is-painting{touch-action:none;cursor:crosshair}
    #availability-grid .slot-cell{min-height:38px;min-width:54px;touch-action:none;user-select:none;-webkit-user-select:none}
    .mobile-paint-help{display:flex;justify-content:space-between;align-items:center;gap:14px;padding:10px 12px;margin:0 0 10px;border:1px solid var(--line);border-radius:12px;background:var(--surface-muted);font-size:.78rem}
    .mobile-paint-help span{color:var(--muted);text-align:right;max-width:620px}
    .brush-controls,.availability-toolbar,.quick-actions{position:sticky;top:8px;z-index:8}
    @media (pointer:coarse){
      #availability-grid .slot-cell{min-height:46px;min-width:62px}
      #availability-grid .time-head{min-height:46px;display:flex;align-items:center}
      .mobile-paint-help{align-items:flex-start;flex-direction:column}.mobile-paint-help span{text-align:left}
      .brush,.quick-action,[data-quick]{min-height:44px}
    }
    @media (max-width:600px){
      #availability-grid .slot-cell{min-height:50px;min-width:66px}
      .availability-scroll,.grid-scroll{overscroll-behavior:contain;-webkit-overflow-scrolling:touch}
    }
  `;
  document.head.append(style);

  window.WhenWeMeetMobilePaint = { version: 1, get painting(){ return painting; }, get moved(){ return moved; } };
})();