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

test('desktop launches apps directly from grouped desktop sections instead of category folders', async () => {
  const source = await read('scripts/win95-overrides/src/components/os/Desktop.tsx');
  assert.match(source, /const DESKTOP_GROUPS/);
  assert.match(source, /buildGroupedDesktopLayout/);
  assert.match(source, /system:\s*\{[^}]*keys:\s*\['explorer'\]/s);
  assert.match(source, /accessories:\s*\{[^}]*'calculator'[^}]*'pixel'/s);
  assert.match(source, /games:\s*\{[^}]*'minesweeper'[^}]*'wordle'/s);
  assert.match(source, /CORE_APPS\.map/);
  assert.match(source, /LEGACY_GAMES\.map/);
  assert.match(source, /WINDOW_LAYER_BASE\s*=\s*100/);
  assert.doesNotMatch(source, /React\.useEffect\(\(\) => \{ openFolder\('explorer'\); \}, \[openFolder\]\);/);
});

test('grouped desktop remains intact at intermediate widths and adapts only when it must', async () => {
  const source = await read('scripts/win95-overrides/src/components/os/Desktop.tsx');
  assert.match(source, /const desktopWidth\s*=\s*window\.visualViewport\?\.width\s*\|\|\s*window\.innerWidth/);
  assert.match(source, /const adaptiveColumns\s*=/);
  assert.match(source, /const adaptiveContentColumns\s*=/);
  assert.match(source, /desktopWidth\s*<\s*700/);
  assert.match(source, /origin:\s*\{\s*left:\s*390,\s*top:\s*16\s*\}/);
  assert.match(source, /getAdaptiveDesktopPosition/);
  assert.match(source, /accessoryRows\s*\+\s*1/);
  assert.doesNotMatch(source, /compactDesktop\s*=.*<=\s*600/);
});

test('desktop shortcut selection uses one stable id without the scaling position hack', async () => {
  const source = await read('scripts/win95-overrides/src/components/os/DesktopShortcut.tsx');
  const idUses = source.match(/id=\{shortcutId\}/g) || [];
  assert.equal(idUses.length, 1, 'shortcut DOM id should only be assigned once');
  assert.doesNotMatch(source, /transform:\s*'scale\(1\.5\)'/);
  assert.doesNotMatch(source, /getBoundingClientRect\(\)/);
});

test('desktop shortcuts drag with pointer capture and persist custom positions', async () => {
  const desktop = await read('scripts/win95-overrides/src/components/os/Desktop.tsx');
  const shortcut = await read('scripts/win95-overrides/src/components/os/DesktopShortcut.tsx');
  assert.match(desktop, /DESKTOP_POSITION_KEY/);
  assert.match(desktop, /loadLocal\(DESKTOP_POSITION_KEY/);
  assert.match(desktop, /saveLocal\(DESKTOP_POSITION_KEY/);
  assert.match(desktop, /onDragDelta/);
  assert.match(desktop, /clampShortcutPosition/);
  assert.match(shortcut, /setPointerCapture/);
  assert.match(shortcut, /onPointerMove/);
  assert.match(shortcut, /onDragDelta/);
  assert.match(shortcut, /DRAG_THRESHOLD\s*=\s*4/);
  assert.match(shortcut, /suppressOpenUntilRef/);
  assert.match(shortcut, /touchAction:\s*'none'/);
});

test('LACUNA system shortcuts join the System section and remain draggable', async () => {
  const source = await read('scripts/lacuna-hotfix/win95-overrides/public/index.html');
  assert.match(source, /LACUNA_DESKTOP_POSITION_KEY/);
  assert.match(source, /DEFAULT_SYSTEM_SHORTCUTS/);
  assert.match(source, /My Computer/);
  assert.match(source, /Recycle Bin/);
  assert.match(source, /defaultSystemPosition/);
  assert.match(source, /window\.innerWidth\s*<\s*700/);
  assert.match(source, /\.lac-desktop-shortcut/);
  assert.match(source, /MutationObserver/);
  assert.match(source, /setPointerCapture/);
  assert.match(source, /suppressDraggedActivation/);
});

test('core app catalog uses distinct program icons instead of generic explorer/game icons', async () => {
  const source = await read('scripts/win95-overrides/src/components/applications/CoreAppCatalog.ts');
  assert.doesNotMatch(source, /icon:\s*'windowExplorerIcon',\s*category:\s*'Accessories'/);
  assert.doesNotMatch(source, /icon:\s*'windowGameIcon',\s*category:\s*'Games'/);
  for (const icon of ['calculatorIcon', 'notepadIcon', 'minesweeperIcon', 'snakeIcon', 'game2048Icon', 'reactionIcon']) {
    assert.match(source, new RegExp(`icon:\\s*'${icon}'`), `${icon} should be used by the catalog`);
  }
});

test('LACUNA desktop shortcuts are forced beneath normal application windows', async () => {
  const source = await read('scripts/lacuna-hotfix/win95-overrides/public/index.html');
  assert.match(source, /\.lac-desktop-shortcut\s*\{\s*z-index:\s*10\s*!important;\s*[^}]*\}/);
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

test('Sticky Notes only seeds LACUNA breadcrumbs once so deleted seed notes stay deleted', async () => {
  const source = await read('scripts/win95-overrides/src/components/applications/core/StickyNotes.tsx');
  assert.match(source, /SEED_MIGRATION_KEY/);
  assert.match(source, /loadInitialNotes/);
  assert.match(source, /saveLocal\(SEED_MIGRATION_KEY, true\)/);
  assert.doesNotMatch(source, /ensureSeedNotes\(loadLocal\(STORAGE_KEY, DEFAULT_NOTES\)\)/);
});
