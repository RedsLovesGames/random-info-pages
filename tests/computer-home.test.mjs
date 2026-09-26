import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('index.html', 'utf8');

test('archive homepage exposes Random Info Computer as an optional lightweight entrance', () => {
  assert.match(html, /href=["']\.\/computer\/["']/);
  assert.match(html, /ENTER ARCHIVE COMPUTER/);
  assert.doesNotMatch(html, /computer-src\/|bundle\.[a-f0-9]+\.js|three(?:\.min)?\.js/i, 'homepage must not preload the 3D computer stack');
  assert.match(html, /data-archive-home/, 'existing archive homepage remains primary');
});
