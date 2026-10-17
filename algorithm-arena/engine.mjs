export const SORTS = Object.freeze(['bubble', 'insertion', 'selection', 'merge', 'quick', 'heap']);
export const PATHFINDERS = Object.freeze(['bfs', 'dfs', 'dijkstra', 'astar']);
export const GRAPH_ALGORITHMS = Object.freeze(['bfs', 'dfs', 'dijkstra', 'prim']);

export function generateArray(size = 32, distribution = 'random', seed = 0x51a7) {
  if (!Number.isInteger(size) || size < 2 || size > 120) throw new RangeError('Array size must be from 2 to 120.');
  let state = seed >>> 0 || 1;
  const random = () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0) / 0x100000000; };
  let values = Array.from({ length: size }, () => 8 + Math.floor(random() * 92));
  if (distribution === 'sorted') values.sort((a, b) => a - b);
  else if (distribution === 'reversed') values.sort((a, b) => b - a);
  else if (distribution === 'nearly') {
    values.sort((a, b) => a - b);
    for (let i = 0; i < Math.max(1, Math.floor(size / 12)); i += 1) {
      const a = Math.floor(random() * size), b = Math.floor(random() * size);
      [values[a], values[b]] = [values[b], values[a]];
    }
  } else if (distribution === 'duplicates') values = values.map(value => [20, 35, 50, 65, 80][Math.floor(random() * 5)]);
  else if (distribution !== 'random') throw new RangeError('Unknown distribution.');
  return values;
}

function sortCore(input, algorithm, capture) {
  if (!SORTS.includes(algorithm)) throw new RangeError(`Unknown sorting algorithm: ${algorithm}`);
  const values = [...input];
  const counts = { comparisons: 0, swaps: 0, writes: 0 };
  const trace = [];
  const record = (type, i, j = -1, value = null) => {
    if (type === 'compare') counts.comparisons += 1;
    else if (type === 'swap') counts.swaps += 1;
    else if (type === 'write') counts.writes += 1;
    if (capture) trace.push({ type, i, j, value, array: [...values], counts: { ...counts } });
  };
  const compare = (a, b, i, j) => { record('compare', i, j); return a - b; };
  const swap = (i, j) => {
    if (i === j) return;
    [values[i], values[j]] = [values[j], values[i]];
    record('swap', i, j);
  };
  const write = (index, value) => { values[index] = value; record('write', index, -1, value); };

  if (algorithm === 'bubble') {
    for (let end = values.length - 1; end > 0; end -= 1) {
      let changed = false;
      for (let i = 0; i < end; i += 1) {
        if (compare(values[i], values[i + 1], i, i + 1) > 0) { swap(i, i + 1); changed = true; }
      }
      if (!changed) break;
    }
  } else if (algorithm === 'insertion') {
    for (let i = 1; i < values.length; i += 1) {
      const key = values[i];
      let j = i - 1;
      while (j >= 0) {
        record('compare', j, i);
        if (values[j] <= key) break;
        write(j + 1, values[j]);
        j -= 1;
      }
      write(j + 1, key);
    }
  } else if (algorithm === 'selection') {
    for (let start = 0; start < values.length - 1; start += 1) {
      let smallest = start;
      for (let j = start + 1; j < values.length; j += 1) if (compare(values[j], values[smallest], j, smallest) < 0) smallest = j;
      swap(start, smallest);
    }
  } else if (algorithm === 'merge') {
    const mergeSort = (left, right) => {
      if (right - left < 2) return;
      const middle = Math.floor((left + right) / 2);
      mergeSort(left, middle); mergeSort(middle, right);
      const merged = [];
      let a = left, b = middle;
      while (a < middle && b < right) {
        if (compare(values[a], values[b], a, b) <= 0) merged.push(values[a++]);
        else merged.push(values[b++]);
      }
      while (a < middle) merged.push(values[a++]);
      while (b < right) merged.push(values[b++]);
      merged.forEach((value, offset) => write(left + offset, value));
    };
    mergeSort(0, values.length);
  } else if (algorithm === 'quick') {
    const partition = (low, high) => {
      const pivot = values[high];
      let boundary = low;
      for (let i = low; i < high; i += 1) if (compare(values[i], pivot, i, high) < 0) swap(boundary++, i);
      swap(boundary, high);
      return boundary;
    };
    const quickSort = (low, high) => {
      if (low >= high) return;
      const pivot = partition(low, high);
      quickSort(low, pivot - 1); quickSort(pivot + 1, high);
    };
    quickSort(0, values.length - 1);
  } else {
    const siftDown = (root, end) => {
      while (true) {
        let largest = root;
        const left = root * 2 + 1, right = left + 1;
        if (left <= end && compare(values[left], values[largest], left, largest) > 0) largest = left;
        if (right <= end && compare(values[right], values[largest], right, largest) > 0) largest = right;
        if (largest === root) break;
        swap(root, largest); root = largest;
      }
    };
    for (let start = Math.floor(values.length / 2) - 1; start >= 0; start -= 1) siftDown(start, values.length - 1);
    for (let end = values.length - 1; end > 0; end -= 1) { swap(0, end); siftDown(0, end - 1); }
  }
  return { sorted: values, counts, trace };
}

/** Runtime is a separate compute-only pass. Trace creation and visual playback are excluded. */
export function sortArray(input, algorithm) {
  const started = performance.now();
  const measured = sortCore(input, algorithm, false);
  const runtimeMs = performance.now() - started;
  const traced = sortCore(input, algorithm, true);
  return { algorithm, initial: [...input], sorted: measured.sorted, counts: traced.counts, trace: traced.trace, runtimeMs };
}

function cellId(x, y, width) { return y * width + x; }
function neighbors(id, width, height) {
  const x = id % width, y = Math.floor(id / width);
  const result = [];
  if (y > 0) result.push(id - width);
  if (x < width - 1) result.push(id + 1);
  if (y < height - 1) result.push(id + width);
  if (x > 0) result.push(id - 1);
  return result;
}

export function findPath({ width, height, walls = [], terrain = {}, start, goal, algorithm = 'astar' }) {
  if (!PATHFINDERS.includes(algorithm)) throw new RangeError(`Unknown pathfinder: ${algorithm}`);
  if (![width, height].every(Number.isInteger) || width < 2 || height < 2 || width * height > 5000) throw new RangeError('Grid dimensions are invalid.');
  const validPoint = point => point && Number.isInteger(point.x) && Number.isInteger(point.y) && point.x >= 0 && point.y >= 0 && point.x < width && point.y < height;
  if (!validPoint(start) || !validPoint(goal)) throw new RangeError('Start and goal coordinates must be inside the grid.');
  const startId = cellId(start.x, start.y, width), goalId = cellId(goal.x, goal.y, width);
  const size = width * height;
  if (!Array.isArray(walls) || walls.some(id => !Number.isInteger(id) || id < 0 || id >= size)) throw new RangeError('Wall cells must be inside the grid.');
  const wallSet = new Set(walls);
  if (wallSet.has(startId) || wallSet.has(goalId)) throw new RangeError('Start and goal cannot be walls.');
  const events = [];
  const parent = new Int32Array(size).fill(-1), visited = new Uint8Array(size), distanceMap = new Float64Array(size).fill(Infinity);
  const weightAt = id => Math.max(1, Math.min(9, Number(terrain[id]) || 1));
  const heuristic = id => Math.abs((id % width) - goal.x) + Math.abs(Math.floor(id / width) - goal.y);
  let visitedCount = 0, found = false;
  const mark = (type, id) => events.push({ type, x: id % width, y: Math.floor(id / width), id });

  if (algorithm === 'bfs' || algorithm === 'dfs') {
    const frontier = algorithm === 'bfs' ? new Int32Array(size) : [];
    let head = 0, tail = 0;
    const seen = new Uint8Array(size);
    if (algorithm === 'bfs') frontier[tail++] = startId; else frontier.push(startId);
    seen[startId] = 1; parent[startId] = startId; mark('frontier', startId);
    while (algorithm === 'bfs' ? head < tail : frontier.length) {
      const current = algorithm === 'bfs' ? frontier[head++] : frontier.pop();
      if (visited[current]) continue;
      visited[current] = 1; visitedCount += 1; mark('visit', current);
      if (current === goalId) { found = true; break; }
      const nextCells = neighbors(current, width, height);
      if (algorithm === 'dfs') nextCells.reverse();
      for (const next of nextCells) if (!wallSet.has(next) && !seen[next]) {
        seen[next] = 1; parent[next] = current; mark('frontier', next);
        if (algorithm === 'bfs') frontier[tail++] = next; else frontier.push(next);
      }
    }
  } else {
    const open = [{ id: startId, cost: 0, score: algorithm === 'astar' ? heuristic(startId) : 0 }];
    distanceMap[startId] = 0; parent[startId] = startId; mark('frontier', startId);
    while (open.length) {
      open.sort((a, b) => a.score - b.score || a.cost - b.cost || a.id - b.id);
      const currentItem = open.shift();
      const current = currentItem.id;
      if (visited[current] || currentItem.cost !== distanceMap[current]) continue;
      visited[current] = 1; visitedCount += 1; mark('visit', current);
      if (current === goalId) { found = true; break; }
      for (const next of neighbors(current, width, height)) {
        if (wallSet.has(next) || visited[next]) continue;
        const nextCost = currentItem.cost + weightAt(next);
        if (nextCost < distanceMap[next]) {
          distanceMap[next] = nextCost; parent[next] = current;
          const estimate = algorithm === 'astar' ? heuristic(next) : 0;
          open.push({ id: next, cost: nextCost, score: nextCost + estimate }); mark('frontier', next);
        }
      }
    }
  }

  const path = [];
  if (found) {
    for (let cursor = goalId; ; cursor = parent[cursor]) {
      path.push(cursor);
      if (cursor === startId) break;
      if (parent[cursor] < 0) { path.length = 0; break; }
    }
    path.reverse();
    for (const id of path) mark('path', id);
  }
  let cost = null;
  if (path.length) cost = path.slice(1).reduce((sum, id) => sum + weightAt(id), 0);
  const hasWeights = Object.values(terrain).some(value => Number(value) > 1);
  const optimal = algorithm === 'dijkstra' || algorithm === 'astar' || (algorithm === 'bfs' && !hasWeights);
  return { events, path, cost, visitedCount, found, optimal, algorithm };
}

export function runGraph({ nodes, edges, start, goal = null, algorithm = 'dijkstra' }) {
  if (!GRAPH_ALGORITHMS.includes(algorithm)) throw new RangeError(`Unknown graph algorithm: ${algorithm}`);
  const ids = new Set(nodes.map(node => node.id));
  if (!ids.has(start) || (goal !== null && !ids.has(goal))) throw new RangeError('Graph start or goal is missing.');
  const adjacency = new Map(nodes.map(node => [node.id, []]));
  edges.forEach((edge, index) => {
    if (!ids.has(edge.a) || !ids.has(edge.b) || edge.a === edge.b) throw new RangeError('Graph edge is invalid.');
    const weight = Math.max(1, Number(edge.weight) || 1);
    adjacency.get(edge.a).push({ id: edge.b, weight, edge: index });
    adjacency.get(edge.b).push({ id: edge.a, weight, edge: index });
  });
  const events = [], visited = new Set(), parent = new Map(), distances = new Map(nodes.map(node => [node.id, Infinity]));
  const selectedEdges = [], mark = (type, id, edge = null) => events.push({ type, id, edge });
  distances.set(start, 0);
  if (algorithm === 'bfs' || algorithm === 'dfs') {
    const frontier = [start]; parent.set(start, null); mark('frontier', start);
    while (frontier.length) {
      const id = algorithm === 'bfs' ? frontier.shift() : frontier.pop();
      if (visited.has(id)) continue;
      visited.add(id); mark('visit', id);
      if (id === goal) break;
      const adjacent = adjacency.get(id);
      if (algorithm === 'dfs') adjacent.reverse();
      for (const item of adjacent) if (!visited.has(item.id) && !parent.has(item.id)) {
        parent.set(item.id, id); selectedEdges.push(item.edge); frontier.push(item.id); mark('frontier', item.id, item.edge);
      }
    }
  } else if (algorithm === 'dijkstra') {
    const open = [{ id: start, cost: 0 }]; parent.set(start, null); mark('frontier', start);
    while (open.length) {
      open.sort((a, b) => a.cost - b.cost || String(a.id).localeCompare(String(b.id)));
      const current = open.shift();
      if (visited.has(current.id) || current.cost !== distances.get(current.id)) continue;
      visited.add(current.id); mark('visit', current.id);
      if (current.id === goal) break;
      for (const item of adjacency.get(current.id)) {
        const candidate = current.cost + item.weight;
        if (candidate < distances.get(item.id)) {
          distances.set(item.id, candidate); parent.set(item.id, current.id);
          selectedEdges.push(item.edge); open.push({ id: item.id, cost: candidate }); mark('frontier', item.id, item.edge);
        }
      }
    }
  } else {
    const components = [start];
    while (visited.size < nodes.length) {
      const root = components.shift() ?? nodes.find(node => !visited.has(node.id))?.id;
      if (root === undefined) break;
      if (visited.has(root)) continue;
      visited.add(root); mark('visit', root);
      const candidates = adjacency.get(root).map(item => ({ from: root, ...item }));
      while (candidates.length) {
        candidates.sort((a, b) => a.weight - b.weight || a.edge - b.edge);
        const edge = candidates.shift();
        if (visited.has(edge.id)) continue;
        visited.add(edge.id); selectedEdges.push(edge.edge); mark('edge', edge.id, edge.edge); mark('visit', edge.id);
        for (const next of adjacency.get(edge.id)) if (!visited.has(next.id)) candidates.push({ from: edge.id, ...next });
      }
    }
  }
  let path = [];
  if (goal !== null && visited.has(goal) && algorithm !== 'prim') {
    for (let cursor = goal; cursor !== null && cursor !== undefined; cursor = parent.get(cursor)) {
      path.push(cursor);
      if (cursor === start) break;
    }
    if (path.at(-1) === start) path.reverse(); else path = [];
    for (const id of path) mark('path', id);
  }
  const treeWeight = selectedEdges.reduce((sum, index) => sum + Math.max(1, Number(edges[index].weight) || 1), 0);
  const cost = algorithm === 'prim' ? treeWeight
    : algorithm === 'dijkstra' && goal !== null && Number.isFinite(distances.get(goal)) ? distances.get(goal)
      : path.length ? path.length - 1 : null;
  return { events, visited: [...visited], selectedEdges: [...new Set(selectedEdges)], path, cost, algorithm };
}
