(() => {
  const SUPABASE_URL = 'https://bpudsyyepiminpdxlquz.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_Hnbwm_iTFUzUCZ4qhpaBwg_tenP3pdp';
  const headers = () => ({ apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, Accept: 'application/json', 'Content-Type': 'application/json' });
  const idFromRef = (ref) => String(ref || '').replace(/^sb:/, '');
  const randomId = () => {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  };
  const rpc = async (name, body, action, fetchImpl = globalThis.fetch) => {
    const response = await fetchImpl(`${SUPABASE_URL}/rest/v1/rpc/${name}`, { method: 'POST', headers: headers(), body: JSON.stringify(body), cache: 'no-store' });
    if (!response.ok) {
      let detail = '';
      try { detail = (await response.json())?.message || ''; } catch { /* no body */ }
      throw new Error(`${action} failed (${response.status})${detail ? `: ${detail}` : ''}`);
    }
    return response.json();
  };

  createCloudEvent = async function createSupabaseRoom(event, fetchImpl = globalThis.fetch) {
    const id = randomId();
    await rpc('whenwemeet_create_room', { p_id: id, p_payload: event }, 'Creating room', fetchImpl);
    return `sb:${id}`;
  };

  loadCloudEvent = async function loadSupabaseRoom(roomRef, fetchImpl = globalThis.fetch) {
    if (!String(roomRef).startsWith('sb:')) {
      const response = await fetchImpl(sharedCloudUrl(roomRef), { headers: { Accept: 'application/json' }, cache: 'no-store' });
      if (!response.ok) throw new Error(`Loading legacy room failed (${response.status})`);
      return response.json();
    }
    const payload = await rpc('whenwemeet_load_room', { p_id: idFromRef(roomRef) }, 'Loading room', fetchImpl);
    if (!payload) throw new Error('Room not found.');
    return payload;
  };

  replaceCloudEvent = async function replaceSupabaseRoom(roomRef, event, fetchImpl = globalThis.fetch) {
    if (!String(roomRef).startsWith('sb:')) {
      const response = await fetchImpl(sharedCloudUrl(roomRef), { method: 'PUT', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(event) });
      if (!response.ok) throw new Error(`Saving legacy room failed (${response.status})`);
      try { return await response.json(); } catch { return event; }
    }
    const payload = await rpc('whenwemeet_replace_room', { p_id: idFromRef(roomRef), p_payload: event }, 'Saving room', fetchImpl);
    if (!payload) throw new Error('Room not found while saving.');
    return payload;
  };

  saveParticipantCloud = async function saveSupabaseParticipant(roomRef, participantId, participantResponse, fetchImpl = globalThis.fetch) {
    if (!String(roomRef).startsWith('sb:')) {
      const current = await loadCloudEvent(roomRef, fetchImpl);
      const next = { ...current, updatedAt: new Date().toISOString(), responses: { ...(current.responses || {}), [participantId]: participantResponse } };
      await replaceCloudEvent(roomRef, next, fetchImpl);
      return next;
    }
    const payload = await rpc('whenwemeet_save_participant', { p_id: idFromRef(roomRef), p_participant_id: participantId, p_response: participantResponse }, 'Saving availability', fetchImpl);
    if (!payload) throw new Error('Room not found while saving.');
    return payload;
  };

  window.WhenWeMeetStorage = { provider: 'supabase', project: 'bpudsyyepiminpdxlquz' };
})();
