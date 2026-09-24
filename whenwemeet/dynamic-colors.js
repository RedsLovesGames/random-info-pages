(() => {
  const clamp = (n) => Math.max(0, Math.min(1, Number(n) || 0));
  const colorForRatio = (ratio) => {
    const r = clamp(ratio);
    const hue = Math.round(r * 120);
    const light = Math.round(92 - r * 43);
    const saturation = Math.round(70 + r * 12);
    return { background: `hsl(${hue} ${saturation}% ${light}%)`, foreground: r > 0.68 ? '#071b10' : '#3a1d12' };
  };
  const paint = (cell, ratio) => {
    const c = colorForRatio(ratio);
    cell.style.background = c.background;
    cell.style.color = c.foreground;
    cell.dataset.ratio = String(clamp(ratio));
  };

  const oldResults = renderResultsGrid;
  renderResultsGrid = function renderDynamicResults() {
    oldResults();
    const total = Object.keys(state.event?.responses || {}).length;
    if (!total) return;
    els.resultsGrid.querySelectorAll('.slot-cell[data-key]').forEach((cell) => {
      const summary = summarizeSlot(state.event.responses || {}, cell.dataset.key);
      paint(cell, (summary.yes + summary.maybe * 0.5) / total);
    });
  };

  const observer = new MutationObserver(() => {
    document.querySelectorAll('.locked-cell').forEach((cell) => {
      const match = cell.textContent.trim().match(/^(\d+)\/(\d+)$/);
      if (match && Number(match[2])) paint(cell, Number(match[1]) / Number(match[2]));
    });
  });
  observer.observe(document.documentElement, { subtree: true, childList: true });

  window.WhenWeMeetColors = { colorForRatio };
})();
