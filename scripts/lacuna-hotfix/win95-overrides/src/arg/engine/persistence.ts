import { INITIAL_C_VOLUME } from '../data/filesystem.js';
import { HISTORICAL_D_VOLUME } from '../data/snapshot.js';
import { createFilesystemState, deleteNode, getNode, mountVolume, restoreDeletedNode, setHidden } from './filesystem.js';
import { ArgFilesystemState, ArgPersistentState, ArgTelemetryEvent } from './types.js';

export interface ArgStorageAdapter {
  load(): Promise<ArgPersistentState | null>;
  save(state: ArgPersistentState): Promise<void>;
  clear(): Promise<void>;
}

export interface ArgCookieIo {
  read(): string;
  write(serializedCookie: string): void;
}

interface ArgCookiePayloadV1 {
  v: 1;
  r: number;
  t: ArgTelemetryEvent[];
  s: ArgPersistentState['settings'];
  e: ArgPersistentState['ending'];
}

const COOKIE_PREFIX = 'rip_lacuna_v1_';
const COOKIE_META = `${COOKIE_PREFIX}meta`;
const COOKIE_CHUNK_SIZE = 2800;
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export function createInitialPersistentState(): ArgPersistentState {
  return {
    schemaVersion: 1,
    revision: 0,
    filesystem: createFilesystemState([INITIAL_C_VOLUME]),
    telemetry: [],
    settings: { showHidden: false, reducedMotion: false },
    ending: null,
  };
}

export function createMemoryStorageAdapter(seed: ArgPersistentState | null = null): ArgStorageAdapter & { peek(): ArgPersistentState | null } {
  let current = seed ? JSON.parse(JSON.stringify(seed)) as ArgPersistentState : null;
  return {
    async load() { return current ? JSON.parse(JSON.stringify(current)) as ArgPersistentState : null; },
    async save(state) { current = JSON.parse(JSON.stringify(state)) as ArgPersistentState; },
    async clear() { current = null; },
    peek() { return current ? JSON.parse(JSON.stringify(current)) as ArgPersistentState : null; },
  };
}

function validState(value: unknown): value is ArgPersistentState {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ArgPersistentState>;
  return candidate.schemaVersion === 1 && typeof candidate.revision === 'number' && !!candidate.filesystem && Array.isArray(candidate.telemetry);
}

function findNodeById(filesystem: ArgFilesystemState, nodeId: string) {
  for (const volumeId of filesystem.mountedVolumeIds) {
    const node = filesystem.volumes[volumeId]?.nodes.find((candidate) => candidate.id === nodeId);
    if (node) return node;
  }
  return undefined;
}

function rebuildFilesystemFromTelemetry(events: ArgTelemetryEvent[]): ArgFilesystemState {
  let filesystem = createFilesystemState([INITIAL_C_VOLUME]);
  for (const event of [...events].sort((a, b) => a.sequence - b.sequence)) {
    try {
      if (event.type === 'snapshot-mounted' && event.target === HISTORICAL_D_VOLUME.id) {
        filesystem = mountVolume(filesystem, HISTORICAL_D_VOLUME);
        continue;
      }
      if (event.type === 'file-restored' && event.target) {
        filesystem = restoreDeletedNode(filesystem, event.target);
        continue;
      }
      if (event.type === 'file-deleted' && event.target) {
        const node = findNodeById(filesystem, event.target);
        if (node?.kind === 'file' && !node.deleted) filesystem = deleteNode(filesystem, node.path);
        continue;
      }
      if (event.type === 'attribute-changed' && event.target && event.detail?.toLowerCase().startsWith('hidden:')) {
        const node = findNodeById(filesystem, event.target);
        if (node) filesystem = setHidden(filesystem, node.path, event.detail.toLowerCase() === 'hidden:true');
      }
    } catch {
      // A corrupt/mismatched historical mutation must not make the ARG unloadable.
    }
  }
  return filesystem;
}

function payloadFromState(state: ArgPersistentState): ArgCookiePayloadV1 {
  return { v: 1, r: state.revision, t: state.telemetry, s: state.settings, e: state.ending };
}

function stateFromPayload(payload: unknown): ArgPersistentState | null {
  if (!payload || typeof payload !== 'object') return null;
  const candidate = payload as Partial<ArgCookiePayloadV1>;
  if (candidate.v !== 1 || typeof candidate.r !== 'number' || !Array.isArray(candidate.t) || !candidate.s) return null;
  return {
    schemaVersion: 1,
    revision: candidate.r,
    filesystem: rebuildFilesystemFromTelemetry(candidate.t),
    telemetry: candidate.t,
    settings: candidate.s,
    ending: candidate.e === 'run' || candidate.e === 'export' || candidate.e === 'shutdown' ? candidate.e : null,
  };
}

function parseCookieHeader(header: string): Map<string, string> {
  const values = new Map<string, string>();
  for (const piece of header.split(';')) {
    const part = piece.trim();
    if (!part) continue;
    const equals = part.indexOf('=');
    if (equals <= 0) continue;
    values.set(part.slice(0, equals), part.slice(equals + 1));
  }
  return values;
}

function defaultCookieIo(): ArgCookieIo {
  return {
    read: () => typeof document === 'undefined' ? '' : document.cookie,
    write: (value) => { if (typeof document !== 'undefined') document.cookie = value; },
  };
}

export function createCookieStorageAdapter(io: ArgCookieIo = defaultCookieIo()): ArgStorageAdapter {
  const expireCookie = (name: string): void => io.write(`${name}=; Max-Age=0; Path=/; SameSite=Lax`);
  const currentCookieNames = (): string[] => [...parseCookieHeader(io.read()).keys()].filter((name) => name.startsWith(COOKIE_PREFIX));
  return {
    async load() {
      const cookies = parseCookieHeader(io.read());
      const count = Number.parseInt(cookies.get(COOKIE_META) || '', 10);
      if (!Number.isInteger(count) || count <= 0 || count > 32) return null;
      let encoded = '';
      for (let index = 0; index < count; index += 1) {
        const chunk = cookies.get(`${COOKIE_PREFIX}${index}`);
        if (chunk === undefined) return null;
        encoded += chunk;
      }
      try {
        return stateFromPayload(JSON.parse(decodeURIComponent(encoded)));
      } catch {
        return null;
      }
    },
    async save(state) {
      const encoded = encodeURIComponent(JSON.stringify(payloadFromState(state)));
      const chunks: string[] = [];
      for (let offset = 0; offset < encoded.length; offset += COOKIE_CHUNK_SIZE) chunks.push(encoded.slice(offset, offset + COOKIE_CHUNK_SIZE));
      for (const name of currentCookieNames()) expireCookie(name);
      chunks.forEach((chunk, index) => io.write(`${COOKIE_PREFIX}${index}=${chunk}; Max-Age=${COOKIE_MAX_AGE_SECONDS}; Path=/; SameSite=Lax`));
      io.write(`${COOKIE_META}=${chunks.length}; Max-Age=${COOKIE_MAX_AGE_SECONDS}; Path=/; SameSite=Lax`);
    },
    async clear() {
      for (const name of currentCookieNames()) expireCookie(name);
    },
  };
}

export async function loadArgState(adapter: ArgStorageAdapter = createBrowserStorageAdapter()): Promise<ArgPersistentState> {
  try {
    const state = await adapter.load();
    return validState(state) ? state : createInitialPersistentState();
  } catch {
    return createInitialPersistentState();
  }
}

export async function saveArgState(state: ArgPersistentState, adapter: ArgStorageAdapter = createBrowserStorageAdapter()): Promise<void> {
  const existing = await adapter.load();
  if (existing && existing.revision > state.revision) throw new Error(`Refusing stale ARG state write: ${state.revision} < ${existing.revision}`);
  await adapter.save(state);
}

export async function resetArgState(adapter: ArgStorageAdapter = createBrowserStorageAdapter()): Promise<ArgPersistentState> {
  await adapter.clear();
  const initial = createInitialPersistentState();
  await adapter.save(initial);
  return initial;
}

let browserAdapter: ArgStorageAdapter | null = null;
export function createBrowserStorageAdapter(): ArgStorageAdapter {
  if (!browserAdapter) browserAdapter = createCookieStorageAdapter();
  return browserAdapter;
}

// Retained as an explicit utility for migrations/debugging only. Browser ARG progress does not use it.
export function createLocalStorageAdapter(): ArgStorageAdapter {
  const KEY = 'rip-lacuna-fallback-v1';
  return {
    async load() {
      if (typeof localStorage === 'undefined') return null;
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      try { return JSON.parse(raw) as ArgPersistentState; } catch { return null; }
    },
    async save(state) { if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, JSON.stringify(state)); },
    async clear() { if (typeof localStorage !== 'undefined') localStorage.removeItem(KEY); },
  };
}
