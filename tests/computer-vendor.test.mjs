import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const computer = path.join(root, 'computer-src');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

test('vendored computer baseline is complete and pinned', () => {
  assert.ok(fs.existsSync(path.join(computer, 'LICENSE.md')), 'computer-src/LICENSE.md must exist');
  assert.match(read('computer-src/LICENSE.md'), /Copyright 2024 Henry Heffernan/);

  assert.ok(fs.existsSync(path.join(computer, 'package.json')), 'computer-src/package.json must exist');
  const pkg = JSON.parse(read('computer-src/package.json'));
  for (const dep of ['three', 'webpack', 'camera-controls', 'gsap']) {
    assert.ok(pkg.dependencies?.[dep], `package.json must declare ${dep}`);
  }

  assert.ok(fs.existsSync(path.join(computer, 'src/Application/World/MonitorScreen.ts')));
  for (const rel of ['static/models', 'static/textures', 'static/audio', 'static/draco']) {
    assert.ok(fs.existsSync(path.join(computer, rel)), `${rel} must exist`);
  }

  assert.ok(fs.existsSync(path.join(computer, 'README-RIP.md')));
  assert.match(read('computer-src/README-RIP.md'), /c53c5a50183655eb83d70048403a5084f5d1214c/);

  assert.ok(fs.existsSync(path.join(computer, 'package-lock.json')), 'package-lock.json must exist');
  const lock = JSON.parse(read('computer-src/package-lock.json'));
  const rootPackage = lock.packages?.[''];
  assert.ok(rootPackage, 'lockfile root package must exist');
  for (const dep of ['three', 'webpack', 'camera-controls', 'gsap']) {
    assert.ok(rootPackage.dependencies?.[dep], `lockfile root package must include ${dep}`);
  }
});
