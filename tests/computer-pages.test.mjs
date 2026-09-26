import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow = fs.readFileSync('.github/workflows/pages.yml', 'utf8');

test('Pages deployment builds and stages Random Info Computer without shipping source dependencies', () => {
  assert.match(workflow, /actions\/setup-node@v6/);
  assert.match(workflow, /cache-dependency-path:\s*computer-src\/package-lock\.json/);
  assert.match(workflow, /working-directory:\s*computer-src[\s\S]*?run:\s*npm ci/);
  assert.match(workflow, /working-directory:\s*computer-src[\s\S]*?run:\s*npm run build/);

  assert.match(workflow, /--exclude ['"]computer-src['"]/);
  assert.match(workflow, /--exclude ['"]_computer-smoke-site['"]/);
  assert.match(workflow, /mkdir -p _site\/computer/);
  assert.match(workflow, /cp -a computer-src\/public\/\. _site\/computer\//);

  assert.match(workflow, /test -f _site\/computer\/index\.html/);
  assert.match(workflow, /test -f _site\/os\/index\.html/);
  assert.match(workflow, /find _site\/computer -maxdepth 1 -name ['"]bundle\.\*\.js['"]/);
  assert.match(workflow, /test ! -e _site\/computer-src\/node_modules/);

  assert.match(workflow, /branches:\s*\[main\]/, 'Pages deployment must remain main-only');
});
