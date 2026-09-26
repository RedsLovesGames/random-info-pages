import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const computer = path.join(root, 'computer-src');
const publicDir = path.join(computer, 'public');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

test('computer production build is safe to serve from /computer/', () => {
  assert.ok(fs.existsSync(path.join(publicDir, 'index.html')), 'public/index.html must exist after build');
  const bundles = fs.readdirSync(publicDir).filter((name) => /^bundle\..+\.js$/.test(name));
  assert.ok(bundles.length > 0, 'a hashed bundle must be emitted');
  for (const rel of ['models', 'textures', 'audio', 'draco']) {
    assert.ok(fs.existsSync(path.join(publicDir, rel)), `${rel}/ must be copied to public/`);
  }

  const html = read('computer-src/public/index.html');
  assert.doesNotMatch(html, /(?:src|href)=["']\/(?:bundle|main)\./, 'generated assets must not be root-absolute');

  const webpack = read('computer-src/bundler/webpack.common.js');
  assert.match(webpack, /publicPath:\s*['"]\.\/['"]/, 'webpack output.publicPath must be explicitly relative');
});
