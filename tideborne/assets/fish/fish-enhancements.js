(()=> {
'use strict';

const $=(selector,root=document)=>root.querySelector(selector);
const $$=(selector,root=document)=>[...root.querySelectorAll(selector)];
const esc=value=>String(value??'').replace(/[&<>\"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[char]));
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const number=value=>{const parsed=Number(value);return Number.isFinite(parsed)?parsed:null};
const fmt=value=>number(value)===null?'Unknown':Number(value).toLocaleString(undefined,{maximumFractionDigits:1});
const title=value=>String(value||'').replaceAll('_',' ').replace(/\b\w/g,char=>char.toUpperCase());
const stars=value=>'★'.repeat(Math.max(1,Math.min(5,Number(value)||1)));

const ready=async()=> {
  const runtime=await window.TideFishRuntime.ready;
  const mechanics=window.TideFishMechanics;
  mechanics?.attach?.(runtime);

  const records=[...runtime.records].sort((a,b)=>a.name.localeCompare(b.name)||a.id.localeCompare(b.id));
  const recordMap=runtime.recordMap;
  const detailDialog=$('#fish-detail');
  const detailBody=$('#fish-detail-body');
  const compareOpen=$('#fish-compare-open');
  if(!detailDialog||!detailBody||!compareOpen)return;

  const sourceName=record=>record.mod||record.sourceMod||title(runtime.namespace(record.id));
  const groupName=record=>({
    saltwater:'Ocean / Saltwater',
    freshwater:'Freshwater / River',
    underground:'Underground / Cave',
    lava:'Nether / Lava',
    void:'End / Void',
    misc:'Other'
  })[record.group]||title(record.group||'Other');
  const habitatName=record=>String(record.location||record.locationKey||'Unknown habitat').trim();
  const rarityName=record=>title(record.rarity||'Unknown');
  const size=record=>runtime.normalSize(record);
  const traitSize=record=>runtime.traitSizeRange?.(record)||mechanics?.traitSizeRange?.(record)||{min:null,max:null};
  const scoreText=record=>runtime.fishScoreRangeText?.(record)||mechanics?.fishScoreRangeText?.(record)||'Unknown';

  function naturalLength(record,percentile){
    const bounds=size(record);
    const min=number(bounds.min);
    const max=number(bounds.max);
    if(min===null&&max===null)return null;
    if(min===null)return max;
    if(max===null)return min;
    return min+(max-min)*(clamp(Number(percentile)||0,0,100)/100);
  }

  function viewportMax(record){
    const trait=traitSize(record);
    const base=size(record);
    return Math.max(1,number(trait.max)??number(base.max)??number(base.min)??1);
  }

  function renderFile(record){
    return runtime.variantFor(record.id,'normal','normal')?.file||null;
  }

  function scaleStageHtml(record,percentile,label,slot,sharedMax=null){
    const length=naturalLength(record,percentile);
    const maxCm=Math.max(1,sharedMax??viewportMax(record));
    const blocks=Math.max(1,Math.ceil(maxCm/100));
    const file=renderFile(record);
    const visual=file
      ? `<img class="fish-scale-image" data-scale-image src="${esc(file)}" alt="${esc(record.name)} source-backed render at ${percentile}th percentile" decoding="async">`
      : '<div class="fish-scale-missing">Render unavailable</div>';
    const ticks=Array.from({length:blocks+1},(_,index)=>`<span style="--tick:${index};--ticks:${blocks}"><i></i><b>${index}b</b></span>`).join('');
    return `<article class="fish-percentile-card" data-scale-card data-record-id="${esc(record.id)}" data-percentile="${percentile}" data-scale-max="${maxCm}" data-slot="${slot}">
      <div class="fish-percentile-head"><div><span>${esc(label)}</span><strong data-scale-percentile-label>${percentile}th percentile</strong></div><b data-scale-length>${length===null?'Unknown':`${fmt(length)} cm`}</b></div>
      <div class="fish-scale-stage" data-scale-stage data-length="${length??0}" data-scale-blocks="${blocks}">
        <div class="fish-scale-grid" aria-hidden="true"></div>
        <div class="fish-scale-image-shell">${visual}</div>
        <div class="fish-scale-ruler" aria-hidden="true">${ticks}</div>
        <div class="fish-scale-caption"><strong>${blocks} block${blocks===1?'':'s'} view</strong><span>1 block = 100 cm</span></div>
      </div>
      <label class="fish-percentile-slider"><span>Percentile</span><input type="range" min="0" max="100" step="1" value="${percentile}" data-size-percentile="${slot}" aria-label="${esc(label)} percentile"><output>${percentile}%</output></label>
    </article>`;
  }

  function sizeComparisonHtml(record){
    const trait=traitSize(record);
    const base=size(record);
    const baseText=base.min===null&&base.max===null?'Unknown':`${fmt(base.min)} to ${fmt(base.max)} cm`;
    const traitText=trait.min===null&&trait.max===null?'Unknown':`${fmt(trait.min)} to ${fmt(trait.max)} cm`;
    return `<section class="fish-detail-section fish-size-comparison" data-size-comparison="${esc(record.id)}">
      <div class="fish-section-heading"><div><span class="fish-section-kicker">Scaled like the old Fish Wiki</span><h3>Compare percentiles</h3></div><p>Both previews use one fixed species viewport, so the size difference is physical instead of cosmetic.</p></div>
      <div class="fish-percentile-grid">
        ${scaleStageHtml(record,25,'Specimen A','a')}
        ${scaleStageHtml(record,75,'Specimen B','b')}
      </div>
      <div class="fish-size-envelope">
        <div><span>Natural size</span><strong>${esc(baseText)}</strong></div>
        <div><span>With Body Type</span><strong>${esc(traitText)}</strong></div>
        <p>Dwarf can reach 60% of base size. Giant can reach 130% of base size. Body Type multiplier RNG is independent from natural percentile.</p>
      </div>
    </section>`;
  }

  function applyScale(card,sharedMax=null){
    const stage=$('[data-scale-stage]',card);
    const image=$('[data-scale-image]',card);
    if(!stage)return;
    const maxCm=Math.max(1,sharedMax??number(card.dataset.scaleMax)??1);
    const blocks=Math.max(1,Math.ceil(maxCm/100));
    const length=Math.max(0,number(stage.dataset.length)??0);

    const apply=()=> {
      const aspect=image?.naturalWidth&&image?.naturalHeight
        ? clamp(image.naturalHeight/image.naturalWidth,.05,4)
        : .45;
      const room=Math.max(120,stage.clientWidth-38);
      const stageHeight=Math.max(130,stage.clientHeight-70);
      const maxBlocks=Math.max(.01,maxCm/100);
      const horizontalBlockPx=room/blocks;
      const verticalBlockPx=stageHeight/Math.max(maxBlocks*aspect,.01);
      const blockPx=Math.max(8,Math.min(horizontalBlockPx,verticalBlockPx));
      const fishPx=Math.max(6,(length/100)*blockPx);
      stage.style.setProperty('--scale-block-px',`${blockPx}px`);
      stage.style.setProperty('--scale-view-width',`${blockPx*blocks}px`);
      stage.style.setProperty('--scale-fish-width',`${fishPx}px`);
      if(image)image.style.width=`${fishPx}px`;
    };

    if(!image||image.complete&&image.naturalWidth)apply();
    else image.addEventListener('load',apply,{once:true});
  }

  function applyAllScales(root=document){
    for(const card of $$('[data-scale-card]',root))applyScale(card);
  }

  function updatePercentileCard(card,record,percentile,sharedMax=null){
    const value=clamp(Number(percentile)||0,0,100);
    const length=naturalLength(record,value);
    card.dataset.percentile=String(value);
    const label=$('[data-scale-percentile-label]',card);
    const lengthLabel=$('[data-scale-length]',card);
    const output=$('.fish-percentile-slider output',card);
    const stage=$('[data-scale-stage]',card);
    if(label)label.textContent=`${value}th percentile`;
    if(lengthLabel)lengthLabel.textContent=length===null?'Unknown':`${fmt(length)} cm`;
    if(output)output.textContent=`${value}%`;
    if(stage)stage.dataset.length=String(length??0);
    applyScale(card,sharedMax);
  }

  function enhanceDetail(){
    const id=detailDialog.dataset.fishId;
    const record=id?recordMap.get(id):null;
    if(!record)return;

    const actions=$('.fish-detail-actions',detailBody);
    if(actions&&!$('[data-compare-current]',actions)){
      const button=document.createElement('button');
      button.type='button';
      button.dataset.compareCurrent=record.id;
      button.textContent='Compare fish';
      actions.append(button);
    }

    if(!$('[data-size-comparison]',detailBody)){
      const sizeGrid=$('.fish-detail-grid',detailBody);
      if(sizeGrid)sizeGrid.insertAdjacentHTML('afterend',sizeComparisonHtml(record));
    }
    requestAnimationFrame(()=>applyAllScales(detailBody));
  }

  const detailObserver=new MutationObserver(()=>queueMicrotask(enhanceDetail));
  detailObserver.observe(detailBody,{childList:true,subtree:false});
  detailDialog.addEventListener('toggle',()=>{if(detailDialog.open)enhanceDetail()});
  window.addEventListener('resize',()=>requestAnimationFrame(()=>applyAllScales(detailBody)),{passive:true});

  detailBody.addEventListener('input',event=>{
    const slider=event.target.closest('[data-size-percentile]');
    if(!slider)return;
    const card=slider.closest('[data-scale-card]');
    const record=recordMap.get(card?.dataset.recordId);
    if(record)updatePercentileCard(card,record,slider.value);
  });

  let compareDialog=null;
  let compareBody=null;
  let compareA=null;
  let compareB=null;
  let comparePA=null;
  let comparePB=null;
  let compareReturnFocus=null;

  function options(selected){
    return records.map(record=>`<option value="${esc(record.id)}"${record.id===selected?' selected':''}>${esc(record.name)} - ${esc(sourceName(record))}</option>`).join('');
  }

  function compareUrl(a,b,pa,pb){
    const url=new URL(location.href);
    url.hash='';
    url.searchParams.set('compare',`${a},${b}`);
    url.searchParams.set('pa',String(pa));
    url.searchParams.set('pb',String(pb));
    return url;
  }

  function parseCompare(){
    const params=new URLSearchParams(location.search);
    const ids=String(params.get('compare')||'').split(',').map(value=>value.trim()).filter(Boolean);
    if(ids.length!==2||!recordMap.has(ids[0])||!recordMap.has(ids[1]))return null;
    return {
      a:ids[0],
      b:ids[1],
      pa:clamp(Number(params.get('pa'))||50,0,100),
      pb:clamp(Number(params.get('pb'))||50,0,100)
    };
  }

  function ensureCompareDialog(){
    if(compareDialog)return;
    compareDialog=document.createElement('dialog');
    compareDialog.id='fish-compare-dialog';
    compareDialog.className='fish-compare-dialog';
    compareDialog.setAttribute('aria-labelledby','fish-compare-title');
    compareDialog.innerHTML=`<div class="fish-compare-shell">
      <div class="fish-compare-bar"><div><span>Field guide</span><strong id="fish-compare-title">Compare fish</strong></div><div class="fish-compare-bar-actions"><button type="button" data-compare-copy>Copy URL</button><button type="button" data-compare-close>Close</button></div></div>
      <div class="fish-compare-body">
        <div class="fish-compare-selectors">
          <label><span>Fish A</span><select data-compare-select="a"></select></label>
          <button type="button" class="fish-compare-swap" data-compare-swap aria-label="Swap fish">⇄</button>
          <label><span>Fish B</span><select data-compare-select="b"></select></label>
        </div>
        <div data-compare-content></div>
      </div>
    </div>`;
    document.body.append(compareDialog);
    compareBody=$('[data-compare-content]',compareDialog);
    compareA=$('[data-compare-select="a"]',compareDialog);
    compareB=$('[data-compare-select="b"]',compareDialog);

    compareDialog.addEventListener('cancel',event=>{event.preventDefault();closeCompare()});
    compareDialog.addEventListener('click',event=>{
      if(event.target===compareDialog){closeCompare();return}
      if(event.target.closest('[data-compare-close]')){closeCompare();return}
      if(event.target.closest('[data-compare-swap]')){
        const a=compareA.value;
        compareA.value=compareB.value;
        compareB.value=a;
        const pa=comparePA?.value??50;
        const pb=comparePB?.value??50;
        renderCompare(pb,pa);
        return;
      }
      const copy=event.target.closest('[data-compare-copy]');
      if(copy){
        (async()=>{
          try{
            if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(location.href);
            else{
              const input=document.createElement('textarea');
              input.value=location.href;
              input.setAttribute('readonly','');
              input.style.position='fixed';
              input.style.opacity='0';
              document.body.append(input);
              input.select();
              document.execCommand('copy');
              input.remove();
            }
            copy.textContent='Copied';
            setTimeout(()=>{if(document.contains(copy))copy.textContent='Copy URL'},1500);
          }catch(error){
            console.warn('Could not copy fish comparison URL.',error);
            copy.textContent='Copy failed';
          }
        })();
      }
    });
    compareDialog.addEventListener('change',event=>{
      if(event.target.matches('[data-compare-select]'))renderCompare();
    });
    compareDialog.addEventListener('input',event=>{
      const slider=event.target.closest('[data-compare-percentile]');
      if(!slider)return;
      const card=slider.closest('[data-scale-card]');
      const record=recordMap.get(card?.dataset.recordId);
      if(!record)return;
      const sharedMax=Math.max(viewportMax(recordMap.get(compareA.value)),viewportMax(recordMap.get(compareB.value)));
      updatePercentileCard(card,record,slider.value,sharedMax);
      updateCompareUrl();
    });
  }

  function compareCard(record,percentile,slot,sharedMax){
    const base=size(record);
    const traits=traitSize(record);
    const preview=scaleStageHtml(record,percentile,slot==='a'?'Fish A':'Fish B',`compare-${slot}`,sharedMax);
    return `<article class="fish-compare-card">
      <header><div><span class="fish-source">${esc(sourceName(record))}</span><h2>${esc(record.name)}</h2></div><div class="fish-rarity"><span aria-hidden="true">${stars(record.stars)}</span><small>${esc(rarityName(record))}</small></div></header>
      ${preview.replace('data-size-percentile="compare-'+slot+'"','data-compare-percentile="'+slot+'"')}
      <dl class="fish-compare-stats">
        <div><dt>Habitat</dt><dd>${esc(habitatName(record))}</dd></div>
        <div><dt>Category</dt><dd>${esc(groupName(record))}</dd></div>
        <div><dt>Natural size</dt><dd>${base.min===null&&base.max===null?'Unknown':`${fmt(base.min)} to ${fmt(base.max)} cm`}</dd></div>
        <div><dt>With traits</dt><dd>${traits.min===null&&traits.max===null?'Unknown':`${fmt(traits.min)} to ${fmt(traits.max)} cm`}</dd></div>
        <div><dt>FishScore</dt><dd>${esc(scoreText(record))}</dd></div>
        <div><dt>Catch rules</dt><dd>${Array.isArray(record.conditions)?record.conditions.length:0}</dd></div>
      </dl>
    </article>`;
  }

  function renderCompare(pa=null,pb=null){
    if(!compareDialog)return;
    const recordA=recordMap.get(compareA.value)||records[0];
    let recordB=recordMap.get(compareB.value)||records[1]||records[0];
    if(recordB.id===recordA.id&&records.length>1)recordB=records.find(record=>record.id!==recordA.id)||recordB;

    const nextPA=pa??Number(comparePA?.value)??50;
    const nextPB=pb??Number(comparePB?.value)??50;
    const sharedMax=Math.max(viewportMax(recordA),viewportMax(recordB));

    compareBody.innerHTML=`<div class="fish-compare-grid">
      ${compareCard(recordA,clamp(nextPA,0,100),'a',sharedMax)}
      ${compareCard(recordB,clamp(nextPB,0,100),'b',sharedMax)}
    </div>
    <div class="fish-compare-note"><strong>Shared physical scale</strong><span>Both fish use the same ${Math.ceil(sharedMax/100)} block viewport. Percentile changes length without resizing the ruler.</span></div>`;
    compareA.value=recordA.id;
    compareB.value=recordB.id;
    comparePA=$('[data-compare-percentile="a"]',compareBody);
    comparePB=$('[data-compare-percentile="b"]',compareBody);
    requestAnimationFrame(()=>{
      for(const card of $$('[data-scale-card]',compareBody))applyScale(card,sharedMax);
    });
    updateCompareUrl();
  }

  function updateCompareUrl(){
    if(!compareDialog?.open||!compareA?.value||!compareB?.value)return;
    const url=compareUrl(compareA.value,compareB.value,Number(comparePA?.value)||50,Number(comparePB?.value)||50);
    const state={...(history.state||{}),fishCompare:true};
    history.replaceState(state,'',url);
  }

  function openCompare(seedId=null,{fromRoute=false}={}){
    ensureCompareDialog();
    const parsed=parseCompare();
    const current=seedId&&recordMap.has(seedId)?seedId:parsed?.a;
    const first=current||records[0]?.id;
    const second=(parsed?.b&&parsed.b!==first?parsed.b:records.find(record=>record.id!==first)?.id)||first;
    compareA.innerHTML=options(first);
    compareB.innerHTML=options(second);
    compareA.value=first;
    compareB.value=second;
    compareReturnFocus=document.activeElement;

    if(detailDialog.open){
      detailDialog.close();
      document.body.classList.remove('fish-modal-open');
    }

    if(!compareDialog.open)compareDialog.showModal();
    document.body.classList.add('fish-compare-open');

    if(!fromRoute){
      const url=compareUrl(first,second,parsed?.pa??50,parsed?.pb??50);
      history.pushState({...(history.state||{}),fishCompare:true},'',url);
    }
    renderCompare(parsed?.pa??50,parsed?.pb??50);
  }

  function closeCompare({fromRoute=false}={}){
    if(!compareDialog?.open)return;
    compareDialog.close();
    document.body.classList.remove('fish-compare-open');
    if(!fromRoute&&history.state?.fishCompare){
      history.back();
      return;
    }
    if(!fromRoute){
      const url=new URL(location.href);
      url.searchParams.delete('compare');
      url.searchParams.delete('pa');
      url.searchParams.delete('pb');
      history.replaceState({...history.state,fishCompare:false},'',url);
    }
    compareReturnFocus?.focus?.({preventScroll:true});
  }

  compareOpen.addEventListener('click',()=>openCompare(null));

  detailBody.addEventListener('click',event=>{
    const button=event.target.closest('[data-compare-current]');
    if(button){
      event.preventDefault();
      event.stopPropagation();
      openCompare(button.dataset.compareCurrent);
    }
  });

  window.addEventListener('popstate',()=>{
    const parsed=parseCompare();
    if(parsed){
      openCompare(parsed.a,{fromRoute:true});
    }else if(compareDialog?.open){
      closeCompare({fromRoute:true});
    }
  });

  const direct=parseCompare();
  if(direct)openCompare(direct.a,{fromRoute:true});
  if(detailDialog.open)enhanceDetail();
};

ready().catch(error=>console.warn('Fish comparison tools could not load.',error));
})();
