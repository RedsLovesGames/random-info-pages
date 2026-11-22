import assert from 'node:assert/strict';
import test from 'node:test';
import { makeBattlemap, universalVtt } from '../dungeon-forge/battlemap-core.mjs';
import { buildAdventure, encounterBudget, formatRoom } from '../dungeon-forge/adventure.mjs';

test('2024 encounter budgets scale with party size, level and difficulty', () => {
  assert.equal(encounterBudget({size: 4, level: 5, difficulty: 'moderate'}), 3000);
  assert.equal(encounterBudget({size: 5, level: 3, difficulty: 'moderate'}), 1125);
  assert.equal(encounterBudget({size: 6, level: 15, difficulty: 'high'}), 46800);
  assert.equal(encounterBudget({size: 1, level: 1, difficulty: 'low'}), 50);
});

test('a seeded one-shot has traps, treasure, clues and bounded encounters with legal monster squares', () => {
  for (const [size, level, difficulty] of [[1, 1, 'low'], [4, 5, 'moderate'], [8, 20, 'high']]) {
    const dungeon = makeBattlemap({seed: 1337, roomCount: 8, theme: 'ancient'});
    const party = {size, level, difficulty};
    const first = buildAdventure(dungeon, party);
    assert.deepEqual(first, buildAdventure(dungeon, party));
    assert.notDeepEqual(first.rooms, buildAdventure(dungeon, party, 1).rooms);
    assert.ok(first.hook && first.objective && first.complication && first.reward);
    assert.equal(first.rooms.length, 8);
    assert.ok(first.rooms.some(room => room.trap?.trigger && room.trap?.disarm && room.trap?.effect));
    assert.ok(first.rooms.some(room => room.treasure?.coins > 0 && room.treasure?.item));
    assert.ok(first.rooms.filter(room => room.clue).length >= 2);
    assert.ok(first.rooms.some(room => room.type === 'boss' && room.encounter?.totalXp > 0));
    assert.equal(first.rooms.find(room => room.type === 'entrance').encounter, undefined);
    for (const room of first.rooms) {
      assert.ok(room.name && room.readAloud && room.situation);
      if (!room.encounter) continue;
      const { monsters, totalXp, budget } = room.encounter;
      assert.equal(monsters.reduce((total, monster) => total + monster.xp * monster.positions.length, 0), totalXp);
      assert.ok(totalXp <= budget && budget <= encounterBudget(party));
      const occupied = new Set();
      for (const monster of monsters) {
        assert.ok(monster.hp && monster.ac && monster.page);
        for (const { x, y } of monster.positions) {
          for (let dy=0; dy<monster.space; dy++) for (let dx=0; dx<monster.space; dx++) {
            const cell=(y+dy)*dungeon.W+x+dx;
            assert.equal(dungeon.grid[cell], 1);
            assert.equal(dungeon.roomId[cell], room.id);
            assert.equal(occupied.has(cell), false);
            occupied.add(cell);
          }
        }
      }
      assert.match(formatRoom(room, 'private note'), /private note/);
    }
  }
});

test('entrance light is the only automatic primary light and keeps walls and the secret-free payload', () => {
  const dungeon = makeBattlemap({seed: 1337, roomCount: 8});
  const vtt = universalVtt(dungeon, {pixels: 32, image: 'cG5n', doors: true, lights: true, entranceLight: true});
  assert.ok(vtt.line_of_sight.length > 0);
  assert.ok(vtt.portals.length > 0);
  const primary = vtt.lights.filter(light => light.vision);
  assert.equal(primary.length, 1);
  const { position, range } = primary[0];
  assert.equal(range, 2);
  assert.equal(dungeon.roomId[Math.floor(position.y)*dungeon.W+Math.floor(position.x)], dungeon.entrance);
  assert.ok(vtt.lights.slice(1).every(light => light.vision === false));
  assert.equal(universalVtt(dungeon, {pixels: 32, image: 'cG5n'}).lights.length, 0);
  assert.equal(Object.hasOwn(vtt, 'rooms'), false);
});
