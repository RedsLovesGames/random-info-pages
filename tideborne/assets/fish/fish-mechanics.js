(()=>{
'use strict';
const CURRENT_TIDEBORNE_REVISION='eee0cb429921803cf2f81b2b43b76f4fed9cad4f';
const RAW_MIN=50,RAW_MAX=925,SCORE_MIN=1,SCORE_MAX=3000;
const SPECIES_POINTS={1:50,2:100,3:175,4:250,5:350};
const MAX_TRAIT_AND_PERCENTILE_POINTS=575;
const BODY_MIN=0.60,BODY_MAX=1.30;
let api=null;

function javaRound(value){return Math.floor(value+0.5)}
function normalize(raw){
  const normalized=(raw-RAW_MIN)/(RAW_MAX-RAW_MIN);
  return Math.max(SCORE_MIN,Math.min(SCORE_MAX,javaRound(SCORE_MIN+(SCORE_MAX-SCORE_MIN)*normalized)));
}
function scoreRange(record){
  const stars=Math.max(1,Math.min(5,Number(record?.stars)||1));
  const base=SPECIES_POINTS[stars];
  return {min:normalize(base),max:normalize(base+MAX_TRAIT_AND_PERCENTILE_POINTS),stars};
}
function traitSizeRange(record){
  const base=api?.normalSize?.(record)||{min:null,max:null};
  if(base.min===null&&base.max===null)return {min:null,max:null};
  return {min:base.min===null?null:base.min*BODY_MIN,max:base.max===null?null:base.max*BODY_MAX};
}
function fmt(value){return Number.isFinite(value)?Number(value).toLocaleString(undefined,{maximumFractionDigits:1}):'Unknown'}
function fishScoreRangeText(record){const range=scoreRange(record);return `${range.min.toLocaleString()} to ${range.max.toLocaleString()}`}
function traitSizeRangeText(record){
  const range=traitSizeRange(record);
  if(range.min===null&&range.max===null)return 'Unknown';
  if(range.min===null)return `Up to ${fmt(range.max)} cm`;
  if(range.max===null)return `From ${fmt(range.min)} cm`;
  return `${fmt(range.min)} to ${fmt(range.max)} cm`;
}
function attach(runtime){
  api=runtime;
  runtime.mechanics={
    sourceRevision:CURRENT_TIDEBORNE_REVISION,
    fishScore:{rawMin:RAW_MIN,rawMax:RAW_MAX,scoreMin:SCORE_MIN,scoreMax:SCORE_MAX,speciesPoints:{...SPECIES_POINTS}},
    bodyType:{giant:[1.10,1.30],dwarf:[0.60,0.82],normal:[1,1]},
    quality:{values:['Normal','Perfect Specimen'],minimumPerfectPercentile:95,baseChanceAnchors:[[95,0.02],[97.5,0.08],[99,0.25],[99.9,0.60]]}
  };
  runtime.normalizeFishScore=normalize;
  runtime.fishScoreRange=scoreRange;
  runtime.traitSizeRange=traitSizeRange;
  runtime.fishScoreRangeText=fishScoreRangeText;
  runtime.traitSizeRangeText=traitSizeRangeText;
  return runtime;
}

const mechanics={attach,normalizeFishScore:normalize,fishScoreRange:scoreRange,traitSizeRange,fishScoreRangeText,traitSizeRangeText};
window.TideFishMechanics=mechanics;
window.TideFishRuntime?.ready?.then(attach).catch(error=>console.warn('Current Tideborne mechanics could not be attached to the Fish Wiki.',error));
})();
