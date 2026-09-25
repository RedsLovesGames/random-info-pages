import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('./time.js', import.meta.url), 'utf8');
const mod = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

test('New York DST transition derives offsets from the selected instant', () => {
  const before = mod.zoneParts(new Date('2026-03-08T06:30:00Z'), 'America/New_York', true);
  const after = mod.zoneParts(new Date('2026-03-08T07:30:00Z'), 'America/New_York', true);
  assert.match(before.timeZoneName, /-5|GMT-5|UTC-5/i);
  assert.match(after.timeZoneName, /-4|GMT-4|UTC-4/i);
});

test('day difference detects date rollover across zones', () => {
  const instant = new Date('2026-01-01T01:00:00Z');
  assert.equal(mod.dayDifference(instant, 'America/Los_Angeles', 'Europe/London'), -1);
});

test('corrupt saved state falls back to a usable board', () => {
  const state = mod.deserializeState('{bad json');
  assert.ok(Array.isArray(state.clocks));
  assert.ok(state.clocks.length > 0);
});

test('saved state preserves valid availability hours and drops invalid hours', () => {
  const raw = JSON.stringify({ version: 2, format24: true, referenceId: 'a', offsetHours: 2, clocks: [
    { id: 'a', name: 'A', zone: 'UTC', availableStart: '09:00', availableEnd: '17:00' },
    { id: 'b', name: 'B', zone: 'Europe/London', availableStart: '99:00', availableEnd: '17:00' },
  ] });
  const state = mod.deserializeState(raw);
  assert.equal(state.clocks[0].availableStart, '09:00');
  assert.equal(state.clocks[0].availableEnd, '17:00');
  assert.equal(state.clocks[1].availableStart, null);
  assert.equal(state.clocks[1].availableEnd, null);
});

test('availability supports normal and overnight windows', () => {
  const noonUtc = new Date('2026-01-01T12:00:00Z');
  const twoAmUtc = new Date('2026-01-01T02:00:00Z');
  assert.equal(mod.isAvailableAt(noonUtc, 'UTC', '09:00', '17:00'), true);
  assert.equal(mod.isAvailableAt(twoAmUtc, 'UTC', '09:00', '17:00'), false);
  assert.equal(mod.isAvailableAt(twoAmUtc, 'UTC', '22:00', '06:00'), true);
});

test('moveClock reorders by id and clamps at edges', () => {
  const clocks = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  assert.deepEqual(mod.moveClock(clocks, 'b', -1).map(x => x.id), ['b', 'a', 'c']);
  assert.deepEqual(mod.moveClock(clocks, 'a', -1).map(x => x.id), ['a', 'b', 'c']);
});
