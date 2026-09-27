import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const ROOT = new URL('../', import.meta.url);
const sourcePath = (path) => new URL(path, ROOT);

async function importSource(path) {
  const code = await readFile(sourcePath(path), 'utf8');
  const url = `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
  return import(url);
}

test('phase 2 catalog exposes Accessories and Games with six new apps', async () => {
  const source = await readFile(
    sourcePath('scripts/win95-overrides/src/components/applications/CoreAppCatalog.ts'),
    'utf8'
  );

  for (const key of ['paint', 'winamp', 'sticky', 'timer', 'sand', 'pixel']) {
    assert.match(source, new RegExp(`key:\\s*'${key}'`), `${key} must be registered`);
  }
  assert.match(source, /category:\s*'Accessories'/);
  assert.match(source, /category:\s*'Games'/);
  assert.doesNotMatch(source, /glyph:/, 'emoji glyph metadata should be replaced by icon metadata');
});

test('desktop wires the six phase 2 applications and both program folders', async () => {
  const source = await readFile(
    sourcePath('scripts/win95-overrides/src/components/os/Desktop.tsx'),
    'utf8'
  );

  for (const component of ['JsPaint', 'WebampPlayer', 'StickyNotes', 'TimerApp', 'SandSimulator', 'PixelEditor']) {
    assert.match(source, new RegExp(`\\b${component}\\b`), `${component} must be wired into Desktop`);
  }
  assert.match(source, /name:\s*'Accessories'/);
  assert.match(source, /name:\s*'Games'/);
  assert.match(source, /startItems=/);
});

test('toolbar exposes stable Start control and program entries before shutdown', async () => {
  const source = await readFile(
    sourcePath('scripts/win95-overrides/src/components/os/Toolbar.tsx'),
    'utf8'
  );
  assert.match(source, /id="random-info-start-button"/);
  assert.match(source, /data-rip-role="start-button"/);
  assert.match(source, /startItems/);
  assert.match(source, /Random Info OS/);
  assert.match(source, /Sh<u>u<\/u>t down/);
});

test('JS Paint uses the documented embeddable web app', async () => {
  const source = await readFile(
    sourcePath('scripts/win95-overrides/src/components/applications/core/JsPaint.tsx'),
    'utf8'
  );
  assert.match(source, /https:\/\/jspaint\.app\/?/);
  assert.match(source, /iframe/i);
});

test('Webamp wrapper uses the official browser module entrypoint', async () => {
  const source = await readFile(
    sourcePath('scripts/win95-overrides/public/apps/webamp/index.html'),
    'utf8'
  );
  assert.match(source, /webamp@\^2/);
  assert.match(source, /renderWhenReady/);
});

test('timer formatting is deterministic', async () => {
  const { formatDuration } = await importSource(
    'scripts/win95-overrides/src/components/applications/core/logic/timer.js'
  );
  assert.equal(formatDuration(0), '00:00.0');
  assert.equal(formatDuration(65_432), '01:05.4');
  assert.equal(formatDuration(3_661_999), '1:01:01.9');
});

test('sand physics falls into empty space and settles on support', async () => {
  const { createSandGrid, stepSand } = await importSource(
    'scripts/win95-overrides/src/components/applications/core/logic/sand.js'
  );
  const grid = createSandGrid(3, 4);
  grid[0][1] = 1;
  const fallen = stepSand(grid, () => 0);
  assert.equal(fallen[1][1], 1);
  assert.equal(fallen[0][1], 0);

  fallen[2][1] = 1;
  const settled = stepSand(fallen, () => 0);
  assert.equal(settled[2][1], 1);
});

test('pixel editor grid helpers create and update immutable grids', async () => {
  const { createPixelGrid, setPixel } = await importSource(
    'scripts/win95-overrides/src/components/applications/core/logic/pixel.js'
  );
  const grid = createPixelGrid(4, '#ffffff');
  assert.equal(grid.length, 16);
  const next = setPixel(grid, 5, '#000000');
  assert.equal(next[5], '#000000');
  assert.equal(grid[5], '#ffffff');
});
