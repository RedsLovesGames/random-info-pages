import test from 'node:test';
import assert from 'node:assert/strict';
import {createTrialNotebook,parseTrialNotebook,NOTEBOOK_FORMAT,MAX_NOTEBOOK_TRIALS}
 from '../compare/notebook.mjs';
const baseline={format:'rip-compare-scenario-v1',left:'fluid-dynamics',right:'fluid-dynamics',
 duration:10,states:{left:{quality:'eco'},right:{quality:'eco'}}};
const trial={index:1,mode:'fixed-step',steps:60,requestedSeconds:null,
 startedAt:'2026-11-24T00:00:00.000Z',endedAt:'2026-11-24T00:00:01.100Z',
 elapsedMs:1100,before:{left:{simulatedSteps:0},right:{simulatedSteps:0}},
 after:{left:{simulatedSteps:60,stateHash:'a1b2'},right:{simulatedSteps:60,stateHash:'a1b2'}},
 note:'Paused fixed-step physics'};
const timed={...trial,mode:'timed',steps:undefined,requestedSeconds:10};
test('JSON export/import restores metrics, baseline, and original ordering',()=>{
 const source=createTrialNotebook(baseline,[trial,timed]);
 assert.equal(source.format,NOTEBOOK_FORMAT);
 const result=parseTrialNotebook(JSON.parse(JSON.stringify(source)));
 assert.equal(result.trials.length,2);
 assert.deepEqual(result.baseline,baseline);
 assert.equal(result.trials[0].after.right.stateHash,'a1b2');
 assert.equal(result.trials[0].steps,60);
 assert.equal(result.trials[1].mode,'timed');
 assert.equal(result.trials[1].requestedSeconds,10);
});
test('legacy configuration-only baselines remain importable',()=>{
 const old=parseTrialNotebook(baseline);
 assert.equal(old.legacy,true);
 assert.deepEqual(old.trials,[]);
 assert.deepEqual(old.baseline,baseline);
});
test('malformed or oversized histories are rejected, never partially installed',()=>{
 const valid=createTrialNotebook(baseline,[trial]);
 assert.throws(()=>parseTrialNotebook({...valid,trials:[{bad:true}]}),/measurements/);
 assert.throws(()=>parseTrialNotebook({...valid,trials:[{...trial,steps:29}]}),/step count/);
 assert.throws(()=>parseTrialNotebook({...valid,trials:new Array(MAX_NOTEBOOK_TRIALS+1).fill(trial)}),/compatible/);
 assert.throws(()=>parseTrialNotebook({...valid,trials:[{...trial,startedAt:'never'}]}),/measurements/);
 assert.throws(()=>parseTrialNotebook({...valid,baseline:{format:'fake'}}),/compatible comparison baseline/);
});
test('metadata sanitizer does not preserve nested executable payloads or unbounded values',()=>{
 const result=parseTrialNotebook(createTrialNotebook(baseline,[{
  ...trial,after:{left:{stateHash:'abc',nested:{danger:'x'},huge:'z'.repeat(500)},
   right:{ok:true}}
 }]));
 assert.equal(result.trials[0].after.left.nested,undefined);
 assert.equal(result.trials[0].after.left.huge.length,100);
});
