/* Explicit, local-only audio handoff between opt-in projects. Never uploads files. */
const NAME='rip-project-handoff-v1',STORE='pending',KEY='audio',TTL=86400000;
export const MAX_HANDOFF_BYTES=50*1024*1024;
function openDB(){
 return new Promise((resolve,reject)=>{
  if(!('indexedDB' in globalThis))return reject(new Error('Local handoff unavailable'));
  const req=indexedDB.open(NAME,1);
  req.onupgradeneeded=()=>req.result.createObjectStore(STORE);
  req.onsuccess=()=>resolve(req.result);
  req.onerror=()=>reject(req.error||new Error('Could not open local storage'));
  req.onblocked=()=>reject(new Error('A browser tab blocked local storage'));
 });
}
function request(db,mode,fn){
 return new Promise((resolve,reject)=>{
  const transaction=db.transaction(STORE,mode);
  const operation=fn(transaction.objectStore(STORE));
  let output;
  operation.onsuccess=()=>{output=operation.result};
  operation.onerror=()=>reject(operation.error||new Error('Handoff failed'));
  transaction.oncomplete=()=>resolve(output);
  transaction.onerror=()=>reject(transaction.error||new Error('Handoff transaction failed'));
 });
}
export async function sendAudioToMarble(file){
 if(!(file instanceof Blob)||!file.size)throw new TypeError('Choose a non-empty audio recording');
 if(file.size>MAX_HANDOFF_BYTES)throw new RangeError('Audio handoff limit: 50 MB');
 const db=await openDB();
 try{await request(db,'readwrite',store=>store.put({
  version:1,destination:'marble-sequencer',source:'music-microscope',
  created:Date.now(),name:file.name||'recording.wav',type:file.type||'',file
 },KEY));}finally{db.close()}
}
export async function receiveMarbleAudio(){
 const db=await openDB();
 try{
  const item=await request(db,'readonly',store=>store.get(KEY));
  if(!item)return null;
  await request(db,'readwrite',store=>store.delete(KEY));
  if(item.version!==1||item.destination!=='marble-sequencer'||!item.created||
    Date.now()-item.created>TTL||item.created>Date.now()+60000||
    !(item.file instanceof Blob)||item.file.size>MAX_HANDOFF_BYTES)return null;
  return new File([item.file],item.name,{type:item.type,lastModified:item.created});
 }finally{db.close()}
}
