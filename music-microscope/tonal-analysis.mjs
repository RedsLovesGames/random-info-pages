/* Identify narrow, persistent spectral lines. These are tone candidates,
 * not proof of unwanted noise. Operates only on a bounded analysis copy. */
import {fftMagnitudes} from './analysis.mjs';
export const TONAL_FFT_SIZE=8192;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function detectStableTones(samples,sampleRate,{windows=5,maxCandidates=6}={}){
 if(!(samples instanceof Float32Array)||!Number.isFinite(sampleRate)||sampleRate<=0)
  throw new TypeError('Expected local mono samples and their sample rate');
 if(!Number.isInteger(windows)||windows<3||windows>8||
    !Number.isInteger(maxCandidates)||maxCandidates<1||maxCandidates>12)
  throw new RangeError('Invalid bounded analysis settings');
 if(samples.length<TONAL_FFT_SIZE*2)return [];
 const spacing=sampleRate/TONAL_FFT_SIZE,low=Math.max(1,Math.ceil(40/spacing)),
  high=Math.min(Math.floor(5000/spacing),Math.floor(TONAL_FFT_SIZE*.48));
 const peaks=[];
 for(let frame=0;frame<windows;frame++){
  const start=Math.floor((samples.length-TONAL_FFT_SIZE)*(frame+.5)/windows);
  const magnitudes=fftMagnitudes(samples,start,TONAL_FFT_SIZE);
  const detected=[];
  for(let bin=low;bin<high;bin++){
   const value=magnitudes[bin];
   if(value<.0007||value<=magnitudes[bin-1]||value<magnitudes[bin+1])continue;
   const left=magnitudes[Math.max(low,bin-6)],right=magnitudes[Math.min(high,bin+6)];
   const nearby=Math.max(left,right,.00005);
   const prominence=value/nearby;
   if(prominence<2.5)continue;
   detected.push({bin,value,prominence});
  }
  detected.sort((a,b)=>b.value*b.prominence-a.value*a.prominence);
  peaks.push(detected.slice(0,32));
 }
 const groups=[];
 for(const frame of peaks)for(const peak of frame){
  let group=groups.find(group=>Math.abs(group.bin-peak.bin)<=1.5);
  if(!group){group={bin:peak.bin,hits:[],frames:new Set()};groups.push(group)}
 }
 for(let k=0;k<peaks.length;k++)for(const peak of peaks[k]){
  const candidates=groups.filter(group=>Math.abs(group.bin-peak.bin)<=1.5);
  if(!candidates.length)continue;
  const group=candidates.reduce((a,b)=>Math.abs(a.bin-peak.bin)<Math.abs(b.bin-peak.bin)?a:b);
  if(group.frames.has(k))continue;
  group.frames.add(k);group.hits.push(peak);
 }
 return groups.filter(g=>g.frames.size>=Math.ceil(windows*.8))
  .map(group=>{
   const frequency=group.hits.reduce((sum,p)=>sum+p.bin*spacing,0)/group.hits.length;
   const prominence=group.hits.reduce((sum,p)=>sum+p.prominence,0)/group.hits.length;
   const amplitude=group.hits.reduce((sum,p)=>sum+p.value,0)/group.hits.length;
   return {frequency:Math.round(frequency*10)/10,
    persistence:group.frames.size/windows,
    prominence:Math.round(prominence*10)/10,
    amplitude:Math.round(amplitude*10000)/10000};
  })
  .filter(candidate=>candidate.frequency>=40&&candidate.frequency<=5000)
  .sort((a,b)=>b.persistence-a.persistence||
    b.amplitude*b.prominence-a.amplitude*a.prominence)
  .slice(0,maxCandidates);
}
