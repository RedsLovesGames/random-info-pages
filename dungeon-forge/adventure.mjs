import { FLOOR, makeRng } from './generator.mjs';
import { roomKey } from './battlemap-core.mjs';
import { monsters, srdPdf } from './adventure-monsters.mjs';
import { scenarios, roomsByRole, traps, puzzles } from './adventure-scenes.mjs';

// D&D 2024 Basic Rules, DM’s Toolbox, XP Budget per Character.
// Each row covers one party level, in low / moderate / high order.
const xpByLevel = [
  [50, 75, 100], [100, 150, 200], [150, 225, 400], [250, 375, 500],
  [500, 750, 1100], [600, 1000, 1400], [750, 1300, 1700], [1000, 1700, 2100],
  [1300, 2000, 2600], [1600, 2300, 3100], [1900, 2900, 4100], [2200, 3700, 4700],
  [2600, 4200, 5400], [2900, 4900, 6200], [3300, 5400, 7800], [3800, 6100, 9800],
  [4500, 7200, 11700], [5000, 8700, 14200], [5500, 10700, 17200], [6400, 13200, 22000]
];
const difficultyNames = ['low', 'moderate', 'high'];
const floorObstacles = new Set(['pillar', 'sarco', 'debris']);
const tradeGoods = ['silver reliquary', 'engraved copper cup', 'rough garnet', 'pair of carved ivory dice', 'sealed tin of rare pigment', 'old silver brooch'];
const lowRewards = ['Potion of Healing', 'Antitoxin', 'Healer’s Kit', '50 feet of Silk Rope'];
const middleRewards = ['Potion of Greater Healing', 'Potion of Climbing', 'Potion of Water Breathing', 'Spell Scroll (level 1)'];
const highRewards = ['Potion of Superior Healing', 'Potion of Heroism', 'Potion of Speed', 'Spell Scroll (level 3)'];

function integer(value, min, max, fallback) {
  const result = Number.parseInt(value, 10);
  return Number.isFinite(result) ? Math.max(min, Math.min(max, result)) : fallback;
}

export function normalizeParty(party = {}) {
  return {
    size: integer(party.size, 1, 8, 4),
    level: integer(party.level, 1, 20, 3),
    difficulty: difficultyNames.includes(party.difficulty) ? party.difficulty : 'moderate'
  };
}

export function encounterBudget(settings) {
  const party = normalizeParty(settings);
  return party.size * xpByLevel[party.level - 1][difficultyNames.indexOf(party.difficulty)];
}

function rank(cr) {
  const [number, divisor = 1] = cr.split('/').map(Number);
  return number / divisor;
}

function usableTiles(dungeon) {
  const blocked = new Set(dungeon.props.filter(prop => floorObstacles.has(prop.kind))
    .map(prop => prop.y * dungeon.W + prop.x));
  const rooms = Array.from({ length: dungeon.rooms.length }, () => new Set());
  for (let cell = 0; cell < dungeon.grid.length; cell++) {
    const id = dungeon.roomId[cell];
    if (id >= 0 && dungeon.grid[cell] === FLOOR && !dungeon.doorway[cell] &&
        !dungeon.lakeMask[cell] && !blocked.has(cell)) rooms[id].add(cell);
  }
  return rooms;
}

function placeGroup(group, cells, width, rng) {
  const remaining = new Set(cells);
  const all = [...cells];
  const placement = [];
  const sorted = [...group].sort((a, b) => b.monster.space - a.monster.space);
  for (const { monster, count } of sorted) {
    const positions = [];
    const order = rng.i(0, all.length - 1);
    for (let step = 0; step < all.length && positions.length < count; step++) {
      const cell = all[(step + order) % all.length];
      if (cell % width + monster.space > width) continue;
      const footprint = [];
      for (let y = 0; y < monster.space; y++) {
        for (let x = 0; x < monster.space; x++) footprint.push(cell + y * width + x);
      }
      if (!footprint.every(tile => remaining.has(tile))) continue;
      for (const tile of footprint) remaining.delete(tile);
      positions.push({ x: cell % width, y: Math.floor(cell / width) });
    }
    if (positions.length !== count) return undefined;
    const { themes, ...stats } = monster;
    placement.push({ ...stats, positions });
  }
  return placement;
}

function makeEncounter(dungeon, room, party, cells, rng) {
  const selected = difficultyNames.indexOf(party.difficulty);
  const difficulty = difficultyNames[room.type === 'combat' ? Math.max(0, selected - 1) : selected];
  const budget = encounterBudget({ ...party, difficulty });
  const crCap = party.level <= 2 ? (party.size < 3 ? 0.5 : party.level)
    : party.level + (party.size < 3 ? 0 : party.size >= 6 ? 4 : 2);
  const theme = dungeon.params.themeKey;
  const themed = monster => monster.themes.includes(theme);
  const pool = monsters.filter(monster =>
    monster.xp <= budget && rank(monster.cr) <= crCap &&
    (themed(monster) || monster.themes.includes('general'))
  );
  const cap = Math.min(12, party.size * 2);
  const candidates = [];
  function consider(leader, support, count) {
    const cost = leader.xp + support.xp * count;
    if (cost > budget) return;
    const group = leader === support ? [{ monster: leader, count: count + 1 }]
      : [{ monster: leader, count: 1 }, { monster: support, count }];
    const themeScore = (Number(themed(leader)) + Number(themed(support)) * count) / (count + 1);
    const numberPenalty = Math.max(0, count + 1 - party.size) * 0.035;
    candidates.push({ cost, group, score: cost / budget + themeScore * 0.16 - numberPenalty + rng.f(0, 0.10) });
  }

  for (const leader of pool) {
    consider(leader, leader, 0);
    for (const support of pool) {
      if (support.xp > leader.xp) continue;
      const count = Math.min(cap - 1, Math.floor((budget - leader.xp) / support.xp));
      for (let size = Math.max(1, count - 1); size <= count; size++) consider(leader, support, size);
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  for (const candidate of candidates) {
    const group = placeGroup(candidate.group, cells, dungeon.W, rng);
    if (group) return { difficulty, budget, totalXp: candidate.cost, monsters: group };
  }
  return undefined;
}

function generateTreasure(party, room, rng) {
  const tier = party.level < 5 ? 0 : party.level < 11 ? 1 : 2;
  const value = [5, 20, 60][tier];
  const boss = room.type === 'boss';
  const items = [lowRewards, middleRewards, highRewards][tier];
  const coins = rng.i(value, value * 2) * (boss ? 4 : 1);
  const goods = rng.pick(tradeGoods);
  return {
    coins, goods, goodsValue: rng.i(value, value * 3),
    item: rng.pick(items),
    location: boss ? 'Set aside with the objective.' : 'Discover it beneath the loose stone or in the recess after inspecting the room.'
  };
}

function generateTrap(party, rng) {
  const trap = rng.pick(traps);
  const tier = party.level < 5 ? 0 : party.level < 11 ? 1 : 2;
  const dc = [12, 14, 16][tier];
  const damage = [1, 2, 4][tier] + 'd6 ' + trap.damage;
  return {
    ...trap, dc,
    effect: 'DC ' + dc + ' ' + trap.save + ' save. Failure: ' + damage + ' damage. Success: no damage.',
    search: 'DC ' + dc + ' Wisdom (Perception) to notice the tell without examining it directly.'
  };
}

export function buildAdventure(dungeon, settings, revision = 0, roomRevisions = {}) {
  const party = normalizeParty(settings);
  const seed = (dungeon.seed ^ Math.imul(1 + revision, 0xa94d4b05)) >>> 0;
  const rng = makeRng(seed);
  const [name, hook, objective, complication, clueA, clueB] = rng.pick(scenarios[dungeon.params.themeKey]);
  const keys = roomKey(dungeon);
  const cells = usableTiles(dungeon);
  const numberById = new Map(keys.map(room => [room.id, room.number]));
  const linked = new Map(keys.map(room => [room.id, []]));
  for (const { a, b } of dungeon.edges) {
    linked.get(a).push(numberById.get(b));
    linked.get(b).push(numberById.get(a));
  }
  const sideRooms = keys.slice(1).filter(room => room.type !== 'boss');
  const trapRoom = sideRooms.find(room => room.type === 'treasure') ?? sideRooms[1];
  const puzzleRoom = sideRooms.find(room => room.type === 'shrine') ?? sideRooms.find(room => room.id !== trapRoom.id);
  const guideRoom = sideRooms[0];
  const clueRooms = sideRooms.filter(room => room.id !== guideRoom.id);
  const reward = rng.i(8, 14) * Math.ceil(party.level / 2) * party.size;
  const rooms = keys.map(room => {
    const roomRng = makeRng(seed ^ Math.imul(room.id + 1, 0x9e3779b1) ^
      Math.imul(roomRevisions[room.id] ?? 0, 0x85ebca6b));
    const boss = room.type === 'boss';
    const fights = boss || room.type === 'elite' ||
      (room.type === 'combat' && (room.id === guideRoom.id || roomRng.chance(0.55)));
    const role = room.type === 'combat' && !fights ? 'quiet' : room.type;
    const [name, readAloud, situation] = roomRng.pick(roomsByRole[role]);
    const encounter = fights ? makeEncounter(dungeon, room, party, cells[room.id], roomRng) : undefined;
    return {
      ...room, role, name, readAloud, situation, encounter,
      links: linked.get(room.id).sort((a, b) => a - b),
      objective: boss ? objective : undefined,
      clue: room.id === clueRooms[0]?.id ? clueA : room.id === clueRooms[1]?.id ? clueB : undefined,
      treasure: boss || room.type === 'treasure' || (role === 'quiet' && roomRng.chance(0.38))
        ? generateTreasure(party, room, roomRng) : undefined,
      trap: room.id === trapRoom.id || (room.type === 'treasure' && roomRng.chance(0.5)) ? generateTrap(party, roomRng) : undefined,
      puzzle: room.id === puzzleRoom?.id ? roomRng.pick(puzzles) : undefined
    };
  });
  return { party, name, hook, objective, complication, reward, rooms };
}

export function describeTreasure(treasure) {
  return treasure.coins + ' GP in coin, a ' + treasure.goods + ' worth ' +
    treasure.goodsValue + ' GP, and ' + treasure.item + '. ' + treasure.location;
}

export function roomFeatures(room) {
  const features = [
    ['At the table', room.situation],
    ['Connected rooms', room.links.join(', ')]
  ];
  if (room.objective) features.push(['Objective', room.objective]);
  if (room.clue) features.push(['Clue', room.clue]);
  if (room.trap) {
    const trap = room.trap;
    features.push(['Trap', trap.name], ['Tell', trap.cue + ' ' + trap.search],
      ['Trigger', trap.trigger], ['Disarm', trap.disarm], ['Effect', trap.effect]);
  }
  if (room.puzzle) features.push(['Puzzle', room.puzzle.name + '. ' + room.puzzle.setup],
    ['Solution', room.puzzle.solution], ['Bypass', room.puzzle.bypass]);
  if (room.treasure) features.push(['Treasure', describeTreasure(room.treasure)]);
  return features;
}

export function formatRoom(room, note = '') {
  const lines = [room.number + '. ' + room.name + ' (' + room.role + ')', 'Read aloud: ' + room.readAloud];
  for (const [label, value] of roomFeatures(room)) lines.push(label + ': ' + value);
  if (room.encounter) {
    const enc = room.encounter;
    lines.push('Encounter: ' + enc.totalXp + ' / ' + enc.budget + ' XP (' + enc.difficulty + ' budget).');
    for (const monster of enc.monsters) {
      const positions = monster.positions.map(tile => (tile.x + 1) + ',' + (tile.y + 1)).join(' · ');
      lines.push('- ' + monster.positions.length + ' × ' + monster.name + ' (AC ' + monster.ac + ', HP ' +
        monster.hp + ', initiative ' + (monster.initiative >= 0 ? '+' : '') + monster.initiative + ', CR ' +
        monster.cr + ', ' + monster.xp + ' XP each). Start at ' + positions +
        ' (column,row). Stat block: ' + srdPdf + '#page=' + monster.page);
    }
  }
  if (note.trim()) lines.push('GM notes: ' + note.trim());
  return lines.join('\n');
}
