import test from 'node:test';
import assert from 'node:assert/strict';
import {createZip,crc32,ZIP_MAX_TOTAL_BYTES} from '../dungeon-forge/session-zip.mjs';
const utf8=new TextDecoder();

test('standard CRC32 matches the common validation vector',()=>{
 assert.equal(crc32(new TextEncoder().encode('123456789')),0xcbf43926);
});
test('ZIP contains a valid local header, central directory and end record',async()=>{
 const text='Hello\nWorld';
 const zip=await createZip([
  {name:'gm-room-key.txt',data:text},
  {name:'map.png',data:new Blob([Uint8Array.from([137,80,78,71,0,1,2])],{type:'image/png'})}
 ]);
 assert.equal(zip.type,'application/zip');
 const bytes=new Uint8Array(await zip.arrayBuffer()),view=new DataView(bytes.buffer);
 assert.equal(view.getUint32(0,true),0x04034b50);
 assert.equal(view.getUint16(26,true),'gm-room-key.txt'.length);
 assert.equal(utf8.decode(bytes.subarray(30,45)),'gm-room-key.txt');
 assert.equal(view.getUint32(14,true),crc32(new TextEncoder().encode(text)));
 const firstDataStart=30+'gm-room-key.txt'.length;
 assert.equal(utf8.decode(bytes.subarray(firstDataStart,firstDataStart+text.length)),text);
 const end=view.byteLength-22;
 assert.equal(view.getUint32(end,true),0x06054b50);
 assert.equal(view.getUint16(end+10,true),2);
 const dirOffset=view.getUint32(end+16,true);
 assert.equal(view.getUint32(dirOffset,true),0x02014b50);
 assert.equal(view.getUint32(dirOffset+42,true),0);
 assert.equal(view.getUint16(dirOffset+8,true),0x800,'UTF-8 filename flag');
});
test('ZIP rejects unsafe filenames, duplicates and oversize',async()=>{
 await assert.rejects(()=>createZip([{name:'../escape.txt',data:'a'}]),/filenames/);
 await assert.rejects(()=>createZip([{name:'x',data:'a'},{name:'x',data:'b'}]),/Duplicate/);
 await assert.rejects(()=>createZip([]),/between 1 and 20/);
 assert.equal(ZIP_MAX_TOTAL_BYTES,160*1024*1024);
});
