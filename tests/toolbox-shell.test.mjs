import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../tools/index.html', import.meta.url), 'utf8');
const js = readFileSync(new URL('../tools/shared/toolbox.js', import.meta.url), 'utf8');

test('toolbox index links all shipped primary tools', () => {
  for (const route of ['./time/', './image/', './money/', './text/', './pdf/', './files/', './media/', './data/']) assert.match(html, new RegExp(`href="${route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`));
});

test('toolbox exposes favorites and recent tools', () => {
  assert.match(html, /id="favoritesOnly"/);
  assert.match(html, /id="recentTools"/);
  assert.match(html, /data-favorite/);
  assert.match(html, /'\.\/data\/':'Data'/);
  assert.match(js, /toggleFavorite/);
  assert.match(js, /recordRecent/);
});
