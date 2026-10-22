# Stock Fights

An independent, unofficial **browser simulation** inspired by Spenn's Stock Image Fights / Guy Fights videos. It is not Spenn's original executable and does not include his original cutout sprites, source code, animation keyframes, or proprietary balance data.

## Open

`/stock-fights/` from the Random Info Pages homepage. No account, server, API, npm build, or online dependencies are required for this game page.

## What works

- 43 documented fighter identities (including Henchmen Guys) and their individually reconstructed attack families
- 12 preset three-character teams or custom 3v3 lineups
- 1v1, team battle, 20-second Time Battle, 30 Henchmen Challenge and Endless Henchmen
- 1,000-HP starting fighters, autonomous bouncing actors, boundary collision, projectiles, status effects, reflects and counters, healing, summons, area effects, damage scaling and friendly-fire hazards
- Optional shrinking Box and hot walls
- Seeded deterministic pseudorandom engine; rematches with the same choices and seed reproduce the same result
- 0.5x through 8x playback, single stepping, pausing, fast-forward, combat log, HP bars, and locally saved win totals
- Shareable URL containing seed, mode, fighters and arena modifiers
- Portrait replacement: choose a fighter in the roster, click **Upload cutout**, select a local PNG/JPEG/WebP. The browser resizes it to at most 256px and stores the image in this browser's localStorage. No data is sent to a server.

## Limitations

Character moves are plausible rules-based approximations, not literal copies of the original closed-source simulation. Several mechanical details are simplified, particularly clone/summon hitboxes, wall collision timing, and the newest combat reworks. Non-canonical modes are deliberately omitted. The default visuals use emoji stand-ins because original cutouts were not redistributed. Upload the source photos for a much closer visual style, subject to whatever usage rights apply.

The engine runs with a fixed timestep at 60 ticks per simulated second. The seed controls pseudorandom rolls. The result is deterministic within the same engine version and matchup.

## Engineering

Files:
- `roster.mjs`: character and team data
- `engine.mjs`: browser-independent simulation, fixed tick and seeded RNG
- `app.js`: UI, canvas rendering and local browser data
- `styles.css`: responsive UI
- `tests/stock-fights.test.mjs`: Node built-in test suite (from the repository root)

Run:

```sh
node --test tests/stock-fights.test.mjs tests/home-index.test.mjs
node --check stock-fights/engine.mjs
node --check stock-fights/app.js
```

Sources: [Spenn channel](https://www.youtube.com/@Spenntf2), [community character wiki](https://spenn.fandom.com/wiki/Spenn_Wiki), [the Box reference](https://spenn.fandom.com/wiki/The_Box).
