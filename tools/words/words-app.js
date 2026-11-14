import { normalizeRack, parseDictionary, solveRack } from './words-core.js';
import { loadLocalDictionary } from './dictionary-loader.js';

const el = id => document.getElementById(id);
const input = el('rackInput');
const storageKey = 'rip.words.v1';
const sourceCache = new Map();
const optionIds = ['minLength','wordLength','startsWith','contains','maxLength','exactOnly','allowRepeats','keepOrder'];
const defaultFilters = Object.freeze({
  minLength:'2', wordLength:'', startsWith:'', contains:'', maxLength:'20',
  exactOnly:false, allowRepeats:false, keepOrder:false
});
const sample = 'X O Y E N T N U I D T E';
const PAGE_SIZE = 120;
const columns = {
  pal: { scroller:el('palScroller'), list:el('palWords'), count:el('palCount'), best:el('bestPal'), empty:el('palEmpty'), end:el('palEnd'), items:[], cursor:0, lastLength:null },
  all: { scroller:el('allScroller'), list:el('allWords'), count:el('allCount'), best:el('bestAll'), empty:el('allEmpty'), end:el('allEnd'), items:[], cursor:0, lastLength:null }
};
let dictionary = [];
let dictionaryLabel = '';
let loading = true;
let loadVersion = 0;
let solveTimer = null;

function savedSettings() {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch { return {}; }
}
function resetFilters() {
  for (const id of optionIds) {
    const control = el(id);
    if (control.type === 'checkbox') control.checked = defaultFilters[id];
    else control.value = defaultFilters[id];
  }
  el('maxLength').disabled = true;
}
function filtersActive() {
  return optionIds.some(id => {
    const control = el(id);
    return control.type === 'checkbox'
      ? control.checked !== defaultFilters[id]
      : String(control.value).trim() !== defaultFilters[id];
  });
}
function restoreState() {
  const saved = savedSettings();
  if (typeof saved.rack === 'string') input.value = saved.rack;
  // Advanced filters deliberately reset on each visit. Old persisted filters,
  // especially "Use every tile", caused apparently broken searches.
  resetFilters();
}
function persist() {
  try {
    localStorage.setItem(storageKey, JSON.stringify({ rack:input.value, uiVersion:5 }));
  } catch { /* Private browsing / storage restrictions must not block searching. */ }
}
function setStatus(text, error = false) {
  const node = el('dictionaryStatus');
  node.textContent = text;
  node.classList.toggle('error', error);
}
function searchOptions() {
  return {
    mode:'length', bonus:1, palindromeOnly:false,
    exact:el('exactOnly').checked,
    allowRepeats:el('allowRepeats').checked,
    keepOrder:el('keepOrder').checked,
    minLength:el('minLength').value,
    wordLength:el('wordLength').value,
    startsWith:el('startsWith').value,
    contains:el('contains').value,
    maxLength:el('maxLength').value
  };
}
function updateColumn(column, items, emptyMessage) {
  column.items = items;
  column.cursor = 0;
  column.lastLength = null;
  column.scroller.scrollTop = 0;
  column.list.replaceChildren();
  column.count.textContent = items.length.toLocaleString();
  column.best.replaceChildren();
  if (items.length) {
    const strong = document.createElement('strong');
    strong.textContent = items[0].word;
    column.best.append('Longest: ', strong, ' · ', items[0].length, ' letters');
  } else {
    column.best.textContent = 'No matching words';
  }
  column.empty.hidden = items.length > 0;
  column.empty.textContent = emptyMessage;
  column.end.hidden = !items.length;
  if (items.length) appendNext(column);
}
function appendNext(column) {
  if (column.cursor >= column.items.length) return;
  const fragment = document.createDocumentFragment();
  const end = Math.min(column.items.length, column.cursor + PAGE_SIZE);
  for (let i = column.cursor; i < end; i++) {
    const item = column.items[i];
    if (item.length !== column.lastLength) {
      const separator = document.createElement('li');
      separator.className = 'ws-length-header';
      separator.textContent = item.length + (item.length === 1 ? ' LETTER' : ' LETTERS');
      fragment.append(separator);
      column.lastLength = item.length;
    }
    const row = document.createElement('li');
    row.className = 'ws-word-row';
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = item.word;
    button.dataset.word = item.word;
    button.title = 'Copy ' + item.word;
    button.setAttribute('aria-label', 'Copy ' + item.word);
    const length = document.createElement('span');
    length.textContent = String(item.length);
    row.append(button, length);
    fragment.append(row);
  }
  column.list.append(fragment);
  column.cursor = end;
  column.end.hidden = column.cursor < column.items.length;
}
function renderEmpty(message) {
  updateColumn(columns.pal, [], message);
  updateColumn(columns.all, [], message);
}
function solve() {
  clearTimeout(solveTimer);
  persist();
  const activeFilters = filtersActive();
  el('resetFilters').hidden = !activeFilters;
  const rack = normalizeRack(input.value);
  if (!rack.length || (rack.length < 2 && !el('allowRepeats').checked)) {
    renderEmpty('Enter at least two letters to see answers.');
    setStatus(loading ? 'Loading word lists…' : (dictionaryLabel ? dictionaryLabel + ' · Ready for letters' : 'Enter letters to search.'));
    return;
  }
  if (!dictionary.length) {
    renderEmpty('Loading the word list…');
    if (!loading) setStatus('No dictionary is loaded. Choose a dictionary in Options.', true);
    return;
  }
  // The visible UI always sorts by length. Palindromes are separately highlighted.
  const all = solveRack(dictionary, rack, searchOptions());
  const palindrome = all.filter(item => item.palindrome);
  updateColumn(columns.pal, palindrome, activeFilters ? 'No palindromes match these filters.' : 'No palindromes match those letters.');
  updateColumn(columns.all, all, activeFilters ? 'No words match these filters. Use Reset filters to show all matches.' : 'No words match those letters.');
  setStatus((!all.length && activeFilters ? 'No matches with current filters · ' : 'Found ' + all.length.toLocaleString() + ' words, including ' + palindrome.length.toLocaleString() + ' palindromes · ') + dictionaryLabel);
}
function queueSolve() {
  clearTimeout(solveTimer);
  solveTimer = setTimeout(solve, 140);
}
async function getDictionary(kind) {
  if (sourceCache.has(kind)) return sourceCache.get(kind);
  // The dictionary is a versioned static asset served from this site.
  const result = await loadLocalDictionary();
  sourceCache.set(kind, result);
  return result;
}
async function loadDefault() {
  const token = ++loadVersion;
  loading = true;
  dictionary = [];
  dictionaryLabel = '';
  setStatus('Loading the included ENABLE dictionary…');
  if (normalizeRack(input.value)) renderEmpty('Loading the dictionary…');
  try {
    const result = await getDictionary('enable');
    if (token !== loadVersion) return;
    dictionary = result.words;
    dictionaryLabel = 'ENABLE · ' + dictionary.length.toLocaleString() + ' words · stored on this site';
    loading = false;
    solve();
  } catch (error) {
    if (token !== loadVersion) return;
    loading = false;
    setStatus('Dictionary load failed: ' + error.message + '. Open Options to retry or upload a word list.', true);
    renderEmpty('Dictionary unavailable.');
  }
}
async function loadUpload(file) {
  if (!file) return;
  const token = ++loadVersion;
  loading = true;
  setStatus('Reading ' + file.name + '…');
  try {
    if (file.size > 15 * 1024 * 1024) throw new Error('Maximum file size is 15 MB');
    const words = parseDictionary(await file.text());
    if (token !== loadVersion) return;
    if (!words.length) throw new Error('No valid words found. Use one word per line.');
    dictionary = words;
    dictionaryLabel = file.name + ' · ' + words.length.toLocaleString() + ' entries';
    loading = false;
    solve();
  } catch (error) {
    if (token !== loadVersion) return;
    loading = false;
    setStatus('Could not read custom dictionary: ' + error.message, true);
    if (!dictionary.length) renderEmpty('Dictionary unavailable.');
  }
}
async function copyWord(word) {
  try {
    await navigator.clipboard.writeText(word);
    setStatus('Copied “' + word.toLowerCase() + '” to your clipboard.');
  } catch {
    setStatus('Could not copy automatically. Select the word to copy it.', true);
  }
}

restoreState();
if (el('exactOnly').checked && el('allowRepeats').checked) el('allowRepeats').checked = false;
el('maxLength').disabled = !el('allowRepeats').checked;
input.addEventListener('input', queueSolve);
input.addEventListener('keydown', event => {
  if (event.key === 'Enter') { event.preventDefault(); solve(); }
});
el('sampleButton').addEventListener('click', () => { input.value = sample; solve(); input.focus(); });
el('resetFilters').addEventListener('click', () => { resetFilters(); solve(); input.focus(); });
el('clearButton').addEventListener('click', () => { input.value = ''; solve(); input.focus(); });
for (const id of optionIds) {
  const control = el(id);
  control.addEventListener('change', () => {
    if (id === 'exactOnly' && control.checked) el('allowRepeats').checked = false;
    if (id === 'allowRepeats' && control.checked) el('exactOnly').checked = false;
    el('maxLength').disabled = !el('allowRepeats').checked;
    queueSolve();
  });
  if (['minLength','wordLength','startsWith','contains','maxLength'].includes(id)) control.addEventListener('input', queueSolve);
}
el('dictionaryUpload').addEventListener('change', event => loadUpload(event.target.files?.[0]));
el('reloadDictionary').addEventListener('click', () => { el('dictionaryUpload').value = ''; loadDefault(); });
for (const column of Object.values(columns)) {
  column.scroller.addEventListener('scroll', () => {
    if (column.scroller.scrollHeight - column.scroller.scrollTop - column.scroller.clientHeight < 450) appendNext(column);
  }, { passive:true });
  column.list.addEventListener('click', event => {
    const button = event.target.closest('button[data-word]');
    if (button) copyWord(button.dataset.word);
  });
}
renderEmpty('Enter letters above to see answers.');
loadDefault();

// Once the page is loaded online, precache the entire tool for offline use.
// file:// standalone downloads don't require or register a service worker.
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator &&
    typeof location !== 'undefined' && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
