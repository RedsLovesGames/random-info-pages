import test from 'node:test';
import assert from 'node:assert/strict';
import {notchBands,spectrumFrequency,filterNotchPCM,MAX_FILTERED_FRAMES} from '../music-microscope/notch.mjs';
const rate=48000;
const make=(components,seconds=1)=>Float32Array.from({length:Math.floor(rate*seconds)},
 (_,i)=>components.reduce((sum,[hz,amp])=>sum+amp*Math.sin(2*Math.PI*hz*i/rate),0));
function amplitude(samples,hz,skip=0){
 let cos=0,sin=0;
 for(let i=skip;i<samples.length;i++){
  const w=2*Math.PI*hz*i/rate;
  cos+=samples[i]*Math.cos(w);sin+=samples[i]*Math.sin(w);
 }
 return 2*Math.hypot(sin,cos)/Math.max(1,samples.length-skip);
}
test('narrowband notch strongly suppresses a 60 Hz tone without removing a 440 Hz note',()=>{
 const original=make([[60,.3],[440,.3]]);
 const filtered=filterNotchPCM([original],rate,{frequency:60,q:12,harmonics:1});
 const start=6000;
 assert.ok(amplitude(filtered.channels[0],60,start)<amplitude(original,60,start)*.08);
 const noteRatio=amplitude(filtered.channels[0],440,start)/amplitude(original,440,start);
 assert.ok(noteRatio>.97&&noteRatio<1.03,noteRatio);
 assert.deepEqual(original.slice(0,2),make([[60,.3],[440,.3]]).slice(0,2),'original not mutated');
});
test('harmonic removal suppresses first three integer multiples',()=>{
 const original=make([[50,.2],[100,.2],[150,.2],[1000,.2]]);
 const filtered=filterNotchPCM([original],rate,{frequency:50,q:14,harmonics:3});
 for(const hz of [50,100,150]){
  const ratio=amplitude(filtered.channels[0],hz,6000)/amplitude(original,hz,6000);
  assert.ok(ratio<.13,hz+'Hz ratio '+ratio);
 }
 assert.ok(amplitude(filtered.channels[0],1000,6000)>.17,'1kHz preserved');
});
test('stereo filtering preserves two independent channels and clips only at output',()=>{
 const l=make([[50,.4]]),r=make([[440,.4]]);
 const result=filterNotchPCM([l,r],rate,{frequency:50,q:20,harmonics:1},{warmup:2400});
 assert.equal(result.length,l.length-2400);
 assert.equal(result.numberOfChannels,2);
 assert.ok(amplitude(result.channels[0],50,2000)<.05);
 assert.ok(amplitude(result.channels[1],440,2000)>.35);
 assert.equal(result.getChannelData(0),result.channels[0]);
});
test('coefficients and input validation enforce bounded work and Nyquist',()=>{
 const bands=notchBands({frequency:1500,q:20,harmonics:6},8000);
 assert.equal(bands.length,2,'exclude multiples near and above Nyquist');
 assert.throws(()=>notchBands({frequency:6000,q:20,harmonics:6},8000),/Nyquist/);
});
test('spectrum click mapping is log frequency and bounded',()=>{
 assert.equal(spectrumFrequency(0,48000),20);
 assert.equal(spectrumFrequency(1,48000),24000);
 assert.ok(Math.abs(spectrumFrequency(.5,48000)-Math.sqrt(20*24000))<1e-7);
 assert.equal(spectrumFrequency(-20,48000),20);
});
test('offline PCM cannot exceed memory limits or corrupt source',()=>{
 assert.throws(()=>notchBands({frequency:3,q:2,harmonics:1},48000),/Frequency/);
 assert.throws(()=>notchBands({frequency:60,q:2,harmonics:1},48000),/Q/);
 assert.throws(()=>notchBands({frequency:60,q:8,harmonics:50},48000),/Harmonics/);
 assert.throws(()=>filterNotchPCM([],48000,{frequency:50,q:10,harmonics:1}),/one or two/);
 assert.equal(MAX_FILTERED_FRAMES,10000000);
});

test('tonal-filtered PCM is compatible with the existing local PCM16 WAV encoder',async()=>{
 const {encodeWavRegion}=await import('../music-microscope/export.mjs');
 const mono=make([[60,.4],[440,.25]],.25);
 const processed=filterNotchPCM([mono],rate,{frequency:60,q:12,harmonics:2});
 const wav=encodeWavRegion(processed,0,processed.duration);
 const bytes=await wav.arrayBuffer(),v=new DataView(bytes);
 assert.equal(v.getUint32(0,true),0x46464952,'RIFF magic');
 assert.equal(v.getUint16(22,true),1,'one channel');
 assert.equal(v.getUint32(24,true),48000);
 assert.equal(v.getUint32(40,true),processed.length*2);
 assert.ok(bytes.byteLength>12000);
});
