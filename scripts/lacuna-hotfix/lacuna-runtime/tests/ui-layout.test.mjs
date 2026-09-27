import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync('scripts/lacuna-runtime/lacuna.css', 'utf8');
const terminalSource = fs.readFileSync('scripts/lacuna-runtime/src/ui/terminalApp.ts', 'utf8');
const diskSource = fs.readFileSync('scripts/lacuna-runtime/src/ui/diskUtility.ts', 'utf8');

test('Recycle Bin forces one full-width vertical row per deleted file', () => {
  assert.match(css, /\.lac-recycle-list\{[^}]*display:block/);
  assert.match(css, /\.lac-recycle-row\{[^}]*grid-template-columns:32px minmax\(0,1fr\) auto/);
  assert.match(css, /\.lac-recycle-actions\{[^}]*flex-wrap:nowrap/);
});

test('Command Prompt preserves terminal lines instead of breaking at arbitrary characters', () => {
  const rule = css.match(/\.lac-terminal-output\{([^}]*)\}/)?.[1] ?? '';
  assert.match(rule, /white-space:pre/);
  assert.match(rule, /overflow-x:auto/);
  assert.match(rule, /overflow-wrap:normal/);
  assert.match(rule, /word-break:normal/);
  assert.doesNotMatch(rule, /overflow-wrap:anywhere/);
  assert.doesNotMatch(rule, /word-break:break-word/);
});

test('Command Prompt renderer force-stacks each output entry vertically', () => {
  assert.match(terminalSource, /class=\"lac-terminal-line\"/);
  assert.match(terminalSource, /out\.style\.setProperty\('display',\s*'flex',\s*'important'\)/);
  assert.match(terminalSource, /out\.style\.setProperty\('flex-direction',\s*'column',\s*'important'\)/);
  assert.match(terminalSource, /out\.style\.setProperty\('align-items',\s*'flex-start',\s*'important'\)/);
  assert.match(terminalSource, /querySelectorAll<HTMLElement>\('\.lac-terminal-line'\)/);
  assert.match(terminalSource, /lineElement\.style\.setProperty\('display',\s*'block',\s*'important'\)/);
  assert.match(terminalSource, /lineElement\.style\.setProperty\('flex',\s*'0 0 auto',\s*'important'\)/);
});

test('Disk comparison uses a constrained summary plus two-column evidence layout', () => {
  assert.match(diskSource, /lac-disk-summary/);
  assert.match(diskSource, /lac-disk-compare-grid/);
  assert.match(diskSource, /lac-disk-compare-group/);
  assert.match(css, /\.lac-disk \[data-results\]\{[^}]*max-width:/);
  assert.match(css, /\.lac-disk-compare-grid\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /@media\(max-width:760px\)[^{]*\{[^}]*\.lac-disk-compare-grid\{grid-template-columns:1fr\}/s);
});
