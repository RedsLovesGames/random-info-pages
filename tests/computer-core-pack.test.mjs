import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const ROOT = new URL('../', import.meta.url);
const sourcePath = (path) => new URL(path, ROOT);

async function importSource(path) {
  const code = await readFile(sourcePath(path), 'utf8');
  const url = `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
  return import(url);
}

test('Desktop registers one Core Apps launcher and all six core applications', async () => {
  const source = await readFile(
    sourcePath('scripts/win95-overrides/src/components/os/Desktop.tsx'),
    'utf8'
  );

  assert.match(source, /CoreAppsExplorer/);
  assert.match(source, /name:\s*'Core Apps'/);
  for (const component of [
    'Calculator',
    'Notepad',
    'Minesweeper',
    'Snake',
    'Game2048',
    'ReactionTest',
  ]) {
    assert.match(source, new RegExp(`\\b${component}\\b`), `${component} must be registered in Desktop`);
  }
});

test('calculator arithmetic handles the four core operations and divide-by-zero', async () => {
  const { applyOperation } = await importSource(
    'scripts/win95-overrides/src/components/applications/core/logic/calculator.js'
  );

  assert.equal(applyOperation(7, '*', 8), 56);
  assert.equal(applyOperation(8, '/', 2), 4);
  assert.equal(applyOperation(9, '-', 4), 5);
  assert.equal(applyOperation(3, '+', 6), 9);
  assert.equal(applyOperation(5, '/', 0), 'Error');
});

test('notepad word counting ignores repeated whitespace', async () => {
  const { countWords } = await importSource(
    'scripts/win95-overrides/src/components/applications/core/logic/text.js'
  );

  assert.equal(countWords(''), 0);
  assert.equal(countWords('one'), 1);
  assert.equal(countWords(' one   two\nthree '), 3);
});

test('reaction history stores newest attempts first and limits history', async () => {
  const { recordReaction } = await importSource(
    'scripts/win95-overrides/src/components/applications/core/logic/reaction.js'
  );

  const history = recordReaction([240, 260, 280, 300, 320], 210, 5);
  assert.deepEqual(history, [210, 240, 260, 280, 300]);
});

test('storage helper degrades safely when storage is unavailable or malformed', async () => {
  const { loadLocal, saveLocal } = await importSource(
    'scripts/win95-overrides/src/components/applications/core/logic/storage.js'
  );

  const broken = {
    getItem() { throw new Error('blocked'); },
    setItem() { throw new Error('blocked'); },
  };
  assert.deepEqual(loadLocal('x', { ok: true }, broken), { ok: true });
  assert.equal(saveLocal('x', 3, broken), false);

  const malformed = {
    getItem() { return '{bad json'; },
    setItem() {},
  };
  assert.equal(loadLocal('x', 42, malformed), 42);
});

test('minesweeper board always protects the first clicked cell', async () => {
  const { createBoard, toggleFlag } = await importSource(
    'scripts/win95-overrides/src/components/applications/core/logic/minesweeper.js'
  );

  let cursor = 0;
  const sequence = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
  const random = () => sequence[cursor++ % sequence.length];
  const board = createBoard(9, 9, 10, 0, random);

  assert.equal(board.length, 81);
  assert.equal(board[0].mine, false, 'first clicked cell must be safe');
  assert.equal(board.filter((cell) => cell.mine).length, 10);

  const flagged = toggleFlag(board, 1);
  assert.equal(flagged[1].flagged, true);
  assert.equal(toggleFlag(flagged, 1)[1].flagged, false);
});

test('snake advances, grows on food, and reports wall collision deterministically', async () => {
  const { stepSnake } = await importSource(
    'scripts/win95-overrides/src/components/applications/core/logic/snake.js'
  );

  const initial = [{ x: 2, y: 2 }, { x: 1, y: 2 }];
  const moved = stepSnake(initial, { x: 1, y: 0 }, { x: 3, y: 2 }, 8, 8);
  assert.equal(moved.collision, false);
  assert.equal(moved.ateFood, true);
  assert.equal(moved.snake.length, 3);
  assert.deepEqual(moved.snake[0], { x: 3, y: 2 });

  const collision = stepSnake([{ x: 7, y: 2 }], { x: 1, y: 0 }, { x: 0, y: 0 }, 8, 8);
  assert.equal(collision.collision, true);
});

test('2048 merges each tile only once per move', async () => {
  const { moveBoard } = await importSource(
    'scripts/win95-overrides/src/components/applications/core/logic/game2048.js'
  );

  const board = [
    2, 2, 2, 2,
    0, 0, 0, 0,
    0, 0, 0, 0,
    0, 0, 0, 0,
  ];
  const result = moveBoard(board, 'left');
  assert.deepEqual(result.board.slice(0, 4), [4, 4, 0, 0]);
  assert.equal(result.scoreDelta, 8);
  assert.equal(result.changed, true);
});
