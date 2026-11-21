import { inputDate, sloveniaAge } from './calendar.mjs';

const byId = id => document.getElementById(id);
const dateInput = byId('date');
const countryInput = byId('country');
const holidayList = byId('public-holidays');
const eventsList = byId('events');
const observanceList = byId('observances');
const holidayStatus = byId('public-status');
const historyStatus = byId('history-status');
const observanceStatus = byId('observances-status');
const dateHeading = byId('date-heading');
const historySource = byId('history-source');
const observanceSource = byId('observance-source');
const counter = Object.fromEntries(
  ['years', 'days', 'hours', 'minutes', 'seconds'].map(unit => [unit, byId(unit)]),
);
const fullDate = new Intl.DateTimeFormat('en', { dateStyle: 'full' });
const monthDay = new Intl.DateTimeFormat('en', { month: 'long', day: 'numeric' });
const historyCache = new Map();
const holidayCache = new Map();
const holidayApi = 'https://date.nager.at/api/v3';
const nationalToday = 'https://nationaltoday.com/';
const observanceData = new URL('./national-today.json', import.meta.url).href;
let tracksToday = true;
let historyRequest = 0;
let observanceRequest = 0;
let holidayRequest = 0;

async function fetchJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(11000) });
  if (!response.ok) throw new Error('Data request failed');
  return response.json();
}

function cachedJson(cache, url) {
  if (!cache.has(url)) {
    cache.set(url, fetchJson(url).catch(error => {
      cache.delete(url);
      throw error;
    }));
  }
  return cache.get(url);
}

function sourceLink(page, label, fallback) {
  const link = document.createElement('a');
  const href = page?.content_urls?.desktop?.page;
  link.href = typeof href === 'string' && href.startsWith('https://en.wikipedia.org/')
    ? href
    : fallback;
  link.textContent = label;
  return link;
}

function entry(contents) {
  const li = document.createElement('li');
  li.append(contents);
  return li;
}

async function loadHistory(value, wikiDay) {
  const request = ++historyRequest;
  const [, month, day] = value.split('-');
  eventsList.replaceChildren();
  historyStatus.textContent = 'Loading events…';
  try {
    const data = await cachedJson(historyCache, 'https://en.wikipedia.org/api/rest_v1/feed/onthisday/all/' + month + '/' + day);
    if (request !== historyRequest) return;
    const events = data.selected?.length ? data.selected : data.events ?? [];
    eventsList.replaceChildren(...events.slice(0, 7).map(event => {
      const year = document.createElement('span');
      year.className = 'year';
      year.textContent = event.year < 0 ? Math.abs(event.year) + ' BC' : String(event.year);
      const item = entry(year);
      item.append(sourceLink(event.pages?.[0], event.text, wikiDay));
      return item;
    }));
    historyStatus.textContent = events.length ? '' : 'No events are listed for this date.';
  } catch {
    if (request !== historyRequest) return;
    historyStatus.textContent = 'Events are unavailable here right now. Open the Wikipedia link for this date.';
  }
}

async function loadObservances(value) {
  const request = ++observanceRequest;
  observanceList.replaceChildren();
  observanceStatus.textContent = 'Loading observances…';
  try {
    const calendar = await cachedJson(holidayCache, observanceData);
    if (request !== observanceRequest) return;
    const items = calendar.dates[value] ?? [];
    observanceList.replaceChildren(...items.map(([name, path]) => {
      const link = document.createElement('a');
      link.href = nationalToday + path;
      link.textContent = name;
      return entry(link);
    }));
    if (items.length) {
      observanceStatus.textContent = '';
    } else if (value < calendar.from || value > calendar.through) {
      observanceStatus.textContent = 'This date is outside the on-page highlights. Browse National Today for this month and day.';
    } else {
      observanceStatus.textContent = 'No highlights for this date.';
    }
  } catch {
    if (request !== observanceRequest) return;
    observanceStatus.textContent = 'Highlights are unavailable here right now.';
  }
}

async function loadPublicHolidays(value) {
  const request = ++holidayRequest;
  const country = countryInput.value;
  const [year] = value.split('-');
  holidayList.replaceChildren();
  holidayStatus.textContent = 'Loading public holidays…';
  try {
    const holidays = await cachedJson(holidayCache, holidayApi + '/PublicHolidays/' + Number(year) + '/' + country);
    if (request !== holidayRequest) return;
    const today = holidays.filter(holiday => holiday.date === value && holiday.types.includes('Public'));
    holidayList.replaceChildren(...today.map(holiday =>
      entry(holiday.name + (holiday.global ? '' : ' (regional)')),
    ));
    holidayStatus.textContent = today.length ? '' : 'No public holidays are listed for this date.';
  } catch {
    if (request !== holidayRequest) return;
    holidayStatus.textContent = 'Public holiday data is unavailable for this country and year.';
  }
}

async function loadCountries() {
  try {
    const countries = await fetchJson(holidayApi + '/AvailableCountries');
    const selected = countryInput.value;
    countries.sort((a, b) => a.name.localeCompare(b.name, 'en'));
    countryInput.replaceChildren(...countries.map(country => new Option(country.name, country.countryCode)));
    if (countries.some(country => country.countryCode === selected)) countryInput.value = selected;
  } catch {
    // The default countries remain selectable if the directory request fails.
  }
}

function showDate() {
  if (!dateInput.value || !dateInput.validity.valid) return;
  const value = dateInput.value;
  const day = new Date(value + 'T12:00:00');
  dateHeading.textContent = fullDate.format(day);
  const dateLabel = monthDay.format(day);
  const wikiDay = 'https://en.wikipedia.org/wiki/' + encodeURIComponent(dateLabel.replace(' ', '_'));
  const daySlug = dateLabel.toLowerCase().replace(' ', '-');
  const nationalTodayPath = daySlug === 'february-29' ? 'february-holidays/' : daySlug + '/';
  historySource.href = wikiDay + '#Events';
  observanceSource.href = nationalToday + nationalTodayPath;
  loadHistory(value, wikiDay);
  loadObservances(value);
  loadPublicHolidays(value);
}

function tick() {
  const now = new Date();
  for (const [unit, value] of Object.entries(sloveniaAge(now))) {
    const formatted = unit === 'years' || unit === 'days' ? String(value) : String(value).padStart(2, '0');
    if (counter[unit].textContent !== formatted) counter[unit].textContent = formatted;
  }
  const today = inputDate(now);
  if (tracksToday && dateInput.value !== today) {
    dateInput.value = today;
    showDate();
  }
}

dateInput.addEventListener('change', () => {
  tracksToday = dateInput.value === inputDate();
  showDate();
});
countryInput.addEventListener('change', () => {
  if (dateInput.value && dateInput.validity.valid) loadPublicHolidays(dateInput.value);
});
byId('reset-date').addEventListener('click', () => {
  tracksToday = true;
  tick();
});
loadCountries();
tick();
setInterval(tick, 1000);
