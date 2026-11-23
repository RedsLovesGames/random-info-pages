import { FLOOR } from './generator.mjs';
import {normalizeMarkers} from './battlemap-markers.mjs';
import {normalizeTerrainEdits} from './battlemap-terrain.mjs';
import { buildAdventure, normalizeParty, rollRoomField, usableTiles } from './adventure.mjs';
import { automaticGate, doorsByRoom, pacedFights, projectKeyPlan } from './dungeon-routes.mjs';
import { furnishingNames, roomFurnishings } from './dungeon-furnishings.mjs';
import { monsters } from './adventure-monsters.mjs';

export { furnishingNames, projectKeyPlan };
export const contentFields = ['encounter', 'treasure', 'trap', 'puzzle'];
export const doorKinds = ['closed', 'open', 'locked', 'secret'];
const lengths = [0, 90, 180, 240];
const bestiary = new Map(monsters.map(monster => [monster.name, monster]));
const format = 'dungeon-forge';

function integer(value, min, max, fallback) {
  if (value === '' || value === null) return fallback;
  const number = Number(value);
  return Number.isInteger(number) && number >= min && number <= max ? number : fallback;
}

function record(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function indexed(value, convert) {
  const result = {};
  for (const [key, entry] of Object.entries(record(value))) {
    if (!/^(0|[1-9]\d{0,3})$/.test(key)) continue;
    const next = convert(entry);
    if (next !== undefined) result[key] = next;
  }
  return result;
}

function point(value) {
  const x = integer(value?.x, 0, 300, -1);
  const y = integer(value?.y, 0, 300, -1);
  return x < 0 || y < 0 ? undefined : { x, y };
}

export function createProject(settings = {}, party) {
  return {
    format, version: 1,
    settings: {
      seed: Number.parseInt(settings.seed, 10) >>> 0,
      roomCount: integer(settings.roomCount, 6, 80, 42),
      loopPercent: integer(settings.loopPercent, 0, 40, 15),
      decorPercent: integer(settings.decorPercent, 0, 100, 60),
      theme: ['auto', 'ancient', 'frost', 'molten', 'grim', 'verdant'].includes(settings.theme) ? settings.theme : 'auto'
    },
    party: normalizeParty(party), minutes: 0, revision: 0, roomRevisions: {}, changes: {},
    notes: {}, doors: {}, style: {}, cover: {}, text: {}, markers: [], terrain: [],
    session: { roomId: null, rooms: {}, doors: {} }
  };
}

function encounterSnapshot(value) {
  if (!Array.isArray(value?.monsters)) return null;
  const groups = [];
  for (const group of value.monsters.slice(0, 12)) {
    const monster = bestiary.get(group?.name);
    if (!monster || !Array.isArray(group.positions)) continue;
    const positions = group.positions.slice(0, 12).map(point).filter(Boolean);
    if (!positions.length) continue;
    const { themes, ...stats } = monster;
    groups.push({ ...stats, positions });
  }
  if (!groups.length) return null;
  const totalXp = groups.reduce((sum, group) => sum + group.xp * group.positions.length, 0);
  if (groups.reduce((sum, group) => sum + group.positions.length, 0) > 12 || totalXp > 176000) return null;
  const difficulty = ['low', 'moderate', 'high'].includes(value.difficulty) ? value.difficulty : 'moderate';
  return { difficulty, budget: integer(value.budget, totalXp, 176000, totalXp), totalXp, monsters: groups };
}

const snapshotFields = {
  treasure: ['coins', 'goods', 'goodsValue', 'item', 'location'],
  trap: ['name', 'cue', 'trigger', 'disarm', 'save', 'damage', 'dc', 'effect', 'search'],
  puzzle: ['name', 'setup', 'solution', 'bypass']
};

function contentSnapshot(field, value) {
  if (field === 'encounter') return encounterSnapshot(value);
  if (!value || !snapshotFields[field].every(key => typeof value[key] === 'string' || Number.isFinite(value[key]))) return null;
  return Object.fromEntries(snapshotFields[field].map(key => [key,
    typeof value[key] === 'string' ? value[key].slice(0, 1000) : Math.max(0, Math.min(50000, value[key]))
  ]));
}

export function decodeProject(text) {
  let source;
  try { source = JSON.parse(text); }
  catch { throw new Error('Choose a valid Dungeon Forge project JSON file.'); }
  if (source?.format !== format || source.version !== 1 || !Object.keys(record(source.settings)).length) {
    throw new Error('This is not a supported Dungeon Forge project.');
  }
  const project = createProject(source.settings, source.party);
  project.minutes = lengths.includes(source.minutes) ? source.minutes : 0;
  project.revision = integer(source.revision, 0, 0xffffffff, 0);
  project.roomRevisions = indexed(source.roomRevisions, entry => integer(entry, 0, 0xffffffff));
  project.notes = indexed(source.notes, value => typeof value === 'string' ? value.slice(0, 2000) : undefined);
  project.markers = normalizeMarkers(source.markers);
  project.terrain = normalizeTerrainEdits(source.terrain);
  project.doors = indexed(source.doors, entry => doorKinds.includes(entry) ? entry : undefined);
  project.style = indexed(source.style, entry => furnishingNames.includes(entry) ? entry : undefined);
  project.cover = indexed(source.cover, entry => Array.isArray(entry) ? entry.slice(0, 20).map(point).filter(Boolean) : undefined);
  project.text = indexed(source.text, entry => {
    const result = {};
    if (typeof entry?.name === 'string') result.name = entry.name.slice(0, 100);
    if (typeof entry?.readAloud === 'string') result.readAloud = entry.readAloud.slice(0, 1200);
    return result;
  });
  project.changes = indexed(source.changes, room => Object.fromEntries(contentFields
    .filter(field => Object.hasOwn(record(room), field))
    .map(field => [field, {
      value: contentSnapshot(field, room[field]?.value),
      locked: room[field]?.locked === true,
      roll: integer(room[field]?.roll, 0, 0xffffffff, 0)
    }])));

  project.session.roomId = integer(source.session?.roomId, 0, 79, null);
  project.session.doors = indexed(source.session?.doors, opened => typeof opened === 'boolean' ? opened : undefined);
  project.session.rooms = indexed(source.session?.rooms, entry => ({
    trap: entry?.trap === true, loot: entry?.loot === true, visited: entry?.visited === true,
    hp: Object.fromEntries(Object.entries(record(entry?.hp)).filter(([key, value]) =>
      /^\d{1,2}:\d{1,2}$/.test(key) && Number.isInteger(value) && value >= 0 && value <= 999))
  }));
  return project;
}

function placementFits(dungeon, tiles, space, position) {
  if (position.x + space > dungeon.W) return false;
  for (let y = 0; y < space; y++) for (let x = 0; x < space; x++) {
    if (!tiles.has((position.y + y) * dungeon.W + position.x + x)) return false;
  }
  return true;
}

function subtractPosition(dungeon, tiles, space, position) {
  for (let y = 0; y < space; y++) for (let x = 0; x < space; x++) {
    tiles.delete((position.y + y) * dungeon.W + position.x + x);
  }
}

export function encounterFits(dungeon, tiles, encounter) {
  const available = new Set(tiles);
  for (const monster of encounter?.monsters ?? []) {
    for (const position of monster.positions) {
      if (!placementFits(dungeon, available, monster.space, position)) return false;
      subtractPosition(dungeon, available, monster.space, position);
    }
  }
  return true;
}

export function makeProjectAdventure(dungeon, project) {
  const furnishings = roomFurnishings(dungeon, project.style, project.cover);
  const fightRooms = pacedFights(dungeon, project.minutes);
  const adventure = buildAdventure(dungeon, project.party, project.revision, project.roomRevisions, { furnishings, fightRooms });
  const kinds = { ...project.doors };
  const generated = project.minutes ? automaticGate(dungeon) : undefined;
  if (generated !== undefined && !Object.hasOwn(kinds, generated)) kinds[generated] = 'locked';
  const keyed = projectKeyPlan(dungeon, kinds);
  const associated = doorsByRoom(dungeon);
  const cells = usableTiles(dungeon, furnishings);
  for (const room of adventure.rooms) {
    for (const field of contentFields) {
      const override = project.changes[room.id]?.[field];
      if (!override) continue;
      if (field === 'encounter' && override.value && !encounterFits(dungeon, cells[room.id], override.value)) {
        room.placementConflict = true;
        continue;
      }
      room[field] = override.value ?? undefined;
      if (field === 'encounter' && room.encounter && room.role === 'quiet') room.role = room.type;
    }
    const text = project.text[room.id];
    if (text?.name) room.name = text.name;
    if (text?.readAloud) room.readAloud = text.readAloud;
    room.keys = keyed.keys.filter(key => key.roomId === room.id);
    room.doors = associated[room.id];
    room.furnishings = furnishings.filter(item => item.roomId === room.id).map(item => item.kind);
  }
  if (keyed.keys.length) {
    // Keep the two adventure clues on the accessible side of the closed gates.
    const clues = adventure.rooms.filter(room => room.clue && !keyed.initialRooms.includes(room.id));
    const first = adventure.rooms.filter(room => keyed.initialRooms.includes(room.id) && !room.clue);
    for (const [index, source] of clues.entries()) {
      const target = first[index] ?? adventure.rooms[0];
      target.clue = [target.clue, source.clue].filter(Boolean).join(' ');
      source.clue = undefined;
    }
  }
  return { ...adventure, furnishings, kinds, keyed };
}

function updateContent(project, id, field, value, locked, roll) {
  const settings = project.changes[id] ??= {};
  settings[field] = { value: value ?? null, locked, roll };
}

export function nextRoomState(project, id) {
  return project.session.rooms[id] ??= { hp: {}, trap: false, loot: false, visited: false };
}

function clearRunField(project, id, field) {
  const state = project.session.rooms[id];
  if (!state) return;
  if (field === 'encounter') state.hp = {};
  if (field === 'trap') state.trap = false;
  if (field === 'treasure') state.loot = false;
}

export function rerollProjectRoom(project, dungeon, id, field, remove = false) {
  const previous = project.changes[id]?.[field];
  if (!contentFields.includes(field) || previous?.locked) return false;
  const adventure = makeProjectAdventure(dungeon, project);
  const room = adventure.rooms.find(entry => entry.id === id);
  if (!room) return false;
  const roll = ((previous?.roll ?? 0) + 1) >>> 0;
  const salt = dungeon.seed ^ Math.imul(project.revision + 1, 0x110ff795) ^
    Math.imul(id + 1, 0x1ae3103d) ^ Math.imul(roll + contentFields.indexOf(field), 0xaf27d90b);
  const value = remove ? null : rollRoomField(dungeon, room, project.party, field, salt, adventure.furnishings);
  if (!remove && !value) return false;
  updateContent(project, id, field, value, false, roll);
  clearRunField(project, id, field);
  return true;
}

export function toggleProjectLock(project, dungeon, id, field) {
  if (!contentFields.includes(field)) return;
  const room = makeProjectAdventure(dungeon, project).rooms.find(entry => entry.id === id);
  if (!room) return;
  const previous = project.changes[id]?.[field];
  updateContent(project, id, field, room[field], !previous?.locked, previous?.roll ?? 0);
}

export function rerollProjectSingle(project, id) {
  project.roomRevisions[id] = ((project.roomRevisions[id] ?? 0) + 1) >>> 0;
  const edits = project.changes[id] ?? {};
  for (const field of contentFields) if (!edits[field]?.locked) {
    delete edits[field];
    clearRunField(project, id, field);
  }
}

export function rerollProjectAll(project) {
  project.revision = (project.revision + 1) >>> 0;
  project.roomRevisions = {};
  for (const id of Object.keys(project.session.rooms)) {
    for (const field of contentFields) {
      if (!project.changes[id]?.[field]?.locked) clearRunField(project, id, field);
    }
  }
  for (const [id, changes] of Object.entries(project.changes)) {
    project.changes[id] = Object.fromEntries(Object.entries(changes).filter(([, edit]) => edit.locked));
  }
}

export function projectRoomAt(dungeon, x, y) {
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= dungeon.W || y >= dungeon.H) return undefined;
  const cell = y * dungeon.W + x;
  return dungeon.grid[cell] === FLOOR && dungeon.roomId[cell] >= 0 ? dungeon.roomId[cell] : undefined;
}

export function moveMonster(project, dungeon, id, groupIndex, unitIndex, x, y) {
  if (projectRoomAt(dungeon, x, y) !== id) return false;
  const adventure = makeProjectAdventure(dungeon, project);
  const room = adventure.rooms.find(entry => entry.id === id);
  const encounter = structuredClone(room?.encounter);
  const unit = encounter?.monsters[groupIndex]?.positions[unitIndex];
  if (!unit) return false;
  Object.assign(unit, { x, y });
  if (!encounterFits(dungeon, usableTiles(dungeon, adventure.furnishings)[id], encounter)) return false;
  updateContent(project, id, 'encounter', encounter, true, project.changes[id]?.encounter?.roll ?? 0);
  return true;
}

export function toggleCover(project, dungeon, id, x, y) {
  if (projectRoomAt(dungeon, x, y) !== id) return false;
  const stored = project.cover[id] ??= [];
  const old = stored.findIndex(tile => tile.x === x && tile.y === y);
  if (old >= 0) { stored.splice(old, 1); return true; }
  if (stored.length >= 20) return false;
  const before = makeProjectAdventure(dungeon, project);
  if (!usableTiles(dungeon, before.furnishings)[id].has(y * dungeon.W + x)) return false;
  stored.push({ x, y });
  if (makeProjectAdventure(dungeon, project).rooms.find(room => room.id === id).placementConflict) {
    stored.pop();
    return false;
  }
  return true;
}
