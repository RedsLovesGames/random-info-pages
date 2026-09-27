# LACUNA Assisted Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the LACUNA ARG easier for normal players without changing canon, required evidence, or the harder Authentic experience.

**Architecture:** Add an assistance-profile layer (`authentic | assisted | guided`) that only affects hints, discoverability, and convenience surfaces. Keep the existing filesystem/progression engine authoritative; dynamic notes, Recent Documents, Explorer hidden-file visibility, CMD help, and idle hints derive from existing progression/events rather than duplicating story state.

**Tech Stack:** TypeScript, existing LACUNA runtime/store, existing Win95 override shell, CSS, Playwright smoke tests, Node test runner.

**Spec:** Approved chat design from 2026-09-27: Assisted is default; add better CMD help, Explorer Show Hidden Files, dynamic notes.txt, Recent Documents, and idle contextual hints while preserving Authentic mode.

## Global Constraints

- Do not change LACUNA canon, clue contents, or evidence requirements.
- Assisted is the default profile.
- Authentic preserves the current harder experience.
- Guided may expose stronger hints but must not auto-complete evidence.
- Clearing cookies still resets ARG progress.
- All assistance behavior remains client-side and ARG-local.
- No paid services, backend, external network requests, or new asset pipeline.

## Review Focus

- Existing saved players without an assistance preference should load as Assisted without losing progress.
- Authentic must not receive dynamic hints or Explorer hidden-file convenience.
- Recent Documents must only contain files the player actually opened/discovered.
- Idle hints must not reveal evidence before its prerequisite state exists.
- Guided assistance must not mark files/evidence as discovered automatically.

---

### Task 1: Assistance profile and persistence

**Files:**
- Modify: `scripts/lacuna-hotfix/lacuna-runtime/src/state.ts`
- Modify: `scripts/lacuna-hotfix/lacuna-runtime/src/types.ts` if needed
- Test: `scripts/lacuna-hotfix/lacuna-runtime/tests/state.test.mjs`

**Interfaces:**
- Produces: `assistanceMode: 'authentic' | 'assisted' | 'guided'` in runtime state, persisted through existing cookie mechanism; default `assisted`.

- [ ] Add failing persistence/default/reset tests.
- [ ] Verify RED in GitHub CI/local Node test.
- [ ] Implement minimal assistance-mode state/persistence.
- [ ] Verify GREEN and full state tests.

### Task 2: CMD assistance

**Files:**
- Modify: `scripts/lacuna-hotfix/win95-overrides/src/arg/engine/terminal.ts`
- Modify: `scripts/lacuna-hotfix/lacuna-runtime/src/ui/terminalApp.ts` if display hooks are needed
- Test: `scripts/lacuna-hotfix/lacuna-runtime/tests/terminal.test.mjs`

**Interfaces:**
- Consumes: current assistance mode.
- Produces: richer `HELP`; Assisted/Guided aliases/tips for `ls`, `dir`, `/a`, and `attrib` without auto-solving.

- [ ] Add failing tests for help examples and assistance-dependent tips.
- [ ] Verify RED.
- [ ] Implement minimal help/alias/tip behavior.
- [ ] Verify GREEN and terminal suite.

### Task 3: Explorer hidden-file convenience and Recent Documents

**Files:**
- Modify: `scripts/lacuna-hotfix/lacuna-runtime/src/ui/myComputer.ts`
- Modify: `scripts/lacuna-hotfix/lacuna-runtime/src/state.ts`
- Test: `scripts/lacuna-hotfix/lacuna-runtime/tests/integration-contract.test.mjs`

**Interfaces:**
- Produces: Assisted/Guided `Show Hidden Files` toggle and Recent Documents generated only from previously opened files.

- [ ] Add failing integration contracts for toggle visibility and recents provenance.
- [ ] Verify RED.
- [ ] Implement toggle and recents derived from telemetry/history.
- [ ] Verify GREEN.

### Task 4: Dynamic `notes.txt`

**Files:**
- Create/Modify: `scripts/lacuna-hotfix/lacuna-runtime/src/assistance.ts`
- Modify: `scripts/lacuna-hotfix/lacuna-runtime/src/ui/documentViewer.ts` or filesystem read path as appropriate
- Test: `scripts/lacuna-hotfix/lacuna-runtime/tests/assistance.test.mjs`

**Interfaces:**
- Produces: `buildAssistanceNotes(snapshot)` with progression-aware checklist text; static/minimal in Authentic, dynamic in Assisted, stronger wording in Guided.

- [ ] Add failing tests for early/mid/late notes and no auto-discovery side effects.
- [ ] Verify RED.
- [ ] Implement pure note derivation.
- [ ] Verify GREEN.

### Task 5: Idle contextual hints

**Files:**
- Modify/Create: `scripts/lacuna-hotfix/lacuna-runtime/src/assistance.ts`
- Modify: `scripts/lacuna-hotfix/lacuna-runtime/src/bootstrap.ts` or top-level runtime UI hook
- Test: `scripts/lacuna-hotfix/lacuna-runtime/tests/assistance.test.mjs`

**Interfaces:**
- Produces: prerequisite-gated hint selection and an inactivity timer; no hints in Authentic.

- [ ] Add failing tests for gating/order and Authentic suppression.
- [ ] Verify RED.
- [ ] Implement deterministic hint selection plus idle timer.
- [ ] Verify GREEN.

### Task 6: Mode selector and browser verification

**Files:**
- Modify: appropriate system/settings surface in `scripts/lacuna-hotfix/lacuna-runtime/src/ui/`
- Modify: `scripts/lacuna-hotfix/lacuna_browser_smoke.mjs`
- Test: existing Node suites + Playwright smoke

**Interfaces:**
- Produces: user-selectable Authentic / Assisted / Guided control; default Assisted; selector does not reset progress.

- [ ] Add browser assertions for default Assisted, switching to Authentic, hidden-file UI suppression, dynamic notes, Recent Documents, and Guided hints.
- [ ] Verify RED.
- [ ] Implement selector/surfaces.
- [ ] Run full LACUNA CI and existing Computer smoke.

### Task 7: Deploy

- [ ] Compare feature branch against `main`; require `behind_by = 0`.
- [ ] Fast-forward `main` only after all CI/browser gates are green.
- [ ] Verify GitHub Pages workflow and post-deploy Computer checks succeed.
