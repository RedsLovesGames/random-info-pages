import { FLOOR } from './generator.mjs';

export const furnishingNames = ['auto', 'bare', 'barracks', 'shrine', 'vault', 'larder'];
const patterns = {
  bare: [],
  barracks: [['bunk',-0.60,-0.46],['bunk',0.60,-0.46],['bunk',-0.60,0.43],['bunk',0.60,0.43]],
  shrine: [['altar',0,-0.53],['bench',-0.62,0.15],['bench',0.62,0.15],['bench',-0.62,0.55],['bench',0.62,0.55]],
  vault: [['chest',0,-0.59],['crate',-0.63,-0.34],['crate',0.63,-0.34],['crate',-0.57,0.36],['crate',0.57,0.36]],
  larder: [['crate',-0.55,-0.44],['barrel',-0.55,0.44],['crate',0.55,-0.44],['barrel',0.55,0.44]]
};
const roomStyles = { entrance:'bare', combat:'barracks', elite:'barracks', shrine:'shrine', treasure:'vault', boss:'shrine' };
export const visibleProps = new Set(['pillar', 'sarco', 'debris']);

export function roomFurnishings(dungeon, styles = {}, cover = {}) {
  const roomCells = dungeon.rooms.map(() => []);
  const { W, grid } = dungeon;
  const used = new Set(dungeon.props.filter(prop => visibleProps.has(prop.kind)).map(prop => prop.y * W + prop.x));
  for (let index = 0; index < grid.length; index++) {
    const id = dungeon.roomId[index];
    if (grid[index] === FLOOR && id >= 0 && !dungeon.lakeMask[index] && !dungeon.doorway[index] && !used.has(index)) {
      roomCells[id].push({ x: index % W, y: Math.floor(index / W), index });
    }
  }
  const furniture = [];
  for (const room of dungeon.rooms) {
    for (const tile of cover[room.id] ?? []) {
      const cell = roomCells[room.id].find(({ x, y }) => x === tile.x && y === tile.y);
      if (!cell || used.has(cell.index)) continue;
      used.add(cell.index);
      furniture.push({ x: cell.x, y: cell.y, roomId: room.id, kind: 'cover' });
    }
    const style = styles[room.id] && styles[room.id] !== 'auto' ? styles[room.id] : roomStyles[room.type];
    for (const [kind, dx, dy] of patterns[style] ?? []) {
      const tx = room.cx + room.w * dx / 2;
      const ty = room.cy + room.h * dy / 2;
      let best;
      let nearest = Infinity;
      for (const cell of roomCells[room.id]) {
        const distance = (tx - cell.x) ** 2 + (ty - cell.y) ** 2;
        if (used.has(cell.index) || distance >= nearest || (cell.x === room.cx && cell.y === room.cy)) continue;
        nearest = distance;
        best = cell;
      }
      if (!best) continue;
      used.add(best.index);
      furniture.push({ x: best.x, y: best.y, roomId: room.id, kind });
    }
  }
  return furniture;
}
