# Rank Riot: Supabase multiplayer edition

This version needs **no Google Apps Script setup**, no server URL field and no sheet sharing.

- Public players join via the site's URL and a six-digit PIN.
- Host uses the private access key once per browser (never commit the key to GitHub).
- Two Excel exports from the original Google Forms were imported as a static snapshot: 25 questions x 6 answers for both Alex and Doron.
- The Supabase Edge Function owns the game state and uses row-level database locks for room operations.
- Room data is in the database; no answer text is embedded in the publicly readable website.
- No self-voting. Each participant may vote once per question with an ordered top three. Authors receive 3 / 2 / 1 points.
- Rooms are synchronized by HTTP polling approximately every 1.85 seconds, not websocket push.

## Hosting

- Public page: https://redslovesgames.github.io/random-info-pages/friends/ranked/
- Backend: Supabase Edge Function `rank-riot` in existing project `bpudsyyepiminpdxlquz`.
- Database tables `rankriot_questions`, `rankriot_answers`, `rankriot_config`, `rankriot_rooms`. Tables are protected with RLS and explicit REVOKE for public/anon/authenticated.
- The public Edge Function accepts POST actions `ping`, `setup`, `create`, `join`, `vote`, `advance`, `state`. Access to `setup`, `create` and `advance` requires a private host key.

## Data updates

The workbook exports were imported on deployment. Later edits in the original Google Sheets are **not automatically synced**. Import a new batch into Supabase to refresh the source.

## Design limitations

Players select their response author name; there is no full account authentication, so someone who joins first under another name can reserve it. Share PINs privately.
The host key is stored in localStorage on the host's device and should not be used on public computers.