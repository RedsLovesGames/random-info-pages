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
