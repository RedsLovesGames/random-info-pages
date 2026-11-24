import test from 'node:test';
import assert from 'node:assert/strict';
import {decodeMidi} from '../marble-sequencer/music.mjs';
import {normalizeMidiEvents,trackSummary,changeMidiTrack,changeMidiNote,
 buildMidiWorkspace,midiPlaybackSong,exportMultitrackMidi,MIDI_WORKSPACE_FORMAT}
 from '../marble-sequencer/midi-workspace.mjs';
const events=[
 {time:0,duration:.25,track:0,channel:0,note:60,velocity:.65,program:11},
 {time:.35,duration:.2,track:1,channel:1,note:70,velocity:.55,program:49},
 {time:.65,duration:.15,track:1,channel:1,note:74,velocity:.8,program:49}
];
test('independent tracks, mute metadata and controls retain pitches and timing',()=>{
 const w=buildMidiWorkspace({name:'example.mid',events,muted:[1]});
 assert.equal(w.format,MIDI_WORKSPACE_FORMAT);
 assert.deepEqual(trackSummary(w.events).map(g=>g.notes),[1,2]);
 assert.equal(midiPlaybackSong(w).events.length,1);
 const shifted=changeMidiTrack(w.events,1,{transpose:-12,velocity:80,shiftMs:200});
 assert.deepEqual(shifted.filter(e=>e.track===1).map(e=>e.note),[58,62]);
 assert.equal(shifted.find(e=>e.track===0).note,60);
 assert.ok(Math.abs(shifted[1].time-.55)<1e-9);
 assert.equal(events[1].note,70,'input remains unchanged');
});
test('single note edits retain other tracks and validate extremes',()=>{
 const next=changeMidiNote(events,1,{note:72,time:1,duration:.5,velocity:.6});
 assert.equal(next.find(e=>e.note===72).track,1);
 assert.equal(next.find(e=>e.note===60).time,0);
 assert.throws(()=>changeMidiNote(events,0,{note:128}),/Invalid MIDI/);
 assert.throws(()=>changeMidiTrack(events,1,{transpose:90}),/outside/);
 assert.throws(()=>buildMidiWorkspace({events,muted:[40]}),/Unrecognized/);
});
test('export SMF1 roundtrips independently timed notes, tracks and instrument programs',()=>{
 const w=buildMidiWorkspace({name:'two tracks',events,muted:[1]});
 const bytes=exportMultitrackMidi(w);
 assert.equal(String.fromCharCode(...bytes.slice(0,4)),'MThd');
 const decoded=decodeMidi(bytes);
 assert.equal(decoded.tracks,3,'tempo track plus two instrument tracks');
 assert.equal(decoded.events.length,3,'muted state is playback only, not destructive export');
 assert.deepEqual(decoded.events.map(e=>e.note).sort((a,b)=>a-b),[60,70,74]);
 assert.ok(decoded.events.some(e=>e.channel===1&&e.program===49));
 for(const note of decoded.events){
  const original=events.find(e=>e.note===note.note);
  assert.ok(Math.abs(original.time-note.time)<.004);
  assert.ok(Math.abs(original.duration-note.duration)<.008);
 }
});
test('invalid and oversized note collections cannot bypass limits',()=>{
 assert.throws(()=>normalizeMidiEvents([]),/50,000/);
 assert.throws(()=>normalizeMidiEvents([{time:-1}]),/Invalid/);
 assert.throws(()=>buildMidiWorkspace({events,muted:'bogus'}),/Unrecognized/);
});
