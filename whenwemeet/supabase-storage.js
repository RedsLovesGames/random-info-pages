(() => {
  const SUPABASE_URL = 'https://bpudsyyepiminpdxlquz.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_Hnbwm_iTFUzUCZ4qhpaBwg_tenP3pdp';
  const TABLE_URL = `${SUPABASE_URL}/rest/v1/whenwemeet_rooms`;
  const headers = (extra = {}) => ({ apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, Accept: 'application/json', 'Content-Type': 'application/json', ...extra });
  const idFromRef = (ref) => String(ref || '').replace(/^sb:/, '');
  const randomId = () => {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  };
  const checked = async (response, action) => {
    if (response.ok) return response;
    let detail = '';
    try { detail = (await response.json())?.message || ''; } catch { /* no body */ }
    throw new Error(`${action} failed (${response.status})${detail ? `: ${detail}` : ''}`);
  };

  createCloudEvent = async function createSupabaseRoom(event, fetchImpl = globalThis.fetch) {
    const id = randomId();
    await checked(await fetchImpl(`${SUPABASE_URL}/rest/v1/rpc/whenwemeet_create_room`, {
      method: 'POST', headers: headers(), body: JSON.stringify({ p_id: id, p_payload: event }),
    }), 'Creating room');
    return `sb:${id}`;
  };

  loadCloudEvent = async function loadSupabaseRoom(roomRef, fetchImpl = globalThis.fetch) {
    if (!String(roomRef).startsWith('sb:')) {
      const response = await checked(await fetchImpl(sharedCloudUrl(roomRef), { headers: { Accept: 'application/json' }, cache: 'no-store' }), 'Loading legacy room');
      return response.json();
    }
    const id = idFromRef(roomRef);
    const response = await checked(await fetchImpl(`${TABLE_URL}?id=eq.${encodeURIComponent(id)}&select=payload`, { headers: headers(), cache: 'no-store' }), 'Loading room');
    const rows = await response.json();
    if (!rows?.[0]?.payload) throw new Error('Room not found.');
    return rows[0].payload;
  };

  replaceCloudEvent = async function replaceSupabaseRoom(roomRef, event, fetchImpl = globalThis.fetch) {
    if (!String(roomRef).startsWith('sb:')) {
      const response = await checked(await fetchImpl(sharedCloudUrl(roomRef), { method: 'PUT', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(event) }), 'Saving legacy room');
      try { return await response.json(); } catch { return null; }
    }
    const id = idFromRef(roomRef);
    await checked(await fetchImpl(`${TABLE_URL}?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH', headers: headers({ Prefer: 'return=minimal' }), body: JSON.stringify({ payload: event, updated_at: new Date().toISOString() }),
    }), 'Saving room');
    return event;
  };

  saveParticipantCloud = async function saveSupabaseParticipant(roomRef, participantId, participantResponse, fetchImpl = globalThis.fetch) {
    if (!String(roomRef).startsWith('sb:')) {
      const current = await loadCloudEvent(roomRef, fetchImpl);
      const next = { ...current, updatedAt: new Date().toISOString(), responses: { ...(current.responses || {}), [participantId]: participantResponse } };
      await replaceCloudEvent(roomRef, next, fetchImpl);
      return next;
    }
    const response = await checked(await fetchImpl(`${SUPABASE_URL}/rest/v1/rpc/whenwemeet_save_participant`, {
      method: 'POST', headers: headers(), body: JSON.stringify({ p_id: idFromRef(roomRef), p_participant_id: participantId, p_response: participantResponse }),
    }), 'Saving availability');
    const payload = await response.json();
    if (!payload) throw new Error('Room not found while saving.');
    return payload;
  };

  window.WhenWeMeetStorage = { provider: 'supabase', project: 'bpudsyyepiminpdxlquz' };
})();
