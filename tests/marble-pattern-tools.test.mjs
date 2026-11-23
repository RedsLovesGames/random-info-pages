import test from 'node:test';
import assert from 'node:assert/strict';
import {rotateRows,euclideanRhythm,patternFromEvents} from '../marble-sequencer/pattern-tools.mjs';
import {encodePattern,decodePattern} from '../marble-sequencer/music.mjs';

test('rotation moves every 16-step lane and wraps without mutating input',()=>{
 const rows=[1,0,0,0,0,0,0,0x8000];
 const next=rotateRows(rows,1);
 assert.deepEqual(next,[2,0,0,0,0,0,0,1]);
 assert.deepEqual(rotateRows(next,-1),rows);
 assert.deepEqual(rows,[1,0,0,0,0,0,0,0x8000]);
 assert.deepEqual(rotateRows(rows,16),rows);
 assert.throws(()=>rotateRows([1],3));
});
test('Euclidean rhythm is evenly spread and preserves pulse count',()=>{
 const values=[0,1,3,5,8,12,16];
 for(const hits of values){
  const mask=euclideanRhythm(hits);
  assert.equal(mask.toString(2).replace(/0/g,'').length,hits);
  assert.ok(mask<=0xffff);
  const rotated=euclideanRhythm(hits,3);
  assert.equal(rotated.toString(2).replace(/0/g,'').length,hits);
 }
 assert.equal(euclideanRhythm(0),0);
 assert.equal(euclideanRhythm(16),0xffff);
 assert.throws(()=>euclideanRhythm(17));
 assert.throws(()=>euclideanRhythm(-1));
});
test('Audio hits quantize into correct lanes and 16 steps without inventing pitch',()=>{
 const song={kind:'audio',events:[
  {time:0,lane:0},{time:.15,lane:7},{time:.31,lane:2},
  {time:.33,lane:2},{time:2.4,lane:0},{time:NaN,lane:3},
  {time:.2,lane:8}
 ]};
 const result=patternFromEvents(song,{bpm:120,startTime:0});
 assert.equal(result.pattern.rows[0],1);
 assert.equal(result.pattern.rows[7],1<<1);
 assert.equal(result.pattern.rows[2],(1<<2)|(1<<3),'nearby hits on either side of the quantization boundary occupy adjacent steps');
 assert.equal(result.mapped,4);
 assert.equal(result.discarded,1);
 assert.equal(result.windowSeconds,2);
 assert.ok(decodePattern(encodePattern(result.pattern)));
});
test('MIDI keeps basic percussion categories and maps melodic notes to pitched bars',()=>{
 const source={kind:'midi',events:[
  {time:1,note:36,channel:9},{time:1.1,note:38,channel:9},
  {time:1.25,note:42,channel:9},{time:1.3,note:64,channel:0},
  {time:1.4,note:60,channel:0},{time:20,note:70,channel:0}
 ]};
 const {pattern,mapped}=patternFromEvents(source,{bpm:120,startTime:1});
 assert.equal(mapped,5);
 assert.ok(pattern.rows[0]!==0&&pattern.rows[1]!==0&&pattern.rows[2]!==0);
 assert.ok(pattern.rows[5]!==0);
 assert.ok(pattern.rows[3]!==0);
});
test('Zero, invalid, and out-of-window hits cannot silently corrupt a loop',()=>{
 assert.deepEqual(patternFromEvents({kind:'audio',events:[]},{bpm:104}).pattern.rows,Array(8).fill(0));
 assert.throws(()=>patternFromEvents({kind:'pattern',events:[]}));
 assert.throws(()=>patternFromEvents({kind:'audio',events:[]},{bpm:25}));
 assert.throws(()=>patternFromEvents({kind:'midi',events:[]},{startTime:-1}));
});
