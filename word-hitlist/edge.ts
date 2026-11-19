const siteOrigin = 'https://redslovesgames.github.io';
const url = Deno.env.get('SUPABASE_URL');
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const cors = {
  'Access-Control-Allow-Origin': siteOrigin,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Max-Age': '600',
  'Cache-Control': 'no-store',
};
const actions = new Set(['create', 'join', 'state', 'start', 'next', 'rematch', 'submit', 'leave']);
const json = (result: unknown, status = 200) => Response.json(result, { status, headers: cors });

Deno.serve(async request => {
  if (request.headers.has('origin') && request.headers.get('origin') !== siteOrigin) {
    return json({ error: 'Open the game on Random Info Pages.' }, 403);
  }
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (request.method !== 'POST') return json({ error: 'Use POST.' }, 405);
  if (!url || !serviceKey) return json({ error: 'Game service is temporarily unavailable.' }, 503);
  if (Number(request.headers.get('content-length')) > 2048) return json({ error: 'Request is too large.' }, 413);

  try {
    const raw = await request.text();
    if (raw.length > 2048) return json({ error: 'Request is too large.' }, 413);
    let body;
    try { body = JSON.parse(raw); } catch { return json({ error: 'Invalid game request.' }, 400); }
    if (!body || !actions.has(body.action)) return json({ error: 'Invalid game request.' }, 400);
    const response = await fetch(`${url}/rest/v1/rpc/word_hitlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({ p_action: body.action, p_payload: body }),
    });
    if (!response.ok) {
      console.error('Word Hitlist database response', response.status);
      return json({ error: 'Game service is temporarily unavailable.' }, 503);
    }
    return json(await response.json());
  } catch (error) {
    console.error('Word Hitlist request failure', error instanceof Error ? error.name : 'unknown');
    return json({ error: 'Game service is temporarily unavailable.' }, 503);
  }
});
