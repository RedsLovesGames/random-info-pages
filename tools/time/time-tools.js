import { commonZones } from './time.js';
import { dateDifference, addToDate, countBusinessDays, isoWeek, unixParts, buildRrule, buildIcsEvent, describeCron, nextCronRuns } from './time-utils.js';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const scheduleView = $('#scheduleView');
const panel = $('#scheduleToolPanel');
const toolTab = $('.time-view-tab[data-view="tools"]');
let toolsActive = false;

function esc(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
function todayKey() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function localDateTimeValue(date = new Date()) { const pad=n=>String(n).padStart(2,'0'); return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`; }
function setResult(id, html) { const target = document.getElementById(id); if (target) target.innerHTML = html; }

function activateTools() {
  toolsActive = true;
  $$('[data-view-panel]').forEach(view => { view.hidden = view !== scheduleView; });
  $$('.time-view-tab').forEach(button => { const active = button === toolTab; button.classList.toggle('active', active); button.setAttribute('aria-selected', String(active)); });
}

function deactivateTools() { toolsActive = false; }

document.addEventListener('click', event => {
  const tab = event.target.closest('.time-view-tab');
  if (!tab) return;
  if (tab.dataset.view === 'tools') {
    event.preventDefault();
    event.stopPropagation();
    activateTools();
  } else deactivateTools();
}, true);

new MutationObserver(() => { if (toolsActive && scheduleView.hidden) queueMicrotask(activateTools); }).observe(scheduleView, { attributes:true, attributeFilter:['hidden'] });

function selectTool(id) {
  $$('.schedule-tool').forEach(button => button.classList.toggle('active', button.dataset.scheduleTool === id));
  if (id === 'date-math') renderDateMath();
  else if (id === 'timestamp') renderTimestamp();
  else if (id === 'calendar') renderCalendar();
  else if (id === 'cron') renderCron();
}

function renderDateMath() {
  const today = todayKey();
  panel.innerHTML = `<div class="schedule-grid">
    <label class="schedule-field"><span>Start date</span><input id="dateMathFrom" type="date" value="${today}"></label>
    <label class="schedule-field"><span>End date</span><input id="dateMathTo" type="date" value="${today}"></label>
    <label class="schedule-field"><span>Holidays to exclude</span><input id="dateMathHolidays" placeholder="2026-12-25, 2027-01-01"></label>
    <label class="schedule-field"><span>Add years / months / days</span><div class="schedule-grid three"><input id="addYears" type="number" value="0" aria-label="Years"><input id="addMonths" type="number" value="0" aria-label="Months"><input id="addDays" type="number" value="0" aria-label="Days"></div></label>
  </div><div class="schedule-actions"><button id="runDateMath" class="button primary" type="button">Calculate</button></div><div id="dateMathResult" class="schedule-result">Choose dates to calculate.</div>`;
  const run = () => {
    try {
      const from = $('#dateMathFrom').value, to = $('#dateMathTo').value;
      const holidays = $('#dateMathHolidays').value.split(',').map(v=>v.trim()).filter(Boolean);
      const diff = dateDifference(from, to), business = countBusinessDays(from, to, holidays), week = isoWeek(to);
      const added = addToDate(from, { years:+$('#addYears').value, months:+$('#addMonths').value, days:+$('#addDays').value });
      setResult('dateMathResult', `<strong>${diff.toLocaleString()} calendar days</strong> · ${business.toLocaleString()} business days<br>End date: ISO week ${week.week} of ${week.year}<br>Adjusted start date: ${esc(added)}`);
    } catch (error) { setResult('dateMathResult', esc(error.message || error)); }
  };
  $('#runDateMath').onclick = run; run();
}

function zoneOptions(selected) {
  return commonZones.map(zone => `<option value="${esc(zone)}"${zone===selected?' selected':''}>${esc(zone)}</option>`).join('');
}

function renderTimestamp() {
  const now = new Date();
  const localZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  panel.innerHTML = `<div class="schedule-grid">
    <label class="schedule-field"><span>Date and time</span><input id="timestampInput" type="datetime-local" value="${localDateTimeValue(now)}"></label>
    <label class="schedule-field"><span>Display zone</span><select id="timestampZone">${zoneOptions(commonZones.includes(localZone)?localZone:'UTC')}</select></label>
  </div><div class="schedule-actions"><button id="runTimestamp" class="button primary" type="button">Convert</button><button id="timestampNow" class="button" type="button">Now</button></div><div id="timestampResult" class="schedule-result"></div>`;
  const run = () => {
    try {
      const date = new Date($('#timestampInput').value);
      const parts = unixParts(date);
      const zone = $('#timestampZone').value;
      const localized = new Intl.DateTimeFormat('en-US',{timeZone:zone,dateStyle:'full',timeStyle:'long'}).format(date);
      setResult('timestampResult', `<strong>${esc(parts.iso)}</strong><br>Unix seconds: ${parts.seconds}<br>Unix milliseconds: ${parts.milliseconds}<br>${esc(zone)}: ${esc(localized)}`);
    } catch (error) { setResult('timestampResult', esc(error.message || error)); }
  };
  $('#runTimestamp').onclick = run;
  $('#timestampNow').onclick = () => { $('#timestampInput').value = localDateTimeValue(new Date()); run(); };
  run();
}

function renderCalendar() {
  const start = new Date(Date.now() + 3600000); start.setMinutes(0,0,0);
  const end = new Date(start.getTime() + 3600000);
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  panel.innerHTML = `<div class="schedule-grid">
    <label class="schedule-field"><span>Title</span><input id="icsTitle" value="New event"></label>
    <label class="schedule-field"><span>Time zone</span><select id="icsZone">${zoneOptions(commonZones.includes(zone)?zone:'UTC')}</select></label>
    <label class="schedule-field"><span>Starts</span><input id="icsStart" type="datetime-local" value="${localDateTimeValue(start)}"></label>
    <label class="schedule-field"><span>Ends</span><input id="icsEnd" type="datetime-local" value="${localDateTimeValue(end)}"></label>
    <label class="schedule-field"><span>Recurrence</span><select id="icsFreq"><option value="">Does not repeat</option><option>DAILY</option><option>WEEKLY</option><option>MONTHLY</option><option>YEARLY</option></select></label>
    <label class="schedule-field"><span>Every N periods</span><input id="icsInterval" type="number" min="1" value="1"></label>
    <label class="schedule-field"><span>Occurrences</span><input id="icsCount" type="number" min="1" value="4"></label>
    <label class="schedule-field"><span>Description</span><textarea id="icsDescription"></textarea></label>
  </div><div class="schedule-days" id="icsDays"><label><input type="checkbox" value="MO">Mon</label><label><input type="checkbox" value="TU">Tue</label><label><input type="checkbox" value="WE">Wed</label><label><input type="checkbox" value="TH">Thu</label><label><input type="checkbox" value="FR">Fri</label><label><input type="checkbox" value="SA">Sat</label><label><input type="checkbox" value="SU">Sun</label></div><div class="schedule-actions"><button id="buildIcs" class="button primary" type="button">Build event</button><button id="downloadIcs" class="button" type="button">Download .ics</button></div><div id="calendarResult" class="schedule-result"></div>`;
  let lastIcs = '';
  const build = () => {
    try {
      const frequency = $('#icsFreq').value;
      const byDay = $$('#icsDays input:checked').map(input => input.value);
      const rrule = frequency ? buildRrule({ frequency, interval:+$('#icsInterval').value, byDay, count:+$('#icsCount').value }) : '';
      lastIcs = buildIcsEvent({ title:$('#icsTitle').value, start:$('#icsStart').value, end:$('#icsEnd').value, timeZone:$('#icsZone').value, description:$('#icsDescription').value, rrule });
      setResult('calendarResult', `<strong>${rrule ? `RRULE: ${esc(rrule)}` : 'One-time event'}</strong><br>${esc(lastIcs)}`);
    } catch (error) { lastIcs=''; setResult('calendarResult', esc(error.message || error)); }
  };
  $('#buildIcs').onclick = build;
  $('#downloadIcs').onclick = () => {
    if (!lastIcs) build(); if (!lastIcs) return;
    const url = URL.createObjectURL(new Blob([lastIcs], {type:'text/calendar;charset=utf-8'}));
    const a = document.createElement('a'); a.href=url; a.download='event.ics'; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  build();
}

function renderCron() {
  panel.innerHTML = `<div class="schedule-grid"><label class="schedule-field"><span>Five-field cron expression</span><input id="cronExpression" value="0 9 * * 1-5"></label><label class="schedule-field"><span>Preview count</span><input id="cronCount" type="number" min="1" max="20" value="5"></label></div><div class="schedule-actions"><button id="runCron" class="button primary" type="button">Explain & preview</button></div><div id="cronResult" class="schedule-result"></div>`;
  const run = () => {
    try {
      const expression = $('#cronExpression').value;
      const runs = nextCronRuns(expression, new Date(), +$('#cronCount').value);
      setResult('cronResult', `<strong>${esc(describeCron(expression))}</strong><br>${runs.map(run=>esc(run.toISOString())).join('<br>')}`);
    } catch (error) { setResult('cronResult', esc(error.message || error)); }
  };
  $('#runCron').onclick = run; run();
}

$$('.schedule-tool').forEach(button => button.addEventListener('click', () => selectTool(button.dataset.scheduleTool)));

const requested = new URLSearchParams(location.search).get('action');
if (['date-math','timestamp','calendar','cron'].includes(requested)) {
  activateTools(); selectTool(requested);
} else selectTool('date-math');
