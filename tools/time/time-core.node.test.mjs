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

test('zoneParts falls back when shortOffset is unsupported', () => {
  const OriginalDateTimeFormat = Intl.DateTimeFormat;
  function WithoutShortOffset(locale, options = {}) {
    if (options.timeZoneName === 'shortOffset') throw new RangeError('unsupported timeZoneName');
    return new OriginalDateTimeFormat(locale, options);
  }
  WithoutShortOffset.supportedLocalesOf = OriginalDateTimeFormat.supportedLocalesOf.bind(OriginalDateTimeFormat);
  Intl.DateTimeFormat = WithoutShortOffset;
  try {
    const parts = mod.zoneParts(new Date('2026-01-01T12:00:00Z'), 'America/New_York', true);
    assert.match(parts.timeZoneName, /GMT-05:00|GMT-5|UTC-5/i);
  } finally {
    Intl.DateTimeFormat = OriginalDateTimeFormat;
  }
});

test('day difference detects date rollover across zones', () => {
  const instant = new Date('2026-01-01T01:00:00Z');
  assert.equal(mod.dayDifference(instant, 'America/Los_Angeles', 'Europe/London'), -1);
});

test('v3 state round trips locations and people', () => {
  const state = {
    version: 3,
    format24: true,
    referenceLocationId: 'nyc',
    offsetMinutes: 90,
    activeView: 'planner',
    locations: [{ id: 'nyc', label: 'New York', country: 'United States', zone: 'America/New_York', lat: 40.7128, lon: -74.006 }],
    people: [{ id: 'tommy', name: 'Tommy', locationId: 'nyc', availableStart: '09:00', availableEnd: '17:00' }],
  };
  const restored = mod.deserializeState(mod.serializeState(state));
  assert.equal(restored.version, 3);
  assert.equal(restored.offsetMinutes, 90);
  assert.equal(restored.activeView, 'planner');
  assert.equal(restored.locations[0].zone, 'America/New_York');
  assert.equal(restored.people[0].name, 'Tommy');
});

test('v2 clocks migrate to v3 people and merge duplicate zones', () => {
  const raw = JSON.stringify({ version: 2, format24: false, referenceId: 'a', offsetHours: 2, clocks: [
    { id: 'a', name: 'Tommy', zone: 'America/New_York', availableStart: '09:00', availableEnd: '17:00' },
    { id: 'b', name: 'Alex', zone: 'America/New_York', availableStart: null, availableEnd: null },
    { id: 'c', name: 'Rita', zone: 'Europe/London', availableStart: '10:00', availableEnd: '18:00' },
  ] });
  const state = mod.deserializeState(raw);
  assert.equal(state.version, 3);
  assert.equal(state.locations.length, 2);
  assert.equal(state.people.length, 3);
  assert.equal(state.offsetMinutes, 120);
  assert.equal(state.people.find(p => p.name === 'Tommy').locationId, state.people.find(p => p.name === 'Alex').locationId);
  assert.equal(state.referenceLocationId, state.people.find(p => p.name === 'Tommy').locationId);
});

test('corrupt saved state falls back to a usable grouped workspace', () => {
  const state = mod.deserializeState('{bad json');
  assert.equal(state.version, 3);
  assert.ok(Array.isArray(state.locations));
  assert.ok(state.locations.length > 0);
  assert.ok(Array.isArray(state.people));
  assert.ok(state.people.length > 0);
});

test('adding a person in an existing city reuses its location', () => {
  const state = mod.deserializeState(JSON.stringify({
    version: 3,
    locations: [{ id: 'nyc', label: 'New York', country: 'United States', zone: 'America/New_York', lat: 40.7128, lon: -74.006 }],
    people: [{ id: 'a', name: 'Tommy', locationId: 'nyc', availableStart: null, availableEnd: null }],
  }));
  const next = mod.addPersonToState(state, { name: 'Alex', cityId: 'new-york', availableStart: '09:00', availableEnd: '17:00' });
  assert.equal(next.locations.length, 1);
  assert.equal(next.people.length, 2);
  assert.equal(next.people[0].locationId, next.people[1].locationId);
});

test('peopleForLocation and grouping expose one group per location', () => {
  const locations = [
    { id: 'nyc', zone: 'America/New_York' },
    { id: 'lon', zone: 'Europe/London' },
  ];
  const people = [
    { id: 'a', name: 'Tommy', locationId: 'nyc' },
    { id: 'b', name: 'Alex', locationId: 'nyc' },
    { id: 'c', name: 'Rita', locationId: 'lon' },
  ];
  assert.deepEqual(mod.peopleForLocation(people, 'nyc').map(p => p.name), ['Tommy', 'Alex']);
  const groups = mod.groupPeopleByLocation({ locations, people });
  assert.equal(groups.length, 2);
  assert.equal(groups[0].people.length, 2);
});

test('equirectangular projection puts zero latitude/longitude at map center', () => {
  assert.deepEqual(mod.projectCoordinates(0, 0, 1000, 500), { x: 500, y: 250 });
  const nyc = mod.projectCoordinates(40.7128, -74.006, 1000, 500);
  assert.ok(nyc.x > 200 && nyc.x < 400);
  assert.ok(nyc.y > 100 && nyc.y < 200);
});

test('availability supports normal and overnight windows', () => {
  const noonUtc = new Date('2026-01-01T12:00:00Z');
  const twoAmUtc = new Date('2026-01-01T02:00:00Z');
  assert.equal(mod.isAvailableAt(noonUtc, 'UTC', '09:00', '17:00'), true);
  assert.equal(mod.isAvailableAt(twoAmUtc, 'UTC', '09:00', '17:00'), false);
  assert.equal(mod.isAvailableAt(twoAmUtc, 'UTC', '22:00', '06:00'), true);
});
