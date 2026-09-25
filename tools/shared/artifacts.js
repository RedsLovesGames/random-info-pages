const DB_NAME = 'rip-toolbox';
const STORE = 'artifacts';
const VERSION = 1;
const memory = new Map();
export const DEFAULT_ARTIFACT_TTL = 24 * 60 * 60 * 1000;

function makeId() {
  if (globalThis.crypto?.randomUUID) return `tb_${globalThis.crypto.randomUUID()}`;
  return `tb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}

function openDb() {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function normalizeTtl(ttlMs) {
  const value = Number(ttlMs);
  return Number.isFinite(value) ? value : DEFAULT_ARTIFACT_TTL;
}

export async function putArtifact({ data, type, name = '', sourceWorkspace = '', ttlMs = DEFAULT_ARTIFACT_TTL, metadata = {} } = {}) {
  const now = Date.now();
  const artifact = {
    id: makeId(),
    data,
    type: type || 'application/octet-stream',
    name: String(name || ''),
    sourceWorkspace: String(sourceWorkspace || ''),
    metadata: metadata && typeof metadata === 'object' ? { ...metadata } : {},
    createdAt: now,
    expiresAt: now + normalizeTtl(ttlMs),
  };
  const db = await openDb().catch(() => null);
  if (!db) {
    memory.set(artifact.id, artifact);
    return artifact.id;
  }
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(artifact);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  return artifact.id;
}

export async function getArtifact(id) {
  if (!id) return null;
  const db = await openDb().catch(() => null);
  let artifact = null;
  if (!db) artifact = memory.get(id) || null;
  else {
    artifact = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const request = tx.objectStore(STORE).get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    }).catch(() => null);
    db.close();
  }
  if (artifact && artifact.expiresAt <= Date.now()) {
    await deleteArtifact(id);
    return null;
  }
  return artifact;
}

export async function listArtifacts({ includeExpired = false } = {}) {
  const now = Date.now();
  const db = await openDb().catch(() => null);
  let artifacts;
  if (!db) artifacts = [...memory.values()];
  else {
    artifacts = await new Promise(resolve => {
      const tx = db.transaction(STORE, 'readonly');
      const request = tx.objectStore(STORE).getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    });
    db.close();
  }
  if (!includeExpired) artifacts = artifacts.filter(item => item.expiresAt > now);
  return artifacts.sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteArtifact(id) {
  memory.delete(id);
  const db = await openDb().catch(() => null);
  if (!db) return true;
  await new Promise(resolve => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = resolve;
    tx.onerror = resolve;
  });
  db.close();
  return true;
}

export async function clearExpiredArtifacts(now = Date.now()) {
  for (const [id, artifact] of memory) if (artifact.expiresAt <= now) memory.delete(id);
  const db = await openDb().catch(() => null);
  if (!db) return;
  const artifacts = await new Promise(resolve => {
    const tx = db.transaction(STORE, 'readonly');
    const request = tx.objectStore(STORE).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => resolve([]);
  });
  db.close();
  await Promise.all(artifacts.filter(item => item.expiresAt <= now).map(item => deleteArtifact(item.id)));
}

export async function clearAllArtifacts() {
  memory.clear();
  const db = await openDb().catch(() => null);
  if (!db) return true;
  await new Promise(resolve => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).clear();
    tx.oncomplete = resolve;
    tx.onerror = resolve;
  });
  db.close();
  return true;
}

export function artifactHref(route, id, { action = '' } = {}) {
  const separator = String(route).includes('?') ? '&' : '?';
  const params = new URLSearchParams({ artifact: String(id || '') });
  if (action) params.set('action', action);
  return `${route}${separator}${params.toString()}`;
}

export function artifactIdFromSearch(search = '') {
  const value = new URLSearchParams(search).get('artifact');
  return value ? value.trim() : null;
}

export async function artifactText(artifact) {
  if (!artifact) return '';
  if (typeof artifact.data === 'string') return artifact.data;
  if (artifact.data instanceof Blob) return artifact.data.text();
  if (artifact.data instanceof ArrayBuffer) return new TextDecoder().decode(artifact.data);
  if (ArrayBuffer.isView(artifact.data)) return new TextDecoder().decode(artifact.data);
  if (artifact.type?.includes('json') || typeof artifact.data === 'object') return JSON.stringify(artifact.data, null, 2);
  return String(artifact.data ?? '');
}
