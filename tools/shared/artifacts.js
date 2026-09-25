const DB_NAME = 'rip-toolbox';
const STORE = 'artifacts';
const VERSION = 1;
const memory = new Map();
const DEFAULT_TTL = 24 * 60 * 60 * 1000;

function makeId() {
  if (globalThis.crypto?.randomUUID) return `tb_${crypto.randomUUID()}`;
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

export async function putArtifact({ data, type, name = '', sourceWorkspace = '', ttlMs = DEFAULT_TTL } = {}) {
  const artifact = { id: makeId(), data, type: type || 'application/octet-stream', name, sourceWorkspace, createdAt: Date.now(), expiresAt: Date.now() + ttlMs };
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
