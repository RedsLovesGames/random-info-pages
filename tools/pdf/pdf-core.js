const clone = value => typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function normalizeSelection(selection, pageCount) {
  return [...new Set((selection || []).map(Number).filter(n => Number.isInteger(n) && n >= 1 && n <= pageCount))].sort((a, b) => a - b);
}

export function createPdfState(pageCount, sourceDoc = 0) {
  const count = Math.max(0, Number(pageCount) || 0);
  return {
    version: 1,
    nextPageId: count + 1,
    pages: Array.from({ length: count }, (_, i) => ({ id: `p${i + 1}`, sourceDoc, sourceIndex: i, rotation: 0, blank: false })),
    watermark: null,
    pageNumbers: null,
  };
}

function withPages(state, pages, nextPageId = state.nextPageId) {
  return { ...clone(state), pages, nextPageId };
}

export function rotatePages(state, selection, degrees = 90) {
  const selected = new Set(normalizeSelection(selection, state.pages.length));
  return withPages(state, state.pages.map((page, index) => selected.has(index + 1)
    ? { ...page, rotation: ((Number(page.rotation || 0) + degrees) % 360 + 360) % 360 }
    : { ...page }));
}

export function deletePages(state, selection) {
  const selected = new Set(normalizeSelection(selection, state.pages.length));
  if (!selected.size) return clone(state);
  const pages = state.pages.filter((_, index) => !selected.has(index + 1)).map(page => ({ ...page }));
  if (!pages.length) throw new Error('A PDF must keep at least one page.');
  return withPages(state, pages);
}

export function duplicatePages(state, selection) {
  const selected = new Set(normalizeSelection(selection, state.pages.length));
  let nextPageId = state.nextPageId || state.pages.length + 1;
  const pages = [];
  state.pages.forEach((page, index) => {
    pages.push({ ...page });
    if (selected.has(index + 1)) pages.push({ ...page, id: `p${nextPageId++}` });
  });
  return withPages(state, pages, nextPageId);
}

export function movePages(state, selection, delta) {
  const normalized = normalizeSelection(selection, state.pages.length);
  if (!normalized.length || !Number.isFinite(Number(delta)) || Number(delta) === 0) return clone(state);
  const selected = new Set(normalized);
  const moving = state.pages.filter((_, index) => selected.has(index + 1)).map(page => ({ ...page }));
  const remaining = state.pages.filter((_, index) => !selected.has(index + 1)).map(page => ({ ...page }));
  const originalStart = normalized[0] - 1;
  const removedBefore = normalized.filter(n => n - 1 < originalStart).length;
  const target = clamp(originalStart + Number(delta) - removedBefore, 0, remaining.length);
  remaining.splice(target, 0, ...moving);
  return withPages(state, remaining);
}

export function reorderPage(state, fromPage, toPage) {
  const from = Number(fromPage) - 1;
  const to = Number(toPage) - 1;
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < 0 || from >= state.pages.length || to >= state.pages.length || from === to) return clone(state);
  const pages = state.pages.map(page => ({ ...page }));
  const [page] = pages.splice(from, 1);
  pages.splice(to, 0, page);
  return withPages(state, pages);
}

export function appendSourcePages(state, sourceDoc, pageCount) {
  let nextPageId = state.nextPageId || state.pages.length + 1;
  const extra = Array.from({ length: Math.max(0, Number(pageCount) || 0) }, (_, sourceIndex) => ({
    id: `p${nextPageId++}`, sourceDoc, sourceIndex, rotation: 0, blank: false,
  }));
  return withPages(state, [...state.pages.map(page => ({ ...page })), ...extra], nextPageId);
}

export function insertBlankPage(state, afterPage = state.pages.length, size = { width: 612, height: 792 }) {
  const nextPageId = state.nextPageId || state.pages.length + 1;
  const index = clamp(Number(afterPage) || 0, 0, state.pages.length);
  const pages = state.pages.map(page => ({ ...page }));
  pages.splice(index, 0, { id: `p${nextPageId}`, sourceDoc: null, sourceIndex: null, rotation: 0, blank: true, width: size.width || 612, height: size.height || 792 });
  return withPages(state, pages, nextPageId + 1);
}

export function setWatermark(state, config) {
  return { ...clone(state), watermark: config?.text ? { text: String(config.text), opacity: Number(config.opacity ?? .18), angle: Number(config.angle ?? -35) } : null };
}

export function setPageNumbers(state, config = {}) {
  return { ...clone(state), pageNumbers: config === false ? null : { start: Math.max(1, Number(config.start) || 1), position: config.position || 'bottom-center' } };
}

export function subsetState(state, selection) {
  const selected = new Set(normalizeSelection(selection, state.pages.length));
  if (!selected.size) throw new Error('Select at least one page.');
  return { ...clone(state), pages: state.pages.filter((_, index) => selected.has(index + 1)).map(page => ({ ...page })) };
}

export function parsePageRanges(value, pageCount) {
  const pages = new Set();
  for (const token of String(value || '').split(',').map(v => v.trim()).filter(Boolean)) {
    const match = token.match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!match) throw new Error(`Invalid page range: ${token}`);
    const start = Number(match[1]), end = Number(match[2] || match[1]);
    if (start < 1 || end < start || end > pageCount) throw new Error(`Page range out of bounds: ${token}`);
    for (let n = start; n <= end; n++) pages.add(n);
  }
  return [...pages].sort((a, b) => a - b);
}
