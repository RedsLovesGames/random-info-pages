# Rank Riot: Alex & Doron Edition

A browser-based, synchronized, original Kahoot-style party game. Players join a six-digit lobby PIN, choose one of six authors, and vote for their top three *other* answers. Writers receive 3 / 2 / 1 points, and the leaderboard ranks authors by average points per answered question. One host advances the game from question to reveal to leaderboard. The app supports Alex (25 rounds), Doron (25 rounds), or both (50 rounds).

**Status:** Source code and local backend tests are complete. A Google Apps Script Web App deployment and actual Google Form response tabs are required before remote multiplayer can be used. No form submissions were invented.

## Sheet source

The backend is preconfigured to read the user's existing **Alex + Doron Form Responses** workbook:

`https://docs.google.com/spreadsheets/d/1ZIs8vwnnIAy-rEU8QsGXRBSZ7BoudigjYU9v00-d5iY/edit`

On inspection on October 29, 2026, it contained **only** the submission tracker (Tommy, Mike, Jack, Ethan, Rita, Nora) with both forms marked incomplete. It did **not** contain response tabs or actual answers. The original 25-question Google Forms Builder document supplies all prompt text (`Code.gs` embeds these exact 25 prompts).

To populate the workbook: for each Google Form, go to **Responses > Link to Sheets > Select existing spreadsheet**, then choose that workbook. Make sure actual submissions exist. The script detects form response tabs by 20+ exact question headers, so tab names do not need to be `Alex` or `Doron`. If the original forms already write to a different responses spreadsheet, either link their responses into this source workbook or change `RR_SHEET_ID` to the spreadsheet containing both tabs. A separate source per form would require extending `rrSheetData_`.

**Important:** the original form builder did **not** include a Name question. The host must map each response row to an author on the game's setup screen. A submission timestamp/email is shown to identify the row, but only its author assignment is sent to players after voting.

## One-time setup (Apps Script)

1. Open [Google Apps Script](https://script.google.com/) with access to the Google Sheets workbook. Create a **new project** named `Rank Riot Server`.
2. Replace `Code.gs` with the entire contents of [`Code.gs`](./Code.gs). No API keys or service-account credentials are necessary.
3. Select the function **`installRankRiot`** in the toolbar and click **Run**. Approve Google Sheets and Apps Script permissions. Open **Execution log** and copy the randomly generated **12-character host passphrase**. Do not share it with players.
4. Click **Deploy > New deployment > Web app**. Use **Execute as: Me** and **Who has access: Anyone**. Deploy and copy the URL ending in `/exec`. If prompted, authorize the deployment. This means people with a valid room PIN can join without Google login, while Sheets themselves remain private.
5. Visit [Rank Riot](https://redslovesgames.github.io/random-info-pages/friends/ranked/). Click **Host a Game**, paste the `/exec` URL and host passphrase, then **Connect & inspect sheets**.
6. Once the response tabs are available, assign each response row to Tommy, Mike, Jack, Ethan, Rita, or Nora and **Save** each game's mappings. Choose Alex, Doron, or both and create a room.
7. **Copy join link** from the lobby and send it to players. Their join URL carries the backend address and room PIN, so they do not need to configure anything. The host should use one screen for presentation and each player should use their own device to vote. The host can also join as a player from a separate device.

To update the backend code, deploy a **new version** under **Deploy > Manage deployments > Edit > Version: New version**. An Apps Script `/dev` test URL works only for script editors and must not be sent to your friends.

## How it plays

- 6-digit PIN, live player lobby, timed rounds (15 to 120 seconds), anonymous answer cards.
- Players may choose **exactly three distinct answers** in ranked order (1st = 3 points, 2nd = 2, 3rd = 1). They cannot vote for their own answer; the server validates this.
- Once a player locks in, the vote cannot be edited. Votes from missing/invalid players are rejected server-side.
- After voting closes or the host reveals early, answer authors and per-rank vote totals appear on the projector and players' phones.
- Writers' cumulative **average points per response** determines the standings, with first-place counts and total points as tiebreakers.
- For the 50-question mode, the final screen includes the combined champion plus Alex/Doron-specific champions.
- If a question has fewer than four mapped, nonempty responses, it is skipped without awarding points. Missing response tabs prevent starting entirely.

## Engineering notes and limitations

- GitHub Pages serves the static front end. The server uses Google Apps Script `ContentService` JSONP to support cross-domain requests from Pages without publishing spreadsheet contents or requiring a Supabase project.
- Google Script Properties persist a small state record for each PIN. Google Script Lock makes joins, votes, scoring and phase transitions atomic. A 15-second server cache reduces repeated Sheets reads.
- This is designed for **one private group of six**. It is not meant for untrusted public competitions: nicknames are self-selected; a malicious person who steals a participant token can impersonate them. The host passphrase and player tokens are sent to Google's Web App URL as HTTPS query arguments because JSONP is required for static hosting. Do not reuse your Google password as the passphrase. HTTPS protects transport, but Apps Script query URLs can be logged by the server.
- No real-time connection occurs until Apps Script is deployed; browser polling updates approximately every 1.85 seconds. Google Apps Script quotas/latency may restrict very long or large games. Response edits may take up to 15 seconds to appear; refresh mapping in host setup as needed.
- Host passphrase lives in **sessionStorage**, player reconnect tokens and server URL in **localStorage**. Use a private/shared-device browser session responsibly.
- This game intentionally has original branding, colors and interface; it does not copy Kahoot trademarks or assets.

## Verify locally

From this folder (Node.js 18+):

```sh
node --check app.js
node --test rank-riot.test.cjs
```

The tests mock Apps Script services and verify prompts, sheet synchronization, valid author mapping, host access control, anonymous question views, no self-votes, 3/2/1 scoring, server-side timeouts, and callback validation. A real multi-device test still requires the Google Apps Script deployment.