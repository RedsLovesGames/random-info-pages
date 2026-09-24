function updateCoverage() {
  if (!state.event) return;
  const total = slotKeysForEvent(state.event).length;
  const yes = Object.values(state.draftSlots).filter((v) => Number(v) === 2).length;
  const maybe = Object.values(state.draftSlots).filter((v) => Number(v) === 1).length;
  els.coverageLabel.textContent = `${yes} available · ${maybe} if needed · ${Math.max(0, total - yes - maybe)} unavailable`;
}

function renderResultsGrid() {
  const event = state.event;
  const responses = event.responses || {};
  const total = Object.keys(responses).length;
  const grid = els.resultsGrid;
  buildGridBase(grid);

  for (let minute = event.startMinute; minute < event.endMinute; minute += event.slotMinutes) {
    const time = document.createElement('div');
    time.className = 'time-head';
    time.textContent = formatMinutes(minute);
    grid.append(time);
    for (const date of event.dates) {
      const key = `${date}|${minute}`;
      const summary = summarizeSlot(responses, key);
      const ratio = total ? (summary.yes + summary.maybe * 0.5) / total : 0;
      const heat = ratio <= 0 ? 0 : Math.max(1, Math.ceil(ratio * 4));
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = `slot-cell${state.selectedResultKey === key ? ' selected' : ''}`;
      cell.dataset.key = key;
      cell.dataset.heat = String(heat);
      cell.textContent = total ? `${summary.yes}/${total}` : '–';
      cell.setAttribute('aria-label', `${formatDate(date)}, ${formatMinutes(minute)}: ${summary.yes} available, ${summary.maybe} if needed, ${summary.no} unavailable`);
      cell.addEventListener('click', () => {
        state.selectedResultKey = key;
        renderResultsGrid();
        renderSlotDetail(key);
      });
      grid.append(cell);
    }
  }
  if (state.selectedResultKey) renderSlotDetail(state.selectedResultKey);
}

function renderSlotDetail(key) {
  const [date, minuteText] = key.split('|');
  const minute = Number(minuteText);
  const groups = { yes: [], maybe: [], no: [] };
  for (const response of Object.values(state.event.responses || {})) {
    const value = Number(response?.slots?.[key] || 0);
    if (value === 2) groups.yes.push(response.name);
    else if (value === 1) groups.maybe.push(response.name);
    else groups.no.push(response.name);
  }
  els.slotDetail.replaceChildren();
  const title = document.createElement('strong');
  title.textContent = `${formatDate(date)} · ${formatMinutes(minute)}`;
  const summary = document.createElement('span');
  summary.textContent = `${groups.yes.length} available, ${groups.maybe.length} if needed, ${groups.no.length} unavailable`;
  const list = document.createElement('div');
  list.className = 'slot-detail-groups';
  for (const [label, values] of [['Available', groups.yes], ['If needed', groups.maybe], ['Unavailable', groups.no]]) {
    const row = document.createElement('div');
    const b = document.createElement('b');
    b.textContent = label;
    row.append(b, document.createTextNode(values.length ? values.join(', ') : 'None'));
    list.append(row);
  }
  els.slotDetail.append(title, summary, list);
}

function renderInsights() {
  const responses = state.event.responses || {};
  const entries = Object.entries(responses);
  els.responseCount.textContent = `${entries.length} response${entries.length === 1 ? '' : 's'}`;

  els.bestTimes.replaceChildren();
  const ranked = rankBestWindows(state.event, responses, 4);
  if (!entries.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'Best meeting windows appear as soon as someone saves availability.';
    els.bestTimes.append(empty);
  } else {
    ranked.forEach((slot, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'best-time';
      const rank = document.createElement('span');
      rank.className = 'best-rank';
      rank.textContent = `#${index + 1}`;
      const main = document.createElement('span');
      main.className = 'best-main';
      const strong = document.createElement('strong');
      strong.textContent = `${formatDate(slot.date)} · ${formatMinutes(slot.minute)}`;
      const small = document.createElement('span');
      small.textContent = `${formatMinutes(slot.minute)} to ${slot.endMinute === 1440 ? '12:00 AM' : formatMinutes(slot.endMinute)}`;
      main.append(strong, small);
      const score = document.createElement('span');
      score.className = 'best-score';
      const yes = document.createElement('strong');
      yes.textContent = `${slot.yes}/${slot.total} yes`;
      const maybe = document.createElement('span');
      maybe.textContent = slot.maybe ? `+ ${slot.maybe} maybe` : `${slot.no} unavailable`;
      score.append(yes, maybe);
      button.append(rank, main, score);
      button.addEventListener('click', () => {
        state.selectedResultKey = slot.startKey;
        setMode('results');
        renderResultsGrid();
        renderSlotDetail(slot.startKey);
        requestAnimationFrame(() => els.resultsGrid.querySelector(`[data-key="${CSS.escape(slot.startKey)}"]`)?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' }));
      });
      els.bestTimes.append(button);
    });
  }

  els.participantList.replaceChildren();
  if (!entries.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'No responses yet. Share the room link to get started.';
    els.participantList.append(empty);
    return;
  }
  const totalSlots = Math.max(1, slotKeysForEvent(state.event).length);
  entries
    .sort(([, a], [, b]) => String(a.name).localeCompare(String(b.name)))
    .forEach(([id, response]) => {
      const row = document.createElement('div');
      row.className = 'participant-row';
      const avatar = document.createElement('div');
      avatar.className = 'avatar';
      avatar.textContent = initials(response.name);
      const label = document.createElement('div');
      const strong = document.createElement('strong');
      strong.textContent = `${response.name}${id === state.participantId ? ' (you)' : ''}`;
      const marked = Object.keys(response.slots || {}).length;
      const sub = document.createElement('span');
      sub.textContent = `${marked} flexible block${marked === 1 ? '' : 's'}`;
      label.append(strong, sub);
      const meter = document.createElement('div');
      meter.className = 'response-meter';
      const fill = document.createElement('i');
      fill.style.width = `${Math.min(100, marked / totalSlots * 100)}%`;
      meter.append(fill);
      row.append(avatar, label, meter);
      els.participantList.append(row);
    });
}

function setMode(mode) {
  state.mode = mode === 'results' ? 'results' : 'availability';
  const results = state.mode === 'results';
  els.availabilityPane.hidden = results;
  els.resultsPane.hidden = !results;
  $$('.mode-tab').forEach((button) => {
    const active = button.dataset.mode === state.mode;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', active ? 'true' : 'false');
  });
}

function updateSaveState() {
  if (!state.participantId) {
    els.saveState.textContent = 'Add your name to respond';
    els.saveState.className = 'save-state';
    els.saveButton.disabled = true;
    return;
  }
  els.saveButton.disabled = false;
  if (state.dirty) {
    els.saveState.textContent = 'Unsaved changes';
    els.saveState.className = 'save-state dirty';
  } else {
    const hasSaved = Boolean(state.event?.responses?.[state.participantId]);
    els.saveState.textContent = hasSaved ? 'Saved' : 'Ready to save';
    els.saveState.className = `save-state${hasSaved ? ' saved' : ''}`;
  }
}

function scheduleSave() {
  clearTimeout(state.saveTimer);
  state.saveTimer = setTimeout(() => saveAvailability({ quiet: true }), 700);
}

async function saveAvailability({ quiet = false } = {}) {
  clearTimeout(state.saveTimer);
  if (!state.participantId || !state.event) return;
  const response = {
    name: state.participantName,
    slots: { ...state.draftSlots },
    updatedAt: new Date().toISOString(),
  };
  els.saveState.textContent = 'Saving…';
  els.saveState.className = 'save-state';
  els.saveButton.disabled = true;
  try {
    if (roomIsLocal()) {
      state.event = mergeParticipantResponse(state.event, state.participantId, response);
      saveLocalEvent(state.roomRef.slice('local:'.length), state.event);
    } else {
      state.event = await saveParticipantCloud(state.roomRef, state.participantId, response);
    }
    state.dirty = false;
    renderResultsGrid();
    renderInsights();
    updateSaveState();
    if (!quiet) toast('Availability saved.');
  } catch (error) {
    console.error(error);
    els.saveState.textContent = 'Save failed';
    els.saveState.className = 'save-state dirty';
    state.dirty = true;
    if (!quiet) toast('Could not save. Your changes are still on this screen.');
  } finally {
    els.saveButton.disabled = false;
  }
}

function handleQuickAction(action) {
  if (!state.participantId) return;
  const event = state.event;
  if (action === 'clear') state.draftSlots = {};
  if (action === 'all') {
    state.draftSlots = {};
    for (const key of slotKeysForEvent(event)) state.draftSlots[key] = 2;
  }
  if (action === 'workday') {
    state.draftSlots = {};
    const start = Math.max(event.startMinute, 9 * 60);
    const end = Math.min(event.endMinute, 17 * 60);
    if (end > start) {
      for (const date of event.dates) state.draftSlots = applyRange(state.draftSlots, date, start, end, event.slotMinutes, 2);
    }
  }
  if (action === 'repeat' && event.dates.length > 1) {
    const source = event.dates[0];
    for (const destination of event.dates.slice(1)) state.draftSlots = copyDay(state.draftSlots, source, destination);
  }
  state.dirty = true;
  renderAvailabilityGrid();
  updateSaveState();
  scheduleSave();
}

function handleJoin(event) {
  event.preventDefault();
  const name = els.participantName.value.trim();
  if (!name) return;
  const duplicate = Object.entries(state.event.responses || {}).some(([id, response]) => id !== state.participantId && String(response.name).trim().toLowerCase() === name.toLowerCase());
  if (duplicate) {
    els.participantName.setCustomValidity('That name is already in this room. Add an initial or another identifier.');
    els.participantName.reportValidity();
    return;
  }
  els.participantName.setCustomValidity('');
  state.participantId = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  state.participantName = name;
  state.draftSlots = {};
  localStorage.setItem(participantStorageKey(state.roomRef), JSON.stringify({ id: state.participantId, name }));
  els.joinCard.hidden = true;
  renderAvailabilityGrid();
  updateSaveState();
  toast(`Ready, ${name}. Paint the times that work for you.`);
}

async function shareRoom() {
  if (roomIsLocal()) return;
  const url = location.href;
  const data = { title: state.event.title, text: `Add your availability for ${state.event.title}`, url };
  try {
    if (navigator.share && matchMedia('(pointer: coarse)').matches) {
      await navigator.share(data);
      return;
    }
    await navigator.clipboard.writeText(url);
    toast('Room link copied.');
  } catch (error) {
    if (error?.name === 'AbortError') return;
    window.prompt('Copy this room link:', url);
  }
}

function bindEvents() {
  els.createForm.addEventListener('submit', handleCreate);
  els.dateStart.addEventListener('change', resetSelectedDatesFromRange);
  els.dateEnd.addEventListener('change', resetSelectedDatesFromRange);
  els.weekdaysOnly.addEventListener('change', resetSelectedDatesFromRange);
  els.joinForm.addEventListener('submit', handleJoin);
  els.participantName.addEventListener('input', () => els.participantName.setCustomValidity(''));
  els.saveButton.addEventListener('click', () => saveAvailability());
  els.shareButton.addEventListener('click', shareRoom);
  els.refreshButton.addEventListener('click', () => loadRoom(state.roomRef, { preserveDraft: state.dirty, manual: true }));
  els.newEventButton.addEventListener('click', () => {
    history.pushState(null, '', location.pathname);
    showCreateView();
  });
  window.addEventListener('hashchange', routeFromHash);
  $$('.mode-tab').forEach((button) => button.addEventListener('click', () => setMode(button.dataset.mode)));
  $$('.brush').forEach((button) => button.addEventListener('click', () => {
    state.brush = Number(button.dataset.brush);
    $$('.brush').forEach((item) => item.classList.toggle('active', item === button));
  }));
  $$('[data-quick]').forEach((button) => button.addEventListener('click', () => handleQuickAction(button.dataset.quick)));
  els.availabilityGrid.addEventListener('pointermove', handleGridPointerMove);
  document.addEventListener('pointerup', finishPaint);
  document.addEventListener('pointercancel', finishPaint);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && state.roomRef && !state.dirty && !roomIsLocal()) loadRoom(state.roomRef, { preserveDraft: true });
  });
}

function initCreateDefaults() {
  const today = isoTodayLocal();
  els.dateStart.value = today;
  els.dateEnd.value = addDays(today, 6);
  resetSelectedDatesFromRange();
}

setupTimeSelects();
setupTimeZones();
initCreateDefaults();
bindEvents();
routeFromHash();
