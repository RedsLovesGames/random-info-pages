import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const privateRoots = new Set(['.git', '.github', 'chirality/ketcher-src', 'computer-src', 'docs', 'scripts', 'tests']);

function pages(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = resolve(dir, entry.name);
    if (privateRoots.has(relative(root, path))) return [];
    if (entry.isDirectory()) return pages(path);
    return entry.name.endsWith('.html') && !entry.name.endsWith('.test.html') && entry.name !== 'offline.html'
      ? [path]
      : [];
  });
}

test('public pages reference the shared appearance control from their own directory', () => {
  for (const path of pages(root)) {
    const html = readFileSync(path, 'utf8');
    const script = html.match(/<script[^>]*src="([^"]*appearance\.js)"/);
    assert.ok(script, relative(root, path));
    assert.equal(resolve(dirname(path), script[1]), resolve(root, 'design-system/appearance.js'));
  }
});

test('homepage gives the project index a visible, named action and avoids a hero stat strip', () => {
  const html = readFileSync(resolve(root, 'index.html'), 'utf8');
  assert.match(html, /<a[^>]*href="#index"[^>]*>Browse projects<\/a>/);
  assert.doesNotMatch(html, /id="heroTotal"/);
  assert.doesNotMatch(html, /Explore this project\./);
});

test('dark appearance keeps the blue link accent readable on the page background', async () => {
  const { runInNewContext } = await import('node:vm');
  const values = new Map([['--paper', '#f2f1ec'], ['--blue', '#344ae5']]);
  const declaration = {
    0: '--paper', 1: '--blue', length: 2,
    getPropertyValue: key => values.get(key),
    getPropertyPriority: () => '',
    setProperty: (key, value) => values.set(key, value)
  };
  const page = { self: {}, top: {}, addEventListener() {}, dispatchEvent() {} };
  const document = {
    documentElement: { dataset: {}, style: {} },
    currentScript: { src: 'https://example.test/appearance.js', dataset: { nativeAppearance: 'light' } },
    styleSheets: { 0: { cssRules: { 0: { style: declaration }, length: 1 } }, length: 1 },
    head: { append() {} },
    querySelector: () => null,
    addEventListener() {},
    createElement: name => name === 'canvas' ? { getContext: () => ({ fillStyle: '' }) } : {}
  };
  const source = readFileSync(resolve(root, 'design-system/appearance.js'), 'utf8');
  runInNewContext(source, {
    window: page, document, URL,
    matchMedia: () => ({ matches: true }),
    localStorage: { getItem: () => 'dark' },
    MutationObserver: class { observe() {} },
    CustomEvent: class {}
  });
  function luminance(rgb) {
    const linear = rgb.match(/\d+/g).map(channel => {
      const s = Number(channel) / 255;
      return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
  }
  const ratio = (luminance(values.get('--blue')) + 0.05) / (luminance(values.get('--paper')) + 0.05);
  assert.ok(ratio >= 4.5, 'dark-mode blue link contrast was ' + ratio.toFixed(2));
});
