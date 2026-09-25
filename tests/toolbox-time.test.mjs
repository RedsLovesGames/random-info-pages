import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../tools/time/index.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('../tools/time/time-app.js', import.meta.url), 'utf8');

test('time board exposes slider and persistent clock controls', () => {
  assert.match(html, /id="slider"/);
  assert.match(html, /id="now"/);
  assert.match(html, /id="format"/);
  assert.match(html, /id="clocks"/);
  assert.match(html, /time\.js/);
  assert.match(html, /time-app\.js/);
});

test('time board exposes edit and optional availability hours', () => {
  assert.match(html, /id="clockDialog"/);
  assert.match(html, /id="editName"/);
  assert.match(html, /id="editZone"/);
  assert.match(html, /id="availableStart"/);
  assert.match(html, /id="availableEnd"/);
  assert.match(html, /id="clearHours"/);
});

test('time board exposes overlap summary and reorder semantics', () => {
  assert.match(html, /id="overlap"/);
  assert.match(html, /id="overlapSummary"/);
  assert.match(html, /id="overlapPeople"/);
  assert.match(app, /data-move=/);
  assert.match(app, /moveClock\(/);
});
