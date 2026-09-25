import {
  parseWeightedList, createSeededRandom, secureRandom, weightedPick,
  shuffleItems, sampleItems, makeTeams, randomIntegers, rollDice, runChanceTrials,
} from './random-core.js';

const $ = selector => document.querySelector(selector);
const modes = [...document.querySelectorAll('[data-random-mode]')];
const panels = [...document.querySelectorAll('[data-random-panel]')];
const STORAGE_KEY = 'rip-toolbox-random-v1';

function rng() {
  const seed = $('#randomSeed').value.trim();
  return seed ? createSeededRandom(seed) : secureRandom;
}

function listLabels() {
  return parseWeightedList($('#randomInput').value).map(entry => entry.label);
}

function showResult(title, value) {
  $('#randomResultTitle').textContent = title;
  $('#randomResult').textContent = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    input: $('#randomInput').value,
    seed: $('#randomSeed').value,
    count: $('#randomCount').value,
    unique: $('#randomUnique').value,
  }));
}

function loadState() {
  try {
    const state = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!state) return;
    if (typeof state.input === 'string') $('#randomInput').value = state.input;
    if (typeof state.seed === 'string') $('#randomSeed').value = state.seed;
    if (state.count != null) $('#randomCount').value = state.count;
    if (state.unique != null) $('#randomUnique').value = state.unique;
  } catch {}
}

function setMode(mode, { updateUrl = true } = {}) {
  if (!panels.some(panel => panel.dataset.randomPanel === mode)) mode = 'pick';
  modes.forEach(button => button.classList.toggle('active', button.dataset.randomMode === mode));
  panels.forEach(panel => panel.hidden = panel.dataset.randomPanel !== mode);
  if (updateUrl) history.replaceState(null, '', `?action=${encodeURIComponent(mode)}`);
}

modes.forEach(button => button.addEventListener('click', () => setMode(button.dataset.randomMode)));
['randomInput','randomSeed','randomCount','randomUnique'].forEach(id => $(`#${id}`).addEventListener('input', saveState));

$('#runPick').addEventListener('click', () => {
  try {
    const choice = weightedPick(parseWeightedList($('#randomInput').value), rng());
    showResult('Picked', `${choice.label}\nweight: ${choice.weight}`);
  } catch (error) { showResult('Error', error.message); }
});

$('#runShuffle').addEventListener('click', () => {
  try { showResult('Shuffled', shuffleItems(listLabels(), rng()).join('\n')); }
  catch (error) { showResult('Error', error.message); }
});

$('#runSample').addEventListener('click', () => {
  try {
    const count = Number($('#randomCount').value);
    const unique = $('#randomUnique').value === 'true';
    showResult('Sample', sampleItems(listLabels(), count, { unique, rng: rng() }).join('\n'));
  } catch (error) { showResult('Error', error.message); }
});

$('#runTeams').addEventListener('click', () => {
  try {
    const teams = makeTeams(listLabels(), Number($('#randomCount').value), rng());
    showResult('Teams', teams.map((team, index) => `Team ${index + 1}\n${team.map(item => `• ${item}`).join('\n')}`).join('\n\n'));
  } catch (error) { showResult('Error', error.message); }
});

$('#runNumbers').addEventListener('click', () => {
  try {
    const values = randomIntegers({
      min: Number($('#numberMin').value), max: Number($('#numberMax').value),
      count: Number($('#numberCount').value), unique: $('#numberUnique').value === 'true',
    }, rng());
    showResult('Random integers', values.join(', '));
  } catch (error) { showResult('Error', error.message); }
});

$('#runDice').addEventListener('click', () => {
  try {
    const result = rollDice(Number($('#diceCount').value), Number($('#diceSides').value), rng());
    showResult('Dice', `${result.rolls.join(' + ')} = ${result.total}`);
  } catch (error) { showResult('Error', error.message); }
});

$('#runChance').addEventListener('click', () => {
  try {
    const result = runChanceTrials(Number($('#chancePercent').value) / 100, Number($('#chanceTrials').value), rng());
    showResult('Chance experiment', `Successes: ${result.successes}/${result.trials}\nObserved rate: ${(result.rate * 100).toFixed(3)}%`);
  } catch (error) { showResult('Error', error.message); }
});

$('#runSeed').addEventListener('click', () => {
  try {
    const seed = $('#randomSeed').value || 'toolbox';
    const seeded = createSeededRandom(seed);
    showResult(`Seed: ${seed}`, Array.from({ length: 12 }, () => seeded().toFixed(10)).join('\n'));
  } catch (error) { showResult('Error', error.message); }
});

$('#copyRandomResult').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText($('#randomResult').textContent); }
  catch { showResult('Copy unavailable', $('#randomResult').textContent); }
});
$('#clearRandomResult').addEventListener('click', () => showResult('Ready', 'Choose a mode and run it.'));

loadState();
const requested = new URLSearchParams(location.search).get('action');
setMode(requested || 'pick', { updateUrl: false });
