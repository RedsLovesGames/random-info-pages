function createDateRange(startIso, endIso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startIso) || !/^\d{4}-\d{2}-\d{2}$/.test(endIso)) return [];
  const start = new Date(`${startIso}T00:00:00Z`);
  const end = new Date(`${endIso}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return [];
  const result = [];
  for (let cursor = start; cursor <= end; cursor = new Date(cursor.getTime() + 86400000)) {
    result.push(cursor.toISOString().slice(0, 10));
  }
  return result;
}

function formatMinutes(totalMinutes) {
  const normalized = ((Number(totalMinutes) % 1440) + 1440) % 1440;
  const hour24 = Math.floor(normalized / 60);
  const minute = normalized % 60;
  const suffix = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${String(minute).padStart(2, '0')} ${suffix}`;
}

function clampMeetingDuration(durationMinutes, slotMinutes, availableMinutes) {
  const slot = Math.max(1, Number(slotMinutes) || 30);
  const available = Math.max(slot, Number(availableMinutes) || slot);
  const requested = Math.max(slot, Number(durationMinutes) || slot);
  const snapped = Math.round(requested / slot) * slot;
  return Math.min(available, Math.max(slot, snapped));
}

function slotKeysForEvent(event) {
  const result = [];
  const step = Math.max(1, Number(event.slotMinutes) || 30);
  const start = Number(event.startMinute);
  const end = Number(event.endMinute);
  for (const date of event.dates || []) {
    for (let minute = start; minute < end; minute += step) {
      result.push(`${date}|${minute}`);
    }
  }
  return result;
}

function summarizeSlot(responses, slotKey) {
  let yes = 0;
  let maybe = 0;
  let no = 0;
  const values = Object.values(responses || {});
  for (const response of values) {
    const state = Number(response?.slots?.[slotKey] || 0);
    if (state === 2) yes += 1;
    else if (state === 1) maybe += 1;
    else no += 1;
  }
  return { yes, maybe, no, total: values.length, score: yes * 2 + maybe * 0.5 };
}

function rankBestWindows(event, responses, limit = 5) {
  const step = Math.max(1, Number(event.slotMinutes) || 30);
  const windowSlots = Math.max(1, Math.round(Number(event.durationMinutes || step) / step));
  const participants = Object.values(responses || {});
  const candidates = [];

  for (const date of event.dates || []) {
    for (let minute = Number(event.startMinute); minute + windowSlots * step <= Number(event.endMinute); minute += step) {
      let yes = 0;
      let maybe = 0;
      let no = 0;
      for (const participant of participants) {
        let participantState = 2;
        for (let offset = 0; offset < windowSlots; offset += 1) {
          const state = Number(participant?.slots?.[`${date}|${minute + offset * step}`] || 0);
          participantState = Math.min(participantState, state);
          if (participantState === 0) break;
        }
        if (participantState === 2) yes += 1;
        else if (participantState === 1) maybe += 1;
        else no += 1;
      }
      candidates.push({
        date,
        minute,
        endMinute: minute + windowSlots * step,
        startKey: `${date}|${minute}`,
        yes,
        maybe,
        no,
        total: participants.length,
        score: yes * 2 + maybe * 0.5,
      });
    }
  }

  return candidates
    .sort((a, b) => b.yes - a.yes || b.maybe - a.maybe || a.no - b.no || b.score - a.score || a.date.localeCompare(b.date) || a.minute - b.minute)
    .slice(0, Math.max(0, limit));
}

function applyRange(slots, date, startMinute, endMinute, slotMinutes, state) {
  const next = { ...(slots || {}) };
  const step = Math.max(1, Number(slotMinutes) || 30);
  for (let minute = Number(startMinute); minute < Number(endMinute); minute += step) {
    const key = `${date}|${minute}`;
    if (Number(state) > 0) next[key] = Number(state);
    else delete next[key];
  }
  return next;
}

function copyDay(slots, sourceDate, destinationDate) {
  const next = {};
  for (const [key, value] of Object.entries(slots || {})) {
    if (!key.startsWith(`${destinationDate}|`)) next[key] = value;
  }
  for (const [key, value] of Object.entries(slots || {})) {
    if (key.startsWith(`${sourceDate}|`)) {
      const minute = key.split('|')[1];
      next[`${destinationDate}|${minute}`] = value;
    }
  }
  return next;
}

function mergeParticipantResponse(event, participantId, response) {
  return {
    ...(event || {}),
    responses: {
      ...(event?.responses || {}),
      [participantId]: {
        ...(response || {}),
        updatedAt: response?.updatedAt || new Date().toISOString(),
      },
    },
  };
}

function validateEventDraft(draft) {
  const errors = [];
  if (!String(draft?.title || '').trim()) errors.push('Add an event name.');
  if (!Array.isArray(draft?.dates) || draft.dates.length === 0) errors.push('Choose at least one date.');
  const start = Number(draft?.startMinute);
  const end = Number(draft?.endMinute);
  const slot = Number(draft?.slotMinutes);
  const duration = Number(draft?.durationMinutes);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) errors.push('End time must be later than start time.');
  if (![15, 30, 60].includes(slot)) errors.push('Time slot size must be 15, 30, or 60 minutes.');
  if (Number.isFinite(start) && Number.isFinite(end) && Number.isFinite(duration) && duration > end - start) errors.push('Meeting length must fit inside the daily time range.');
  if (!String(draft?.timeZone || '').trim()) errors.push('Choose a time zone.');
  return errors;
}

const API_BASE = 'https://jsonblob.com/api/jsonBlob';

function ensureOk(response, action) {
  if (!response?.ok) {
    const status = response?.status ? ` (${response.status})` : '';
    throw new Error(`${action} failed${status}`);
  }
  return response;
}

function roomRefFromUri(uri) {
  const match = String(uri || '').match(/\/api\/jsonBlob\/([^/?#]+)/i);
  return match ? decodeURIComponent(match[1]) : '';
}

function roomHash(roomRef) {
  if (!roomRef) return '';
  return `#room=${encodeURIComponent(roomRef)}`;
}

function roomRefFromHash(hash = '') {
  const raw = String(hash).replace(/^#/, '');
  const params = new URLSearchParams(raw);
  const ref = params.get('room');
  return ref ? decodeURIComponent(ref) : '';
}

function cloudUrl(roomRef) {
  return `${API_BASE}/${encodeURIComponent(String(roomRef || ''))}`;
}

async function createCloudEvent(event, fetchImpl = globalThis.fetch) {
  const response = ensureOk(await fetchImpl(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(event),
  }), 'Creating room');
  const ref = roomRefFromUri(response.headers?.get?.('Location') || response.headers?.get?.('location'));
  if (!ref) throw new Error('Storage service did not return a usable room URL.');
  return ref;
}

async function loadCloudEvent(roomRef, fetchImpl = globalThis.fetch) {
  const response = ensureOk(await fetchImpl(cloudUrl(roomRef), {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  }), 'Loading room');
  return response.json();
}

async function replaceCloudEvent(roomRef, event, fetchImpl = globalThis.fetch) {
  const response = ensureOk(await fetchImpl(cloudUrl(roomRef), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(event),
  }), 'Saving room');
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function saveParticipantCloud(roomRef, participantId, participantResponse, fetchImpl = globalThis.fetch) {
  const current = await loadCloudEvent(roomRef, fetchImpl);
  const next = {
    ...current,
    updatedAt: new Date().toISOString(),
    responses: {
      ...(current?.responses || {}),
      [participantId]: participantResponse,
    },
  };
  await replaceCloudEvent(roomRef, next, fetchImpl);
  return next;
}

async function saveEventSettingsCloud(roomRef, patch, fetchImpl = globalThis.fetch) {
  const allowed = {};
  for (const key of ['title', 'description', 'durationMinutes', 'timeZone', 'dates', 'startMinute', 'endMinute', 'slotMinutes']) {
    if (Object.prototype.hasOwnProperty.call(patch, key)) allowed[key] = patch[key];
  }
  const current = await loadCloudEvent(roomRef, fetchImpl);
  const next = { ...current, ...allowed, updatedAt: new Date().toISOString() };
  await replaceCloudEvent(roomRef, next, fetchImpl);
  return next;
}

function makeLocalRoomId() {
  return `local-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
}

function saveLocalEvent(localId, event, store = globalThis.localStorage) {
  store.setItem(`whenwemeet:event:${localId}`, JSON.stringify(event));
}

function loadLocalEvent(localId, store = globalThis.localStorage) {
  const raw = store.getItem(`whenwemeet:event:${localId}`);
  return raw ? JSON.parse(raw) : null;
}

function participantStorageKey(roomKey) {
  return `whenwemeet:participant:${roomKey}`;
}

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const els = {
  createView: $('#create-view'),
  roomView: $('#room-view'),
  createForm: $('#create-form'),
  createErrors: $('#create-errors'),
  title: $('#event-title'),
  description: $('#event-description'),
  dateStart: $('#date-start'),
  dateEnd: $('#date-end'),
  weekdaysOnly: $('#weekdays-only'),
  selectedDates: $('#selected-dates'),
  startTime: $('#start-time'),
  endTime: $('#end-time'),
  duration: $('#meeting-duration'),
  slotSize: $('#slot-size'),
  timeZone: $('#time-zone'),
  createButton: $('#create-event-button'),
  newEventButton: $('#new-event-button'),
  roomTitle: $('#room-title'),
  roomDescription: $('#room-description'),
  roomDateSummary: $('#room-date-summary'),
  roomDuration: $('#room-duration'),
  roomTimezone: $('#room-timezone'),
  syncDot: $('#sync-dot'),
  syncLabel: $('#sync-label'),
  timezoneWarning: $('#timezone-warning'),
  storageWarning: $('#storage-warning'),
  shareButton: $('#share-button'),
  refreshButton: $('#refresh-button'),
  joinCard: $('#join-card'),
  joinForm: $('#join-form'),
  participantName: $('#participant-name'),
  availabilityPane: $('#availability-pane'),
  resultsPane: $('#results-pane'),
  availabilityGrid: $('#availability-grid'),
  resultsGrid: $('#results-grid'),
  saveState: $('#save-state'),
  coverageLabel: $('#coverage-label'),
  saveButton: $('#save-button'),
  bestTimes: $('#best-times'),
  responseCount: $('#response-count'),
  participantList: $('#participant-list'),
  slotDetail: $('#slot-detail'),
  toast: $('#toast'),
};

const state = {
  selectedDates: new Set(),
  roomRef: '',
  event: null,
  participantId: '',
  participantName: '',
  draftSlots: {},
  brush: 2,
  mode: 'availability',
  dirty: false,
  saveTimer: null,
  pollTimer: null,
  toastTimer: null,
  paintActive: false,
  activePointerId: null,
  paintState: 2,
  selectedResultKey: '',
};

function isoTodayLocal() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(iso, count) {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + count);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDate(iso, options = { weekday: 'short', month: 'short', day: 'numeric' }) {
  return new Intl.DateTimeFormat(undefined, { ...options, timeZone: 'UTC' }).format(new Date(`${iso}T12:00:00Z`));
}

function formatDuration(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const hours = minutes / 60;
  return Number.isInteger(hours) ? `${hours} hr` : `${hours} hrs`;
}

function initials(name) {
  return String(name || '?').trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '?';
}

function setBusy(button, busy, label = 'Working…') {
  if (!button) return;
  if (busy) {
    button.dataset.originalText = button.textContent;
    button.textContent = label;
    button.disabled = true;
  } else {
    button.textContent = button.dataset.originalText || button.textContent;
    button.disabled = false;
  }
}

function toast(message) {
  clearTimeout(state.toastTimer);
  els.toast.textContent = message;
  els.toast.classList.add('show');
  state.toastTimer = setTimeout(() => els.toast.classList.remove('show'), 2600);
}

function setupTimeSelects() {
  for (let minute = 0; minute < 1440; minute += 15) {
    const option = document.createElement('option');
    option.value = String(minute);
    option.textContent = formatMinutes(minute);
    els.startTime.append(option);
  }
  for (let minute = 15; minute <= 1440; minute += 15) {
    const option = document.createElement('option');
    option.value = String(minute);
    option.textContent = minute === 1440 ? '12:00 AM (next day)' : formatMinutes(minute);
    els.endTime.append(option);
  }
  els.startTime.value = '540';
  els.endTime.value = '1020';
}

function setupTimeZones() {
  const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';
  let zones = [];
  try {
    zones = Intl.supportedValuesOf('timeZone');
  } catch {
    zones = ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'UTC', 'Europe/London', 'Europe/Berlin', 'Asia/Tokyo'];
  }
  if (!zones.includes(browserZone)) zones.unshift(browserZone);
  for (const zone of zones) {
    const option = document.createElement('option');
    option.value = zone;
    option.textContent = zone.replaceAll('_', ' ');
    els.timeZone.append(option);
  }
  els.timeZone.value = browserZone;
}

function isWeekend(iso) {
  const day = new Date(`${iso}T12:00:00Z`).getUTCDay();
  return day === 0 || day === 6;
}

function resetSelectedDatesFromRange() {
  const dates = createDateRange(els.dateStart.value, els.dateEnd.value);
  state.selectedDates = new Set(dates.filter((date) => !els.weekdaysOnly.checked || !isWeekend(date)));
  renderDateChips(dates);
}

function renderDateChips(dates = createDateRange(els.dateStart.value, els.dateEnd.value)) {
  els.selectedDates.replaceChildren();
  if (dates.length > 31) {
    const msg = document.createElement('span');
    msg.className = 'field-help';
    msg.textContent = 'Keep the date range to 31 days or fewer.';
    els.selectedDates.append(msg);
    return;
  }
  for (const date of dates) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `date-chip${state.selectedDates.has(date) ? ' selected' : ''}`;
    button.textContent = formatDate(date, { weekday: 'short', month: 'short', day: 'numeric' });
    button.setAttribute('aria-pressed', state.selectedDates.has(date) ? 'true' : 'false');
    button.addEventListener('click', () => {
      if (state.selectedDates.has(date)) state.selectedDates.delete(date);
      else state.selectedDates.add(date);
      renderDateChips(dates);
    });
    els.selectedDates.append(button);
  }
}

function showCreateView() {
  clearInterval(state.pollTimer);
  state.pollTimer = null;
  state.roomRef = '';
  state.event = null;
  state.participantId = '';
  state.participantName = '';
  state.draftSlots = {};
  state.dirty = false;
  els.createView.hidden = false;
  els.roomView.hidden = true;
  els.newEventButton.hidden = true;
  document.title = 'WhenWeMeet | Find a time without the group-chat spiral';
}

function showRoomView() {
  els.createView.hidden = true;
  els.roomView.hidden = false;
  els.newEventButton.hidden = false;
}

function createDraftFromForm() {
  const dates = [...state.selectedDates].sort();
  const startMinute = Number(els.startTime.value);
  const endMinute = Number(els.endTime.value);
  const slotMinutes = Number(els.slotSize.value);
  return {
    version: 1,
    title: els.title.value.trim(),
    description: els.description.value.trim(),
    dates,
    startMinute,
    endMinute,
    slotMinutes,
    durationMinutes: clampMeetingDuration(Number(els.duration.value), slotMinutes, Math.max(slotMinutes, endMinute - startMinute)),
    timeZone: els.timeZone.value,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    responses: {},
  };
}

function showCreateErrors(errors) {
  if (!errors.length) {
    els.createErrors.hidden = true;
    els.createErrors.textContent = '';
    return;
  }
  els.createErrors.hidden = false;
  els.createErrors.textContent = errors.join(' ');
}

