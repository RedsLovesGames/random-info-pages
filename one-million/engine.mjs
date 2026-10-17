/** The field uses a decimal spatial hierarchy: every consecutive power of ten
 * forms a rectangle. All one million positions are real, unique, and countable. */
export const MILLION = 1_000_000;
export const DEFAULT_STATE = Object.freeze({ exponent: 0, denominator: MILLION, quantities: [1, 1000, 100000], style: 'field', camera: null });

function integer(value, name) {
  if (typeof value === 'string' && !/^\d+$/.test(value)) throw new Error(`${name} must be a whole number, written using digits.`);
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isSafeInteger(number) || number < 0) throw new Error(`${name} must be a whole number from 0 to 9,007,199,254,740,991.`);
  return number;
}

export function validateComparison(quantity, denominator) {
  quantity = integer(quantity, 'Quantity');
  denominator = integer(denominator, 'Denominator');
  if (denominator === 0) throw new Error('The denominator must be greater than zero.');
  if (quantity > denominator) throw new Error('Each quantity must be less than or equal to the denominator.');
  return { quantity, denominator };
}

export function proportion(quantity, denominator) {
  const valid = validateComparison(quantity, denominator);
  return valid.quantity / valid.denominator;
}

export function areaSquareSide(quantity, denominator, availableSide) {
  if (!Number.isFinite(availableSide) || availableSide < 0) throw new RangeError('Available square side must be a non-negative number.');
  return availableSide * Math.sqrt(proportion(quantity, denominator));
}

export function indexToPoint(index) {
  if (!Number.isInteger(index) || index < 0 || index >= MILLION) throw new Error('Unit index is outside the million.');
  let x = 0, y = 0;
  for (let place = 1; place <= 100; place *= 10) {
    x += (index % 10) * place;
    index = Math.floor(index / 10);
    y += (index % 10) * place;
    index = Math.floor(index / 10);
  }
  return { x, y };
}

export function pointToIndex(x, y) {
  x = Math.floor(x); y = Math.floor(y);
  if (!Number.isFinite(x + y) || x < 0 || y < 0 || x >= 1000 || y >= 1000) return null;
  let index = 0;
  for (let place = 1; place <= 10000; place *= 100) {
    index += (x % 10) * place + (y % 10) * place * 10;
    x = Math.floor(x / 10); y = Math.floor(y / 10);
  }
  return index;
}

export function stageBounds(exponent) {
  if (!Number.isInteger(exponent) || exponent < 0 || exponent > 6) throw new Error('Scale must be a power from zero through six.');
  return { x: 0, y: 0, w: 10 ** Math.ceil(exponent / 2), h: 10 ** Math.floor(exponent / 2) };
}

export function worldToScreen(point, camera, viewport) {
  return { x: (point.x - camera.x) * camera.scale + viewport.width / 2, y: (point.y - camera.y) * camera.scale + viewport.height / 2 };
}
export function screenToWorld(point, camera, viewport) {
  return { x: (point.x - viewport.width / 2) / camera.scale + camera.x, y: (point.y - viewport.height / 2) / camera.scale + camera.y };
}
export function zoomAt(camera, factor, anchor, viewport) {
  const point = screenToWorld(anchor, camera, viewport);
  const scale = Math.min(200, Math.max(0.04, camera.scale * factor));
  return { x: point.x - (anchor.x - viewport.width / 2) / scale, y: point.y - (anchor.y - viewport.height / 2) / scale, scale };
}

/** Exact rational intersection with a prefix quantity; only the final conversion
 * to a paint fraction uses a floating point number. Safe integers never multiply
 * in Number space. Tile intervals are disjoint and cover every grid position. */
export function tileCoverage(tile, quantity, denominator) {
  const d = BigInt(denominator);
  const remaining = BigInt(quantity) * BigInt(MILLION) - BigInt(tile.start) * d;
  if (remaining <= 0n) return 0;
  if (remaining >= BigInt(tile.count) * d) return tile.count;
  return Number(remaining) / denominator;
}

/** At most budget leaves and approximately 10/9 * budget visited nodes.
 * Offscreen branches are culled before descent. Never samples or loses units. */
export function aggregateTiles(camera, viewport, budget = 4200, prefixCount = MILLION) {
  budget = Math.max(10, Math.floor(budget));
  prefixCount = Math.max(0, Math.min(MILLION, Math.floor(prefixCount)));
  const output = [];
  const stack = [{ x: 0, y: 0, w: 1000, h: 1000, start: 0, count: MILLION, depth: 0 }];
  const left = camera.x - viewport.width / camera.scale / 2;
  const right = camera.x + viewport.width / camera.scale / 2;
  const top = camera.y - viewport.height / camera.scale / 2;
  const bottom = camera.y + viewport.height / camera.scale / 2;
  while (stack.length) {
    const tile = stack.pop();
    if (tile.start >= prefixCount) continue;
    if (tile.x >= right || tile.x + tile.w <= left || tile.y >= bottom || tile.y + tile.h <= top) continue;
    const crossesPrefix = tile.start + tile.count > prefixCount;
    if (tile.count === 1 || Math.min(tile.w, tile.h) * camera.scale < 7 || (output.length + stack.length + 10 > budget && !crossesPrefix)) {
      output.push(tile);
      continue;
    }
    const alongY = tile.depth % 2 === 0;
    const w = alongY ? tile.w : tile.w / 10;
    const h = alongY ? tile.h / 10 : tile.h;
    for (let digit = 9; digit >= 0; digit--) stack.push({ x: tile.x + (alongY ? 0 : digit * w), y: tile.y + (alongY ? digit * h : 0), w, h, start: tile.start + digit * tile.count / 10, count: tile.count / 10, depth: tile.depth + 1 });
  }
  return output;
}

export function encodeState(state) {
  const params = new URLSearchParams({ v: '1', n: String(state.exponent), d: String(state.denominator), q: state.quantities.join(','), style: state.style });
  if (Number.isInteger(state.selected) && state.selected >= 0 && state.selected <= 2) params.set('i', String(state.selected));
  if (state.camera) params.set('c', [state.camera.x, state.camera.y, state.camera.scale].map(value => String(Math.round(value * 1e6) / 1e6)).join(','));
  return `#${params}`;
}

export function decodeState(hash) {
  const fallback = () => ({ state: { ...DEFAULT_STATE, quantities: [...DEFAULT_STATE.quantities] }, recovered: true });
  if (!hash || hash === '#') return { state: { ...DEFAULT_STATE, quantities: [...DEFAULT_STATE.quantities] }, recovered: false };
  try {
    if (hash.length > 1200 || /%(?![\da-f]{2})/i.test(hash)) return fallback();
    const params = new URLSearchParams(hash.replace(/^#/, ''));
    if (params.get('v') !== '1') return fallback();
    const exponent = integer(params.get('n') ?? '0', 'Scale');
    stageBounds(exponent);
    const denominator = integer(params.get('d') ?? String(MILLION), 'Denominator');
    const quantities = (params.get('q') ?? '1,1000,100000').split(',');
    if (quantities.length !== 3) return fallback();
    const validated = quantities.map(quantity => validateComparison(quantity, denominator).quantity);
    const style = params.get('style') ?? 'field';
    if (!['field', 'bars', 'area'].includes(style)) return fallback();
    const selected = params.has('i') ? integer(params.get('i'), 'Comparison') : null;
    if (selected !== null && selected > 2) return fallback();
    let camera = null;
    if (params.has('c')) {
      const coordinates = params.get('c').split(',');
      const [x, y, scale] = coordinates.map(Number);
      if (coordinates.length !== 3 || !coordinates.every(value => value.trim() !== '') || ![x, y, scale].every(Number.isFinite) || Math.abs(x) > 100000 || Math.abs(y) > 100000 || scale < 0.04 || scale > 200) return fallback();
      camera = { x, y, scale };
    }
    const restored = { exponent, denominator, quantities: validated, style, camera };
    if (selected !== null) restored.selected = selected;
    return { state: restored, recovered: false };
  } catch { return fallback(); }
}
