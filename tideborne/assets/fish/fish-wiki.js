(async()=>{
'use strict';

const $=(selector,root=document)=>root.querySelector(selector);
const $$=(selector,root=document)=>[...root.querySelectorAll(selector)];
const esc=value=>String(value??'').replace(/[&<>\"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[char]));
const title=value=>String(value||'').replaceAll('_',' ').replace(/\b\w/g,char=>char.toUpperCase());
const number=value=>{const parsed=Number(value);return Number.isFinite(parsed)?parsed:null};
const fmt=value=>number(value)===null?'Unknown':Number(value).toLocaleString(undefined,{maximumFractionDigits:1});
const stars=value=>'★'.repeat(Math.max(1,Math.min(5,Number(value)||1)));
const rarityOrder={common:1,uncommon:2,rare:3,very_rare:4,legendary:5};
const groupLabels={saltwater:'Ocean / Saltwater',freshwater:'Freshwater / River',underground:'Underground / Cave',lava:'Nether / Lava',void:'End / Void',misc:'Other'};
const variantLabels={normal:'Normal',giant:'Giant',dwarf:'Dwarf',scarred:'Scarred',parasite_ridden:'Parasite-Ridden',albino:'Albino',iridescent:'Iridescent'};
const PAGE_SIZE=36;

const els={
  results:$('#fish-results'),empty:$('#fish-empty'),count:$('#fish-result-count'),search:$('#fish-search'),suggestions:$('#fish-suggestions'),
  group:$('#fish-group'),source:$('#fish-source'),rarity:$('#fish-rarity'),stars:$('#fish-stars'),habitat:$('#fish-habitat'),sort:$('#fish-sort'),
  reset:$('#fish-reset'),chips:$('#fish-active-filters'),category:$('#fish-category-nav'),filters:$('#fish-filters'),filtersToggle:$('#fish-filter-toggle'),
  dialog:$('#fish-detail'),detailBody:$('#fish-detail-body'),detailClose:$('#fish-detail-close')
};

let runtime;
try{
  runtime=await window.TideFishRuntime.ready;
}catch(error){
  console.error('Fish Wiki runtime failed.',error);
  els.results.innerHTML='<div class="fish-state fish-state-error"><strong>Fish data could not load.</strong><span>Refresh the page. If this keeps happening, the catalog bundle needs repair.</span></div>';
  els.count.textContent='Fish data unavailable';
  return;
}

const mechanics=window.TideFishMechanics;
mechanics?.attach?.(runtime);
const {records,recordMap,slug,unslug}=runtime;
const orderedRecords=[...records].sort((a,b)=>a.name.localeCompare(b.name)||a.id.localeCompare(b.id));
const orderedIndex=new Map(orderedRecords.map((record,index)=>[record.id,index]));
const sourceCache=new Map();
const habitatKeyCache=new Map();
const habitatNameCache=new Map();
const groupNameCache=new Map();
const rarityNameCache=new Map();
const searchCache=new Map();

let suggestionIndex=-1;
let lastTrigger=null;
let copyStatusTimer=0;
let currentResults=[];
let renderedCount=0;
let appendBusy=false;
let searchTimer=0;

els.dialog.setAttribute('aria-modal','true');

function baseUrl(){return `${location.pathname}${location.search}`}
function sourceName(record){
  if(sourceCache.has(record.id))return sourceCache.get(record.id);
  const value=record.mod||record.sourceMod||title(runtime.namespace(record.id));
  sourceCache.set(record.id,value);
  return value;
}
function habitatKey(record){
  if(habitatKeyCache.has(record.id))return habitatKeyCache.get(record.id);
  const value=String(record.locationKey||record.location||'').trim();
  habitatKeyCache.set(record.id,value);
  return value;
}
function habitatName(record){
  if(habitatNameCache.has(record.id))return habitatNameCache.get(record.id);
  const value=String(record.location||record.locationKey||'Unknown habitat').trim();
  habitatNameCache.set(record.id,value);
  return value;
}
function groupName(record){
  if(groupNameCache.has(record.id))return groupNameCache.get(record.id);
  const value=groupLabels[record.group]||title(record.group||'Other');
  groupNameCache.set(record.id,value);
  return value;
}
function rarityName(record){
  if(rarityNameCache.has(record.id))return rarityNameCache.get(record.id);
  const value=title(record.rarity||'Unknown');
  rarityNameCache.set(record.id,value);
  return value;
}
function hashFor(id){return `#${encodeURIComponent(slug(id))}`}
function recordFromHash(){
  const raw=decodeURIComponent(location.hash.slice(1));
  return raw?recordMap.get(unslug(raw))||null:null;
}
function scoreText(record){return mechanics?.fishScoreRangeText?.(record)||'See details'}
function traitSizeText(record){return mechanics?.traitSizeRangeText?.(record)||'See details'}

function buildSearchBlob(record){
  return [
    record.name,record.id,slug(record.id),runtime.namespace(record.id),sourceName(record),record.group,groupName(record),
    record.location,record.locationKey,record.rarity,...(record.associatedMods||[]),
    ...(record.conditions||[]).map(condition=>typeof condition==='string'?condition:JSON.stringify(condition))
  ].join(' ').toLowerCase();
}
for(const record of records)searchCache.set(record.id,buildSearchBlob(record));

function addOptions(select,values,label=value=>value){
  const fragment=document.createDocumentFragment();
  for(const value of values){
    const option=document.createElement('option');
    option.value=value;
    option.textContent=label(value);
    fragment.append(option);
  }
  select.append(fragment);
}

const groups=[...new Set(records.map(record=>record.group).filter(Boolean))].sort();
const sources=[...new Set(records.map(record=>sourceName(record)).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
const rarities=[...new Set(records.map(record=>record.rarity).filter(Boolean))].sort((a,b)=>(rarityOrder[a]||99)-(rarityOrder[b]||99));
const habitats=new Map();
for(const record of records){
  const key=habitatKey(record);
  if(key&&!habitats.has(key))habitats.set(key,habitatName(record));
}
addOptions(els.group,groups,value=>groupLabels[value]||title(value));
addOptions(els.source,sources);
addOptions(els.rarity,rarities,title);
addOptions(els.habitat,[...habitats.keys()].sort((a,b)=>habitats.get(a).localeCompare(habitats.get(b))),value=>habitats.get(value));

function categoryButton(value,label){
  const button=document.createElement('button');
  button.type='button';
  button.className='fish-category';
  button.dataset.group=value;
  button.textContent=label;
  button.setAttribute('aria-pressed','false');
  return button;
}
els.category.append(categoryButton('','All fish'));
for(const group of groups)els.category.append(categoryButton(group,groupLabels[group]||title(group)));

function renderPreview(record,detail=false){
  if(!runtime.manifestLoaded){
    return '<div class="fish-render-pending" aria-hidden="true"><span></span></div>';
  }
  const variant=runtime.variantFor(record.id,'normal','normal');
  if(!variant){
    const reason=runtime.renderManifest?.fish?.[record.id]?.error||runtime.renderManifest?.fish?.[record.id]?.status||'No validated source-backed render is available.';
    return `<div class="fish-render-missing"><span aria-hidden="true">◇</span><strong>Render unavailable</strong><small>${esc(String(reason).replaceAll('_',' '))}</small></div>`;
  }
  return `<img class="fish-render${detail?' fish-render-detail':''}" src="${esc(variant.file)}" alt="${esc(record.name)} source-backed fish render" loading="${detail?'eager':'lazy'}" fetchpriority="${detail?'high':'low'}" decoding="async" width="320" height="180">`;
}

function refreshVisibleRenders(){
  for(const holder of $$('[data-render-id]')){
    const record=recordMap.get(holder.dataset.renderId);
    if(!record)continue;
    const detail=holder.classList.contains('fish-detail-render');
    holder.innerHTML=renderPreview(record,detail);
  }
  updateRenderStat();
}

function exactVariants(record){
  const variants=runtime.renderManifest?.fish?.[record.id]?.variants||{};
  const seen=new Set();
  const result=[];
  for(const key of ['normal','giant','dwarf','scarred','parasite_ridden','albino','iridescent']){
    const variant=variants[key];
    if(!variant?.file||variant.status==='unavailable')continue;
    const file=runtime.localRenderUrl(variant.file);
    if(!file||seen.has(file))continue;
    seen.add(file);
    result.push({key,label:variantLabels[key]||title(key),file});
  }
  return result;
}

function sizeText(record){
  const size=runtime.normalSize(record);
  if(size.min===null&&size.max===null)return 'Unknown';
  if(size.min===null)return `Up to ${fmt(size.max)} cm`;
  if(size.max===null)return `From ${fmt(size.min)} cm`;
  return `${fmt(size.min)} to ${fmt(size.max)} cm`;
}

function card(record){
  return `<button class="fish-card" type="button" data-fish-id="${esc(record.id)}" aria-label="Open ${esc(record.name)} details">
    <span class="fish-card-render" data-render-id="${esc(record.id)}">${renderPreview(record)}</span>
    <span class="fish-card-body">
      <span class="fish-card-heading"><span class="fish-source">${esc(sourceName(record))}</span><strong>${esc(record.name)}</strong></span>
      <span class="fish-rarity" aria-label="${esc(rarityName(record))}, ${Number(record.stars)||1} stars"><span aria-hidden="true">${stars(record.stars)}</span><small>${esc(rarityName(record))}</small></span>
      <span class="fish-stat-row"><span>FishScore</span><b>${esc(scoreText(record))}</b></span>
      <span class="fish-stat-row"><span>Size</span><b>${esc(sizeText(record))}</b></span>
      <span class="fish-stat-row"><span>With traits</span><b>${esc(traitSizeText(record))}</b></span>
      <span class="fish-card-cue">${esc(habitatName(record))} · ${esc(groupName(record))}</span>
    </span>
  </button>`;
}

function searchBlob(record){return searchCache.get(record.id)||''}

function filteredRecords(){
  const query=els.search.value.trim().toLowerCase();
  const result=records.filter(record=>{
    if(els.group.value&&record.group!==els.group.value)return false;
    if(els.source.value&&sourceName(record)!==els.source.value)return false;
    if(els.rarity.value&&record.rarity!==els.rarity.value)return false;
    if(els.stars.value&&String(record.stars)!==els.stars.value)return false;
    if(els.habitat.value&&habitatKey(record)!==els.habitat.value)return false;
    return !query||searchBlob(record).includes(query);
  });
  switch(els.sort.value){
    case 'rarity':result.sort((a,b)=>(rarityOrder[b.rarity]||0)-(rarityOrder[a.rarity]||0)||a.name.localeCompare(b.name));break;
    case 'record':result.sort((a,b)=>(number(b.recordHigh)??-1)-(number(a.recordHigh)??-1)||a.name.localeCompare(b.name));break;
    case 'source':result.sort((a,b)=>sourceName(a).localeCompare(sourceName(b))||a.name.localeCompare(b.name));break;
    default:result.sort((a,b)=>a.name.localeCompare(b.name));
  }
  return result;
}

function syncCategory(){
  for(const button of $$('.fish-category',els.category)){
    const active=button.dataset.group===els.group.value;
    button.classList.toggle('active',active);
    button.setAttribute('aria-pressed',String(active));
  }
}

function activeFilters(){
  const entries=[];
  for(const select of [els.group,els.source,els.rarity,els.stars,els.habitat]){
    if(select.value)entries.push({id:select.id,label:select.options[select.selectedIndex]?.textContent||select.value});
  }
  if(els.search.value.trim())entries.push({id:'fish-search',label:`Search: ${els.search.value.trim()}`});
  if(!entries.length){els.chips.replaceChildren();return}
  els.chips.innerHTML=entries.map(entry=>`<button type="button" data-clear="${esc(entry.id)}">${esc(entry.label)} <span aria-hidden="true">×</span></button>`).join('')+
    '<button type="button" class="fish-clear-all" data-clear="all">Clear all</button>';
}

const loadMore=document.createElement('button');
loadMore.type='button';
loadMore.className='fish-load-more';
loadMore.textContent='Load more fish';
loadMore.hidden=true;
els.results.insertAdjacentElement('afterend',loadMore);

function syncLoadMore(){
  const remaining=currentResults.length-renderedCount;
  loadMore.hidden=remaining<=0;
  if(remaining>0)loadMore.textContent=`Load more fish (${remaining.toLocaleString()} left)`;
}

function appendNextBatch(){
  if(appendBusy||renderedCount>=currentResults.length)return;
  appendBusy=true;
  const end=Math.min(currentResults.length,renderedCount+PAGE_SIZE);
  const batch=currentResults.slice(renderedCount,end);
  const html=batch.map(card).join('');
  requestAnimationFrame(()=>{
    els.results.insertAdjacentHTML('beforeend',html);
    renderedCount=end;
    appendBusy=false;
    syncLoadMore();
  });
}

const loadObserver='IntersectionObserver' in window?new IntersectionObserver(entries=>{
  if(entries.some(entry=>entry.isIntersecting))appendNextBatch();
},{rootMargin:'700px 0px'}):null;
if(loadObserver)loadObserver.observe(loadMore);
loadMore.addEventListener('click',appendNextBatch);

function render(){
  currentResults=filteredRecords();
  renderedCount=0;
  appendBusy=false;
  els.results.replaceChildren();
  els.count.textContent=`${currentResults.length} fish`;
  els.empty.hidden=currentResults.length!==0;
  syncCategory();
  activeFilters();
  appendNextBatch();
  syncLoadMore();
}

function scheduleSearchRender(){
  clearTimeout(searchTimer);
  searchTimer=setTimeout(()=>requestAnimationFrame(()=>{
    render();
    drawSuggestions();
  }),55);
}

function suggestionMatches(){
  const query=els.search.value.trim().toLowerCase();
  if(!query)return [];
  return records.map(record=>{
    const name=record.name.toLowerCase();
    const id=record.id.toLowerCase();
    const blob=searchBlob(record);
    const rank=(name.startsWith(query)?8:0)+(name.includes(query)?4:0)+(id.includes(query)?3:0)+(blob.includes(query)?1:0);
    return {record,rank};
  }).filter(item=>item.rank>0)
    .sort((a,b)=>b.rank-a.rank||a.record.name.localeCompare(b.record.name))
    .slice(0,8)
    .map(item=>item.record);
}

function closeSuggestions(){
  els.suggestions.hidden=true;
  els.suggestions.replaceChildren();
  suggestionIndex=-1;
  els.search.setAttribute('aria-expanded','false');
  els.search.removeAttribute('aria-activedescendant');
}

function drawSuggestions(){
  const matches=suggestionMatches();
  if(!matches.length){closeSuggestions();return}
  els.suggestions.innerHTML=matches.map((record,index)=>`<button type="button" role="option" id="fish-suggestion-${index}" data-fish-id="${esc(record.id)}" aria-selected="false"><span><strong>${esc(record.name)}</strong><small>${esc(sourceName(record))}</small></span><span aria-hidden="true">${stars(record.stars)}</span></button>`).join('');
  els.suggestions.hidden=false;
  els.search.setAttribute('aria-expanded','true');
}

function conditionSummary(record){
  const conditions=record.conditions||[];
  if(!conditions.length)return '<p>No extra catch needs are listed in this fish data.</p>';
  return `<div class="fish-condition-list">${conditions.map(condition=>{
    if(typeof condition==='string')return `<div><strong>Needs</strong><span>${esc(condition)}</span></div>`;
    const type=condition?.type||'Condition';
    const detail=Object.entries(condition||{}).filter(([key])=>key!=='type').map(([key,value])=>`${title(key)}: ${Array.isArray(value)?value.join(', '):typeof value==='object'?JSON.stringify(value):value}`).join(' · ')||'Required';
    return `<div><strong>${esc(title(type))}</strong><span>${esc(detail)}</span></div>`;
  }).join('')}</div>`;
}

function variantSection(record){
  if(!runtime.manifestLoaded)return '';
  const variants=exactVariants(record);
  if(variants.length<2)return '';
  return `<section class="fish-detail-section"><h3>Source-backed variants</h3><p class="fish-note">Only variants with their own validated render file are shown.</p><div class="fish-variant-grid">${variants.map(variant=>`<figure><div><img src="${esc(variant.file)}" alt="${esc(record.name)} ${esc(variant.label)} source-backed render" loading="lazy" fetchpriority="low" decoding="async"></div><figcaption>${esc(variant.label)}</figcaption></figure>`).join('')}</div></section>`;
}

function detailHtml(record){
  const index=orderedIndex.get(record.id)??0;
  const previous=orderedRecords[(index-1+orderedRecords.length)%orderedRecords.length];
  const next=orderedRecords[(index+1)%orderedRecords.length];
  const scoreRange=mechanics?.fishScoreRange?.(record);
  const scoreNote=scoreRange
    ? `Possible FishScore for this ${scoreRange.stars}-star species: ${scoreText(record)}. Current FishScore maps the canonical raw range 50 to 925 onto 1 to 3000.`
    : 'FishScore details are unavailable.';
  return `<div class="fish-detail-layout">
    <section class="fish-detail-hero"><div class="fish-detail-render" data-render-id="${esc(record.id)}">${renderPreview(record,true)}</div><div class="fish-detail-heading"><span class="eyebrow">${esc(sourceName(record))}</span><h2 id="fish-detail-title">${esc(record.name)}</h2><div class="fish-rarity fish-rarity-large" aria-label="${esc(rarityName(record))}, ${Number(record.stars)||1} stars"><span aria-hidden="true">${stars(record.stars)}</span><small>${esc(rarityName(record))}</small></div><div class="fish-detail-actions"><button type="button" data-copy-url>Copy URL</button><span class="fish-copy-status" role="status" aria-live="polite"></span></div><div class="fish-detail-quick"><div><span>Habitat</span><strong>${esc(habitatName(record))}</strong></div><div><span>Category</span><strong>${esc(groupName(record))}</strong></div><div><span>Size</span><strong>${esc(sizeText(record))}</strong></div><div><span>FishScore</span><strong>${esc(scoreText(record))}</strong></div></div></div></section>
    <nav class="fish-detail-nav" aria-label="Fish detail navigation"><button type="button" data-fish-id="${esc(previous.id)}">← ${esc(previous.name)}</button><span>${index+1} / ${orderedRecords.length}</span><button type="button" data-fish-id="${esc(next.id)}">${esc(next.name)} →</button></nav>
    <section class="fish-detail-section"><h3>Where to catch</h3><p>${esc(habitatName(record))}</p></section>
    <section class="fish-detail-section"><h3>Catch conditions</h3>${conditionSummary(record)}</section>
    <section class="fish-detail-grid"><div class="fish-detail-section"><h3>Size</h3><p>${esc(sizeText(record))}</p><p class="fish-note">With Body Type: ${esc(traitSizeText(record))}.</p></div><div class="fish-detail-section"><h3>FishScore</h3><p class="fish-note">${esc(scoreNote)}</p></div></section>
    <section class="fish-detail-section"><h3>Specimen traits</h3><div class="fish-trait-grid"><div><span>Body Type</span><strong>Normal · Giant · Dwarf</strong></div><div><span>Condition</span><strong>Normal · Scarred · Parasite-Ridden</strong></div><div><span>Pigmentation</span><strong>Normal · Albino · Iridescent</strong></div><div><span>Quality</span><strong>Normal · Perfect Specimen</strong></div></div></section>
    ${variantSection(record)}
    <details class="fish-advanced"><summary>Advanced</summary><dl><dt>Registry ID</dt><dd><code>${esc(record.id)}</code></dd><dt>Entity</dt><dd><code>${esc(record.entity||'Not listed')}</code></dd><dt>Data source</dt><dd>${esc(record.sourceJar||record.sourcePath||'Vendored Tide fish data')}</dd><dt>Render</dt><dd>${runtime.manifestLoaded?(runtime.variantFor(record.id)?'Source-backed render from the pinned Fish Wiki source':'Render unavailable in the validated source set'):'Render index is still loading'}</dd></dl></details>
  </div>`;
}

function focusableInDialog(){
  return $$('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),details summary,[tabindex]:not([tabindex="-1"])',els.dialog)
    .filter(element=>!element.hidden&&element.offsetParent!==null);
}
function restoreFocus(){
  const target=lastTrigger&&document.contains(lastTrigger)?lastTrigger:els.search;
  target?.focus?.({preventScroll:true});
}

function openRecord(record,{focus=false}={}){
  if(!record)return;
  const changed=els.dialog.dataset.fishId!==record.id;
  if(changed){
    els.detailBody.innerHTML=detailHtml(record);
    els.dialog.dataset.fishId=record.id;
    els.detailBody.scrollTop=0;
  }
  if(!els.dialog.open)els.dialog.showModal();
  document.body.classList.add('fish-modal-open');
  if(focus)els.detailClose.focus({preventScroll:true});
}

function closeVisual(){
  if(els.dialog.open)els.dialog.close();
  els.dialog.removeAttribute('data-fish-id');
  document.body.classList.remove('fish-modal-open');
  restoreFocus();
}

function syncRoute({focus=false}={}){
  if(!location.hash){closeVisual();return}
  const record=recordFromHash();
  if(!record){
    history.replaceState({fishWikiCatalog:true},'',baseUrl());
    closeVisual();
    return;
  }
  openRecord(record,{focus});
}

function seedDirectRoute(){
  const record=recordFromHash();
  if(!location.hash)return;
  if(!record){history.replaceState({fishWikiCatalog:true},'',baseUrl());return}
  if(history.state?.fishWiki)return;
  const hash=hashFor(record.id);
  history.replaceState({fishWikiCatalog:true},'',baseUrl());
  history.pushState({fishWiki:true,id:record.id,depth:1},'',`${baseUrl()}${hash}`);
}

function navigateTo(id,trigger,{detailNavigation=false}={}){
  const record=recordMap.get(id);
  if(!record)return;
  if(trigger&&!els.dialog.open)lastTrigger=trigger;
  const depth=history.state?.fishWiki?Math.max(1,Number(history.state.depth)||1)+(detailNavigation?1:0):1;
  history.pushState({fishWiki:true,id,depth},'',`${baseUrl()}${hashFor(id)}`);
  openRecord(record,{focus:!detailNavigation});
}

function closeDetail(){
  if(!els.dialog.open)return;
  const depth=history.state?.fishWiki?Math.max(1,Number(history.state.depth)||1):0;
  if(depth){history.go(-depth);return}
  history.replaceState({fishWikiCatalog:true},'',baseUrl());
  closeVisual();
}

async function copyCurrentUrl(button){
  const url=location.href;
  try{
    if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(url);
    else{
      const input=document.createElement('textarea');
      input.value=url;
      input.setAttribute('readonly','');
      input.style.position='fixed';
      input.style.opacity='0';
      document.body.append(input);
      input.select();
      document.execCommand('copy');
      input.remove();
    }
    const status=$('.fish-copy-status',els.dialog);
    if(status){
      status.textContent='Copied';
      clearTimeout(copyStatusTimer);
      copyStatusTimer=setTimeout(()=>{status.textContent=''},1800);
    }
    button.textContent='Copied';
    setTimeout(()=>{if(document.contains(button))button.textContent='Copy URL'},1800);
  }catch(error){
    console.warn('Could not copy Fish Wiki URL.',error);
    const status=$('.fish-copy-status',els.dialog);
    if(status)status.textContent='Copy failed';
  }
}

function updateRenderStat(){
  const target=$('#fish-stat-renders');
  if(!target)return;
  if(!runtime.manifestLoaded){target.textContent='…';return}
  target.textContent=records.filter(record=>runtime.variantFor(record.id)).length.toLocaleString();
}

els.category.addEventListener('click',event=>{
  const button=event.target.closest('[data-group]');
  if(!button)return;
  els.group.value=button.dataset.group;
  render();
});
for(const select of [els.group,els.source,els.rarity,els.stars,els.habitat,els.sort])select.addEventListener('change',render);
els.search.addEventListener('input',scheduleSearchRender);
els.search.addEventListener('focus',drawSuggestions);
els.search.addEventListener('keydown',event=>{
  const options=$$('button[role="option"]',els.suggestions);
  if((event.key==='ArrowDown'||event.key==='ArrowUp')&&options.length){
    event.preventDefault();
    suggestionIndex=event.key==='ArrowDown'?(suggestionIndex+1)%options.length:(suggestionIndex-1+options.length)%options.length;
    options.forEach((option,index)=>option.setAttribute('aria-selected',String(index===suggestionIndex)));
    els.search.setAttribute('aria-activedescendant',options[suggestionIndex].id);
  }else if(event.key==='Enter'&&suggestionIndex>=0&&options[suggestionIndex]){
    event.preventDefault();
    navigateTo(options[suggestionIndex].dataset.fishId,els.search);
    closeSuggestions();
  }else if(event.key==='Escape')closeSuggestions();
});
els.suggestions.addEventListener('click',event=>{
  const option=event.target.closest('[data-fish-id]');
  if(!option)return;
  navigateTo(option.dataset.fishId,els.search);
  closeSuggestions();
});
els.results.addEventListener('click',event=>{
  const item=event.target.closest('[data-fish-id]');
  if(item)navigateTo(item.dataset.fishId,item);
});
els.detailBody.addEventListener('click',event=>{
  const copy=event.target.closest('[data-copy-url]');
  if(copy){copyCurrentUrl(copy);return}
  const button=event.target.closest('button[data-fish-id]');
  if(button)navigateTo(button.dataset.fishId,null,{detailNavigation:true});
});
els.detailClose.addEventListener('click',closeDetail);
els.dialog.addEventListener('cancel',event=>{event.preventDefault();closeDetail()});
els.dialog.addEventListener('click',event=>{if(event.target===els.dialog)closeDetail()});
els.dialog.addEventListener('keydown',event=>{
  if(event.key!=='Tab')return;
  const focusable=focusableInDialog();
  if(!focusable.length)return;
  const first=focusable[0],last=focusable[focusable.length-1];
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
});
els.reset.addEventListener('click',()=>{
  for(const element of [els.group,els.source,els.rarity,els.stars,els.habitat])element.value='';
  els.search.value='';
  els.sort.value='name';
  closeSuggestions();
  render();
});
els.chips.addEventListener('click',event=>{
  const button=event.target.closest('[data-clear]');
  if(!button)return;
  if(button.dataset.clear==='all'){els.reset.click();return}
  const element=document.getElementById(button.dataset.clear);
  if(!element)return;
  element.value='';
  render();
  if(element===els.search)closeSuggestions();
});
els.filtersToggle.addEventListener('click',()=>{
  const open=els.filters.classList.toggle('fish-filters-open');
  els.filtersToggle.setAttribute('aria-expanded',String(open));
});
document.addEventListener('click',event=>{if(!event.target.closest('.fish-search-wrap'))closeSuggestions()});
window.addEventListener('popstate',()=>syncRoute({focus:false}));

document.addEventListener('keydown',event=>{
  if(event.key!=='/'||event.ctrlKey||event.metaKey||event.altKey||event.shiftKey||els.dialog.open)return;
  const target=event.target;
  const typing=['INPUT','TEXTAREA','SELECT'].includes(target?.tagName)||target?.isContentEditable;
  if(typing)return;
  event.preventDefault();
  event.stopImmediatePropagation();
  els.search.focus();
  els.search.select();
},true);

$('#fish-stat-records').textContent=records.length.toLocaleString();
$('#fish-stat-sources').textContent=new Set(records.map(record=>sourceName(record))).size.toLocaleString();
updateRenderStat();

render();
seedDirectRoute();
syncRoute({focus:false});

runtime.manifestReady.then(()=>{
  refreshVisibleRenders();
  const openId=els.dialog.dataset.fishId;
  if(openId&&recordMap.has(openId)){
    els.detailBody.innerHTML=detailHtml(recordMap.get(openId));
  }
}).catch(error=>console.warn('Fish renders could not be loaded.',error));
})();
