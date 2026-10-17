import test from 'node:test';
import assert from 'node:assert/strict';
import { GRAPH_ALGORITHMS, PATHFINDERS, SORTS, findPath, generateArray, runGraph, sortArray } from '../algorithm-arena/engine.mjs';
import { createSonifier } from '../algorithm-arena/audio.mjs';

test('all six sorts handle deterministic, duplicate-heavy and adversarial inputs', () => {
  const inputs = [
    [], [1], [4, 1, 4, 1, 4, 1], [9, 8, 7, 6, 5, 4, 3, 2, 1],
    ...['random', 'sorted', 'reversed', 'nearly', 'duplicates'].map(kind => generateArray(48, kind, 9127))
  ].filter(values => values.length >= 2);

  for (const algorithm of SORTS) {
    for (const input of inputs) {
      const first = sortArray(input, algorithm);
      const second = sortArray(input, algorithm);
      assert.deepEqual(first.sorted, [...input].sort((a, b) => a - b), `${algorithm} sorts ${input}`);
      assert.deepEqual(first.trace, second.trace, `${algorithm} trace is deterministic`);
      assert.deepEqual(first.initial, input);
      assert.deepEqual(first.trace.at(-1)?.array, first.sorted);
      assert.ok(Number.isFinite(first.runtimeMs) && first.runtimeMs >= 0);
      assert.ok(first.counts.comparisons >= 0 && first.counts.swaps >= 0 && first.counts.writes >= 0);
    }
  }
  assert.throws(() => sortArray([2, 1], 'bogus'), /Unknown sorting algorithm/);
});

test('array generation is repeatable, supports every named distribution and enforces its bounds', () => {
  for (const distribution of ['random', 'sorted', 'reversed', 'nearly', 'duplicates']) {
    assert.deepEqual(generateArray(32, distribution, 77), generateArray(32, distribution, 77));
  }
  assert.deepEqual(generateArray(8, 'sorted'), [...generateArray(8, 'random')].sort((a, b) => a - b));
  assert.deepEqual(generateArray(8, 'reversed'), [...generateArray(8, 'sorted')].reverse());
  assert.throws(() => generateArray(1), /size/);
  assert.throws(() => generateArray(8, 'unknown'), /distribution/);
});

test('all pathfinders return a valid route and identify weighted non-optimal methods', () => {
  const base = { width: 5, height: 3, start: { x: 0, y: 1 }, goal: { x: 4, y: 1 } };
  for (const algorithm of PATHFINDERS) {
    const result = findPath({ ...base, algorithm });
    assert.equal(result.found, true, algorithm);
    assert.equal(result.path[0], 5);
    assert.equal(result.path.at(-1), 9);
    assert.equal(result.cost, result.path.length - 1);
    assert.ok(result.visitedCount > 0);
  }
  assert.equal(findPath({ ...base, algorithm: 'bfs' }).optimal, true);
  assert.equal(findPath({ ...base, algorithm: 'dfs' }).optimal, false);
  const longerDfs = { width: 8, height: 8, walls: [1, 5, 6, 16, 22, 34, 41, 44, 46, 60], start: { x: 0, y: 0 }, goal: { x: 7, y: 7 } };
  const shortest = findPath({ ...longerDfs, algorithm: 'bfs' });
  const depthFirst = findPath({ ...longerDfs, algorithm: 'dfs' });
  assert.ok(depthFirst.path.length > shortest.path.length, 'unweighted DFS can return a longer route than BFS');
  assert.equal(depthFirst.optimal, false);
  const terrain = { 6: 9, 7: 9, 8: 9 };
  const breadthFirst = findPath({ ...base, terrain, algorithm: 'bfs' });
  const dijkstra = findPath({ ...base, terrain, algorithm: 'dijkstra' });
  const aStar = findPath({ ...base, terrain, algorithm: 'astar' });
  assert.equal(breadthFirst.optimal, false);
  assert.equal(breadthFirst.cost, 28);
  assert.equal(dijkstra.cost, 6);
  assert.equal(aStar.cost, dijkstra.cost);
  assert.equal(dijkstra.optimal, true);
  const blocked = findPath({ ...base, walls: [1, 6, 11, 2, 7, 12, 3, 8, 13], algorithm: 'astar' });
  assert.equal(blocked.found, false);
  assert.deepEqual(blocked.path, []);
  assert.throws(() => findPath({ ...base, start: { x: -1, y: 0 } }), /coordinate|start/i);
  assert.throws(() => findPath({ ...base, width: 100, height: 100 }), /dimensions/);
});

test('graph traversals, weighted shortest path, and Prim forest report their own costs', () => {
  const nodes = ['A', 'B', 'C', 'D'].map((id, index) => ({ id, x: index, y: 0 }));
  const edges = [
    { a: 'A', b: 'B', weight: 8 }, { a: 'A', b: 'C', weight: 2 },
    { a: 'C', b: 'B', weight: 2 }, { a: 'B', b: 'D', weight: 2 },
    { a: 'C', b: 'D', weight: 9 }
  ];
  for (const algorithm of ['bfs', 'dfs']) {
    const result = runGraph({ nodes, edges, start: 'A', goal: 'D', algorithm });
    assert.equal(result.path[0], 'A');
    assert.equal(result.path.at(-1), 'D');
    assert.equal(result.cost, result.path.length - 1);
  }
  const shortest = runGraph({ nodes, edges, start: 'A', goal: 'D', algorithm: 'dijkstra' });
  assert.deepEqual(shortest.path, ['A', 'C', 'B', 'D']);
  assert.equal(shortest.cost, 6);
  assert.ok(shortest.events.length > 0);
  const tree = runGraph({ nodes, edges, start: 'A', algorithm: 'prim' });
  assert.equal(tree.selectedEdges.length, 3);
  assert.equal(tree.cost, 6);
  const disconnected = runGraph({ nodes: [...nodes, { id: 'E', x: 5, y: 0 }], edges, start: 'A', algorithm: 'prim' });
  assert.equal(disconnected.selectedEdges.length, 3);
  assert.equal(disconnected.visited.length, 5);
  assert.equal(disconnected.cost, 6);
  assert.deepEqual(GRAPH_ALGORITHMS, ['bfs', 'dfs', 'dijkstra', 'prim']);
  assert.throws(() => runGraph({ nodes, edges, start: 'missing' }), /missing/);
});

test('Web Audio sonifier enables only after user action, stays bounded, and honors mute', async t => {
  const previousWindow = globalThis.window;
  const oscillators = [];
  const gains = [];
  class FakeAudioContext {
    constructor() { this.currentTime = 10; this.destination = {}; this.state = 'suspended'; }
    async resume() { this.state = 'running'; }
    async close() { this.state = 'closed'; }
    createGain() {
      const gain = { value: 1, events: [], connect() {}, disconnect() {}, setTargetAtTime(value) { this.value = value; }, setValueAtTime(value) { this.events.push(value); }, exponentialRampToValueAtTime(value) { this.events.push(value); } };
      gains.push(gain); return { gain, connect() {}, disconnect() {} };
    }
    createOscillator() {
      const oscillator = { frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, stops: 0, connect() {}, start() {}, stop() { this.stops += 1; }, onended: null };
      oscillators.push(oscillator); return oscillator;
    }
  }
  globalThis.window = { AudioContext: FakeAudioContext };
  t.after(() => { globalThis.window = previousWindow; });

  const statuses = [];
  const sonifier = createSonifier(message => statuses.push(message));
  assert.equal(sonifier.muted, true);
  assert.equal(await sonifier.enable(), true);
  sonifier.setVolume(0.5);
  sonifier.setMode('percussive');
  sonifier.setPreset('sine');
  sonifier.setScale('major');
  for (let i = 0; i < 30; i += 1) sonifier.play(i % 2 ? 'swap' : 'compare', i, 60);
  assert.equal(oscillators.length, 18, 'dense comparisons are sampled while operation sounds remain');
  assert.ok(oscillators.slice(0, 12).every(voice => voice.stops > 0), 'older voices are stopped at the six voice cap');
  assert.ok(gains.slice(1).every(gain => Math.max(...gain.events) <= 0.22));
  sonifier.setMuted(true);
  const priorCount = oscillators.length;
  sonifier.play('done');
  assert.equal(oscillators.length, priorCount, 'muted sonifier creates no new voices');
  assert.ok(statuses.includes('Sound muted'));
  await sonifier.close();
});
