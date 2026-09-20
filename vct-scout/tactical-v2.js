(()=>{
  'use strict';
  const TD=window.VCTTacticalData;
  if(!TD)return;

  const runtime={maps:new Map(),logos:new Map(),selected:{},scheduled:false};
  const ROLE_FALLBACK={
    Jett:'Duelist',Raze:'Duelist',Neon:'Duelist',Yoru:'Duelist',Phoenix:'Duelist',Iso:'Duelist',Waylay:'Duelist',
    Sova:'Initiator',Fade:'Initiator',Breach:'Initiator','KAY/O':'Initiator',Kayo:'Initiator',Gekko:'Initiator',Skye:'Initiator',Tejo:'Initiator',
    Omen:'Controller',Viper:'Controller',Brimstone:'Controller',Astra:'Controller',Clove:'Controller',Harbor:'Controller',Miks:'Controller',
    Cypher:'Sentinel',Chamber:'Sentinel',Deadlock:'Sentinel',Vyse:'Sentinel',Killjoy:'Sentinel',Sage:'Sentinel',Veto:'Sentinel'
  };
  const ICONS={smoke:'◯',flash:'✦',recon:'⌖',trap:'△',molly:'⬢',plant:'◆'};

  function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
  function roleOf(agent){
    try{if(typeof Lab!=='undefined'&&Lab?.roleOf)return Lab.roleOf(agent,typeof POOL!=='undefined'?POOL:undefined)||ROLE_FALLBACK[agent]||'Flex'}catch(_e){}
    return ROLE_FALLBACK[agent]||'Flex';
  }
  function imgForAgent(agent){
    try{const u=typeof state!=='undefined'&&state.agentAssets?.get(String(agent).toLowerCase());if(u)return u}catch(_e){}
    return '';
  }
  function currentSide(){try{return state.side||'attack'}catch(_e){return'attack'}}
  function currentMap(){try{return state.map||'Haven'}catch(_e){return'Haven'}}
  function currentMode(){try{return state.mode||'scout'}catch(_e){return'scout'}}

  function currentItems(){
    try{
      if(currentMode()==='lab'){
        const players=state.activePlayers||[];
        let assignment={...state.manual};
        const valid=players.length===5&&players.every(p=>assignment[p])&&new Set(Object.values(assignment)).size===5;
        if(!valid&&typeof recommendations==='function'){
          const rec=recommendations()?.[state.selectedRec||0]||recommendations()?.[0];
          if(rec?.assignment)assignment={...rec.assignment};
        }
        const rows=players.filter(p=>assignment[p]).map(p=>({player:p,agent:assignment[p]}));
        if(rows.length===5)return rows;
      }
      if(state.scoutView==='meta'){
        const agents=state.data?.meta_by_map?.[state.map]?.top_compositions?.[0]?.agents||[];
        return agents.map(a=>({player:'',agent:a}));
      }
      const team=state.data?.teams?.find(t=>Number(t.id)===Number(state.teamId));
      const row=team?.maps?.[state.map];
      const agents=row?.latest?.agents||row?.common?.agents||[];
      return agents.map(a=>({player:'',agent:a}));
    }catch(_e){return[]}
  }

  function teamForContext(){
    try{
      if(currentMode()==='lab')return null;
      if(state.scoutView==='meta')return null;
      return state.data?.teams?.find(t=>Number(t.id)===Number(state.teamId))||null;
    }catch(_e){return null}
  }

  function assignSlots(items,positions){
    const remaining=items.map((x,i)=>({...x,_i:i,role:roleOf(x.agent)}));
    const result=new Array(positions.length);
    const order=positions.map((p,i)=>({p,i})).sort((a,b)=>(a.p.roles?.length||99)-(b.p.roles?.length||99));
    for(const {p,i} of order){
      let best=-1,bestRank=999;
      for(let j=0;j<remaining.length;j++){
        const r=remaining[j];
        const rank=(p.roles||[]).indexOf(r.role);
        if(rank>=0&&rank<bestRank){best=j;bestRank=rank}
      }
      if(best<0)best=0;
      result[i]=remaining.splice(best,1)[0]||{player:'',agent:'?',role:'Flex'};
    }
    return result;
  }

  function textScore(text,alias){
    text=text.toLowerCase();alias=alias.toLowerCase();
    if(text===alias)return 100;
    if(text.startsWith(alias+' '))return 92;
    if(text.includes(alias))return 84;
    const tokens=alias.split(/\s+/).filter(t=>t.length>1);
    if(tokens.length&&tokens.every(t=>text.includes(t)))return 70;
    return 0;
  }
  function pointForAliases(mapName,aliases,fallback){
    const meta=runtime.maps.get(mapName);
    if(meta?.callouts?.length){
      let best=null,bestScore=0;
      for(const c of meta.callouts){
        const txt=`${c.regionName||''} ${c.superRegionName||''}`.trim();
        for(const a of aliases||[]){const s=textScore(txt,a);if(s>bestScore){bestScore=s;best=c}}
      }
      if(best&&bestScore>=70){
        const gx=Number(best.location?.x),gy=Number(best.location?.y);
        const x=gy*Number(meta.xMultiplier)+Number(meta.xScalarToAdd);
        const y=gx*Number(meta.yMultiplier)+Number(meta.yScalarToAdd);
        if(Number.isFinite(x)&&Number.isFinite(y)&&x>=0&&x<=1&&y>=0&&y<=1)return[x*100,y*100,`${best.regionName}${best.superRegionName?` · ${best.superRegionName}`:''}`];
      }
    }
    return[fallback?.[0]??50,fallback?.[1]??50,'template coordinate'];
  }
  function pointForTarget(mapName,target){
    if(!target)return[50,50,''];
    return pointForAliases(mapName,Array.isArray(target)?target:[target],[50,50]);
  }

  function getSelectedPlay(map,side){
    const rows=TD.plays(map,side);
    const key=`${map}|${side}`;
    const wanted=runtime.selected[key]||localStorage.getItem(`vctPlay:${key}`)||rows[0]?.id;
    return rows.find(p=>p.id===wanted)||rows[0]||null;
  }
  function selectPlay(map,side,id){runtime.selected[`${map}|${side}`]=id;localStorage.setItem(`vctPlay:${map}|${side}`,id)}

  function svgArrow(from,to,label,kind,index){
    const x1=from[0]*10,y1=from[1]*10,x2=to[0]*10,y2=to[1]*10;
    const cls=kind==='lurk'?'lurk':kind==='entry'?'entry':'move';
    const mx=(x1+x2)/2,my=(y1+y2)/2;
    return `<g class="route ${cls}"><path d="M ${x1} ${y1} Q ${mx} ${my-24} ${x2} ${y2}" marker-end="url(#arrow-${cls})"/><text x="${mx}" y="${my-12}">${esc(label||'')}</text></g>`;
  }

  function renderTacticalPanel(panel){
    const map=currentMap(),side=currentSide(),play=getSelectedPlay(map,side),items=currentItems();
    if(!play||items.length<1)return;
    const source=TD.sourceFor(map),team=teamForContext();
    const assigned=assignSlots(items,play.positions);
    const points={};
    play.positions.forEach((p,i)=>{points[p.slot]=pointForAliases(map,p.callouts,p.fallback)});
    const signature=JSON.stringify([map,side,play.id,assigned.map(x=>x.agent),team?.id||'',currentMode()]);
    if(panel.dataset.tacticalSignature===signature)return;
    panel.dataset.tacticalSignature=signature;
    panel.classList.add('tactical-upgraded');

    const mapAsset=(()=>{try{return state.mapAssets?.get(map)||runtime.maps.get(map)?.displayIcon||''}catch(_e){return runtime.maps.get(map)?.displayIcon||''}})();
    const teamLogo=team?runtime.logos.get(String(team.id))||'':'';
    const routes=(play.arrows||[]).map((r,i)=>{
      const f=points[r.from]||pointForTarget(map,r.from),t=pointForTarget(map,r.to);
      return svgArrow(f,t,r.label,r.kind,i);
    }).join('');
    const utility=(play.utility||[]).map(u=>{
      const p=pointForAliases(map,u.callouts,u.fallback);return `<div class="utilmark ${esc(u.kind)}" style="left:${p[0]}%;top:${p[1]}%" title="${esc(u.label)}"><span>${ICONS[u.kind]||'•'}</span><b>${esc(u.label)}</b></div>`
    }).join('');
    const markers=play.positions.map((p,i)=>{
      const q=points[p.slot],a=assigned[i]||{agent:'?',player:''},img=imgForAgent(a.agent);
      return `<div class="tacmarker role-${esc(String(a.role).toLowerCase())}" style="left:${q[0]}%;top:${q[1]}%"><div class="tacavatar">${img?`<img src="${esc(img)}" alt="">`:`<span>${esc(a.agent.slice(0,2))}</span>`}</div><div class="taclabel"><b>${esc(a.player?`${a.player} · ${a.agent}`:a.agent)}</b><span>${esc(p.label)}</span></div></div>`
    }).join('');

    panel.innerHTML=`
      <div class="tactical-head">
        <div class="tactical-title-row">
          ${teamLogo?`<img class="panel-team-logo" src="${esc(teamLogo)}" alt="${esc(team?.name||'')} logo">`:''}
          <div><h3>${esc(map)} tactical board</h3><p>${esc(play.title)} · ${esc(play.tempo)}</p></div>
        </div>
        <div class="tactical-controls">
          <div class="side-switch"><button data-tactical-side="attack" class="${side==='attack'?'active':''}">Attack</button><button data-tactical-side="defense" class="${side==='defense'?'active':''}">Defense</button></div>
          <label>Play<select data-play-select>${TD.plays(map,side).map(p=>`<option value="${esc(p.id)}" ${p.id===play.id?'selected':''}>${esc(p.title)}</option>`).join('')}</select></label>
        </div>
      </div>
      <div class="tactical-source-strip">
        <span class="observed-badge">REPLAY-BACKED EXAMPLE</span>
        <span><b>${esc(source?.label||'VCT replay source')}</b>${source?.score?` · ${esc(source.score)}`:''}</span>
        ${source?.url?`<a href="${esc(source.url)}" target="_blank" rel="noopener">Open RIB 2D replay ↗</a>`:''}
        <a href="https://valoplant.gg/matches" target="_blank" rel="noopener">Open ValoPlant replay viewer ↗</a>
      </div>
      <div class="tactical-layout">
        <div class="tactical-map-shell">
          <div class="tactical-square">
            ${mapAsset?`<img class="tactical-map-img" src="${esc(mapAsset)}" alt="${esc(map)} minimap">`:`<div class="tactical-map-fallback">${esc(map)}</div>`}
            <svg class="route-layer" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <marker id="arrow-move" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z"/></marker>
                <marker id="arrow-entry" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z"/></marker>
                <marker id="arrow-lurk" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z"/></marker>
              </defs>${routes}
            </svg>
            ${utility}${markers}
          </div>
          <div class="map-key"><span><i class="keyline entry"></i>entry</span><span><i class="keyline move"></i>support path</span><span><i class="keyline lurk"></i>lurk</span><span>◯ smoke</span><span>⌖ info</span><span>△ trap</span></div>
        </div>
        <aside class="play-inspector">
          <div class="play-kicker">${side==='attack'?'ATTACK PROTOCOL':'DEFENSE SETUP'}</div>
          <h4>${esc(play.title)}</h4>
          <div class="tempo-chip">Tempo: ${esc(play.tempo)}</div>
          <div class="assignment-list">${play.positions.map((p,i)=>{const a=assigned[i]||{agent:'?',player:'',role:'Flex'};return `<div class="assignment-line"><span class="mini-avatar">${imgForAgent(a.agent)?`<img src="${esc(imgForAgent(a.agent))}" alt="">`:esc(a.agent.slice(0,2))}</span><div><b>${esc(a.player?`${a.player} · ${a.agent}`:a.agent)}</b><span>${esc(p.label)} · ${esc(a.role)}</span></div></div>`}).join('')}</div>
          <ol class="play-notes">${(play.notes||[]).map(n=>`<li>${esc(n)}</li>`).join('')}</ol>
          <div class="truth-note"><b>What is sourced:</b> the linked VCT match and replay are real. The board converts Riot/Valorant-API map callout coordinates into the minimap and maps your selected agents onto a common VCT-style structure. It does not claim these arrows are the exact hidden protocol from that pro round.</div>
        </aside>
      </div>`;

    panel.querySelectorAll('[data-tactical-side]').forEach(b=>b.addEventListener('click',()=>{
      try{state.side=b.dataset.tacticalSide; if(typeof render==='function')render(); else enhanceAll(true)}catch(_e){}
    }));
    panel.querySelector('[data-play-select]')?.addEventListener('change',e=>{selectPlay(map,side,e.target.value);panel.dataset.tacticalSignature='';renderTacticalPanel(panel)});
  }

  function logoForTeamId(id){return runtime.logos.get(String(id))||''}
  function addImg(parent,url,cls,alt){if(!parent||!url||parent.querySelector(`:scope > img.${cls}`))return;const img=document.createElement('img');img.src=url;img.alt=alt||'';img.className=cls;parent.prepend(img)}
  function enhanceBranding(){
    try{
      document.querySelectorAll('.teambtn[data-team]').forEach(btn=>{
        const t=state.data?.teams?.find(x=>Number(x.id)===Number(btn.dataset.team));
        addImg(btn,logoForTeamId(btn.dataset.team),'team-logo',t?`${t.name} logo`:'team logo');
      });
      const sel=document.querySelector('.selected-team');
      if(sel){const t=teamForContext()||state.data?.teams?.find(x=>Number(x.id)===Number(state.teamId));if(t)addImg(sel,logoForTeamId(t.id),'selected-team-logo',`${t.name} logo`)}
      document.querySelectorAll('.simrow').forEach(row=>{
        const tag=row.querySelector('b')?.textContent?.trim();
        const t=state.data?.teams?.find(x=>x.tag===tag);const holder=row.firstElementChild;
        if(t&&holder)addImg(holder,logoForTeamId(t.id),'sim-team-logo',`${t.name} logo`)
      });
      document.querySelectorAll('.template .source').forEach(el=>{
        const txt=el.textContent||'';const t=state.data?.teams?.find(x=>txt.trim().startsWith(x.tag));if(t)addImg(el,logoForTeamId(t.id),'template-team-logo',`${t.name} logo`)
      });
    }catch(_e){}
  }

  function enhanceAll(force=false){
    runtime.scheduled=false;
    enhanceBranding();
    document.querySelectorAll('.map-panel').forEach(p=>renderTacticalPanel(p));
  }
  function schedule(){if(runtime.scheduled)return;runtime.scheduled=true;requestAnimationFrame(()=>enhanceAll())}

  async function loadExternalData(){
    const tasks=[];
    tasks.push(fetch('https://valorant-api.com/v1/maps').then(r=>r.json()).then(j=>{for(const m of j.data||[])runtime.maps.set(m.displayName,m)}).catch(()=>{}));
    tasks.push(fetch('./team-logos.json',{cache:'no-store'}).then(r=>r.ok?r.json():{}).then(j=>{for(const [k,v] of Object.entries(j||{}))if(v)runtime.logos.set(String(k),v)}).catch(()=>{}));
    await Promise.all(tasks);enhanceAll(true);
  }

  const obs=new MutationObserver(schedule);
  obs.observe(document.documentElement,{childList:true,subtree:true});
  window.VCTTactical={runtime,enhance:enhanceAll,pointForAliases,assignSlots};
  loadExternalData();
  schedule();
})();
