/* Hysteresis-based quality governor for the CPU fluid simulation.
 * Samples solver updates per second, never estimates GPU memory or device speed. */
export const LEVELS=Object.freeze(['eco','balanced','high','ultra','cinematic','extreme','studio']);
export const ADAPTIVE_THRESHOLDS=Object.freeze({
  slowFps:23,fastFps:28.5,slowSamples:4,fastSamples:10,cooldownMs:8000
});
export function createAdaptiveController(options={}){
 const t={...ADAPTIVE_THRESHOLDS,...options};
 if(!(t.fastFps>t.slowFps)||t.slowSamples<1||t.fastSamples<1||t.cooldownMs<0)
  throw new RangeError('Invalid adaptive quality configuration');
 let slow=0,fast=0,lastChange=-Infinity;
 const reset=(time=-Infinity)=>{slow=fast=0;lastChange=time};
 function observe(fps,now,current,ceiling){
  if(!Number.isFinite(fps)||fps<=0||!Number.isFinite(now))return null;
  const index=LEVELS.indexOf(current),limit=LEVELS.indexOf(ceiling);
  if(index<0||limit<0)return null;
  if(now-lastChange<t.cooldownMs)return null;
  slow=fps<t.slowFps?slow+1:0;
  fast=fps>t.fastFps?fast+1:0;
  if(slow>=t.slowSamples&&index>0){
   reset(now);
   return LEVELS[index-1];
  }
  if(fast>=t.fastSamples&&index<limit){
   reset(now);
   return LEVELS[index+1];
  }
  return null;
 }
 return {observe,reset};
}
