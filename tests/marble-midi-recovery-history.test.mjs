import test from 'node:test';
import assert from 'node:assert/strict';
import {createMidiRecoveryVault,appendMidiRevision,removeMidiRevision,
 summarizeMidiHistory,MIDI_HISTORY_LIMIT,MIDI_HISTORY_FORMAT}
 from '../marble-sequencer/midi-recovery-history.mjs';
import {packMidiDraft} from '../marble-sequencer/midi-autosave.mjs';
const project=(name='Song',time=1)=>({name,events:[
 {id:'n',time,duration:.5,note:60,channel:0,track:0,velocity:.75,program:0}],muted:[]});
const local=()=>{const m=new Map();return {
 getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),
 removeItem:k=>m.delete(k),items:m};};
test('new imports are separate history entries, even within the edit window',()=>{
 let h={format:MIDI_HISTORY_FORMAT,entries:[]};
 h=appendMidiRevision(h,packMidiDraft(project('A'),1000),'sessionA');
 h=appendMidiRevision(h,packMidiDraft(project('B'),1200),'sessionB');
 assert.equal(h.entries.length,2);
 assert.equal(h.entries[0].draft.workspace.name,'B');
 assert.equal(h.entries[1].draft.workspace.name,'A');
 assert.equal(new Set(h.entries.map(e=>e.id)).size,2);
});
test('rapid edits update current revision but retain periodic checkpoints',()=>{
 let h={format:MIDI_HISTORY_FORMAT,entries:[]};
 h=appendMidiRevision(h,packMidiDraft(project('first'),1000),'sessionA');
 const id=h.entries[0].id;
 h=appendMidiRevision(h,packMidiDraft(project('second'),1400),'sessionA');
 assert.equal(h.entries.length,1);
 assert.equal(h.entries[0].id,id);
 assert.equal(h.entries[0].createdAt,1000,'checkpoint creation must not drift with edits');
 h=appendMidiRevision(h,packMidiDraft(project('third'),91500),'sessionA');
 assert.equal(h.entries.length,2);
 assert.equal(h.entries[1].draft.workspace.name,'second');
 h=appendMidiRevision(h,packMidiDraft(project('manual'),92000),'sessionA',{checkpoint:true});
 assert.equal(h.entries.length,3);
 assert.equal(h.entries[0].pinned,true,'manual checkpoint must be protected from immediate edits');
 h=appendMidiRevision(h,packMidiDraft(project('following edit'),92010),'sessionA');
 assert.equal(h.entries.length,4,'edit after manual checkpoint should create a new autosave slot');
 assert.equal(h.entries[1].draft.workspace.name,'manual','checkpoint must retain original note data');
 for(let i=0;i<20;i++)h=appendMidiRevision(h,packMidiDraft(project('v'+i),100000+i),'session'+i);
 assert.equal(h.entries.length,MIDI_HISTORY_LIMIT);
});
test('versioned vault migrates legacy storage without deleting it on failed writes',async()=>{
 const storage=local(),key='rip-marble-midi-latest';
 storage.setItem(key,JSON.stringify(packMidiDraft(project('legacy'),500)));
 let clock=900;
 const vault=createMidiRecoveryVault({indexedDB:null,localStorage:storage,now:()=>clock});
 let items=await vault.list();
 assert.equal(items.length,1);assert.equal(items[0].id,'legacy');
 const historic=await vault.load('legacy');
 assert.equal(historic.workspace.name,'legacy');
 await vault.save(project('new'),{session:'newImport'});
 items=await vault.list();
 assert.equal(items.length,2);
 assert.equal(items[1].name,'legacy');
 assert.equal(storage.getItem(key),null,'old slot cleaned after successful migration');
 clock=910;
 await vault.save(project('edited'),{session:'newImport'});
 items=await vault.list();assert.equal(items.length,2);
 assert.equal((await vault.read()).workspace.name,'edited');
 const modern=storage.getItem('rip-marble-midi-history');
 assert.ok(modern?.includes('legacy'),'migration retained old draft');
 await vault.discard(items[0].id);
 assert.equal((await vault.list()).length,1);
 assert.equal((await vault.read()).workspace.name,'legacy');
 await vault.clear();assert.deepEqual(await vault.list(),[]);
});
test('quota failure leaves recoverable revision untouched and subsequent save works',async()=>{
 const storage=local(),vault=createMidiRecoveryVault({indexedDB:null,localStorage:storage,now:()=>4000});
 await vault.save(project('good'),{session:'one'});
 const real=storage.setItem;
 storage.setItem=()=>{throw new Error('QuotaExceededError')};
 await assert.rejects(vault.save(project('failed'),{session:'two'}),/QuotaExceeded/);
 storage.setItem=real;
 assert.equal((await vault.read()).workspace.name,'good');
 await vault.save(project('recovered'),{session:'two'});
 assert.equal((await vault.list()).length,2);
});
test('invalid stored history blocks overwrite and preserves bytes',async()=>{
 const storage=local();
 const corrupted='{"format":"rip-marble-midi-history-v1","entries":[{"bad":true}]}';
 storage.setItem('rip-marble-midi-history',corrupted);
 const vault=createMidiRecoveryVault({indexedDB:null,localStorage:storage});
 await assert.rejects(vault.list(),/revision identifier/);
 await assert.rejects(vault.save(project('new'),{session:'ok'}),/revision identifier/);
 assert.equal(storage.getItem('rip-marble-midi-history'),corrupted);
});
test('duplicate or unsafe revisions are rejected, deleting one version keeps the rest',()=>{
 const entry=packMidiDraft(project(),100);
 const source={format:MIDI_HISTORY_FORMAT,entries:[
 {id:'a',session:'s',createdAt:100,draft:entry},
 {id:'b',session:'s2',createdAt:100,draft:entry}]};
 assert.equal(summarizeMidiHistory(removeMidiRevision(source,'a')).length,1);
 assert.throws(()=>removeMidiRevision(source,'bad!'),/revision ID/);
 assert.throws(()=>summarizeMidiHistory({...source,entries:[source.entries[0],source.entries[0]]}),/repeated/);
});
