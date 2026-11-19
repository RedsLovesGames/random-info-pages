import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { solveRack, classifySpecialWord, isQuadrupleLetter } from './words-core.js';

const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('./words-app.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('./words.css', import.meta.url), 'utf8');
const loader = readFileSync(new URL('./dictionary-loader.js', import.meta.url), 'utf8');
const sw = readFileSync(new URL('./sw.js', import.meta.url), 'utf8');

const columns = [
  ['all','Normal'],['pal','Palindrome'],['rich','Vowel rich'],
  ['heavy','Vowel heavy'],['quad','Quadruple letter'],['cursed','Cursed Words']
];

test('six equal-status scrollable columns appear in the requested left-to-right order', () => {
  assert.match(html, /id="rackInput"/);
  assert.match(html, /Towers of Babble · 195,415 words/);
  const offsets = [];
  for (const [key, title] of columns) {
    const marker = '<article class="ws-column ws-column--' + key + '"';
    const index = html.indexOf(marker);
    assert.ok(index >= 0, 'Missing column ' + key);
    offsets.push(index);
    assert.match(html, new RegExp('id="' + key + 'Heading">' + title + '<'));
    for (const suffix of ['Scroller','Words','Count','Best','Empty','End']) {
      assert.ok(html.includes('id="' + key + suffix + '"'), 'Missing ' + key + suffix);
    }
  }
  assert.deepEqual(offsets, [...offsets].sort((a,b) => a - b));
  assert.equal((html.match(/<article class="ws-column/g) || []).length, columns.length);
  assert.doesNotMatch(html, /ws-special-card|specialHeading|showAllSpecial|fewConsonantsFilter|vowelHeavyFilter/);
  assert.match(html, /6\+ letters · ≤2 consonants/);
  assert.match(html, /4\+ vowels · 60%\+ vowel share/);
  assert.match(html, /Any letter appears 4\+ times/);
  assert.match(html, /href="\.\/quests\.html"/);
  assert.match(html, /<details class="ws-advanced"/);
});

test('search once and display independent sorted categories with lazy scroll and word copy', () => {
  assert.match(app, /input\.addEventListener\('input', queueSolve\)/);
  assert.match(app, /const groups = \{ all, pal:\[\], rich:\[\], heavy:\[\], quad:\[\], cursed:\[\] \}/);
  assert.match(app, /if \(item\.palindrome\) groups\.pal\.push\(item\)/);
  assert.match(app, /if \(vowelCount >= 4 && vowelCount \/ item\.length >= 0\.6\) groups\.rich\.push\(item\)/);
  assert.match(app, /if \(kinds\.fewConsonants\) groups\.heavy\.push\(item\)/);
  assert.match(app, /isQuadrupleLetter\(item\.word\)/);
  assert.match(app, /CURSED_WORDS\.has\(item\.word\)/);
  assert.match(app, /Object\.entries\(columns\)/);
  assert.match(app, /column\.scroller\.addEventListener\('scroll'/);
  assert.match(app, /appendNext\(column\)/);
  assert.match(app, /copyWord\(button\.dataset\.word\)/);
  assert.match(app, /function resetFilters\(\)/);
  assert.match(app, /uiVersion:5/);
  assert.doesNotMatch(app, /specialMode|updateSpecialFinds|showAllSpecial/);
});

test('dark responsive CSS preserves left-to-right category order with horizontal scrolling', () => {
  assert.match(css, /background:#171d23/);
  assert.match(css, /color-scheme:dark/);
  assert.match(css, /background:linear-gradient\(116deg,#263d3d/);
  assert.match(css, /\.ws-columns\{display:grid;grid-template-columns:repeat\(6,minmax\(218px,1fr\)\)/);
  assert.match(css, /overflow-x:auto;scroll-snap-type:x proximity/);
  assert.match(css, /@media\(max-width:650px\)/);
  assert.match(css, /\.ws-columns\{grid-template-columns:repeat\(6,minmax\(225px,72vw\)\)/);
  assert.match(html, /Swipe sideways to see all six categories/);
  assert.match(html, /name="theme-color" content="#171d23"/);
});

test('still uses local game dictionary and rebuildable offline mode', () => {
  assert.match(app, /loadLocalDictionary/);
  assert.match(loader, /\.\/dictionaries\/towers-of-babble\.txt/);
  assert.match(sw, /cache\.addAll\(ASSETS\)/);
  assert.match(sw, /\.\/quests\.html/);
  assert.match(sw, /\.\/dictionaries\/towers-of-babble\.txt/);
  assert.match(sw, /const VERSION = 'rip-word-finder-offline-v\d+'/);
  assert.doesNotMatch(app, /raw\.githubusercontent\.com|cdn\.jsdelivr\.net/);
});

test('categories overlap where applicable and only matching dictionary words are displayed', () => {
  const words = [
    'ABRACADABRA','BEEYYA','AEIOUY','TENET','AAAAB','ABBA',
    'EUGENIA','ADIEU','DETENTION','TOY','ABC'
  ];
  const rack = 'AAAAABBBBCCDDDEEEEEGIIINNOORRSTTTUUYYYY';
  const all = solveRack(words,rack,{mode:'length',bonus:1,minLength:3});
  const pal = all.filter(item => item.palindrome);
  const rich = all.filter(({ word }) => {
    const vowels = word.match(/[AEIOUY]/g)?.length ?? 0;
    return vowels >= 4 && vowels / word.length >= 0.6;
  });
  const heavy = all.filter(item => classifySpecialWord(item.word).fewConsonants);
  const quad = all.filter(item => isQuadrupleLetter(item.word));
  assert.ok(all.length >= 8);
  assert.ok(pal.find(item => item.word === 'TENET'));
  assert.ok(rich.find(item => item.word === 'AEIOUY'));
  assert.ok(heavy.find(item => item.word === 'AEIOUY'));
  assert.ok(quad.find(item => item.word === 'ABRACADABRA'));
  assert.ok(quad.find(item => item.word === 'AAAAB'));
  for (const subset of [all,pal,rich,heavy,quad]) {
    assert.ok(subset.every((item,i) => i === 0 || subset[i-1].length >= item.length));
    assert.ok(subset.every(item => all.includes(item)));
  }
});

test('original sample still displays longest normal and palindrome matches', () => {
  const all = solveRack(['DETENTION','TENET','NEOTENY','TOY','NON','NUN','DEED'],
    'XOYENTNUIDTE',{mode:'length',bonus:1,minLength:3});
  assert.equal(all[0].word,'DETENTION');
  assert.equal(all.filter(item => item.palindrome)[0].word,'TENET');
});
