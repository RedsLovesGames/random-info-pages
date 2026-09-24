(() => {
  const keyForName = (name) => `name:${String(name || '').trim().toLocaleLowerCase()}`;

  // A room no longer remembers a browser/device identity. Opening the link asks for a name.
  restoreParticipantIdentity = function restoreNameIdentity() {
    state.participantId = '';
    state.participantName = '';
    state.draftSlots = {};
    try { localStorage.removeItem(participantStorageKey(state.roomRef)); } catch { /* storage is optional */ }
  };

  const oldForm = els.joinForm;
  if (!oldForm?.parentNode) return;
  const form = oldForm.cloneNode(true);
  oldForm.replaceWith(form);
  els.joinForm = form;
  els.participantName = form.querySelector('#participant-name');

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = els.participantName.value.trim();
    if (!name || !state.event) return;
    const id = keyForName(name);
    state.participantId = id;
    state.participantName = name;
    state.draftSlots = { ...(state.event.responses?.[id]?.slots || {}) };
    state.dirty = false;
    els.joinCard.hidden = true;
    renderAvailabilityGrid();
    renderResultsGrid();
    renderInsights();
    updateSaveState();
    toast(state.event.responses?.[id] ? `Editing ${name}'s availability.` : `Ready, ${name}. Paint the times that work for you.`);
  });

  els.participantName.addEventListener('input', () => els.participantName.setCustomValidity(''));

  // If the room finished loading before this patch, clear the old device-bound identity now.
  if (state.event) {
    restoreParticipantIdentity();
    els.joinCard.hidden = false;
    renderAvailabilityGrid();
    renderInsights();
    updateSaveState();
  }

  window.WhenWeMeetNameIdentity = { keyForName };
})();
