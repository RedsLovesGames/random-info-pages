import test from 'node:test';
import assert from 'node:assert/strict';
import {makeRollLayout,hitRollNote,dragRollNote,scrollForNote}
 from '../marble-sequencer/piano-roll.mjs';
const events=[
 {id:'a',track:0,time:1,duration:.5,note:60,velocity:.8},
 {id:'b',track:0,time:1.5,duration:1,note:64,velocity:.7},
 {id:'c',track:1,time:1,duration:.5,note:60,velocity:.9}
];
const layout=makeRollLayout(events,0,{width:900,height:310,span:8,low:48,rows:36});
test('layout isolates one MIDI track and maps pitch/time to bounded coordinates',()=>{
 assert.equal(layout.rects.length,2);
 const first=layout.rects[0];
 assert.equal(first.id,'a');
 assert.ok(first.x>layout.left);
 assert.ok(first.y>layout.top);
 assert.ok(first.width>30);
 assert.equal(layout.high,83);
 assert.deepEqual(hitRollNote(layout,first.x+8,first.y+first.height/2),
  {index:0,id:'a',mode:'move'});
 assert.equal(hitRollNote(layout,10,40),null);
});
test('dragging moves a selected note with pitch/time snapping and resize handle',()=>{
 const rect=layout.rects[0];
 const selected=hitRollNote(layout,rect.x+rect.width-3,rect.y+2);
 assert.equal(selected.mode,'resize');
 const moved=dragRollNote(events[0],{dx:layout.pxPerSecond*.25,dy:-layout.rowHeight*2,
  snap:.125,mode:'move'},layout);
 assert.equal(moved.note,62);
 assert.equal(moved.time,1.25);
 const resized=dragRollNote(events[0],{dx:layout.pxPerSecond*.25,
  mode:'resize',snap:.125},layout);
 assert.equal(resized.duration,.75);
 assert.equal(resized.note,60);
 assert.equal(events[0].duration,.5,'original event is immutable');
});
test('roll scroll follows notes and viewport validation rejects bad arguments',()=>{
 assert.ok(scrollForNote({time:10},8,20)>0);
 assert.equal(scrollForNote({time:.3},8,2),0);
 assert.throws(()=>makeRollLayout(events,0,{span:9}),/viewport/);
 assert.throws(()=>dragRollNote(events[0],{snap:.03},layout),/drag/);
});
