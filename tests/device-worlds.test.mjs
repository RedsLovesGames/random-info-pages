import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { detectOS, resolveOS } from '../device-worlds/app.mjs';

const page = readFileSync(new URL('../device-worlds/index.html', import.meta.url), 'utf8');
const script = readFileSync(new URL('../device-worlds/app.mjs', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../device-worlds/style.css', import.meta.url), 'utf8');

test('detects Android before the Linux string in its user agent', () => {
  assert.equal(detectOS('Mozilla/5.0 (Linux; Android 15; Pixel 9)', 'Linux armv8l'), 'android');
  assert.equal(detectOS('Mozilla/5.0 (Linux; Android 15; SM-A556B)', 'Android'), 'android');
});

test('detects Windows, Linux, macOS and iOS', () => {
  assert.equal(detectOS('Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Win32'), 'windows');
  assert.equal(detectOS('Mozilla/5.0 (X11; Ubuntu; Linux x86_64)', 'Linux x86_64'), 'linux');
  assert.equal(detectOS('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4)', 'MacIntel'), 'apple');
  assert.equal(detectOS('Mozilla/5.0 (iPhone; CPU iPhone OS 18_2)', 'iPhone'), 'apple');
  assert.equal(detectOS('Mozilla/5.0 (iPad; CPU OS 18_2)', 'iPad'), 'apple');
  assert.equal(detectOS('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)', 'MacIntel', 5), 'apple');
  assert.equal(detectOS('Mozilla/5.0 (CrOS x86_64)', 'Linux'), 'linux');
});

test('URL overrides are shareable and unknown values are ignored', () => {
  const windows = ['Mozilla/5.0 (Windows NT 10.0)', 'Win32', 0];
  assert.deepEqual(resolveOS('', ...windows), { os: 'windows', automatic: true });
  assert.deepEqual(resolveOS('?os=linux', ...windows), { os: 'linux', automatic: false });
  assert.deepEqual(resolveOS('?x=1&os=android', ...windows), { os: 'android', automatic: false });
  assert.deepEqual(resolveOS('?os=apple', ...windows), { os: 'apple', automatic: false });
  assert.deepEqual(resolveOS('?os=bogus', ...windows), { os: 'windows', automatic: true });
  assert.deepEqual(resolveOS('?os=WINDOWS', ...windows), { os: 'windows', automatic: true });
});

test('each world exists as a separate hidden-by-default view', () => {
  for (const os of ['windows', 'linux', 'apple', 'android']) {
    assert.match(page, new RegExp('id="world-' + os + '" data-os="' + os + '"'));
    assert.match(page, new RegExp('data-world="' + os + '"'));
    assert.match(styles, new RegExp('\\.world-' + (os === 'windows' ? 'win' : os) + '\\b'));
  }
  assert.match(page, /id="showAll"/);
  assert.match(page, /id="worldChooser"/);
  assert.match(page, /id="returnAuto"/);
  assert.match(page, /href="\.\.\/"/);
  assert.match(page, /aria-live="polite"/);
  assert.match(styles, /prefers-reduced-motion:reduce/);
});

test('all interactive controls and local data paths remain available', () => {
  for (const id of ['winStart', 'winWindow', 'terminalCommand', 'terminalForm', 'appleBreathe',
    'appleNote', 'phoneGlow', 'phoneNotify', 'phoneSurprise', 'phoneReset']) {
    assert.match(page, new RegExp('id="' + id + '"'));
  }
  assert.match(script, /history\.pushState/);
  assert.match(script, /popstate/);
  assert.match(script, /localStorage/);
  assert.match(script, /terminalOutput/);
  assert.match(script, /showModal\(\)/);
  assert.ok(existsSync(new URL('../device-worlds/style.css', import.meta.url)));
  assert.ok(existsSync(new URL('../device-worlds/app.mjs', import.meta.url)));
});
