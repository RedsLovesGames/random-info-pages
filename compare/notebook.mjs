/* Safe, versioned Compare Lab notebook round-tripping.
 * Backwards compatible with standalone rip-compare-scenario-v1 baselines.
 * Imported results are validated rather than executed as active adapters. */
import {parseBaseline,safeMetricSummary,SCENARIO_FORMAT} from './repro.mjs';
export const NOTEBOOK_FORMAT='rip-compare-notebook-v1';
export const MAX_NOTEBOOK_BYTES=8*1024*1024;
export const MAX_NOTEBOOK_TRIALS=500;
const validTime=value=>typeof value==='string'&&value.length<=40&&
  Number.isFinite(Date.parse(value));
const validMetricSet=value=>value&&typeof value==='object'&&!Array.isArray(value)&&
 value.left&&typeof value.left==='object'&&!Array.isArray(value.left)&&
 value.right&&typeof value.right==='object'&&!Array.isArray(value.right);
export function normalizeNotebookTrial(trial,index){
 if(!trial||typeof trial!=='object'||!validTime(trial.startedAt)||
   !validTime(trial.endedAt)||!Number.isFinite(trial.elapsedMs)||
   trial.elapsedMs<0||trial.elapsedMs>86400000||
   !validMetricSet(trial.before)||!validMetricSet(trial.after))
  throw new TypeError('Invalid measurements or timestamps in trial '+(index+1)+'.');
 const mode=trial.mode==='fixed-step'?'fixed-step':'timed';
 if(trial.mode!==undefined&&trial.mode!=='fixed-step'&&trial.mode!=='timed')
  throw new TypeError('Invalid trial mode in trial '+(index+1)+'.');
 if(mode==='fixed-step'&&![30,60,120].includes(trial.steps))
  throw new RangeError('Invalid fixed-step count in trial '+(index+1)+'.');
 if(mode==='timed'&&![5,10,15,30].includes(trial.requestedSeconds))
  throw new RangeError('Invalid timed duration in trial '+(index+1)+'.');
 return {
  index:index+1,mode,
  startedAt:new Date(trial.startedAt).toISOString(),
  endedAt:new Date(trial.endedAt).toISOString(),
  elapsedMs:trial.elapsedMs,
  requestedSeconds:mode==='fixed-step'?null:trial.requestedSeconds,
  ...(mode==='fixed-step'?{steps:trial.steps}:{}),
  before:{left:safeMetricSummary(trial.before.left),right:safeMetricSummary(trial.before.right)},
  after:{left:safeMetricSummary(trial.after.left),right:safeMetricSummary(trial.after.right)},
  note:typeof trial.note==='string'?trial.note.slice(0,500):''
 };
}
export function parseTrialNotebook(source){
 if(!source||typeof source!=='object')
  throw new TypeError('Comparison import must be a JSON object.');
 if(JSON.stringify(source).length>MAX_NOTEBOOK_BYTES)
  throw new RangeError('Comparison notebook exceeds the 8 MB import limit.');
 if(source.format===SCENARIO_FORMAT)
  return {baseline:parseBaseline(source),trials:[],legacy:true};
 if(source.format!==NOTEBOOK_FORMAT||!Array.isArray(source.trials)||
   source.trials.length>MAX_NOTEBOOK_TRIALS)
  throw new TypeError('Not a compatible Compare Lab notebook (maximum 500 trials).');
 const baseline=parseBaseline(source.baseline);
 return {baseline,trials:source.trials.map(normalizeNotebookTrial),legacy:false};
}
export function createTrialNotebook(baseline,trials,exportedAt=new Date().toISOString()){
 const source={format:NOTEBOOK_FORMAT,baseline,trials,exportedAt,
  limitations:'Restores configuration and preset, not raw solver cells or frame-locked execution.'};
 const normalized=parseTrialNotebook(source);
 return {...source,baseline:normalized.baseline,trials:normalized.trials};
}
