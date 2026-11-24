/* Reusable configuration baselines and timed, non-frame-locked comparisons. */
export const SCENARIO_FORMAT='rip-compare-scenario-v1';
export const MAX_BASELINE_BYTES=2*1024*1024;
const allowedDuration=new Set([5,10,15,30]);
export function createBaseline({left,right,states,duration=10}){
 if(typeof left!=='string'||!left||typeof right!=='string'||!right||
    !states||typeof states!=='object'||!('left' in states)||!('right' in states)||
    !allowedDuration.has(duration))throw new TypeError('Invalid comparison baseline.');
 const clean=JSON.parse(JSON.stringify({
  format:SCENARIO_FORMAT,left,right,duration,states
 }));
 if(JSON.stringify(clean).length>MAX_BASELINE_BYTES)
  throw new RangeError('Comparison baseline is over 2 MB.');
 return clean;
}
export function parseBaseline(data){
 if(!data||data.format!==SCENARIO_FORMAT)
  throw new Error('Not a compatible comparison baseline.');
 return createBaseline(data);
}
export function recordTrial(baseline,{before,after,startedAt,endedAt}){
 const scenario=parseBaseline(baseline);
 if(!Number.isFinite(startedAt)||!Number.isFinite(endedAt)||endedAt<startedAt||
    !before||!after)throw new TypeError('Invalid timed trial measurements.');
 return {
  index:0,
  startedAt:new Date(startedAt).toISOString(),
  endedAt:new Date(endedAt).toISOString(),
  elapsedMs:endedAt-startedAt,
  requestedSeconds:scenario.duration,
  before:JSON.parse(JSON.stringify(before)),
  after:JSON.parse(JSON.stringify(after)),
  note:'Each application maintains its own clock. Fluid settings restore presets, not raw solver cells; measured outcomes are not guaranteed deterministic.'
 };
}
export function safeMetricSummary(values){
 if(!values||typeof values!=='object')return {};
 const result={};
 for(const [key,value] of Object.entries(values)){
  if(Object.keys(result).length>=20)break;
  if(typeof key!=='string'||key.length>40)continue;
  if(typeof value==='number'&&Number.isFinite(value))result[key]=value;
  else if(typeof value==='string')result[key]=value.slice(0,100);
  else if(typeof value==='boolean')result[key]=value;
 }
 return result;
}
