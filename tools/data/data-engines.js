const PAPA_URL = 'https://cdn.jsdelivr.net/npm/papaparse@5.7.0/papaparse.min.js';
const XLSX_URL = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
const DUCKDB_ESM_URL = 'https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@1.33.0/+esm';
const PLOT_ESM_URL = 'https://cdn.jsdelivr.net/npm/@observablehq/plot@0.6.17/+esm';

const scriptPromises = new Map();
let duckPromise = null;
let plotPromise = null;
let duckState = null;

function loadScript(url, globalName) {
  if (globalThis[globalName]) return Promise.resolve(globalThis[globalName]);
  if (!scriptPromises.has(url)) {
    scriptPromises.set(url, new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.crossOrigin = 'anonymous';
      script.onload = () => globalThis[globalName] ? resolve(globalThis[globalName]) : reject(new Error(`${globalName} did not initialize.`));
      script.onerror = () => reject(new Error(`Could not load ${url}`));
      document.head.append(script);
    }).catch(error => {
      scriptPromises.delete(url);
      throw error;
    }));
  }
  return scriptPromises.get(url);
}

export function loadPapa() {
  return loadScript(PAPA_URL, 'Papa');
}

export function loadSheetJS() {
  return loadScript(XLSX_URL, 'XLSX');
}

export async function loadPlot() {
  if (!plotPromise) plotPromise = import(PLOT_ESM_URL).catch(error => { plotPromise = null; throw new Error(`Could not load chart engine: ${error?.message || error}`); });
  return plotPromise;
}

export async function getDuckDB(onProgress = () => {}) {
  if (duckState) return duckState;
  if (!duckPromise) {
    duckPromise = (async () => {
      onProgress('Loading DuckDB-Wasm…', 0.05);
      const duckdb = await import(DUCKDB_ESM_URL);
      const bundles = duckdb.getJsDelivrBundles();
      const bundle = await duckdb.selectBundle(bundles);
      onProgress('Starting local SQL engine…', 0.2);
      const workerUrl = URL.createObjectURL(new Blob([`importScripts(${JSON.stringify(bundle.mainWorker)});`], { type: 'text/javascript' }));
      const worker = new Worker(workerUrl);
      const logger = new duckdb.ConsoleLogger(duckdb.LogLevel.WARNING);
      const db = new duckdb.AsyncDuckDB(logger, worker);
      try {
        await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
      } catch (error) {
        worker.terminate();
        URL.revokeObjectURL(workerUrl);
        throw error;
      }
      URL.revokeObjectURL(workerUrl);
      const connection = await db.connect();
      duckState = { duckdb, db, connection, worker };
      onProgress('DuckDB ready', 1);
      return duckState;
    })().catch(error => {
      duckPromise = null;
      throw new Error(`DuckDB-Wasm failed to start: ${error?.message || error}`);
    });
  }
  return duckPromise;
}

function plainValue(value) {
  if (typeof value === 'bigint') {
    const numeric = Number(value);
    return Number.isSafeInteger(numeric) ? numeric : value.toString();
  }
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(plainValue);
  if (value && typeof value === 'object') {
    const result = {};
    for (const [key, inner] of Object.entries(value)) result[key] = plainValue(inner);
    return result;
  }
  return value;
}

export function arrowTableToRows(table) {
  return table.toArray().map(row => {
    const plain = typeof row?.toJSON === 'function' ? row.toJSON() : row;
    return plainValue(plain);
  });
}

export async function registerRowsAsDuckTable(rows, tableName = 'data', onProgress = () => {}) {
  const state = await getDuckDB(onProgress);
  const identifier = tableName.replace(/[^A-Za-z0-9_]/g, '_') || 'data';
  const filename = `toolbox-${Date.now()}-${Math.random().toString(36).slice(2)}.json`;
  const payload = JSON.stringify(rows?.length ? rows : [{}], (_, value) => typeof value === 'bigint' ? value.toString() : value);
  await state.db.registerFileText(filename, payload);
  try {
    await state.connection.query(`DROP TABLE IF EXISTS ${identifier}`);
    await state.connection.insertJSONFromPath(filename, { schema: 'main', name: identifier });
  } finally {
    try { await state.db.dropFile(filename); } catch {}
  }
  return { ...state, tableName: identifier };
}

export const DATA_ENGINE_VERSIONS = Object.freeze({
  papaparse: '5.7.0',
  sheetjs: '0.20.3',
  duckdbWasm: '1.33.0',
  observablePlot: '0.6.17',
});
