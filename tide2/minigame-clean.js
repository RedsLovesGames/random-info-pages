(() => {
  const apply = () => {
    const root = document.querySelector('#tide-real-game');
    const marker = document.querySelector('#tr-marker');
    const perfect = root?.querySelector('.tr-perfect');
    if (!root || !marker) return false;
    if (root.dataset.cleaned === '1') return true;
    root.dataset.cleaned = '1';

    // Keep the browser demo visually faithful to Tide's normal in-game bar.
    // The yellow perfect brackets and post-click yellow marker flash were demo-only additions.
    if (perfect) perfect.remove();

    const style = document.createElement('style');
    style.id = 'tide-minigame-clean';
    style.textContent = `
      #tide-real-game .tr-perfect{display:none!important}
      #tide-real-game .tr-marker{filter:none!important}
    `;
    document.head.appendChild(style);

    const normalMarker = marker.src;
    const keepNormalMarker = () => {
      if (marker.src !== normalMarker) marker.src = normalMarker;
    };
    keepNormalMarker();
    new MutationObserver(keepNormalMarker).observe(marker, {
      attributes: true,
      attributeFilter: ['src']
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
