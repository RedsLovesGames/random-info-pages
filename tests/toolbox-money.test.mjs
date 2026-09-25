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
