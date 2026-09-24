const assert = require('node:assert/strict');

global.window = global.window || {};
const exported = require('./image-core.js');
const ImageCore = exported && Object.keys(exported).length ? exported : global.window.ImageCore;

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}: ${error.message}`);
    process.exitCode = 1;
  }
}

test('original mode preserves source dimensions', () => {
  assert.deepEqual(ImageCore.computeTargetSize(4000, 3000, { mode: 'original' }), { width: 4000, height: 3000 });
});

test('width mode preserves aspect ratio', () => {
  assert.deepEqual(ImageCore.computeTargetSize(4000, 3000, { mode: 'width', width: 1000, preserveAspectRatio: true }), { width: 1000, height: 750 });
});

test('height mode preserves aspect ratio', () => {
  assert.deepEqual(ImageCore.computeTargetSize(4000, 3000, { mode: 'height', height: 600, preserveAspectRatio: true }), { width: 800, height: 600 });
});

test('percent mode rescales both dimensions', () => {
  assert.deepEqual(ImageCore.computeTargetSize(1200, 800, { mode: 'percent', percent: 50 }), { width: 600, height: 400 });
});

test('max-width never enlarges a smaller image', () => {
  assert.deepEqual(ImageCore.computeTargetSize(800, 600, { mode: 'max-width', width: 1200 }), { width: 800, height: 600 });
});

test('fit stays inside both bounds', () => {
  assert.deepEqual(ImageCore.computeTargetSize(4000, 3000, { mode: 'fit', width: 1000, height: 1000 }), { width: 1000, height: 750 });
});

test('fill covers both bounds', () => {
  assert.deepEqual(ImageCore.computeTargetSize(4000, 3000, { mode: 'fill', width: 1000, height: 1000 }), { width: 1333, height: 1000 });
});

test('preventUpscale caps width mode at source size', () => {
  assert.deepEqual(ImageCore.computeTargetSize(800, 600, { mode: 'width', width: 1600, preserveAspectRatio: true, preventUpscale: true }), { width: 800, height: 600 });
});

test('output filename uses canonical extension', () => {
  assert.equal(ImageCore.makeOutputName('photo.final.PNG', 'image/jpeg'), 'photo.final.jpg');
  assert.equal(ImageCore.makeOutputName('photo', 'image/webp'), 'photo.webp');
});

test('uniqueName handles duplicate output names', () => {
  const used = new Set(['photo.jpg', 'photo-2.jpg']);
  assert.equal(ImageCore.uniqueName('photo.jpg', used), 'photo-3.jpg');
});

test('target size parser supports KB and MB', () => {
  assert.equal(ImageCore.parseTargetBytes(500, 'KB'), 512000);
  assert.equal(ImageCore.parseTargetBytes(2, 'MB'), 2097152);
});

test('invalid dimensions throw', () => {
  assert.throws(() => ImageCore.computeTargetSize(0, 3000, { mode: 'original' }), /positive/i);
});
