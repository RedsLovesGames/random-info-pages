(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ObservedRounds=api;})(typeof self!=='undefined'?self:this,function(){
  'use strict';
  // Entries are intentionally admitted only after an exact round start/end has been manually verified.
  // Map-start VOD links alone are not sufficient evidence for this registry.
  const ROWS=[];
  function validate(r){
    if(r?.sourceClass!=='observed-round')throw new Error('Observed mode only accepts observed-round evidence');
    for(const k of ['id','match','event','date','map','side','team','opponent','sourceMatchUrl','vodUrl','evidenceNotes'])if(!r[k])throw new Error(`observed evidence missing ${k}`);
    if(!Number.isInteger(r.round)||r.round<1)throw new Error('observed evidence missing round');
    if(!Number.isFinite(r.vodStartSeconds)||!Number.isFinite(r.vodEndSeconds)||r.vodEndSeconds<=r.vodStartSeconds)throw new Error('observed evidence missing exact timestamp range');
    if(!/^https:\/\//.test(r.sourceMatchUrl)||!/^https:\/\//.test(r.vodUrl))throw new Error('observed evidence URL invalid');
    return r;
  }
  for(const row of ROWS)validate(row);
  return{all:()=>ROWS.slice(),get:map=>ROWS.filter(r=>r.map===map),validate};
});