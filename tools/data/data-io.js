import { normalizeRows, rowsToCsv } from './data-core.js';
import { arrowTableToRows, getDuckDB, loadPapa, loadSheetJS, registerRowsAsDuckTable } from './data-engines.js';

function extension(name = '') {
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot).toLowerCase() : '';
}

function uniqueHeader(name, used, index) {
  const base = String(name || `column_${index + 1}`).trim() || `column_${index + 1}`;
  let candidate = base;
  let counter = 2;
  while (used.has(candidate)) candidate = `${base}_${counter++}`;
  used.add(candidate);
  return candidate;
}

function flattenObject(value, prefix = '', out = {}) {
  if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
    for (const [key, inner] of Object.entries(value)) flattenObject(inner, prefix ? `${prefix}.${key}` : key, out);
  } else {
    out[prefix || 'value'] = Array.isArray(value) ? JSON.stringify(value) : value;
  }
  return out;
}

function normalizeJsonPayload(payload) {
  const rows = Array.isArray(payload) ? payload : payload && typeof payload === 'object' ? [payload] : [{ value: payload }];
  return normalizeRows(rows.map(row => row && typeof row === 'object' && !Array.isArray(row) ? flattenObject(row) : { value: row }));
}

async function parseDelimited(file, delimiter) {
  const Papa = await loadPapa();
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: 'greedy',
      delimiter,
      transformHeader(header, index) {
        if (!this.__usedHeaders) this.__usedHeaders = new Set();
        return uniqueHeader(header, this.__usedHeaders, index);
      },
      complete(result) {
        if (result.errors?.length && !result.data?.length) return reject(new Error(result.errors[0].message || 'Could not parse delimited file.'));
        resolve({ rows: normalizeRows(result.data || []), meta: { delimiter: result.meta?.delimiter || delimiter || ',' } });
      },
      error(error) { reject(error); },
    });
  });
}

async function parseSpreadsheet(file) {
  const XLSX = await loadSheetJS();
  const workbook = XLSX.read(await file.arrayBuffer(), { cellDates: true });
  const firstName = workbook.SheetNames[0];
  if (!firstName) throw new Error('Spreadsheet contains no worksheets.');
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstName], { defval: null, raw: true });
  return { rows: normalizeRows(rows), meta: { sheet: firstName, sheets: workbook.SheetNames } };
}

async function parseParquet(file, onProgress) {
  const { db, connection } = await getDuckDB(onProgress);
  const name = `input-${Date.now()}.parquet`;
  await db.registerFileBuffer(name, new Uint8Array(await file.arrayBuffer()));
  try {
    const table = await connection.query(`SELECT * FROM read_parquet('${name}')`);
    return { rows: normalizeRows(arrowTableToRows(table)), meta: { engine: 'DuckDB-Wasm', format: 'Parquet' } };
  } finally {
    try { await db.dropFile(name); } catch {}
  }
}

async function parseSQLite(file, onProgress) {
  const { db, connection } = await getDuckDB(onProgress);
  const name = `input-${Date.now()}.sqlite`;
  await db.registerFileBuffer(name, new Uint8Array(await file.arrayBuffer()));
  try {
    onProgress?.('Loading SQLite scanner…', 0.45);
    await connection.query('INSTALL sqlite_scanner; LOAD sqlite_scanner;');
    await connection.query(`ATTACH '${name}' AS sqlite_source (TYPE sqlite)`);
    const tableList = await connection.query("SELECT table_name FROM information_schema.tables WHERE table_catalog = 'sqlite_source' AND table_schema = 'main' ORDER BY table_name");
    const tables = arrowTableToRows(tableList).map(row => row.table_name).filter(Boolean);
    if (!tables.length) throw new Error('SQLite database contains no readable tables.');
    const first = String(tables[0]).replaceAll('"', '""');
    const result = await connection.query(`SELECT * FROM sqlite_source.main."${first}"`);
    return { rows: normalizeRows(arrowTableToRows(result)), meta: { engine: 'DuckDB-Wasm', format: 'SQLite', table: tables[0], tables } };
  } finally {
    try { await connection.query('DETACH sqlite_source'); } catch {}
    try { await db.dropFile(name); } catch {}
  }
}

export async function parseDataFile(file, onProgress = () => {}) {
  const ext = extension(file?.name || '');
  if (!file) throw new Error('Choose a data file first.');
  onProgress('Reading file…', 0.05);
  if (ext === '.csv') return { ...(await parseDelimited(file, ',')), format: 'CSV' };
  if (ext === '.tsv') return { ...(await parseDelimited(file, '\t')), format: 'TSV' };
  if (ext === '.json') {
    const payload = JSON.parse(await file.text());
    return { rows: normalizeJsonPayload(payload), meta: {}, format: 'JSON' };
  }
  if (ext === '.jsonl' || ext === '.ndjson') {
    const rows = (await file.text()).split(/\r?\n/).map(line => line.trim()).filter(Boolean).map((line, index) => {
      try { return JSON.parse(line); } catch { throw new Error(`Invalid JSONL on line ${index + 1}.`); }
    });
    return { rows: normalizeJsonPayload(rows), meta: {}, format: 'JSONL' };
  }
  if (ext === '.xlsx' || ext === '.xls' || ext === '.ods') return { ...(await parseSpreadsheet(file)), format: 'Spreadsheet' };
  if (ext === '.parquet') return { ...(await parseParquet(file, onProgress)), format: 'Parquet' };
  if (ext === '.sqlite' || ext === '.sqlite3' || ext === '.db') return { ...(await parseSQLite(file, onProgress)), format: 'SQLite' };
  throw new Error('Unsupported file. Try CSV, TSV, JSON, JSONL, XLSX, Parquet, or SQLite.');
}

function blobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportRows(rows, format, baseName = 'data', onProgress = () => {}) {
  const normalized = normalizeRows(rows);
  const safeBase = String(baseName || 'data').replace(/\.[^.]+$/, '').replace(/[^A-Za-z0-9._-]+/g, '-') || 'data';
  if (format === 'csv' || format === 'tsv') {
    const delimiter = format === 'tsv' ? '\t' : ',';
    const blob = new Blob([rowsToCsv(normalized, delimiter)], { type: format === 'tsv' ? 'text/tab-separated-values' : 'text/csv' });
    blobDownload(blob, `${safeBase}.${format}`);
    return;
  }
  if (format === 'json' || format === 'jsonl') {
    const text = format === 'json' ? JSON.stringify(normalized, null, 2) : normalized.map(row => JSON.stringify(row)).join('\n');
    blobDownload(new Blob([text], { type: 'application/json' }), `${safeBase}.${format}`);
    return;
  }
  if (format === 'xlsx') {
    const XLSX = await loadSheetJS();
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(normalized), 'Data');
    XLSX.writeFile(workbook, `${safeBase}.xlsx`);
    return;
  }
  if (format === 'parquet') {
    onProgress('Preparing Parquet export…', 0.15);
    const { db, connection, tableName } = await registerRowsAsDuckTable(normalized, 'data_export', onProgress);
    const output = `export-${Date.now()}.parquet`;
    await connection.query(`COPY ${tableName} TO '${output}' (FORMAT PARQUET)`);
    const bytes = await db.copyFileToBuffer(output);
    try { await db.dropFile(output); } catch {}
    blobDownload(new Blob([bytes], { type: 'application/octet-stream' }), `${safeBase}.parquet`);
    return;
  }
  throw new Error(`Unsupported export format: ${format}`);
}
