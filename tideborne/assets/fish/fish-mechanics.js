(()=>{
'use strict';
const CURRENT_TIDEBORNE_REVISION='eee0cb429921803cf2f81b2b43b76f4fed9cad4f';
const RAW_MIN=50,RAW_MAX=925,SCORE_MIN=1,SCORE_MAX=3000;
const SPECIES_POINTS={1:50,2:100,3:175,4:250,5:350};
const MAX_TRAIT_AND_PERCENTILE_POINTS=575;
const BODY_MIN=0.60,BODY_MAX=1.30;

function javaRound(value){return Math.floor(value+0.5);}
function normalize(raw){
  const normalized=(raw-RAW_MIN)/(RAW_MAX-RAW_MIN);
  return Math.max(SCORE_MIN,Math.min(SCORE_MAX,javaRound(SCORE_MIN+(SCORE_MAX-SCORE_MIN)*normalized)));
}
function scoreRange(record){
  const stars=Math.max(1,Math.min(5,Number(record?.stars)||1));
  const base=SPECIES_POINTS[stars];
  return {min:normalize(base),max:normalize(base+MAX_TRAIT_AND_PERCENTILE_POINTS),stars};
}
function traitSizeRange(api,record){
  const base=api.normalSize(record);
  if(base.min===null&&base.max===null)return {min:null,max:null};
  return {min:base.min===null?null:base.min*BODY_MIN,max:base.max===null?null:base.max*BODY_MAX};
}
function fmt(value){return Number.isFinite(value)?Number(value).toLocaleString(undefined,{maximumFractionDigits:1}):'Unknown';}
function scoreText(record){const range=scoreRange(record);return `${range.min.toLocaleString()} to ${range.max.toLocaleString()}`;}
function traitSizeText(api,record){const range=traitSizeRange(api,record);if(range.min===null&&range.max===null)return 'Unknown';if(range.min===null)return `Up to ${fmt(range.max)} cm`;if(range.max===null)return `From ${fmt(range.min)} cm`;return `${fmt(range.min)} to ${fmt(range.max)} cm`;}

window.TideFishRuntime.ready.then(api=>{
  api.mechanics={
    sourceRevision:CURRENT_TIDEBORNE_REVISION,
    fishScore:{rawMin:RAW_MIN,rawMax:RAW_MAX,scoreMin:SCORE_MIN,scoreMax:SCORE_MAX,speciesPoints:{...SPECIES_POINTS}},
    bodyType:{giant:[1.10,1.30],dwarf:[0.60,0.82],normal:[1,1]},
    quality:{values:['Normal','Perfect Specimen'],minimumPerfectPercentile:95,baseChanceAnchors:[[95,0.02],[97.5,0.08],[99,0.25],[99.9,0.60]]}
  };
  api.normalizeFishScore=normalize;
  api.fishScoreRange=scoreRange;
  api.traitSizeRange=record=>traitSizeRange(api,record);
  api.fishScoreRangeText=scoreText;
  api.traitSizeRangeText=record=>traitSizeText(api,record);

  const apply=()=>{
    document.querySelectorAll('.fish-card[data-fish-id]').forEach(card=>{
      const record=api.recordMap.get(card.dataset.fishId);if(!record)return;
      const rows=card.querySelectorAll('.fish-stat-row');
      if(rows[0]?.querySelector('b'))rows[0].querySelector('b').textContent=scoreText(record);
      if(rows[2]?.querySelector('b'))rows[2].querySelector('b').textContent=traitSizeText(api,record);
    });
    const dialog=document.getElementById('fish-detail');
    const id=dialog?.dataset.fishId;const record=id?api.recordMap.get(id):null;if(!record)return;
    document.querySelectorAll('#fish-detail .fish-detail-quick > div').forEach(item=>{if(item.querySelector('span')?.textContent.trim()==='FishScore')item.querySelector('strong').textContent=scoreText(record);});
    document.querySelectorAll('#fish-detail .fish-detail-grid .fish-detail-section').forEach(section=>{
      const heading=section.querySelector('h3')?.textContent.trim();
      if(heading==='Size'){
        const note=section.querySelector('.fish-note');if(note)note.textContent=`With Body Type: ${traitSizeText(api,record)}. This applies the current Dwarf 0.60 minimum and Giant 1.30 maximum to the displayed normal-size reference range.`;
      }
      if(heading==='FishScore'){
        const note=section.querySelector('.fish-note');if(note)note.textContent=`Possible FishScore for this ${scoreRange(record).stars}-star species: ${scoreText(record)}. Current FishScore uses final percentile plus Body Type, Condition, Pigmentation, and Quality, then maps the canonical raw range 50 to 925 onto 1 to 3000.`;
      }
    });
    document.querySelectorAll('#fish-detail .fish-trait-grid > div').forEach(item=>{if(item.querySelector('span')?.textContent.trim()==='Quality')item.querySelector('strong').textContent='Normal · Perfect Specimen';});
  };
  const results=document.getElementById('fish-results'),detail=document.getElementById('fish-detail-body');
  const observer=new MutationObserver(()=>queueMicrotask(apply));
  if(results)observer.observe(results,{childList:true,subtree:true});
  if(detail)observer.observe(detail,{childList:true,subtree:true});
  queueMicrotask(apply);
}).catch(error=>console.warn('Current Tideborne mechanics could not be attached to the Fish Wiki.',error));
})();
