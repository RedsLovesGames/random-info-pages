/**
 * Device Worlds: one small fictional machine observed through four interfaces.
 * This module contains no DOM access. All mutations are deterministic and bounded.
 */
export const SCHEMA_VERSION = 2;
export const STORAGE_KEY = 'rip-device-worlds-v2';
export const PALETTES = Object.freeze(['lime','lilac','peach','blue']);
export const MAX_EVENTS = 60;
const TYPES = new Set(['windows','linux','apple','android','between']);

const int = (value, min, max, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback;
};
const asObject = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const unique = values => [...new Set(Array.isArray(values) ? values.filter(s => typeof s === 'string') : [])].slice(0, 40);
export const hashSeed = input => {
  let hash = 2166136261;
  for (const char of String(input).slice(0, 120)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};
export const nextRandom = seed => {
  let x = seed >>> 0;
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  return x >>> 0;
};

export function createInitialState(seed = 'first-contact') {
  const number = hashSeed(seed);
  return {
    schemaVersion: SCHEMA_VERSION,
    seed: String(seed).slice(0, 80) || 'first-contact',
    revision: 0,
    signal: { steps: [0,2,4,7,5,3,1,4], tempo: 96, palette: 'lilac', charge: 3 },
    weather: { rain: 16, sun: 70, wind: 22 },
    creature: { name: 'Pip', mood: 55, energy: 74 },
    sketch: Array(64).fill(0),
    visited: [],
    discoveries: [],
    journal: [],
    lastAction: 'The machine is awake.',
    entropy: number || 1
  };
}

export function normalizeState(raw) {
  const obj = asObject(raw);
  const basis = createInitialState(typeof obj.seed === 'string' ? obj.seed : undefined);
  const signal = asObject(obj.signal), weather = asObject(obj.weather), creature = asObject(obj.creature);
  const sourceSteps = Array.isArray(signal.steps) && signal.steps.length === 8 ? signal.steps : basis.signal.steps;
  const sourceSketch = Array.isArray(obj.sketch) && obj.sketch.length === 64 ? obj.sketch : basis.sketch;
  return {
    schemaVersion: SCHEMA_VERSION,
    seed: basis.seed,
    revision: int(obj.revision, 0, 1e8, 0),
    signal: {
      steps: sourceSteps.map(v => int(v, 0, 7, 0)),
      tempo: int(signal.tempo, 50, 190, 96),
      palette: PALETTES.includes(signal.palette) ? signal.palette : basis.signal.palette,
      charge: int(signal.charge, 0, 10, 3)
    },
    weather: {
      rain: int(weather.rain, 0, 100, basis.weather.rain),
      sun: int(weather.sun, 0, 100, basis.weather.sun),
      wind: int(weather.wind, 0, 100, basis.weather.wind)
    },
    creature: {
      name: typeof creature.name === 'string' ? creature.name.slice(0, 25) : 'Pip',
      mood: int(creature.mood, 0, 100, 55),
      energy: int(creature.energy, 0, 100, 74)
    },
    sketch: sourceSketch.map(v => int(v, 0, 3, 0)),
    visited: unique(obj.visited).filter(v => TYPES.has(v)),
    discoveries: unique(obj.discoveries),
    journal: (Array.isArray(obj.journal) ? obj.journal : []).slice(-MAX_EVENTS).map(event => {
      const item = asObject(event);
      return {
        revision: int(item.revision, 0, 1e8, 0),
        world: TYPES.has(item.world) ? item.world : 'between',
        label: String(item.label || '').slice(0, 100)
      };
    }),
    lastAction: typeof obj.lastAction === 'string' ? obj.lastAction.slice(0, 120) : basis.lastAction,
    entropy: int(obj.entropy, 1, 4294967295, basis.entropy)
  };
}

function log(state, world, label, discovered) {
  const revision = state.revision + 1;
  return {
    ...state,
    revision,
    lastAction: label,
    discoveries: discovered && !state.discoveries.includes(discovered)
      ? [...state.discoveries, discovered].slice(-40) : state.discoveries,
    journal: [...state.journal, { revision, world, label }].slice(-MAX_EVENTS)
  };
}
const origin = a => TYPES.has(a.world) ? a.world : 'between';

export function transition(source, action) {
  const state = normalizeState(source);
  const a = asObject(action);
  const world = origin(a);
  switch (a.type) {
    case 'VISIT': {
      if (!TYPES.has(a.world) || state.visited.includes(a.world)) return state;
      return { ...state, visited: [...state.visited, a.world] };
    }
    case 'STEP': {
      const index = int(a.index, 0, 7, 0), value = int(a.value, 0, 7, 0);
      if (state.signal.steps[index] === value) return state;
      const steps = [...state.signal.steps]; steps[index] = value;
      return log({ ...state, signal: { ...state.signal, steps } }, world,
        'Signal note ' + (index + 1) + ' tuned to ' + value, 'signal.composed');
    }
    case 'REVERSE': {
      return log({ ...state, signal: { ...state.signal, steps: [...state.signal.steps].reverse() } },
        world, 'The eight-note signal was reversed.', 'signal.transformed');
    }
    case 'ROTATE': {
      const steps = [...state.signal.steps];
      steps.unshift(steps.pop());
      return log({ ...state, signal: { ...state.signal, steps } }, world,
        'The signal shifted one beat forward.', 'signal.transformed');
    }
    case 'TEMPO': {
      const tempo = int(a.value, 50, 190, 96);
      if (tempo === state.signal.tempo) return state;
      return log({ ...state, signal: { ...state.signal, tempo } }, world,
        'The signal now moves at ' + tempo + ' BPM.');
    }
    case 'PALETTE': {
      if (!PALETTES.includes(a.value) || a.value === state.signal.palette) return state;
      return log({ ...state, signal: { ...state.signal, palette: a.value } }, world,
        'Every world adopted the ' + a.value + ' signal.', 'signal.transformed');
    }
    case 'WEATHER': {
      if (!['rain','wind','sun'].includes(a.key)) return state;
      const value = int(a.value, 0, 100, 0);
      if (value === state.weather[a.key]) return state;
      return log({ ...state, weather: { ...state.weather, [a.key]: value } }, world,
        'Pocket weather: ' + a.key + ' adjusted to ' + value + '%.', 'weather.changed');
    }
    case 'GARDEN': {
      const rain = int(state.weather.rain + 18, 0, 100, 0);
      const sun = int(state.weather.sun - 8, 0, 100, 0);
      return log({ ...state, weather: { ...state.weather, rain, sun } },
        world, 'A little garden started growing in the rain.', 'garden.grown');
    }
    case 'PET': {
      return log({ ...state, creature: {
        ...state.creature, mood: Math.min(100,state.creature.mood + 13),
        energy: Math.max(0,state.creature.energy - 4)
      } }, world, 'Pip received a little attention.', 'creature.met');
    }
    case 'SKETCH': {
      const index = int(a.index,0,63,0), value = int(a.value,0,3,0);
      if (state.sketch[index] === value) return state;
      const sketch = [...state.sketch]; sketch[index] = value;
      return log({ ...state, sketch }, world,
        'Pixel ' + (index + 1) + ' changed in the shared sketch.', 'sketch.started');
    }
    case 'SKETCH_TO_SIGNAL': {
      // Each of the eight drawing columns becomes one of eight notes.
      if (state.sketch.every(value => value === 0)) return state;
      const steps = Array.from({ length: 8 }, (_, x) => {
        let ink = 0;
        for (let y = 0; y < 8; y++) ink += state.sketch[y * 8 + x];
        return Math.min(7, Math.round(ink / 3));
      });
      return log({ ...state, signal: { ...state.signal, steps } }, world,
        'The eight sketch columns were translated into eight notes.', 'sketch.sonified');
    }
    case 'SIGNAL_TO_SKETCH': {
      // A note draws a dot at its height; the lower pixel is its shadow.
      const sketch = Array(64).fill(0);
      state.signal.steps.forEach((note, x) => {
        const y = 7 - note;
        sketch[y * 8 + x] = 3;
        if (y < 7) sketch[(y + 1) * 8 + x] = 1;
      });
      return log({ ...state, sketch }, world,
        'The eight notes were translated into a tiny constellation.', 'signal.visualized');
    }
    case 'SKETCH_CLEAR':
      return log({ ...state, sketch: Array(64).fill(0) }, world,
        'The shared canvas was cleared.');
    case 'REMIX': {
      const entropy = nextRandom(state.entropy) || 1;
      const steps = [...state.signal.steps].map((v,i) => (v + ((entropy >>> (i*3)) & 3)) % 8);
      return log({
        ...state, entropy,
        signal: { ...state.signal, steps, charge: (state.signal.charge + 1) % 11 }
      }, world, 'The machine invented a fresh variation.', 'signal.transformed');
    }
    case 'DISCOVER': {
      if (typeof a.id !== 'string' || !/^[a-z0-9.-]{1,60}$/i.test(a.id) || state.discoveries.includes(a.id)) return state;
      return log(state, world, typeof a.label === 'string' ? a.label.slice(0,100) : 'Something new was discovered.', a.id);
    }
    default: return state;
  }
}

export function signature(state) {
  const s = normalizeState(state);
  return s.signal.steps.map(n => 'ABCDEFGH'[n]).join('') + '-' + hashSeed(s.seed + s.signal.palette).toString(36).slice(0,4).toUpperCase();
}
export const asciiSignal = state => normalizeState(state).signal.steps
  .map((v,i) => String(i + 1).padStart(2,'0') + ' ' + '▁▂▃▄▅▆▇█'[v] + ' '.repeat(v) + '● (' + v + ')').join('\n');

export function createSignalStore(storage = (typeof window !== 'undefined' ? window.localStorage : null), key = STORAGE_KEY) {
  let state = createInitialState();
  let persistent = Boolean(storage);
  const listeners = new Set();
  try {
    const saved = storage?.getItem(key);
    if (saved && saved.length < 200000) state = normalizeState(JSON.parse(saved));
  } catch { persistent = false; }
  const emit = () => listeners.forEach(fn => fn(state));
  function persist() {
    try { storage?.setItem(key, JSON.stringify(state)); persistent = Boolean(storage); }
    catch { persistent = false; }
  }
  return {
    get: () => state,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    dispatch(action) {
      const next = transition(state, action);
      if (JSON.stringify(next) === JSON.stringify(state)) return state;
      state = next; persist(); emit(); return state;
    },
    replace(input) { state = normalizeState(input); persist(); emit(); return state; },
    reset() { state = createInitialState(); persist(); emit(); return state; },
    exportJSON() { return JSON.stringify(state, null, 2); },
    get persistent() { return persistent; }
  };
}
