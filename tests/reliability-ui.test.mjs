import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('MIDI recovery controls persist edits and expose restoring or discarding local drafts',()=>{
 const html=read('marble-sequencer/index.html'),app=read('marble-sequencer/app.mjs');
 for(const id of ['midi-autosave-status','midi-recovery','midi-recovery-heading',
   'midi-restore-draft','midi-discard-draft','midi-recovery-details',
   'midi-revision','midi-export-draft','midi-checkpoint'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(app,/import \{createMidiRecoveryVault\} from '\.\/midi-recovery-history\.mjs'/);
 assert.match(app,/function scheduleMidiDraftSave\(/);
 assert.match(app,/midiDraftStore\.save\(draft,\{session,checkpoint\}\)/);
 assert.match(app,/midiDraftStore\.list\(\)/);
 assert.match(app,/midiDraftStore\.load\(id\)/);
 assert.match(app,/midiDraftStore\.discard\(id\)/);
 assert.match(app,/midiDraftSession=newMidiSession\(\)/);
 assert.match(app,/offerMidiRecovery\(\)/);
 assert.match(app,/scheduleMidiDraftSave\(\);/);
 assert.match(app,/visibilitychange/);
});
test('Compare Lab reinstates full validated notebook history after baseline restoration',()=>{
 const compare=read('compare/app.mjs'),html=read('compare/index.html');
 assert.match(compare,/parseTrialNotebook\(object\)/);
 assert.match(compare,/pendingTrials=imported\.trials/);
 assert.match(compare,/trials=recorded/);
 assert.match(compare,/createTrialNotebook\(baseline,trials\)/);
 assert.match(compare,/MAX_NOTEBOOK_TRIALS/);
 assert.match(html,/Import notebook or baseline/);
});
