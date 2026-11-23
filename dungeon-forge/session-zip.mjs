/* Portable uncompressed ZIP writer for local-only tabletop session packs.
 * PNG already uses DEFLATE; storing it avoids recompression and dependencies. */
const encoder=new TextEncoder();
export const ZIP_MAX_ENTRY_BYTES=80*1024*1024;
export const ZIP_MAX_TOTAL_BYTES=160*1024*1024;
const uint32=(view,offset,value)=>view.setUint32(offset,value,true);
const uint16=(view,offset,value)=>view.setUint16(offset,value,true);
const crcTable=(()=>{const table=new Uint32Array(256);
 for(let i=0;i<256;i++){
  let c=i;
  for(let j=0;j<8;j++)c=c&1?0xedb88320^(c>>>1):c>>>1;
  table[i]=c>>>0;
 }
 return table;
})();
export function crc32(bytes){
 let crc=0xffffffff;
 for(const byte of bytes)crc=crcTable[(crc^byte)&255]^(crc>>>8);
 return (crc^0xffffffff)>>>0;
}
function validateName(name){
 if(typeof name!=='string'||name.length>120||!name||
    !/^[a-zA-Z0-9_.-]+$/.test(name)||name==='.'||name==='..')
  throw new Error('ZIP filenames must contain letters, numbers, dots, underscores, or dashes.');
 return encoder.encode(name);
}
async function toBytes(content){
 if(typeof content==='string')return encoder.encode(content);
 if(content instanceof Uint8Array)return content;
 if(content instanceof Blob)return new Uint8Array(await content.arrayBuffer());
 throw new TypeError('ZIP contents must be text, bytes or Blob');
}
function header(bytes,signature){const v=new DataView(bytes.buffer);uint32(v,0,signature);return v}
export async function createZip(entries){
 if(!Array.isArray(entries)||entries.length<1||entries.length>20)
  throw new RangeError('Choose between 1 and 20 session files.');
 const names=new Set(),locals=[],centrals=[];
 let offset=0,total=0;
 for(const entry of entries){
  const name=validateName(entry?.name);
  if(names.has(entry.name))throw new Error('Duplicate ZIP filename: '+entry.name);
  names.add(entry.name);
  const contents=await toBytes(entry.data);
  if(contents.length>ZIP_MAX_ENTRY_BYTES)throw new RangeError('A file exceeds the 80 MB ZIP limit.');
  total+=contents.length;
  if(total>ZIP_MAX_TOTAL_BYTES)throw new RangeError('The session package exceeds 160 MB.');
  const checksum=crc32(contents);
  const local=new Uint8Array(30+name.length),lv=header(local,0x04034b50);
  uint16(lv,4,20);uint16(lv,6,0x0800);uint16(lv,8,0);
  uint32(lv,14,checksum);uint32(lv,18,contents.length);uint32(lv,22,contents.length);
  uint16(lv,26,name.length);
  local.set(name,30);
  const central=new Uint8Array(46+name.length),cv=header(central,0x02014b50);
  uint16(cv,4,20);uint16(cv,6,20);uint16(cv,8,0x0800);uint16(cv,10,0);
  uint32(cv,16,checksum);uint32(cv,20,contents.length);uint32(cv,24,contents.length);
  uint16(cv,28,name.length);uint32(cv,42,offset);
  central.set(name,46);
  locals.push(local,contents);centrals.push(central);
  offset+=local.length+contents.length;
 }
 const centralStart=offset;
 for(const item of centrals)offset+=item.length;
 const end=new Uint8Array(22),view=header(end,0x06054b50);
 uint16(view,8,entries.length);uint16(view,10,entries.length);
 uint32(view,12,offset-centralStart);uint32(view,16,centralStart);
 return new Blob([...locals,...centrals,end],{type:'application/zip'});
}
