import {fighters} from './roster.mjs';
const DB_NAME='stock-fights-assets-v2',STORE='files';
const IMAGE_TYPES=new Set(['image/png','image/jpeg','image/webp','image/avif']);
const SOUND_TYPES=new Set(['audio/mpeg','audio/mp3','audio/wav','audio/x-wav','audio/ogg','audio/webm','audio/mp4']);
const aliases={cactus:['suspiciouscactus'],cowboy:['guywithnoname','noname','gunslinger'],boss:['guyincharge'],henchman:['henchmenguys','henchmen'],pong:['pingpongguy'],rc:['rccarguy'],doctor:['drguy','doctorguy'],time:['timetravelerguy'],business:['businessmanguy'],boxing:['boxerguy'],tired:['sleepyguy']};
export function nameKey(s){return String(s).normalize('NFKD').toLowerCase().replace(/\.[a-z0-9]{2,5}$/,'').replace(/[^a-z0-9]/g,'');}
export function identifyAsset(filename,kind='image'){
 const raw=nameKey(filename);
 const relevant=raw.replace(/(attack|hit|sound|voice|sfx|sprite|stockphoto|stockimage|transparent|backgroundremoved|nobg|photo|image|cutout|idle|original|png|webp|jpg|wav|mp3|ogg|character|source)/g,'');
 const matches=[];
 for(const f of fighters){
   const keys=[f.name,f.id,...(aliases[f.id]||[])].map(nameKey);
   for(const key of keys){
     if(!key||key.length<3)continue;
     // Longest whole identifying token wins; do not map generic "Guy".
     if(raw.includes(key)||relevant.includes(key))matches.push({id:f.id,score:key.length});
   }
 }
 matches.sort((a,b)=>b.score-a.score);
 if(!matches.length)return null;
 if(matches.length>1&&matches[0].score===matches[1].score&&matches[0].id!==matches[1].id)return null;
 return matches[0].id;
}
function openDb(){
 return new Promise((resolve,reject)=>{
   if(!globalThis.indexedDB){reject(new Error('IndexedDB unavailable'));return;}
   const req=indexedDB.open(DB_NAME,1);
   req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE);};
   req.onsuccess=()=>resolve(req.result);
   req.onerror=()=>reject(req.error||new Error('Database failed'));
 });
}
export async function putAsset(id,kind,file){
 if(!fighters.some(f=>f.id===id)||!['image','sound'].includes(kind))throw new Error('Invalid fighter or asset type');
 const db=await openDb();
 try{
   await new Promise((resolve,reject)=>{
     const tx=db.transaction(STORE,'readwrite');
     tx.objectStore(STORE).put(file,kind+':'+id);
     tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('Write aborted'));
   });
 }finally{db.close();}
}
export async function deleteAsset(id,kind){
 const db=await openDb();
 try{await new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(kind+':'+id);
    tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
 });}finally{db.close();}
}
export async function readAssets(){
 const db=await openDb();
 try{return await new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,'readonly'),store=tx.objectStore(STORE);
  const keys=store.getAllKeys(),values=store.getAll();
  tx.oncomplete=()=>{
    const out={image:{},sound:{}};
    keys.result.forEach((k,i)=>{const [type,id]=String(k).split(':');if(out[type])out[type][id]=values.result[i];});
    resolve(out);
  };
  tx.onerror=()=>reject(tx.error);
 });}finally{db.close();}
}
export function fileKind(file){
 if(IMAGE_TYPES.has(file.type)||/\.(png|jpe?g|webp|avif)$/i.test(file.name))return 'image';
 if(SOUND_TYPES.has(file.type)||/\.(mp3|wav|ogg|webm|m4a)$/i.test(file.name))return 'sound';
 return null;
}
export async function importFiles(files,onProgress=()=>{}){
 const result={images:0,sounds:0,unmatched:[],failed:[]};
 for(const file of Array.from(files)){
   const kind=fileKind(file);
   const id=kind?identifyAsset(file.name,kind):null;
   if(!kind||!id){result.unmatched.push(file.name);onProgress(result);continue;}
   if(file.size>20*1024*1024){result.failed.push(file.name+': over 20 MB');onProgress(result);continue;}
   try{await putAsset(id,kind,file);result[kind==='image'?'images':'sounds']++;}
   catch(e){result.failed.push(file.name+': '+String(e.message||e));}
   onProgress(result);
 }
 return result;
}
