import {filterNotchPCM} from './notch.mjs';
self.addEventListener('message',event=>{
 const {id,channels,sampleRate,config,warmup}=event.data||{};
 try{
  const parsed=channels.map(buffer=>new Float32Array(buffer));
  const result=filterNotchPCM(parsed,sampleRate,config,{warmup});
  self.postMessage({id,channels:result.channels.map(samples=>samples.buffer),
   sampleRate:result.sampleRate,length:result.length},
   result.channels.map(samples=>samples.buffer));
 }catch(error){
  self.postMessage({id,error:error?.message||'Unable to process audio.'});
 }
});
