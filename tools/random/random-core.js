function assertRandom(rng) {
  const value = Number(rng());
  if (!Number.isFinite(value) || value < 0 || value >= 1) throw new Error('Random source must return a value from 0 (inclusive) to 1 (exclusive).');
  return value;
}

export function parseWeightedList(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const match = line.match(/^(.*?)(?:\s*\|\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+)))?$/);
      const label = (match?.[1] || '').trim();
      const weight = match?.[2] == null ? 1 : Number(match[2]);
      if (!label) throw new Error('Every entry needs a label.');
      if (!Number.isFinite(weight) || weight <= 0) throw new Error(`Weight for “${label}” must be greater than zero.`);
      return { label, weight };
    });
}

function xmur3(source) {
  let hash = 1779033703 ^ source.length;
  for (let i = 0; i < source.length; i += 1) {
    hash = Math.imul(hash ^ source.charCodeAt(i), 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }
  return () => {
    hash = Math.imul(hash ^ (hash >>> 16), 2246822507);
    hash = Math.imul(hash ^ (hash >>> 13), 3266489909);
    hash ^= hash >>> 16;
    return hash >>> 0;
  };
}

export function createSeededRandom(seed = '') {
  const seedFn = xmur3(String(seed));
  let state = seedFn();
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function secureRandom() {
  if (!globalThis.crypto?.getRandomValues) return Math.random();
  const words = new Uint32Array(1);
  globalThis.crypto.getRandomValues(words);
  return words[0] / 4294967296;
}

export function weightedPick(entries, rng = secureRandom) {
  if (!Array.isArray(entries) || entries.length === 0) throw new Error('Add at least one entry.');
  const normalized = entries.map(entry => ({ label: String(entry.label ?? '').trim(), weight: Number(entry.weight ?? 1) }));
  if (normalized.some(entry => !entry.label || !Number.isFinite(entry.weight) || entry.weight <= 0)) throw new Error('Entries require labels and positive weights.');
  const total = normalized.reduce((sum, entry) => sum + entry.weight, 0);
  let cursor = assertRandom(rng) * total;
  for (const entry of normalized) {
    cursor -= entry.weight;
    if (cursor < 0) return { ...entry };
  }
  return { ...normalized.at(-1) };
}

export function shuffleItems(items, rng = secureRandom) {
  if (!Array.isArray(items)) throw new Error('Items must be an array.');
  const output = [...items];
  for (let index = output.length - 1; index > 0; index -= 1) {
    const other = Math.floor(assertRandom(rng) * (index + 1));
    [output[index], output[other]] = [output[other], output[index]];
  }
  return output;
}

export function sampleItems(items, count, { unique = true, rng = secureRandom } = {}) {
  if (!Array.isArray(items) || items.length === 0) throw new Error('Add at least one item.');
  count = Math.trunc(Number(count));
  if (!Number.isInteger(count) || count < 1) throw new Error('Sample count must be a positive integer.');
  if (unique) {
    if (count > items.length) throw new Error('Unique sample count cannot exceed the item count.');
    return shuffleItems(items, rng).slice(0, count);
  }
  return Array.from({ length: count }, () => items[Math.floor(assertRandom(rng) * items.length)]);
}

export function makeTeams(items, teamCount, rng = secureRandom) {
  if (!Array.isArray(items) || items.length < 2) throw new Error('Add at least two people.');
  teamCount = Math.trunc(Number(teamCount));
  if (!Number.isInteger(teamCount) || teamCount < 2 || teamCount > items.length) throw new Error('Team count must be between 2 and the number of people.');
  const teams = Array.from({ length: teamCount }, () => []);
  shuffleItems(items, rng).forEach((item, index) => teams[index % teamCount].push(item));
  return teams;
}

export function randomIntegers({ min = 1, max = 100, count = 1, unique = false } = {}, rng = secureRandom) {
  min = Math.ceil(Number(min));
  max = Math.floor(Number(max));
  count = Math.trunc(Number(count));
  if (![min, max, count].every(Number.isFinite) || max < min || count < 1) throw new Error('Use a valid integer range and positive count.');
  const span = max - min + 1;
  if (unique && count > span) throw new Error('Unique count cannot exceed the size of the range.');
  if (unique) return shuffleItems(Array.from({ length: span }, (_, index) => min + index), rng).slice(0, count);
  return Array.from({ length: count }, () => min + Math.floor(assertRandom(rng) * span));
}

export function rollDice(count = 1, sides = 6, rng = secureRandom) {
  count = Math.trunc(Number(count));
  sides = Math.trunc(Number(sides));
  if (!Number.isInteger(count) || count < 1 || count > 100 || !Number.isInteger(sides) || sides < 2 || sides > 1000000) throw new Error('Use 1–100 dice with at least 2 sides.');
  const rolls = Array.from({ length: count }, () => 1 + Math.floor(assertRandom(rng) * sides));
  return { rolls, total: rolls.reduce((sum, roll) => sum + roll, 0) };
}

export function runChanceTrials(probability, trials = 1, rng = secureRandom) {
  probability = Number(probability);
  trials = Math.trunc(Number(trials));
  if (!Number.isFinite(probability) || probability < 0 || probability > 1) throw new Error('Probability must be between 0 and 1.');
  if (!Number.isInteger(trials) || trials < 1 || trials > 1000000) throw new Error('Trials must be between 1 and 1,000,000.');
  let successes = 0;
  for (let index = 0; index < trials; index += 1) if (assertRandom(rng) < probability) successes += 1;
  return { successes, trials, rate: successes / trials };
}
