import { FLOOR } from './generator.mjs';

function floorReach(dungeon, barriers) {
  const { W, grid, rooms, entrance } = dungeon;
  const blocked = new Map();
  const block = (a, b) => {
    if (!blocked.has(a)) blocked.set(a, new Set());
    blocked.get(a).add(b);
  };
  for (const door of barriers) {
    const [a, b] = door.bounds;
    if (a.y === b.y) {
      for (let x = Math.min(a.x, b.x); x < Math.max(a.x, b.x); x++) {
        const cell = a.y * W + x;
        block(cell - W, cell);
        block(cell, cell - W);
      }
    } else {
      for (let y = Math.min(a.y, b.y); y < Math.max(a.y, b.y); y++) {
        const cell = y * W + a.x;
        block(cell - 1, cell);
        block(cell, cell - 1);
      }
    }
  }
  const start = rooms[entrance].cy * W + rooms[entrance].cx;
  const seen = new Uint8Array(grid.length);
  const queue = [start];
  seen[start] = 1;
  for (let head = 0; head < queue.length; head++) {
    const at = queue[head];
    const x = at % W;
    const adjacent = [x > 0 ? at - 1 : -1, x + 1 < W ? at + 1 : -1, at - W, at + W];
    for (const tile of adjacent) {
      if (grid[tile] !== FLOOR || seen[tile] || blocked.get(at)?.has(tile)) continue;
      seen[tile] = 1;
      queue.push(tile);
    }
  }
  return rooms.filter(room => seen[room.cy * W + room.cx]).map(room => room.id);
}

const gateCache = new WeakMap();
export function automaticGate(dungeon) {
  if (gateCache.has(dungeon)) return gateCache.get(dungeon);
  const boss = dungeon.rooms[dungeon.boss];
  const nearest = dungeon.doors.map(({ position }, index) =>
    ({ index, distance: (position.x - boss.cx) ** 2 + (position.y - boss.cy) ** 2 }))
    .sort((a, b) => a.distance - b.distance).slice(0, 24);
  const gate = nearest.find(({ index }) => {
    const rooms = floorReach(dungeon, [dungeon.doors[index]]);
    return rooms.length >= 2 && !rooms.includes(dungeon.boss);
  })?.index;
  gateCache.set(dungeon, gate);
  return gate;
}

export function projectKeyPlan(dungeon, kinds) {
  const locked = dungeon.doors.flatMap((door, index) =>
    kinds[index] === 'locked' || kinds[index] === 'secret' ? [{ door, index, secret: kinds[index] === 'secret' }] : []);
  const initialRooms = floorReach(dungeon, locked.map(entry => entry.door));
  const byDepth = dungeon.rooms.filter(room => initialRooms.includes(room.id) && room.id !== dungeon.entrance && room.id !== dungeon.boss)
    .sort((a, b) => b.depth - a.depth);
  const keys = locked.map(({ index, secret }, order) => ({
    index, secret, roomId: byDepth.length ? byDepth[order % byDepth.length].id : dungeon.entrance
  }));
  const bossReachable = locked.length ? floorReach(dungeon, []).includes(dungeon.boss) : true;
  return { initialRooms, keys, bossReachable };
}

export function doorsByRoom(dungeon) {
  const result = dungeon.rooms.map(() => []);
  dungeon.doors.forEach(({ position }, index) => {
    const candidates = dungeon.rooms.map(room => ({
      id: room.id, distance: (room.cx + 0.5 - position.x) ** 2 + (room.cy + 0.5 - position.y) ** 2
    })).sort((a, b) => a.distance - b.distance);
    result[candidates[0].id].push(index);
  });
  return result;
}

export const sessionPlans = {
  90: { rooms: 8, fights: 2, time: [10, 30, 40, 10] },
  180: { rooms: 14, fights: 3, time: [15, 70, 75, 20] },
  240: { rooms: 20, fights: 5, time: [15, 90, 110, 25] }
};

export function pacedFights(dungeon, minutes) {
  const plan = sessionPlans[minutes];
  if (!plan) return undefined;
  const total = plan.fights;
  const critical = new Set(dungeon.edges.filter(edge => edge.isCritical).flatMap(({ a, b }) => [a, b]));
  const possible = dungeon.rooms.filter(room => room.type === 'combat' || room.type === 'elite')
    .sort((a, b) => Number(critical.has(b.id)) - Number(critical.has(a.id)) || a.depth - b.depth || a.id - b.id);
  const count = Math.min(total - 1, possible.length);
  return new Set([dungeon.boss, ...Array.from({ length: count }, (_, index) =>
    possible[Math.floor((index + 0.5) * possible.length / count)].id)]);
}
