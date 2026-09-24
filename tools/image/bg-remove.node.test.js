const assert = require('node:assert/strict');
let BgRemove = {};
try { BgRemove = require('./bg-remove.js'); } catch (_) {}

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}: ${error.message}`);
    process.exitCode = 1;
  }
}

test('removed background filename is png and preserves stem', () => {
  assert.equal(BgRemove.outputFileName('portrait.final.jpg'), 'portrait.final-no-bg.png');
  assert.equal(BgRemove.outputFileName('portrait'), 'portrait-no-bg.png');
});

test('progress percent handles unknown and bounded totals', () => {
  assert.equal(BgRemove.progressPercent(50, 100), 50);
  assert.equal(BgRemove.progressPercent(150, 100), 100);
  assert.equal(BgRemove.progressPercent(10, null), null);
});
