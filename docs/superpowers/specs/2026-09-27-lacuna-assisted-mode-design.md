# LACUNA Assisted Mode Design

## Purpose
Make the existing ARG easier to follow without simplifying its canon, removing evidence work, or forcing hints on players who want the current experience.

## Profiles
- **Authentic:** current experience; no assistance-only hidden-file toggle, no dynamic hints, no progressive checklist.
- **Assisted (default):** improved CMD help, Explorer hidden-file toggle, dynamic `notes.txt`, Recent Documents, and subtle inactivity hints.
- **Guided:** all Assisted features plus more explicit wording in notes/hints. It never auto-opens files or marks evidence discovered.

## Assistance surfaces
1. CMD `HELP` teaches `DIR /A`, `TYPE`, `ATTRIB`, `FIND`, and common aliases/mistakes.
2. Explorer gains `Show Hidden Files` in Assisted/Guided.
3. Recent Documents lists only files actually opened in this playthrough.
4. `notes.txt` is progression-derived, diegetic, and updates as evidence is discovered.
5. Idle hints appear only after inactivity and only when their prerequisite knowledge exists.

## State and privacy
The assistance profile is stored in the existing LACUNA cookie-backed progress state. Clearing cookies resets it with all other progress. Assistance derives only from existing ARG-local events and never reads external browsing/device data.

## Story integrity
Assistance may point toward mechanics or already-available evidence but must not establish a conclusion that the player has not earned. The LACUNA console, Vale identity, historical snapshot, source comparison, Subject 00, and finale retain their existing evidence gates.
