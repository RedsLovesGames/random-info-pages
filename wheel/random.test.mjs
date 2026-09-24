import test from 'node:test'; import assert from 'node:assert/strict'; import {pickWeightedEntry,secureUnitFloat} from './random.js';
const entries=[{id:'a',weight:1},{id:'b',weight:3}];
test('weighted boundaries',()=>{assert.equal(pickWeightedEntry(entries,0).id,'a');assert.equal(pickWeightedEntry(entries,.249999).id,'a');assert.equal(pickWeightedEntry(entries,.25).id,'b');assert.equal(pickWeightedEntry(entries,.999999999).id,'b')});
test('invalid random throws',()=>{assert.throws(()=>pickWeightedEntry(entries,1));assert.throws(()=>pickWeightedEntry([],0))});
test('duplicate labels stay distinct',()=>{assert.equal(pickWeightedEntry([{id:'a',label:'x',weight:1},{id:'b',label:'x',weight:1}],.75).id,'b')});
test('crypto float uses uint32 space',()=>{const c={getRandomValues(a){a[0]=0xffffffff;return a}};assert.equal(secureUnitFloat(c),0xffffffff/2**32)});
