const assert = require('node:assert/strict');
let GifMaker = {};
try { GifMaker = require('./gif-maker.js'); } catch (_) {}

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}: ${error.message}`);
    process.exitCode = 1;
  }
}

test('fps maps to gif frame delay', () => {
  assert.equal(GifMaker.delayFromFps(10), 100);
  assert.equal(GifMaker.delayFromFps(25), 40);
});

test('fps is clamped to a useful range', () => {
  assert.equal(GifMaker.delayFromFps(0), 1000);
  assert.equal(GifMaker.delayFromFps(200), 10);
});

test('loop labels map to gif repeat counts', () => {
  assert.equal(GifMaker.repeatFromLoop('forever'), 0);
  assert.equal(GifMaker.repeatFromLoop('once'), -1);
  assert.equal(GifMaker.repeatFromLoop('twice'), 1);
  assert.equal(GifMaker.repeatFromLoop('three'), 2);
});

test('contain rect centers a landscape frame', () => {
  assert.deepEqual(GifMaker.containRect(1600, 900, 800, 800), { x: 0, y: 175, width: 800, height: 450 });
});

test('contain rect centers a portrait frame', () => {
  assert.deepEqual(GifMaker.containRect(900, 1600, 800, 800), { x: 175, y: 0, width: 450, height: 800 });
});

test('moveFrame reorders without losing frames', () => {
  assert.deepEqual(GifMaker.moveFrame(['a', 'b', 'c'], 2, 0), ['c', 'a', 'b']);
  assert.deepEqual(GifMaker.moveFrame(['a', 'b'], 0, -1), ['a', 'b']);
});

test('video sample times exclude the end boundary', () => {
  assert.deepEqual(GifMaker.sampleTimes(0, 2, 2), [0, 0.5, 1, 1.5]);
});

test('video sample times clamp invalid ranges and frame count', () => {
  assert.deepEqual(GifMaker.sampleTimes(1, 1, 10), []);
  assert.equal(GifMaker.sampleTimes(0, 100, 100, 300).length, 300);
});
