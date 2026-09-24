const SHARED_API_BASE = 'https://superjsonblob.com/api/jsonBlob';
const LEGACY_API_BASE = 'https://jsonblob.com/api/jsonBlob';

function sharedCloudUrl(roomRef) {
  const ref = String(roomRef || '');
  if (ref.startsWith('sjb:')) {
    return `${SHARED_API_BASE}/${encodeURIComponent(ref.slice('sjb:'.length))}`;
  }
  return `${LEGACY_API_BASE}/${encodeURIComponent(ref)}`;
}

async function createCloudEvent(event, fetchImpl = globalThis.fetch) {
  const response = ensureOk(await fetchImpl(SHARED_API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(event),
  }), 'Creating room');
  const ref = roomRefFromUri(response.headers?.get?.('Location') || response.headers?.get?.('location'));
  if (!ref) throw new Error('Storage service did not return a usable room URL.');
  return `sjb:${ref}`;
}

async function loadCloudEvent(roomRef, fetchImpl = globalThis.fetch) {
  const response = ensureOk(await fetchImpl(sharedCloudUrl(roomRef), {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  }), 'Loading room');
  return response.json();
}

async function replaceCloudEvent(roomRef, event, fetchImpl = globalThis.fetch) {
  const response = ensureOk(await fetchImpl(sharedCloudUrl(roomRef), {
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

async function handleCreate(event) {
  event.preventDefault();
  const draft = createDraftFromForm();
  const errors = validateEventDraft(draft);
  const rangeSize = createDateRange(els.dateStart.value, els.dateEnd.value).length;
  if (rangeSize > 31) errors.push('The date range can be at most 31 days.');
  showCreateErrors(errors);
  if (errors.length) return;

  setBusy(els.createButton, true, 'Creating shared room…');
  try {
    const ref = await createCloudEvent(draft);
    localStorage.setItem(`whenwemeet:created:${ref}`, '1');
    location.hash = roomHash(ref);
    await routeFromHash();
    toast('Shared room created. This link works on other devices.');
  } catch (error) {
    console.error('Shared room creation failed.', error);
    showCreateErrors(['Could not create a shared room. Check your connection and try again. No device-only room was created.']);
  } finally {
    setBusy(els.createButton, false);
  }
}

function roomIsLocal() {
  return state.roomRef.startsWith('local:');
}

async function fetchRoom(ref) {
  if (ref.startsWith('local:')) return loadLocalEvent(ref.slice('local:'.length));
  return loadCloudEvent(ref);
}

function restoreParticipantIdentity() {
  state.participantId = '';
  state.participantName = '';
  state.draftSlots = {};
  const raw = localStorage.getItem(participantStorageKey(state.roomRef));
  if (!raw) return;
  try {
    const identity = JSON.parse(raw);
    if (!identity?.id || !identity?.name) return;
    state.participantId = identity.id;
    state.participantName = identity.name;
    state.draftSlots = { ...(state.event?.responses?.[identity.id]?.slots || {}) };
  } catch {
    localStorage.removeItem(participantStorageKey(state.roomRef));
  }
}

async function loadRoom(ref = state.roomRef, { preserveDraft = false, manual = false } = {}) {
  try {
    const event = await fetchRoom(ref);
    if (!event || !Array.isArray(event.dates)) throw new Error('Room data is missing or invalid.');
    state.roomRef = ref;
    state.event = event;
    if (!preserveDraft || !state.participantId) restoreParticipantIdentity();
    renderRoom();
    if (manual) toast('Room refreshed.');
    return true;
  } catch (error) {
    console.error(error);
    if (manual) toast('Could not refresh this room.');
    else {
      showCreateView();
      showCreateErrors(['That room could not be loaded. The link may be invalid or the storage service may be unavailable.']);
    }
    return false;
  }
}

async function routeFromHash() {
  const ref = roomRefFromHash(location.hash);
  if (!ref) {
    showCreateView();
    return;
  }
  showRoomView();
  state.roomRef = ref;
  const loaded = await loadRoom(ref);
  if (!loaded) return;
  clearInterval(state.pollTimer);
  if (!roomIsLocal()) {
    state.pollTimer = setInterval(async () => {
      if (document.hidden || state.dirty) return;
      await loadRoom(state.roomRef, { preserveDraft: true });
    }, 12000);
  }
}

function summarizeDates(dates) {
  if (!dates?.length) return 'No dates';
  if (dates.length === 1) return formatDate(dates[0]);
  return `${formatDate(dates[0])} to ${formatDate(dates.at(-1))} · ${dates.length} dates`;
}

function renderRoom() {
  const event = state.event;
  document.title = `${event.title} | WhenWeMeet`;
  els.roomTitle.textContent = event.title || 'Untitled event';
  els.roomDescription.textContent = event.description || '';
  els.roomDescription.hidden = !event.description;
  els.roomDateSummary.textContent = summarizeDates(event.dates);
  els.roomDuration.textContent = `${formatDuration(event.durationMinutes)} meeting`;
  els.roomTimezone.textContent = event.timeZone;

  const local = roomIsLocal();
  els.syncDot.classList.toggle('local', local);
  els.syncLabel.textContent = local ? 'Local fallback' : 'Synced room';
  els.shareButton.disabled = local;
  els.shareButton.title = local ? 'This fallback room cannot sync across devices.' : 'Copy or share this room link.';
  els.storageWarning.hidden = !local;
  if (local) els.storageWarning.textContent = 'Cloud storage could not be reached when this room was created. Changes are saved only in this browser, so this link will not work on another device.';

  const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  els.timezoneWarning.hidden = !browserZone || browserZone === event.timeZone;
  if (!els.timezoneWarning.hidden) {
    els.timezoneWarning.textContent = `Times are shown in the event time zone: ${event.timeZone}. Your device is set to ${browserZone}.`;
  }

  els.joinCard.hidden = Boolean(state.participantId);
  renderAvailabilityGrid();
  renderResultsGrid();
  renderInsights();
  setMode(state.mode);
  updateSaveState();
}

function buildGridBase(grid) {
  grid.replaceChildren();
  const event = state.event;
  grid.style.setProperty('--days', String(event.dates.length));
  const corner = document.createElement('div');
  corner.className = 'grid-corner';
  grid.append(corner);
  for (const date of event.dates) {
    const head = document.createElement('div');
    head.className = 'date-head';
    const strong = document.createElement('strong');
    strong.textContent = formatDate(date, { weekday: 'short' });
    const small = document.createElement('span');
    small.textContent = formatDate(date, { month: 'short', day: 'numeric' });
    head.append(strong, small);
    grid.append(head);
  }
}

function setCellVisual(cell, value) {
  cell.classList.remove('state-yes', 'state-maybe', 'state-no');
  if (value === 2) cell.classList.add('state-yes');
  else if (value === 1) cell.classList.add('state-maybe');
  else cell.classList.add('state-no');
  cell.dataset.state = String(value || 0);
}

function renderAvailabilityGrid() {
  const event = state.event;
  const grid = els.availabilityGrid;
  buildGridBase(grid);
  const disabled = !state.participantId;

  for (let minute = event.startMinute; minute < event.endMinute; minute += event.slotMinutes) {
    const time = document.createElement('div');
    time.className = 'time-head';
    time.textContent = formatMinutes(minute);
    grid.append(time);

    for (const date of event.dates) {
      const key = `${date}|${minute}`;
      const value = Number(state.draftSlots[key] || 0);
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'slot-cell';
      cell.dataset.key = key;
      cell.dataset.date = date;
      cell.dataset.minute = String(minute);
      cell.disabled = disabled;
      setCellVisual(cell, value);
      cell.setAttribute('aria-label', `${formatDate(date)}, ${formatMinutes(minute)}: ${value === 2 ? 'available' : value === 1 ? 'if needed' : 'unavailable'}`);
      cell.addEventListener('pointerdown', handleCellPointerDown);
      cell.addEventListener('pointerenter', (pointerEvent) => {
        if (state.paintActive && pointerEvent.pointerType === 'mouse') paintCell(cell, state.paintState);
      });
      cell.addEventListener('click', (clickEvent) => {
        if (clickEvent.detail !== 0 || !state.participantId) return;
        const next = Number(cell.dataset.state) === state.brush && state.brush !== 0 ? 0 : state.brush;
        paintCell(cell, next);
        finishPaint();
      });
      grid.append(cell);
    }
  }
  updateCoverage();
}

function handleCellPointerDown(event) {
  if (!state.participantId || event.button > 0) return;
  event.preventDefault();
  const cell = event.currentTarget;
  const current = Number(cell.dataset.state || 0);
  state.paintActive = true;
  state.activePointerId = event.pointerId;
  state.paintState = state.brush === 0 ? 0 : (current === state.brush ? 0 : state.brush);
  try { cell.setPointerCapture(event.pointerId); } catch { /* Pointer capture is optional. */ }
  paintCell(cell, state.paintState);
}

function paintCell(cell, value) {
  if (!cell || !cell.dataset.key || cell.disabled) return;
  const key = cell.dataset.key;
  if (value > 0) state.draftSlots[key] = value;
  else delete state.draftSlots[key];
  setCellVisual(cell, value);
  state.dirty = true;
  updateCoverage();
  updateSaveState();
}

function handleGridPointerMove(event) {
  if (!state.paintActive || event.pointerId !== state.activePointerId) return;
  const target = document.elementFromPoint(event.clientX, event.clientY)?.closest?.('.slot-cell');
  if (target && els.availabilityGrid.contains(target)) paintCell(target, state.paintState);
}

function finishPaint() {
  if (!state.paintActive && !state.dirty) return;
  state.paintActive = false;
  state.activePointerId = null;
  if (state.dirty) scheduleSave();
}
