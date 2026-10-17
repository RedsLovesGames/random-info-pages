import {
  MILLION, DEFAULT_STATE, validateComparison, proportion, indexToPoint,
  pointToIndex, stageBounds, worldToScreen, screenToWorld, zoomAt,
  aggregateTiles, tileCoverage, areaSquareSide, encodeState, decodeState
} from './engine.mjs';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const canvas = $('#scaleCanvas');
const context = canvas.getContext('2d', { alpha: false });
const canvasWrap = $('#canvasWrap');
const dpr = () => Math.min(2, window.devicePixelRatio || 1);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const stageNames = ['ONE UNIT', 'TEN UNITS', 'ONE HUNDRED', 'ONE THOUSAND', 'TEN THOUSAND', 'ONE HUNDRED THOUSAND', 'ONE MILLION'];
const swatches = ['#bd7640', '#315b47', '#718c98'];

const decoded = decodeState(location.hash);
let state = { ...decoded.state, quantities: [...decoded.state.quantities] };
let selectedComparison = decoded.state.selected ?? 0;
let camera = state.camera || { x: 0.5, y: 0.5, scale: 1 };
let selectedUnit = null;
let viewport = (() => {
  const rect = canvas.getBoundingClientRect();
  return { width: Math.max(1, rect.width), height: Math.max(1, rect.height) };
})();
let raf = 0;
let shareTimer = 0;
let animationFrame = 0;
let cameraWasFit = state.camera === null;
let drag = null;
const pointers = new Map();
let pinch = null;

const denominatorInput = $('#denominator');
const quantityInputs = [0, 1, 2].map(index => $(`#quantity${index}`));
const errorBox = $('#formError');

function formatInteger(value) {
  return Number(value).toLocaleString('en-US');
}

function formatPercent(quantity, denominator) {
  const value = proportion(quantity, denominator) * 100;
  return `${new Intl.NumberFormat('en-US', { maximumSignificantDigits: 4 }).format(value)}%`;
}

function currentViewport() {
  const rect = canvas.getBoundingClientRect();
  return { width: Math.max(1, rect.width), height: Math.max(1, rect.height) };
}

function fitCamera(exponent = state.exponent) {
  const bounds = stageBounds(exponent);
  const padding = Math.min(64, Math.min(viewport.width, viewport.height) * 0.1);
  const scale = Math.min((viewport.width - padding * 2) / bounds.w, (viewport.height - padding * 2) / bounds.h);
  return { x: bounds.w / 2, y: bounds.h / 2, scale: Math.max(0.04, Math.min(200, scale)) };
}

function setCamera(next, animate = false) {
  cancelAnimationFrame(animationFrame);
  cameraWasFit = false;
  const from = { ...camera };
  if (!animate || reducedMotion.matches) {
    camera = { ...next };
    state.camera = { ...camera };
    scheduleRender();
    scheduleUrlUpdate();
    return;
  }
  const started = performance.now();
  const duration = 560;
  const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const step = now => {
    const progress = Math.min(1, (now - started) / duration);
    const amount = ease(progress);
    camera = {
      x: from.x + (next.x - from.x) * amount,
      y: from.y + (next.y - from.y) * amount,
      scale: Math.exp(Math.log(from.scale) + (Math.log(next.scale) - Math.log(from.scale)) * amount)
    };
    state.camera = { ...camera };
    scheduleRender();
    if (progress < 1) animationFrame = requestAnimationFrame(step);
    else scheduleUrlUpdate();
  };
  animationFrame = requestAnimationFrame(step);
}

function scheduleRender() {
  if (!raf) raf = requestAnimationFrame(() => { raf = 0; render(); });
}

function scheduleUrlUpdate() {
  clearTimeout(shareTimer);
  shareTimer = setTimeout(() => {
    const urlState = { ...state, selected: selectedComparison, camera: { ...camera } };
    history.replaceState(null, '', `${location.pathname}${location.search}${encodeState(urlState)}`);
  }, 180);
}

function showError(message = '') {
  errorBox.textContent = message;
  errorBox.hidden = !message;
}

function drawField(ctx, width, height) {
  const stageCount = 10 ** state.exponent;
  const tiles = aggregateTiles(camera, viewport, 4200, stageCount);
  const selectedQuantity = state.quantities[selectedComparison];
  let individual = 0;
  let groupedUnits = 0;
  let regionCount = 0;
  ctx.fillStyle = '#e6e8db';
  ctx.fillRect(0, 0, width, height);
  for (const tile of tiles) {
    const visibleCount = Math.min(tile.count, tileCoverage(tile, stageCount, MILLION));
    if (visibleCount <= 0) continue;
    regionCount += 1;
    const x = (tile.x - camera.x) * camera.scale + width / 2;
    const y = (tile.y - camera.y) * camera.scale + height / 2;
    const w = Math.max(0.35, tile.w * camera.scale);
    const h = Math.max(0.35, tile.h * camera.scale);
    ctx.fillStyle = '#d4d9ca';
    ctx.fillRect(x, y, w, h);
    const highlighted = Math.min(visibleCount, tileCoverage(tile, selectedQuantity, state.denominator));
    if (highlighted > 0) {
      const fraction = Math.max(0, Math.min(1, highlighted / visibleCount));
      ctx.fillStyle = swatches[selectedComparison];
      if (fraction >= 0.999999) ctx.fillRect(x, y, w, h);
      else if (w >= h) ctx.fillRect(x, y, w * fraction, h);
      else ctx.fillRect(x, y, w, h * fraction);
    }
    if (visibleCount < 1) continue;
    if (tile.count === 1) {
      individual += 1;
      ctx.strokeStyle = '#aeb7a7';
      ctx.lineWidth = Math.max(0.35, 0.75 / dpr());
      ctx.strokeRect(x, y, w, h);
    } else {
      groupedUnits += visibleCount;
      ctx.strokeStyle = '#abb5a5';
      ctx.lineWidth = Math.max(0.45, 0.75 / dpr());
      ctx.strokeRect(x, y, w, h);
      if (w > 37 && h > 20) {
        ctx.fillStyle = highlighted >= visibleCount ? '#f8f7f1' : '#64705f';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `${Math.min(12, Math.max(8, Math.floor(Math.min(w, h) * 0.23)))}px system-ui`;
        ctx.fillText(formatInteger(tile.count), x + w / 2, y + h / 2, w - 6);
      }
    }
  }
  if (selectedUnit !== null && selectedUnit < stageCount) {
    const point = indexToPoint(selectedUnit);
    const screen = worldToScreen(point, camera, viewport);
    if (screen.x >= 0 && screen.x <= width && screen.y >= 0 && screen.y <= height) {
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, Math.max(5, Math.min(13, camera.scale * 0.44)), 0, Math.PI * 2);
      ctx.strokeStyle = '#9c442c';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
  const visible = individual + groupedUnits;
  $('#renderNote').textContent = `${formatInteger(individual)} mark${individual === 1 ? '' : 's'} shown individually; ${formatInteger(Math.max(0, visible - individual))} marks in ${formatInteger(Math.max(0, regionCount - individual))} counted region${regionCount - individual === 1 ? '' : 's'}. No marks are sampled.`;
}

function drawBars(ctx, width, height) {
  ctx.fillStyle = '#f0f1e8';
  ctx.fillRect(0, 0, width, height);
  const left = Math.max(92, width * 0.19);
  const right = 30;
  const top = Math.max(56, height * 0.14);
  const rowGap = Math.min(105, (height - top - 55) / 3);
  ctx.font = '11px system-ui';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < 3; i += 1) {
    const y = top + rowGap * i;
    const fraction = state.quantities[i] / state.denominator;
    const barWidth = width - left - right;
    ctx.fillStyle = '#657064';
    ctx.textAlign = 'left';
    ctx.fillText(`COMPARISON ${'ABC'[i]}`, 22, y - 13);
    ctx.fillStyle = '#d8ddcf';
    ctx.fillRect(left, y, barWidth, 20);
    ctx.fillStyle = swatches[i];
    ctx.fillRect(left, y, barWidth * fraction, 20);
    ctx.fillStyle = '#26352b';
    ctx.textAlign = 'right';
    ctx.fillText(`${formatInteger(state.quantities[i])} · ${formatPercent(state.quantities[i], state.denominator)}`, width - right, y + 39);
    if (i === selectedComparison) {
      ctx.strokeStyle = '#9c442c';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(left - 3, y - 3, barWidth + 6, 26);
    }
  }
  ctx.fillStyle = '#777f72';
  ctx.font = '10px system-ui';
  ctx.textAlign = 'left';
  ctx.fillText('0', left, height - 20);
  ctx.textAlign = 'right';
  ctx.fillText(`${formatInteger(state.denominator)} · 100%`, width - right, height - 20);
  $('#renderNote').textContent = 'Each comparison starts at zero and shares one denominator. Bar length is proportional to its exact share.';
}

function drawAreas(ctx, width, height) {
  ctx.fillStyle = '#f0f1e8';
  ctx.fillRect(0, 0, width, height);
  const maxSide = Math.min(width / 3.8, height * 0.58);
  const centerY = height * 0.52;
  const centers = [width * 0.2, width * 0.5, width * 0.8];
  for (let i = 0; i < 3; i += 1) {
    const side = areaSquareSide(state.quantities[i], state.denominator, maxSide);
    ctx.fillStyle = '#d8ddcf';
    ctx.fillRect(centers[i] - maxSide / 2, centerY - maxSide / 2, maxSide, maxSide);
    ctx.fillStyle = swatches[i];
    ctx.fillRect(centers[i] - side / 2, centerY - side / 2, side, side);
    ctx.strokeStyle = i === selectedComparison ? '#9c442c' : '#8f9a89';
    ctx.lineWidth = i === selectedComparison ? 2 : 1;
    ctx.strokeRect(centers[i] - maxSide / 2, centerY - maxSide / 2, maxSide, maxSide);
    ctx.fillStyle = '#364138';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = '10px system-ui';
    ctx.fillText(`COMPARISON ${'ABC'[i]}`, centers[i], centerY + maxSide / 2 + 12);
    ctx.fillText(formatPercent(state.quantities[i], state.denominator), centers[i], centerY + maxSide / 2 + 27);
  }
  ctx.fillStyle = '#697164';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.font = '11px system-ui';
  ctx.fillText('Square area—not side length—represents the share.', width / 2, 26);
  $('#renderNote').textContent = 'Each tinted square has an area proportional to the share. Side lengths use the square root of each proportion.';
}

function render() {
  const rect = canvas.getBoundingClientRect();
  viewport = { width: Math.max(1, rect.width), height: Math.max(1, rect.height) };
  const pixelRatio = dpr();
  const backingWidth = Math.max(1, Math.round(viewport.width * pixelRatio));
  const backingHeight = Math.max(1, Math.round(viewport.height * pixelRatio));
  if (canvas.width !== backingWidth || canvas.height !== backingHeight) {
    canvas.width = backingWidth;
    canvas.height = backingHeight;
  }
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  if (state.style === 'bars') drawBars(context, viewport.width, viewport.height);
  else if (state.style === 'area') drawAreas(context, viewport.width, viewport.height);
  else drawField(context, viewport.width, viewport.height);
  const activeCount = 10 ** state.exponent;
  $('#scaleCount').textContent = formatInteger(activeCount);
  $('#scaleLabel').textContent = stageNames[state.exponent];
  $('#scaleCanvas').setAttribute('aria-label', state.style === 'field'
    ? `Field representing ${formatInteger(activeCount)} of one million unique positions. Comparison ${'ABC'[selectedComparison]} highlights ${formatInteger(state.quantities[selectedComparison])} of ${formatInteger(state.denominator)}, ${formatPercent(state.quantities[selectedComparison], state.denominator)}. Zoomed-out tiles are counted groups, not samples.`
    : `${state.style === 'bars' ? 'Bar lengths' : 'Square areas'} show three comparisons against ${formatInteger(state.denominator)}. Comparison ${'ABC'[selectedComparison]} is selected.`);
}

function updateTable() {
  const tbody = $('#comparisonTable');
  tbody.replaceChildren();
  state.quantities.forEach((quantity, index) => {
    const row = document.createElement('tr');
    const name = document.createElement('td');
    const amount = document.createElement('td');
    name.textContent = `Comparison ${'ABC'[index]} · ${formatInteger(quantity)}`;
    amount.textContent = formatPercent(quantity, state.denominator);
    row.append(name, amount);
    tbody.append(row);
    $(`#percent${index}`).textContent = formatPercent(quantity, state.denominator);
    const button = $(`.quantity-row[data-index="${index}"] .comparison-select`);
    button.setAttribute('aria-pressed', String(index === selectedComparison));
    button.classList.toggle('is-selected', index === selectedComparison);
  });
}

function commitInputs({ updateHash = true } = {}) {
  try {
    const denominator = validateComparison(0, denominatorInput.value).denominator;
    const quantities = quantityInputs.map(input => validateComparison(input.value, denominator).quantity);
    state.denominator = denominator;
    state.quantities = quantities;
    state.selected = selectedComparison;
    showError('');
    updateTable();
    updateSelectedUnitMessage();
    scheduleRender();
    if (updateHash) scheduleUrlUpdate();
    return true;
  } catch (error) {
    showError(error.message);
    return false;
  }
}

function syncInputs() {
  denominatorInput.value = String(state.denominator);
  quantityInputs.forEach((input, index) => { input.value = String(state.quantities[index]); });
  updateTable();
}

function updateSelectedUnitMessage() {
  const target = $('#selectedUnit');
  if (selectedUnit === null) {
    target.textContent = state.style === 'field' ? 'Choose a mark at close zoom to inspect its place in the count.' : 'Choose a comparison label to bring it forward in the view.';
    return;
  }
  const selectedSlot = selectedUnit + 1;
  const highlightedCount = state.quantities[selectedComparison] / state.denominator * MILLION;
  const inside = selectedSlot <= highlightedCount;
  target.textContent = `Unit ${formatInteger(selectedSlot)} of 1,000,000 · ${inside ? `inside` : `outside`} Comparison ${'ABC'[selectedComparison]} (${formatPercent(state.quantities[selectedComparison], state.denominator)} of the whole).`;
}

function setStage(exponent, { animate = true, fit = true, updateHash = true } = {}) {
  state.exponent = Math.max(0, Math.min(6, Number(exponent) | 0));
  $$('.scale-steps button[data-exponent]').forEach(button => {
    if (Number(button.dataset.exponent) === state.exponent) button.setAttribute('aria-current', 'step');
    else button.removeAttribute('aria-current');
  });
  if (selectedUnit !== null && selectedUnit >= 10 ** state.exponent) selectedUnit = null;
  updateSelectedUnitMessage();
  if (fit) {
    cameraWasFit = true;
    setCamera(fitCamera(state.exponent), animate);
    cameraWasFit = true;
  }
  else scheduleRender();
  if (updateHash) scheduleUrlUpdate();
}

function setStyle(style, updateHash = true) {
  if (!['field', 'bars', 'area'].includes(style)) return;
  state.style = style;
  $$('.style-switch button[data-style]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.style === style)));
  canvasWrap.classList.toggle('is-field', style === 'field');
  updateSelectedUnitMessage();
  scheduleRender();
  if (updateHash) scheduleUrlUpdate();
}

function chooseComparison(index) {
  selectedComparison = index;
  state.selected = index;
  updateTable();
  updateSelectedUnitMessage();
  scheduleRender();
}

function applyStory(id) {
  const stories = {
    one: {
      exponent: 6, denominator: 1_000_000, quantities: [1, 1000, 100000], style: 'field', selected: 0,
      text: 'One mark is easy to lose in a field of a million. Zoom all the way in, then step back until the whole count is visible.',
      source: 'A mathematical illustration · 1 of 1,000,000'
    },
    seconds: {
      exponent: 6, denominator: 1_000_000_000, quantities: [1_000_000, 31_557_600, 1_000_000_000], style: 'bars', selected: 0,
      text: 'One million seconds is 11 days, 13 hours, 46 minutes, 40 seconds. One billion seconds is about 31.7 years. A thousandfold increase changes the scale of everyday time.',
      source: 'Time conversion · 86,400 seconds per day · 365.25 days per year'
    },
    chance: {
      exponent: 6, denominator: 1_000_000, quantities: [1, 100, 10_000], style: 'field', selected: 0,
      text: 'Imagine one million equally likely tickets and one winning ticket. A one-in-a-million chance is one highlighted position in this complete field; it says nothing about the odds of a real event unless the tickets are truly equally likely.',
      source: 'Probability illustration · one equally likely outcome among 1,000,000'
    },
    small: {
      exponent: 6, denominator: 100_000_000, quantities: [100_000, 1_000_000, 10_000_000], style: 'field', selected: 0,
      text: 'One tenth of one percent sounds tiny. In a hypothetical population of 100 million, it still includes 100,000 people. The field keeps the share in proportion while the denominator changes.',
      source: 'Hypothetical population · 100,000 of 100,000,000 = 0.1%'
    },
    scale: {
      exponent: 6, denominator: 1_000_000, quantities: [100_000, 121_000, 900_000], style: 'area', selected: 0,
      text: 'A visual can mislead even when its values are correct. Bars should share a zero baseline; square area must scale by the square root of the share. A square representing 121,000 has a side 10% longer than one representing 100,000, but its area is 21% larger.',
      source: 'Design note · bars start at zero · square area encodes share by area'
    }
  };
  const story = stories[id];
  if (!story) return;
  selectedComparison = story.selected;
  state.selected = selectedComparison;
  state.denominator = story.denominator;
  state.quantities = [...story.quantities];
  $('#storyText').textContent = story.text;
  $('#storySource').textContent = story.source;
  $$('.story-button').forEach(button => button.classList.toggle('is-active', button.dataset.story === id));
  syncInputs();
  showError('');
  setStyle(story.style);
  setStage(story.exponent, { animate: true, fit: true });
  updateSelectedUnitMessage();
}

function pointerPosition(event) {
  const rect = canvas.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function zoomAtScreen(factor, anchor) {
  if (state.style !== 'field') setStyle('field');
  camera = zoomAt(camera, factor, anchor, viewport);
  cameraWasFit = false;
  state.camera = { ...camera };
  scheduleRender();
  scheduleUrlUpdate();
}

function inspectAt(screen) {
  const world = screenToWorld(screen, camera, viewport);
  const index = pointToIndex(world.x, world.y);
  if (index === null || index >= 10 ** state.exponent) return;
  selectedUnit = index;
  updateSelectedUnitMessage();
  scheduleRender();
}

function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function midpoint(a, b) { return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }

function pointerDown(event) {
  canvas.setPointerCapture(event.pointerId);
  pointers.set(event.pointerId, pointerPosition(event));
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    pinch = { camera: { ...camera }, center: midpoint(a, b), distance: Math.max(1, distance(a, b)) };
    drag = null;
  } else if (pointers.size === 1) {
    drag = { point: pointerPosition(event), camera: { ...camera }, moved: false, id: event.pointerId };
  }
}

function pointerMove(event) {
  if (!pointers.has(event.pointerId)) return;
  pointers.set(event.pointerId, pointerPosition(event));
  if (pointers.size >= 2 && pinch) {
    const [a, b] = [...pointers.values()];
    const center = midpoint(a, b);
    const factor = distance(a, b) / pinch.distance;
    const next = zoomAt(pinch.camera, factor, pinch.center, viewport);
    next.x -= (center.x - pinch.center.x) / next.scale;
    next.y -= (center.y - pinch.center.y) / next.scale;
    camera = next;
    cameraWasFit = false;
    state.camera = { ...camera };
    scheduleRender();
    return;
  }
  if (!drag || drag.id !== event.pointerId) return;
  const point = pointerPosition(event);
  const dx = point.x - drag.point.x;
  const dy = point.y - drag.point.y;
  if (Math.abs(dx) + Math.abs(dy) > 3) {
    drag.moved = true;
    canvasWrap.classList.add('is-dragging');
  }
  if (drag.moved && state.style === 'field') {
    camera = { ...drag.camera, x: drag.camera.x - dx / drag.camera.scale, y: drag.camera.y - dy / drag.camera.scale };
    cameraWasFit = false;
    state.camera = { ...camera };
    scheduleRender();
  }
}

function pointerUp(event) {
  const wasDrag = drag?.id === event.pointerId ? drag : null;
  if (wasDrag && !wasDrag.moved && pointers.size === 1 && state.style === 'field' && camera.scale >= 7) inspectAt(pointerPosition(event));
  pointers.delete(event.pointerId);
  if (pointers.size < 2) pinch = null;
  if (wasDrag) drag = null;
  if (pointers.size === 1) {
    const [id, point] = [...pointers.entries()][0];
    drag = { point, camera: { ...camera }, moved: false, id };
  }
  canvasWrap.classList.remove('is-dragging');
  scheduleUrlUpdate();
}

canvas.addEventListener('pointerdown', pointerDown);
canvas.addEventListener('pointermove', pointerMove);
canvas.addEventListener('pointerup', pointerUp);
canvas.addEventListener('pointercancel', pointerUp);
canvas.addEventListener('wheel', event => {
  if (state.style !== 'field') return;
  event.preventDefault();
  zoomAtScreen(Math.exp(-event.deltaY * 0.0014), pointerPosition(event));
}, { passive: false });
canvas.addEventListener('keydown', event => {
  if (event.key === 'ArrowRight' || event.key === 'ArrowUp') { event.preventDefault(); setStage(state.exponent + 1); }
  else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') { event.preventDefault(); setStage(state.exponent - 1); }
  else if (event.key === '+' || event.key === '=') { event.preventDefault(); zoomAtScreen(1.4, { x: viewport.width / 2, y: viewport.height / 2 }); }
  else if (event.key === '-') { event.preventDefault(); zoomAtScreen(1 / 1.4, { x: viewport.width / 2, y: viewport.height / 2 }); }
  else if (event.key === '0') { event.preventDefault(); setCamera(fitCamera(), true); cameraWasFit = true; }
});

$$('.scale-steps button[data-exponent]').forEach(button => button.addEventListener('click', () => setStage(button.dataset.exponent)));
$$('.style-switch button[data-style]').forEach(button => button.addEventListener('click', () => setStyle(button.dataset.style)));
$$('.story-button').forEach(button => button.addEventListener('click', () => applyStory(button.dataset.story)));
$$('.quantity-row').forEach(row => {
  const index = Number(row.dataset.index);
  $('.comparison-select', row).addEventListener('click', () => chooseComparison(index));
});
denominatorInput.addEventListener('input', () => commitInputs());
quantityInputs.forEach(input => input.addEventListener('input', () => commitInputs()));
  $('#fitButton').addEventListener('click', () => { cameraWasFit = true; setCamera(fitCamera(), true); cameraWasFit = true; });
$('#zoomIn').addEventListener('click', () => zoomAtScreen(1.5, { x: viewport.width / 2, y: viewport.height / 2 }));
$('#zoomOut').addEventListener('click', () => zoomAtScreen(1 / 1.5, { x: viewport.width / 2, y: viewport.height / 2 }));
$('#resetButton').addEventListener('click', () => {
  selectedComparison = 0;
  state = { ...DEFAULT_STATE, quantities: [...DEFAULT_STATE.quantities], camera: null };
  syncInputs();
  $('#storyText').textContent = 'One mark is easy to lose in a field of a million. Zoom all the way in, then step back until the whole count is visible.';
  $('#storySource').textContent = 'A mathematical illustration · 1 of 1,000,000';
  $$('.story-button').forEach(button => button.classList.toggle('is-active', button.dataset.story === 'one'));
  setStyle('field');
  setStage(0, { animate: true, fit: true });
});

$('#shareButton').addEventListener('click', async () => {
  const url = new URL(location.href);
  url.hash = encodeState({ ...state, selected: selectedComparison, camera: { ...camera } });
  const status = $('#shareStatus');
  try {
    await navigator.clipboard.writeText(url.href);
    status.textContent = 'Link copied';
  } catch {
    const helper = document.createElement('textarea');
    helper.value = url.href;
    helper.setAttribute('readonly', '');
    helper.style.position = 'fixed';
    helper.style.opacity = '0';
    document.body.append(helper);
    helper.select();
    const copied = document.execCommand('copy');
    helper.remove();
    status.textContent = copied ? 'Link copied' : 'Use the address bar to share this view';
  }
  setTimeout(() => { status.textContent = ''; }, 3200);
});

window.addEventListener('hashchange', () => {
  const result = decodeState(location.hash);
  state = { ...result.state, quantities: [...result.state.quantities] };
  cameraWasFit = !state.camera;
  camera = state.camera || fitCamera(state.exponent);
  selectedComparison = result.state.selected ?? 0;
  state.selected = selectedComparison;
  syncInputs();
  setStyle(state.style, false);
  setStage(state.exponent, { animate: false, fit: false, updateHash: false });
  if (result.recovered && location.hash) showError('That shared view could not be read, so the explorer has been reset.');
  else showError('');
  scheduleRender();
});

const resizeObserver = new ResizeObserver(() => {
  viewport = currentViewport();
  if (cameraWasFit) {
    camera = fitCamera(state.exponent);
    state.camera = { ...camera };
  }
  scheduleRender();
});
resizeObserver.observe(canvas);

syncInputs();
state.selected = selectedComparison;
setStyle(state.style, false);
setStage(state.exponent, { animate: false, fit: false, updateHash: false });
if (!decoded.recovered && decoded.state.camera) { camera = { ...decoded.state.camera }; cameraWasFit = false; }
else { camera = fitCamera(state.exponent); cameraWasFit = true; }
state.camera = { ...camera };
if (decoded.recovered && location.hash) showError('That shared view could not be read, so the explorer has been reset.');
updateSelectedUnitMessage();
render();
