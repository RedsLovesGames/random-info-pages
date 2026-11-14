import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadLocalDictionary, validateLocalDictionary, LOCAL_DICTIONARY_URL, EXPECTED_WORD_COUNT } from './dictionary-loader.js';
import { solveRack } from './words-core.js';

const dictionary = readFileSync(new URL('./dictionaries/enable.txt', import.meta.url), 'utf8');
test('full ENABLE dictionary is stored locally in repository', () => {
  const words = validateLocalDictionary(dictionary);
  assert.equal(words.length, 172823);
  assert.equal(EXPECTED_WORD_COUNT, 172823);
  assert.equal(LOCAL_DICTIONARY_URL, './dictionaries/enable.txt');
  assert.ok(words.includes('DETENTION'));
  assert.ok(words.includes('TENET'));
  assert.equal(solveRack(words, 'XOYENTNUIDTE', {minLength:2,mode:'length',bonus:1})[0].word,'DETENTION');
});
test('uses local site path only', async () => {
  let called;
  const result = await loadLocalDictionary({fetcher: async (url) => {
    called=url; return {ok:true,text:async()=>dictionary};
  }});
  assert.equal(called, './dictionaries/enable.txt');
  assert.equal(result.origin, 'local');
  assert.equal(result.words.length, 172823);
});
test('rejects truncated local dictionary', () => {
  assert.throws(() => validateLocalDictionary('TENET\nTOY\n'), /incomplete/);
});
test('reports a missing local file without using third-party hosts', async () => {
  await assert.rejects(() => loadLocalDictionary({fetcher:async ()=>({ok:false,status:404})}), /Local ENABLE dictionary/);
});
test('production loader contains no external network dependency', () => {
  const source = readFileSync(new URL('./dictionary-loader.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /raw\.githubusercontent\.com|cdn\.jsdelivr\.net|https?:\/\//);
});
