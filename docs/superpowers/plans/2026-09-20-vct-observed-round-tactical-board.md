# VCT Observed-Round Tactical Board Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current fuzzy tactical-board model with two clearly separated systems: a trustworthy Recommended Play planner built on validated map geometry and agent subroles, and an Observed VCT Round viewer backed by specific match/map/round/timestamp evidence.

**Architecture:** Split tactical data into map geometry, agent tactical capabilities, recommended-play templates, and observed-round evidence. Recommended plays use validated anchors and route graphs instead of fuzzy text matching and straight-line vectors. Observed rounds use exact source metadata and only claim what is actually verified from public replay/VOD evidence.

**Tech Stack:** Static GitHub Pages, vanilla JavaScript, CSS, existing VCT/VLR snapshot, Riot/Valorant-API map metadata, verified RIB/VOD links, Node test runner, GitHub Actions.

**Spec:** Current VCT Scout + Comp Lab implementation and the screenshot-derived defect list from September 20, 2026.

## Global Constraints

- Do not fabricate exact pro-round coordinates or utility placements.
- Keep Recommended Play and Observed VCT Round visually and semantically distinct.
- Never silently substitute a fallback coordinate for a resolved callout without marking it as fallback.
- Do not use fuzzy callout matching at render time for production placement.
- Preserve current comp recommendation, roster pools, team scouting, and team-logo functionality.
- Every tactical change must be covered by Node tests before deployment.
- All map/source links must identify match, map, and where possible round/timestamp.
- Do not claim a source demonstrates a generated play unless that exact round was manually verified.

## Review Focus

1. Wrong-map contamination: an Ascent play must never render with Haven source metadata or Haven anchors.
2. Anchor failures: unresolved callouts must show a visible fallback state instead of pretending to be exact.
3. Duplicate/colliding placements: five players cannot collapse onto one anchor unless the play explicitly allows a stack.
4. Route validity: rendered paths must follow the route graph through traversable nodes instead of crossing solid geometry.
5. Source integrity: Observed Round cards must include exact match, map, round and timestamp evidence or be rejected by tests.

---

## File Structure

**Create**
- `vct-scout/map-geometry.js` — validated map anchors, named tactical zones, route graph, spawn/site metadata.
- `vct-scout/map-geometry.test.cjs` — anchor uniqueness, map isolation, route-graph tests.
- `vct-scout/agent-tactics.js` — tactical subroles and agent-specific capabilities.
- `vct-scout/agent-tactics.test.cjs` — role assignment tests.
- `vct-scout/recommended-plays.js` — recommended-play definitions using geometry keys, sequencing and utility ownership.
- `vct-scout/recommended-plays.test.cjs` — play-schema and route tests.
- `vct-scout/observed-rounds.js` — manually verified public round evidence.
- `vct-scout/observed-rounds.test.cjs` — evidence completeness and URL/timestamp validation.
- `vct-scout/tactical-renderer-v3.js` — new renderer for both Recommended and Observed modes.
- `vct-scout/tactical-renderer-v3.css` — collision-safe map UI, layers, zoom and inspector layout.

**Modify**
- `vct-scout/index.html` — load v3 tactical modules and add mode controls.
- `vct-scout/app-core.js` — expose current team/map/comp context cleanly to renderer.
- `vct-scout/app-lab.js` — connect manual/recommended comps to the new planner.
- `.github/workflows/pages.yml` — run all v3 tests and live smoke checks.

**Retire after v3 passes**
- `vct-scout/tactical-v2.js`
- `vct-scout/tactical-v2.css`
- fuzzy callout resolution logic in the old renderer

---

### Task 1: Freeze the v3 tactical schemas

**Files:**
- Create: `vct-scout/map-geometry.js`
- Create: `vct-scout/agent-tactics.js`
- Create: `vct-scout/recommended-plays.js`
- Create: `vct-scout/observed-rounds.js`

**Interfaces:**
- `MapGeometry.getMap(mapName)` returns `{ anchors, routes, sites, spawns, labels }`.
- `AgentTactics.get(agent)` returns tactical capability metadata.
- `RecommendedPlays.get(map, side)` returns play objects referencing geometry keys only.
- `ObservedRounds.get(map)` returns verified round evidence objects.

- [ ] Define exact object schemas with no render-time fuzzy matching.
- [ ] Add validation helpers that reject missing anchors, duplicate IDs, invalid route nodes, and incomplete source evidence.
- [ ] Commit schema-only changes.

### Task 2: Build deterministic map geometry for all seven current maps

**Files:**
- Modify: `vct-scout/map-geometry.js`
- Create: `vct-scout/map-geometry.test.cjs`

**Implementation requirements:**
- Store normalized `[0,1]` coordinates for named anchors.
- Include explicit site labels, attack spawn, defense spawn, major lanes and rotation nodes.
- Create a graph of traversable connections between anchors.
- Include route waypoints so paths can bend through corridors.
- Each anchor carries `confidence: 'verified' | 'template'` and optional source note.

**Tests:**
- [ ] Every map contains required spawn/site anchors.
- [ ] No cross-map anchor lookup is possible.
- [ ] Major route pairs have a graph path.
- [ ] Anchor coordinates are in bounds.
- [ ] Duplicate anchor IDs fail validation.
- [ ] Commit geometry and tests.

### Task 3: Replace broad roles with tactical subroles

**Files:**
- Modify: `vct-scout/agent-tactics.js`
- Create: `vct-scout/agent-tactics.test.cjs`

**Subroles:**
- primaryEntry
- secondaryEntry
- flashEntry
- lurker
- infoInitiator
- execInitiator
- globalController
- localController
- retakeController
- siteAnchor
- flankControl
- operatorAnchor
- postPlant
- flex

**Requirements:**
- Yoru can prefer lurk/secondary entry.
- Astra prefers global/central controller jobs.
- Omen can support local controller/lurk/flex jobs.
- Sova prefers info routes and line-of-sight support.
- Cypher prefers flank-control/lurk/anchor jobs.
- Double-controller assignments must produce distinct jobs.

**Tests:**
- [ ] Astra + Omen never receive the same controller subrole when distinct slots exist.
- [ ] Cypher is preferred for flank control over duelists.
- [ ] Jett/Raze/Neon/Waylay rank above non-duelists for primary entry.
- [ ] Yoru can rank above other duelists for lurk when the play asks for lurker.
- [ ] Commit agent-tactical model.

### Task 4: Rebuild recommended plays around geometry, sequencing and ownership

**Files:**
- Modify: `vct-scout/recommended-plays.js`
- Create: `vct-scout/recommended-plays.test.cjs`

**Play schema must include:**
- `id`, `map`, `side`, `title`, `tempo`
- ordered phases such as `opening`, `contact`, `execute`, `plant`, `postPlant`
- tactical slots with required/preferred subroles
- start anchor and optional destination anchor
- route node sequence or graph endpoints
- utility events with `ownerSlot`, `abilityKind`, `targetAnchor`, `phase`
- spike carrier slot and plant anchor for attack plans
- contingency branch
- source classification: `planning-template`

**Tests:**
- [ ] Every attack play has a spike carrier and plant anchor.
- [ ] Every route resolves through the geometry graph.
- [ ] Utility has an owner slot.
- [ ] Five player slots resolve to unique anchors unless `allowStack: true`.
- [ ] Every play contains at least one contingency.
- [ ] Commit recommended-play data.

### Task 5: Implement route-aware rendering instead of straight arrows

**Files:**
- Create: `vct-scout/tactical-renderer-v3.js`
- Create: `vct-scout/tactical-renderer-v3.css`

**Requirements:**
- Draw paths through route-graph waypoints.
- Never draw direct lines through walls when waypoints exist.
- Scale arrowheads relative to zoom level.
- Separate start marker from destination marker.
- Show sequence numbers or phase chips.
- Utility markers display owner agent/player on hover/focus.
- Player icons are smaller than current v2 markers.
- Labels use collision avoidance and can be hidden independently.
- Add zoom/pan controls and reset view.
- Add layer toggles for players, labels, routes, utility, callouts, destinations.
- Show A/B/C, attacker spawn and defender spawn directly on the map.
- Fallback/template anchors render with a visible warning style.

**Acceptance checks:**
- [ ] Five-player Ascent mid default is readable at 100% zoom.
- [ ] No label is clipped to fragments such as `O`, `Jo`, or `Sc`.
- [ ] No route crosses a wall when a graph path exists.
- [ ] Route/utility layers can be toggled independently.
- [ ] Commit renderer.

### Task 6: Create a real Observed VCT Round evidence model

**Files:**
- Modify: `vct-scout/observed-rounds.js`
- Create: `vct-scout/observed-rounds.test.cjs`

**Observed round schema:**
- `id`
- `match`
- `event`
- `date`
- `map`
- `round`
- `side`
- `team`
- `opponent`
- `scoreBeforeRound`
- `sourceMatchUrl`
- `vodUrl`
- `vodStartSeconds`
- `vodEndSeconds`
- `evidenceNotes`
- optional verified `events[]` with timestamps and named anchors only when manually confirmed

**Rules:**
- No inferred player trajectory may be stored as observed.
- If exact round timing cannot be verified, the item stays out of Observed mode.
- RIB match links may support identity/context, but exact-round evidence should use a direct timestamped VOD when available.

**Tests:**
- [ ] Every observed item has exact map/round/team/opponent.
- [ ] Every observed item has a direct VOD timestamp.
- [ ] No `planning-template` entry can enter Observed mode.
- [ ] Commit initial verified examples.

### Task 7: Separate the UI into Recommended Play and Observed VCT Round modes

**Files:**
- Modify: `vct-scout/index.html`
- Modify: `vct-scout/app-core.js`
- Modify: `vct-scout/app-lab.js`
- Modify: `vct-scout/tactical-renderer-v3.js`

**Recommended Play mode:**
- Uses current Comp Lab assignment.
- Shows exact player-to-agent assignment.
- Shows phase sequence, routes, utility ownership, spike carrier, plant and post-plant positions.
- Shows a confidence/source badge saying `Planning template`.

**Observed VCT Round mode:**
- Lets user pick team, map and verified round example.
- Shows the source match, round number and exact VOD timestamp prominently.
- Only displays movement/events that are present in verified evidence.
- Provides one-click `Watch exact round` link.

**Tests/UI checks:**
- [ ] Switching modes does not reuse the other mode's source badge or copy.
- [ ] Recommended mode never displays `Observed` wording.
- [ ] Observed mode never displays generated planning routes as if sourced.
- [ ] Commit mode split.

### Task 8: Improve source presentation and deep links

**Files:**
- Modify: `vct-scout/tactical-renderer-v3.js`
- Modify: `vct-scout/tactical-renderer-v3.css`

**Requirements:**
- Collapse source methodology into an `Evidence` drawer.
- Keep only concise source chips in the main board.
- Replace generic `RIB match + Replay tab` prominence with exact `Watch Round N at mm:ss` where verified.
- Keep RIB match link as secondary context.
- Do not show ValoPlant unless a specific shared replay URL exists.

- [ ] Add source-copy snapshot test.
- [ ] Commit source-link cleanup.

### Task 9: Add visual QA fixtures for the exact screenshot failure cases

**Files:**
- Create or extend: `vct-scout/tactical-renderer-v3.test.cjs`

**Fixtures:**
- Ascent mid-control with Waylay, Yoru, Sova, Astra, Omen.
- Ascent A split with Jett, Phoenix, Sova, Omen, Cypher.
- Haven three-lane default.
- Double-controller composition.
- Five-player play with utility concentrated on one site.

**Assertions:**
- [ ] unique starting anchors where required
- [ ] labels generated for all five players
- [ ] route graph returns at least two waypoints for paths that bend
- [ ] utility markers identify owner slot
- [ ] spike/plant present on attack
- [ ] fallback anchors visibly marked
- [ ] Commit regression tests.

### Task 10: Wire deployment verification and remove v2

**Files:**
- Modify: `.github/workflows/pages.yml`
- Modify: `vct-scout/index.html`
- Delete after successful verification: `vct-scout/tactical-v2.js`
- Delete after successful verification: `vct-scout/tactical-v2.css`

**CI commands:**
- `node --test vct-scout/recommendation.test.cjs`
- `node --test vct-scout/map-geometry.test.cjs`
- `node --test vct-scout/agent-tactics.test.cjs`
- `node --test vct-scout/recommended-plays.test.cjs`
- `node --test vct-scout/observed-rounds.test.cjs`
- `node --test vct-scout/tactical-renderer-v3.test.cjs`
- `node --check` on all v3 JavaScript modules

**Live smoke checks:**
- [ ] VCT Scout page contains `Recommended Play` and `Observed VCT Round`.
- [ ] v3 renderer is served.
- [ ] old v2 scripts are no longer referenced.
- [ ] team logos still resolve.
- [ ] Comp Lab still loads.
- [ ] Commit and deploy.

### Task 11: Final manual review in this chat

- [ ] Open the deployed board on Ascent, Haven and one additional map.
- [ ] Compare against the exact screenshot failures that triggered this rewrite.
- [ ] Verify labels, route paths, source language, attack/defense switching, team logos, map identity, spike/plant and layer toggles.
- [ ] Fix any remaining visible regressions before calling the project complete.

---

## Execution Order

1. Schemas
2. Geometry
3. Agent subroles
4. Recommended-play model
5. Renderer v3
6. Observed-round evidence
7. UI mode split
8. Source/deep-link cleanup
9. Regression fixtures
10. CI/deploy and v2 removal
11. Manual deployed review

## Completion Standard

The rewrite is complete only when:

- generated plays never masquerade as observed VCT rounds;
- all current maps use deterministic validated anchors;
- paths route through map geometry instead of straight through walls;
- player labels remain readable without collisions;
- attack plans show spike, plant and post-plant structure;
- utility has explicit ownership;
- double-controller/subrole assignments are sensible;
- exact observed-round examples include direct timestamped evidence;
- all tests and the live GitHub Pages smoke checks pass.
