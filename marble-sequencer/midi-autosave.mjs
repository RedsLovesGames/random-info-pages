/* Browser-only MIDI draft recovery. IndexedDB handles large projects; localStorage
 * is a fallback when IndexedDB is unavailable. Nothing is sent to a server. */
import {buildMidiWorkspace} from './midi-workspace.mjs';
export const MIDI_DRAFT_FORMAT='rip-marble-midi-draft-v1';
export const MIDI_DRAFT_MAX_BYTES=12*1024*1024;
const DB_NAME='rip-marble-midi-drafts',STORE='snapshots',KEY='rip-marble-midi-latest';
export function packMidiDraft(workspace,now=Date.now()){
 if(!Number.isFinite(now)||now<0)throw new TypeError('Invalid draft timestamp');
 const normalized=buildMidiWorkspace(workspace);
 const draft={format:MIDI_DRAFT_FORMAT,updatedAt:now,workspace:normalized};
 if(new TextEncoder().encode(JSON.stringify(draft)).length>MIDI_DRAFT_MAX_BYTES)
  throw new RangeError('This MIDI project exceeds the 12 MB browser recovery limit. Download editable JSON instead.');
 return draft;
}
export function unpackMidiDraft(value){
 if(!value||value.format!==MIDI_DRAFT_FORMAT||
    !Number.isFinite(value.updatedAt)||value.updatedAt<0)
  throw new TypeError('Stored MIDI recovery data is invalid.');
 return {format:MIDI_DRAFT_FORMAT,updatedAt:value.updatedAt,
   workspace:buildMidiWorkspace(value.workspace)};
}
function openDatabase(indexedDB,dbName){
 return new Promise((resolve,reject)=>{
  let request;
  try{request=indexedDB.open(dbName,1)}catch(error){reject(error);return}
  request.onupgradeneeded=()=>{
   const db=request.result;
   if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE);
  };
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(request.error||new Error('Unable to open browser recovery storage.'));
  request.onblocked=()=>reject(new Error('Browser recovery storage is blocked by another tab.'));
 });
}
async function runIndexedDB(indexedDB,mode,operation,dbName){
 const db=await openDatabase(indexedDB,dbName);
 try{
  return await new Promise((resolve,reject)=>{
   const transaction=db.transaction(STORE,mode),store=transaction.objectStore(STORE);
   let result;
   const request=operation(store);
   request.onsuccess=()=>{result=request.result};
   request.onerror=()=>reject(request.error||new Error('Recovery storage request failed.'));
   transaction.oncomplete=()=>resolve(result);
   transaction.onerror=()=>reject(transaction.error||new Error('Recovery storage transaction failed.'));
   transaction.onabort=()=>reject(transaction.error||new Error('Recovery storage transaction aborted.'));
  });
 }finally{db.close()}
}
export function createMidiDraftStore({indexedDB=globalThis.indexedDB,
 localStorage,dbName=DB_NAME,key=KEY}={}){
 if(localStorage===undefined){
  try{localStorage=globalThis.localStorage}catch{localStorage=null}
 }
 if(typeof dbName!=='string'||!/^rip-[a-z0-9-]{1,70}$/.test(dbName)||
   typeof key!=='string'||!/^[a-z0-9-]{1,40}$/.test(key))
  throw new TypeError('Invalid recovery storage namespace.');
 let queue=Promise.resolve();
 const enqueue=operation=>{
  const pending=queue.catch(()=>{}).then(operation);
  queue=pending.catch(()=>{});return pending;
 };
 const storage=localStorage;
 const fallback={
  read:()=>{const raw=storage?.getItem(key);
    return raw?JSON.parse(raw):null},
  save:draft=>{if(!storage)throw new Error('Persistent browser storage is unavailable.');
    storage.setItem(key,JSON.stringify(draft))},
  clear:()=>storage?.removeItem(key)
 };
 const perform=(op,payload)=>indexedDB
  ?runIndexedDB(indexedDB,op==='read'?'readonly':'readwrite',op==='read'
    ?store=>store.get(key):op==='save'?store=>store.put(payload,key):store=>store.delete(key),dbName)
  :Promise.resolve().then(()=>fallback[op](payload));
 return {
  read:()=>enqueue(async()=>{
   const raw=await perform('read');
   if(raw==null)return null;
   return unpackMidiDraft(raw);
  }),
  save:workspace=>{
   // Snapshot the caller's current object now; a later edit must never leak
   // into a pending write, and writes are serialized to preserve ordering.
   const draft=packMidiDraft(workspace);
   return enqueue(async()=>{await perform('save',draft);return draft});
  },
  clear:()=>enqueue(async()=>{await perform('clear')}),
  backend:indexedDB?'IndexedDB':'localStorage'
 };
}
