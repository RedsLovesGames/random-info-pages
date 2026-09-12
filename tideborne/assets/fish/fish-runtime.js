(()=>{
'use strict';

const sourceScript=document.currentScript;
const assetBase=new URL('./',sourceScript?.src||location.href);
const dataUrls=['fish-wiki-data-0.json.gz','fish-wiki-data-1.json.gz'].map(name=>new URL(name,assetBase).href);
const renderIndexUrl=new URL('fish-render-index.json',assetBase).href;
const scopeUrl=new URL('modpack-scope.json',assetBase).href;

const namespace=id=>{const value=String(id||'');const split=value.indexOf(':');return split<0?'minecraft':value.slice(0,split)};
const slug=id=>String(id||'').replace(':','__');
const unslug=value=>String(value||'').replace('__',':');
const number=value=>{const parsed=Number(value);return Number.isFinite(parsed)?parsed:null};

async function loadGzipJson(url){
  const response=await fetch(url,{cache:'force-cache'});
  if(!response.ok)throw new Error(`${url}: HTTP ${response.status}`);
  if(!('DecompressionStream' in window))throw new Error('This browser cannot read the Fish Wiki data bundle.');
  const stream=response.body.pipeThrough(new DecompressionStream('gzip'));
  return JSON.parse(await new Response(stream).text());
}

async function loadJson(url,fallback){
  try{
    const response=await fetch(url,{cache:'force-cache'});
    if(!response.ok)throw new Error(`${url}: HTTP ${response.status}`);
    return await response.json();
  }catch(error){
    if(fallback!==undefined){
      console.warn('Optional Fish Wiki data could not be loaded.',url,error);
      return fallback;
    }
    throw error;
  }
}

function localRenderUrl(file){
  if(!file)return null;
  const clean=String(file).split(/[\\/]/).pop();
  return clean?new URL(`renders/${encodeURIComponent(clean)}`,assetBase).href:null;
}

function variantForManifest(manifest,id,condition='normal',body='normal'){
  const variants=manifest?.fish?.[id]?.variants||{};
  const candidates=[];
  if(condition&&condition!=='normal'&&condition!=='perfect_specimen'){
    if(condition==='parasite_ridden')candidates.push('parasite_ridden','parasite-ridden','parasite');
    else candidates.push(condition);
  }
  if(body&&body!=='normal')candidates.push(body);
  candidates.push('normal');
  for(const key of candidates){
    const variant=variants[key];
    if(!variant?.file||variant.status==='unavailable')continue;
    const file=localRenderUrl(variant.file);
    if(!file)continue;
    const exactCondition=condition!=='normal'&&condition!=='perfect_specimen'&&candidates.indexOf(key)===0;
    const exactBody=condition==='normal'&&body!=='normal'&&key===body;
    return {...variant,key,file,exact:condition==='normal'&&body==='normal'?key==='normal':exactCondition||exactBody};
  }
  return null;
}

function normalSize(record){
  const low=number(record?.typicalLow);
  const typicalHigh=number(record?.typicalHigh);
  const recordHigh=number(record?.recordHigh);
  return {min:low,max:recordHigh??typicalHigh,typicalMax:typicalHigh,recordHigh};
}

let api=null;
let renderIndex={fish:{},counts:{}};
let manifestLoaded=false;

const rawManifestReady=loadJson(renderIndexUrl,{fish:{},counts:{}}).then(index=>{
  renderIndex=index&&typeof index==='object'?index:{fish:{},counts:{}};
  manifestLoaded=true;
  if(api){
    api.renderManifest=renderIndex;
    api.manifestLoaded=true;
  }
  return renderIndex;
});

const ready=(async()=>{
  const [first,second,scope]=await Promise.all([
    loadGzipJson(dataUrls[0]),
    loadGzipJson(dataUrls[1]),
    loadJson(scopeUrl,{mod_ids:[],include_minecraft:true})
  ]);

  const allRecords=[...(first.records||[]),...(second.records||[])];
  const allowedMods=new Set(scope.mod_ids||[]);
  if(scope.include_minecraft!==false)allowedMods.add('minecraft');
  const records=allRecords.filter(record=>allowedMods.size===0||allowedMods.has(namespace(record.id)));
  const recordMap=new Map(records.map(record=>[record.id,record]));
  const allowedIds=new Set(recordMap.keys());

  api={
    meta:first.meta||{},
    scope,
    renderManifest:renderIndex,
    manifestLoaded,
    allRecords,
    records,
    recordMap,
    allowedIds,
    allowedMods,
    namespace,
    slug,
    unslug,
    normalSize,
    localRenderUrl,
    variantFor:(id,condition='normal',body='normal')=>variantForManifest(api.renderManifest,id,condition,body),
    runtimeFile:id=>variantForManifest(api.renderManifest,id,'normal','normal')?.file||null,
    mechanics:{fishScore:'validation-pending',traitSize:'validation-pending'}
  };
  api.manifestReady=rawManifestReady.then(index=>{
    api.renderManifest=index;
    api.manifestLoaded=true;
    return index;
  });

  window.TideFishModpackScope={scope,allowedIds,allowedMods,records};
  document.body.dataset.fishScope='modpack';
  return api;
})();

window.TideFishRuntime={ready,manifestReady:rawManifestReady,namespace,slug,unslug,normalSize};
})();
