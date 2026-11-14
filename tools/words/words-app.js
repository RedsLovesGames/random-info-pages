import { normalizeRack, parseDictionary, solveRack, classifySpecialWord, isQuadrupleLetter } from './words-core.js';
import { loadLocalDictionary } from './dictionary-loader.js';

const el = id => document.getElementById(id);
const input = el('rackInput');
const storageKey = 'rip.words.v1';
const sourceCache = new Map();
const optionIds = ['minLength','wordLength','startsWith','contains','maxLength','exactOnly','allowRepeats','keepOrder'];
const defaultFilters = Object.freeze({
  minLength:'3', wordLength:'', startsWith:'', contains:'', maxLength:'20',
  exactOnly:false, allowRepeats:false, keepOrder:false
});
const sample = 'X O Y E N T N U I D T E';
const PAGE_SIZE = 120;
const CURSED_WORDS = new Set(["ASSHAT","ASSHATS","ASSHOLE","ASSHOLES","ASSWIPE","ASSWIPES","BATSHIT","BITCH","BITCHES","BITCHY","BOFA","BRAINROT","BULLSHIT","BULLSHITTER","BUSSIN","BUSSY","CHUD","CHUNGUS","COOM","COOMER","COOMERS","COOMS","COPIUM","CUNT","CUNTS","CUNTY","DELULU","DOUCHEBAG","DOUCHEBAGS","DUMBASS","DUMBASSES","FUCK","FUCKED","FUCKER","FUCKFACE","FUCKING","FUCKWIT","GIGACHAD","GIGACHADS","GODDAMMIT","GODDAMN","GOON","GOONER","GOONERS","GOONING","GOONS","GYATT","HORSESHIT","JACKASS","JACKASSES","LIGMA","MALD","MALDING","MAXXING","MOTHERFUCKER","MOTHERFUCKERS","MOTHERFUCKING","POG","POGCHAMP","POGCHAMPS","POGGERS","POGGING","RIZZ","RIZZES","RIZZLER","RIZZLORD","SHIT","SHITBAG","SHITFACE","SHITHEAD","SHITSHOW","SHITTY","SOYJAK","SOYJAKS","SUGMA","SUS","SUSSY","UNC","UWU","WOJAK","WOJAKS","YEET","YEETS"]);
const columns = {
  all: { scroller:el('allScroller'), list:el('allWords'), count:el('allCount'), best:el('allBest'), empty:el('allEmpty'), end:el('allEnd'), items:[], cursor:0, lastLength:null },
  pal: { scroller:el('palScroller'), list:el('palWords'), count:el('palCount'), best:el('palBest'), empty:el('palEmpty'), end:el('palEnd'), items:[], cursor:0, lastLength:null },
  rich: { scroller:el('richScroller'), list:el('richWords'), count:el('richCount'), best:el('richBest'), empty:el('richEmpty'), end:el('richEnd'), items:[], cursor:0, lastLength:null },
  heavy: { scroller:el('heavyScroller'), list:el('heavyWords'), count:el('heavyCount'), best:el('heavyBest'), empty:el('heavyEmpty'), end:el('heavyEnd'), items:[], cursor:0, lastLength:null },
  quad: { scroller:el('quadScroller'), list:el('quadWords'), count:el('quadCount'), best:el('quadBest'), empty:el('quadEmpty'), end:el('quadEnd'), items:[], cursor:0, lastLength:null },
  cursed: { scroller:el('cursedScroller'), list:el('cursedWords'), count:el('cursedCount'), best:el('cursedBest'), empty:el('cursedEmpty'), end:el('cursedEnd'), items:[], cursor:0, lastLength:null }
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
  for (const column of Object.values(columns)) updateColumn(column, [], message);
}

function solve() {
  clearTimeout(solveTimer);
  persist();
  const activeFilters = filtersActive();
  el('resetFilters').hidden = !activeFilters;
  const rack = normalizeRack(input.value);
  if (!rack.length || (rack.length < 3 && !el('allowRepeats').checked)) {
    renderEmpty('Enter at least three letters to see answers.');
    setStatus(loading ? 'Loading the word list…' : (dictionaryLabel
      ? dictionaryLabel + ' · Ready for letters' : 'Enter letters to search.'));
    return;
  }
  if (!dictionary.length) {
    renderEmpty('Loading the word list…');
    if (!loading) setStatus('No dictionary loaded. Restore the included dictionary under More options.', true);
    return;
  }

  // Solve once, then classify the *same* valid matches into five length-sorted lists.
  // Categories can overlap, and none of the category rules changes the rack filter.
  const all = solveRack(dictionary, rack, searchOptions());
  const groups = { all, pal:[], rich:[], heavy:[], quad:[], cursed:[] };
  for (const item of all) {
    if (item.palindrome) groups.pal.push(item);
    const kinds = classifySpecialWord(item.word);
    const vowelCount = [...item.word].filter(letter => 'AEIOUY'.includes(letter)).length;
    if (vowelCount >= 4 && vowelCount / item.length >= 0.6) groups.rich.push(item);
    if (kinds.fewConsonants) groups.heavy.push(item);
    if (isQuadrupleLetter(item.word)) groups.quad.push(item);
    if (CURSED_WORDS.has(item.word)) groups.cursed.push(item);
  }

  for (const [key, column] of Object.entries(columns)) {
    updateColumn(column, groups[key], activeFilters
      ? 'No matching words with these filters. Use Reset filters to show all matches.'
      : 'No matching words in this category.');
  }
  setStatus((!all.length && activeFilters ? 'No matches with current filters · ' :
    'Found ' + all.length.toLocaleString() + ' words · ' +
    groups.pal.length.toLocaleString() + ' palindromes · ' +
    groups.rich.length.toLocaleString() + ' vowel rich · ' +
    groups.heavy.length.toLocaleString() + ' vowel heavy · ' +
    groups.quad.length.toLocaleString() + ' quadruple letter · ' +
    groups.cursed.length.toLocaleString() + ' cursed · ') + dictionaryLabel);
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
  setStatus('Loading the included Towers of Babble dictionary…');
  if (normalizeRack(input.value)) renderEmpty('Loading the dictionary…');
  try {
    const result = await getDictionary('towers-of-babble');
    if (token !== loadVersion) return;
    dictionary = result.words;
    dictionaryLabel = 'Towers of Babble · ' + dictionary.length.toLocaleString() + ' playable words · local';
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
