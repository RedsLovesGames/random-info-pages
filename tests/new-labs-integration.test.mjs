import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('Music Microscope surfaces bounded stable frequency candidates as optional notch targets',()=>{
 const worker=read('music-microscope/analysis-worker.js'),app=read('music-microscope/app.js');
 const html=read('music-microscope/index.html');
 assert.match(worker,/detectStableTones\(samples,analysisRate\)/);
 assert.match(worker,/tonalCandidates, analysisRate/);
 assert.match(app,/function drawTonalCandidates\(/);
 assert.match(app,/button\.textContent=candidate\.frequency\.toFixed\(1\)/);
 assert.match(app,/button\.addEventListener\('click'/);
 assert.match(app,/candidate\.persistence\*100/);
 assert.match(html,/id="notchCandidates"/);
 assert.match(html,/candidates, not identified noise/);
});
test('Marble Sequencer exposes independently editable MIDI tracks and notes',()=>{
 const html=read('marble-sequencer/index.html'),app=read('marble-sequencer/app.mjs');
 for(const id of ['midi-workspace','midi-track','midi-mute','midi-transpose','midi-velocity-scale',
  'midi-shift','midi-apply-track','midi-note','midi-note-pitch','midi-note-time',
  'midi-note-length','midi-note-velocity','midi-apply-note','midi-undo','midi-redo',
  'midi-export','midi-save-json','midi-open-json','midi-json-file'])
   assert.match(html,new RegExp('id="'+id+'"'));
 for(const method of ['changeMidiTrack','changeMidiNote','exportMultitrackMidi','buildMidiWorkspace',
 'midiPlaybackSong','midiSaveHistory'])
   assert.ok(app.includes(method),method);
 assert.match(app,/restoreMidiWorkspace\(song,/);
 assert.match(app,/state\?\.format===MIDI_WORKSPACE_FORMAT/);
 assert.match(html,/retains the imported tempo map/);
 assert.match(html,/fallback|fall back/i);
});
test('Compare Lab has portable baselines, repeatable time windows and honest limitations',()=>{
 const html=read('compare/index.html'),app=read('compare/app.mjs');
 for(const id of ['capture-baseline','restore-baseline','run-trial','stop-trial',
  'export-trials','import-trials','trial-file','trial-results','trial-duration'])
  assert.match(html,new RegExp('id="'+id+'"'));
 for(const word of ['createBaseline','parseBaseline','recordTrial','restoreImportedBaseline',
  'frameReady','runTrial','trialRevision','getTrialMetrics'])
  assert.ok(app.includes(word),word);
 assert.match(app,/Promise\.all\(\[a\.setState\(/);
 assert.match(app,/baseline\.duration\*1000/);
 assert.match(html,/not frame-locked/);
 assert.match(html,/id="run-steps"/);
 assert.match(app,/async function runFixedSteps\(/);
 assert.match(app,/left\.advanceSteps\(/);
});
test('Fluid configuration adaptor uses safe snapshots rather than raw solver cell capture',()=>{
 const fluid=read('fluid-dynamics/app.mjs');
 assert.match(fluid,/format:'rip-fluid-settings-v1'/);
 assert.match(fluid,/setState\(value\)/);
 assert.match(fluid,/Object\.hasOwn\(presets,value\.preset\)/);
 assert.match(fluid,/loadPreset\(value\.preset\)/);
 assert.match(fluid,/setPaused\(true\)/);
 assert.match(fluid,/simulatedSteps:tick/);
 assert.match(fluid,/stateHash:fluidSignature\(tank\)\.hash/);
 assert.match(fluid,/advanceSteps\(count\)/);
});
