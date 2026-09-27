import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveProgression } from '../dist/win95-overrides/src/arg/engine/progression.js';
import { recordTelemetry, ALLOWED_TELEMETRY_TYPES } from '../dist/win95-overrides/src/arg/engine/telemetry.js';
import { createInitialPersistentState, loadArgState, saveArgState, resetArgState, createMemoryStorageAdapter } from '../dist/win95-overrides/src/arg/engine/persistence.js';
import * as persistence from '../dist/win95-overrides/src/arg/engine/persistence.js';

test('progression is evidence-driven rather than chapter-driven', () => {
  let events = [];
  events = recordTelemetry(events, { type: 'file-restored', target: 'c-todo-old', timestamp: '2026-01-01T00:00:00Z' });
  events = recordTelemetry(events, { type: 'search', target: 'lacuna', timestamp: '2026-01-01T00:00:01Z' });
  events = recordTelemetry(events, { type: 'file-opened', target: 'c-temp-lacuna-log', timestamp: '2026-01-01T00:00:02Z' });
  events = recordTelemetry(events, { type: 'attribute-changed', target: 'c-research', detail: 'hidden:false', timestamp: '2026-01-01T00:00:03Z' });
  events = recordTelemetry(events, { type: 'file-opened', target: 'c-tech-overview', timestamp: '2026-01-01T00:00:04Z' });
  const flags = deriveProgression(events);
  for (const flag of ['restoredTodo','searchedLacuna','openedTempLog','revealedResearch','readTechnicalOverview']) assert.ok(flags.has(flag), flag);
  assert.equal(flags.has('identifiedVale'), false);
});

test('Vale identity requires both subject record and crosswalk evidence', () => {
  let events = [];
  events = recordTelemetry(events, { type: 'file-opened', target: 'c-opr019', timestamp: '2026-01-01T00:00:00Z' });
  assert.equal(deriveProgression(events).has('identifiedVale'), false);
  events = recordTelemetry(events, { type: 'file-opened', target: 'c-crosswalk', timestamp: '2026-01-01T00:00:01Z' });
  assert.equal(deriveProgression(events).has('identifiedVale'), true);
});

test('telemetry is ordered and restricted to ARG-local categories', () => {
  let events = [];
  events = recordTelemetry(events, { type: 'app-opened', target: 'terminal', timestamp: '2026-01-01T00:00:00Z' });
  events = recordTelemetry(events, { type: 'terminal-command', target: 'dir', timestamp: '2026-01-01T00:00:01Z' });
  assert.deepEqual(events.map((e) => e.sequence), [1,2]);
  assert.ok(ALLOWED_TELEMETRY_TYPES.every((value) => !/microphone|camera|geolocation|fingerprint|upload|external-history/i.test(value)));
  assert.throws(() => recordTelemetry(events, { type: 'microphone', target: 'x', timestamp: '2026-01-01T00:00:02Z' }), /not allowed/i);
});

test('persistence round-trips, rejects stale writes, and resets deterministically', async () => {
  const adapter = createMemoryStorageAdapter();
  const initial = createInitialPersistentState();
  const changed = { ...initial, revision: 1, settings: { ...initial.settings, showHidden: true } };
  await saveArgState(changed, adapter);
  const loaded = await loadArgState(adapter);
  assert.equal(loaded.revision, 1);
  assert.equal(loaded.settings.showHidden, true);
  await assert.rejects(() => saveArgState({ ...initial, revision: 0 }, adapter), /stale/i);
  const reset = await resetArgState(adapter);
  assert.equal(reset.revision, 0);
  assert.equal(reset.settings.showHidden, false);
  assert.equal(reset.telemetry.length, 0);
});

test('unavailable primary storage can fall back to supplied adapter', async () => {
  const fallback = createMemoryStorageAdapter();
  await fallback.save({ ...createInitialPersistentState(), revision: 3 });
  const loaded = await loadArgState(fallback);
  assert.equal(loaded.revision, 3);
});


test('browser progress persistence is cookie-backed and clearing cookies resets the ARG', async () => {
  assert.equal(typeof persistence.createCookieStorageAdapter, 'function');
  const cookies = new Map();
  const io = {
    read() { return [...cookies.entries()].map(([k,v]) => `${k}=${v}`).join('; '); },
    write(serialized) {
      const [pair, ...attrs] = serialized.split(';').map((part) => part.trim());
      const eq = pair.indexOf('=');
      const name = pair.slice(0, eq); const value = pair.slice(eq + 1);
      const expired = attrs.some((part) => /^max-age=0$/i.test(part));
      if (expired) cookies.delete(name); else cookies.set(name, value);
    },
  };
  const adapter = persistence.createCookieStorageAdapter(io);
  let state = createInitialPersistentState();
  state = { ...state, revision: 1, telemetry: recordTelemetry(state.telemetry, { type:'file-restored', target:'c-todo-old', timestamp:'2026-01-01T00:00:00Z' }) };
  await saveArgState(state, adapter);
  assert.ok([...cookies.keys()].some((name) => name.startsWith('rip_lacuna_v1_')), 'ARG progress must be written to cookies');
  const loaded = await loadArgState(adapter);
  assert.equal(loaded.revision, 1);
  assert.equal(deriveProgression(loaded.telemetry).has('restoredTodo'), true);
  await adapter.clear();
  const reset = await loadArgState(adapter);
  assert.equal(reset.revision, 0);
  assert.equal(reset.telemetry.length, 0);
});

test('cookie persistence reconstructs filesystem progress rather than storing the full seed tree', async () => {
  assert.equal(typeof persistence.createCookieStorageAdapter, 'function');
  const writes = [];
  const cookies = new Map();
  const io = {
    read() { return [...cookies.entries()].map(([k,v]) => `${k}=${v}`).join('; '); },
    write(serialized) {
      writes.push(serialized);
      const [pair, ...attrs] = serialized.split(';').map((part) => part.trim());
      const eq = pair.indexOf('='); const name = pair.slice(0, eq); const value = pair.slice(eq + 1);
      if (attrs.some((part) => /^max-age=0$/i.test(part))) cookies.delete(name); else cookies.set(name, value);
    },
  };
  const adapter = persistence.createCookieStorageAdapter(io);
  let state = createInitialPersistentState();
  state = { ...state, revision: 2, telemetry: recordTelemetry(recordTelemetry([], { type:'file-restored', target:'c-todo-old', timestamp:'2026-01-01T00:00:00Z' }), { type:'attribute-changed', target:'c-research', detail:'hidden:false', timestamp:'2026-01-01T00:00:01Z' }) };
  await adapter.save(state);
  const totalCookieBytes = [...cookies.entries()].reduce((n,[k,v]) => n + k.length + v.length, 0);
  assert.ok(totalCookieBytes < 12000, `cookie state should be compact, got ${totalCookieBytes} bytes`);
  const loaded = await adapter.load();
  assert.ok(loaded);
  const todo = loaded.filesystem.volumes['current-c'].nodes.find((n) => n.id === 'c-todo-old');
  const research = loaded.filesystem.volumes['current-c'].nodes.find((n) => n.id === 'c-research');
  assert.equal(todo?.kind === 'file' && todo.deleted, false);
  assert.equal(research?.hidden, false);
});
