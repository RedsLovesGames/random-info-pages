# Random Info Pages Toolbox Implementation Plan

The approved implementation plan remains: audit repository and upstream licenses first; then implement the Toolbox shell, Time Zone Board, browser-local Image Studio, optional GIF/background removal, sourced inflation calculator, live multi-currency conversion, text utilities, homepage integration, and full regression/deployment verification.

## Non-negotiable execution rules
- Work only on the existing `toolbox` branch.
- Do not create another branch.
- Do not modify `main` until review/merge.
- Preserve Wheel, When We Meet, and existing routes.
- Keep the static HTML/CSS/JavaScript architecture.
- Prefer browser-native APIs for simple operations.
- Keep user image processing local.
- Audit exact third-party revisions/licenses before incorporation and record them in `/tools/OPEN_SOURCE.md`.
- Heavy media/ML code must lazy-load.
- Add deterministic checks for pure logic and route integrity.
- Do not claim tests, deployment, or manual checks succeeded unless actually observed.

## Delivery order
1. Toolbox shell/index and shared primitives.
2. Time Zone Board with DST-correct IANA zones, persistence, slider, and overlap view.
3. Image Studio conversion/resize/compression/batch flow using native browser APIs first.
4. GIF/media/background-removal enhancements after license and performance review.
5. Historical U.S. inflation using a frozen sourced dataset.
6. One-to-many live currency conversion with dated rates and stale-cache handling.
7. Local text utilities.
8. Homepage integration, attribution audit, deterministic regression checks, and mobile/desktop validation.

The detailed design specification in `docs/superpowers/specs/2026-09-24-toolbox-design.md` is authoritative for feature behavior.