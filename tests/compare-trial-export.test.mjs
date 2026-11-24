import test from 'node:test';
import assert from 'node:assert/strict';
import {trialHashComparison,exportTrialCsv} from '../compare/trial-export.mjs';
const baseline={left:'fluid-dynamics',right:'fluid-dynamics'};
const trial={index:1,mode:'fixed-step',steps:60,elapsedMs:827,startedAt:'2026-11-24T00:00:00Z',
 endedAt:'2026-11-24T00:00:01Z',before:{left:{simulatedSteps:2},right:{simulatedSteps:2}},
 after:{left:{simulatedSteps:62,stateHash:'6efa'},right:{simulatedSteps:62,stateHash:'6efa'}}};
test('CSV exports matching signatures, headings and stable before/after metrics',()=>{
 const csv=exportTrialCsv(baseline,[trial]);
 assert.ok(csv.startsWith('\ufeff'));
 assert.match(csv,/"fixed_steps"/);
 assert.match(csv,/"left_after_stateHash"/);
 assert.match(csv,/"matching"/);
 assert.match(csv,/"62"/);
 assert.equal(csv.split('\r\n').filter(Boolean).length,2);
 assert.equal(trialHashComparison(trial),'matching');
 assert.equal(trialHashComparison({...trial,after:{...trial.after,right:{stateHash:'aaaa'}}}),'different');
 assert.equal(trialHashComparison({after:{left:{},right:{}}}),'unavailable');
});
test('CSV protects values that could be executed as spreadsheet formulas',()=>{
 const source={...trial,after:{left:{label:'=HYPERLINK("evil")'},right:{}}};
 const csv=exportTrialCsv(baseline,[source]);
 assert.match(csv,/'=HYPERLINK/);
 assert.match(csv,/""evil""/);
 assert.throws(()=>exportTrialCsv(null,[]),/Invalid/);
 assert.throws(()=>exportTrialCsv(baseline,new Array(1001)),/oversized/);
});
