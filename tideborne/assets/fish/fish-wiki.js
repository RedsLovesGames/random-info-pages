(async()=>{
'use strict';

const $=(selector,root=document)=>root.querySelector(selector);
const $$=(selector,root=document)=>[...root.querySelectorAll(selector)];
const esc=value=>String(value??'').replace(/[&<>\"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[char]));
const title=value=>String(value||'').replaceAll('_',' ').replace(/\b\w/g,char=>char.toUpperCase());
const number=value=>{const parsed=Number(value);return Number.isFinite(parsed)?parsed:null};
const fmt=value=>number(value)===null?'Unknown':Number(value).toLocaleString(undefined,{maximumFractionDigits:1});
const stars=value=>'★'.repeat(Math.max(1,Math.min(5,Number(value)||1)));
const rarityOrder={common:1,uncommon:2,rare:3,very_rare:4,legendary:5};
const groupLabels={saltwater:'Ocean / Saltwater',freshwater:'Freshwater / River',underground:'Underground / Cave',lava:'Nether / Lava',void:'End / Void',misc:'Other'};

const els={
  results:$('#fish-results'),
  empty:$('#fish-empty'),
  count:$('#fish-result-count'),
  search:$('#fish-search'),
  suggestions:$('#fish-suggestions'),
  group:$('#fish-group'),
  source:$('#fish-source'),
  rarity:$('#fish-rarity'),
  stars:$('#fish-stars'),
  habitat:$('#fish-habitat'),
  sort:$('#fish-sort'),
  reset:$('#fish-reset'),
  chips:$('#fish-active-filters'),
  category:$('#fish-category-nav'),
  filters:$('#fish-filters'),
  filtersToggle:$('#fish-filter-toggle'),
  dialog:$('#fish-detail'),
  detailBody:$('#fish-detail-body'),
  detailClose:$('#fish-detail-close')
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

const {records,recordMap,slug,unslug}=runtime;
let suggestionIndex=-1;
let lastTrigger=null;
let openedFromCatalog=false;

function sourceName(record){return record.mod||record.sourceMod||title(runtime.namespace(record.id));}
function habitatKey(record){return String(record.locationKey||record.location||'').trim();}
function habitatName(record){return String(record.location||record.locationKey||'Unknown habitat').trim();}
function groupName(record){return groupLabels[record.group]||title(record.group||'Other');}
function rarityName(record){return title(record.rarity||'Unknown');}

function addOptions(select,values,label=value=>value){
  for(const value of values){
    const option=document.createElement('option');
    option.value=value;
    option.textContent=label(value);
    select.append(option);
  }
}

const groups=[...new Set(records.map(record=>record.group).filter(Boolean))].sort();
const sources=[...new Set(records.map(record=>sourceName(record)).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
const rarities=[...new Set(records.map(record=>record.rarity).filter(Boolean))].sort((a,b)=>(rarityOrder[a]||99)-(rarityOrder[b]||99));
const habitats=new Map();
for(const record of records){const key=habitatKey(record);if(key&&!habitats.has(key))habitats.set(key,habitatName(record));}

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
  const variant=runtime.variantFor(record.id,'normal','normal');
  if(!variant){
    const reason=runtime.renderManifest?.fish?.[record.id]?.error||runtime.renderManifest?.fish?.[record.id]?.status||'No validated source-backed render is available.';
    return `<div class="fish-render-missing"><span aria-hidden="true">◇</span><strong>Render unavailable</strong><small>${esc(String(reason).replaceAll('_',' '))}</small></div>`;
  }
  return `<img class="fish-render${detail?' fish-render-detail':''}" src="${esc(variant.file)}" alt="${esc(record.name)} source-backed fish render" loading="${detail?'eager':'lazy'}" decoding="async">`;
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
    <span class="fish-card-render">${renderPreview(record)}</span>
    <span class="fish-card-body">
      <span class="fish-card-heading"><span class="fish-source">${esc(sourceName(record))}</span><strong>${esc(record.name)}</strong></span>
      <span class="fish-rarity" aria-label="${esc(rarityName(record))}, ${Number(record.stars)||1} stars"><span aria-hidden="true">${stars(record.stars)}</span><small>${esc(rarityName(record))}</small></span>
      <span class="fish-stat-row"><span>FishScore</span><b>See details</b></span>
      <span class="fish-stat-row"><span>Size</span><b>${esc(sizeText(record))}</b></span>
      <span class="fish-stat-row"><span>With traits</span><b>See details</b></span>
      <span class="fish-card-cue">${esc(habitatName(record))} · ${esc(groupName(record))}</span>
    </span>
  </button>`;
}

function searchBlob(record){
  return [record.name,record.id,slug(record.id),runtime.namespace(record.id),sourceName(record),record.group,groupName(record),record.location,record.locationKey,record.rarity,...(record.associatedMods||[]),...(record.conditions||[]).flatMap(condition=>[condition.type,JSON.stringify(condition)])].join(' ').toLowerCase();
}

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
    case 'rarity': result.sort((a,b)=>(rarityOrder[b.rarity]||0)-(rarityOrder[a.rarity]||0)||a.name.localeCompare(b.name));break;
    case 'record': result.sort((a,b)=>(number(b.recordHigh)??-1)-(number(a.recordHigh)??-1)||a.name.localeCompare(b.name));break;
    case 'source': result.sort((a,b)=>sourceName(a).localeCompare(sourceName(b))||a.name.localeCompare(b.name));break;
    default: result.sort((a,b)=>a.name.localeCompare(b.name));
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
  if(!entries.length){els.chips.replaceChildren();return;}
  els.chips.innerHTML=entries.map(entry=>`<button type="button" data-clear="${esc(entry.id)}">${esc(entry.label)} <span aria-hidden="true">×</span></button>`).join('')+'<button type="button" class="fish-clear-all" data-clear="all">Clear all</button>';
}

function render(){
  const result=filteredRecords();
  els.results.innerHTML=result.map(card).join('');
  els.count.textContent=`${result.length} fish`;
  els.empty.hidden=result.length!==0;
  syncCategory();
  activeFilters();
}

function suggestionMatches(){
  const query=els.search.value.trim().toLowerCase();
  if(!query)return [];
  return records.map(record=>{
    const name=record.name.toLowerCase();
    const id=record.id.toLowerCase();
    const rank=(name.startsWith(query)?8:0)+(name.includes(query)?4:0)+(id.includes(query)?3:0)+(searchBlob(record).includes(query)?1:0);
    return {record,rank};
  }).filter(item=>item.rank>0).sort((a,b)=>b.rank-a.rank||a.record.name.localeCompare(b.record.name)).slice(0,8).map(item=>item.record);
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
  if(!matches.length){closeSuggestions();return;}
  els.suggestions.innerHTML=matches.map((record,index)=>`<button type="button" role="option" id="fish-suggestion-${index}" data-fish-id="${esc(record.id)}" aria-selected="false"><span><strong>${esc(record.name)}</strong><small>${esc(sourceName(record))}</small></span><span aria-hidden="true">${stars(record.stars)}</span></button>`).join('');
  els.suggestions.hidden=false;
  els.search.setAttribute('aria-expanded','true');
}

function conditionSummary(record){
  if(!(record.conditions||[]).length)return '<p>No extra catch needs are listed in this fish data.</p>';
  return `<div class="fish-condition-list">${record.conditions.map(condition=>`<div><strong>${esc(title(condition.type||'Condition'))}</strong><span>${esc(Object.entries(condition).filter(([key])=>key!=='type').map(([key,value])=>`${title(key)}: ${Array.isArray(value)?value.join(', '):typeof value==='object'?JSON.stringify(value):value}`).join(' · ')||'Required')}</span></div>`).join('')}</div>`;
}

function detailHtml(record){
  const ordered=[...records].sort((a,b)=>a.name.localeCompare(b.name)||a.id.localeCompare(b.id));
  const index=ordered.findIndex(item=>item.id===record.id);
  const previous=ordered[(index-1+ordered.length)%ordered.length];
  const next=ordered[(index+1)%ordered.length];
  return `<div class="fish-detail-layout">
    <section class="fish-detail-hero">
      <div class="fish-detail-render">${renderPreview(record,true)}</div>
      <div class="fish-detail-heading">
        <span class="eyebrow">${esc(sourceName(record))}</span>
        <h2 id="fish-detail-title">${esc(record.name)}</h2>
        <div class="fish-rarity fish-rarity-large" aria-label="${esc(rarityName(record))}, ${Number(record.stars)||1} stars"><span aria-hidden="true">${stars(record.stars)}</span><small>${esc(rarityName(record))}</small></div>
        <div class="fish-detail-quick">
          <div><span>Habitat</span><strong>${esc(habitatName(record))}</strong></div>
          <div><span>Category</span><strong>${esc(groupName(record))}</strong></div>
          <div><span>Size</span><strong>${esc(sizeText(record))}</strong></div>
          <div><span>FishScore</span><strong>Current values being checked</strong></div>
        </div>
      </div>
    </section>
    <nav class="fish-detail-nav" aria-label="Fish detail navigation"><button type="button" data-fish-id="${esc(previous.id)}">← ${esc(previous.name)}</button><span>${index+1} / ${ordered.length}</span><button type="button" data-fish-id="${esc(next.id)}">${esc(next.name)} →</button></nav>
    <section class="fish-detail-section"><h3>Where to catch</h3><p>${esc(habitatName(record))}</p></section>
    <section class="fish-detail-section"><h3>Catch conditions</h3>${conditionSummary(record)}</section>
    <section class="fish-detail-grid">
      <div class="fish-detail-section"><h3>Size</h3><p>${esc(sizeText(record))}</p><p class="fish-note">Trait-aware limits are being checked against the current Tideborne specimen system before they are published here.</p></div>
      <div class="fish-detail-section"><h3>FishScore</h3><p class="fish-note">The old Fish Wiki score math is not used here until it matches the current Tideborne FishScore implementation.</p></div>
    </section>
    <section class="fish-detail-section"><h3>Specimen traits</h3><div class="fish-trait-grid"><div><span>Body Type</span><strong>Normal · Giant · Dwarf</strong></div><div><span>Condition</span><strong>Normal · Scarred · Parasite-Ridden</strong></div><div><span>Pigmentation</span><strong>Normal · Albino · Iridescent</strong></div><div><span>Quality</span><strong>Current canonical quality system</strong></div></div></section>
    <details class="fish-advanced"><summary>Advanced</summary><dl><dt>Registry ID</dt><dd><code>${esc(record.id)}</code></dd><dt>Entity</dt><dd><code>${esc(record.entity||'Not listed')}</code></dd><dt>Data source</dt><dd>${esc(record.sourceJar||record.sourcePath||'Vendored Tide fish data')}</dd><dt>Render</dt><dd>${runtime.variantFor(record.id)?'Source-backed render from the pinned Fish Wiki source':'Render unavailable in the validated source set'}</dd></dl></details>
  </div>`;
}

function focusableInDialog(){return $$('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),details summary,[tabindex]:not([tabindex="-1"])',els.dialog).filter(element=>!element.hidden&&element.offsetParent!==null);}

function openRecord(record,{fromCatalog=false,focus=true}={}){
  if(!record)return;
  openedFromCatalog=fromCatalog;
  els.detailBody.innerHTML=detailHtml(record);
  els.dialog.dataset.fishId=record.id;
  if(!els.dialog.open)els.dialog.showModal();
  document.body.classList.add('fish-modal-open');
  if(focus)els.detailClose.focus({preventScroll:true});
}

function closeDialog({historyAware=true}={}){
  if(!els.dialog.open)return;
  els.dialog.close();
  document.body.classList.remove('fish-modal-open');
  if(historyAware&&location.hash&&openedFromCatalog){history.back();return;}
  if(location.hash)history.replaceState(null,'',location.pathname+location.search);
  lastTrigger?.focus?.({preventScroll:true});
  openedFromCatalog=false;
}

function syncHash(){
  const hash=decodeURIComponent(location.hash.slice(1));
  if(!hash){
    if(els.dialog.open){els.dialog.close();document.body.classList.remove('fish-modal-open');lastTrigger?.focus?.({preventScroll:true});}
    return;
  }
  const record=recordMap.get(unslug(hash));
  if(!record){history.replaceState(null,'',location.pathname+location.search);return;}
  openRecord(record,{fromCatalog:openedFromCatalog,focus:false});
}

function openById(id,trigger){
  const record=recordMap.get(id);
  if(!record)return;
  lastTrigger=trigger||document.activeElement;
  openedFromCatalog=true;
  const nextHash=`#${encodeURIComponent(slug(id))}`;
  if(location.hash===nextHash)openRecord(record,{fromCatalog:true});
  else location.hash=slug(id);
}

els.category.addEventListener('click',event=>{const button=event.target.closest('[data-group]');if(!button)return;els.group.value=button.dataset.group;render();});
for(const select of [els.group,els.source,els.rarity,els.stars,els.habitat,els.sort])select.addEventListener('change',render);
els.search.addEventListener('input',()=>{render();drawSuggestions();});
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
    openById(options[suggestionIndex].dataset.fishId,els.search);
    closeSuggestions();
  }else if(event.key==='Escape')closeSuggestions();
});
els.suggestions.addEventListener('click',event=>{const option=event.target.closest('[data-fish-id]');if(!option)return;openById(option.dataset.fishId,els.search);closeSuggestions();});
els.results.addEventListener('click',event=>{const card=event.target.closest('[data-fish-id]');if(card)openById(card.dataset.fishId,card);});
els.detailBody.addEventListener('click',event=>{const button=event.target.closest('button[data-fish-id]');if(!button)return;lastTrigger=els.detailClose;openedFromCatalog=false;location.hash=slug(button.dataset.fishId);});
els.detailClose.addEventListener('click',()=>closeDialog());
els.dialog.addEventListener('cancel',event=>{event.preventDefault();closeDialog();});
els.dialog.addEventListener('click',event=>{if(event.target===els.dialog)closeDialog();});
els.dialog.addEventListener('keydown',event=>{
  if(event.key!=='Tab')return;
  const focusable=focusableInDialog();
  if(!focusable.length)return;
  const first=focusable[0],last=focusable[focusable.length-1];
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
});
els.reset.addEventListener('click',()=>{for(const element of [els.group,els.source,els.rarity,els.stars,els.habitat])element.value='';els.search.value='';els.sort.value='name';closeSuggestions();render();});
els.chips.addEventListener('click',event=>{
  const button=event.target.closest('[data-clear]');if(!button)return;
  if(button.dataset.clear==='all'){els.reset.click();return;}
  const element=document.getElementById(button.dataset.clear);if(!element)return;element.value='';render();if(element===els.search)closeSuggestions();
});
els.filtersToggle.addEventListener('click',()=>{const open=els.filters.classList.toggle('fish-filters-open');els.filtersToggle.setAttribute('aria-expanded',String(open));});
document.addEventListener('click',event=>{if(!event.target.closest('.fish-search-wrap'))closeSuggestions();});
document.addEventListener('keydown',event=>{
  const active=document.activeElement;
  const typing=['INPUT','TEXTAREA','SELECT'].includes(active?.tagName)||active?.isContentEditable;
  if(event.key==='/'&&!typing&&!els.dialog.open){event.preventDefault();els.search.focus();els.search.select();}
});
window.addEventListener('hashchange',syncHash);

$('#fish-stat-records').textContent=records.length.toLocaleString();
$('#fish-stat-sources').textContent=new Set(records.map(record=>sourceName(record))).size.toLocaleString();
$('#fish-stat-renders').textContent=records.filter(record=>runtime.variantFor(record.id)).length.toLocaleString();

render();
syncHash();
})();
