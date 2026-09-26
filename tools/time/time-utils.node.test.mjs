import test from 'node:test';
import assert from 'node:assert/strict';
import {
  dateDifference,
  addToDate,
  countBusinessDays,
  isoWeek,
  unixParts,
  buildRrule,
  buildIcsEvent,
  describeCron,
  nextCronRuns,
} from './time-utils.js';

test('date math handles signed calendar-day differences', () => {
  assert.equal(dateDifference('2026-09-25', '2026-10-05'), 10);
  assert.equal(dateDifference('2026-10-05', '2026-09-25'), -10);
});

test('date math adds years months and days without mutating source', () => {
  assert.equal(addToDate('2026-01-31', { months: 1 }), '2026-02-28');
  assert.equal(addToDate('2024-02-29', { years: 1 }), '2025-02-28');
  assert.equal(addToDate('2026-09-25', { days: 7 }), '2026-10-02');
});

test('business-day count excludes weekends and optional holidays', () => {
  assert.equal(countBusinessDays('2026-09-21', '2026-09-25'), 5);
  assert.equal(countBusinessDays('2026-09-21', '2026-09-25', ['2026-09-23']), 4);
});

test('ISO week calculation follows ISO-8601 week-year rules', () => {
  assert.deepEqual(isoWeek('2026-01-01'), { year: 2026, week: 1 });
  assert.deepEqual(isoWeek('2027-01-01'), { year: 2026, week: 53 });
});

test('timestamp conversion exposes seconds milliseconds and ISO text', () => {
  const result = unixParts('2026-09-25T12:00:00Z');
  assert.equal(result.seconds, 1790337600);
  assert.equal(result.milliseconds, 1790337600000);
  assert.equal(result.iso, '2026-09-25T12:00:00.000Z');
});

test('RRULE builder emits deterministic weekly recurrence', () => {
  assert.equal(buildRrule({ frequency: 'WEEKLY', interval: 2, byDay: ['MO', 'WE'], count: 8 }), 'FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE;COUNT=8');
});

test('ICS builder escapes text and includes recurrence when requested', () => {
  const ics = buildIcsEvent({
    title: 'Lab, review',
    start: '2026-09-25T14:00:00',
    end: '2026-09-25T15:00:00',
    timeZone: 'America/New_York',
    description: 'Bring notes\nand calculator',
    rrule: 'FREQ=WEEKLY;COUNT=4',
  });
  assert.match(ics, /BEGIN:VCALENDAR/);
  assert.match(ics, /SUMMARY:Lab\\, review/);
  assert.match(ics, /DTSTART;TZID=America\/New_York:20260925T140000/);
  assert.match(ics, /DESCRIPTION:Bring notes\\nand calculator/);
  assert.match(ics, /RRULE:FREQ=WEEKLY;COUNT=4/);
});

test('cron helpers explain and preview common five-field schedules', () => {
  assert.equal(describeCron('0 9 * * 1-5'), 'At 09:00, Monday through Friday.');
  const runs = nextCronRuns('0 9 * * 1-5', new Date('2026-09-25T12:00:00Z'), 3);
  assert.equal(runs.length, 3);
  assert.equal(runs[0].toISOString(), '2026-09-28T09:00:00.000Z');
});
