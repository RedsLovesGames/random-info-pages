import test from 'node:test';
import assert from 'node:assert/strict';
import { loadDictionaryWithFallback, DICTIONARY_URLS } from './dictionary-loader.js';

// The solver accepts A-Z only; make 100,100 unique valid letter words.
function letters(n) {
  let value=n+1, out='';
  while(value>0){value--;out=String.fromCharCode(65+(value%26))+out;value=Math.floor(value/26);}
  return out;
}
const CONTENT = Array.from({length:100100},(_,i) => 'WORD' + letters(i)).join('\n');
const response = text => ({ok:true,text:async()=>text});
function cache() {
  const saved=new Map();
  return {
    saved,
    open: async () => ({
      match: async url => saved.has(url) ? {text:async()=>saved.get(url)} : null,
      put: async (url,res) => saved.set(url,await res.text())
    })
  };
}
test('first download uses primary source and saves a copy', async () => {
  const store=cache(); let requests=0;
  const found=await loadDictionaryWithFallback('enable',{fetcher:async()=>{requests++;return response(CONTENT)},cacheStorage:store});
  assert.equal(found.origin,'primary');
  assert.equal(found.words.length,100100);
  assert.equal(requests,1);
  assert.ok(store.saved.has(DICTIONARY_URLS.enable[0]));
});
test('saved copy works without network access on later visits', async () => {
  const store=cache();
  await loadDictionaryWithFallback('enable',{fetcher:async()=>response(CONTENT),cacheStorage:store});
  const found=await loadDictionaryWithFallback('enable',{fetcher:async()=>{throw Error('offline')},cacheStorage:store});
  assert.equal(found.origin,'cached');
  assert.equal(found.words.length,100100);
});
test('backup CDN is used when GitHub raw request fails', async () => {
  let requests=0;
  const found=await loadDictionaryWithFallback('enable',{
    fetcher:async()=>++requests===1 ? {ok:false,status:429} : response(CONTENT),
    cacheStorage:null
  });
  assert.equal(requests,2);
  assert.equal(found.origin,'mirror');
});
test('incomplete dictionary triggers backup instead of being cached', async () => {
  const store=cache(); let requests=0;
  const found=await loadDictionaryWithFallback('enable',{
    fetcher:async()=>++requests===1 ? response('TOY\nTENET') : response(CONTENT),
    cacheStorage:store
  });
  assert.equal(found.origin,'mirror');
  assert.equal(store.saved.get(DICTIONARY_URLS.enable[0]),CONTENT);
});
test('works when CacheStorage is denied', async () => {
  const found=await loadDictionaryWithFallback('enable',{
    fetcher:async()=>response(CONTENT),
    cacheStorage:{open:async()=>{throw Error('blocked')}}
  });
  assert.equal(found.origin,'primary');
});
test('fails with an actionable message only if both hosts fail and no cache exists', async () => {
  await assert.rejects(loadDictionaryWithFallback('enable',{
    fetcher:async()=>{throw Error('network unavailable')},
    cacheStorage:null
  }),/Primary.*Backup/s);
});
