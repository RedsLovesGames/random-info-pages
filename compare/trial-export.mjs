/* Compact, spreadsheet-friendly local trial export. No server or telemetry. */
import {safeMetricSummary} from './repro.mjs';
export function trialHashComparison(trial){
 const a=trial?.after?.left?.stateHash,b=trial?.after?.right?.stateHash;
 if(typeof a!=='string'||typeof b!=='string'||!a||!b)return 'unavailable';
 return a===b?'matching':'different';
}
function cell(value){
 if(value==null)return '';
 const scalar=typeof value==='number'||typeof value==='boolean'?String(value):String(value);
 // Prevent spreadsheet formula injection in externally supplied strings.
 const safe=typeof value==='string'&&/^[=+@\-\t\r]/.test(scalar)?"'"+scalar:scalar;
 return '"'+safe.replace(/"/g,'""')+'"';
}
export function exportTrialCsv(baseline,trials){
 if(!baseline||typeof baseline.left!=='string'||typeof baseline.right!=='string'||
    !Array.isArray(trials)||trials.length>1000)
  throw new RangeError('Invalid or oversized trial notebook.');
 const metrics=new Set();
 for(const trial of trials){
  for(const stage of ['before','after'])for(const side of ['left','right']){
   const data=safeMetricSummary(trial?.[stage]?.[side]);
   for(const key of Object.keys(data))metrics.add(key);
  }
 }
 const names=[...metrics].sort();
 const headers=['trial','mode','left_project','right_project','started_at','ended_at',
  'elapsed_ms','requested_s','fixed_steps','state_hashes',...['left','right'].flatMap(side=>
   ['before','after'].flatMap(stage=>names.map(name=>side+'_'+stage+'_'+name)))];
 const lines=[headers.map(cell).join(',')];
 for(let i=0;i<trials.length;i++){
  const t=trials[i]||{};
  const cells=[t.index||i+1,t.mode||'timed',baseline.left,baseline.right,
   t.startedAt,t.endedAt,t.elapsedMs,t.requestedSeconds,t.steps,trialHashComparison(t)];
  for(const side of ['left','right'])for(const stage of ['before','after']){
   const values=safeMetricSummary(t?.[stage]?.[side]);
   for(const name of names)cells.push(values[name]??null);
  }
  lines.push(cells.map(cell).join(','));
 }
 return '\ufeff'+lines.join('\r\n')+'\r\n';
}
