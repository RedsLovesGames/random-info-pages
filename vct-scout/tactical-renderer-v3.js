(function(root,factory){
  const G=typeof module==='object'&&module.exports?require('./map-geometry.js'):root.MapGeometry;
  const T=typeof module==='object'&&module.exports?require('./agent-tactics.js'):root.AgentTactics;
  const P=typeof module==='object'&&module.exports?require('./recommended-plays.js'):root.RecommendedPlays;
  const O=typeof module==='object'&&module.exports?require('./observed-rounds.js'):root.ObservedRounds;
  const api=factory(G,T,P,O);if(typeof module==='object'&&module.exports)module.exports=api;else root.TacticalRendererV3=api;
})(typeof self!=='undefined'?self:this,function(G,T,P,O){
  'use strict';
  const runtime={selectedPlay:{},mode:'recommended',layers:{players:true,labels:true,routes:true,utility:true,callouts:true,destinations:true},zoom:1,logos:new Map(),scheduled:false};
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  function hydrateMaps(apiMaps){
    let total=0;
    for(const map of apiMaps||[]){
      if(map?.displayName&&G.getMap(map.displayName))total+=G.hydrateFromValorantApi(map.displayName,map);
    }
    return total;
  }
  function buildModel({map,side='attack',playId,items=[]}){
    const plays=P.get(map,side);const play=P.getById(map,side,playId)||plays[0];if(!play)throw new Error(`No recommended play for ${map} ${side}`);
    const assignment=T.assign(items,play.slots);const players=play.slots.map(s=>{
      const a=assignment[s.id]||{player:'',agent:'?',subrole:'flex',assignment:s.id};const start=G.anchor(map,s.startAnchor),destination=s.destinationAnchor?G.anchor(map,s.destinationAnchor):null;
      return{slot:s.id,label:s.label,player:a.player,agent:a.agent,assignment:a.subrole||a.assignment,start,destination,route:destination?G.path(map,start.id,destination.id):[start]};
    });
    const bySlot=Object.fromEntries(players.map(x=>[x.slot,x]));
    const utility=(play.utility||[]).map(u=>({...u,target:G.anchor(map,u.targetAnchor),ownerAgent:bySlot[u.ownerSlot]?.agent||'?',ownerPlayer:bySlot[u.ownerSlot]?.player||''}));
    const routes=players.filter(x=>x.destination).map(x=>({slot:x.slot,agent:x.agent,player:x.player,points:x.route}));
    const spike=side==='attack'?bySlot[play.spikeCarrierSlot]||null:null;const plant=side==='attack'?G.anchor(map,play.plantAnchor):null;
    return{map,side,play,players,routes,utility,spike,plant,sourceClass:'planning-template',badge:'Planning template',warnings:players.filter(p=>p.start.confidence==='template'||p.destination?.confidence==='template').map(p=>`${p.label} uses template anchor geometry`)};
  }
  function currentItems(){
    try{
      if(state.mode==='lab'){
        const players=state.activePlayers||[];let assignment={...state.manual};const valid=players.length===5&&players.every(p=>assignment[p])&&new Set(Object.values(assignment)).size===5;
        if(!valid&&typeof recommendations==='function'){const rec=recommendations()?.[state.selectedRec||0]||recommendations()?.[0];if(rec?.assignment)assignment={...rec.assignment}}
        const rows=players.filter(p=>assignment[p]).map(p=>({player:p,agent:assignment[p]}));if(rows.length===5)return rows;
      }
      if(state.scoutView==='meta'){return(state.data?.meta_by_map?.[state.map]?.top_compositions?.[0]?.agents||[]).map(a=>({player:'',agent:a}))}
      const team=state.data?.teams?.find(t=>Number(t.id)===Number(state.teamId));const row=team?.maps?.[state.map];return(row?.latest?.agents||row?.common?.agents||[]).map(a=>({player:'',agent:a}));
    }catch(_e){return[]}
  }
  function agentImg(agent){try{return state.agentAssets?.get(String(agent).toLowerCase())||''}catch(_e){return''}}
  function mapImg(map){try{return state.mapAssets?.get(map)||''}catch(_e){return''}}
  function currentTeam(){try{return state.data?.teams?.find(t=>Number(t.id)===Number(state.teamId))||null}catch(_e){return null}}
  function playKey(map,side){return`${map}|${side}`}
  function selectedPlay(map,side){const rows=P.get(map,side);const wanted=runtime.selectedPlay[playKey(map,side)]||localStorage.getItem(`v3Play:${playKey(map,side)}`);return rows.find(x=>x.id===wanted)||rows[0]}
  function setPlay(map,side,id){runtime.selectedPlay[playKey(map,side)]=id;localStorage.setItem(`v3Play:${playKey(map,side)}`,id)}
  function routeSvg(route,i){const pts=route.points.map(p=>`${(p.x*1000).toFixed(1)},${(p.y*1000).toFixed(1)}`).join(' ');return`<polyline class="v3-route route-${i%5}" points="${pts}" marker-end="url(#v3arrow)"/>`}
  function labelClass(a){return`${a.x>.72?'left':''} ${a.x<.28?'right':''} ${a.y<.22?'below':''} ${a.y>.78?'above':''}`.trim()}
  function markerHtml(p){const img=agentImg(p.agent);const fallback=p.start.confidence==='template';return`<div class="v3-player ${fallback?'template-anchor':''}" style="left:${p.start.x*100}%;top:${p.start.y*100}%" data-layer="players" tabindex="0" title="${esc(p.player?`${p.player} · ${p.agent}`:p.agent)} · ${esc(p.label)} · ${esc(p.assignment)}"><span class="v3-avatar">${img?`<img src="${esc(img)}" alt="">`:esc(p.agent.slice(0,2))}</span><span class="v3-player-label ${labelClass(p.start)}" data-layer="labels"><b>${esc(p.player?`${p.player} · ${p.agent}`:p.agent)}</b><small>${esc(p.label)}</small></span>${fallback?'<i class="anchor-warning" title="Template coordinate">!</i>':''}</div>`}
  function destinationHtml(p){if(!p.destination)return'';return`<div class="v3-destination" data-layer="destinations" style="left:${p.destination.x*100}%;top:${p.destination.y*100}%" title="${esc(p.agent)} destination: ${esc(p.destination.label)}"><span></span></div>`}
  function utilityHtml(u,i){return`<button class="v3-util kind-${esc(u.abilityKind)}" data-layer="utility" style="left:${u.target.x*100}%;top:${u.target.y*100}%" title="${esc(`${u.ownerPlayer?u.ownerPlayer+' · ':''}${u.ownerAgent}: ${u.label} (${u.phase})`)}"><span>${i+1}</span><b>${esc(u.abilityKind)}</b></button>`}
  function calloutHtml(m){const keep=['attackSpawn','defenseSpawn','siteA','siteB','siteC','mid','aMain','bMain','cLong','garage'];return keep.map(id=>m.anchors[id]).filter(Boolean).map(a=>`<span class="v3-callout ${a.id.startsWith('site')?'site':''}" data-layer="callouts" style="left:${a.x*100}%;top:${a.y*100}%">${esc(a.label)}</span>`).join('')}
  function phaseHtml(model){return model.play.phases.map((p,i)=>`<span class="v3-phase"><b>${i+1}</b>${esc(p.label)}</span>`).join('')}
  function inspectorHtml(model){return`<aside class="v3-inspector"><div class="v3-badge planning">PLANNING TEMPLATE</div><h4>${esc(model.play.title)}</h4><div class="v3-tempo">${esc(model.play.tempo)}</div><div class="v3-phases">${phaseHtml(model)}</div><div class="v3-assignments">${model.players.map((p,i)=>`<div class="v3-assignment"><span>${i+1}</span><div><b>${esc(p.player?`${p.player} · ${p.agent}`:p.agent)}</b><small>${esc(p.assignment)} · ${esc(p.start.label)}${p.destination?` → ${esc(p.destination.label)}`:''}</small></div></div>`).join('')}</div>${model.side==='attack'?`<div class="v3-objective"><b>Spike</b><span>${esc(model.spike?.player||model.spike?.agent||'Unassigned')}</span><b>Plant</b><span>${esc(model.plant?.label||'n/a')}</span><b>Post plant</b><span>${esc(G.anchor(model.map,model.play.postPlantAnchor)?.label||'n/a')}</span></div>`:''}<div class="v3-utility-list">${model.utility.map(u=>`<div><b>${esc(u.ownerPlayer?`${u.ownerPlayer} · ${u.ownerAgent}`:u.ownerAgent)}</b><span>${esc(u.phase)} · ${esc(u.abilityKind)} → ${esc(u.target.label)}</span></div>`).join('')}</div><div class="v3-contingencies"><b>Fallbacks</b>${model.play.contingencies.map(c=>`<p><strong>${esc(c.if)}:</strong> ${esc(c.then)}</p>`).join('')}</div>${model.warnings.length?`<details class="v3-evidence"><summary>Geometry confidence</summary>${model.warnings.map(w=>`<p>⚠ ${esc(w)}</p>`).join('')}<p>Template anchors are explicit approximations, not hidden pro coordinates.</p></details>`:''}</aside>`}
  function emptyObserved(map){return`<div class="v3-observed-empty"><div class="v3-badge observed">OBSERVED VCT ROUND</div><h4>No exact-round evidence published for ${esc(map)} yet</h4><p>Map-level VOD timestamps are not being promoted to observed rounds. An entry only appears here after the exact round start/end is manually verified.</p></div>`}
  function observedHtml(map){const rows=O.get(map);if(!rows.length)return emptyObserved(map);return`<div class="v3-observed-list">${rows.map(r=>`<article><div class="v3-badge observed">OBSERVED VCT ROUND</div><h4>${esc(r.team)} vs ${esc(r.opponent)} · ${esc(r.map)} · Round ${r.round}</h4><p>${esc(r.event)} · ${esc(r.date)} · ${esc(r.side)}</p><a href="${esc(r.vodUrl)}?t=${r.vodStartSeconds}" target="_blank" rel="noopener">Watch exact round ↗</a><a href="${esc(r.sourceMatchUrl)}" target="_blank" rel="noopener">Match details ↗</a><details><summary>Evidence</summary><p>${esc(r.evidenceNotes)}</p></details></article>`).join('')}</div>`}
  function boardHtml(model){const m=G.getMap(model.map),img=mapImg(model.map);return`<div class="v3-board-head"><div><span class="v3-kicker">Recommended Play</span><h3>${esc(model.map)} tactical planner</h3><p>${esc(model.play.title)}</p></div><div class="v3-controls"><div class="v3-mode"><button data-v3-mode="recommended" class="${runtime.mode==='recommended'?'active':''}">Recommended Play</button><button data-v3-mode="observed" class="${runtime.mode==='observed'?'active':''}">Observed VCT Round</button></div><div class="v3-side"><button data-v3-side="attack" class="${model.side==='attack'?'active':''}">Attack</button><button data-v3-side="defense" class="${model.side==='defense'?'active':''}">Defense</button></div><select data-v3-play>${P.get(model.map,model.side).map(p=>`<option value="${esc(p.id)}" ${p.id===model.play.id?'selected':''}>${esc(p.title)}</option>`).join('')}</select></div></div><div class="v3-layerbar"><div class="v3-layers">${Object.keys(runtime.layers).map(k=>`<label><input type="checkbox" data-v3-layer="${k}" ${runtime.layers[k]?'checked':''}> ${esc(k)}</label>`).join('')}</div><div class="v3-zoom"><button data-v3-zoom="out">−</button><span>${Math.round(runtime.zoom*100)}%</span><button data-v3-zoom="in">+</button><button data-v3-zoom="reset">Reset</button></div></div><div class="v3-main">${runtime.mode==='observed'?`<div class="v3-observed-pane">${observedHtml(model.map)}</div>`:`<div class="v3-map-wrap"><div class="v3-map-viewport"><div class="v3-map-content" style="transform:scale(${runtime.zoom})">${img?`<img class="v3-map-img" src="${esc(img)}" alt="${esc(model.map)} map">`:`<div class="v3-map-missing">${esc(model.map)}</div>`}<svg class="v3-route-layer" data-layer="routes" viewBox="0 0 1000 1000"><defs><marker id="v3arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L0,7 L7,3.5 z"/></marker></defs>${model.routes.map(routeSvg).join('')}</svg>${calloutHtml(m)}${model.players.map(destinationHtml).join('')}${model.utility.map(utilityHtml).join('')}${model.players.map(markerHtml).join('')}${model.plant?`<div class="v3-plant" data-layer="destinations" style="left:${model.plant.x*100}%;top:${model.plant.y*100}%">◆<span>${esc(model.plant.label)}</span></div>`:''}</div></div></div>${inspectorHtml(model)}`}</div>`}
  function applyLayers(panel){for(const [k,on] of Object.entries(runtime.layers))panel.querySelectorAll(`[data-layer="${k}"]`).forEach(el=>el.classList.toggle('layer-hidden',!on))}
  function bind(panel,model){
    panel.querySelectorAll('[data-v3-mode]').forEach(b=>b.onclick=()=>{runtime.mode=b.dataset.v3Mode;panel.dataset.v3sig='';renderPanel(panel)});
    panel.querySelectorAll('[data-v3-side]').forEach(b=>b.onclick=()=>{try{state.side=b.dataset.v3Side;render()}catch(_e){panel.dataset.v3sig='';renderPanel(panel)}});
    panel.querySelector('[data-v3-play]')?.addEventListener('change',e=>{setPlay(model.map,model.side,e.target.value);panel.dataset.v3sig='';renderPanel(panel)});
    panel.querySelectorAll('[data-v3-layer]').forEach(i=>i.onchange=()=>{runtime.layers[i.dataset.v3Layer]=i.checked;applyLayers(panel)});
    panel.querySelectorAll('[data-v3-zoom]').forEach(b=>b.onclick=()=>{const a=b.dataset.v3Zoom;runtime.zoom=a==='in'?Math.min(2,runtime.zoom+.15):a==='out'?Math.max(.7,runtime.zoom-.15):1;panel.dataset.v3sig='';renderPanel(panel)});
    const vp=panel.querySelector('.v3-map-viewport'),content=panel.querySelector('.v3-map-content');if(vp&&content){let drag=false,sx=0,sy=0,sl=0,st=0;vp.onpointerdown=e=>{drag=true;sx=e.clientX;sy=e.clientY;sl=vp.scrollLeft;st=vp.scrollTop;vp.setPointerCapture(e.pointerId)};vp.onpointermove=e=>{if(drag){vp.scrollLeft=sl-(e.clientX-sx);vp.scrollTop=st-(e.clientY-sy)}};vp.onpointerup=()=>drag=false;}
    applyLayers(panel);
  }
  function renderPanel(panel){
    let map,side,items;try{map=state.map;side=state.side||'attack';items=currentItems()}catch(_e){return}if(!map||items.length<5)return;
    const play=selectedPlay(map,side),model=buildModel({map,side,playId:play?.id,items});const sig=JSON.stringify([map,side,play?.id,items,runtime.mode,runtime.zoom,runtime.layers]);if(panel.dataset.v3sig===sig)return;panel.dataset.v3sig=sig;panel.classList.add('v3-upgraded');panel.innerHTML=boardHtml(model);bind(panel,model);
  }
  function brand(){
    try{document.querySelectorAll('.teambtn[data-team]').forEach(btn=>{if(btn.querySelector('.team-logo'))return;const url=runtime.logos.get(String(btn.dataset.team));if(!url)return;const img=document.createElement('img');img.className='team-logo';img.src=url;img.alt='';btn.prepend(img)});const t=currentTeam(),sel=document.querySelector('.selected-team');if(t&&sel&&!sel.querySelector('.selected-team-logo')){const url=runtime.logos.get(String(t.id));if(url){const img=document.createElement('img');img.className='selected-team-logo';img.src=url;img.alt='';sel.prepend(img)}}}catch(_e){}
  }
  function enhance(){runtime.scheduled=false;brand();document.querySelectorAll('.map-panel').forEach(renderPanel)}
  function schedule(){if(runtime.scheduled)return;runtime.scheduled=true;requestAnimationFrame(enhance)}
  if(typeof document!=='undefined'){
    fetch('./team-logos.json',{cache:'no-store'}).then(r=>r.ok?r.json():{}).then(j=>{for(const[k,v]of Object.entries(j||{}))runtime.logos.set(String(k),v);schedule()}).catch(()=>{});
    fetch('https://valorant-api.com/v1/maps').then(r=>r.ok?r.json():{data:[]}).then(j=>{const changed=hydrateMaps(j.data||[]);if(changed){document.querySelectorAll('.map-panel').forEach(p=>p.dataset.v3sig='')}schedule()}).catch(()=>{});
    new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});schedule();
  }
  return{buildModel,renderPanel,runtime,labelClass,hydrateMaps};
});