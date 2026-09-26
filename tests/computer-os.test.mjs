import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (file) => fs.readFileSync(file, 'utf8');

test('Random Info OS exists and forwards normalized input events', () => {
  assert.ok(fs.existsSync('os/index.html'), 'os/index.html must exist');
  assert.ok(fs.existsSync('os/asset-manifest.json'), 'os/asset-manifest.json must exist');
  assert.ok(fs.existsSync('os/js-dos/js-dos.js'), 'js-dos runtime must exist');

  const staticJs = fs.readdirSync('os/static/js').filter((name) => name.endsWith('.js'));
  const staticCss = fs.readdirSync('os/static/css').filter((name) => name.endsWith('.css'));
  assert.ok(staticJs.length > 0, 'compiled React JavaScript must exist');
  assert.ok(staticCss.length > 0, 'compiled React CSS must exist');

  const html = read('os/index.html');
  assert.match(html, /RANDOM INFO OS/);
  assert.match(html, /Random Info OS/);
  assert.match(html, /js-dos\/js-dos\.js/);
  assert.match(html, /static\/js\/main\.[a-f0-9]+\.js/);
  assert.match(html, /static\/css\/main\.[a-f0-9]+\.css/);

  for (const type of ['mousemove', 'mousedown', 'mouseup', 'keydown', 'keyup']) {
    assert.match(html, new RegExp(`addEventListener\\(['\"]${type}['\"]`), `must listen for ${type}`);
  }
  assert.match(html, /clientX/);
  assert.match(html, /clientY/);
  assert.match(html, /key/);
  assert.match(html, /parent\.postMessage/);
  assert.doesNotMatch(html, /postMessage\(\s*event\b/, 'must not post the raw DOM Event');

  for (const bundle of ['doom.jsdos', 'trail.jsdos', 'scrabble.jsdos']) {
    assert.ok(fs.existsSync(path.join('os', bundle)), `${bundle} must exist`);
  }
});

test('CRT monitor targets the local same-origin OS and validates messages', () => {
  const monitor = read('computer-src/src/Application/World/MonitorScreen.ts');
  assert.doesNotMatch(monitor, /os\.henryheffernan\.com/);
  assert.match(monitor, /new URL\(['"]\.\.\/os\/['"],\s*window\.location\.href\)/);
  assert.match(monitor, /event\.source\s*!==\s*iframe\.contentWindow/);
  assert.match(monitor, /event\.origin\s*!==\s*window\.location\.origin/);
  assert.match(monitor, /Random Info OS/);
});
