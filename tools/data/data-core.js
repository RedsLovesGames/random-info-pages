function cloneRow(row) {
  return { ...(row || {}) };
}

function orderedKeys(rows) {
  const keys = [];
  const seen = new Set();
  for (const row of rows || []) {
    for (const key of Object.keys(row || {})) {
      if (!seen.has(key)) {
        seen.add(key);
        keys.push(key);
      }
    }
  }
  return keys;
}

export function normalizeRows(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const keys = orderedKeys(list);
  return list.map(row => Object.fromEntries(keys.map(key => [key, row?.[key] ?? null])));
}

function isMissing(value) {
  return value === null || value === undefined || value === '';
}

function toFiniteNumber(value) {
  if (isMissing(value)) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function looksDate(value) {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) return true;
  if (typeof value !== 'string') return false;
  const text = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}(?:[T ][0-9:.+\-Z]+)?$/.test(text)) return false;
  return !Number.isNaN(Date.parse(text));
}

export function inferColumns(rows) {
  const normalized = normalizeRows(rows);
  return orderedKeys(normalized).map(name => {
    const values = normalized.map(row => row[name]).filter(value => !isMissing(value));
    let type = 'text';
    if (values.length && values.every(value => typeof value === 'number' && Number.isFinite(value))) type = 'number';
    else if (values.length && values.every(value => typeof value === 'boolean')) type = 'boolean';
    else if (values.length && values.every(looksDate)) type = 'date';
    return { name, type, missing: normalized.length - values.length };
  });
}

function stableValue(value) {
  if (value === undefined) return '__undefined__';
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys.map(key => `${JSON.stringify(key)}:${stableValue(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function dedupeRows(rows, columns = null) {
  const normalized = normalizeRows(rows);
  const keys = Array.isArray(columns) && columns.length ? columns : orderedKeys(normalized);
  const seen = new Set();
  return normalized.filter(row => {
    const fingerprint = keys.map(key => stableValue(row[key])).join('|');
    if (seen.has(fingerprint)) return false;
    seen.add(fingerprint);
    return true;
  });
}

export function trimStringCells(rows) {
  return normalizeRows(rows).map(row => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value])));
}

export function fillMissingValues(rows, replacement = null, columns = null) {
  const selected = Array.isArray(columns) && columns.length ? new Set(columns) : null;
  return normalizeRows(rows).map(row => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, (!selected || selected.has(key)) && isMissing(value) ? replacement : value])));
}

export function renameColumn(rows, from, to) {
  if (!from || !to || from === to) return normalizeRows(rows);
  return normalizeRows(rows).map(row => {
    const next = {};
    for (const [key, value] of Object.entries(row)) next[key === from ? to : key] = value;
    return next;
  });
}

export function removeColumn(rows, column) {
  return normalizeRows(rows).map(row => {
    const next = cloneRow(row);
    delete next[column];
    return next;
  });
}

export function splitColumn(rows, column, separator = ',', names = ['part_1', 'part_2']) {
  const outputNames = names.filter(Boolean);
  return normalizeRows(rows).map(row => {
    const next = cloneRow(row);
    const parts = String(row[column] ?? '').split(separator);
    outputNames.forEach((name, index) => { next[name] = parts[index] ?? ''; });
    return next;
  });
}

export function combineColumns(rows, columns, target, separator = ' ') {
  return normalizeRows(rows).map(row => ({
    ...row,
    [target]: (columns || []).map(column => row[column]).filter(value => !isMissing(value)).join(separator),
  }));
}

export function transposeTable(rows) {
  const normalized = normalizeRows(rows);
  const keys = orderedKeys(normalized);
  return keys.map(field => {
    const row = { field };
    normalized.forEach((source, index) => { row[`row_${index + 1}`] = source[field]; });
    return row;
  });
}

export function groupRows(rows, groupColumn, valueColumn = null) {
  const groups = new Map();
  for (const row of normalizeRows(rows)) {
    const key = row[groupColumn];
    const fingerprint = stableValue(key);
    if (!groups.has(fingerprint)) groups.set(fingerprint, { key, rows: [] });
    groups.get(fingerprint).rows.push(row);
  }
  return [...groups.values()].map(group => {
    const values = valueColumn ? group.rows.map(row => toFiniteNumber(row[valueColumn])).filter(value => value !== null) : [];
    const sum = values.reduce((total, value) => total + value, 0);
    return {
      [groupColumn]: group.key,
      count: group.rows.length,
      ...(valueColumn ? { sum, mean: values.length ? sum / values.length : null } : {}),
    };
  });
}

export function pivotRows(rows, rowColumn, columnColumn, valueColumn) {
  const normalized = normalizeRows(rows);
  const columnValues = [];
  const seenColumns = new Set();
  const grouped = new Map();
  for (const row of normalized) {
    const columnKey = String(row[columnColumn] ?? '');
    if (!seenColumns.has(columnKey)) {
      seenColumns.add(columnKey);
      columnValues.push(columnKey);
    }
    const rowKey = stableValue(row[rowColumn]);
    if (!grouped.has(rowKey)) grouped.set(rowKey, { [rowColumn]: row[rowColumn], values: new Map() });
    const entry = grouped.get(rowKey);
    const numeric = toFiniteNumber(row[valueColumn]);
    const current = entry.values.get(columnKey);
    entry.values.set(columnKey, numeric !== null ? (Number.isFinite(current) ? current + numeric : numeric) : row[valueColumn]);
  }
  return [...grouped.values()].map(entry => {
    const result = { [rowColumn]: entry[rowColumn] };
    for (const columnValue of columnValues) result[columnValue] = entry.values.has(columnValue) ? entry.values.get(columnValue) : null;
    return result;
  });
}

function numericValues(rows, column) {
  return normalizeRows(rows).map(row => toFiniteNumber(row[column])).filter(value => value !== null);
}

function quantile(sorted, q) {
  if (!sorted.length) return null;
  if (sorted.length === 1) return sorted[0];
  const index = (sorted.length - 1) * q;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

export function summarizeColumn(rows, column) {
  const normalized = normalizeRows(rows);
  const values = numericValues(normalized, column).sort((a, b) => a - b);
  const count = values.length;
  const mean = count ? values.reduce((sum, value) => sum + value, 0) / count : null;
  const variance = count > 1 ? values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (count - 1) : 0;
  return {
    column,
    count,
    missing: normalized.length - count,
    mean,
    median: quantile(values, 0.5),
    min: count ? values[0] : null,
    max: count ? values.at(-1) : null,
    sd: count ? Math.sqrt(variance) : null,
    p25: quantile(values, 0.25),
    p75: quantile(values, 0.75),
  };
}

export function pearsonCorrelation(rows, xColumn, yColumn) {
  const pairs = normalizeRows(rows).map(row => [toFiniteNumber(row[xColumn]), toFiniteNumber(row[yColumn])]).filter(([x, y]) => x !== null && y !== null);
  if (pairs.length < 2) return null;
  const meanX = pairs.reduce((sum, [x]) => sum + x, 0) / pairs.length;
  const meanY = pairs.reduce((sum, [, y]) => sum + y, 0) / pairs.length;
  let numerator = 0;
  let dx2 = 0;
  let dy2 = 0;
  for (const [x, y] of pairs) {
    const dx = x - meanX;
    const dy = y - meanY;
    numerator += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }
  const denominator = Math.sqrt(dx2 * dy2);
  if (!denominator) return null;
  const result = numerator / denominator;
  return Math.abs(result - 1) < 1e-12 ? 1 : Math.abs(result + 1) < 1e-12 ? -1 : result;
}

export function frequencyTable(rows, column) {
  const counts = new Map();
  for (const row of normalizeRows(rows)) {
    const key = row[column];
    const fingerprint = stableValue(key);
    const existing = counts.get(fingerprint);
    if (existing) existing.count += 1;
    else counts.set(fingerprint, { value: key, count: 1 });
  }
  return [...counts.values()].sort((a, b) => b.count - a.count);
}

export function sortRows(rows, column, direction = 'asc') {
  const factor = direction === 'desc' ? -1 : 1;
  return [...(rows || [])].sort((a, b) => {
    const av = a?.[column], bv = b?.[column];
    if (isMissing(av) && isMissing(bv)) return 0;
    if (isMissing(av)) return 1;
    if (isMissing(bv)) return -1;
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * factor;
    return String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' }) * factor;
  });
}

export function filterRows(rows, column, operator, needle) {
  const normalizedNeedle = String(needle ?? '').toLowerCase();
  return normalizeRows(rows).filter(row => {
    const value = row[column];
    if (operator === 'missing') return isMissing(value);
    if (operator === 'not-missing') return !isMissing(value);
    const text = String(value ?? '').toLowerCase();
    const numericValue = toFiniteNumber(value);
    const numericNeedle = toFiniteNumber(needle);
    if (operator === 'equals') return text === normalizedNeedle;
    if (operator === 'not-equals') return text !== normalizedNeedle;
    if (operator === 'starts') return text.startsWith(normalizedNeedle);
    if (operator === 'gt') return numericValue !== null && numericNeedle !== null && numericValue > numericNeedle;
    if (operator === 'lt') return numericValue !== null && numericNeedle !== null && numericValue < numericNeedle;
    return text.includes(normalizedNeedle);
  });
}

export function searchRows(rows, query) {
  const list = Array.isArray(rows) ? rows : [];
  const q = String(query || '').trim().toLowerCase();
  if (!q) return [...list];
  return list.filter(row => Object.values(row || {}).some(value => String(value ?? '').toLowerCase().includes(q)));
}

export function coerceColumn(rows, column, type) {
  return normalizeRows(rows).map(row => {
    const next = cloneRow(row);
    const value = row[column];
    if (isMissing(value)) return next;
    if (type === 'number') {
      next[column] = toFiniteNumber(value);
    } else if (type === 'boolean') {
      const text = String(value).trim().toLowerCase();
      next[column] = ['true', '1', 'yes', 'y'].includes(text) ? true : ['false', '0', 'no', 'n'].includes(text) ? false : null;
    } else if (type === 'date') {
      const date = new Date(value);
      next[column] = Number.isNaN(date.valueOf()) ? null : date.toISOString();
    } else {
      next[column] = String(value);
    }
    return next;
  });
}

export function rowsToCsv(rows, delimiter = ',') {
  const normalized = normalizeRows(rows);
  const columns = orderedKeys(normalized);
  const quote = value => {
    const text = value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
    return /["\r\n,\t]/.test(text) || text.includes(delimiter) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  return [columns.map(quote).join(delimiter), ...normalized.map(row => columns.map(column => quote(row[column])).join(delimiter))].join('\n');
}
