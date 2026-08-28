(() => {
  const apply = () => {
    const root = document.querySelector('#tide-real-game');
    const stage = root?.querySelector('.tr-stage');
    const wrap = document.querySelector('#tr-wrap');
    if (!root || !stage || !wrap) return false;

    const style = document.createElement('style');
    style.textContent = `
      #tide-real-game .tr-stage{cursor:pointer}
      #tide-real-game .tr-wrap{cursor:pointer}
      #tide-real-game .tr-bg,
      #tide-real-game .tr-overlay{image-rendering:auto!important}
      #tide-real-game .tr-fill{
        background-repeat:no-repeat!important;
        background-size:100% 100%!important;
        image-rendering:auto!important;
      }
      #tide-real-game #tr-start{display:none!important}
    `;
    document.head.appendChild(style);

    const headCopy = root.querySelector('.tr-head p');
    if (headCopy) {
      headCopy.textContent = 'I pulled the renderer and movement code from Tide 2.1.1. Click or tap the play area once to start the attempt, then click or tap it again while the marker is inside the filled zone. Switch modes to feel the same Tide minigame with Original Tide values versus Fishing 2.0 values.';
    }

    const status = document.querySelector('#tr-status');
    const sub = document.querySelector('#tr-sub');
    if (status && !root.classList.contains('running')) status.textContent = 'Click the play area to start.';
    if (sub && !root.classList.contains('running')) sub.textContent = 'Once it starts, click the play area again to reel. Your click position does not matter.';

    const random = document.querySelector('#tr-random');
    if (random) random.textContent = 'Random fish';

    stage.addEventListener('pointerdown', event => {
      if (wrap.contains(event.target)) return;
      if (event.target.closest('button,input,select,label,a')) return;
      event.preventDefault();
      wrap.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
        pointerType: event.pointerType || 'mouse',
        clientX: event.clientX,
        clientY: event.clientY
      }));
    });

    return true;
  };

  if (!apply()) {
    const observer = new MutationObserver(() => {
      if (apply()) observer.disconnect();
    });
    observer.observe(document.documentElement, {childList:true, subtree:true});
  }
})();
