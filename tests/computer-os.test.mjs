import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');

test('Random Info OS exists and forwards normalized input events', () => {
  assert.ok(fs.existsSync('os/index.html'), 'os/index.html must exist');
  assert.ok(fs.existsSync('os/styles.css'), 'os/styles.css must exist');
  assert.ok(fs.existsSync('os/app.js'), 'os/app.js must exist');

  const html = read('os/index.html');
  assert.match(html, /RANDOM INFO OS/);
  assert.match(html, /href=["']\.\/styles\.css["']/);
  assert.match(html, /src=["']\.\/app\.js["']/);
  assert.match(html, /href=["']\.\.\/["']/);

  const app = read('os/app.js');
  assert.match(app, /function\s+forwardEvent\s*\(/);
  for (const type of ['mousemove', 'mousedown', 'mouseup', 'keydown', 'keyup']) {
    assert.match(app, new RegExp(`addEventListener\\(['\"]${type}['\"]`), `must listen for ${type}`);
  }
  assert.match(app, /clientX/);
  assert.match(app, /clientY/);
  assert.match(app, /key/);
  assert.match(app, /parent\.postMessage/);
  assert.doesNotMatch(app, /postMessage\(\s*event\b/, 'must not post the raw DOM Event');
});

test('CRT monitor targets the local same-origin OS and validates messages', () => {
  const monitor = read('computer-src/src/Application/World/MonitorScreen.ts');
  assert.doesNotMatch(monitor, /os\.henryheffernan\.com/);
  assert.match(monitor, /new URL\(['"]\.\.\/os\/['"],\s*window\.location\.href\)/);
  assert.match(monitor, /event\.source\s*!==\s*iframe\.contentWindow/);
  assert.match(monitor, /event\.origin\s*!==\s*window\.location\.origin/);
  assert.match(monitor, /Random Info OS/);
});
