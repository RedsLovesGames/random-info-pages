import { FLOOR, WALL, POOL, THEMES, generateDungeon, resolveDungeonTheme } from './generator.mjs';

function bounded(value, min, max, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(min, Math.min(max, Math.round(number))) : fallback;
}

function occupied(dungeon, x, y) {
  if (x < 0 || y < 0 || x >= dungeon.W || y >= dungeon.H) return false;
  const tile = dungeon.grid[y * dungeon.W + x];
  return tile === FLOOR || tile === POOL;
}

function measureEdges(width, height, hasEdge, point) {
  const runs = [];
  for (let line = 0; line <= height; line++) {
    let start = -1;
    for (let column = 0; column <= width; column++) {
      if (column < width && hasEdge(column, line)) {
        if (start < 0) start = column;
      } else if (start >= 0) {
        runs.push([point(start, line), point(column, line)]);
        start = -1;
      }
    }
  }
  return runs;
}

function wallSegments(dungeon) {
  const inside = (x, y) => occupied(dungeon, x, y);
  return [
    ...measureEdges(dungeon.W, dungeon.H,
      (x, y) => inside(x, y - 1) !== inside(x, y), (x, y) => ({ x, y })),
    ...measureEdges(dungeon.H, dungeon.W,
      (y, x) => inside(x - 1, y) !== inside(x, y), (y, x) => ({ x, y }))
  ];
}

function doorPortals(dungeon) {
  const portals = new Map();
  for (const arch of dungeon.arches) {
    const horizontal = Boolean(arch.px);
    const center = Math.floor((horizontal ? arch.x : arch.y) + 0.5);
    const row = Math.floor(horizontal ? arch.y : arch.x);
    const across = (along, line) => horizontal
      ? occupied(dungeon, along, line) : occupied(dungeon, line, along);
    const point = (along, line) => horizontal ? { x: along, y: line } : { x: line, y: along };
    // An arch is centered on a floor tile. Pick a nearby grid edge that spans
    // a genuine opening, with both ends meeting actual walls.
    for (const line of [row, row + 1]) {
      const open = along => across(along, line - 1) && across(along, line);
      if (!open(center)) continue;
      let start = center;
      let end = center + 1;
      while (open(start - 1)) start--;
      while (open(end)) end++;
      if (end - start > arch.len) continue;
      const key = [horizontal, line, start, end].join('/');
      portals.set(key, {
        position: point((start + end) / 2, line),
        bounds: [point(start, line), point(end, line)],
        rotation: horizontal ? 0 : Math.PI / 2,
        closed: true,
        freestanding: false
      });
      break;
    }
  }
  return [...portals.values()];
}

function torchLights(dungeon) {
  const chosen = new Set();
  const lights = [];
  const color = '#' + THEMES[dungeon.params.themeKey].torchLight[0].toString(16).padStart(6, '0');
  for (const torch of dungeon.torches) {
    const x = torch.x + torch.dx;
    const y = torch.y + torch.dy;
    const id = dungeon.roomId[y * dungeon.W + x];
    if (id < 0 || chosen.has(id)) continue;
    chosen.add(id);
    lights.push({ position: { x: x + 0.5, y: y + 0.5 }, range: 4, intensity: 1, color, vision: false });
    if (lights.length === 24) break;
  }
  return lights;
}

export function makeBattlemap(settings) {
  const seed = Number.parseInt(settings.seed, 10) >>> 0;
  const theme = Object.hasOwn(THEMES, settings.theme) ? settings.theme : 'auto';
  const dungeon = generateDungeon({
    seed,
    themeKey: resolveDungeonTheme(seed, theme),
    roomCount: bounded(settings.roomCount, 6, 80, 12),
    loopChance: bounded(settings.loopPercent, 0, 40, 15) / 100,
    decorDensity: bounded(settings.decorPercent, 0, 100, 60) / 100
  });
  if (!dungeon.valid) throw new Error('This layout did not connect all walkable squares. Try another seed.');
  return { ...dungeon, walls: wallSegments(dungeon), doors: doorPortals(dungeon), sceneLights: torchLights(dungeon) };
}

export function pixelsPerSquare({ W, H }) {
  // Maintain integer grid spacing within common mobile canvas size limits.
  return Math.min(48, Math.floor(3600 / Math.max(W, H)), Math.floor(Math.sqrt(10000000 / (W * H))));
}

export function pngExportSpec({ W, H }, target, basename) {
  const density = [48, 70, 100].includes(Number(target)) ? Number(target) : 70;
  const pixels = Math.min(density, Math.floor(6500 / Math.max(W, H)), Math.floor(Math.sqrt(15000000 / (W * H))));
  return { pixels, width: W * pixels, height: H * pixels, name: basename + '-' + W + 'x' + H + '.png' };
}

export function roomExportRegion(dungeon, id) {
  const { W, H, grid, roomId } = dungeon;
  if (!Number.isInteger(id) || id < 0 || id >= dungeon.rooms.length) return undefined;
  const visible = new Set();
  let left = W, right = 0, top = H, bottom = 0;
  for (let cell = 0; cell < grid.length; cell++) {
    if (roomId[cell] !== id || !grid[cell]) continue;
    const x = cell % W, y = Math.floor(cell / W);
    visible.add(cell);
    left = Math.min(left, x);
    right = Math.max(right, x);
    top = Math.min(top, y);
    bottom = Math.max(bottom, y);
  }
  if (!visible.size) return undefined;
  const padding = 2;
  left = Math.max(0, left - padding);
  right = Math.min(W - 1, right + padding);
  top = Math.max(0, top - padding);
  bottom = Math.min(H - 1, bottom + padding);
  const inBounds = (x, y) => x >= left && x <= right && y >= top && y <= bottom;
  let frontier = [...visible];

  // Follow room exits into short corridor stubs without exposing another room.
  for (let distance = 0; distance < padding; distance++) {
    const next = [];
    for (const tile of frontier) {
      const x = tile % W, y = Math.floor(tile / W);
      for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
        const cell = ny * W + nx;
        if (!inBounds(nx, ny) || visible.has(cell) || roomId[cell] >= 0 || grid[cell] !== FLOOR) continue;
        visible.add(cell);
        next.push(cell);
      }
    }
    frontier = next;
  }
  // Draw a wall border and adjoining hazards as terrain around the floor.
  for (const tile of [...visible]) {
    const x = tile % W, y = Math.floor(tile / W);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const cell = (y + dy) * W + x + dx;
      if (inBounds(x + dx, y + dy) && roomId[cell] < 0 && (grid[cell] === WALL || grid[cell] === POOL)) visible.add(cell);
    }
  }
  return { x: left, y: top, W: right - left + 1, H: bottom - top + 1, roomId: id, visible };
}

export function universalVtt(dungeon, { pixels, image, doors = false, lights = false, entranceLight = false }) {
  const entrance = dungeon.rooms[dungeon.entrance];
  const starter = { position: { x: entrance.cx + 0.5, y: entrance.cy + 0.5 }, range: 2,
    intensity: 1, color: '#fff0ce', vision: true };
  return {
    format: 0.3,
    resolution: { map_origin: { x: 0, y: 0 }, map_size: { x: dungeon.W, y: dungeon.H }, pixels_per_grid: pixels },
    gridScale: '5 ft',
    line_of_sight: dungeon.walls,
    objects_line_of_sight: [],
    portals: doors ? dungeon.doors : [],
    lights: [...(entranceLight ? [starter] : []), ...(lights ? dungeon.sceneLights : [])],
    environment: { baked_lighting: false, ambient_light: '#000000' },
    image
  };
}

export function roomKey(dungeon) {
  return [...dungeon.rooms].sort((a, b) => a.depth - b.depth || a.id - b.id)
    .map((room, index) => ({ number: index + 1, id: room.id, x: room.cx, y: room.cy, type: room.type }));
}
