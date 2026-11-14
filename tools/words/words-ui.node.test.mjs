import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { solveRack, classifySpecialWord } from './words-core.js';

const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('./words-app.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('./words.css', import.meta.url), 'utf8');
const loader = readFileSync(new URL('./dictionary-loader.js', import.meta.url), 'utf8');
const sw = readFileSync(new URL('./sw.js', import.meta.url), 'utf8');

test('main screen has a single input and two labeled columns', () => {
  assert.match(html, /id="rackInput"/);
  assert.match(html, /id="specialHeading"/);
  assert.match(html, /id="fewConsonantsFilter"/);
  assert.match(html, /id="vowelHeavyFilter"/);
  assert.match(html, /id="showAllSpecial"/);
  assert.match(html, /5\+ letters, at most 1 consonant/);
  assert.match(html, /id="resetFilters"/);
  assert.match(html, /Find your <em>best word/);
  assert.match(html, /Towers of Babble · 195,415 words/);
  assert.match(html, /download="word-finder-offline\.html"/);
  assert.match(html, /id="palHeading"[^>]*>Longest/);
  assert.match(html, /id="allHeading"[^>]*>Longest/);
  assert.match(html, /id="palScroller"/);
  assert.match(html, /id="allScroller"/);
  assert.match(html, /id="palWords"/);
  assert.match(html, /id="allWords"/);
  assert.match(html, /<details class="ws-advanced"/);
  assert.doesNotMatch(html, /id="solveButton"/);
});
test('results automatically update, are grouped by length and scroll to load everything', () => {
  assert.match(app, /input\.addEventListener\('input', queueSolve\)/);
  assert.match(app, /function resetFilters\(\)/);
  assert.match(app, /function filtersActive\(\)/);
  assert.match(app, /resetFilters\(\);/);
  assert.match(app, /uiVersion:5/);
  assert.doesNotMatch(app, /values\[id\] = el\(id\)/);
  assert.match(sw, /rip-word-finder-offline-v4/);
  assert.match(app, /classifySpecialWord\(item.word\)/);
  assert.match(app, /function updateSpecialFinds\(groups\)/);
  assert.match(css, /\.ws-special-grid\{display:grid;grid-template-columns:repeat\(2/);
  assert.match(app, /mode:'length', bonus:1/);
  assert.match(app, /all\.filter\(item => item\.palindrome\)/);
  assert.match(app, /column\.scroller\.addEventListener\('scroll'/);
  assert.match(app, /appendNext\(column\)/);
  assert.match(css, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /@media\(max-width:650px\)/);
  assert.match(css, /background:#171d23/);
  assert.match(css, /color-scheme:dark/);
  assert.match(css, /background:linear-gradient\(116deg,#263d3d/);
  assert.match(css, /\.ws-columns\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(html, /name="theme-color" content="#171d23"/);
  assert.match(app, /loadLocalDictionary/);
  assert.match(loader, /\.\/dictionaries\/towers-of-babble\.txt/);
  assert.match(sw, /cache\.addAll\(ASSETS\)/);
  assert.match(sw, /\.\/dictionaries\/towers-of-babble\.txt/);
  assert.doesNotMatch(app, /raw\.githubusercontent\.com|cdn\.jsdelivr\.net/);
});
test('every matching word is in all column and palindrome subset is sorted by descending length', () => {
  const dictionary = ['TENET','DETENTION','NEOTENY','TOY','NON','NUN','DEED','X'];
  const all = solveRack(dictionary, 'XOYENTNUIDTE', { mode:'length', bonus:1, minLength:2 });
  const palindrome = all.filter(word => word.palindrome);
  assert.equal(all[0].word,'DETENTION');
  assert.equal(palindrome[0].word,'TENET');
  assert.ok(all.find(word => word.word==='TENET'));
  assert.ok(!all.find(word => word.word==='DEED')); // only two Ds? rack has just one D.
  assert.ok(all.every((word,i) => i===0 || all[i-1].length >= word.length));
  assert.ok(palindrome.every(word => word.palindrome));
});

test('a large rack finds words unless an advanced filter restricts them', () => {
  const dictionary = ['UNDERESTIMATING','INTERMEDIATING','PREDESTINATING','TENET','TUT','TOY'];
  const rack = 'adeegiiijmnnprsttuyz';
  const all = solveRack(dictionary, rack, {mode:'length',bonus:1,minLength:2});
  const filtered = solveRack(dictionary, rack, {mode:'length',bonus:1,minLength:2,exact:true});
  assert.equal(all[0].word,'UNDERESTIMATING');
  assert.ok(all.find(w => w.word === 'TENET' && w.palindrome));
  assert.equal(filtered.length,0);
});

test('special categories classify 6+ letter words and keep longest-first sorting', () => {
  const words = [
    'REINITIATE', 'EUGENIA', 'ADIEUS', 'INERTIAE', 'TENET', 'AEIOUY', 'ABCDEF'
  ];
  const vowelHeavy = words.filter(word => classifySpecialWord(word).vowelHeavy);
  const fewConsonants = words.filter(word => classifySpecialWord(word).fewConsonants);
  assert.deepEqual(vowelHeavy, ['AEIOUY']);
  assert.deepEqual(fewConsonants, ['EUGENIA','ADIEUS','AEIOUY']);
});
