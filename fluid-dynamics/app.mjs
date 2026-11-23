import { FluidTank } from './fluid.mjs';

const byId = id => document.getElementById(id);
const canvas = byId('tank');
const context = canvas.getContext('2d', { alpha: false });

if (context) start();
else byId('model-error').hidden = false;

function start() {
  const smallScreen = matchMedia('(max-width: 700px), (pointer: coarse)').matches;
  const tank = smallScreen ? new FluidTank(108, 72) : new FluidTank(156, 104);
  const { width, height, stride } = tank;
  canvas.width = width;
  canvas.height = height;
  const frame = context.createImageData(width, height);
  const image = frame.data;
  const tankElement = canvas.parentElement;
  const view = byId('view'), obstacle = byId('obstacle');
  const pauseButton = byId('pause'), stepButton = byId('step');
  const brushSize = byId('brush-size'), viscosity = byId('viscosity'), persistence = byId('persistence');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const clampUnit = value => Math.max(0, Math.min(1, value));
  const rgb = hex => [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16) / 255);
  const teal = rgb('#49ded4'), orange = rgb('#ff8c52'), pink = rgb('#f275b8'), blue = rgb('#6e94ff');
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
    velocity: ['Still', 'Fast', '#081019, #39c4dd, #eef8ed'],
    vorticity: ['Counterclockwise', 'Clockwise', '#589eff, #081019, #ffa46f'],
    pressure: ['Negative', 'Positive', '#9764ee, #081019, #ffde73']
  };
  const stepInterval = 1000 / 30;
  const scale = height / 104;
  const pointers = new Map();
  let keyboard = { x: .5, y: .5 };
  let preset = 'vortex', mode = 'ink', paint = teal;
  let paused = reducedMotion.matches, visible = true, scheduled = 0, previousTime = 0, elapsed = 0, tick = 0;

  function render() {
    const { u, v, pressure, dye, solid } = tank;
    const current = view.value;
    const isCurl = current === 'vorticity';
    const cool = isCurl ? [80, 150, 232] : [140, 88, 221];
    const warm = isCurl ? [245, 149, 88] : [244, 206, 92];
    for (let y = 0, pixel = 0; y < height; y++) {
      for (let x = 0; x < width; x++, pixel += 4) {
        const i = y * stride + x;
        let r = 8, g = 15, b = 22;
        if (solid[i]) {
          const edge = !solid[i - 1] || !solid[i + 1] || !solid[i - stride] || !solid[i + stride];
          r = edge ? 138 : 28;
          g = edge ? 169 : 44;
          b = edge ? 172 : 51;
        } else if (current === 'dye') {
          // Tone mapping keeps faint filaments visible without clipping bright ink.
          r += 244 * Math.tanh(Math.pow(dye[0][i], .66) * .9);
          g += 237 * Math.tanh(Math.pow(dye[1][i], .66) * .9);
          b += 230 * Math.tanh(Math.pow(dye[2][i], .66) * .9);
        } else if (current === 'velocity') {
          const intensity = Math.tanh(Math.hypot(u[i] + u[i + 1], v[i] + v[i + stride]) * .36 / scale);
          const bright = intensity ** 4;
          r += 51 * intensity + 179 * bright;
          g += 196 * intensity + 37 * bright;
          b += 217 * intensity;
        } else {
          const value = isCurl ? tank.curl(x, y) : pressure[i];
          const strength = Math.tanh(Math.abs(value) * (isCurl ? 3.6 : 3.2));
          const tint = value < 0 ? cool : warm;
          r += tint[0] * strength;
          g += tint[1] * strength;
          b += tint[2] * strength;
        }
        image[pixel] = r;
        image[pixel + 1] = g;
        image[pixel + 2] = b;
        image[pixel + 3] = 255;
      }
    }
    context.putImageData(frame, 0, 0);
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
    tick++;
  }

  function seedVortex() {
    for (let i = 0; i < 48; i++) {
      const fraction = i / 47;
      const distance = .055 + fraction * .25;
      const angle = fraction * 5.25;
      for (let stripe = 0; stripe < 2; stripe++) {
        const t = angle + stripe * Math.PI;
        source(.5 + distance * Math.cos(t), .5 + 1.5 * distance * Math.sin(t), -.9 * Math.sin(t), .9 * Math.cos(t),
          stripe === 0 ? teal : orange, .54, 2 + fraction * 2.4, .15);
      }
    }
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
    restartClock();
  }

  function setView() {
    const legend = byId('legend');
    const labels = legends[view.value];
    legend.hidden = !labels;
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
  document.addEventListener('visibilitychange', restartClock);
  reducedMotion.addEventListener('change', event => { if (event.matches) setPaused(true); });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      restartClock();
    }).observe(canvas);
  }

  loadPreset(preset);
  setPaused(paused);
}
