import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const ROOT = new URL('../', import.meta.url);
const sourcePath = (path) => new URL(path, ROOT);

const read = (path) => readFile(sourcePath(path), 'utf8');

test('outer CRT identifies the workstation as E Vale', async () => {
  const source = await read('computer-src/src/Application/UI/components/InfoOverlay.tsx');
  assert.match(source, /const NAME_TEXT = 'E Vale';/);
  assert.doesNotMatch(source, /const NAME_TEXT = 'Henry Heffernan';/);
});

test('desktop launches apps directly from a scattered layout instead of category folders', async () => {
  const source = await read('scripts/win95-overrides/src/components/os/Desktop.tsx');
  assert.match(source, /const DESKTOP_LAYOUT/);
  assert.match(source, /CORE_APPS\.map/);
  assert.match(source, /LEGACY_GAMES\.map/);
  assert.match(source, /WINDOW_LAYER_BASE\s*=\s*100/);
  assert.doesNotMatch(source, /React\.useEffect\(\(\) => \{ openFolder\('explorer'\); \}, \[openFolder\]\);/);
});

test('desktop shortcut selection uses one stable id without the scaling position hack', async () => {
  const source = await read('scripts/win95-overrides/src/components/os/DesktopShortcut.tsx');
  const idUses = source.match(/id=\{shortcutId\}/g) || [];
  assert.equal(idUses.length, 1, 'shortcut DOM id should only be assigned once');
  assert.doesNotMatch(source, /transform:\s*'scale\(1\.5\)'/);
  assert.doesNotMatch(source, /getBoundingClientRect\(\)/);
});

test('core app catalog uses distinct program icons instead of generic explorer/game icons', async () => {
  const source = await read('scripts/win95-overrides/src/components/applications/CoreAppCatalog.ts');
  assert.doesNotMatch(source, /icon:\s*'windowExplorerIcon',\s*category:\s*'Accessories'/);
  assert.doesNotMatch(source, /icon:\s*'windowGameIcon',\s*category:\s*'Games'/);
  for (const icon of ['calculatorIcon', 'notepadIcon', 'minesweeperIcon', 'snakeIcon', 'game2048Icon', 'reactionIcon']) {
    assert.match(source, new RegExp(`icon:\\s*'${icon}'`), `${icon} should be used by the catalog`);
  }
});

test('LACUNA desktop shortcuts stay beneath normal application windows', async () => {
  const css = await read('scripts/lacuna-hotfix/lacuna-runtime/lacuna.css');
  assert.match(css, /\.lac-desktop-shortcut\{[^}]*z-index:10;/);
  assert.doesNotMatch(css, /\.lac-desktop-shortcut\{[^}]*z-index:3500;/);
});

test('Webamp is pinned, contained, hotkey-enabled, and accepts local drops and playlists', async () => {
  const source = await read('scripts/win95-overrides/public/apps/webamp/index.html');
  assert.match(source, /webamp@2\.3\.1/);
  assert.match(source, /renderInto\(/);
  assert.match(source, /enableHotkeys:\s*true/);
  assert.match(source, /enableMediaSession:\s*true/);
  assert.match(source, /handleTrackDropEvent/);
  assert.match(source, /appendTracks\(/);
  assert.match(source, /setTracksToPlay\(/);
});

test('Sticky Notes seeds non-spoiler LACUNA breadcrumbs for new and existing browsers', async () => {
  const source = await read('scripts/win95-overrides/src/components/applications/core/StickyNotes.tsx');
  assert.match(source, /todo-old\.txt/);
  assert.match(source, /C:\\\\Temp\\\\lacuna\.log/);
  assert.match(source, /attrib -h C:\\\\Research/);
  assert.match(source, /ensureSeedNotes/);
});
