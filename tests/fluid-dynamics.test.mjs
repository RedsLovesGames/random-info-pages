import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { FluidTank } from '../fluid-dynamics/fluid.mjs';

const total = field => field.reduce((sum, value) => sum + value, 0);
const energy = field => field.reduce((sum, value) => sum + value * value, 0);

test('the pressure correction reduces divergence and respects tank and obstacle walls', () => {
  const tank = new FluidTank(56, 36);
  tank.setObstacle(true);
  tank.addImpulse(.22, .46, 9, -2, 4);
  const divergenceBefore = tank.divergenceRms();
  assert.ok(divergenceBefore > 0);
  tank.project(48);
  assert.ok(tank.divergenceRms() < divergenceBefore * .15);

  for (let y = 0; y < tank.height; y++) {
    assert.equal(tank.u[y * tank.stride], 0);
    assert.equal(tank.u[y * tank.stride + tank.width], 0);
  }
  for (let x = 0; x < tank.width; x++) {
    assert.equal(tank.v[x], 0);
    assert.equal(tank.v[tank.height * tank.stride + x], 0);
  }
  assert.ok(tank.solid.some(Boolean));
  tank.u.forEach((value, i) => { if (!tank.openU[i]) assert.equal(value, 0); });
  tank.v.forEach((value, i) => { if (!tank.openV[i]) assert.equal(value, 0); });
});

test('dye travels with the flow, fades, and clears with the velocity', () => {
  const tank = new FluidTank(56, 36);
  const centroid = field => field.reduce((sum, value, i) => sum + value * (i % tank.stride), 0) / total(field);
  tank.addDye(.3, .5, 2, [1, .2, .1], 1);
  const start = centroid(tank.dye[0]);
  const dyeBefore = total(tank.dye[0]);
  for (let i = 0; i < 24; i++) {
    tank.addImpulse(.31, .5, 1.6, 0, 5);
    tank.step({ viscosity: .15, retention: .985, iterations: 24 });
  }
  assert.ok(centroid(tank.dye[0]) > start + 1);
  assert.ok(total(tank.dye[0]) < dyeBefore);
  tank.clear();
  for (const field of [tank.u, tank.v, tank.pressure, ...tank.dye]) assert.equal(energy(field), 0);
});

test('added viscosity dissipates more velocity than the same run without it', () => {
  const run = viscosity => {
    const tank = new FluidTank(48, 32);
    tank.addImpulse(.5, .5, 9, 0, 2, 3);
    for (let i = 0; i < 10; i++) tank.step({ viscosity, retention: 1, iterations: 24 });
    return energy(tank.u) + energy(tank.v);
  };
  assert.ok(run(1.5) < run(0) * .8);
});

test('Fluid Dynamics is discoverable in the simulation index and shared project browser', () => {
  const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
  assert.match(read('../index.html'), /p:'\.\/fluid-dynamics\/',c:'Experiments',g:'simulations'/);
  assert.match(read('../classic.html'), /href="\.\/fluid-dynamics\/"/);
  assert.match(read('../design-system/projects.js'), /n:'Fluid Dynamics'/);
  assert.match(read('../design-system/rip.js'), /RIPCatalog/);
  assert.match(read('../fluid-dynamics/index.html'), /src="\.\.\/design-system\/appearance\.js"/);
});
