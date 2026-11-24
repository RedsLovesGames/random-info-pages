import { FluidTank } from './fluid.mjs';
import { createTankRenderer } from './render.mjs';
import { createDyeGPU } from './dye-gpu.mjs';
import { createSurface3D } from './three-surface.mjs';
import { qualityProfile, transferFluidState } from './quality.mjs';
import { LEVELS, createAdaptiveController } from './adaptive.mjs';

const byId = id => document.getElementById(id);
const canvas = byId('tank');
const context = canvas.getContext('2d', { alpha: true });

if (context) start();
else byId('model-error').hidden = false;

function start() {
  const smallScreen = matchMedia('(max-width: 700px), (pointer: coarse)').matches;
  const qualityInput = byId('quality');
  const autoQuality = byId('auto-quality');
  const adaptiveStatus = byId('adaptive-status');
  const displayMode = byId('display-mode');
  const renderScaleInput = byId('render-scale');
  const glowInput = byId('glow');
  const exposureInput = byId('exposure');
  const paletteInput = byId('palette');
  const depthInput = byId('height-scale');
  const meshInput = byId('mesh-grid');
  const screenshot = byId('screenshot');
  const exportSize = byId('export-size');
  const exportFeedback = byId('export-feedback');
  const canvasGPU = byId('tank-gpu');
  const renderEngine = byId('render-engine');
  const interpolation = byId('interpolation');
  const detailInput = byId('surface-detail');
  const grainInput = byId('grain');
  const canvas3d = byId('tank-3d');
  const qualityNotice = byId('quality-notice');
  const savedSettings = (() => {
    try { return JSON.parse(localStorage.getItem('rip-fluid-quality-v1') || '{}'); } catch { return {}; }
  })();
  for (const id of ['quality', 'render-scale', 'glow', 'exposure', 'palette', 'height-scale',
    'render-engine', 'interpolation', 'surface-detail', 'grain', 'export-size']) {
    if (savedSettings[id] !== undefined) {
      const element = byId(id);
      if ([...element.options || []].some(o => o.value === String(savedSettings[id])) ||
          (element.type === 'range' && Number.isFinite(Number(savedSettings[id])))) element.value = savedSettings[id];
    }
  }
  if (typeof savedSettings['mesh-grid'] === 'boolean') meshInput.checked = savedSettings['mesh-grid'];
  if (savedSettings['auto-quality'] === true) autoQuality.checked = true;
  let autoCeiling = LEVELS.includes(savedSettings['auto-ceiling']) ?
    savedSettings['auto-ceiling'] : qualityInput.value;
  const adaptiveController = createAdaptiveController();
  let previousExternalQuality = null;
  let previousExternalAuto = null;
  let profile = qualityProfile(qualityInput.value, smallScreen);
  let tank = new FluidTank(profile.width, profile.height);
  let { width, height } = tank;
  let renderer = createTankRenderer(canvas, context, tank, smallScreen);
  let gpu = null;
  try { gpu = createDyeGPU(canvasGPU, tank, smallScreen); }
  catch (error) { console.warn('Enhanced fluid renderer unavailable, using Canvas2D', error); }
  if (!gpu) renderEngine.value = 'canvas';
  let three = null;
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
  let scale = height / 104;
  const pointers = new Map();
  let keyboard = { x: .5, y: .5 };
  let preset = 'vortex', mode = 'ink', paint = teal;
  let paused = reducedMotion.matches, visible = true, scheduled = 0, previousTime = 0, elapsed = 0, tick = 0;
  let frameClock = 0, frameCounter = 0;

  function usesGPU() {
    return displayMode.value === '2d' && view.value === 'dye'
      && renderEngine.value === 'gpu' && Boolean(gpu);
  }

  function syncCanvases() {
    const is3d = displayMode.value === '3d';
    canvas.hidden = is3d;
    canvas3d.hidden = !is3d;
    canvasGPU.hidden = !usesGPU();
  }

  function render() {
    syncCanvases();
    if (displayMode.value === '3d' && three) {
      three.render();
    } else if (usesGPU()) {
      try {
        gpu.render();
        renderer.renderTracers(tracers.checked);
      }
      catch (error) {
        console.error('GPU dye rendering failed; using compatibility renderer', error);
        renderEngine.value = 'canvas';
        syncCanvases();
        renderer.render(view.value, scale, tracers.checked);
      }
    } else renderer.render(view.value, scale, tracers.checked);
  }

  function saveVisualSettings() {
    try {
      const data = Object.fromEntries(['quality', 'render-scale', 'glow', 'exposure', 'palette', 'height-scale',
        'render-engine', 'interpolation', 'surface-detail', 'grain', 'export-size']
        .map(id => [id, byId(id).value]));
      data['mesh-grid'] = meshInput.checked;
      data['auto-quality'] = autoQuality.checked;
      data['auto-ceiling'] = autoCeiling;
      localStorage.setItem('rip-fluid-quality-v1', JSON.stringify(data));
    } catch { /* Persistence is optional. */ }
  }

  function configureRendering() {
    const multiplier = Number(renderScaleInput.value);
    const exposure = Number(exposureInput.value) / 100;
    const requestedScale = multiplier * profile.renderScale;
    const glow = Number(glowInput.value) / 100;
    const detail = Number(detailInput.value) / 100;
    const grain = Number(grainInput.value) / 100;
    renderer.setOptions({
      renderScale: requestedScale,
      glow,
      exposure,
      palette: paletteInput.value,
      tracerCount: profile.tracers
    });
    gpu?.configure({
      scale: requestedScale,
      glow,
      exposure,
      detail,
      grain,
      bicubic: interpolation.value === 'bicubic',
      palette: paletteInput.value
    });
    three?.configure({
      scale: Math.min(4, requestedScale),
      height: Number(depthInput.value) / 100,
      exposure,
      glow,
      detail,
      palette: paletteInput.value,
      wireframe: meshInput.checked,
      mesh: profile.mesh
    });
    byId('render-scale-value').textContent = multiplier + '×';
    byId('glow-value').textContent = glowInput.value + '%';
    byId('exposure-value').textContent = exposureInput.value + '%';
    byId('height-scale-value').textContent = depthInput.value + '%';
    byId('surface-detail-value').textContent = detailInput.value + '%';
    byId('grain-value').textContent = grainInput.value + '%';
    saveVisualSettings();
    render();
    const active = displayMode.value === '3d' ? canvas3d : usesGPU() ? canvasGPU : canvas;
    const actual = active.width + ' × ' + active.height;
    qualityNotice.textContent = 'Solver ' + width + ' × ' + height + ' · ' + profile.iterations
      + ' pressure iterations · live output ' + actual
      + (displayMode.value === '2d' ? (usesGPU() ? ' · WebGL2' : ' · Canvas2D') : ' · 3D WebGL2')
      + (autoQuality.checked ? ' · adaptive cap ' + autoCeiling : '');
  }

  function changeQuality({manual=false} = {}) {
    if (manual) {
      autoCeiling = qualityInput.value;
      adaptiveController.reset(performance.now());
      adaptiveStatus.textContent = 'Manual quality ceiling set to ' + autoCeiling + '.';
    }
    const next = qualityProfile(qualityInput.value, smallScreen);
    if (next.width !== width || next.height !== height) {
      const newTank = new FluidTank(next.width, next.height);
      transferFluidState(tank, newTank);
      tank = newTank;
      width = tank.width;
      height = tank.height;
      scale = height / 104;
      renderer = createTankRenderer(canvas, context, tank, smallScreen);
      gpu?.setTank(tank);
      three?.setTank(tank);
    }
    profile = next;
    updateSliders();
    configureRendering();
  }

  function changeDisplayMode() {
    if (displayMode.value === '3d' && !three) {
      try { three = createSurface3D(canvas3d, tank, smallScreen); } catch (error) {
        console.error('3D surface initialization failed', error);
      }
      if (!three) {
        displayMode.value = '2d';
        byId('mode-help').textContent = 'WebGL2 is unavailable; the 2D simulation remains fully functional.';
      }
    }
    const is3d = displayMode.value === '3d';
    canvas.hidden = is3d;
    canvas3d.hidden = !is3d;
    view.disabled = is3d;
    tankElement.dataset['3d'] = String(is3d);
    byId('legend').hidden = is3d || !legends[view.value];
    byId('tracer-option').hidden = is3d || view.value !== 'dye';
    byId('reset-camera').hidden = !is3d;
    byId('height-control').hidden = !is3d;
    byId('mesh-option').hidden = !is3d;
    if (is3d) byId('mode-help').textContent = 'Orbit: drag · Zoom: scroll or pinch-zoom gesture. Height represents 2D dye concentration, not a 3D flow solver.';
    else byId('mode-help').textContent = 'Draw on the 2D tank to stir and add dye.';
    renderer.resize();
    if (!is3d) gpu?.resize();
    configureRendering();
    if (is3d) three?.resize();
    render();
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
      iterations: profile.iterations
    });
    if (tracers.checked && displayMode.value === '2d') renderer.advanceTracers();
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
      frameCounter++;
      if (time - frameClock > 1000) {
        const fps = Math.round(frameCounter * 1000 / Math.max(1, time - frameClock));
        byId('fps').textContent = fps + ' FPS';
        if (autoQuality.checked) {
          const next = adaptiveController.observe(fps,time,qualityInput.value,autoCeiling);
          if (next) {
            const previous = qualityInput.value;
            qualityInput.value = next;
            changeQuality();
            adaptiveStatus.textContent = 'Adaptive quality: ' + previous + ' → ' + next +
              ' · ' + fps + ' fluid updates/s. Your dye and flow were retained.';
          }
        }
        frameClock = time;
        frameCounter = 0;
      }
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
    legend.hidden = !labels || displayMode.value === '3d';
    byId('tracer-option').hidden = Boolean(labels) || displayMode.value === '3d';
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
  qualityInput.addEventListener('change', () => changeQuality({manual:true}));
  autoQuality.addEventListener('change', () => {
    adaptiveController.reset(performance.now());
    if (autoQuality.checked) autoCeiling = qualityInput.value;
    adaptiveStatus.textContent = autoQuality.checked
      ? 'Adaptive quality is on. It can reduce this level if the flow slows below 23 updates/s.'
      : 'Adaptive quality is off. The chosen quality level remains fixed.';
    configureRendering();
  });
  displayMode.addEventListener('change', changeDisplayMode);
  for (const element of [renderScaleInput, glowInput, exposureInput, paletteInput,
    depthInput, meshInput, renderEngine, interpolation, detailInput, grainInput, exportSize]) {
    element.addEventListener('input', configureRendering);
  }
  byId('reset-camera').addEventListener('click', () => three?.resetCamera());
  screenshot.addEventListener('click', async () => {
    if (screenshot.disabled) return;
    const wasPaused = paused;
    setPaused(true);
    screenshot.disabled = true;
    screenshot.textContent = 'Rendering…';
    exportFeedback.dataset.error = 'false';
    exportFeedback.textContent = '';
    try {
      const target = exportSize.value === 'current' ? null : Number(exportSize.value);
      let blob;
      if (displayMode.value === '3d' && three) {
        blob = await three.capture(target);
      } else if (usesGPU()) {
        blob = await gpu.capture(target);
        if (tracers.checked) {
          const bitmap = await createImageBitmap(blob);
          try {
            const merged = document.createElement('canvas');
            merged.width = bitmap.width;
            merged.height = bitmap.height;
            const mergedContext = merged.getContext('2d');
            if (!mergedContext) throw new Error('Tracer PNG compositing is unavailable');
            mergedContext.drawImage(bitmap, 0, 0);
            renderer.paintTracers(mergedContext, merged.width);
            blob = await new Promise((resolve, reject) => merged.toBlob(
              value => value ? resolve(value) : reject(new Error('PNG compositing failed')), 'image/png'));
          } finally {
            bitmap.close?.();
          }
        }
      } else {
        const output = document.createElement('canvas');
        const w = target || canvas.width;
        const max = 7680;
        if (!Number.isInteger(w) || w < 1 || w > max) throw new Error('Invalid PNG dimensions');
        output.width = w;
        output.height = Math.round(w * height / width);
        const ctx = output.getContext('2d');
        if (!ctx) throw new Error('Canvas export is unavailable');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(canvas, 0, 0, output.width, output.height);
        blob = await new Promise((resolve, reject) => output.toBlob(
          value => value ? resolve(value) : reject(new Error('PNG encoding failed')), 'image/png'));
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'fluid-dynamics-' + displayMode.value + '-' +
        (target || (displayMode.value === '3d' ? canvas3d.width : usesGPU() ? canvasGPU.width : canvas.width)) + 'w.png';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      exportFeedback.textContent = 'PNG ready · ' + (blob.size / 1024 / 1024).toFixed(1) + ' MB';
    } catch (error) {
      console.error('Fluid PNG export failed', error);
      exportFeedback.dataset.error = 'true';
      exportFeedback.textContent = error.message || 'Export failed on this device';
    } finally {
      screenshot.disabled = false;
      screenshot.textContent = 'Export PNG';
      if (!wasPaused) setPaused(false);
    }
  });
  tracers.addEventListener('change', render);
  document.addEventListener('visibilitychange', () => {
    adaptiveController.reset(performance.now());
    frameClock = 0;
    frameCounter = 0;
    restartClock();
  });
  reducedMotion.addEventListener('change', event => { if (event.matches) setPaused(true); });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      adaptiveController.reset(performance.now());
      frameClock = 0;
      frameCounter = 0;
      restartClock();
    }).observe(tankElement);
  }

  renderer.resize();
  loadPreset(preset);
  setView();
  setPaused(paused);
  changeQuality();
  changeDisplayMode();
  window.RIPStudio = {
    /* Configuration snapshot, not a raw fluid-grid checkpoint. */
    getState() {
      return {
        format:'rip-fluid-settings-v1',
        preset,quality:qualityInput.value,adaptive:autoQuality.checked,
        view:view.value,displayMode:displayMode.value,
        brushSize:Number(brushSize.value),viscosity:Number(viscosity.value),
        persistence:Number(persistence.value),obstacle:obstacle.checked,
        tracers:tracers.checked
      };
    },
    setState(value) {
      if(!value||value.format!=='rip-fluid-settings-v1'||
        !Object.hasOwn(presets,value.preset)||
        !LEVELS.includes(value.quality))
        throw new Error('Unsupported fluid simulation configuration.');
      for(const name of ['brushSize','viscosity','persistence']){
        if(!Number.isFinite(value[name]))throw new RangeError('Invalid fluid input: '+name);
      }
      const validSelect=(select,value)=>[...select.options].some(o=>o.value===value);
      if(!validSelect(view,value.view)||!['2d','3d'].includes(value.displayMode))
        throw new RangeError('Invalid fluid visualization configuration.');
      setPaused(true);
      qualityInput.value=value.quality;
      autoQuality.checked=value.adaptive===true;
      autoCeiling=value.quality;
      adaptiveController.reset(performance.now());
      changeQuality();
      loadPreset(value.preset);
      for(const [element,v] of [[brushSize,value.brushSize],
        [viscosity,value.viscosity],[persistence,value.persistence]]){
        element.value=String(Math.max(Number(element.min),Math.min(Number(element.max),v)));
      }
      obstacle.checked=value.obstacle===true;
      tank.setObstacle(obstacle.checked);
      updateSliders();
      view.value=value.view;
      tracers.checked=value.tracers===true;
      displayMode.value=value.displayMode;
      changeDisplayMode();
      setView();render();
      setPaused(true);
    },
    setQuality(level) {
      if (level === 'eco') {
        if (previousExternalQuality === null) {
          previousExternalQuality = qualityInput.value;
          previousExternalAuto = autoQuality.checked;
        }
        autoQuality.checked = false;
        adaptiveController.reset(performance.now());
        qualityInput.value = 'eco';
        changeQuality();
        adaptiveStatus.textContent = 'Low effects mode selected Eco. Adaptive upshifting is suspended.';
      } else if (level === 'default' && previousExternalQuality !== null) {
        qualityInput.value = previousExternalQuality;
        autoQuality.checked = Boolean(previousExternalAuto);
        previousExternalQuality = null;
        previousExternalAuto = null;
        adaptiveController.reset(performance.now());
        changeQuality();
        adaptiveStatus.textContent = 'Restored the previous simulation quality and adaptive setting.';
      }
    },
    transport(action) {
      if(action==='play'){setPaused(false);return}
      if(action==='pause'){setPaused(true);return}
      if(action==='reset'){loadPreset(preset);setPaused(true);return}
      throw new Error('Unknown transport command');
    },
    metrics() {
      return {
        fps: Number.parseInt(byId('fps').textContent,10)||0,
        grid: width + ' × ' + height,
        quality: qualityInput.value,
        simulatedSteps:tick,
        preset
      };
    },
    async capture() {
      if (displayMode.value === '3d' && three) return three.capture(null);
      if (usesGPU()) {
        const image = await gpu.capture(null);
        if (!tracers.checked) return image;
        const bitmap = await createImageBitmap(image);
        try {
          const output = document.createElement('canvas');
          output.width = bitmap.width;
          output.height = bitmap.height;
          const ctx = output.getContext('2d');
          if (!ctx) throw new Error('Image capture is unavailable');
          ctx.drawImage(bitmap,0,0);
          renderer.paintTracers(ctx,output.width);
          return await new Promise((resolve,reject)=>output.toBlob(
            blob=>blob?resolve(blob):reject(new Error('Image encoding failed')),'image/png'));
        } finally { bitmap.close?.(); }
      }
      return new Promise((resolve,reject)=>canvas.toBlob(
        blob=>blob?resolve(blob):reject(new Error('PNG export failed')),'image/png'));
    }
  };
  if (autoQuality.checked)
    adaptiveStatus.textContent = 'Adaptive quality is active, with a ceiling of ' + autoCeiling + '.';
  if ('ResizeObserver' in window) new ResizeObserver(() => {
    if (displayMode.value === '3d') three?.resize();
    else {
      renderer.resize();
      gpu?.resize();
    }
    render();
  }).observe(tankElement);
}
