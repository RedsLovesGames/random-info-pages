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

  // Each route has a silhouette, a day/night palette and a hand-drawn motif.
  // Motifs use 24-unit drawing coordinates and are rendered on a small canvas.
  const palettes = {
    ink: ['#e7e4dd', '#3b414d'],
    amber: ['#ffe1a5', '#59412d'],
    rose: ['#f6d5d7', '#613953'],
    green: ['#d2ebc0', '#2e4e3e'],
    teal: ['#bfece5', '#22505b'],
    blue: ['#cde4fa', '#2b4270'],
    violet: ['#e4daf6', '#483760'],
    sand: ['#eadcc3', '#58453a'],
    ice: ['#d9ebed', '#354b58']
  };

  const designs = {
    home: ['horizon', 'blue', 'M2 18h20M4 18l5-6 4 4 3-2 4 4M13 7h7m-5-2h3M5 8h4'],
    'classic.html': ['stack', 'ink', 'M4 4h16v16H4zM4 9h16M7 12h4v5H7zM14 12h3m-3 4h3'],
    'archive': ['stack', 'sand', 'M4 8h16v12H4zM3 4h18v4H3zM9 13h6m-5 3h4'],
    '9-11-timeline': ['meter', 'ink', 'M3 19h18M4 19v-3m5 3v-6m6 6v-6m5 6v-3M12 3a5 5 0 1 0 0 10 5 5 0 0 0 0-10v3l2 2'],
    'algorithm-arena': ['meter', 'teal', 'M4 20V12h3v8zM10 20V8h3v12zM16 20V4h3v16z'],
    'belief-atlas': ['dial', 'violet', 'M12 3v5m0 8v5M3 12h5m8 0h5M12 8l4 4-4 4-4-4zM5 5l2 2m10 10 2 2M19 5l-2 2M7 17l-2 2'],
    'chirality': ['dial', 'teal', 'M10 10v4m4-4v4m-4-2h4M4 7l3 5-3 5m16-10-3 5 3 5M12 3v2m0 14v2'],
    'chirality/ketcher-ui': ['frame', 'green', 'M12 3l7 4v9l-7 4-7-4V7zM8 9l4-2m4 6v2m-4 2-4-2'],
    'computer': ['frame', 'blue', 'M3 4h18v13H3zM8 21h8m-4-4v4M6 8l3 2-3 2m5 0h5'],
    'cryptography-museum': ['lever', 'sand', 'M5 10h14v10H5zM8 10V7a4 4 0 1 1 8 0v3m-4 3v4'],
    'device-worlds': ['frame', 'violet', 'M2 5h14v11H2zM6 19h6m-3-3v3m9-9h4v10h-6v-4m2 2h2'],
    'dungeon-forge': ['frame', 'amber', 'M4 20V5h3v3h3V5h4v3h3V5h3v15zM9 20v-6a3 3 0 0 1 6 0v6'],
    'fiction-workspace': ['stack', 'sand', 'M5 4h10l4 4v12H5zM14 4v5h5M8 12h8m-8 3h8m-8 3h5'],
    'friends': ['horizon', 'rose', 'M3 19c0-4 2-6 5-6s5 2 5 6m0-5c4-2 8 0 8 5M8 5a3 3 0 1 0 0 6 3 3 0 0 0 0-6m9 0a3 3 0 1 0 0 6 3 3 0 0 0 0-6'],
    'friends/ranked': ['lever', 'amber', 'M7 4h10v5a5 5 0 0 1-10 0zM7 6H3v2c0 2 2 4 5 4m9-6h4v2c0 2-2 4-5 4m-4 2v5m-4 1h8'],
    'heatmap': ['frame', 'rose', 'M3 3h18v18H3zM9 3v18m6-18v18M3 9h18M3 15h18m-10-4h2v2h-2z'],
    'heatmap/compare': ['meter', 'rose', 'M3 5h7v14H3zM14 5h7v14h-7zM5 15h3m8-6h3m-3 4h3'],
    'id-card-maker': ['stack', 'rose', 'M2 6h20v12H2zM5 15c0-4 6-4 6 0M8 9a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3m6 1h5m-5 4h4'],
    'infrastructure-atlas': ['horizon', 'ice', 'M2 18h20M5 18V8m14 10V8M2 9c6 6 14 6 20 0M8 13v5m4-4v4m4-5v5'],
    'marble-sequencer': ['meter', 'amber', 'M4 6h16m-14 4c0 4 4 4 4 8m4-8c0 4 4 4 4 8M6 10h.01M14 10h.01M3 20h18'],
    'melon-jelly': ['horizon', 'green', 'M3 9h18a9 9 0 0 1-18 0zm2 3h14m-8 2 1 1m3-1-1 1'],
    'midterm-2026': ['stack', 'blue', 'M6 10h12l3 4v6H3v-6zM3 14h18M8 5l6-2 3 6M9 9l6-2m-6 10h6'],
    'music-microscope': ['meter', 'teal', 'M2 12h3l2-5 3 11 3-14 3 15 2-7h4'],
    'nerdcore-prompts': ['lever', 'violet', 'M9 10V6a3 3 0 0 1 6 0v4a3 3 0 0 1-6 0m-3 0a6 6 0 0 0 12 0m-6 6v4m-3 0h6M11 7h2m-2 3h2'],
    'oldasspolitic': ['horizon', 'sand', 'M3 20h18M5 17h14M6 11h12m-11 0a5 5 0 0 1 10 0M12 6V3m-4 9v5m4-5v5m4-5v5'],
    'oldasspolitic/member': ['stack', 'violet', 'M6 3h12v18H6zM9 14c0-4 6-4 6 0m-3-7a2 2 0 1 0 0 4 2 2 0 0 0 0-4m-3 10h6'],
    'one-million': ['meter', 'ink', 'M5 5h2m3 0h2m3 0h2m3 0h1M3 10h2m3 0h2m3 0h2m3 0h2M5 15h2m3 0h2m3 0h2m3 0h1M3 20h2m3 0h2m3 0h2m3 0h2'],
    'os': ['frame', 'teal', 'M4 5l7-1v7H4zm9-1 7-1v8h-7zm-9 9h7v7l-7-1zm9 0h7v8l-7-1z'],
    'political-grid': ['dial', 'violet', 'M3 3h18v18H3zM12 3v18M3 12h18m-6 3 4-4m-2 0h2v2'],
    'school-schedule': ['stack', 'sand', 'M4 5h16v15H4zM4 9h16M8 3v4m8-4v4M8 13h2v3h-2zm5-1h4m-4 4h4'],
    'shard-fusions': ['dial', 'violet', 'M12 2l7 7-3 9-4 4-4-4-3-9zM5 9h14m-7-7-2 7 2 13 2-13z'],
    'stock-fights': ['meter', 'green', 'M3 4v16h18M5 16l4-5 4 3 6-8m-4 0h4v4'],
    'tide2': ['horizon', 'blue', 'M2 16q3-4 6 0t6 0 6 0M4 20q3-3 6 0t6 0m-4-15v8m-3-5 3-3 3 3'],
    'tide2/mechanics-reference.html': ['stack', 'ice', 'M3 5h7l2 2 2-2h7v14h-7l-2 2-2-2H3zm9 3v12m-6-9h3m-3 4h3m6-4h3m-3 4h3'],
    'tideborne': ['horizon', 'teal', 'M3 12q6-9 13 0-7 9-13 0m13 0 5-4v8zM7 11v1m3 7h8'],
    'tideborne/compatibility': ['frame', 'green', 'M4 8h6v8H4zm10 0h6v8h-6zm-4 4h4m-8-7v3m2-3v3m8 8v3m2-3v3'],
    'tideborne/config': ['lever', 'teal', 'M4 6h16M4 12h16M4 18h16M8 4v4m8 2v4m-6 2v4'],
    'tideborne/design': ['stack', 'sand', 'M4 20l2-6L17 3l4 4-11 11zM14 6l4 4M6 14l4 4m-4 2h13'],
    'tideborne/ecosystem': ['horizon', 'green', 'M12 21v-7M12 16C4 16 3 11 4 7c6 0 8 3 8 9zm0-2c0-6 3-9 8-10 1 5-2 10-8 10'],
    'tideborne/fish': ['horizon', 'ice', 'M3 13q5-6 12 0l5-4v8l-5-4q-7 6-12 0m4-1v1m2-4 3-4 3 5'],
    'tideborne/fishing': ['lever', 'blue', 'M5 20l5-14q6-5 9 1v7m0 0v3a2 2 0 0 1-4 0v-2m-11 4 3 1'],
    'tideborne/fishing/body-types': ['frame', 'ice', 'M3 8q4-4 11 0l4-3v6l-4-3q-7 4-11 0zm1 8q5-7 12 0l4-4v8l-4-4q-7 7-12 0'],
    'tideborne/fishing/condition': ['meter', 'rose', 'M3 12h4l2-5 4 10 2-5h6M3 8V6h18v2M3 16v2h18v-2'],
    'tideborne/fishing/fishscore': ['meter', 'blue', 'M3 9h18v8H3zM7 9v4m3-4v2m4-2v4m3-4v2M6 20h12'],
    'tideborne/fishing/momentum': ['meter', 'teal', 'M3 7h7m-5 5h10M3 17h7m1-10 6 5-6 5m5-10 6 5-6 5'],
    'tideborne/fishing/perfect-catch': ['dial', 'amber', 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M8 12l3 3 5-6'],
    'tideborne/fishing/pigmentation': ['dial', 'rose', 'M12 3c-2 4-6 8-6 12a6 6 0 0 0 12 0c0-4-4-8-6-12zm0 8c-1 2-3 4-3 5'],
    'tideborne/fishing/quality': ['stack', 'amber', 'M12 3l3 5 6 1-4 4 1 6-6-3-6 3 1-6-4-4 6-1z'],
    'tideborne/fishing/specimens': ['frame', 'green', 'M7 3h10v4H7zm1 4v4l-3 3v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5l-3-3V7m-7 9h6'],
    'tideborne/fishing/trait-luck': ['dial', 'green', 'M12 12C3 11 5 4 9 5c2 0 3 2 3 3 0-1 1-3 3-3 4-1 6 6-3 7zm0 0c6 0 8 7 3 7-2 0-3-2-3-4-1 3-3 5-5 3-3-3 1-6 5-6m0 3-2 6'],
    'tideborne/gallery': ['frame', 'violet', 'M3 5h18v14H3zm0 11 5-5 5 5 3-3 5 4M15 9h2'],
    'tideborne/gear': ['lever', 'ink', 'M13 3l2 4 4 1-2 4 2 4-4 1-2 4-4-3-4-1 2-5-2-4 4-1zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6'],
    'tideborne/getting-started': ['horizon', 'sand', 'M2 17h20M4 17l4-5 3 5m2 0 3-4 4 4M12 4v9m-3-6 3-3 3 3'],
    'tideborne/journal': ['stack', 'green', 'M7 3h12v18H7zM4 6h5M4 12h5M4 18h5m3-10h4m-4 4h4m-4 4h3'],
    'tideborne/reference': ['stack', 'blue', 'M4 4h6l2 2 2-2h6v16h-6l-2 2-2-2H4zm8 3v14M7 9h2m-2 4h2m6-4h2m-2 4h2'],
    'tideborne/reference/mechanics': ['meter', 'violet', 'M4 19h16M6 16l4-5 3 2 5-7M6 16h.1m4-5h.1m3 2h.1m5-7h.1M4 5v14'],
    'tideborne/satchel': ['stack', 'amber', 'M4 9h16v11H4zm4 0V6a4 4 0 1 1 8 0v3M4 13h16m-9-2h2v4h-2z'],
    'tideborne/status': ['meter', 'green', 'M4 20h16M6 16h3v-4H6zm5 0h3V8h-3zm5 0h3V5h-3z'],
    'tideborne/tide': ['horizon', 'blue', 'M2 16q3-4 6 0t6 0 6 0M3 20q3-3 6 0t6 0m3-16a4 4 0 1 0 2 6 4 4 0 0 1-2-6'],
    'today': ['horizon', 'amber', 'M2 16h20m-17 3h14M7 16a5 5 0 0 1 10 0M12 5v3M4 10l2 2m14-2-2 2'],
    'tools': ['frame', 'ink', 'M3 8h18v12H3zm5 0V4h8v4M3 12h18m-10-1v3h2v-3'],
    'tools/codes': ['lever', 'violet', 'M3 5h6v6H3zm12 0h6v6h-6zM3 15h6v6H3zm12 0h3v3h3v3m-6-3v3m6-6v1'],
    'tools/data': ['frame', 'teal', 'M4 6h16v12H4zM4 10h16m-16 4h16m-11-8v12m6-12v12'],
    'tools/developer': ['frame', 'ink', 'M3 5h18v14H3zM6 9l3 3-3 3m5 0h6'],
    'tools/files': ['stack', 'amber', 'M3 7h7l2 3h9l-2 9H3zM3 7V5h8l2 2h7v3'],
    'tools/image': ['frame', 'rose', 'M3 4h18v16H3zM3 16l5-5 4 4 3-2 6 5M16 8a1 1 0 1 0 0 2 1 1 0 0 0 0-2'],
    'tools/math': ['meter', 'blue', 'M5 7h6M8 4v6m6-3h5M6 14l4 4m0-4-4 4m8-4h5m-5 4h5'],
    'tools/media': ['frame', 'violet', 'M3 5h18v14H3zM9 8l7 4-7 4zM3 8h3m12 0h3M3 16h3m12 0h3'],
    'tools/money': ['dial', 'green', 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18m3 5h-4a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4H9m3-10v12'],
    'tools/network': ['dial', 'teal', 'M5 4h4v4H5zm10 12h4v4h-4zM5 16h4v4H5zm10-12h4v4h-4zM7 8v8m10-8v8M9 6h6M9 18h6'],
    'tools/pdf': ['stack', 'rose', 'M5 3h9l5 5v13H5zm9 0v5h5m-11 8 3-4 1-3 2 6 3 1z'],
    'tools/random': ['dial', 'amber', 'M4 4h16v16H4zm4 4h1m6 0h1m-8 8h1m6 0h1m-5-4h2'],
    'tools/text': ['stack', 'sand', 'M4 6h16m-8 0v12m-4 0h8M4 6v3m16-3v3'],
    'tools/time': ['dial', 'ice', 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16v8l4 2m-7-12h6'],
    'tools/words': ['stack', 'blue', 'M3 7h8v10H3zm10 0h8v10h-8zM5 14l2-4 2 4m-3-1h2m7-3h4l-4 4h4'],
    'tools/words/quests.html': ['frame', 'amber', 'M5 20h14M8 20V9h8v11M6 9h12V5h-3v2h-3V5H9v2H6zm5 5h2'],
    'word-finder-offline': ['stack', 'blue', 'M3 6h8v12H3zm10 0h8v12h-8zM5 15l2-5 2 5m6-5v4h4m-2-2 2 2-2 2'],
    'useless-unit-converter': ['meter', 'amber', 'M3 8h18v8H3zM6 8v5m3-5v3m3-3v5m3-5v3m3-3v5'],
    'vct-scout': ['lever', 'rose', 'M4 5l8 14 8-14h-4l-4 7-4-7zM3 19h3m12 0h3'],
    'wanuiv2': ['frame', 'violet', 'M3 6h18v14H3zM3 10h18M6 6l3 4m4-4 3 4m-7 3 5 2-5 2z'],
    'wheel': ['dial', 'amber', 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18v7m0 4v7M3 12h7m4 0h7M6 6l4 4m4 4 4 4m0-12-4 4m-4 4-4 4'],
    'whenwemeet': ['stack', 'teal', 'M3 6h18v14H3zM3 10h18M7 4v4m10-4v4m-9 7 3 2 5-4'],
    'word-hitlist': ['lever', 'rose', 'M3 5h18v14H3zM6 9h2m2 0h2m2 0h2m2 0h1M6 13h2m2 0h2m2 0h2m2 0h1M8 16h8'],
    fallback: ['frame', 'ink', 'M3 5h18v14H3zM6 8h5v5H6zM6 16h12m-4-7h4']
  };

  function savedChoice() {
    try {
      const stored = localStorage.getItem(key);
      if (choices.includes(stored)) return stored;
    } catch { /* Preview or local browsing may disable persistence. */ }
    return 'system';
  }

  let preference = savedChoice();
  let nativeMode;
  let syncControl;
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
    const originalSpan = max - min;
    let next = 249 - lightness * 0.91;
    // Saturated accents in the middle of the range need extra separation
    // from their new background, especially blues on dark surfaces.
    if (originalSpan >= 75 && lightness >= 55 && lightness <= 195) {
      next = nativeMode === 'light' ? Math.max(next, 191) : Math.min(next, 96);
    }
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
    syncControl?.(mode, preference);
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
    const pagePath = entry.dataset.appearancePage || (location.pathname
      .slice(new URL('../', entry.src).pathname.length)
      .replace(/(?:^|\/)index\.html$/, '').replace(/\/$/, '') || 'home');
    const design = Object.hasOwn(designs, pagePath) ? pagePath : 'fallback';
    const [shape, palette, drawing] = designs[design];
    const [day, night] = palettes[palette];
    const control = document.createElement('div');
    control.className = 'rip-appearance';
    control.dataset.appearanceDesign = design;
    control.dataset.appearanceShape = shape;
    control.style.setProperty('--rip-switch-day', day);
    control.style.setProperty('--rip-switch-night', night);

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'rip-theme-switch';
    toggle.setAttribute('role', 'switch');
    toggle.setAttribute('aria-label', 'Dark mode');
    toggle.addEventListener('click', () => setPreference(resolvedMode() === 'dark' ? 'light' : 'dark'));

    const face = document.createElement('span');
    face.className = 'rip-theme-face';
    face.setAttribute('aria-hidden', 'true');
    const art = document.createElement('canvas');
    // A small, high-DPI drawing with a 24-unit coordinate system.
    art.width = art.height = 72;
    const paint = art.getContext('2d');
    const motif = paint && new Path2D(drawing);

    const indicator = document.createElement('span');
    indicator.className = 'rip-theme-indicator';
    const sun = document.createElement('span');
    sun.className = 'rip-theme-sun';
    const moon = document.createElement('span');
    moon.className = 'rip-theme-moon';
    indicator.append(sun, moon);
    face.append(art, indicator);
    toggle.append(face);

    const auto = document.createElement('button');
    auto.type = 'button';
    auto.className = 'rip-theme-auto';
    auto.setAttribute('aria-label', 'Use system theme');
    auto.title = 'Follow your device appearance';
    const autoLabel = document.createElement('span');
    autoLabel.textContent = 'Auto';
    auto.append(autoLabel);
    auto.addEventListener('click', () => setPreference('system'));
    control.append(toggle, auto);

    let illustratedMode;
    syncControl = (mode, preference) => {
      toggle.setAttribute('aria-checked', String(mode === 'dark'));
      toggle.title = mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
      auto.setAttribute('aria-pressed', String(preference === 'system'));
      if (!paint || illustratedMode === mode) return;
      illustratedMode = mode;
      paint.setTransform(3, 0, 0, 3, 0, 0);
      paint.clearRect(0, 0, 24, 24);
      paint.strokeStyle = mode === 'dark' ? '#f5f2e9' : '#171d25';
      paint.lineWidth = 1.65;
      paint.lineCap = paint.lineJoin = 'round';
      paint.stroke(motif);
    };
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
