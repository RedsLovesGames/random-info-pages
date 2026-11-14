import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadLocalDictionary, validateLocalDictionary, LOCAL_DICTIONARY_URL, EXPECTED_WORD_COUNT } from './dictionary-loader.js';
import { solveRack, classifySpecialWord } from './words-core.js';

const dictionary = readFileSync(new URL('./dictionaries/towers-of-babble.txt', import.meta.url), 'utf8');
test('full Towers of Babble dictionary is stored locally in repository', () => {
  const words = validateLocalDictionary(dictionary);
  assert.equal(words.length, 195415);
  assert.equal(EXPECTED_WORD_COUNT, 195415);
  assert.equal(LOCAL_DICTIONARY_URL, './dictionaries/towers-of-babble.txt');
  assert.ok(words.includes('DETENTION'));
  assert.ok(words.includes('RIZZLER'));
  assert.ok(!words.includes('AA'));
  assert.equal(words.filter(word => classifySpecialWord(word).fewConsonants).length,551);
  assert.equal(words.filter(word => classifySpecialWord(word).vowelHeavy).length,50);
  assert.equal(words.filter(word => word === [...word].reverse().join('')).length,129);
  assert.ok(words.includes('TENET'));
  assert.equal(solveRack(words, 'XOYENTNUIDTE', {minLength:2,mode:'length',bonus:1})[0].word,'DETENTION');
});
test('uses local site path only', async () => {
  let called;
  const result = await loadLocalDictionary({fetcher: async (url) => {
    called=url; return {ok:true,text:async()=>dictionary};
  }});
  assert.equal(called, './dictionaries/towers-of-babble.txt');
  assert.equal(result.origin, 'local');
  assert.equal(result.words.length, 195415);
});
test('rejects truncated local dictionary', () => {
  assert.throws(() => validateLocalDictionary('TENET\nTOY\n'), /incomplete/);
});
test('reports a missing local file without using third-party hosts', async () => {
  await assert.rejects(() => loadLocalDictionary({fetcher:async ()=>({ok:false,status:404})}), /Local Towers of Babble dictionary/);
});
test('production loader contains no external network dependency', () => {
  const source = readFileSync(new URL('./dictionary-loader.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /raw\.githubusercontent\.com|cdn\.jsdelivr\.net|https?:\/\//);
});
