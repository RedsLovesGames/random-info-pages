export function sanitizeFilename(value) {
  const clean = String(value ?? '').replace(/[\\/\x00-\x1f\x7f]/g, '_').trim().replace(/[ .]+$/g, '');
  return clean || 'file';
}

export function splitFilename(name) {
  const safe = sanitizeFilename(name);
  const dot = safe.lastIndexOf('.');
  if (dot <= 0 || dot === safe.length - 1) return { stem: safe, ext: '' };
  return { stem: safe.slice(0, dot), ext: safe.slice(dot) };
}

function applyCase(value, mode) {
  if (mode === 'lower') return value.toLowerCase();
  if (mode === 'upper') return value.toUpperCase();
  if (mode === 'title') return value.replace(/\b\w/g, letter => letter.toUpperCase());
  return value;
}

export function buildRenamePlan(records, options = {}) {
  const start = Number.isFinite(Number(options.numberStart)) ? Number(options.numberStart) : 1;
  const pad = Math.max(1, Math.min(8, Number(options.numberPad) || 2));
  return Array.from(records || []).map((record, index) => {
    const originalName = sanitizeFilename(record?.name || 'file');
    const parts = splitFilename(originalName);
    let stem = parts.stem;
    if (options.find) stem = stem.split(String(options.find)).join(String(options.replace ?? ''));
    stem = applyCase(stem, options.caseMode);
    let ext = parts.ext;
    if (options.caseMode === 'lower') ext = ext.toLowerCase();
    if (options.caseMode === 'upper') ext = ext.toUpperCase();
    stem = `${options.prefix || ''}${stem}${options.suffix || ''}`;
    const number = options.numbering ? `${String(start + index).padStart(pad, '0')}-` : '';
    const outputName = sanitizeFilename(`${number}${stem}${ext}`);
    return { ...record, originalName, outputName };
  });
}

export function groupDuplicateRecords(records) {
  const groups = new Map();
  for (const record of records || []) {
    if (!record?.hash || !Number.isFinite(Number(record.size))) continue;
    const key = `${Number(record.size)}:${record.hash}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(record);
  }
  return [...groups.values()].filter(group => group.length > 1);
}

export function toHexPreview(bytes, limit = 64) {
  return [...(bytes || new Uint8Array()).slice(0, limit)].map(byte => byte.toString(16).padStart(2, '0')).join(' ');
}

export function sniffFileType(bytes) {
  const b = bytes || new Uint8Array();
  const starts = (...values) => values.every((value, index) => b[index] === value);
  if (starts(0x50,0x4b,0x03,0x04) || starts(0x50,0x4b,0x05,0x06) || starts(0x50,0x4b,0x07,0x08)) return 'ZIP archive';
  if (starts(0x25,0x50,0x44,0x46)) return 'PDF document';
  if (starts(0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a)) return 'PNG image';
  if (starts(0xff,0xd8,0xff)) return 'JPEG image';
  if (starts(0x47,0x49,0x46,0x38)) return 'GIF image';
  if (starts(0x52,0x49,0x46,0x46) && b[8] === 0x57 && b[9] === 0x41 && b[10] === 0x56 && b[11] === 0x45) return 'WAVE audio';
  if (b.length >= 12 && b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) return 'ISO Base Media';
  return 'Unknown / generic file';
}

export function extensionOf(name) {
  return splitFilename(name).ext.toLowerCase();
}
