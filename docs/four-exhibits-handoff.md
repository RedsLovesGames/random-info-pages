# Four Interactive Exhibits Handoff

## Applications

- `/music-microscope/` analyzes local recordings with waveform, spectrogram, live spectrum, stereo meters, selection measurements, native filters, and bounded background estimates. It checks supported file headers and duration before decoding, then rejects inputs whose decoded audio could exceed 32 MB.
- `/one-million/` visualizes a complete million-unit hierarchy with counted aggregation, proportions, three comparison slots, five guided stories, and shareable URL state.
- `/algorithm-arena/` compares six deterministic sorting traces, four grid pathfinders, graph traversal and minimum spanning trees, with user-enabled local sonification.
- `/cryptography-museum/` presents seven working cipher and cryptography exhibits, including Enigma, Web Crypto encryption, and public-key signatures.

All four apps are static, buildless, and use relative assets so they work under the repository's GitHub Pages project prefix. Audio and cryptographic processing stays in the browser.

## Verification

- `node scripts/test-exhibits.mjs`: 34 passed.
- `node scripts/exhibits-browser-smoke.mjs`: all four apps passed desktop and mobile layout, labels, focus, reduced-motion, and asset checks.
- `node scripts/exhibits-interactions.mjs`: all four interactive workflows passed in Chromium.
- `CRYPTOMUSEUM_BROWSER_TESTS=1 node --test tests/cryptography-museum.browser.test.mjs`: 7 passed.
- `node --check` across the four app folders, scripts and tests: 76 JavaScript files checked.
- Full existing repository test discovery: 337 passed, 9 failed, 1 skipped. The failures are outside these exhibits: four LACUNA checks reference missing runtime sources or generated artifacts, four Computer/OS checks reference missing sources or generated build outputs, and the PDF core test forms a duplicated `C:\C:` path. Those workflows and source files were not changed.
- The packaged overlay was extracted over a fresh archive of `HEAD`; all 34 manifest payloads and the ZIP checksum matched. From that extracted tree, all 34 targeted tests, 8 desktop/mobile checks, 4 interactive workflows, 7 cryptography browser tests, and 76 syntax checks passed.

## Package

Run `scripts/package-exhibits.ps1` from this repository to create the explicit overlay ZIP at:

`C:\Users\Tommy\Documents\Codex\randominfopages\random-info-pages-four-exhibits.zip`

The archive includes `docs/four-exhibits-manifest.json`, which records each overlay file's size and SHA-256. The adjacent `.sha256` file records the final ZIP checksum. The packaging script validates ZIP entries before reporting the artifact path and checksum. On this Windows workspace, run it with `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\package-exhibits.ps1`.

The local work is on branch `four-interactive-exhibits`. The repository's GitHub Pages workflow publishes on pushes to `main` and stages the repository root, including the four exhibit routes and the downloadable ZIP.
