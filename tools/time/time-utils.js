const DAY_MS = 86400000;

function parseDateOnly(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
  if (!match) throw new Error('Expected a date in YYYY-MM-DD format.');
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) throw new Error('Invalid calendar date.');
  return date;
}

function dateKey(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

export function dateDifference(from, to) {
  return Math.round((parseDateOnly(to) - parseDateOnly(from)) / DAY_MS);
}

function daysInMonth(year, monthIndex) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

export function addToDate(value, { years = 0, months = 0, days = 0 } = {}) {
  const source = parseDateOnly(value);
  const sourceDay = source.getUTCDate();
  let year = source.getUTCFullYear() + Math.trunc(Number(years) || 0);
  let month = source.getUTCMonth() + Math.trunc(Number(months) || 0);
  year += Math.floor(month / 12);
  month = ((month % 12) + 12) % 12;
  const day = Math.min(sourceDay, daysInMonth(year, month));
  const result = new Date(Date.UTC(year, month, day));
  result.setUTCDate(result.getUTCDate() + Math.trunc(Number(days) || 0));
  return dateKey(result);
}

export function countBusinessDays(from, to, holidays = []) {
  const start = parseDateOnly(from);
  const end = parseDateOnly(to);
  const direction = start <= end ? 1 : -1;
  const holidaySet = new Set((holidays || []).map(String));
  let count = 0;
  for (let cursor = new Date(start); direction > 0 ? cursor <= end : cursor >= end; cursor = new Date(cursor.getTime() + direction * DAY_MS)) {
    const dow = cursor.getUTCDay();
    if (dow !== 0 && dow !== 6 && !holidaySet.has(dateKey(cursor))) count += direction;
  }
  return count;
}

export function isoWeek(value) {
  const date = parseDateOnly(value);
  const target = new Date(date);
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);
  const year = target.getUTCFullYear();
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil((((target - yearStart) / DAY_MS) + 1) / 7);
  return { year, week };
}

export function unixParts(value) {
  const date = value instanceof Date ? new Date(value) : new Date(String(value));
  if (!Number.isFinite(date.getTime())) throw new Error('Invalid timestamp.');
  return { seconds: Math.floor(date.getTime() / 1000), milliseconds: date.getTime(), iso: date.toISOString() };
}

const VALID_FREQ = new Set(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']);
const VALID_DAY = new Set(['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']);

export function buildRrule({ frequency = 'WEEKLY', interval = 1, byDay = [], count = null, until = null } = {}) {
  const freq = String(frequency).toUpperCase();
  if (!VALID_FREQ.has(freq)) throw new Error('Unsupported recurrence frequency.');
  const parts = [`FREQ=${freq}`];
  const every = Math.max(1, Math.trunc(Number(interval) || 1));
  if (every !== 1) parts.push(`INTERVAL=${every}`);
  const days = Array.from(byDay || []).map(day => String(day).toUpperCase()).filter(day => VALID_DAY.has(day));
  if (days.length) parts.push(`BYDAY=${days.join(',')}`);
  if (count != null && Number(count) > 0) parts.push(`COUNT=${Math.trunc(Number(count))}`);
  else if (until) {
    const date = parseDateOnly(until);
    parts.push(`UNTIL=${dateKey(date).replaceAll('-', '')}T235959Z`);
  }
  return parts.join(';');
}

function escapeIcs(value) {
  return String(value ?? '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

function localIcsStamp(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(String(value || ''));
  if (!match) throw new Error('Expected local date/time in YYYY-MM-DDTHH:mm format.');
  return `${match[1]}${match[2]}${match[3]}T${match[4]}${match[5]}${match[6] || '00'}`;
}

export function buildIcsEvent({ title = 'Event', start, end, timeZone = 'UTC', description = '', location = '', rrule = '' } = {}) {
  if (!start || !end) throw new Error('Start and end are required.');
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const uidSeed = `${title}|${start}|${end}|${timeZone}`;
  let hash = 2166136261;
  for (const char of uidSeed) { hash ^= char.codePointAt(0); hash = Math.imul(hash, 16777619); }
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Random Info Pages//Toolbox Time//EN', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT', `UID:${(hash >>> 0).toString(16)}@random-info-pages`, `DTSTAMP:${stamp}`,
    `DTSTART;TZID=${timeZone}:${localIcsStamp(start)}`, `DTEND;TZID=${timeZone}:${localIcsStamp(end)}`,
    `SUMMARY:${escapeIcs(title)}`,
  ];
  if (description) lines.push(`DESCRIPTION:${escapeIcs(description)}`);
  if (location) lines.push(`LOCATION:${escapeIcs(location)}`);
  if (rrule) lines.push(`RRULE:${String(rrule).replace(/^RRULE:/i, '')}`);
  lines.push('END:VEVENT', 'END:VCALENDAR', '');
  return lines.join('\r\n');
}

const DOW_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function parseCronPart(part, min, max, dow = false) {
  const values = new Set();
  const normalized = String(part).trim();
  const addRange = (start, end, step = 1) => {
    for (let value = start; value <= end; value += step) values.add(dow && value === 7 ? 0 : value);
  };
  for (const token of normalized.split(',')) {
    const [base, rawStep] = token.split('/');
    const step = rawStep ? Number(rawStep) : 1;
    if (!Number.isInteger(step) || step <= 0) throw new Error('Invalid cron step.');
    if (base === '*') { addRange(min, max, step); continue; }
    const range = /^(\d+)-(\d+)$/.exec(base);
    if (range) {
      const start = Number(range[1]), end = Number(range[2]);
      if (start < min || end > max || start > end) throw new Error('Invalid cron range.');
      addRange(start, end, step); continue;
    }
    const value = Number(base);
    if (!Number.isInteger(value) || value < min || value > max) throw new Error('Invalid cron field.');
    values.add(dow && value === 7 ? 0 : value);
  }
  return values;
}

function parseCron(expression) {
  const parts = String(expression || '').trim().split(/\s+/);
  if (parts.length !== 5) throw new Error('Cron must have five fields: minute hour day month weekday.');
  return {
    minute: parseCronPart(parts[0], 0, 59), hour: parseCronPart(parts[1], 0, 23),
    day: parseCronPart(parts[2], 1, 31), month: parseCronPart(parts[3], 1, 12), dow: parseCronPart(parts[4], 0, 7, true),
    raw: parts,
  };
}

function cronMatches(parsed, date) {
  return parsed.minute.has(date.getUTCMinutes()) && parsed.hour.has(date.getUTCHours()) && parsed.day.has(date.getUTCDate()) && parsed.month.has(date.getUTCMonth() + 1) && parsed.dow.has(date.getUTCDay());
}

export function describeCron(expression) {
  const parsed = parseCron(expression);
  const [minuteRaw, hourRaw, dayRaw, monthRaw, dowRaw] = parsed.raw;
  if (/^\d+$/.test(minuteRaw) && /^\d+$/.test(hourRaw) && dayRaw === '*' && monthRaw === '*') {
    const time = `${String(Number(hourRaw)).padStart(2, '0')}:${String(Number(minuteRaw)).padStart(2, '0')}`;
    if (dowRaw === '*') return `At ${time}, every day.`;
    if (dowRaw === '1-5') return `At ${time}, Monday through Friday.`;
    if (/^\d$/.test(dowRaw)) return `At ${time}, every ${DOW_NAMES[Number(dowRaw) % 7]}.`;
  }
  return `Cron schedule: ${String(expression).trim()}.`;
}

export function nextCronRuns(expression, from = new Date(), count = 5) {
  const parsed = parseCron(expression);
  const limit = Math.max(1, Math.min(50, Math.trunc(Number(count) || 5)));
  const start = from instanceof Date ? new Date(from) : new Date(from);
  if (!Number.isFinite(start.getTime())) throw new Error('Invalid starting date.');
  let cursor = new Date(start);
  cursor.setUTCSeconds(0, 0);
  cursor = new Date(cursor.getTime() + 60000);
  const results = [];
  const maxIterations = 60 * 24 * 366 * 5;
  for (let i = 0; i < maxIterations && results.length < limit; i += 1, cursor = new Date(cursor.getTime() + 60000)) {
    if (cronMatches(parsed, cursor)) results.push(new Date(cursor));
  }
  if (results.length < limit) throw new Error('Could not find enough cron runs within five years.');
  return results;
}
