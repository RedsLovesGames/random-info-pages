import assert from 'node:assert/strict';
import test from 'node:test';
import { makeBattlemap, universalVtt, roomKey, pixelsPerSquare } from '../dungeon-forge/battlemap-core.mjs';

test('the original Dungeon Forge seed also produces a deterministic, connected battlemap', () => {
  const settings = { seed: 1337, roomCount: 8, loopPercent: 15, decorPercent: 60, theme: 'auto' };
  const plan = makeBattlemap(settings);
  const repeat = makeBattlemap(settings);
  assert.equal(plan.rooms.length, 8);
  assert.equal(plan.stats.reach, plan.stats.floorTiles);
  assert.deepEqual(plan.grid, repeat.grid);
  assert.deepEqual(plan.walls, repeat.walls);
  assert.deepEqual(plan.doors, repeat.doors);
  assert.equal(roomKey(plan)[0].type, 'entrance');
  assert.equal(roomKey(plan).length, 8);
});

test('Universal VTT uses grid coordinates, bounded closed portals, and optional lights', () => {
  const image = 'cG5n';
  const plan = makeBattlemap({seed: 1337, roomCount: 8, theme: 'ancient'});
  const vtt = universalVtt(plan, {pixels: 32, image, doors: true, lights: true});
  assert.deepEqual(vtt.resolution, {
    map_origin: {x: 0, y: 0}, map_size: {x: plan.W, y: plan.H}, pixels_per_grid: 32
  });
  assert.equal(vtt.gridScale, '5 ft');
  assert.equal(vtt.image, image);
  assert.ok(vtt.line_of_sight.length && vtt.portals.length && vtt.lights.length);
  for (const wall of vtt.line_of_sight) assert.equal(wall.length, 2);
  for (const door of vtt.portals) {
    assert.ok(door.closed);
    assert.ok(door.bounds.every(point => vtt.line_of_sight.some(wall => {
      const [a,b] = wall;
      return (point.x === a.x && point.x === b.x && point.y >= a.y && point.y <= b.y) ||
        (point.y === a.y && point.y === b.y && point.x >= a.x && point.x <= b.x);
    })));
  }
  for (const {position} of vtt.lights) {
    assert.equal(plan.grid[Math.floor(position.y) * plan.W + Math.floor(position.x)], 1);
  }
  const without = universalVtt(plan, {pixels: 32, image});
  assert.deepEqual(without.portals, []);
  assert.deepEqual(without.lights, []);
  assert.equal(Object.hasOwn(vtt, 'rooms'), false);
});

test('export size is bounded and small and large dungeons both generate', () => {
  for (const [roomCount, theme] of [[6, 'molten'], [12, 'frost'], [80, 'verdant']]) {
    const plan = makeBattlemap({seed: 28457, roomCount, theme});
    assert.equal(plan.rooms.length, roomCount);
    const pixels = pixelsPerSquare(plan);
    assert.ok(Math.max(plan.W, plan.H) * pixels <= 3600);
    assert.ok(plan.W * plan.H * pixels * pixels <= 10000000);
  }
});
