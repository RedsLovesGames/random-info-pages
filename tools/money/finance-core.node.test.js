const test = require('node:test');
const assert = require('node:assert/strict');
const FinanceCore = require('./finance-core.js');

test('compound growth handles lump sum and periodic contributions', () => {
  const result = FinanceCore.compoundGrowth({ principal: 10000, annualRate: 0.08, years: 10, monthlyContribution: 250, compoundsPerYear: 12 });
  assert.ok(result.futureValue > 65000 && result.futureValue < 70000);
  assert.equal(result.totalContributions, 40000);
  assert.ok(result.growth > 25000);
});

test('CAGR reproduces the ending value', () => {
  const rate = FinanceCore.cagr(1000, 2000, 10);
  assert.ok(Math.abs(rate - 0.0717734625) < 1e-9);
});

test('inflation-adjusted return removes assumed inflation geometrically', () => {
  const real = FinanceCore.realRate(0.08, 0.03);
  assert.ok(Math.abs(real - 0.0485436893) < 1e-9);
});

test('savings goal returns required monthly contribution', () => {
  const monthly = FinanceCore.requiredMonthlySavings({ target: 50000, current: 10000, annualRate: 0.05, years: 5 });
  assert.ok(monthly > 500 && monthly < 600);
});

test('loan payment and amortization are internally consistent', () => {
  const payment = FinanceCore.loanPayment({ principal: 300000, annualRate: 0.06, years: 30 });
  assert.ok(payment > 1798 && payment < 1800);
  const schedule = FinanceCore.amortizationSchedule({ principal: 300000, annualRate: 0.06, years: 30 });
  assert.equal(schedule.rows.length, 360);
  assert.ok(schedule.totalInterest > 347000 && schedule.totalInterest < 348000);
  assert.ok(schedule.rows.at(-1).balance < 0.01);
});

test('extra monthly loan payment shortens payoff and lowers interest', () => {
  const normal = FinanceCore.amortizationSchedule({ principal: 250000, annualRate: 0.065, years: 30 });
  const extra = FinanceCore.amortizationSchedule({ principal: 250000, annualRate: 0.065, years: 30, extraMonthly: 250 });
  assert.ok(extra.rows.length < normal.rows.length);
  assert.ok(extra.totalInterest < normal.totalInterest);
});

test('income helpers convert salary, hourly, overtime, and raises', () => {
  assert.equal(FinanceCore.salaryFromHourly(25, 40, 52), 52000);
  assert.equal(FinanceCore.hourlyFromSalary(52000, 40, 52), 25);
  assert.equal(FinanceCore.raiseAmount(50000, 0.08).newValue, 54000);
  assert.equal(FinanceCore.grossPaycheck({ hourlyRate: 20, regularHours: 40, overtimeHours: 5, overtimeMultiplier: 1.5 }), 950);
});

test('scenario normalization keeps shared amount/rate/horizon finite', () => {
  const scenario = FinanceCore.normalizeScenario({ amount: '1000', currency: 'usd', years: '10', annualRatePercent: '7.5' });
  assert.deepEqual(scenario, { amount: 1000, currency: 'USD', years: 10, annualRatePercent: 7.5 });
});
