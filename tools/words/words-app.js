import { normalizeRack, parseDictionary, solveRack, TILE_VALUES } from './words-core.js';

const DICTIONARY_URL = 'https://raw.githubusercontent.com/redbo/scrabble/45d4022a1a19130e3b848b868c408771b7f342ff/dictionary.txt';
const el = id => document.getElementById(id);
const rackInput = el('rackInput');
const settings = ['scoreMode','palBonus','minLength','exactOnly','palOnly'];
const sampleRack = 'X O Y E N T N U I D T E';
let dictionary = [];
let dictionaryName = '';
let matches = [];
let shown = 0;
let schedule;
let loadVersion = 0;
const PAGE = 80;

function safeStorageRead() {
  try { return JSON.parse(localStorage.getItem('rip.words.v1') || '{}'); }
  catch { return {}; }
}
function saveSettings() {
  try {
    const values = { rack: rackInput.value };
    for (const id of settings) values[id] = el(id).type === 'checkbox' ? el(id).checked : el(id).value;
    localStorage.setItem('rip.words.v1', JSON.stringify(values));
  } catch {}
}
function restoreSettings() {
  const saved = safeStorageRead();
  if (typeof saved.rack === 'string') rackInput.value = saved.rack;
  for (const id of settings) if (saved[id] !== undefined) {
    if (el(id).type === 'checkbox') el(id).checked = saved[id] === true;
    else el(id).value = saved[id];
  }
}
function options() {
  return {
    mode: el('scoreMode').value,
    bonus: el('palBonus').value,
    minLength: el('minLength').value,
    exact: el('exactOnly').checked,
    palindromeOnly: el('palOnly').checked
  };
}
function renderTiles() {
  const letters = normalizeRack(rackInput.value);
  const target = el('tileRack');
  target.replaceChildren();
  for (const char of letters.slice(0, 36)) {
    const tile = document.createElement('span');
    tile.className = 'ws-tile' + (char === '?' ? ' wild' : (TILE_VALUES[char] >= 4 ? ' high' : ''));
    tile.textContent = char;
    const point = document.createElement('small');
    point.textContent = char === '?' ? '0' : String(TILE_VALUES[char]);
    tile.append(point);
    target.append(tile);
  }
  if (letters.length > 36) {
    const note = document.createElement('span');
    note.textContent = '+' + (letters.length - 36) + ' more';
    target.append(note);
  }
}
function status(message, error = false) {
  const node = el('dictionaryStatus');
  node.textContent = message;
  node.classList.toggle('error', error);
}
function detail(word, other = '') {
  return word ? word.length + ' letters · ' + word.score.toLocaleString() + ' pts' + other : 'No match';
}
function updateHighlights() {
  const all = matches;
  const longest = [...all].sort((a, b) => b.length - a.length || b.score - a.score || a.word.localeCompare(b.word))[0];
  const palindrome = all.find(w => w.palindrome);
  const best = all[0];
  const fill = (id, textId, item, suffix = '') => {
    el(id).textContent = item ? item.word : '—';
    el(textId).textContent = detail(item, suffix);
  };
  fill('bestScore','bestScoreDetail',best);
  fill('bestLong','bestLongDetail',longest);
  fill('bestPal','bestPalDetail',palindrome);
  el('matchCount').textContent = all.length.toLocaleString();
  el('matchDetail').textContent = dictionaryName;
  el('highlights').hidden = false;
}
function renderRows(reset = false) {
  const target = el('wordResults');
  if (reset) { target.replaceChildren(); shown = 0; }
  const fragment = document.createDocumentFragment();
  for (const item of matches.slice(shown, shown + PAGE)) {
    const li = document.createElement('li'); li.className = 'ws-result-row';
    const main = document.createElement('div'); main.className = 'ws-word';
    const copy = document.createElement('button'); copy.type = 'button'; copy.textContent = item.word;
    copy.title = 'Copy ' + item.word;
    copy.setAttribute('aria-label', 'Copy ' + item.word);
    copy.addEventListener('click', () => copyText(item.word));
    main.append(copy);
    if (item.palindrome) {
      const tag = document.createElement('span'); tag.className = 'ws-pal-tag';
      tag.textContent = 'PALINDROME'; main.append(tag);
    }
    const left = document.createElement('span'); left.className = 'ws-left';
    left.textContent = item.leftovers || '—';
    const length = document.createElement('span'); length.className = 'ws-length'; length.textContent = item.length;
    const score = document.createElement('strong'); score.className = 'ws-score'; score.textContent = String(item.score);
    li.append(main,left,length,score); fragment.append(li);
  }
  target.append(fragment);
  shown = Math.min(matches.length, shown + PAGE);
  el('moreButton').hidden = shown >= matches.length;
  el('moreButton').textContent = 'Show more (' + (matches.length - shown).toLocaleString() + ' remaining)';
  el('emptyResults').hidden = matches.length !== 0;
  el('copyButton').disabled = matches.length === 0;
}
function solve() {
  clearTimeout(schedule);
  renderTiles();
  saveSettings();
  if (!dictionary.length) {
    el('highlights').hidden = true;
    el('wordResults').replaceChildren();
    el('moreButton').hidden = true;
    el('copyButton').disabled = true;
    return;
  }
  const rack = normalizeRack(rackInput.value);
  if (rack.length < 2) {
    matches = []; renderRows(true); el('highlights').hidden = true;
    status('Enter at least two letters. Dictionary ready: ' + dictionaryName);
    return;
  }
  matches = solveRack(dictionary, rack, options());
  updateHighlights();
  renderRows(true);
  status(dictionaryName + ' · ' + matches.length.toLocaleString() + ' valid words found. Results are sorted by score, then length.');
}
function queueSolve() {
  clearTimeout(schedule);
  renderTiles();
  schedule = setTimeout(solve, 130);
}
async function loadDefault() {
  const token = ++loadVersion;
  dictionary = [];
  el('solveButton').disabled = true;
  status('Loading community dictionary… The first download may take a moment.');
  el('highlights').hidden = true;
  el('wordResults').replaceChildren();
  el('moreButton').hidden = true;
  try {
    const response = await fetch(DICTIONARY_URL, { cache: 'force-cache' });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const text = await response.text();
    const words = parseDictionary(text);
    if (words.length < 100000) throw new Error('Downloaded word list is incomplete.');
    if (token !== loadVersion) return;
    dictionary = words;
    dictionaryName = words.length.toLocaleString() + ' dictionary entries';
    el('solveButton').disabled = false;
    solve();
  } catch (error) {
    if (token !== loadVersion) return;
    status('Could not load the default dictionary (' + error.message + '). Click Reload or upload a .txt list below.', true);
    el('solveButton').disabled = true;
  }
}
async function loadUpload(file) {
  if (!file) return;
  const token = ++loadVersion;
  el('solveButton').disabled = true;
  status('Reading ' + file.name + '…');
  try {
    if (file.size > 15 * 1024 * 1024) throw new Error('Maximum dictionary size is 15 MB.');
    const words = parseDictionary(await file.text());
    if (!words.length) throw new Error('No words found. Use one plain-English word per line.');
    if (token !== loadVersion) return;
    dictionary = words;
    dictionaryName = file.name + ' (' + words.length.toLocaleString() + ' entries)';
    el('solveButton').disabled = false;
    solve();
  } catch (error) { status(error.message, true); el('solveButton').disabled = !dictionary.length; }
}
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    status('Copied to clipboard. ' + dictionaryName);
  } catch {
    status('Clipboard access was blocked by the browser.', true);
  }
}
restoreSettings();
renderTiles();
rackInput.addEventListener('input', queueSolve);
rackInput.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); solve(); } });
for (const id of settings) el(id).addEventListener('change', queueSolve);
el('solveButton').addEventListener('click', solve);
el('sampleButton').addEventListener('click', () => { rackInput.value = sampleRack; solve(); });
el('clearButton').addEventListener('click', () => { rackInput.value = ''; solve(); rackInput.focus(); });
el('moreButton').addEventListener('click', () => renderRows(false));
el('copyButton').addEventListener('click', () => copyText(matches.map(m => m.word + '\t' + m.score + '\t' + m.length + (m.palindrome ? '\tPALINDROME' : '')).join('\n')));
el('dictionaryUpload').addEventListener('change', event => loadUpload(event.target.files[0]));
el('reloadDictionary').addEventListener('click', () => { el('dictionaryUpload').value = ''; loadDefault(); });
loadDefault();
