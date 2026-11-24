import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('Compare Lab publishes a sortable-readable per-run status and downloadable CSV',()=>{
 const html=read('compare/index.html'),app=read('compare/app.mjs');
 for(const id of ['trial-summary','export-trials-csv','clear-trials'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(app,/import \{exportTrialCsv,trialHashComparison\} from '\.\/trial-export\.mjs'/);
 assert.match(app,/trialHashComparison\(trial\)/);
 assert.match(app,/Object\.entries\(data\)/);
 assert.match(app,/trial\.after\?\.\[side\]/);
 assert.match(app,/exportTrialCsv\(baseline,trials\)/);
 assert.match(app,/text\/csv;charset=utf-8/);
 assert.match(app,/Trial results cleared; the captured baseline is still available/);
});
