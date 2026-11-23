import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { encodeWavRegion } from '../music-microscope/export.mjs';
import { exportPatternMidi } from '../marble-sequencer/export-midi.mjs';
import { decodeMidi } from '../marble-sequencer/music.mjs';

const read = file => readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('selected-region PCM16 WAV has correct header, length, and channel samples',async()=>{
  const first=new Float32Array([0,.5,-.5,1,-1,0]);
  const second=new Float32Array([0,-.5,.5,-1,1,0]);
  const sampleRate=8000;
  const fake={sampleRate,length:first.length,numberOfChannels:2,duration:first.length/sampleRate,
    getChannelData:i=>i?second:first};
  const blob=encodeWavRegion(fake,1/sampleRate,5/sampleRate);
  assert.equal(blob.type,'audio/wav');
  assert.equal(blob.size,44+4*2*2);
  const bytes=await blob.arrayBuffer(),view=new DataView(bytes);
  const ascii=(start,count)=>String.fromCharCode(...new Uint8Array(bytes,start,count));
  assert.equal(ascii(0,4),'RIFF');
  assert.equal(ascii(8,4),'WAVE');
  assert.equal(ascii(36,4),'data');
  assert.equal(view.getUint16(22,true),2);
  assert.equal(view.getUint32(24,true),8000);
  assert.equal(view.getUint32(40,true),16);
  assert.equal(view.getInt16(44,true),16384);
  assert.equal(view.getInt16(46,true),-16384);
});
test('WAV exporter rejects missing audio and invalid ranges',()=>{
  assert.throws(()=>encodeWavRegion(null));
  const b={sampleRate:44100,length:44100,numberOfChannels:1,duration:1,
    getChannelData:()=>new Float32Array(44100)};
  assert.throws(()=>encodeWavRegion(b,1,0));
  assert.throws(()=>encodeWavRegion(b,.5,.5));
});
test('marble pattern exports playable standards-compliant MIDI',()=>{
  const pattern={bpm:120,rows:[0x0101,0,0,0x10,0,0,0,0]};
  const bytes=exportPatternMidi(pattern);
  assert.equal(String.fromCharCode(...bytes.subarray(0,4)),'MThd');
  assert.equal(String.fromCharCode(...bytes.subarray(14,18)),'MTrk');
  const parsed=decodeMidi(bytes);
  assert.equal(parsed.events.length,3);
  assert.ok(parsed.events.some(note=>note.channel===9&&note.note===36));
  assert.ok(parsed.events.some(note=>note.channel===0&&note.note===60));
  assert.ok(parsed.duration>1);
});
test('invalid pattern data cannot produce a MIDI file',()=>{
  assert.throws(()=>exportPatternMidi({bpm:0,rows:Array(8).fill(0)}));
  assert.throws(()=>exportPatternMidi({bpm:120,rows:[0xff]}));
});
test('music handoff, MIDI export and undo actions are wired to visible controls',()=>{
  const microscope=read('music-microscope/index.html');
  const music=read('music-microscope/app.js');
  const sequencer=read('marble-sequencer/index.html');
  const marble=read('marble-sequencer/app.mjs');
  for(const id of ['exportWav','sendMarble','audioExchangeStatus'])assert.match(microscope,new RegExp('id="'+id+'"'));
  for(const id of ['undo-loop','redo-loop','random-loop','export-midi'])assert.match(sequencer,new RegExp('id="'+id+'"'));
  assert.match(music,/sendAudioToMarble\(sourceAudioFile\)/);
  assert.match(music,/encodeWavRegion\(currentBuffer,start,end\)/);
  assert.match(marble,/receiveMarbleAudio\(\)/);
  assert.match(marble,/exportPatternMidi\(pattern\)/);
  assert.match(marble,/window\.RIPStudio/);
});
test('existing complex editors expose guarded reusable workspace adapters',()=>{
  const dungeon=read('dungeon-forge/battlemap.mjs');
  const card=read('id-card-maker/app.mjs');
  const algorithms=read('algorithm-arena/app.js');
  const html=read('algorithm-arena/index.html');
  for(const source of [dungeon,card,algorithms]){
    assert.match(source,/window\.RIPStudio/);
    assert.match(source,/getState\(/);
    assert.match(source,/setState\(/);
    assert.match(source,/capture\(/);
  }
  assert.match(dungeon,/decodeProject\(JSON\.stringify\(state\)\)/);
  assert.match(card,/validateProject\(state\)/);
  assert.match(html,/id="arraySeed"/);
  assert.match(html,/id="exportSortCsv"/);
  assert.match(algorithms,/function exportSortCsv\(/);
});
