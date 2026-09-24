const assert = require('node:assert/strict');
let ImageEngine = {};
try { ImageEngine = require('./image-engine.js'); } catch (_) {}

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}: ${error.message}`);
    process.exitCode = 1;
  }
}

test('normalizes lossy quality into 0.01-1 range', () => {
  assert.equal(ImageEngine.normalizeQuality(86), 0.86);
  assert.equal(ImageEngine.normalizeQuality(500), 1);
  assert.equal(ImageEngine.normalizeQuality(0), 0.01);
});

test('png has no quality parameter', () => {
  assert.equal(ImageEngine.qualityForMime('image/png', 86), undefined);
});

test('jpeg and webp expose normalized quality', () => {
  assert.equal(ImageEngine.qualityForMime('image/jpeg', 75), 0.75);
  assert.equal(ImageEngine.qualityForMime('image/webp', 62), 0.62);
});

test('supported image types are explicit', () => {
  assert.equal(ImageEngine.isSupportedInputType('image/jpeg'), true);
  assert.equal(ImageEngine.isSupportedInputType('image/png'), true);
  assert.equal(ImageEngine.isSupportedInputType('image/webp'), true);
  assert.equal(ImageEngine.isSupportedInputType('image/svg+xml'), false);
});

test('large file warning is deterministic', () => {
  assert.equal(ImageEngine.shouldWarnForLargeFile({ size: 30 * 1024 * 1024 }), true);
  assert.equal(ImageEngine.shouldWarnForLargeFile({ size: 2 * 1024 * 1024 }), false);
});
