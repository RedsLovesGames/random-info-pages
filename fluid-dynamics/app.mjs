import { FluidTank } from './fluid.mjs';
import { createTankRenderer } from './render.mjs';

const byId = id => document.getElementById(id);
const canvas = byId('tank');
const context = canvas.getContext('2d', { alpha: false });

if (context) start();
else byId('model-error').hidden = false;

function start() {
  const smallScreen = matchMedia('(max-width: 700px), (pointer: coarse)').matches;
  const tank = smallScreen ? new FluidTank(108, 72) : new FluidTank(156, 104);
  const { width, height } = tank;
  const renderer = createTankRenderer(canvas, context, tank, smallScreen);
  const tracers = byId('tracers');
  const status = byId('tank-status');
  const tankElement = canvas.parentElement;
  const view = byId('view'), obstacle = byId('obstacle');
  const pauseButton = byId('pause'), stepButton = byId('step');
  const brushSize = byId('brush-size'), viscosity = byId('viscosity'), persistence = byId('persistence');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const clampUnit = value => Math.max(0, Math.min(1, value));
  const rgb = hex => [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16) / 255);
  const teal = rgb('#49ded4'), orange = rgb('#ff8c52'), pink = rgb('#f275b8'), blue = rgb('#6e94ff');
  const cyan = rgb('#33dee9'), indigo = rgb('#6656ff'), orchid = rgb('#df60ed'), gold = rgb('#ffbc65');
  const buttons = key => [...document.querySelectorAll(`[data-${key}]`)];
  const setPressed = (key, value) => {
    for (const button of buttons(key)) button.setAttribute('aria-pressed', String(button.dataset[key] === value));
  };

  const presets = {
    vortex: { description: 'Follow two dyes around a rotating center.', viscosity: 8, persistence: 94 },
    jets: { description: 'Two angled jets meet in the middle and deflect.', viscosity: 14, persistence: 91 },
    wake: { description: 'A jet splits around a cylinder. Switch to Vorticity to see where the flow spins.', viscosity: 5, persistence: 90 },
    free: { description: 'Start with still fluid and use the brush to put it in motion.', viscosity: 10, persistence: 89 }
  };
  const legends = {
    velocity: ['Still', 'Fast', '#101932, #39c4dd, #e0f7ff'],
    vorticity: ['Counterclockwise', 'Clockwise', '#579cfb, #101932, #ff895f'],
    pressure: ['Negative', 'Positive', '#9764ee, #101932, #ffcc73']
  };
  const stepInterval = 1000 / 30;
  const scale = height / 104;
  const pointers = new Map();
  let keyboard = { x: .5, y: .5 };
  let preset = 'vortex', mode = 'ink', paint = teal;
  let paused = reducedMotion.matches, visible = true, scheduled = 0, previousTime = 0, elapsed = 0, tick = 0;

  function render() {
    renderer.render(view.value, scale, tracers.checked);
  }

  function source(x, y, dx, dy, color, amount, radius = 3, spin = 0) {
    tank.addImpulse(x, y, dx * scale, dy * scale, radius * scale, spin * scale);
    tank.addDye(x, y, radius * scale, color, amount);
  }

  function feedPreset() {
    const time = tick / 30;
    if (preset === 'vortex') {
      const angle = time * .94;
      for (let jet = 0; jet < 2; jet++) {
        const t = angle + Math.PI * jet;
        source(.5 + .205 * Math.cos(t), .5 + .3075 * Math.sin(t), -1.05 * Math.sin(t), 1.05 * Math.cos(t),
          jet === 0 ? teal : orange, .11, 2.9, .25);
      }
    } else if (preset === 'jets') {
      const oscillation = .025 * Math.sin(time * 2);
      source(.23, .40 + oscillation, 2.7, .55, pink, .15, 3.1, .25);
      source(.77, .60 - oscillation, -2.7, -.55, teal, .15, 3.1, -.25);
    } else if (preset === 'wake') {
      const oscillation = .013 * Math.sin(time * 2.1);
      source(.23, .467 + oscillation, 3.3, .04, teal, .14, 3.1, .2);
      source(.23, .533 + oscillation, 3.3, -.04, blue, .14, 3.1, -.16);
    }
  }

  function update() {
    feedPreset();
    tank.step({
      viscosity: (Number(viscosity.value) / 100) ** 1.4 * 1.6,
      retention: .932 + .067 * Number(persistence.value) / 100,
      iterations: smallScreen ? 16 : 19
    });
    if (tracers.checked) renderer.advanceTracers();
    tick++;
  }

  function seedVortex() {
    const ink = [[cyan, teal, indigo, cyan, teal, indigo], [orchid, pink, gold, orange, gold, orchid]];
    for (let arm = 0; arm < ink.length; arm++) {
      for (let lane = 0; lane < ink[arm].length; lane++) {
        for (let i = 0; i < 135; i++) {
          const t = i / 134;
          const angle = 1.32 + 7.45 * t + Math.PI * arm + lane * .057;
          const flutter = .011 * Math.sin(15 * t + lane * .82) + .005 * Math.sin(29 * t + lane);
          const radius = .027 + .31 * t ** 1.17 + (lane - 2.5) * (.003 + .009 * t) + flutter * t;
          const x = .5 + radius * Math.cos(angle) + .027 * Math.sin(t * 7);
          const y = .5 + radius * Math.sin(angle) * 1.23 + .033 * Math.cos(t * 8);
          const taper = .27 + .73 * Math.sin(Math.PI * t) ** .65;
          const billow = .55 + .45 * Math.sin(9 * t + lane * .96) ** 2;
          const strength = lane === 2 || lane === 3 ? .62 : .39;
          tank.addDye(x, y, (0.78 + .65 * t) * scale, ink[arm][lane], strength * taper * billow);
          if (lane === 2 && i % 4 === 0) {
            tank.addImpulse(x, y, -.48 * Math.sin(angle) * scale, .48 * Math.cos(angle) * scale, 4 * scale, .11 * scale);
          }
        }
      }
    }
    tank.addImpulse(.44, .44, .1, .1, 12 * scale, 1.25 * scale);
    tank.addImpulse(.6, .57, -.1, -.1, 10 * scale, .95 * scale);
  }

  function updateSliders() {
    for (const element of [brushSize, viscosity, persistence]) {
      byId(`${element.id}-value`).value = element.value + (element === brushSize ? ' / 10' : '%');
    }
    positionBrush(keyboard.x, keyboard.y);
  }

  function loadPreset(name) {
    preset = name;
    tick = 0;
    setPressed('preset', preset);
    byId('preset-help').textContent = presets[preset].description;
    viscosity.value = presets[preset].viscosity;
    persistence.value = presets[preset].persistence;
    obstacle.checked = preset === 'wake';
    tank.clear();
    renderer.reset();
    tank.setObstacle(obstacle.checked);
    if (preset === 'vortex') seedVortex();
    const startupSteps = { vortex: 2, jets: 15, wake: 22, free: 0 };
    for (let i = 0; i < startupSteps[preset]; i++) update();
    updateSliders();
    render();
  }

  function positionBrush(x, y) {
    tankElement.style.setProperty('--brush-x', `${x * 100}%`);
    tankElement.style.setProperty('--brush-y', `${y * 100}%`);
    tankElement.style.setProperty('--brush-ring', `${(6 + Number(brushSize.value) * 2.85) * scale * 100 / width}%`);
  }

  function applyBrush(point, dx, dy) {
    const radius = (3 + Number(brushSize.value) * 1.43) * scale;
    const force = (value, dimension) => Math.max(-4, Math.min(4, value * dimension * .45));
    tank.addImpulse(point.x, point.y, force(dx, width), force(dy, height), radius, .65 * scale);
    if (mode === 'ink') tank.addDye(point.x, point.y, radius * .8, paint, .58);
  }

  function pointerPoint(event) {
    const bounds = canvas.getBoundingClientRect();
    return {
      x: clampUnit((event.clientX - bounds.left) / bounds.width),
      y: clampUnit((event.clientY - bounds.top) / bounds.height)
    };
  }

  function stroke(event) {
    const point = pointerPoint(event);
    positionBrush(point.x, point.y);
    const previous = pointers.get(event.pointerId);
    if (!previous) return;
    const dx = point.x - previous.x, dy = point.y - previous.y;
    const distance = Math.hypot(dx * width, dy * height);
    const samples = Math.min(18, Math.max(1, Math.ceil(distance / (2 + Number(brushSize.value) * .45))));
    for (let sample = 1; sample <= samples; sample++) {
      const t = sample / samples;
      applyBrush({ x: previous.x + t * dx, y: previous.y + t * dy }, dx / samples, dy / samples);
    }
    pointers.set(event.pointerId, point);
    if (paused) render();
  }

  canvas.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    const point = pointerPoint(event);
    canvas.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, point);
    positionBrush(point.x, point.y);
    applyBrush(point, 0, 0);
    if (paused) render();
  });
  canvas.addEventListener('pointerenter', () => { tankElement.dataset.pointer = 'true'; });
  canvas.addEventListener('pointerleave', () => { delete tankElement.dataset.pointer; });
  canvas.addEventListener('pointermove', stroke);
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    canvas.addEventListener(event, pointer => {
      pointers.delete(pointer.pointerId);
      if (pointer.pointerType !== 'mouse') delete tankElement.dataset.pointer;
    });
  }

  canvas.addEventListener('focus', () => positionBrush(keyboard.x, keyboard.y));
  canvas.addEventListener('keydown', event => {
    const directions = { ArrowLeft: [-.035, 0], ArrowRight: [.035, 0], ArrowUp: [0, -.05], ArrowDown: [0, .05] };
    const direction = directions[event.key];
    if (direction) {
      event.preventDefault();
      keyboard = { x: clampUnit(keyboard.x + direction[0]), y: clampUnit(keyboard.y + direction[1]) };
      positionBrush(keyboard.x, keyboard.y);
    }
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      applyBrush(keyboard, .04, 0);
      if (paused) render();
    }
  });

  function animate(time) {
    scheduled = 0;
    if (paused || !visible || document.hidden) return;
    elapsed += previousTime ? Math.min(time - previousTime, stepInterval * 2) : stepInterval;
    previousTime = time;
    if (elapsed >= stepInterval) {
      update();
      elapsed %= stepInterval;
      render();
    }
    requestTick();
  }

  function requestTick() {
    if (!scheduled && !paused && visible && !document.hidden) scheduled = requestAnimationFrame(animate);
  }

  function restartClock() {
    cancelAnimationFrame(scheduled);
    scheduled = 0;
    previousTime = 0;
    elapsed = 0;
    requestTick();
  }

  function setPaused(value) {
    paused = value;
    pauseButton.textContent = paused ? 'Resume' : 'Pause';
    stepButton.disabled = !paused;
    status.textContent = paused ? 'Paused' : 'Running';
    status.dataset.running = String(!paused);
    restartClock();
  }

  function setView() {
    const legend = byId('legend');
    const labels = legends[view.value];
    legend.hidden = !labels;
    byId('tracer-option').hidden = Boolean(labels);
    if (labels) {
      byId('legend-low').textContent = labels[0];
      byId('legend-high').textContent = labels[1];
      legend.querySelector('i').style.backgroundImage = `linear-gradient(90deg, ${labels[2]})`;
    }
    render();
  }

  for (const button of buttons('preset')) button.addEventListener('click', () => loadPreset(button.dataset.preset));
  for (const button of buttons('mode')) button.addEventListener('click', () => {
    mode = button.dataset.mode;
    setPressed('mode', mode);
  });
  for (const button of buttons('color')) {
    button.style.setProperty('--swatch', button.dataset.color);
    button.addEventListener('click', () => {
      paint = rgb(button.dataset.color);
      setPressed('color', button.dataset.color);
    });
  }
  for (const input of [brushSize, viscosity, persistence]) input.addEventListener('input', updateSliders);
  obstacle.addEventListener('change', () => {
    tank.setObstacle(obstacle.checked);
    render();
  });
  pauseButton.addEventListener('click', () => setPaused(!paused));
  stepButton.addEventListener('click', () => { update(); render(); });
  byId('reset').addEventListener('click', () => loadPreset(preset));
  view.addEventListener('change', setView);
  tracers.addEventListener('change', render);
  document.addEventListener('visibilitychange', restartClock);
  reducedMotion.addEventListener('change', event => { if (event.matches) setPaused(true); });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      restartClock();
    }).observe(canvas);
  }

  renderer.resize();
  loadPreset(preset);
  setView();
  setPaused(paused);
  new ResizeObserver(() => {
    if (renderer.resize()) render();
  }).observe(canvas);
}
