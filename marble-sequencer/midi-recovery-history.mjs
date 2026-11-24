/* Bounded, versioned MIDI recovery. Keeps the original v1 draft intact
 * until a versioned history has been successfully persisted. */
import {packMidiDraft,unpackMidiDraft} from './midi-autosave.mjs';
export const MIDI_HISTORY_FORMAT='rip-marble-midi-history-v1';
export const MIDI_HISTORY_LIMIT=8;
export const MIDI_HISTORY_INTERVAL_MS=90000;
const DB='rip-marble-midi-drafts',STORE='snapshots';
const LEGACY_KEY='rip-marble-midi-latest',HISTORY_KEY='rip-marble-midi-history';
const safeId=value=>typeof value==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(value);
function validated(value){
 if(!value||value.format!==MIDI_HISTORY_FORMAT||!Array.isArray(value.entries)||
   value.entries.length>MIDI_HISTORY_LIMIT)
  throw new TypeError('Invalid MIDI recovery history format.');
 const ids=new Set();
 const entries=value.entries.map(entry=>{
  if(!entry||!safeId(entry.id)||!safeId(entry.session)||ids.has(entry.id))
   throw new TypeError('Invalid or repeated recovery revision identifier.');
  ids.add(entry.id);
  const draft=unpackMidiDraft(entry.draft);
  const createdAt=entry.createdAt??draft.updatedAt;
  if(!Number.isFinite(createdAt)||createdAt<0||createdAt>draft.updatedAt)
   throw new TypeError('Invalid recovery revision creation time.');
  if(entry.pinned!==undefined&&typeof entry.pinned!=='boolean')
   throw new TypeError('Invalid manual checkpoint marker.');
  return {id:entry.id,session:entry.session,createdAt,pinned:Boolean(entry.pinned),draft};
 });
 return {format:MIDI_HISTORY_FORMAT,entries};
}
const empty=()=>({format:MIDI_HISTORY_FORMAT,entries:[]});
const migrate=legacy=>legacy?{
 format:MIDI_HISTORY_FORMAT,entries:[{
  id:'legacy',session:'legacy',createdAt:unpackMidiDraft(legacy).updatedAt,
  draft:unpackMidiDraft(legacy)
 }]
}:empty();
const revisionId=(history,now)=>{
 let next=0,id;
 do{id='r'+Math.floor(now).toString(36)+'_'+next++}
 while(history.entries.some(entry=>entry.id===id));
 return id;
};
export function appendMidiRevision(input,draft,session,{checkpoint=false}={}){
 if(!safeId(session))throw new TypeError('Invalid MIDI editing session.');
 const history=validated(input),snapshot=unpackMidiDraft(draft);
 const entries=[...history.entries];
 const latest=entries[0];
 const withinWindow=latest&&latest.session===session&&
  snapshot.updatedAt>=latest.draft.updatedAt&&
  snapshot.updatedAt-latest.createdAt<MIDI_HISTORY_INTERVAL_MS&&!latest.pinned;
 if(withinWindow&&!checkpoint)
  entries[0]={...latest,draft:snapshot};
 else entries.unshift({id:revisionId(history,snapshot.updatedAt),session,
  createdAt:snapshot.updatedAt,pinned:Boolean(checkpoint),draft:snapshot});
 return {format:MIDI_HISTORY_FORMAT,entries:entries.slice(0,MIDI_HISTORY_LIMIT)};
}
export function summarizeMidiHistory(value){
 const history=validated(value);
 return history.entries.map(entry=>({
  id:entry.id,session:entry.session,updatedAt:entry.draft.updatedAt,
  name:entry.draft.workspace.name,pinned:entry.pinned,
  notes:entry.draft.workspace.events.length
 }));
}
export function removeMidiRevision(value,id){
 if(!safeId(id))throw new TypeError('Invalid recovery revision ID.');
 const history=validated(value);
 return {...history,entries:history.entries.filter(entry=>entry.id!==id)};
}
function openDB(idb,dbName){
 return new Promise((resolve,reject)=>{
  let request;
  try{request=idb.open(dbName,1)}catch(error){reject(error);return}
  request.onupgradeneeded=()=>{
   if(!request.result.objectStoreNames.contains(STORE))
    request.result.createObjectStore(STORE);
  };
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(request.error||new Error('Recovery database could not open.'));
  request.onblocked=()=>reject(new Error('Recovery database is blocked by another tab.'));
 });
}
async function transaction(idb,dbName,mode,action){
 const db=await openDB(idb,dbName);
 try{return await new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,mode),store=tx.objectStore(STORE);
  const values=[];
  const request=action(store);
  for(const item of (Array.isArray(request)?request:[request])){
   if(!item)continue;
   const index=values.length;values.push(undefined);
   item.onsuccess=()=>{values[index]=item.result};
   item.onerror=()=>reject(item.error||new Error('Recovery storage operation failed.'));
  }
  tx.oncomplete=()=>resolve(values.length<=1?values[0]:values);
  tx.onerror=()=>reject(tx.error||new Error('Recovery transaction failed.'));
  tx.onabort=()=>reject(tx.error||new Error('Recovery transaction aborted.'));
 })}finally{db.close()}
}
export function createMidiRecoveryVault({indexedDB=globalThis.indexedDB,localStorage,
 dbName=DB,historyKey=HISTORY_KEY,legacyKey=LEGACY_KEY,now=()=>Date.now()}={}){
 if(localStorage===undefined){
  try{localStorage=globalThis.localStorage}catch{localStorage=null}
 }
 if(!/^rip-[a-z0-9-]{1,70}$/.test(dbName)||
  !/^rip-[a-z0-9-]{1,70}$/.test(historyKey)||
  !/^rip-[a-z0-9-]{1,70}$/.test(legacyKey))
  throw new TypeError('Invalid MIDI recovery storage namespace.');
 let queue=Promise.resolve();
 const enqueue=action=>{
  const result=queue.catch(()=>{}).then(action);
  queue=result.catch(()=>{});return result;
 };
 const readRaw=key=>indexedDB
  ?transaction(indexedDB,dbName,'readonly',store=>store.get(key))
  :Promise.resolve().then(()=>{
   const value=localStorage?.getItem(key);
   return value?JSON.parse(value):null;
  });
 const saveHistory=history=>indexedDB
  ?transaction(indexedDB,dbName,'readwrite',store=>[
    store.put(history,historyKey),store.delete(legacyKey)])
  :Promise.resolve().then(()=>{
   if(!localStorage)throw new Error('Persistent browser storage unavailable.');
   // Write first: a quota failure must preserve the last healthy backup.
   localStorage.setItem(historyKey,JSON.stringify(history));
   localStorage.removeItem(legacyKey);
  });
 const loadHistory=async()=>{
  const modern=await readRaw(historyKey);
  if(modern!=null)return validated(modern);
  return migrate(await readRaw(legacyKey));
 };
 const metadata=()=>enqueue(async()=>summarizeMidiHistory(await loadHistory()));
 return {
  backend:indexedDB?'IndexedDB':'localStorage',
  list:metadata,
  read:()=>enqueue(async()=>{const h=await loadHistory();return h.entries[0]?.draft??null}),
  load:id=>enqueue(async()=>{
   if(!safeId(id))throw new TypeError('Invalid revision ID.');
   const h=await loadHistory(),found=h.entries.find(item=>item.id===id);
   if(!found)throw new Error('The recovery version no longer exists.');
   return found.draft;
  }),
  save:(workspace,{session='default',checkpoint=false}={})=>{
   // Validate and copy immediately. Queued edits keep their original contents.
   const draft=packMidiDraft(workspace,now());
   return enqueue(async()=>{
    const updated=appendMidiRevision(await loadHistory(),draft,session,{checkpoint});
    await saveHistory(updated);
    return {draft,revision:updated.entries[0].id,versions:updated.entries.length};
   });
  },
  discard:id=>enqueue(async()=>{
   const before=await loadHistory();
   if(!before.entries.some(item=>item.id===id))throw new Error('Recovery version not found.');
   const after=removeMidiRevision(before,id);
   await saveHistory(after);
   return summarizeMidiHistory(after);
  }),
  clear:()=>enqueue(async()=>{
   await saveHistory(empty());
  })
 };
}
