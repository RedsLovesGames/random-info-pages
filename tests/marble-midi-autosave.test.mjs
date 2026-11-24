import test from 'node:test';
import assert from 'node:assert/strict';
import {MIDI_DRAFT_FORMAT,packMidiDraft,unpackMidiDraft,createMidiDraftStore}
 from '../marble-sequencer/midi-autosave.mjs';
const note=(time,id)=>({id,time,duration:.25,track:0,channel:0,note:60,
 velocity:.8,program:0});
const midi=(name,time)=>({name,events:[note(time,'stable')],muted:[],
 timing:{ppq:480,changes:[{tick:0,us:500000},{tick:480,us:400000}]}});
function memory(){const data=new Map();return {
 getItem:key=>data.get(key)??null,setItem:(key,val)=>data.set(key,val),
 removeItem:key=>data.delete(key),data};}
test('draft round-trip validates and preserves MIDI identifiers and tempo maps',()=>{
 const draft=packMidiDraft(midi('My work',.13),1234);
 assert.equal(draft.format,MIDI_DRAFT_FORMAT);
 assert.equal(draft.updatedAt,1234);
 const recovered=unpackMidiDraft(JSON.parse(JSON.stringify(draft)));
 assert.equal(recovered.workspace.events[0].id,'stable');
 assert.deepEqual(recovered.workspace.timing,midi('x',0).timing);
 assert.throws(()=>unpackMidiDraft({...draft,format:'wrong'}),/invalid/);
 assert.throws(()=>unpackMidiDraft({...draft,workspace:{events:[]}}),/notes/);
});
test('local browser persistence restores latest edit, and discard only clears this slot',async()=>{
 const localStorage=memory(),store=createMidiDraftStore({indexedDB:null,localStorage});
 await store.save(midi('A',1));
 await store.save(midi('B',2));
 assert.equal((await store.read()).workspace.name,'B');
 assert.equal((await store.read()).workspace.events[0].time,2);
 assert.equal(store.backend,'localStorage');
 await store.clear();
 assert.equal(await store.read(),null);
 assert.equal(localStorage.data.size,0);
});
test('failed quota writes do not report success and previous draft stays intact',async()=>{
 const localStorage=memory(),store=createMidiDraftStore({indexedDB:null,localStorage});
 await store.save(midi('Good',.3));
 const real=localStorage.setItem;
 localStorage.setItem=()=>{throw new Error('Quota exceeded')};
 await assert.rejects(store.save(midi('Failed',4)),/Quota exceeded/);
 localStorage.setItem=real;
 assert.equal((await store.read()).workspace.name,'Good');
 await store.save(midi('Recovered',7));
 assert.equal((await store.read()).workspace.name,'Recovered');
});
test('invalid edit cannot overwrite the previous healthy recovery slot',async()=>{
 const localStorage=memory(),store=createMidiDraftStore({indexedDB:null,localStorage});
 await store.save(midi('Good',.3));
 assert.throws(()=>store.save({...midi('Bad',3),events:[]}),/notes/);
 assert.equal((await store.read()).workspace.name,'Good');
});
