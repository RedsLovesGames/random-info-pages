import test from 'node:test';
import assert from 'node:assert/strict';
import {decodeMidi} from '../marble-sequencer/music.mjs';
import {buildMidiWorkspace,changeMidiNote,exportMultitrackMidi,normalizeMidiEvents}
 from '../marble-sequencer/midi-workspace.mjs';
const ascii=s=>[...s].map(x=>x.charCodeAt(0));
const be16=n=>[(n>>8)&255,n&255],be32=n=>[(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255];
function vlq(n){let a=[n&127];while((n>>=7))a.unshift((n&127)|128);return a}
function track(events){
 const bytes=[];
 for(const [delta,data] of events)bytes.push(...vlq(delta),...data);
 bytes.push(0,0xff,0x2f,0);
 return [...ascii('MTrk'),...be32(bytes.length),...bytes];
}
function variableTempoSong(){
 const tempo=track([
  [0,[0xff,0x51,0x03,0x07,0xa1,0x20]],
  [480,[0xff,0x51,0x03,0x0f,0x42,0x40]]
 ]);
 const notes=track([
  [0,[0xc0,11]],
  [0,[0x90,60,101]],
  [480,[0x80,60,0]],
  [0,[0x90,62,110]],
  [480,[0x80,62,0]]
 ]);
 return new Uint8Array([...ascii('MThd'),...be32(6),...be16(1),
  ...be16(2),...be16(480),...tempo,...notes]);
}
test('tempo changes survive MIDI decode, editable JSON and Format 1 re-export',()=>{
 const decoded=decodeMidi(variableTempoSong());
 assert.deepEqual(decoded.timing,{ppq:480,changes:[
  {tick:0,us:500000},{tick:480,us:1000000}
 ]});
 assert.equal(decoded.events.length,2);
 assert.ok(Math.abs(decoded.events[0].duration-.5)<.002);
 assert.ok(Math.abs(decoded.events[1].time-.5)<.002);
 assert.ok(Math.abs(decoded.events[1].duration-1)<.002);
 const workspace=buildMidiWorkspace({name:'tempo test',...decoded});
 const restored=buildMidiWorkspace(JSON.parse(JSON.stringify(workspace)));
 const exported=decodeMidi(exportMultitrackMidi(restored));
 assert.deepEqual(exported.timing,decoded.timing);
 assert.equal(exported.events.length,2);
 for(const original of decoded.events){
  const output=exported.events.find(note=>note.note===original.note);
  assert.ok(output,'retained note '+original.note);
  assert.ok(Math.abs(output.time-original.time)<.005);
  assert.ok(Math.abs(output.duration-original.duration)<.005);
 }
});
test('moving a note across the change converts its new elapsed-seconds position to correct ticks',()=>{
 const first=decodeMidi(variableTempoSong());
 const workspace=buildMidiWorkspace({name:'tempo test',...first});
 const id=workspace.events.find(e=>e.note===60).id;
 const index=workspace.events.findIndex(e=>e.id===id);
 const edited=changeMidiNote(workspace.events,index,{time:.75});
 const updated=buildMidiWorkspace({...workspace,events:edited});
 assert.equal(updated.events.find(e=>e.id===id).time,.75);
 const exported=decodeMidi(exportMultitrackMidi(updated));
 assert.deepEqual(exported.timing,first.timing);
 const result=exported.events.find(e=>e.note===60);
 assert.ok(Math.abs(result.time-.75)<.005);
});
test('note IDs remain stable through edits and sorting without corrupting older JSON',()=>{
 const events=[{time:2,duration:.25,track:0,channel:0,note:60,velocity:.8,program:0},
  {time:1,duration:.25,track:0,channel:0,note:64,velocity:.8,program:0}];
 const workspace=buildMidiWorkspace({name:'old project',events});
 assert.equal(new Set(workspace.events.map(e=>e.id)).size,2);
 const id=workspace.events.find(e=>e.note===60).id;
 const changed=changeMidiNote(workspace.events,workspace.events.findIndex(e=>e.id===id),{time:.5});
 assert.equal(changed.find(e=>e.id===id).time,.5);
 assert.equal(changed[0].id,id,'selection survives array reorder');
 const saved=buildMidiWorkspace(JSON.parse(JSON.stringify({...workspace,events:changed})));
 assert.ok(saved.events.some(e=>e.id===id));
 const collision=normalizeMidiEvents([{...events[0],id:'same'},{...events[1],id:'same'}]);
 assert.equal(new Set(collision.map(e=>e.id)).size,2);
});
