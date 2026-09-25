(() => {
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));
  const textInput = $('#textInput');
  const textOutput = $('#textOutput');
  const wordCount = $('#wordCount');
  const characterCount = $('#characterCount');
  const characterNoSpaceCount = $('#characterNoSpaceCount');
  const lineCount = $('#lineCount');
  const copyOutput = $('#copyOutput');
  const useOutput = $('#useOutput');
  const swapText = $('#swapText');
  const textStatus = $('#textStatus');
  const cleanerTools = $('#cleanerTools');
  const listTools = $('#listTools');
  const listOptions = $('#listOptions');
  const separatorInput = $('#separatorInput');
  const cleanerPanel = $('#cleanerPanel');
  const markdownPanel = $('#markdownPanel');
  const markdownInput = $('#markdownInput');
  const markdownPreview = $('#markdownPreview');
  const markdownStatus = $('#markdownStatus');
  const copyMarkdownHtml = $('#copyMarkdownHtml');
  const copyMarkdownSource = $('#copyMarkdownSource');

  const MARKED_URL = 'https://cdn.jsdelivr.net/npm/marked@18.0.14/lib/marked.umd.js';
  const DOMPURIFY_URL = 'https://cdn.jsdelivr.net/npm/dompurify@3.4.16/dist/purify.min.js';
  let markdownDepsPromise = null;
  let activeMode = 'cleaner';
  let markdownRenderToken = 0;

  function setTextStatus(message) {
    textStatus.textContent = message || '';
  }

  function updateStats() {
    const values = TextCore.stats(textInput.value);
    wordCount.textContent = values.words.toLocaleString();
    characterCount.textContent = values.characters.toLocaleString();
    characterNoSpaceCount.textContent = values.charactersNoSpaces.toLocaleString();
    lineCount.textContent = values.lines.toLocaleString();
  }

  function writeOutput(value, label = 'Updated output.') {
    textOutput.value = value;
    setTextStatus(label);
  }

  function runAction(action) {
    const input = textInput.value;
    const separator = separatorInput.value || ', ';
    switch (action) {
      case 'upper': return writeOutput(TextCore.upperCase(input), 'Uppercase applied.');
      case 'lower': return writeOutput(TextCore.lowerCase(input), 'Lowercase applied.');
      case 'title': return writeOutput(TextCore.titleCase(input), 'Title case applied.');
      case 'sentence': return writeOutput(TextCore.sentenceCase(input), 'Sentence case applied.');
      case 'trim-lines': return writeOutput(TextCore.trimLines(input), 'Lines trimmed.');
      case 'collapse': return writeOutput(TextCore.collapseWhitespace(input), 'Whitespace collapsed.');
      case 'remove-blanks': return writeOutput(TextCore.removeBlankLines(input), 'Blank lines removed.');
      case 'dedupe': return writeOutput(TextCore.listItems(input, { dedupe: true }).join('\n'), 'Duplicate lines removed.');
      case 'sort-asc': return writeOutput(TextCore.sortLines(input, 'asc'), 'Sorted A → Z.');
      case 'sort-desc': return writeOutput(TextCore.sortLines(input, 'desc'), 'Sorted Z → A.');
      case 'reverse': return writeOutput(TextCore.reverseLines(input), 'Line order reversed.');
      case 'strip-markers': return writeOutput(TextCore.stripListMarkers(input), 'List markers removed.');
      case 'bullet': return writeOutput(TextCore.addBullets(input), 'Bullets added.');
      case 'number': return writeOutput(TextCore.addNumbers(input), 'Numbering added.');
      case 'separator-to-lines': return writeOutput(TextCore.separatorToLines(input, separatorInput.value || ','), 'Separated values converted to lines.');
      case 'lines-to-separator': return writeOutput(TextCore.linesToSeparator(input, separator), 'Lines joined with separator.');
      default: break;
    }
  }

  async function copyText(value, successMessage) {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(value);
      else {
        const area = document.createElement('textarea');
        area.value = value;
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.append(area);
        area.select();
        document.execCommand('copy');
        area.remove();
      }
      if (successMessage) setTextStatus(successMessage);
      return true;
    } catch (_) {
      if (successMessage) setTextStatus('Copy failed.');
      return false;
    }
  }

  function loadScript(url, marker, ready) {
    if (ready()) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[${marker}]`);
      const complete = () => ready() ? resolve() : reject(new Error('Library did not initialize.'));
      if (existing) {
        existing.addEventListener('load', complete, { once: true });
        existing.addEventListener('error', () => reject(new Error('Library failed to load.')), { once: true });
        return;
      }
      const script = document.createElement('script');
      script.setAttribute(marker, 'true');
      script.src = url;
      script.crossOrigin = 'anonymous';
      script.onload = complete;
      script.onerror = () => reject(new Error('Library failed to load.'));
      document.head.append(script);
    });
  }

  function loadMarkdownDeps() {
    if (window.marked?.parse && window.DOMPurify?.sanitize) return Promise.resolve();
    if (!markdownDepsPromise) {
      markdownDepsPromise = Promise.all([
        loadScript(MARKED_URL, 'data-marked', () => Boolean(window.marked?.parse)),
        loadScript(DOMPURIFY_URL, 'data-dompurify', () => Boolean(window.DOMPurify?.sanitize)),
      ]).catch((error) => {
        markdownDepsPromise = null;
        throw error;
      });
    }
    return markdownDepsPromise;
  }

  async function renderMarkdown() {
    if (activeMode !== 'markdown') return;
    const token = ++markdownRenderToken;
    markdownStatus.textContent = 'Loading Markdown renderer and sanitizer…';
    try {
      await loadMarkdownDeps();
      if (token !== markdownRenderToken || activeMode !== 'markdown') return;
      const raw = window.marked.parse(markdownInput.value, { gfm: true, breaks: false });
      const clean = window.DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } });
      markdownPreview.innerHTML = clean;
      for (const anchor of markdownPreview.querySelectorAll('a[href]')) {
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
      }
      markdownStatus.textContent = 'Preview sanitized locally with DOMPurify.';
    } catch (error) {
      if (token !== markdownRenderToken) return;
      markdownPreview.textContent = markdownInput.value;
      markdownStatus.textContent = `Markdown preview unavailable: ${error.message || error}`;
    }
  }

  function setMode(mode) {
    activeMode = mode;
    const markdown = mode === 'markdown';
    cleanerPanel.hidden = markdown;
    markdownPanel.hidden = !markdown;
    cleanerTools.hidden = mode !== 'cleaner';
    listTools.hidden = mode !== 'list';
    listOptions.hidden = mode !== 'list';
    for (const button of $$('[data-mode]')) {
      const selected = button.dataset.mode === mode;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-selected', String(selected));
    }
    if (markdown) renderMarkdown();
    else updateStats();
  }

  textInput.addEventListener('input', updateStats);
  for (const button of $$('[data-action]')) button.addEventListener('click', () => runAction(button.dataset.action));
  for (const button of $$('[data-mode]')) button.addEventListener('click', () => setMode(button.dataset.mode));
  copyOutput.addEventListener('click', () => copyText(textOutput.value, 'Output copied.'));
  useOutput.addEventListener('click', () => {
    textInput.value = textOutput.value;
    updateStats();
    setTextStatus('Output moved to input.');
  });
  swapText.addEventListener('click', () => {
    const oldInput = textInput.value;
    textInput.value = textOutput.value;
    textOutput.value = oldInput;
    updateStats();
    setTextStatus('Input and output swapped.');
  });
  markdownInput.addEventListener('input', renderMarkdown);
  copyMarkdownHtml.addEventListener('click', () => copyText(markdownPreview.innerHTML).then((ok) => { markdownStatus.textContent = ok ? 'Sanitized HTML copied.' : 'Copy failed.'; }));
  copyMarkdownSource.addEventListener('click', () => copyText(markdownInput.value).then((ok) => { markdownStatus.textContent = ok ? 'Markdown copied.' : 'Copy failed.'; }));

  markdownInput.value = '# Markdown playground\n\nWrite **Markdown** here. The rendered HTML is sanitized before it enters the preview.\n\n- Fast\n- Local editing\n- No account\n\n```js\nconsole.log("hello");\n```';
  updateStats();
  setMode('cleaner');
})();
