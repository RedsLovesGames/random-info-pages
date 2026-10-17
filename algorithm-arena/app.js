import { SORTS, generateArray, sortArray, findPath, runGraph } from './engine.mjs';
import { createSonifier } from './audio.mjs';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const algorithmNames = { bubble: 'Bubble sort', insertion: 'Insertion sort', selection: 'Selection sort', merge: 'Merge sort', quick: 'Quick sort', heap: 'Heap sort' };
const complexities = { bubble: 'O(n²)', insertion: 'O(n²)', selection: 'O(n²)', merge: 'O(n log n)', quick: 'O(n log n)', heap: 'O(n log n)' };
const sonifier = createSonifier(message => { $('#soundStatus').textContent = message; });
let seed = 0x51a7;
let initialArray = generateArray(32, 'random', seed);
let sortRuns = [];
let sortCursors = [];
let sortArrays = [];
let sortTimer = 0;
let sortPlaying = false;
let sortStarted = 0;
let sortAccumulated = 0;
let sortPositions = [];
let sortCanvases = new Map();
let playbackSpeed = 8;
let pathTimer = 0;
let pathRun = null;
let pathCursor = 0;
let pathPlaying = false;
let gridWidth = 24;
let gridHeight = 14;
let walls = new Set();
let terrain = {};
let startCell = { x: 1, y: 1 };
let goalCell = { x: 21, y: 11 };
let drawing = false;
let graphTimer = 0;
let graphRun = null;
let graphCursor = 0;
let graphPlaying = false;
let graphSelectedEdge = null;
let graphResult = null;
let graphNodes = [
  { id: 'A', x: .12, y: .47 }, { id: 'B', x: .31, y: .18 }, { id: 'C', x: .32, y: .72 },
  { id: 'D', x: .53, y: .39 }, { id: 'E', x: .7, y: .18 }, { id: 'F', x: .71, y: .7 }, { id: 'G', x: .9, y: .43 }
];
let graphEdges = [
  { a: 'A', b: 'B', weight: 4 }, { a: 'A', b: 'C', weight: 3 }, { a: 'B', b: 'C', weight: 5 },
  { a: 'B', b: 'D', weight: 2 }, { a: 'C', b: 'D', weight: 6 }, { a: 'D', b: 'E', weight: 3 },
  { a: 'D', b: 'F', weight: 2 }, { a: 'E', b: 'F', weight: 4 }, { a: 'E', b: 'G', weight: 5 }, { a: 'F', b: 'G', weight: 2 }
];
let graphDrag = null;
let graphDpr = Math.min(2, window.devicePixelRatio || 1);

function esc(value) {
  const span = document.createElement('span'); span.textContent = value; return span.innerHTML;
}

function makeSortCards() {
  $('#sortGrid').replaceChildren();
  for (const algorithm of SORTS) {
    const card = document.createElement('article');
    card.className = 'sort-card'; card.dataset.algorithm = algorithm;
    card.innerHTML = `<div class="sort-card-head"><h3>${algorithmNames[algorithm]}</h3><span class="complexity">${complexities[algorithm]}</span></div><canvas class="sort-canvas" role="img" aria-label="${algorithmNames[algorithm]} bar visualization"></canvas><div class="sort-metrics"><div><span>Compares</span><b data-count="comparisons">0</b></div><div><span>Swaps</span><b data-count="swaps">0</b></div><div><span>Writes</span><b data-count="writes">0</b></div></div><div class="sort-runtime"><span>Run <b data-runtime>—</b></span><span data-progress>not run</span></div>`;
    $('#sortGrid').append(card);
    const canvas = $('.sort-canvas', card);
    sortCanvases.set(algorithm, { canvas, card });
  }
}

function drawSort(algorithm) {
  const record = sortCanvases.get(algorithm);
  if (!record) return;
  const { canvas, card } = record;
  const rect = canvas.getBoundingClientRect();
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  const width = Math.max(1, rect.width), height = Math.max(1, rect.height);
  canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
  const ctx = canvas.getContext('2d'); ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.fillStyle = '#17201e'; ctx.fillRect(0, 0, width, height);
  const values = sortArrays[SORTS.indexOf(algorithm)] || initialArray;
  const event = sortRuns[SORTS.indexOf(algorithm)]?.trace[sortCursors[SORTS.indexOf(algorithm)] - 1];
  const count = values.length, gap = count > 48 ? 1 : 2, barWidth = Math.max(1, (width - 22 - gap * (count - 1)) / count);
  const max = Math.max(...initialArray, 1), base = height - 18;
  ctx.strokeStyle = '#394740'; ctx.beginPath(); ctx.moveTo(10, base + .5); ctx.lineTo(width - 10, base + .5); ctx.stroke();
  for (let i = 0; i < count; i += 1) {
    const barHeight = (values[i] / max) * (height - 38);
    const x = 11 + i * (barWidth + gap);
    ctx.fillStyle = '#49645b';
    if (event?.i === i || event?.j === i) ctx.fillStyle = event.type === 'compare' ? '#e49a69' : '#d2e969';
    if (sortPositions[SORTS.indexOf(algorithm)] >= sortRuns[SORTS.indexOf(algorithm)]?.trace.length) ctx.fillStyle = '#a6d49b';
    ctx.fillRect(x, base - barHeight, barWidth, barHeight);
  }
  canvas.setAttribute('aria-label', `${algorithmNames[algorithm]}, values ${values.join(', ')}${event ? `; current operation ${event.type} at position ${event.i + 1}` : ''}`);
  const counts = event?.counts || { comparisons: 0, swaps: 0, writes: 0 };
  for (const [name, value] of Object.entries(counts)) $(`[data-count="${name}"]`, card).textContent = String(value);
  const run = sortRuns[SORTS.indexOf(algorithm)];
  $('[data-runtime]', card).textContent = run ? `${run.runtimeMs.toFixed(2)} ms` : '—';
  const pos = sortCursors[SORTS.indexOf(algorithm)] || 0;
  $('[data-progress]', card).textContent = run ? (pos >= run.trace.length ? 'complete' : `${pos.toLocaleString()} / ${run.trace.length.toLocaleString()}`) : 'not run';
}

function drawAllSorts() { SORTS.forEach(drawSort); }

function refreshSortCards() {
  sortRuns = []; sortCursors = SORTS.map(() => 0); sortPositions = SORTS.map(() => 0); sortArrays = SORTS.map(() => [...initialArray]);
  drawAllSorts();
  $('#sortPlaybackTime').textContent = 'Playback 0.00 s';
  $('#sortStatus').textContent = 'Ready. All methods will use this same input.';
}

function prepareSorts() {
  pauseSorts();
  sortRuns = SORTS.map(algorithm => sortArray(initialArray, algorithm));
  sortCursors = SORTS.map(() => 0); sortPositions = SORTS.map(() => 0); sortArrays = SORTS.map(() => [...initialArray]);
  sortAccumulated = 0; sortStarted = 0;
  drawAllSorts();
  $('#sortStatus').textContent = `Six traces ready · ${initialArray.length} identical values · calculation and playback are timed separately.`;
  $('#sortPlay').disabled = false; $('#sortPlay').textContent = 'Pause';
}

function sortComplete() { return sortRuns.length === SORTS.length && SORTS.every((name, i) => sortPositions[i] >= sortRuns[i].trace.length); }

function advanceSorts() {
  if (!sortRuns.length) prepareSorts();
  let any = false;
  SORTS.forEach((algorithm, index) => {
    const run = sortRuns[index];
    if (sortPositions[index] >= run.trace.length) return;
    any = true;
    const event = run.trace[sortPositions[index]++];
    sortCursors[index] += 1; sortArrays[index] = event.array;
    const value = event.array[Math.max(0, event.i)] || 50;
    sonifier.play(event.type, value, playbackSpeed);
  });
  drawAllSorts();
  if (!any || sortComplete()) {
    pauseSorts(); sortArrays = sortRuns.map(run => [...run.sorted]); drawAllSorts();
    $('#sortStatus').textContent = 'All six methods reached the same ordered result.';
    $('#sortPlay').textContent = 'Replay'; sonifier.play('done', 100, playbackSpeed);
  }
  updateSortPlaybackTime();
}

function updateSortPlaybackTime() {
  const elapsed = sortAccumulated + (sortPlaying ? performance.now() - sortStarted : 0);
  $('#sortPlaybackTime').textContent = `Playback ${(elapsed / 1000).toFixed(2)} s`;
}

function playSorts() {
  if (!sortRuns.length || sortComplete()) prepareSorts();
  sortPlaying = true; sortStarted = performance.now();
  clearInterval(sortTimer);
  sortTimer = setInterval(advanceSorts, 1000 / playbackSpeed);
  $('#sortPlay').textContent = 'Pause';
  $('#sortStatus').textContent = 'Six traces are playing at the same event rate.';
}

function pauseSorts() {
  if (sortPlaying) sortAccumulated += performance.now() - sortStarted;
  sortPlaying = false; clearInterval(sortTimer); sortTimer = 0;
  updateSortPlaybackTime();
}

function singleStepSorts() {
  pauseSorts();
  if (!sortRuns.length) prepareSorts();
  advanceSorts();
}

function restartSorts() {
  pauseSorts();
  if (!sortRuns.length) { refreshSortCards(); return; }
  sortCursors = SORTS.map(() => 0); sortPositions = SORTS.map(() => 0); sortArrays = SORTS.map(() => [...initialArray]); sortAccumulated = 0;
  drawAllSorts(); $('#sortStatus').textContent = 'Same six traces reset to the identical starting input.';
  $('#sortPlay').textContent = 'Resume';
}

function randomizeArray() {
  seed += 0x9e3779b9;
  initialArray = generateArray(Number($('#arraySize').value), $('#distribution').value, seed);
  refreshSortCards();
}

function configurePlaybackSpeed(value) {
  playbackSpeed = Number(value);
  $('#speedLabel').textContent = `${playbackSpeed} steps/s`;
  if (sortPlaying) { pauseSorts(); playSorts(); }
  if (pathPlaying) playPath();
  if (graphPlaying) playGraph();
}

function stopPathPlayback() { pathPlaying = false; clearInterval(pathTimer); pathTimer = 0; $('#pathPlay').textContent = 'Resume'; }
function clearSearchMarks() {
  $$('.path-cell', $('#pathGrid')).forEach(cell => cell.classList.remove('frontier', 'visited', 'path'));
  pathRun = null; pathCursor = 0; stopPathPlayback();
  $('#pathPlay').disabled = true;
  $('#pathCost').textContent = '—'; $('#pathVisited').textContent = '—';
  $('#pathStatus').textContent = 'Search cleared. Your walls and terrain remain.';
}

function cellId(x, y) { return y * gridWidth + x; }
function clearCell(id) { walls.delete(id); delete terrain[id]; }

function renderGrid() {
  const grid = $('#pathGrid'); grid.replaceChildren();
  grid.style.setProperty('--grid-columns', String(gridWidth));
  grid.setAttribute('aria-rowcount', String(gridHeight)); grid.setAttribute('aria-colcount', String(gridWidth));
  const fragment = document.createDocumentFragment();
  for (let y = 0; y < gridHeight; y += 1) {
    for (let x = 0; x < gridWidth; x += 1) {
      const id = cellId(x, y), button = document.createElement('button');
      button.type = 'button'; button.className = 'path-cell'; button.dataset.id = String(id);
      button.setAttribute('role', 'gridcell'); button.setAttribute('aria-rowindex', String(y + 1)); button.setAttribute('aria-colindex', String(x + 1));
      button.setAttribute('aria-label', `Row ${y + 1}, column ${x + 1}${x === startCell.x && y === startCell.y ? ', start' : ''}${x === goalCell.x && y === goalCell.y ? ', destination' : ''}${walls.has(id) ? ', wall' : ''}${terrain[id] ? `, weight ${terrain[id]}` : ''}`);
      if (walls.has(id)) button.classList.add('wall');
      if (terrain[id]) { button.classList.add('weight'); button.dataset.weight = String(terrain[id]); }
      if (x === startCell.x && y === startCell.y) button.classList.add('start');
      if (x === goalCell.x && y === goalCell.y) button.classList.add('goal');
      fragment.append(button);
    }
  }
  grid.append(fragment);
}

function paintCell(id) {
  if (id < 0 || id >= gridWidth * gridHeight) return;
  const x = id % gridWidth, y = Math.floor(id / gridWidth), mode = $('#editMode').value;
  if (mode === 'start') { if (!walls.has(id) && !(x === goalCell.x && y === goalCell.y)) startCell = { x, y }; }
  else if (mode === 'goal') { if (!walls.has(id) && !(x === startCell.x && y === startCell.y)) goalCell = { x, y }; }
  else if (id === cellId(startCell.x, startCell.y) || id === cellId(goalCell.x, goalCell.y)) return;
  else if (mode === 'wall') {
    delete terrain[id];
    if (walls.has(id)) walls.delete(id); else walls.add(id);
  } else if (mode === 'weight') {
    walls.delete(id); terrain[id] = terrain[id] ? (terrain[id] >= 8 ? 2 : terrain[id] + 2) : 4;
  }
  clearSearchMarks(); renderGrid();
}

function pathPointerDown(event) {
  const cell = event.target.closest('.path-cell'); if (!cell) return;
  event.preventDefault(); drawing = true; paintCell(Number(cell.dataset.id));
}
function pathPointerMove(event) {
  if (!drawing) return;
  const cell = event.target.closest('.path-cell'); if (!cell) return;
  const id = Number(cell.dataset.id);
  if ($('#editMode').value === 'wall' && !walls.has(id)) paintCell(id);
  else if ($('#editMode').value === 'weight' && !terrain[id]) paintCell(id);
}
$('#pathGrid').addEventListener('pointerdown', pathPointerDown);
$('#pathGrid').addEventListener('pointerover', pathPointerMove);
window.addEventListener('pointerup', () => { drawing = false; });
$('#pathGrid').addEventListener('keydown', event => {
  const cell = event.target.closest('.path-cell'); if (!cell || !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
  event.preventDefault();
  const id = Number(cell.dataset.id), x = id % gridWidth, y = Math.floor(id / gridWidth);
  const next = { ArrowUp: id - gridWidth, ArrowDown: id + gridWidth, ArrowLeft: id - 1, ArrowRight: id + 1 }[event.key];
  if ((event.key === 'ArrowUp' && y > 0) || (event.key === 'ArrowDown' && y + 1 < gridHeight) || (event.key === 'ArrowLeft' && x > 0) || (event.key === 'ArrowRight' && x + 1 < gridWidth)) $(`.path-cell[data-id="${next}"]`, $('#pathGrid'))?.focus();
});

function makeMaze() {
  clearSearchMarks(); walls = new Set(); terrain = {};
  for (let x = 0; x < gridWidth; x += 1) { walls.add(cellId(x, 0)); walls.add(cellId(x, gridHeight - 1)); }
  for (let y = 0; y < gridHeight; y += 1) { walls.add(cellId(0, y)); walls.add(cellId(gridWidth - 1, y)); }
  for (let y = 1; y < gridHeight - 1; y += 1) for (let x = 1; x < gridWidth - 1; x += 1) walls.add(cellId(x, y));
  const sx = 1, sy = 1, stack = [[sx, sy]]; walls.delete(cellId(sx, sy));
  while (stack.length) {
    const [x, y] = stack.at(-1);
    const options = [[2, 0], [-2, 0], [0, 2], [0, -2]].map(([dx, dy]) => [x + dx, y + dy]).filter(([nx, ny]) => nx > 0 && nx < gridWidth - 1 && ny > 0 && ny < gridHeight - 1 && walls.has(cellId(nx, ny)));
    if (!options.length) { stack.pop(); continue; }
    const [nx, ny] = options[Math.floor(Math.random() * options.length)];
    walls.delete(cellId((x + nx) / 2, (y + ny) / 2)); walls.delete(cellId(nx, ny)); stack.push([nx, ny]);
  }
  startCell = { x: 1, y: 1 };
  goalCell = { x: gridWidth - (gridWidth % 2 === 0 ? 3 : 2), y: gridHeight - (gridHeight % 2 === 0 ? 3 : 2) };
  walls.delete(cellId(startCell.x, startCell.y)); walls.delete(cellId(goalCell.x, goalCell.y));
  renderGrid(); $('#pathStatus').textContent = 'Maze carved by recursive backtracking; the corridors stay editable.';
}

function setGridDimensions() {
  const nextWidth = Number($('#gridWidth').value), nextHeight = Number($('#gridHeight').value);
  $('#gridWidthLabel').textContent = String(nextWidth); $('#gridHeightLabel').textContent = String(nextHeight);
  gridWidth = nextWidth; gridHeight = nextHeight;
  walls = new Set(); terrain = {};
  startCell = { x: 1, y: 1 };
  goalCell = { x: gridWidth - (gridWidth % 2 === 0 ? 3 : 2), y: gridHeight - (gridHeight % 2 === 0 ? 3 : 2) };
  clearSearchMarks(); renderGrid();
}

function advancePath() {
  if (!pathRun) return;
  if (pathCursor >= pathRun.events.length) {
    stopPathPlayback(); sonifier.play('done', 80, playbackSpeed);
    $('#pathCost').textContent = pathRun.found ? String(pathRun.cost) : '—';
    $('#pathVisited').textContent = String(pathRun.visitedCount);
    $('#optimalityNote').textContent = pathRun.optimal ? `${pathRun.algorithm.toUpperCase()} returns an optimal path for this movement cost.` : pathRun.algorithm === 'dfs' ? 'Depth-first search does not guarantee a shortest path.' : 'Breadth-first search ignores weighted terrain; this route may not minimize total cost.';
    $('#pathStatus').textContent = pathRun.found ? `Reached the destination · ${pathRun.path.length - 1} steps · cost ${pathRun.cost}.` : 'No route connects the start and destination.';
    return;
  }
  const event = pathRun.events[pathCursor++];
  const cell = $(`.path-cell[data-id="${event.id}"]`, $('#pathGrid'));
  if (cell && !cell.classList.contains('start') && !cell.classList.contains('goal')) cell.className = `path-cell ${event.type}`;
  sonifier.play(event.type, Math.min(100, event.x / gridWidth * 100 + event.y / gridHeight * 100), playbackSpeed);
  if (pathCursor >= pathRun.events.length) advancePath();
}

function playPath() {
  if (!pathRun) return;
  pathPlaying = true; clearInterval(pathTimer);
  pathTimer = setInterval(advancePath, 1000 / playbackSpeed);
  $('#pathPlay').textContent = 'Pause';
}
function stepPath() { if (!pathRun) return; stopPathPlayback(); advancePath(); }
function runPathSearch() {
  stopPathPlayback(); clearSearchMarks();
  const terrainObject = { ...terrain };
  pathRun = findPath({ width: gridWidth, height: gridHeight, walls: [...walls], terrain: terrainObject, start: startCell, goal: goalCell, algorithm: $('#pathAlgorithm').value });
  pathCursor = 0; $('#pathPlay').disabled = false;
  $('#pathStatus').textContent = `${pathRun.algorithm.toUpperCase()} trace ready · ${pathRun.events.length} events.`;
  $('#optimalityNote').textContent = pathRun.optimal ? 'This method accounts for the cost model and returns an optimal path.' : pathRun.algorithm === 'dfs' ? 'Depth-first search does not guarantee a shortest path.' : 'Breadth-first search ignores weighted terrain; this route may not minimize total cost.';
  playPath();
}

function graphPoint(node) {
  const rect = $('#graphCanvas').getBoundingClientRect();
  return { x: node.x * rect.width, y: node.y * rect.height };
}

function drawGraph() {
  const canvas = $('#graphCanvas'), rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(rect.width * ratio); canvas.height = Math.round(rect.height * ratio);
  const ctx = canvas.getContext('2d'); ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.fillStyle = '#101716'; ctx.fillRect(0, 0, rect.width, rect.height);
  const selectedEdges = new Set(graphResult?.selectedEdges || []);
  const pathIds = graphResult?.path || [];
  const pathEdges = new Set();
  for (let i = 1; i < pathIds.length; i += 1) {
    graphEdges.forEach((edge, index) => { if ((edge.a === pathIds[i - 1] && edge.b === pathIds[i]) || (edge.b === pathIds[i - 1] && edge.a === pathIds[i])) pathEdges.add(index); });
  }
  graphEdges.forEach((edge, index) => {
    const from = graphNodes.find(node => node.id === edge.a), to = graphNodes.find(node => node.id === edge.b);
    if (!from || !to) return;
    const a = graphPoint(from), b = graphPoint(to);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = pathEdges.has(index) ? '#d2e969' : selectedEdges.has(index) ? '#a6d49b' : graphSelectedEdge === index ? '#ff9c6e' : '#56655c';
    ctx.lineWidth = pathEdges.has(index) || selectedEdges.has(index) || graphSelectedEdge === index ? 3 : 1.5; ctx.stroke();
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    ctx.fillStyle = '#101716'; ctx.fillRect(mid.x - 10, mid.y - 8, 20, 16);
    ctx.fillStyle = '#c4cec3'; ctx.font = '10px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(edge.weight), mid.x, mid.y);
  });
  graphNodes.forEach(node => {
    const point = graphPoint(node), visited = graphResult?.visited.includes(node.id), active = graphRun?.events.slice(0, graphCursor).some(event => event.id === node.id && event.type === 'visit');
    ctx.beginPath(); ctx.arc(point.x, point.y, 16, 0, Math.PI * 2);
    ctx.fillStyle = active ? '#d2e969' : visited ? '#a6d49b' : '#263631'; ctx.fill();
    ctx.strokeStyle = node.id === $('#graphStart').value ? '#d2e969' : node.id === $('#graphGoal').value ? '#ff9c6e' : '#82a096'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#edf2e8'; ctx.font = '12px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(node.id, point.x, point.y);
  });
  canvas.setAttribute('aria-label', `Editable graph with ${graphNodes.length} nodes and ${graphEdges.length} weighted links. Drag a node to move it. Current method ${$('#graphAlgorithm').selectedOptions[0]?.textContent || ''}.`);
}

function syncGraphControls() {
  const ids = graphNodes.map(node => node.id);
  const updateSelect = (selector, fallback) => {
    const select = $(selector), old = select.value || fallback;
    select.replaceChildren(...ids.map(id => { const option = document.createElement('option'); option.value = id; option.textContent = `Node ${id}`; return option; }));
    if (ids.includes(old)) select.value = old;
  };
  updateSelect('#graphStart', 'A'); updateSelect('#graphGoal', ids.at(-1));
  updateSelect('#edgeFrom', ids[0]); updateSelect('#edgeTo', ids.at(-1));
  $('#edgeList').replaceChildren();
  graphEdges.forEach((edge, index) => {
    const row = document.createElement('div'); row.className = `edge-item${graphSelectedEdge === index ? ' is-selected' : ''}`;
    const button = document.createElement('button'); button.type = 'button'; button.textContent = `${edge.a} ↔ ${edge.b}`; button.setAttribute('aria-label', `Select link ${edge.a} to ${edge.b}, weight ${edge.weight}`);
    button.addEventListener('click', () => { graphSelectedEdge = index; syncGraphControls(); drawGraph(); });
    const weight = document.createElement('span'); weight.textContent = String(edge.weight); row.append(button, weight); $('#edgeList').append(row);
  });
  drawGraph();
}

function graphCanvasPosition(event) {
  const rect = $('#graphCanvas').getBoundingClientRect(); return { x: event.clientX - rect.left, y: event.clientY - rect.top, width: rect.width, height: rect.height };
}
function nearestNode(point) {
  let nearest = null, best = Infinity;
  for (const node of graphNodes) {
    const p = graphPoint(node), distance = Math.hypot(point.x - p.x, point.y - p.y);
    if (distance < best) { best = distance; nearest = node; }
  }
  return best < 24 ? nearest : null;
}
function distanceToSegment(point, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, length = dx * dx + dy * dy;
  const t = length ? Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / length)) : 0;
  return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy));
}
$('#graphCanvas').addEventListener('pointerdown', event => {
  const point = graphCanvasPosition(event), node = nearestNode(point);
  if (node) { graphDrag = { id: node.id }; $('#graphCanvas').setPointerCapture(event.pointerId); return; }
  let nearest = -1, distance = 8;
  graphEdges.forEach((edge, index) => {
    const a = graphPoint(graphNodes.find(node => node.id === edge.a)), b = graphPoint(graphNodes.find(node => node.id === edge.b));
    const candidate = distanceToSegment(point, a, b); if (candidate < distance) { nearest = index; distance = candidate; }
  });
  graphSelectedEdge = nearest >= 0 ? nearest : null; syncGraphControls();
});
$('#graphCanvas').addEventListener('pointermove', event => {
  if (!graphDrag) return;
  const point = graphCanvasPosition(event), node = graphNodes.find(item => item.id === graphDrag.id);
  node.x = Math.max(.05, Math.min(.95, point.x / point.width)); node.y = Math.max(.07, Math.min(.93, point.y / point.height)); drawGraph();
});
$('#graphCanvas').addEventListener('pointerup', () => { graphDrag = null; });
$('#graphCanvas').addEventListener('pointercancel', () => { graphDrag = null; });

function resetGraphTrace() {
  graphRun = null; graphResult = null; graphCursor = 0; graphPlaying = false; clearInterval(graphTimer); graphTimer = 0;
  $('#graphPlay').disabled = true; $('#graphPlay').textContent = 'Pause';
  $('#graphValue').textContent = '—'; $('#graphVisited').textContent = '—';
  drawGraph();
}
function advanceGraph() {
  if (!graphRun) return;
  const event = graphRun.events[graphCursor++];
  if (event) {
    if (event.type === 'frontier' || event.type === 'visit' || event.type === 'edge' || event.type === 'path') sonifier.play(event.type, graphCursor / Math.max(1, graphRun.events.length) * 100, playbackSpeed);
    drawGraph();
  }
  if (graphCursor >= graphRun.events.length) {
    graphPlaying = false; clearInterval(graphTimer); graphTimer = 0; graphResult = graphRun;
    $('#graphPlay').textContent = 'Replay'; $('#graphValue').textContent = graphRun.cost === null ? '—' : String(graphRun.cost);
    $('#graphVisited').textContent = String(graphRun.visited.length);
    const mode = $('#graphAlgorithm').value;
    $('#graphValueLabel').textContent = mode === 'prim' ? 'minimum spanning forest weight' : ['bfs', 'dfs'].includes(mode) ? 'path length in links' : 'shortest path weight';
    $('#graphStatus').textContent = mode === 'prim' ? `Selected ${graphRun.selectedEdges.length} links across connected components.` : graphRun.path.length ? `Route ${graphRun.path.join(' → ')}.` : 'Traversal complete.';
    sonifier.play('done', 90, playbackSpeed);
    drawGraph();
  }
}
function playGraph() {
  if (!graphRun || graphCursor >= graphRun.events.length) runGraphSearch();
  if (!graphRun) return;
  graphPlaying = true; clearInterval(graphTimer); graphTimer = setInterval(advanceGraph, 1000 / playbackSpeed); $('#graphPlay').textContent = 'Pause';
}
function stepGraph() { if (!graphRun) runGraphSearch(); graphPlaying = false; clearInterval(graphTimer); graphTimer = 0; advanceGraph(); }
function runGraphSearch() {
  graphPlaying = false; clearInterval(graphTimer); graphCursor = 0; graphResult = null;
  graphRun = runGraph({ nodes: graphNodes, edges: graphEdges, start: $('#graphStart').value, goal: $('#graphGoal').value, algorithm: $('#graphAlgorithm').value });
  $('#graphPlay').disabled = false; $('#graphStatus').textContent = `${graphRun.algorithm.toUpperCase()} trace ready · ${graphRun.events.length} events.`; drawGraph(); playGraph();
}

$('#arraySize').addEventListener('input', () => { $('#arraySizeLabel').textContent = $('#arraySize').value; randomizeArray(); });
$('#distribution').addEventListener('change', randomizeArray);
$('#playbackSpeed').addEventListener('input', () => configurePlaybackSpeed($('#playbackSpeed').value));
$('#runSorts').addEventListener('click', () => { if (!sortRuns.length) prepareSorts(); playSorts(); });
$('#generateArray').addEventListener('click', randomizeArray);
$('#sortPlay').addEventListener('click', () => sortPlaying ? pauseSorts() : playSorts());
$('#sortStep').addEventListener('click', singleStepSorts);
$('#sortRestart').addEventListener('click', restartSorts);
$('#gridWidth').addEventListener('input', setGridDimensions);
$('#gridHeight').addEventListener('input', setGridDimensions);
$('#makeMaze').addEventListener('click', makeMaze);
$('#clearGrid').addEventListener('click', () => { walls = new Set(); terrain = {}; clearSearchMarks(); renderGrid(); });
$('#runPath').addEventListener('click', runPathSearch);
$('#pathPlay').addEventListener('click', () => pathPlaying ? stopPathPlayback() : playPath());
$('#pathStep').addEventListener('click', stepPath);
$('#pathReset').addEventListener('click', clearSearchMarks);
$('#addNode').addEventListener('click', () => {
  const id = String.fromCharCode(65 + graphNodes.length);
  if (graphNodes.length >= 20) { $('#graphHint').textContent = 'The canvas is limited to 20 nodes.'; return; }
  const angle = graphNodes.length * 2.399;
  graphNodes.push({ id, x: Math.max(.1, Math.min(.9, .5 + Math.cos(angle) * .38)), y: Math.max(.12, Math.min(.88, .5 + Math.sin(angle) * .35)) });
  resetGraphTrace(); syncGraphControls(); $('#graphHint').textContent = `Added node ${id}. Connect it to the network to include it in a route.`;
});
$('#addEdge').addEventListener('click', () => {
  const a = $('#edgeFrom').value, b = $('#edgeTo').value, weight = Math.max(1, Math.min(99, Number($('#edgeWeight').value) || 1));
  if (!a || !b || a === b) { $('#graphHint').textContent = 'Choose two different nodes.'; return; }
  const existing = graphEdges.findIndex(edge => (edge.a === a && edge.b === b) || (edge.a === b && edge.b === a));
  if (existing >= 0) graphEdges[existing].weight = weight; else graphEdges.push({ a, b, weight });
  graphSelectedEdge = null; resetGraphTrace(); syncGraphControls(); $('#graphHint').textContent = `Link ${a} ↔ ${b}, weight ${weight}, saved.`;
});
$('#connectNodes').addEventListener('click', () => {
  const a = $('#graphStart').value, b = $('#graphGoal').value;
  $('#edgeFrom').value = a; $('#edgeTo').value = b; $('#addEdge').click();
});
$('#deleteEdge').addEventListener('click', () => {
  if (graphSelectedEdge === null) { $('#graphHint').textContent = 'Select a link on the diagram or in its list first.'; return; }
  const [removed] = graphEdges.splice(graphSelectedEdge, 1); graphSelectedEdge = null; resetGraphTrace(); syncGraphControls();
  $('#graphHint').textContent = removed ? `Removed link ${removed.a} ↔ ${removed.b}.` : 'The selected link is no longer available.';
});
$('#runGraph').addEventListener('click', runGraphSearch);
$('#graphPlay').addEventListener('click', () => graphPlaying ? (graphPlaying = false, clearInterval(graphTimer), graphTimer = 0, $('#graphPlay').textContent = 'Resume') : playGraph());
$('#graphStep').addEventListener('click', stepGraph);
$('#graphReset').addEventListener('click', () => { resetGraphTrace(); $('#graphStatus').textContent = 'Graph view reset. Your nodes and links remain.'; });

$('#soundEnable').addEventListener('click', async () => {
  const enabled = await sonifier.enable();
  if (enabled) { $('#soundEnable').textContent = 'Sound enabled'; $('#muteSound').setAttribute('aria-pressed', 'false'); $('#muteSound').textContent = 'Mute'; }
});
$('#muteSound').addEventListener('click', async () => {
  if (!sonifier.enabled) {
    const enabled = await sonifier.enable();
    if (enabled) { $('#muteSound').setAttribute('aria-pressed', 'false'); $('#muteSound').textContent = 'Mute'; $('#soundEnable').textContent = 'Sound enabled'; }
    return;
  }
  const mute = !sonifier.muted; sonifier.setMuted(mute);
  $('#muteSound').setAttribute('aria-pressed', String(mute)); $('#muteSound').textContent = mute ? 'Unmute' : 'Mute';
});
$('#soundMode').addEventListener('change', event => sonifier.setMode(event.target.value));
$('#soundPreset').addEventListener('change', event => sonifier.setPreset(event.target.value));
$('#soundScale').addEventListener('change', event => sonifier.setScale(event.target.value));
$('#soundVolume').addEventListener('input', event => { const value = Number(event.target.value); $('#volumeLabel').textContent = `${value}%`; sonifier.setVolume(value / 100); });

function resizeCanvases() { drawAllSorts(); drawGraph(); }
window.addEventListener('resize', resizeCanvases);
makeSortCards(); refreshSortCards();
$('#arraySizeLabel').textContent = $('#arraySize').value;
$('#speedLabel').textContent = `${playbackSpeed} steps/s`;
$('#gridWidthLabel').textContent = String(gridWidth); $('#gridHeightLabel').textContent = String(gridHeight);
renderGrid(); syncGraphControls();
