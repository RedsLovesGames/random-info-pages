import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');

test('computer intro is fully Random Info branded', () => {
  const loading = read('computer-src/src/Application/UI/components/LoadingScreen.tsx');
  assert.match(loading, /RANDOM INFO SYSTEMS/);
  assert.match(loading, /RIP BIOS/);
  assert.match(loading, /Random Info Pages Archive/);
  assert.match(loading, /Random Info Computer/);
  assert.doesNotMatch(loading, /Henry Heffernan|Heffernan,|HHBIOS|HSP Showcase|Henry Inc\./i);
});

test('archive homepage exposes a Windows 95 styled computer launcher', () => {
  const html = read('index.html');
  assert.match(html, /class=["'][^"']*win95-computer-button[^"']*["']/);
  assert.match(html, /href=["']\.\/computer\/["']/);
  assert.match(html, /Random Info Computer/);
  assert.match(html, /win95-computer-icon/);
  assert.doesNotMatch(html, /computer-src\/|bundle\.[a-f0-9]+\.js|three(?:\.min)?\.js/i);
});

test('Random Info OS keeps the authentic React Win95 desktop while replacing portfolio content', () => {
  const html = read('os/index.html');
  const colors = read('os-src/src/constants/colors.ts');
  const desktop = read('os-src/src/components/os/Desktop.tsx');
  const catalog = read('os-src/src/components/applications/RandomInfoCatalog.ts');

  assert.match(colors, /#3e9697/i, 'desktop must keep the upstream teal');
  assert.match(colors, /#c3c6ca/i, 'taskbar/windows must keep the upstream Windows gray');
  assert.match(html, /Random Info OS/);
  assert.match(html, /js-dos\/js-dos\.js/);

  for (const app of ['Doom', 'The Oregon Trail', 'Scrabble', 'RIP Wordle', 'Random Info Explorer']) {
    assert.match(desktop, new RegExp(app.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `missing ${app}`);
  }

  for (const folder of ['Tools', 'School', 'Friends', 'Games', 'Data', 'Experiments']) {
    assert.match(catalog, new RegExp(`['\"]${folder}['\"]`), `missing ${folder} folder`);
  }

  for (const route of ['/tools/', '/school-schedule/', '/friends/', '/tideborne/', '/wanuiv2/']) {
    assert.match(catalog, new RegExp(route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  for (const bundle of ['os/doom.jsdos', 'os/trail.jsdos', 'os/scrabble.jsdos', 'os/js-dos/js-dos.js']) {
    assert.ok(fs.existsSync(bundle), `${bundle} must be deployed locally`);
  }

  assert.doesNotMatch(desktop, /ShowcaseExplorer|Credits/);
});
