import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { solveRack } from './words-core.js';

const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('./words-app.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('./words.css', import.meta.url), 'utf8');
const loader = readFileSync(new URL('./dictionary-loader.js', import.meta.url), 'utf8');

test('main screen has a single input and two labeled columns', () => {
  assert.match(html, /id="rackInput"/);
  assert.match(html, /Find your <em>best word/);
  assert.match(html, /value="enable">ENABLE/);
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
  assert.match(app, /loadDictionaryWithFallback/);
  assert.match(loader, /enable1\.txt/);
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
