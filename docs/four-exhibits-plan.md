# Four interactive exhibits — implementation plan

**Goal:** Deliver four complete static applications, a tested repository-root ZIP overlay, and publish the finished integration to GitHub Pages.

**Architecture:** Four independent, buildless HTML/CSS/ES-module apps. Pure engines expose deterministic data to Canvas/SVG/DOM views. Native Web Audio and Web Crypto provide local audio and modern cryptography. No runtime dependencies, CDNs, or backend.

**Spec:** `docs/four-exhibits-requirements.md` (the supplied master task).

## Constraints

- Preserve every existing application, homepage IDs, search behavior and Pages workflow.
- Use relative assets under the `/random-info-pages/` project prefix.
- Keep controls usable on phones, touch and keyboard; respect reduced motion.
- Tests must exercise actual calculations and browser APIs, not just source patterns.
- Publish through the repository's existing GitHub Pages workflow after local verification.

## Inspection

The initial workspace was empty. Cloned RedsLovesGames/random-info-pages at e8c48ce, then created local branch four-interactive-exhibits. No AGENTS.md, no root package manifest, and no pre-existing local changes. Homepage is a self-contained archive with six folders, 14 links and an inline search index. Node tests use built-in node:test. Pages stages the repository with rsync; new static folders need no workflow changes. Existing CI also builds unrelated Computer and OS projects. Preserve those pipelines.

## Task 1: Cryptography Museum

Files: `cryptography-museum/{index.html,styles.css,app.js,engine.mjs}`, `tests/cryptography-museum.test.mjs`.

- [x] Write engine tests, observe missing-module failure, implement classical ciphers, historically accurate Enigma I, SHA-256, PBKDF2/AES-GCM and public-key operations, verify tests.
- [x] Build seven navigable exhibits with context, mechanisms, weaknesses, related exhibits, challenge and local progress.
- [x] Exercise invalid settings, Unicode, tampering, repeated operations and keyboard/mobile layout. Record evidence in task report.
- [x] Independent task review; resolve material findings.

## Task 2: One Million, Actually

Files: `one-million/{index.html,styles.css,app.js,engine.mjs}`, `tests/one-million.test.mjs`.

- [x] Test exact proportions, invalid inputs, safe integer boundaries, coordinates and aggregation after implementation, per the user's sequencing instruction.
- [x] Implement Canvas LOD field, powers-of-ten navigation, pan/zoom/individual inspection, comparison modes and URL state.
- [x] Add five guided stories, accessible counts and aggregation disclosure. Check responsive rendering and bounded render work.
- [x] Independent task review; resolve material findings.

## Task 3: Algorithm Arena

Files: `algorithm-arena/{index.html,styles.css,app.js,engine.mjs,audio.mjs}`, `tests/algorithm-arena.test.mjs`.

- [x] Test all six sorts, deterministic traces, pathfinding, weighted costs, graph traversal/MST and voice limits after implementation, per the user's sequencing instruction.
- [x] Implement sorting race from identical input, playback controls, runtime versus playback measurements, editable grid and editable graph.
- [x] Implement operation-synchronized local synthesis, three sound modes plus mute, voice limits, rate limiting and volume/preset/scale controls.
- [x] Independent task review; resolve material findings.

## Task 4: Music Microscope

Files: `music-microscope/{index.html,styles.css,app.js,analysis.mjs,analysis-worker.js}`, `tests/music-microscope.test.mjs`.

- [x] Test synthetic sine FFT, peak/RMS, transport position, input limits, selection and filtering behavior after implementation, per the user's sequencing instruction.
- [x] Implement local import and generated example, synchronized Web Audio transport, seeking, loops, filters and volume.
- [x] Implement waveform zoom/pan, cached worker spectrogram, live FFT/bands/stereo/peak/RMS, selection analysis, cautious onset/BPM/pitch estimates.
- [x] Independent task review; resolve material findings.

## Task 5: Integration, verification and delivery

Files: modify only `index.html`, `tests/home-index.test.mjs`; add browser tests, local test harness and handoff.

- [x] Add one Data and three Experiments entries, descriptions/search metadata; update all counts to 18 with tests checking categories and parity.
- [x] Run all relevant existing Node checks and new engine tests.
- [x] Serve on local HTTP; test all routes under the repository prefix, import/error/transport/audio/crypto/URL interactions, mobile, keyboard, reduced motion and console/network errors with a real browser.
- [x] Review final changes independently; fix defects and document limitations.
- [x] Build `random-info-pages-four-exhibits.zip` from the explicit overlay file list. Extract over a fresh base checkout and repeat tests. Include handoff, manifest, checksums and exact local path.

## Review focus

Malformed URL state must not break initialization. Long text and mobile controls must not overflow. Browser cryptography errors must become understandable messages. Audio must stop when paused/muted and scheduling must remain bounded. Dense rendering/analysis must remain bounded on mobile and stale async results must not overwrite current input.
