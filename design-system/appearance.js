/* Site appearance. Keep each exhibit's palette and transform its authored CSS
   when the visitor chooses the opposite scheme. Artwork, media and canvas
   pixels keep their own colors. */
(() => {
  'use strict';

  const root = document.documentElement;
  const entry = document.currentScript;
  const key = 'rip-appearance';
  const system = matchMedia('(prefers-color-scheme: dark)');
  const choices = ['system', 'light', 'dark'];
  const styles = new WeakMap();
  const colorCache = new Map();
  const hex = '#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{4}|[0-9a-f]{3})(?![\\w-])';
  const colorPattern = new RegExp(
    'url\\((?:"[^"]*"|\'[^\']*\'|[^)])*\\)|' + hex +
    '|(?:rgba?|hsla?)\\([^()]*\\)|\\b(?:black|white|whitesmoke|gainsboro|gray|grey)\\b', 'gi'
  );
  const colorProperties = /^(?:--[\w-]+|color|(?:background|border|outline|text-decoration|accent|caret|column-rule|scrollbar)(?:-[\w-]+)?|(?:box|text)-shadow)$/;
  const colorParser = document.createElement('canvas').getContext('2d');
  const inlineStyle = document.querySelector('style[data-rip-appearance-css]');
  const sheet = inlineStyle || document.createElement('link');
  if (!inlineStyle) {
    sheet.rel = 'stylesheet';
    sheet.href = new URL('appearance.css', entry.src).href;
    document.head.append(sheet);
  }

  function savedChoice() {
    try {
      const stored = localStorage.getItem(key);
      if (choices.includes(stored)) return stored;
    } catch { /* Preview or local browsing may disable persistence. */ }
    return 'system';
  }

  let preference = savedChoice();
  let nativeMode;
  let selector;
  let themeMeta;

  function rgb(value) {
    if (!colorParser) return undefined;
    colorParser.fillStyle = '#010203';
    colorParser.fillStyle = value;
    const color = colorParser.fillStyle;
    if (color.startsWith('#')) {
      return [1, 3, 5].map(index => parseInt(color.slice(index, index + 2), 16));
    }
    return color.match(/[\d.]+/g)?.map(Number);
  }

  function alternate(value) {
    if (value.toLowerCase().startsWith('url(')) return value;
    if (colorCache.has(value)) return colorCache.get(value);
    const channels = rgb(value);
    if (!channels || channels.length < 3) return value;
    const [red, green, blue, alpha = 1] = channels;
    const min = Math.min(red, green, blue);
    const max = Math.max(red, green, blue);
    const lightness = (min + max) / 2;
    const next = 249 - lightness * 0.91;
    const originalSpan = max - min;
    const maximumSpan = 2 * Math.min(next, 255 - next);
    const chroma = originalSpan ? Math.min(1, maximumSpan / originalSpan) : 1;
    const inverted = [red, green, blue].map(
      channel => Math.max(0, Math.min(255, Math.round(next + (channel - lightness) * chroma)))
    );
    // A nearly transparent line/shadow inherits the polarity of its authoring
    // color. Fully transparent colors retain their original interpolation.
    const result = alpha === 0 ? value :
      alpha < 1 ? 'rgba(' + [...inverted, alpha].join(', ') + ')' : 'rgb(' + inverted.join(', ') + ')';
    colorCache.set(value, result);
    return result;
  }

  function oppositeStyles(declaration, flip) {
    let edits = styles.get(declaration);
    if (!edits && !flip) return;
    if (!edits) {
      edits = [];
      for (const name of Array.from(declaration)) {
        if (!colorProperties.test(name)) continue;
        const before = declaration.getPropertyValue(name);
        const after = before.replace(colorPattern, alternate);
        if (before !== after) edits.push([name, before, after, declaration.getPropertyPriority(name)]);
      }
      styles.set(declaration, edits);
    }
    for (const [name, before, after, priority] of edits) {
      const value = flip ? after : before;
      if (declaration.getPropertyValue(name) !== value) declaration.setProperty(name, value, priority);
    }
  }

  function visitRules(rules, flip) {
    for (const rule of Array.from(rules)) {
      if (rule.style) oppositeStyles(rule.style, flip);
      if (rule.cssRules) visitRules(rule.cssRules, flip);
    }
  }

  function changePalette(flip) {
    for (const source of Array.from(document.styleSheets)) {
      if (source.ownerNode === sheet) continue;
      try { visitRules(source.cssRules, flip); } catch { /* External styles may be unreadable. */ }
    }
  }

  function authoredMode() {
    if (entry.dataset.nativeAppearance) return entry.dataset.nativeAppearance;
    const body = getComputedStyle(document.body);
    const documentStyle = getComputedStyle(root);
    for (const value of [body.backgroundColor, body.backgroundImage, documentStyle.backgroundColor]) {
      const first = value.match(/rgba?\([^()]*\)/)?.[0];
      if (!first) continue;
      const [r, g, b, a = 1] = rgb(first) ?? [];
      if (a < 0.2 || !Number.isFinite(r)) continue;
      return 0.2126 * r + 0.7152 * g + 0.0722 * b < 125 ? 'dark' : 'light';
    }
    const [r = 0, g = 0, b = 0] = rgb(body.color) ?? [];
    return (r + g + b) / 3 > 160 ? 'dark' : 'light';
  }

  function resolvedMode() {
    return preference === 'system' ? (system.matches ? 'dark' : 'light') : preference;
  }

  function apply() {
    if (!nativeMode) return;
    const mode = resolvedMode();
    if (entry.dataset.appearanceEngine === 'tideborne') {
      root.dataset.theme = mode;
    } else if (!['wheel', 'native'].includes(entry.dataset.appearanceEngine)) {
      changePalette(mode !== nativeMode);
    }
    root.dataset.ripAppearance = mode;
    root.style.colorScheme = mode;
    if (selector) selector.value = preference;
    if (themeMeta) themeMeta.content = mode === 'dark' ? '#202329' : '#f7f5ef';
    window.dispatchEvent(new CustomEvent('rip-appearancechange', { detail: { mode, preference } }));
  }

  function setPreference(value) {
    if (!choices.includes(value)) return;
    preference = value;
    try { localStorage.setItem(key, value); } catch { /* Still applies for this page. */ }
    apply();
  }

  window.RipAppearance = {
    get mode() { return resolvedMode(); },
    get preference() { return preference; },
    setPreference
  };

  function mount() {
    if (window.self !== window.top) return;
    const control = document.createElement('label');
    control.className = 'rip-appearance';
    const label = document.createElement('span');
    label.textContent = 'Theme';
    selector = document.createElement('select');
    selector.setAttribute('aria-label', 'Color theme');
    for (const value of choices) selector.add(new Option(value[0].toUpperCase() + value.slice(1), value));
    selector.value = preference;
    selector.addEventListener('change', () => setPreference(selector.value));
    control.append(label, selector);
    const rail = document.querySelector('#rip-site-layer .rip-actions, .nav-tools, [data-rip-theme-slot]');
    if (rail) rail.append(control);
    else {
      control.classList.add('rip-appearance-floating');
      document.body.append(control);
    }
  }

  function start() {
    nativeMode = authoredMode();
    themeMeta = document.querySelector('meta[name="theme-color"]');
    mount();
    apply();
    const observer = new MutationObserver(records => {
      const changed = records.some(record => Array.from(record.addedNodes).some(node =>
        node.nodeType === 1 && (node.matches('style, link[rel="stylesheet"]')) && node !== sheet
      ));
      if (changed) apply();
    });
    observer.observe(document.head, { childList: true });
    document.addEventListener('load', event => {
      if (event.target !== sheet && event.target?.matches?.('link[rel="stylesheet"]')) apply();
    }, true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
  system.addEventListener?.('change', () => { if (preference === 'system') apply(); });
  window.addEventListener('storage', event => {
    if (event.key === key || event.key === null) {
      preference = savedChoice();
      apply();
    }
  });
})();
