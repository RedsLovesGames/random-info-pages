import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const overrides = path.join(root, 'scripts', 'win95-overrides');

function read(relative) {
  const file = path.join(overrides, relative);
  assert.equal(existsSync(file), true, `missing override: ${relative}`);
  return readFileSync(file, 'utf8');
}

test('Random Info Explorer exposes the six required folders', () => {
  const catalog = read('src/components/applications/RandomInfoCatalog.ts');
  for (const folder of ['Tools', 'School', 'Friends', 'Games', 'Data', 'Experiments']) {
    assert.match(catalog, new RegExp(`['\"]${folder}['\"]`));
  }
  assert.match(catalog, /\/tools\//);
  assert.match(catalog, /\/school-schedule\//);
  assert.match(catalog, /\/friends\//);
  assert.match(catalog, /\/wheel\//);
});

test('native RIP pages launch in Win95 windows with an external fallback', () => {
  const embedded = read('src/components/applications/EmbeddedSite.tsx');
  assert.match(embedded, /<Window/);
  assert.match(embedded, /<iframe/);
  assert.match(embedded, /target="_blank"/);
  assert.match(embedded, /Open outside OS/);
});

test('embedded RIP pages keep a full desktop viewport and scale it to the Win95 window', () => {
  const embedded = read('src/components/applications/EmbeddedSite.tsx');
  assert.match(embedded, /DESKTOP_VIEWPORT_WIDTH\s*=\s*1440/);
  assert.match(embedded, /ResizeObserver/);
  assert.match(embedded, /transform:\s*`scale\(\$\{scale\}\)`/);
  assert.match(embedded, /transformOrigin:\s*['\"]top left['\"]/);
  assert.match(embedded, /width:\s*DESKTOP_VIEWPORT_WIDTH/);
});

test('desktop uses authentic games plus Random Info Explorer and removes Showcase/Credits', () => {
  const desktop = read('src/components/os/Desktop.tsx');
  assert.match(desktop, /Random Info Explorer/);
  assert.match(desktop, /Oregon Trail/);
  assert.match(desktop, /Doom/);
  assert.match(desktop, /Scrabble/);
  assert.match(desktop, /RIP Wordle/);
  assert.doesNotMatch(desktop, /ShowcaseExplorer|Credits/);
  assert.match(desktop, /EmbeddedSite/);
});

test('source-facing branding is neutralized', () => {
  const henordle = read('src/components/applications/Henordle.tsx');
  const generalIndex = read('src/components/general/index.ts');
  const shutdown = read('src/components/os/ShutdownSequence.tsx');
  assert.match(henordle, /RIP Wordle/);
  assert.doesNotMatch(henordle, /Henry Heffernan/);
  assert.doesNotMatch(generalIndex, /MusicPlayer|Link/);
  assert.doesNotMatch(shutdown, /assets\/pictures|HHOS|Henry/i);
  assert.match(shutdown, /Random Info OS/);
});
