const assert = require('node:assert/strict');
let FxCore = {};
try { FxCore = require('./fx-core.js'); } catch (_) {}

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}: ${error.message}`);
    process.exitCode = 1;
  }
}

const rows = [
  { date: '2026-09-24', base: 'USD', quote: 'EUR', rate: 0.85 },
  { date: '2026-09-24', base: 'USD', quote: 'JPY', rate: 150 },
  { date: '2026-09-23', base: 'USD', quote: 'GBP', rate: 0.74 },
];

test('normalizes flat Frankfurter rows and includes the base at one', () => {
  const data = FxCore.normalizeRows(rows, 'usd');
  assert.equal(data.base, 'USD');
  assert.equal(data.rates.USD, 1);
  assert.equal(data.rates.EUR, 0.85);
  assert.equal(data.rates.JPY, 150);
  assert.equal(data.effectiveDate, '2026-09-24');
});

test('conversion multiplies amount by quote rate', () => {
  assert.equal(FxCore.convert(100, 0.85), 85);
});

test('fresh cache uses ttl boundary', () => {
  const fetchedAt = Date.parse('2026-09-24T12:00:00Z');
  const twelveHours = 12 * 60 * 60 * 1000;
  assert.equal(FxCore.isFresh({ fetchedAt }, fetchedAt + twelveHours - 1, twelveHours), true);
  assert.equal(FxCore.isFresh({ fetchedAt }, fetchedAt + twelveHours + 1, twelveHours), false);
});

test('invalid or future cache timestamps are not fresh', () => {
  assert.equal(FxCore.isFresh({ fetchedAt: 'bad' }, Date.now()), false);
  assert.equal(FxCore.isFresh({ fetchedAt: Date.now() + 10000 }, Date.now()), false);
});

test('stale description includes age without changing source date', () => {
  const fetchedAt = Date.parse('2026-09-23T00:00:00Z');
  const label = FxCore.cacheLabel({ fetchedAt, effectiveDate: '2026-09-22' }, Date.parse('2026-09-24T06:00:00Z'), false);
  assert.match(label, /stale/i);
  assert.match(label, /2026-09-22/);
});

test('malformed rate rows are ignored', () => {
  const data = FxCore.normalizeRows([{ base: 'USD', quote: 'EUR', rate: -2 }, { base: 'USD', quote: '', rate: 2 }], 'USD');
  assert.deepEqual(data.rates, { USD: 1 });
});
