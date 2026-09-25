const assert = require('node:assert/strict');
let BgRemoveCore = {};
try { BgRemoveCore = require('./bg-remove-core.js'); } catch (_) {}

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}: ${error.message}`);
    process.exitCode = 1;
  }
}

test('size guard accepts ordinary images and rejects oversized images', () => {
  assert.equal(BgRemoveCore.isRemovableSize(4000, 3000), true);
  assert.equal(BgRemoveCore.isRemovableSize(9000, 3000), false);
  assert.equal(BgRemoveCore.isRemovableSize(0, 3000), false);
});

test('mask normalization maps min to zero and max to one', () => {
  const result = BgRemoveCore.normalizeMaskMinMax(new Float32Array([2, 4, 6]));
  assert.deepEqual(Array.from(result).map(v => Number(v.toFixed(4))), [0, 0.5, 1]);
});

test('constant masks normalize safely to all zero', () => {
  assert.deepEqual(Array.from(BgRemoveCore.normalizeMaskMinMax(new Float32Array([3, 3]))), [0, 0]);
});

test('alpha composition preserves rgb and multiplies source alpha by mask', () => {
  const rgba = new Uint8ClampedArray([10, 20, 30, 200, 40, 50, 60, 255]);
  const mask = new Float32Array([0.5, 0]);
  const out = BgRemoveCore.applyMaskToAlpha(rgba, mask);
  assert.deepEqual(Array.from(out), [10, 20, 30, 100, 40, 50, 60, 0]);
});

test('normalized tensor uses planar rgb layout', () => {
  const rgba = new Uint8ClampedArray([255, 0, 0, 255]);
  const tensor = BgRemoveCore.rgbaToNormalizedTensor(rgba, 1, 1, [0, 0, 0], [1, 1, 1]);
  assert.deepEqual(Array.from(tensor), [1, 0, 0]);
});

test('mask resize preserves a constant mask', () => {
  const input = new Float32Array([0.25, 0.25, 0.25, 0.25]);
  const out = BgRemoveCore.resizeMaskBilinear(input, 2, 2, 4, 4);
  assert.equal(out.length, 16);
  for (const value of out) assert.ok(Math.abs(value - 0.25) < 1e-6);
});
