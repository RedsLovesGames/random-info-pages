# LACUNA ARG Deployment State

Validated feature head before main deployment: `54c297c152f7e1ca9c02ba755eaa07bcdda18d3f`.

This deployment was gated by both the dedicated LACUNA ARG CI and the existing Random Info Computer CI. The LACUNA gate includes the outer computer production build, Win95/LACUNA production build, 38 unit/integration contracts, repository-prefix staging, and Playwright Chromium smoke covering Command Prompt geometry, shared filesystem behavior, console gating, historical disk mounting, finale flow, cookie persistence, and cookie-clear reset.

ARG progress is intentionally stored in cookies so clearing site cookies resets the ARG. Command Prompt uses console-like fixed horizontal geometry with vertical resizing/scrolling.
