import assert from 'node:assert/strict';
import test from 'node:test';
import { makeBattlemap } from '../dungeon-forge/battlemap-core.mjs';
import { createProject, decodeProject, makeProjectAdventure, rerollProjectRoom, rerollProjectAll,
  toggleProjectLock, projectRoomAt, moveMonster, projectKeyPlan, nextRoomState } from '../dungeon-forge/dungeon-project.mjs';

const settings = {seed: 1337, roomCount: 16, loopPercent: 15, decorPercent: 60, theme: 'frost'};
const dungeon = makeBattlemap(settings);
const party = {size: 4, level: 5, difficulty: 'moderate'};
const roomKey = () => createProject(settings, party);

test('portable projects recreate the layout and restore edits, locks, and session state', () => {
  const project = roomKey();
  toggleProjectLock(project, dungeon, dungeon.boss, 'encounter');
  project.notes[dungeon.boss] = 'Private GM note';
  project.doors[0] = 'secret';
  project.session.roomId = dungeon.boss;
  nextRoomState(project, dungeon.boss).loot = true;
  const restored = decodeProject(JSON.stringify(project));
  assert.deepEqual(restored, project);
  assert.deepEqual(makeBattlemap(restored.settings).grid, dungeon.grid);
  assert.equal(makeProjectAdventure(dungeon, restored).rooms.find(room => room.id === dungeon.boss).type, 'boss');
  assert.throws(() => decodeProject('{"version":999}'), /Dungeon Forge/);
});

test('a field reroll leaves other content alone and locks survive a full reroll', () => {
  const project = roomKey();
  const before = makeProjectAdventure(dungeon, project);
  const room = before.rooms.find(room => room.trap);
  assert.ok(room);
  rerollProjectRoom(project, dungeon, room.id, 'treasure');
  const edited = makeProjectAdventure(dungeon, project);
  const next = edited.rooms.find(item => item.id === room.id);
  assert.ok(next.treasure);
  assert.deepEqual(next.trap, room.trap);
  assert.deepEqual(edited.rooms.filter(item => item.id !== room.id), before.rooms.filter(item => item.id !== room.id));
  toggleProjectLock(project, dungeon, room.id, 'treasure');
  assert.equal(rerollProjectRoom(project, dungeon, room.id, 'treasure'), false);
  rerollProjectAll(project);
  assert.deepEqual(makeProjectAdventure(dungeon, project).rooms.find(item => item.id === room.id).treasure, next.treasure);
});

test('timed plans offer fewer fights and locked-door keys start on the accessible side', () => {
  const project = roomKey();
  project.minutes = 90;
  const adventure = makeProjectAdventure(dungeon, project);
  assert.ok(adventure.rooms.filter(room => room.encounter).length <= 2);
  assert.ok(adventure.rooms.find(room => room.id === dungeon.boss).encounter);
  assert.ok(adventure.keyed.keys.length);
  assert.equal(adventure.keyed.initialRooms.includes(dungeon.boss), false);
  assert.ok(adventure.rooms.filter(room => room.clue).every(room => adventure.keyed.initialRooms.includes(room.id)));
  const gate = projectKeyPlan(dungeon, {0:'locked', 1:'locked'});
  assert.equal(gate.keys.length, 2);
  assert.equal(gate.bossReachable, true);
  for (const key of gate.keys) assert.ok(gate.initialRooms.includes(key.roomId));
});

test('click mapping and monster moves preserve the original room and legal footprints', () => {
  const project = roomKey();
  const boss = makeProjectAdventure(dungeon, project).rooms.find(room => room.id === dungeon.boss);
  assert.equal(projectRoomAt(dungeon, boss.x, boss.y), boss.id);
  assert.equal(projectRoomAt(dungeon, -1, -1), undefined);
  assert.equal(moveMonster(project, dungeon, boss.id, 0, 0, 0, 0), false);
  const point = boss.encounter.monsters[0].positions[0];
  assert.equal(moveMonster(project, dungeon, boss.id, 0, 0, point.x, point.y), true);
});

test('PNG export encodes grid dimensions and integer pixel spacing for Owlbear', async () => {
  const { pngExportSpec } = await import('../dungeon-forge/battlemap-core.mjs');
  const small = pngExportSpec({W: 30,H: 24}, 100, 'delve');
  assert.deepEqual(small, {pixels:100, width:3000, height:2400, name:'delve-30x24.png'});
  const big = pngExportSpec({W: 139,H: 151}, 100, 'delve');
  assert.equal(big.width, 139 * big.pixels);
  assert.equal(big.height, 151 * big.pixels);
  assert.ok(big.width * big.height <= 15000000);
  assert.equal(big.name, 'delve-139x151.png');
});
