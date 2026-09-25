import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../tools/money/index.html', import.meta.url), 'utf8');

test('money tool exposes historical inflation controls', () => {
  assert.match(html, /id="inflationAmount"/);
  assert.match(html, /id="inflationFrom"/);
  assert.match(html, /id="inflationTo"/);
  assert.match(html, /id="inflationEquivalent"/);
  assert.match(html, /id="inflationMultiplier"/);
  assert.match(html, /id="inflationChange"/);
  assert.match(html, /id="inflationChart"/);
  assert.match(html, /money-core\.js/);
  assert.match(html, /data\/us-cpi\.json/);
});

test('money tool exposes one-to-many live fx controls', () => {
  assert.match(html, /id="fxAmount"/);
  assert.match(html, /id="fxBase"/);
  assert.match(html, /id="fxAddCurrency"/);
  assert.match(html, /id="fxResults"/);
  assert.match(html, /id="fxStatus"/);
  assert.match(html, /fx-core\.js/);
  assert.match(html, /Frankfurter/i);
});

test('Money & Finance exposes one shared scenario across six modes', () => {
  for (const id of ['moneyModeNav', 'scenarioAmount', 'scenarioCurrency', 'scenarioYears', 'scenarioRate']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  for (const mode of ['inflation', 'currency', 'growth', 'savings', 'loans', 'income']) {
    assert.match(html, new RegExp(`data-money-mode="${mode}"`));
  }
});

test('finance modes expose growth, savings, loan, and income calculators', () => {
  for (const id of ['growthPanel', 'growthPrincipal', 'growthContribution', 'growthResult', 'savingsPanel', 'savingsTarget', 'savingsMonthly', 'loanPanel', 'loanPrincipal', 'loanPayment', 'loanInterest', 'incomePanel', 'incomeHourly', 'incomeSalary', 'incomePaycheck']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(html, /finance-core\.js/);
  assert.match(html, /money-scenario\.js/);
});
