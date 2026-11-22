import { FLOOR, POOL, WALL } from './generator.mjs';
import { roomKey } from './battlemap-core.mjs';
import { textureAtlas } from './battlemap-textures.mjs';
import { visibleProps } from './dungeon-furnishings.mjs';

// Open stone stays brighter than the void. Interface themes leave map art alone.
const palettes = {
  ancient: { void:'#22242b', wall:'#484c56', cap:'#6c6e76', floor:['#99938b','#a8a398','#918e89'], edge:'#3c3937', vein:'#56505550', pool:'#397b87', poolLow:'#1b4553', ripple:'#9adde54f' },
  molten: { void:'#28211f', wall:'#513d33', cap:'#8d6950', floor:['#b49373','#a6876f','#af997c'], edge:'#503629', vein:'#6c362c60', pool:'#e37439', poolLow:'#7e251a', ripple:'#ffdd7292' },
  frost: { void:'#202a34', wall:'#42546a', cap:'#657b8d', floor:['#9eadb3','#a4b7bc','#a9bbc5'], edge:'#344550', vein:'#e4f7ff62', pool:'#497ea4', poolLow:'#284c6b', ripple:'#b5efff78' },
  grim: { void:'#242721', wall:'#404239', cap:'#636653', floor:['#93927a','#a4a087','#aaa58d'], edge:'#3a392d', vein:'#65714670', pool:'#6e8544', poolLow:'#364529', ripple:'#a5a85e60' },
  verdant: { void:'#202923', wall:'#425044', cap:'#60735a', floor:['#9b9e82','#a1a488','#a9a88e'], edge:'#354032', vein:'#4f705051', pool:'#448e76', poolLow:'#234e4c', ripple:'#83d3a376' }
};

function drawSegments(context, pixels, segments) {
  context.beginPath();
  for (const [a, b] of segments) {
    context.moveTo(a.x * pixels, a.y * pixels);
    context.lineTo(b.x * pixels, b.y * pixels);
  }
  context.stroke();
}

function visibleSegments(dungeon, region, segments) {
  if (!region) return segments;
  const result = [];
  const shown = (x, y) => {
    if (x < region.x || x >= region.x + region.W || y < region.y || y >= region.y + region.H) return false;
    const tile = y * dungeon.W + x;
    return region.visible.has(tile) && dungeon.grid[tile] !== WALL;
  };
  for (const [a, b] of segments) {
    const horizontal = a.y === b.y;
    const first = horizontal ? Math.min(a.x, b.x) : Math.min(a.y, b.y);
    const last = horizontal ? Math.max(a.x, b.x) : Math.max(a.y, b.y);
    const fixed = horizontal ? a.y : a.x;
    const point = value => horizontal ? { x: value, y: fixed } : { x: fixed, y: value };
    let start;
    for (let at = first; at <= last; at++) {
      const visible = at < last && (horizontal
        ? shown(at, fixed) || shown(at, fixed - 1)
        : shown(fixed, at) || shown(fixed - 1, at));
      if (visible) {
        start ??= at;
      } else if (start !== undefined) {
        result.push([point(start), point(at)]);
        start = undefined;
      }
    }
  }
  return result;
}

function drawProp(context, prop, palette, pixels) {
  const px = (prop.x + 0.5) * pixels;
  const py = (prop.y + 0.5) * pixels;
  context.save();
  context.translate(px, py);
  context.fillStyle = '#11192363';
  context.beginPath();
  context.ellipse(pixels * 0.08, pixels * 0.13, pixels * 0.36, pixels * 0.25, 0, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = palette.edge;
  context.fillStyle = palette.wall;
  context.lineWidth = Math.max(0.7, pixels * 0.035);
  if (prop.kind === 'pillar') {
    context.beginPath();
    context.arc(0, 0, pixels * 0.28, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.strokeStyle = palette.cap;
    context.beginPath();
    context.arc(0, 0, pixels * 0.21, Math.PI, Math.PI * 1.7);
    context.stroke();
  } else if (prop.kind === 'sarco') {
    context.rotate(prop.rot);
    context.fillRect(-pixels * 0.17, -pixels * 0.34, pixels * 0.34, pixels * 0.68);
    context.strokeRect(-pixels * 0.17, -pixels * 0.34, pixels * 0.34, pixels * 0.68);
    context.fillStyle = palette.cap;
    context.fillRect(-pixels * 0.10, -pixels * 0.24, pixels * 0.2, pixels * 0.45);
  } else {
    context.rotate(prop.rot);
    context.beginPath();
    context.moveTo(-pixels * 0.17, pixels * 0.07);
    context.lineTo(-pixels * 0.09, -pixels * 0.15);
    context.lineTo(pixels * 0.05, -pixels * 0.18);
    context.lineTo(pixels * 0.20, pixels * 0.03);
    context.lineTo(pixels * 0.10, pixels * 0.15);
    context.closePath();
    context.fill();
    context.stroke();
  }
  context.restore();
}

function drawFurniture(context, item, pixels) {
  const x = (item.x + 0.5) * pixels;
  const y = (item.y + 0.5) * pixels;
  const box = (dx, dy, w, h, color) => {
    context.fillStyle = color;
    context.fillRect(x + dx * pixels, y + dy * pixels, w * pixels, h * pixels);
  };
  box(-0.27, -0.30, 0.62, 0.64, '#20242a65');
  if (item.kind === 'bunk') {
    box(-0.25, -0.36, 0.50, 0.72, '#4b3428');
    box(-0.19, -0.29, 0.38, 0.19, '#c4bca0');
    box(-0.19, -0.06, 0.38, 0.34, '#777752');
  } else if (item.kind === 'altar' || item.kind === 'bench') {
    box(-0.33, -0.21, 0.66, 0.42, '#595963');
    box(-0.29, -0.17, 0.58, 0.13, '#bab4ac');
    if (item.kind === 'altar') box(-0.07, -0.05, 0.14, 0.14, '#bf9665');
  } else if (item.kind === 'barrel') {
    context.fillStyle = '#684632';
    context.beginPath();
    context.arc(x, y, pixels * 0.27, 0, Math.PI * 2);
    context.fill();
    box(-0.19, -0.04, 0.38, 0.08, '#bf9b69');
  } else {
    box(-0.29, -0.23, 0.58, 0.46, item.kind === 'cover' ? '#515c65' : '#724a31');
    box(-0.25, -0.17, 0.50, 0.10, item.kind === 'cover' ? '#919ba0' : '#bc955f');
    box(-0.06, -0.06, 0.12, 0.16, '#3a322e');
  }
}

function highlightRoom(context, dungeon, pixels, id) {
  if (id === undefined || id === null) return;
  const segments = [];
  const W = dungeon.W;
  for (let i = 0; i < dungeon.roomId.length; i++) {
    if (dungeon.roomId[i] !== id || dungeon.grid[i] !== FLOOR) continue;
    const x = i % W, y = Math.floor(i / W);
    const a = {x, y}, b = {x:x+1, y}, c = {x:x+1, y:y+1}, d = {x, y:y+1};
    if (dungeon.roomId[i-W] !== id) segments.push([a,b]);
    if (dungeon.roomId[i+1] !== id) segments.push([b,c]);
    if (dungeon.roomId[i+W] !== id) segments.push([c,d]);
    if (dungeon.roomId[i-1] !== id) segments.push([d,a]);
  }
  context.strokeStyle = '#56e2cf';
  context.lineWidth = Math.max(1.4, pixels * .09);
  drawSegments(context, pixels, segments);
}

function markMonsters(context, adventure, pixels) {
  if (!adventure) return;
  context.strokeStyle = '#af382a';
  context.lineWidth = Math.max(1.3, pixels * 0.08);
  for (const room of adventure.rooms) for (const monster of room.encounter?.monsters ?? []) {
    for (const { x, y } of monster.positions) {
      context.strokeRect((x + 0.08) * pixels, (y + 0.08) * pixels,
        (monster.space - 0.16) * pixels, (monster.space - 0.16) * pixels);
    }
  }
}

export function drawBattlemap(canvas, dungeon, pixels, { grid = false, numbers = false, doors = false,
  adventure, furnishings = [], doorStates = {}, selected, region } = {}) {
  const area = region ?? { x: 0, y: 0, W: dungeon.W, H: dungeon.H };
  canvas.width = area.W * pixels;
  canvas.height = area.H * pixels;
  const context = canvas.getContext('2d', { alpha: false, willReadFrequently: Boolean(region) });
  if (!context) throw new Error('A 2D canvas is unavailable on this device.');

  const palette = palettes[dungeon.params.themeKey];
  const textures = textureAtlas(palette, pixels, canvas.ownerDocument);
  context.fillStyle = palette.void;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.translate(-area.x * pixels, -area.y * pixels);
  for (let y = area.y; y < area.y + area.H; y++) {
    for (let x = area.x; x < area.x + area.W; x++) {
      const index = y * dungeon.W + x;
      const tile = dungeon.grid[index];
      if (!tile || (region && !region.visible.has(index))) continue;
      const material = tile === WALL ? 'wall' : tile === POOL ? 'pool' : dungeon.lakeMask[index] ? 'ice' : 'floor';
      const variant = (Math.imul(index ^ dungeon.seed, 1597334677) >>> 20) & 7;
      context.drawImage(textures[material][variant], x * pixels, y * pixels);
      if (grid && tile !== WALL) {
        context.strokeStyle = '#18232a68';
        context.lineWidth = Math.max(0.6, pixels * 0.026);
        context.strokeRect(x * pixels, y * pixels, pixels, pixels);
      }
    }
  }

  const walls = visibleSegments(dungeon, region, dungeon.walls);
  context.strokeStyle = '#161d2475';
  context.lineWidth = Math.max(1.4, pixels * 0.20);
  drawSegments(context, pixels, walls);
  context.strokeStyle = palette.edge;
  context.lineWidth = Math.max(1, pixels * 0.085);
  drawSegments(context, pixels, walls);

  // These props describe the terrain. Encounter, puzzle, and loot markers are GM-only.
  for (const prop of dungeon.props) {
    const tile = prop.y * dungeon.W + prop.x;
    if ((!region || region.visible.has(tile)) && visibleProps.has(prop.kind) && dungeon.grid[tile] === FLOOR) {
      drawProp(context, prop, palette, pixels);
    }
  }

  for (const item of furnishings) {
    if (!region || item.roomId === region.roomId) drawFurniture(context, item, pixels);
  }
  if (doors) {
    const normal = [], secret = [], locked = [];
    for (const [index, portal] of dungeon.doors.entries()) {
      const kind = doorStates[index];
      if (kind === 'open') continue;
      const bounds = visibleSegments(dungeon, region, [portal.bounds]);
      if (kind === 'secret') secret.push(...bounds);
      else if (kind === 'locked') locked.push(...bounds);
      else normal.push(...bounds);
    }
    context.strokeStyle = '#473426';
    context.lineWidth = Math.max(2, pixels * 0.17);
    drawSegments(context, pixels, [...normal, ...locked]);
    context.strokeStyle = '#b18457';
    context.lineWidth = Math.max(0.8, pixels * 0.065);
    drawSegments(context, pixels, normal);
    context.strokeStyle = numbers ? '#e8bd62' : '#b18457';
    drawSegments(context, pixels, locked);
    if (numbers) {
      context.strokeStyle = '#b49bcf';
      drawSegments(context, pixels, secret);
    }
  }
  highlightRoom(context, dungeon, pixels, selected);

  if (!numbers) return;
  const monsterRooms = region && adventure
    ? { rooms: adventure.rooms.filter(room => room.id === region.roomId) }
    : adventure;
  markMonsters(context, monsterRooms, pixels);
  context.font = '700 ' + Math.round(pixels * 0.62) + 'px system-ui, sans-serif';
  context.textBaseline = 'middle';
  context.textAlign = 'center';
  for (const room of roomKey(dungeon)) {
    if (region && room.id !== region.roomId) continue;
    const x = (room.x + 0.5) * pixels;
    const y = (room.y + 0.5) * pixels;
    context.fillStyle = room.type === 'entrance' ? '#235a4a' : '#25272e';
    context.beginPath();
    context.arc(x, y, pixels * 0.54, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#ffffff';
    context.fillText(room.number, x, y, pixels * 0.84);
  }
}
