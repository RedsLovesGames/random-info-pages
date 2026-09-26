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

test('Random Info OS matches the Henry-style Windows desktop and exposes archive folders', () => {
  const html = read('os/index.html');
  const css = read('os/styles.css');
  const app = read('os/app.js');

  assert.match(css, /#3e9697/i, 'desktop must use Henry teal');
  assert.match(css, /#c0c0c0/i, 'taskbar/windows must use Windows 95 gray');
  assert.match(css, /MS Sans Serif/i);

  assert.match(html, /Doom/);
  assert.match(html, /The Oregon Trail/);
  assert.match(html, /raw\.githubusercontent\.com\/henryjeff\/portfolio-inner-site\/master\/src\/assets\/icons\/doomIcon\.png/);
  assert.match(html, /raw\.githubusercontent\.com\/henryjeff\/portfolio-inner-site\/master\/src\/assets\/icons\/trailIcon\.png/);

  for (const folder of ['tools', 'school', 'friends', 'games', 'data', 'experiments']) {
    assert.match(html, new RegExp(`data-folder=["']${folder}["']`), `missing ${folder} shortcut`);
  }

  for (const route of ['./tools/', './school-schedule/', './friends/', './tideborne/', './oldasspolitic/', './wanuiv2/']) {
    assert.match(app, new RegExp(route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  assert.match(app, /openFolderWindow/);
  assert.match(app, /explorer-window/);
  assert.match(html, /folder-icon/);
});
