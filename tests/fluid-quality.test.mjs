import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { FluidTank } from '../fluid-dynamics/fluid.mjs';
import { QUALITY, qualityProfile, transferFluidState } from '../fluid-dynamics/quality.mjs';

test('quality levels raise physics resolution and iterations and cap mobile work', () => {
  const names = ['eco', 'balanced', 'high', 'ultra', 'cinematic', 'extreme', 'studio'];
  const configs = names.map(name => qualityProfile(name, false));
  assert.ok(configs.every((value, i) => i === 0 || value.width > configs[i - 1].width));
  assert.ok(configs.every((value, i) => i === 0 || value.iterations > configs[i - 1].iterations));
  for (const name of names) {
    assert.ok(qualityProfile(name, true).width < QUALITY[name].width);
    assert.ok(qualityProfile(name, true).tracers < QUALITY[name].tracers);
  }
  assert.deepEqual(qualityProfile('bogus', false), qualityProfile('balanced', false));
});

test('moving to a finer grid retains dye, flow, and the cylinder', () => {
  const before = new FluidTank(72, 48);
  before.setObstacle(true);
  before.addDye(.28, .48, 4, [1, .2, .5], 1);
  before.addImpulse(.25, .48, 2.7, .1, 6);
  const after = new FluidTank(156, 104);
  transferFluidState(before, after);
  const max = field => Math.max(...field);
  assert.equal(after.obstacle, true);
  assert.ok(max(after.dye[0]) > .25, 'dye survived interpolation');
  assert.ok(max(after.u) > .05, 'the velocity field survived interpolation');
  assert.ok(after.solid.some(Boolean), 'the obstacle was rebuilt');
  assert.ok(Number.isFinite(after.divergenceRms()), 'projection stayed finite');
});

test('render studio provides actual quality, 3D, and export controls', () => {
  const html = readFileSync(new URL('../fluid-dynamics/index.html', import.meta.url), 'utf8');
  const app = readFileSync(new URL('../fluid-dynamics/app.mjs', import.meta.url), 'utf8');
  const three = readFileSync(new URL('../fluid-dynamics/three-surface.mjs', import.meta.url), 'utf8');
  for (const id of ['quality','display-mode','render-scale','glow','exposure','palette',
    'height-scale','mesh-grid','screenshot','tank-3d']) {
    assert.match(html, new RegExp('id="' + id + '"'));
  }
  assert.match(html, /not a volumetric 3D Navier/);
  assert.match(app, /transferFluidState\(tank, newTank\)/);
  assert.match(three, /getContext\('webgl2'/);
  assert.match(three, /gl\.drawElements\(gl\.TRIANGLES/);
  assert.match(three, /gl\.texSubImage2D/);
});

test('enhanced WebGL dye pipeline and high-resolution exports are integrated', () => {
  const file = path => readFileSync(new URL(path, import.meta.url), 'utf8');
  const html = file('../fluid-dynamics/index.html');
  const app = file('../fluid-dynamics/app.mjs');
  const gpu = file('../fluid-dynamics/dye-gpu.mjs');
  const three = file('../fluid-dynamics/three-surface.mjs');
  for (const id of ['tank-gpu','render-engine','interpolation','surface-detail','grain','export-size','export-feedback']) {
    assert.match(html, new RegExp('id="' + id + '"'));
  }
  for (const w of ['2048','3840','5760','7680']) assert.match(html, new RegExp('value="' + w + '"'));
  assert.match(app, /createDyeGPU\(canvasGPU, tank, smallScreen\)/);
  assert.match(app, /gpu\.capture\(target\)/);
  assert.match(app, /three\.capture\(target\)/);
  assert.match(gpu, /vec4 bicubic\(vec2 uv\)/);
  assert.match(gpu, /gl\.drawArrays\(gl\.TRIANGLES/);
  assert.match(gpu, /renderSize\(w, h\)/);
  assert.match(three, /async function capture\(targetWidth\)/);
  assert.match(three, /u_detail/);
  assert.match(html, /does not create physical detail beyond the solver/);
});
