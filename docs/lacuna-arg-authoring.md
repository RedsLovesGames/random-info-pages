# LACUNA ARG Authoring Guide

This file is for future maintainers. It is not player-facing story content.

## Non-negotiable architecture

LACUNA has one story state. Files, search, Terminal, Recycle Bin, diagnostics, the internal console, the historical snapshot, and endings must all read the same data model under `scripts/win95-overrides/src/arg/`. Do not create a second clue database inside a UI component.

Every new story file needs a deterministic node ID, a stable `contentId`, filesystem metadata, an explicit progression purpose, and a recovery path if it is required. Required clues must set `protectedStoryFile: true`. Story prose belongs in `data/documents.ts`; node metadata belongs in `data/filesystem.ts` or `data/snapshot.ts`.

## Discovery rule

The workstation must remain useful as a normal Random Info OS. Never add a `Play ARG`, chapter selector, quest log, or explicit LACUNA desktop shortcut. A clue should be discoverable through an ordinary computer action such as restore, search, file browsing, a command, Task Manager, diagnostics, or opening a local address found in a file.

## Mundane density

Do not turn a directory into a folder of plot props. Visible user-facing directories should contain at least four mundane files for every immediately visible protected story file. Mundane files should be believable work debris: schedules, printer notes, inventories, scratch notes, driver notes, temporary logs, and backups.

## Evidence and ambiguity

The ethics breach is confirmed canon: non-consenting staff activity was used as subject data and the project was suspended for governance/human-subject review. The prediction claim is never confirmed. New evidence that seems supernatural must have at least one plausible mundane challenge such as clock drift, data contamination, repeated behavior, later provenance, or researcher interpretation.

## Progression

Progression is evidence-driven, never a chapter integer. Add semantic telemetry only when a player performs an ARG-local action. Update `deriveProgression()` using the smallest combination of evidence that proves the intended inference. A single file should not unlock a conclusion that canonically requires cross-reference.

## Privacy boundary

LACUNA may observe only interactions performed inside the ARG. Do not request or inspect microphone, camera, geolocation, external browser history, uploads, device fingerprints, contacts, or unrelated storage. Subject 00 finale text must be derived from the allowlisted ARG telemetry types.

## Visuals

Prefer HTML/CSS/SVG/Canvas/Web Audio generated at runtime. Clue-bearing charts must have a textual/table equivalent. Color and animation may reinforce information but cannot be the only carrier. Respect `prefers-reduced-motion`.

## Historical snapshot

`D:\` is a read-only historical source. Do not silently make later current-machine files appear in D:. The point of the snapshot is source criticism: it corroborates the ethical breach while weakening the provenance of later Subject 00 material.

## Tests required for any new clue

1. Seed/content reference resolves.
2. Required clue is protected/recoverable.
3. Progression requires the intended evidence combination.
4. Search/Terminal/Explorer agree on the same node state.
5. Any chart has accessible text.
6. Reset returns the deterministic initial seed.
7. No new external network or private-data dependency is introduced.
