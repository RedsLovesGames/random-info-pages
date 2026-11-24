import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeMidiTiming,collectMidiTiming,midiTickToSeconds,midiSecondsToTick}
 from '../marble-sequencer/midi-timing.mjs';
const timing={ppq:480,changes:[{tick:0,us:500000},{tick:480,us:1000000},{tick:960,us:250000}]};
test('roundtrip exact ticks across changing tempo sections',()=>{
 for(const tick of [0,1,240,479,480,600,959,960,1100,3000]){
  const seconds=midiTickToSeconds(tick,timing);
  assert.ok(Math.abs(midiSecondsToTick(seconds,timing)-tick)<=1,[tick,seconds]);
 }
 assert.equal(midiTickToSeconds(480,timing),.5);
 assert.equal(midiTickToSeconds(960,timing),1.5);
 assert.equal(midiSecondsToTick(1,timing),720);
});
test('tempo collection merges same-tick changes and keeps default initial tempo',()=>{
 const source=[{tick:0,type:'setTempo',microsecondsPerBeat:650000},
  {tick:240,type:'noteOn'},{tick:480,type:'setTempo',microsecondsPerBeat:1000000}];
 assert.deepEqual(collectMidiTiming(source,480),
  {ppq:480,changes:[{tick:0,us:650000},{tick:480,us:1000000}]});
 assert.deepEqual(collectMidiTiming([],480),
  {ppq:480,changes:[{tick:0,us:500000}]});
});
test('bad maps cannot supply arbitrary divisions, ordering, or tempo',()=>{
 assert.throws(()=>normalizeMidiTiming({ppq:0,changes:[{tick:0,us:500000}]}),/tempo map/);
 assert.throws(()=>normalizeMidiTiming({ppq:480,changes:[{tick:100,us:500000}]}),/start/);
 assert.throws(()=>normalizeMidiTiming({ppq:480,changes:[{tick:0,us:500000},{tick:0,us:1000000}]}),/tempo event/);
 assert.throws(()=>midiSecondsToTick(-1,timing),/time/);
});
