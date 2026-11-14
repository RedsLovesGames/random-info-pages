import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const wordsDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(wordsDir, '../..');

export async function buildStandalone(destination = join(wordsDir, 'offline.html')) {
  let html = await readFile(join(wordsDir, 'index.html'), 'utf8');
  const dictionary = await readFile(join(wordsDir, 'dictionaries/towers-of-babble.txt'), 'utf8');
  const core = await readFile(join(wordsDir, 'words-core.js'), 'utf8');
  const app = await readFile(join(wordsDir, 'words-app.js'), 'utf8');
  const css = (await Promise.all([
    join(rootDir, 'tools/shared/toolbox.css'),
    join(wordsDir, 'words.css'),
    join(rootDir, 'design-system/rip.css'),
    join(rootDir, 'design-system/project-polish.css')
  ].map(path => readFile(path, 'utf8')))).join('\n')
    // Standalone files must never request Google Fonts or other remote assets.
    .replace(/@import\s+url\([^)]*\);\s*/g, '');

  if (dictionary.split(/\r?\n/).filter(Boolean).length !== 195415) {
    throw Error('Unexpected dictionary size; refusing to generate offline file.');
  }
  if (/<\/script/i.test(dictionary)) {
    throw Error('Dictionary cannot be safely embedded as script text.');
  }
  html = html.replace(/<link rel="stylesheet"[^>]*>\s*/g, '');
  html = html.replace(/<script src="\.\.\/\.\.\/design-system\/rip\.js" defer><\/script>\s*/g, '');
  html = html.replace(/<script type="module" src="\.\/words-app\.js"><\/script>\s*/g, '');
  html = html.replace(/<header class="tb-top">[\s\S]*?<\/header>/,
    '<header class="tb-top"><nav class="tb-shell tb-nav"><span class="tb-brand"><span class="ws-logo">w.</span> Offline Word Finder</span></nav></header>');
  html = html.replace(/<p class="ws-offline-link">[\s\S]*?<\/p>/,
    '<p class="ws-offline-link"><strong>Offline edition.</strong> All words and search code are inside this one file. You do not need an internet connection.</p>');
  html = html.replace(/<footer class="ws-footer">[\s\S]*?<\/footer>/,
    '<footer class="ws-footer">Includes the 172,823-word public-domain ENABLE dictionary. Saved as a standalone offline HTML document.</footer>');
  html = html.replace(/<button id="reloadDictionary"[\s\S]*?<\/button>/,
    '<button id="reloadDictionary" class="ws-inline-button" type="button">Restore included dictionary</button>');
  html = html.replace('</head>', '<style>\n' + css + '\n</style>\n</head>');

  const jsCore = core.replace(/^export /gm, '');
  const jsApp = app.replace(/^import [^\n]*\n/gm, '').replace(
    /\/\/ Once the page is loaded online,[\s\S]*$/,
    ''
  );
  const jsLoader = [
    'const LOCAL_DICTIONARY_URL = "embedded";',
    'async function loadLocalDictionary() {',
    '  return { words: parseDictionary(document.getElementById("embeddedDictionary").textContent), origin: "local" };',
    '}'
  ].join('\n');
  const executable = [jsCore, jsLoader, jsApp].join('\n');
  if (/<\/script/i.test(executable)) throw Error('Inline script tag in JS source');
  html = html.replace('</body>',
    '<script id="embeddedDictionary" type="text/plain">\n' + dictionary +
    '</script>\n<script>\n' + executable + '\n</script>\n</body>');
  if (/<(?:script|link)\b[^>]+(?:src|href)=/i.test(html)) {
    throw Error('Standalone document unexpectedly references an external script or stylesheet');
  }
  await writeFile(destination, html);
  return { file: destination, bytes: Buffer.byteLength(html), entries: 195415 };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await buildStandalone();
  process.stdout.write('Built standalone Word Finder: ' + result.bytes + ' bytes, ' + result.entries + ' words\n');
}
