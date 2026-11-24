import test from 'node:test';
import assert from 'node:assert/strict';
import {detectStableTones,TONAL_FFT_SIZE} from '../music-microscope/tonal-analysis.mjs';
const rate=12000;
const tone=(f,s=3,amplitude=.3)=>Float32Array.from({length:rate*s},(_,i)=>amplitude*Math.sin(2*Math.PI*f*i/rate));
test('detects narrow stable 60Hz hum candidate within FFT resolution',()=>{
 const values=tone(60);
 const peaks=detectStableTones(values,rate);
 assert.ok(peaks.some(peak=>Math.abs(peak.frequency-60)<3),JSON.stringify(peaks));
 assert.ok(peaks[0].persistence>=.8);
});
test('does not claim silence or short bursts as persistent tonal candidates',()=>{
 assert.deepEqual(detectStableTones(new Float32Array(rate*3),rate),[]);
 assert.deepEqual(detectStableTones(new Float32Array(TONAL_FFT_SIZE),rate),[]);
 const burst=new Float32Array(rate*4);
 for(let i=0;i<5000;i++)burst[i]=.5*Math.sin(2*Math.PI*700*i/rate);
 assert.ok(!detectStableTones(burst,rate).some(p=>Math.abs(p.frequency-700)<3));
});
test('finds two independent stable tones and validates boundaries',()=>{
 const a=tone(50,4),b=tone(920,4,.18);
 const mixed=Float32Array.from(a,(v,i)=>v+b[i]);
 const peaks=detectStableTones(mixed,rate);
 assert.ok(peaks.some(p=>Math.abs(p.frequency-50)<3));
 assert.ok(peaks.some(p=>Math.abs(p.frequency-920)<3));
 assert.throws(()=>detectStableTones([],rate),/Expected local/);
 assert.throws(()=>detectStableTones(mixed,rate,{windows:90}),/bounded/);
});
