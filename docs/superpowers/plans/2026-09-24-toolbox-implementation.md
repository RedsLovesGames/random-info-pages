# Random Info Pages Toolbox Implementation Plan

Implementation is sequential on the existing `toolbox` branch only.

## Rules
- No additional branches.
- Preserve `main` until review/merge.
- Preserve existing Wheel, When We Meet, and unrelated routes.
- Keep static HTML/CSS/JavaScript architecture.
- Prefer browser-native APIs; keep image processing local.
- Audit exact third-party revisions/licenses before incorporation and record them in `/tools/OPEN_SOURCE.md`.
- Lazy-load heavy media/ML code.
- Run deterministic checks and real mobile/desktop validation before completion claims.

## Order
1. Toolbox shell/index and shared primitives.
2. Time Zone Board.
3. Image Studio core.
4. GIF/media/background removal.
5. Historical inflation.
6. Multi-currency conversion.
7. Text utilities.
8. Homepage integration and full verification.

The detailed approved behavior is defined in `docs/superpowers/specs/2026-09-24-toolbox-design.md`.

Phase 0 audit confirmed the repository remains a static multi-route site. Phase 1 shell work is prepared as a single commit before Time Zone implementation.