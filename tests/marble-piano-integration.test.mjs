import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
test('piano roll provides time/pitch navigation, pointer editing, and keyboard alternative',()=>{
 const html=read('marble-sequencer/index.html');
 const app=read('marble-sequencer/app.mjs');
 const ui=read('marble-sequencer/piano-roll-ui.mjs');
 for(const id of ['midi-piano-title','piano-span','piano-low','piano-rows','piano-snap',
  'piano-canvas','piano-scroll','piano-offset','piano-hint','piano-jump'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(html,/keyboard-accessible editing/);
 assert.match(app,/pianoRoll=createPianoRoll\(/);
 assert.match(app,/selectedMidiId/);
 assert.match(app,/pianoRoll\?\.tick\(now\)/);
 assert.match(app,/pianoRoll\?\.focusNote\(selected\)/);
 assert.match(ui,/hitRollNote\(layout,p\.x,p\.y\)/);
 assert.match(ui,/dragRollNote\(gesture\.original,/);
 assert.match(ui,/onEdit\(id,\{note:draft\.note,time:draft\.time,duration:draft\.duration\}\)/);
 assert.match(ui,/pointercancel/);
});
test('tempo maps persist from MIDI import through editor and event-based export',()=>{
 const music=read('marble-sequencer/music.mjs'),
  workspace=read('marble-sequencer/midi-workspace.mjs');
 assert.match(music,/collectMidiTiming\(pieces\[0\],header\.ticksPerBeat\)/);
 assert.match(workspace,/normalizeMidiTiming\(timing\)/);
 assert.match(workspace,/midiSecondsToTick\(seconds,w\.timing\)/);
 assert.match(workspace,/w\.timing\.changes\.map/);
 assert.match(workspace,/u16\(ppq\)/);
});
