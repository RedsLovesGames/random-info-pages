import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const importer = path.join(root, 'scripts', 'import-henry-win95.ps1');

function source() {
  assert.equal(
    existsSync(importer),
    true,
    'scripts/import-henry-win95.ps1 must exist'
  );
  return readFileSync(importer, 'utf8');
}

test('Henry Win95 importer is reproducibly pinned and targets os-src', () => {
  const text = source();
  assert.match(text, /henryjeff\/portfolio-inner-site/);
  assert.match(text, /23cf84acd5c76d2c719e1d04c3d976dc4b0b49f8/);
  assert.match(text, /os-src/);
  assert.match(text, /public[\\/]doom\.jsdos/);
  assert.match(text, /public[\\/]trail\.jsdos/);
  assert.match(text, /public[\\/]scrabble\.jsdos/);
  assert.match(text, /public[\\/]js-dos/);
});

test('importer excludes Henry personal portfolio media and leaves git history to the user', () => {
  const text = source();
  assert.match(text, /src[\\/]components[\\/]showcase/);
  assert.match(text, /src[\\/]assets[\\/]pictures/);
  assert.match(text, /src[\\/]assets[\\/]audio/);
  assert.match(text, /src[\\/]assets[\\/]resume/);
  assert.doesNotMatch(text, /^\s*git\s+(?:-C\s+\S+\s+)?commit\b/im);
  assert.doesNotMatch(text, /^\s*git\s+(?:-C\s+\S+\s+)?push\b/im);
  assert.match(text, /manifest/i);
});

test('importer installs Random Info overrides and builds the deployed os directory', () => {
  const text = source();
  assert.match(text, /scripts[\\/]win95-overrides/);
  assert.match(text, /npm\s+ci/i);
  assert.match(text, /npm\s+run\s+build/i);
  assert.match(text, /\bos\b/i);
  assert.match(text, /homepage\s*=\s*['"]\.['"]/i);
});
