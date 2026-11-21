const zone = 'Europe/Ljubljana';
const localYear = new Intl.DateTimeFormat('en', { timeZone: zone, year: 'numeric' });
const localHour = new Intl.DateTimeFormat('en-GB', {
  timeZone: zone, hour: '2-digit', hourCycle: 'h23',
});

export function inputDate(date = new Date()) {
  return [
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
  ].map((part, index) => String(part).padStart(index === 0 ? 4 : 2, '0')).join('-');
}

function anniversary(year) {
  const utcMidnight = Date.UTC(year, 5, 25);
  const utcNoon = utcMidnight + 12 * 3600000;
  const juneOffset = Number(localHour.format(utcNoon)) - 12;
  return utcMidnight - juneOffset * 3600000;
}

export function sloveniaAge(now = new Date()) {
  let year = Number(localYear.format(now));
  let lastAnniversary = anniversary(year);
  if (now < lastAnniversary) {
    lastAnniversary = anniversary(--year);
  }
  const elapsed = year < 1991 ? 0 : Math.floor((now - lastAnniversary) / 1000);
  return {
    years: Math.max(0, year - 1991),
    days: Math.floor(elapsed / 86400),
    hours: Math.floor(elapsed / 3600) % 24,
    minutes: Math.floor(elapsed / 60) % 60,
    seconds: elapsed % 60,
  };
}
