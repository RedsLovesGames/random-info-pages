(()=>{
  'use strict';

  const REF={
    Abyss:{match:'https://rib.gg/matches/909/nrg-vs-100-thieves-vct-2026-americas-stage-2-playoffs',vod:'https://www.youtube.com/watch?v=TntlDvMFTX0&t=405s',mapNo:1,label:'NRG vs 100T · Abyss'},
    Ascent:{match:'https://rib.gg/matches/968/100-thieves-vs-loud-vct-26-amer-s2-playoffs',vod:'https://www.youtube.com/watch?v=6fNuxyJtfq0&t=6219s',mapNo:3,label:'100T vs LOUD · Ascent'},
    Haven:{match:'https://rib.gg/matches/968/100-thieves-vs-loud-vct-26-amer-s2-playoffs',vod:'https://www.youtube.com/watch?v=6fNuxyJtfq0&t=11918s',mapNo:5,label:'100T vs LOUD · Haven'},
    Lotus:{match:'https://rib.gg/matches/846/100-thieves-vs-leviatan',vod:'',mapNo:1,label:'LEV vs 100T · Lotus'},
    Split:{match:'https://rib.gg/matches/968/100-thieves-vs-loud-vct-26-amer-s2-playoffs',vod:'https://www.youtube.com/watch?v=6fNuxyJtfq0&t=598s',mapNo:1,label:'100T vs LOUD · Split'},
    Summit:{match:'https://rib.gg/matches/968/100-thieves-vs-loud-vct-26-amer-s2-playoffs',vod:'https://www.youtube.com/watch?v=6fNuxyJtfq0&t=9811s',mapNo:4,label:'100T vs LOUD · Summit'},
    Sunset:{match:'https://rib.gg/matches/909/nrg-vs-100-thieves-vct-2026-americas-stage-2-playoffs',vod:'https://www.youtube.com/watch?v=TntlDvMFTX0&t=2330s',mapNo:2,label:'NRG vs 100T · Sunset'}
  };
  const ZOOM={Abyss:1.07,Ascent:1.11,Haven:1.07,Lotus:1.08,Split:1.08,Summit:1.08,Sunset:1.08};
  let normalized=false;
  let raf=0;

  function currentMap(){try{return window.state?.map||'Haven'}catch(_e){return'Haven'}}
  function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}

  function normalizeCallouts(){
    const rt=window.VCTTactical?.runtime;
    if(!rt?.maps?.size)return false;
    let changed=false;
    for(const meta of rt.maps.values()){
      if(meta.__siteAwareCallouts)continue;
      for(const c of meta.callouts||[]){
        const region=String(c.regionName||'').trim();
        const superName=String(c.superRegionName||'').trim();
        if(!region||!superName)continue;
        const canonical=`${superName} ${region}`.trim();
        if(region.toLowerCase()!==canonical.toLowerCase()){
          c.__originalRegionName=region;
          c.regionName=canonical;
          changed=true;
        }
      }
      meta.__siteAwareCallouts=true;
    }
    normalized=true;
    return changed;
  }

  function forceOneRerender(){
    document.querySelectorAll('.map-panel').forEach(p=>p.dataset.tacticalSignature='');
    try{window.VCTTactical?.enhance?.(true)}catch(_e){}
  }

  function applyZoom(square,map){
    if(!square||square.dataset.v3Zoomed==='1')return;
    const z=ZOOM[map]||1.07;
    const image=square.querySelector('.tactical-map-img');
    const routes=square.querySelector('.route-layer');
    if(image){image.style.transform=`scale(${z})`;image.style.transformOrigin='50% 50%'}
    if(routes){routes.style.transform=`scale(${z})`;routes.style.transformOrigin='50% 50%'}
    square.querySelectorAll('.tacmarker,.utilmark').forEach(el=>{
      const l=parseFloat(el.style.left),t=parseFloat(el.style.top);
      if(!Number.isFinite(l)||!Number.isFinite(t))return;
      const nl=50+(l-50)*z,nt=50+(t-50)*z;
      el.style.left=`${Math.max(2,Math.min(98,nl))}%`;
      el.style.top=`${Math.max(2,Math.min(98,nt))}%`;
    });
    square.dataset.v3Zoomed='1';
  }

  function placeLabels(panel){
    panel.querySelectorAll('.tacmarker').forEach(el=>{
      const l=parseFloat(el.style.left),t=parseFloat(el.style.top);
      el.classList.remove('label-left','label-right','label-above','label-below');
      if(l>67)el.classList.add('label-left');else el.classList.add('label-right');
      if(t<20)el.classList.add('label-below');
      if(t>80)el.classList.add('label-above');
      el.tabIndex=0;
    });
  }

  function sourceStrip(panel,map){
    const strip=panel.querySelector('.tactical-source-strip');
    if(!strip||strip.dataset.v3==='1')return;
    const ref=REF[map];
    if(!ref)return;
    strip.dataset.v3='1';
    strip.innerHTML=`
      <div class="source-meta">
        <span class="observed-badge">REFERENCE VCT MATCH</span>
        <span><b>${esc(ref.label)}</b> · Map ${ref.mapNo}</span>
      </div>
      <div class="source-actions">
        <a href="${esc(ref.match)}" target="_blank" rel="noopener">RIB match + Replay tab ↗</a>
        ${ref.vod?`<a href="${esc(ref.vod)}" target="_blank" rel="noopener">Watch exact ${esc(map)} VOD ↗</a>`:''}
      </div>
      <div class="source-guidance">RIB currently exposes Replay as an in-page tab on the exact match page, not as a verified stable map-specific permalink. ValoPlant exact links require a specific shared .vrf replay, so the generic ValoPlant home link has been removed.</div>`;
  }

  function fixTruth(panel){
    const n=panel.querySelector('.truth-note');
    if(!n||n.dataset.v3==='1')return;
    n.dataset.v3='1';
    n.innerHTML='<b>Source boundary:</b> agent comps and match references are observed VCT data. Map points use VALORANT callout coordinates. The named play, arrows, and utility plan are a planning template unless an exact round is explicitly identified.';
  }

  function decorate(){
    const map=currentMap();
    document.querySelectorAll('.map-panel.tactical-upgraded').forEach(panel=>{
      panel.classList.add('tactical-v3');
      const square=panel.querySelector('.tactical-square');
      applyZoom(square,map);
      placeLabels(panel);
      sourceStrip(panel,map);
      fixTruth(panel);
    });
  }

  function run(){
    raf=0;
    const changed=normalizeCallouts();
    if(changed)forceOneRerender();
    decorate();
  }
  function schedule(){if(raf)return;raf=requestAnimationFrame(run)}

  const obs=new MutationObserver(schedule);
  obs.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('load',schedule,{once:true});
  setTimeout(schedule,150);
  setTimeout(schedule,900);
})();
