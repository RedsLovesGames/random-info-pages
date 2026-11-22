import { FLOOR, POOL, WALL } from './generator.mjs';
import { roomKey } from './battlemap-core.mjs';

// Open stone is deliberately brighter than the surrounding void, even in the
// ember and miasma palettes. Site appearance does not recolor an export.
const palettes = {
  ancient: { void: '#262930', wall: '#4c5059', floor: ['#a4a7ac', '#999da3', '#abadb0'], edge: '#393b3e', pool: '#356f80' },
  molten: { void: '#272320', wall: '#57504a', floor: ['#b6a38c', '#a99681', '#baa793'], edge: '#49372d', pool: '#b64b16' },
  frost: { void: '#252f3c', wall: '#495b70', floor: ['#aabdc8', '#b2c1ce', '#a3b8c5'], edge: '#354754', pool: '#397aa2' },
  grim: { void: '#262a25', wall: '#484d43', floor: ['#a5a68c', '#9b9d82', '#adad93'], edge: '#353931', pool: '#527737' },
  verdant: { void: '#242e2a', wall: '#46574c', floor: ['#a5ad92', '#9ba58a', '#aeb29a'], edge: '#344035', pool: '#356f63' }
};
const visibleProps = new Set(['pillar', 'sarco', 'debris']);

function drawSegments(context, pixels, segments) {
  context.beginPath();
  for (const [a, b] of segments) {
    context.moveTo(a.x * pixels, a.y * pixels);
    context.lineTo(b.x * pixels, b.y * pixels);
  }
  context.stroke();
}

export function drawBattlemap(canvas, dungeon, pixels, { grid = false, numbers = false, doors = false } = {}) {
  canvas.width = dungeon.W * pixels;
  canvas.height = dungeon.H * pixels;
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) throw new Error('A 2D canvas is unavailable on this device.');

  const palette = palettes[dungeon.params.themeKey];
  context.fillStyle = palette.void;
  context.fillRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < dungeon.H; y++) {
    for (let x = 0; x < dungeon.W; x++) {
      const index = y * dungeon.W + x;
      const tile = dungeon.grid[index];
      if (!tile) continue;
      const px = x * pixels;
      const py = y * pixels;
      const texture = ((Math.imul(index, 1274126177) >>> 24) + x) % 3;
      if (tile === WALL) {
        context.fillStyle = palette.wall;
      } else if (tile === POOL || dungeon.lakeMask[index]) {
        context.fillStyle = dungeon.lakeMask[index] ? '#79a6ba' : palette.pool;
      } else {
        context.fillStyle = palette.floor[texture];
      }
      context.fillRect(px, py, pixels, pixels);
      if (grid && tile !== WALL) {
        context.strokeStyle = '#17202744';
        context.lineWidth = Math.max(0.6, pixels * 0.024);
        context.strokeRect(px, py, pixels, pixels);
      }
    }
  }

  // Show only physical obstacles on the player map. The 3D exhibit's enemy
  // markers and loot props never enter the player image or the UVTT payload.
  for (const prop of dungeon.props) {
    if (!visibleProps.has(prop.kind)) continue;
    if (dungeon.grid[prop.y * dungeon.W + prop.x] !== FLOOR) continue;
    const scale = prop.kind === 'debris' ? 0.29 : 0.58;
    const x = (prop.x + (1 - scale) / 2) * pixels;
    const y = (prop.y + (1 - scale) / 2) * pixels;
    context.fillStyle = palette.wall;
    context.strokeStyle = palette.edge;
    context.lineWidth = Math.max(0.8, pixels * 0.036);
    context.fillRect(x, y, scale * pixels, scale * pixels);
    context.strokeRect(x, y, scale * pixels, scale * pixels);
  }

  context.strokeStyle = palette.edge;
  context.lineWidth = Math.max(1, pixels * 0.078);
  drawSegments(context, pixels, dungeon.walls);
  if (doors) {
    context.strokeStyle = '#704324';
    context.lineWidth = Math.max(1.7, pixels * 0.12);
    drawSegments(context, pixels, dungeon.doors.map(portal => portal.bounds));
  }

  if (!numbers) return;
  context.font = '700 ' + Math.round(pixels * 0.62) + 'px system-ui, sans-serif';
  context.textBaseline = 'middle';
  context.textAlign = 'center';
  for (const room of roomKey(dungeon)) {
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
