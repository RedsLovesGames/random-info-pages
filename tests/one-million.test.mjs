import test from 'node:test';
import assert from 'node:assert/strict';
import { MILLION, validateComparison, proportion, areaSquareSide, indexToPoint, pointToIndex, stageBounds, worldToScreen, screenToWorld, zoomAt, aggregateTiles, tileCoverage, encodeState, decodeState, DEFAULT_STATE } from '../one-million/engine.mjs';

test('proportions accept exact safe integer boundaries and reject ambiguous input', () => {
  assert.equal(proportion(1, MILLION), 0.000001);
  assert.equal(proportion(0, MILLION), 0);
  assert.equal(proportion(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER), 1);
  for (const value of [-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '1e3', '']) assert.throws(() => validateComparison(value, MILLION));
  for (const value of [0, -1, 1.5, Infinity]) assert.throws(() => validateComparison(0, value));
  assert.throws(() => validateComparison(11, 10));
  assert.deepEqual(validateComparison('1', '1000000'), { quantity: 1, denominator: MILLION });
});

test('area comparison sides encode exact shares including zero', () => {
  assert.equal(areaSquareSide(0, MILLION, 100), 0);
  assert.equal(areaSquareSide(MILLION, MILLION, 100), 100);
  const side = areaSquareSide(250_000, MILLION, 100);
  assert.equal(side * side / (100 * 100), 0.25);
  assert.throws(() => areaSquareSide(1, MILLION, -1), /non-negative/);
});

test('decimal spatial hierarchy has a unique coordinate for every millionth unit', () => {
  const seen = new Uint8Array(MILLION);
  for (let i = 0; i < MILLION; i++) {
    const { x, y } = indexToPoint(i);
    assert.equal(pointToIndex(x, y), i);
    assert.equal(seen[y * 1000 + x], 0);
    seen[y * 1000 + x] = 1;
  }
  assert.equal(pointToIndex(-1, 0), null);
  assert.equal(pointToIndex(1000, 0), null);
  assert.throws(() => indexToPoint(MILLION));
  for (let exponent = 0; exponent <= 6; exponent++) {
    const bounds = stageBounds(exponent);
    assert.equal(bounds.w * bounds.h, 10 ** exponent);
    const last = indexToPoint(10 ** exponent - 1);
    assert.ok(last.x < bounds.w && last.y < bounds.h);
  }
});

test('view inversion and anchored zoom preserve the world point under a pointer', () => {
  const camera = { x: 212, y: 317, scale: 0.8 };
  const viewport = { width: 800, height: 500 };
  const world = { x: 33.25, y: 71.5 };
  const screen = worldToScreen(world, camera, viewport);
  assert.deepEqual(screenToWorld(screen, camera, viewport), world);
  const anchor = { x: 120, y: 91 };
  const before = screenToWorld(anchor, camera, viewport);
  const after = screenToWorld(anchor, zoomAt(camera, 4, anchor, viewport), viewport);
  assert.ok(Math.abs(before.x - after.x) < 1e-10 && Math.abs(before.y - after.y) < 1e-10);
});

test('LOD covers the exact million, preserves quantity, bounds work and culls', () => {
  for (const scale of [0.1, 0.5, 1, 20, 100]) {
    const viewport = { width: 200000, height: 200000 };
    const tiles = aggregateTiles({ x: 500, y: 500, scale }, viewport, 1200);
    assert.ok(tiles.length <= 1200);
    assert.equal(tiles.reduce((sum, tile) => sum + tile.count, 0), MILLION);
    for (const quantity of [0, 1, 12345, 999999, MILLION]) {
      assert.ok(Math.abs(tiles.reduce((sum, tile) => sum + tileCoverage(tile, quantity, MILLION), 0) - quantity) < 1e-6);
    }
  }
  const close = aggregateTiles({ x: 0.5, y: 0.5, scale: 100 }, { width: 500, height: 500 }, 2500);
  assert.ok(close.length < 2500 && close.some(tile => tile.count === 1));
  assert.ok(close.reduce((sum, tile) => sum + tile.count, 0) < MILLION);
  const tile = { start: 0, count: MILLION };
  assert.equal(tileCoverage(tile, 1, 3), MILLION / 3);
  assert.equal(tileCoverage(tile, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER), MILLION);
});

test('shared state round trips and malformed state recovers without exceptions', () => {
  const state = { ...DEFAULT_STATE, exponent: 6, quantities: [1, 1000, 500000], style: 'bars', camera: { x: 34, y: 22, scale: 4 } };
  assert.deepEqual(decodeState(encodeState(state)).state, state);
  for (const hash of ['#%zz', '#v=99', '#v=1&d=0', '#v=1&q=2,-1', '#v=1&c=NaN,0,1', '#v=1&n=7', '#v=1&style=evil', '#v=1&d=1&q=2']) {
    const decoded = decodeState(hash);
    assert.equal(decoded.recovered, true, hash);
    assert.deepEqual(decoded.state, DEFAULT_STATE);
  }
});
