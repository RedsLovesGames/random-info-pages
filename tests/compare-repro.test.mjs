import test from 'node:test';
import assert from 'node:assert/strict';
import {createBaseline,parseBaseline,recordTrial,safeMetricSummary}
 from '../compare/repro.mjs';
test('repeatable setup snapshots remain deep-cloned and serializable',()=>{
 const state={loop:'100:abcd',name:'x'};
 const baseline=createBaseline({left:'marble-sequencer',right:'fluid-dynamics',
  states:{left:state,right:{format:'rip-fluid-settings-v1',preset:'vortex'}}});
 state.name='mutated';
 assert.equal(baseline.states.left.name,'x');
 assert.deepEqual(parseBaseline(JSON.parse(JSON.stringify(baseline))),baseline);
 assert.throws(()=>parseBaseline({format:'other'}),/compatible/);
});
test('timed trials carry bounded metric snapshots with honest timing limits',()=>{
 const baseline=createBaseline({left:'a',right:'b',states:{left:{},right:{}},duration:5});
 const trial=recordTrial(baseline,{startedAt:1000,endedAt:6100,
  before:{left:{fps:20},right:{fps:21}},after:{left:{fps:18},right:{fps:22}}});
 assert.equal(trial.elapsedMs,5100);
 assert.match(trial.note,/not guaranteed deterministic/);
 assert.equal(trial.after.left.fps,18);
 assert.throws(()=>recordTrial(baseline,{startedAt:3,endedAt:2,before:{},after:{}}));
});
test('unbounded baselines and invalid durations are rejected',()=>{
 assert.throws(()=>createBaseline({left:'a',right:'b',states:{left:{},right:{}},duration:500}),/Invalid/);
 assert.throws(()=>createBaseline({left:'a',right:'b',states:{left:{payload:'x'.repeat(2100000)},right:{}}}),/2 MB/);
 assert.deepEqual(safeMetricSummary({fps:24,other:null,nan:NaN,flag:true,title:'Test'}),{
  fps:24,flag:true,title:'Test'});
});
