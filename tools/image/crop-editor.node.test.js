const assert = require('node:assert/strict');
let CropEditor = {};
try { CropEditor = require('./crop-editor.js'); } catch (_) {}

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}: ${error.message}`);
    process.exitCode = 1;
  }
}

test('free crop ratio maps to NaN', () => {
  assert.equal(Number.isNaN(CropEditor.parseAspectRatio('free')), true);
});

test('numeric crop ratio stays numeric', () => {
  assert.equal(CropEditor.parseAspectRatio('1.7777777778'), 1.7777777778);
});

test('invalid crop ratio maps to NaN', () => {
  assert.equal(Number.isNaN(CropEditor.parseAspectRatio('0')), true);
  assert.equal(Number.isNaN(CropEditor.parseAspectRatio('bad')), true);
});

test('cropped source name is stable and png', () => {
  assert.equal(CropEditor.croppedFileName('photo.final.jpg'), 'photo.final-crop.png');
  assert.equal(CropEditor.croppedFileName('photo'), 'photo-crop.png');
});
