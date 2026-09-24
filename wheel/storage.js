import {sanitizeState,SCHEMA_VERSION} from './model.js';
const AUTOSAVE_KEY='rip-wheel:autosave:v1', SAVES_KEY='rip-wheel:named-saves:v1';
function encodeUtf8(s){const bytes=new TextEncoder().encode(s);let bin='';for(const b of bytes)bin+=String.fromCharCode(b);return btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function decodeUtf8(s){const b64=s.replace(/-/g,'+').replace(/_/g,'/');const pad=b64+'==='.slice((b64.length+3)%4);const bin=atob(pad);return new TextDecoder().decode(Uint8Array.from(bin,c=>c.charCodeAt(0)))}
export function parseStateJSON(text){let raw;try{raw=JSON.parse(text)}catch{throw new Error('Invalid wheel file')};if(!raw||raw.schemaVersion!==SCHEMA_VERSION)throw new Error('Unsupported wheel format');return sanitizeState(raw)}
export function exportStateJSON(state){return JSON.stringify(sanitizeState(state),null,2)}
export function encodeShareState(state){const json=JSON.stringify(sanitizeState(state));const hash='#wheel='+encodeUtf8(json);return hash.length>8000?{ok:false,reason:'too-large'}:{ok:true,hash}}
export function decodeShareState(hash){const m=String(hash||'').match(/(?:^#|&)wheel=([^&]+)/);if(!m)throw new Error('No wheel share data');try{return parseStateJSON(decodeUtf8(m[1]))}catch(e){throw new Error('Invalid shared wheel',{cause:e})}}
export function createStorageAdapter(storage){
 const safeGet=k=>{try{return storage.getItem(k)}catch{return null}}, safeSet=(k,v)=>{try{storage.setItem(k,v);return true}catch{return false}}, safeRemove=k=>{try{storage.removeItem(k);return true}catch{return false}};
 return {
  saveAutosave:s=>safeSet(AUTOSAVE_KEY,JSON.stringify(sanitizeState(s))),
  loadAutosave:()=>{const v=safeGet(AUTOSAVE_KEY);if(!v)return null;try{return parseStateJSON(v)}catch{return null}},
  listNamed:()=>{const v=safeGet(SAVES_KEY);if(!v)return[];try{return Object.entries(JSON.parse(v)).map(([name,state])=>({name,state:parseStateJSON(JSON.stringify(state))}))}catch{return[]}},
  saveNamed:(name,state)=>{const key=String(name||'').trim();if(!key)return false;const current={};const raw=safeGet(SAVES_KEY);if(raw){try{Object.assign(current,JSON.parse(raw))}catch{}}current[key]=sanitizeState(state);return safeSet(SAVES_KEY,JSON.stringify(current))},
  loadNamed:name=>{const raw=safeGet(SAVES_KEY);if(!raw)return null;try{const all=JSON.parse(raw);return all[name]?parseStateJSON(JSON.stringify(all[name])):null}catch{return null}},
  deleteNamed:name=>{const raw=safeGet(SAVES_KEY);if(!raw)return true;try{const all=JSON.parse(raw);delete all[name];return safeSet(SAVES_KEY,JSON.stringify(all))}catch{return false}},
  clearAutosave:()=>safeRemove(AUTOSAVE_KEY)
 }
}
