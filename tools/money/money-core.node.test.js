const assert = require('node:assert/strict');
let MoneyCore = {};
try { MoneyCore = require('./money-core.js'); } catch (_) {}

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}: ${error.message}`);
    process.exitCode = 1;
  }
}

const fixture = {
  values: {
    '1913': 29.7,
    '1967': 100.2,
    '2025': 967.5,
  },
};

test('inflation conversion follows target index divided by source index', () => {
  const result = MoneyCore.calculateInflation(100, 1913, 2025, fixture);
  assert.ok(Math.abs(result.equivalent - 3257.5757576) < 1e-6);
  assert.ok(Math.abs(result.multiplier - (967.5 / 29.7)) < 1e-10);
});

test('reverse conversion can represent a lower target price level', () => {
  const series = { values: { '2000': 100, '2001': 50 } };
  const result = MoneyCore.calculateInflation(200, 2000, 2001, series);
  assert.equal(result.equivalent, 100);
  assert.equal(result.multiplier, 0.5);
  assert.equal(result.priceLevelChangePercent, -50);
});

test('same-year conversion leaves the amount unchanged', () => {
  const result = MoneyCore.calculateInflation(123.45, 1967, 1967, fixture);
  assert.equal(result.equivalent, 123.45);
  assert.equal(result.multiplier, 1);
  assert.equal(result.priceLevelChangePercent, 0);
});

test('missing years are rejected instead of extrapolated', () => {
  assert.throws(() => MoneyCore.calculateInflation(100, 1912, 2025, fixture), /missing cpi/i);
});

test('invalid amounts are rejected', () => {
  assert.throws(() => MoneyCore.calculateInflation(Number.NaN, 1913, 2025, fixture), /amount/i);
});

test('pre-1913 years are labelled reconstructed estimates', () => {
  assert.equal(MoneyCore.seriesKindForYear(1800), 'estimated');
  assert.equal(MoneyCore.seriesKindForYear(1912), 'estimated');
  assert.equal(MoneyCore.seriesKindForYear(1913), 'official');
  assert.equal(MoneyCore.seriesKindForYear(2025), 'official');
});
