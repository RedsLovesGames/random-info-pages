# Random Info Pages Toolbox Implementation Plan

> Branch: `toolbox`
> Approved design: `docs/superpowers/specs/2026-09-24-toolbox-design.md`

## Goal
Implement the approved Toolbox as a static, GitHub-Pages-compatible extension of Random Info Pages without changing unrelated existing tools. Work only on the existing `toolbox` branch until the feature is ready for review.

## Guardrails
- Do not create additional branches.
- Do not modify `main` during implementation.
- Preserve Wheel, When We Meet, and all existing routes.
- Keep the existing static HTML/CSS/JavaScript architecture. Do not migrate the repository to React/Vite or another framework.
- User image processing stays local to the browser.
- Heavy media/ML dependencies load only when invoked.
- Verify third-party licenses before copying implementation code.
- Record every incorporated third-party source in `/tools/OPEN_SOURCE.md`.
- Commit in small functional stages and run deterministic checks before claiming completion.

## Delivery
0. Audit repository and upstream candidates.
1. Toolbox shell/index and shared primitives.
2. Time Zone Board.
3. Image Studio core.
4. GIF and background-removal enhancements.
5. Historical inflation calculator.
6. Multi-currency conversion.
7. Text utilities.
8. Homepage integration and full verification.

## Definition of Done
The Toolbox v1 is done only when all four routes work independently, time-zone behavior is DST-correct, image processing is local, sourced money data is transparent, third-party reuse is documented, existing routes remain intact, and deterministic plus mobile/desktop checks have actually been run.

## Execution rule
Execute sequentially on the existing `toolbox` branch. Do not create another branch. If implementation discovery materially changes the architecture, update the design/plan explicitly first.