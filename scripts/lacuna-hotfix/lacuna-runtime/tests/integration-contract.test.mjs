import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');

test('Win95 importer compiles and stages the LACUNA runtime before CRA build', () => {
  const ps = read('scripts/import-henry-win95.ps1');
  assert.match(ps, /lacuna-runtime[\\/]tsconfig\.json/i);
  assert.match(ps, /public[\\/]lacuna/i);
  assert.match(ps, /lacuna\.css/i);
  assert.match(ps, /Overlay-LacunaHotfix/i);
  assert.match(ps, /scripts[\/]lacuna-hotfix/i);
});

test('local and browser verifiers exist and cover repository-prefix hosting', () => {
  assert.equal(fs.existsSync('scripts/lacuna_local_verify.ps1'), true);
  assert.equal(fs.existsSync('scripts/lacuna_browser_smoke.mjs'), true);
  const smoke = read('scripts/lacuna_browser_smoke.mjs');
  assert.match(smoke, /random-info-pages/);
  assert.match(smoke, /Recycle Bin/);
  assert.match(smoke, /LACUNA-WS03/);
  assert.match(smoke, /SUBJECT COUNT: 39/);
});


test('Command Prompt uses a fixed console column width and vertical resizing/scrolling', () => {
  const terminal = read('scripts/lacuna-runtime/src/ui/terminalApp.ts');
  const css = read('scripts/lacuna-runtime/lacuna.css');
  assert.match(terminal, /width:\s*640/);
  assert.match(terminal, /height:\s*400/);
  assert.match(css, /\.lac-terminal-window\{[^}]*resize:vertical/i);
  assert.match(css, /\.lac-terminal-output\{[^}]*overflow-y:auto[^}]*overflow-x:hidden/i);
  assert.match(css, /\.lac-terminal-output\{[^}]*overflow-wrap:anywhere/i);
});

test('Win95 TypeScript override enables ES5 iterable lowering for ARG engine code', () => {
  const config = JSON.parse(read('scripts/win95-overrides/tsconfig.json'));
  assert.equal(config.compilerOptions.target.toLowerCase(), 'es5');
  assert.equal(config.compilerOptions.downlevelIteration, true);
});
