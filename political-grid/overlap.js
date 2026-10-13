"use strict";
// Every circle occupies the corresponding position in the original 10x10 image.
(() => {
  const $h = id => document.getElementById(id);
  const COLORS = ["#ff5a5f","#4f7cff","#2ecc71","#ffb020"];
  const MIX = {3:"#a65cff",5:"#d7c05a",6:"#40bfd6",9:"#ff8d58",10:"#aa9cdf",12:"#a1db4d",7:"#e2beff",11:"#ffcab9",13:"#d9f39e",14:"#bfdcfa",15:"#ffffff"};
  const EDGE=45,STEP=101,R=40,SIZE=1100;
  const view = { mode:"community", filter:"any", exact:1, selected:["me"], profiles:[], loading:false, error:"",hover:-1,pinned:-1 };
  const bits = n => { let count=0;while(n){count+=n&1;n>>>=1;}return count; };
  const coords = id => {const q=Math.floor(id/25),p=id%25;return {x:(q%2)*5+p%5,y:Math.floor(q/2)*5+Math.floor(p/5)};};
  const at = (x,y) => (Math.floor(y/5)*2+Math.floor(x/5))*25+(y%5)*5+(x%5);
  const toHex = (hex,a) => {
    const rgb=[1,3,5].map(i=>parseInt(hex.substring(i,i+2),16));
    return "rgba("+rgb.join(",")+","+Math.max(0,Math.min(1,a))+")";
  };
  function people() {
    const options=[{id:"me",name:"You (live)",picks:[...state.picks],local:true},...view.profiles];
    return view.selected.map((key,i)=>options.find(p=>p.id===key)).filter(Boolean).slice(0,4)
      .map((p,i)=>({...p,set:new Set(p.picks),color:COLORS[i]}));
  }
  function mask(id,selected){return selected.reduce((m,p,i)=>m+(p.set.has(id)?(1<<i):0),0);}
  function combo(maskValue,selected){return selected.filter((p,i)=>maskValue&(1<<i)).map(p=>p.name).join(" + ");}
  function color(maskValue){return bits(maskValue)===1?COLORS[Math.log2(maskValue)]:MIX[maskValue]||"#f9f9fb";}
  function shown(m,n){
    if(!m)return false;
    if(view.filter==="shared")return bits(m)>=2;
    if(view.filter==="single")return bits(m)===1;
    if(view.filter==="all")return m===(1<<n)-1;
    if(view.filter==="exact")return m===view.exact;
    return true;
  }
  function node(parent,tag,text,cls){
    const e=document.createElement(tag);
    if(cls)e.className=cls;
    e.textContent=String(text);parent.append(e);return e;
  }
  function reset(el){el.replaceChildren();}

  // Reuse the same DOM nodes to avoid losing hover/focus while people and filters change.
  const tiles = new Map();
  function blended(rgbHex, amount) {
    const base=[23,32,42], target=[1,3,5].map(i=>parseInt(rgbHex.slice(i,i+2),16));
    return base.map((v,i)=>Math.round(v+(target[i]-v)*Math.min(1,Math.max(0,amount))));
  }
  function contrastText(rgb) {
    const linear = rgb.map(v => {
      const s=v/255;
      return s<=.04045?s/12.92:Math.pow((s+.055)/1.055,2.4);
    });
    const lum=.2126*linear[0]+.7152*linear[1]+.0722*linear[2];
    return (1.05/(lum+.05) > (lum+.05)/.018) ? "#f4f7fa" : "#101820";
  }
  function highlight() {
    for (const [id, cell] of tiles) {
      cell.button.classList.toggle("inspected", id===view.pinned || id===view.hover);
      cell.button.setAttribute("aria-pressed", String(id===view.pinned));
    }
  }
  function setHovered(id) {
    if(view.hover===id) return;
    view.hover=id;
    highlight();
    inspect();
  }
  function ensureTiles() {
    const grid=$h("overlap-box-grid");
    if (!grid || tiles.size) return;
    const ordered=[...STATEMENTS].sort((a,b)=>{
      const aa=coords(a.id),bb=coords(b.id);
      return aa.y-bb.y || aa.x-bb.x;
    });
    for(const statement of ordered) {
      const pos=coords(statement.id),button=document.createElement("button");
      button.type="button";
      button.className="overlap-tile";
      button.dataset.id=String(statement.id);
      button.style.gridColumn=String(pos.x+1);
      button.style.gridRow=String(pos.y+1);
      if(pos.x===5)button.classList.add("boundary-left");
      if(pos.y===5)button.classList.add("boundary-top");
      button.setAttribute("aria-label", String(statement.id+1)+". "+statement.label+". Inspect comparison details");
      button.title=statement.label;
      const index=node(button,"span",String(statement.id+1).padStart(2,"0"),"overlap-tile-index");
      const label=node(button,"span",statement.label,"overlap-tile-label");
      const value=node(button,"span","","overlap-tile-value");
      const local=node(button,"span","","overlap-tile-local");
      local.setAttribute("aria-hidden","true");
      button.addEventListener("mouseenter",()=>setHovered(statement.id));
      button.addEventListener("mouseleave",()=>setHovered(-1));
      button.addEventListener("focus",()=>setHovered(statement.id));
      button.addEventListener("blur",()=>setHovered(-1));
      button.addEventListener("click",()=>{
        view.pinned=view.pinned===statement.id?-1:statement.id;
        highlight();
        inspect();
      });
      grid.append(button);
      tiles.set(statement.id,{button,index,label,value,local});
    }
  }
  function renderTiles() {
    ensureTiles();
    const selected=people(),n=selected.length,globalN=state.stats?.respondents||0;
    for(const statement of STATEMENTS) {
      const cell=tiles.get(statement.id);
      if(!cell) continue;
      let fraction=0, paint=statement.color, active=false, intensity=.14, summary="No saved responses yet";
      if(view.mode==="community") {
        fraction=globalN?state.stats.counts[statement.id]/globalN:0;
        intensity=globalN ? .20+.80*fraction : .14;
        active=globalN>0 && fraction>0;
        summary=globalN ? Math.round(fraction*100)+"% of "+globalN+" submissions" : "No saved responses";
        cell.value.textContent=globalN?Math.round(fraction*100)+"%":"";
      }else{
        const matched=mask(statement.id,selected);
        active=shown(matched,n);
        paint=active?color(matched):statement.color;
        intensity=active?.91:.09;
        summary=active?bits(matched)+" of "+n+" selected: "+combo(matched,selected):"No match for current overlap filter";
        cell.value.textContent=active?bits(matched)+" / "+n:"";
      }
      const rgb=blended(paint,intensity);
      cell.button.style.backgroundColor="rgb("+rgb.join(",")+")";
      cell.button.style.color=contrastText(rgb);
      cell.button.classList.toggle("overlap-tile-selected",active);
      cell.button.classList.toggle("overlap-tile-muted",!active);
      cell.button.classList.toggle("overlap-tile-local-marked",state.picks.has(statement.id));
      cell.local.hidden=!state.picks.has(statement.id);
      cell.button.setAttribute("aria-description",summary);
      cell.value.hidden=!cell.value.textContent;
    }
    highlight();
    const legend=$h("heatmap-legend");reset(legend);
    if(view.mode==="community"){
      node(legend,"span",globalN+" saved responses");
      node(legend,"div","","density-scale");
      node(legend,"span","0% selected → 100% selected");
    }else {
      selected.forEach(p=>{
        const chip=node(legend,"span","","legend-person");
        const dot=node(chip,"i","");dot.style.background=p.color;
        node(chip,"span",p.name);
      });
      node(legend,"span",selected.length?"Solid box colors indicate who marked each statement":"Select people to see their X marks");
    }
  }
  function inspect(){
    const id=view.hover>=0?view.hover:view.pinned;
    const title=$h("inspect-statement"),detail=$h("inspect-details");reset(detail);
    if(id<0){
       $h("inspect-index").textContent="SELECT A BOX";
      title.textContent="Hover over or select a statement box to inspect it.";
      node(detail,"p","Selection counts and exact participant matches appear here.");
      return;
    }
    $h("inspect-index").textContent="STATEMENT "+String(id+1).padStart(2,"0")+" / "+STATEMENTS[id].groupName.toUpperCase();
    title.textContent=STATEMENTS[id].label;
    if(state.stats?.respondents){
      const n=state.stats.respondents,yes=state.stats.counts[id];
      node(detail,"p",yes+" of "+n+" saved responses selected it ("+(100*yes/n).toFixed(1)+"%).");
    }else node(detail,"p","No community responses have been saved yet.");
    if(view.mode==="people"){
      const selected=people(),marked=selected.filter(p=>p.set.has(id));
      node(detail,"p",marked.length+" / "+selected.length+" selected people marked it.");
      if(marked.length){
        const wrap=node(detail,"div","","inspect-tags");
        marked.forEach(p=>{const badge=node(wrap,"span",p.name);badge.style.borderColor=p.color;});
      }
      node(detail,"p","Exact combination: "+(marked.map(p=>p.name).join(" + ")||"Nobody marked it"),"inspect-small");
    }
    node(detail,"p",state.picks.has(id)?"Your live grid: checked":"Your live grid: not checked","inspect-small");
  }
  function presetUi(){
    const isPeople=view.mode==="people";
    $h("mode-community").classList.toggle("active",!isPeople);
    $h("mode-people").classList.toggle("active",isPeople);
    $h("mode-community").setAttribute("aria-pressed",String(!isPeople));
    $h("mode-people").setAttribute("aria-pressed",String(isPeople));
    $h("overlap-person-panel").hidden=!isPeople;
    $h("overlap-mode-hint").textContent=isPeople?
      "Each colored box shows which selected people marked that statement. Shared statements use combination colors.":
      "Brighter boxes mean a higher percentage of all saved responses selected them.";
    $h("heatmap-title").textContent=isPeople?"Multi-person intersection heatmap":"Community selection density";
    $h("heatmap-badge").textContent=isPeople?people().length+" people":"All saved responses";
    for(const b of $h("overlap-presets").querySelectorAll("[data-filter]")){
      b.classList.toggle("active",b.dataset.filter===view.filter);
      b.setAttribute("aria-pressed",String(b.dataset.filter===view.filter));
    }
    $h("exact-controls").hidden=view.filter!=="exact";
  }
  function toggle(id){
    if(view.selected.includes(id))view.selected=view.selected.filter(k=>k!==id);
    else if(view.selected.length<4)view.selected.push(id);
    view.exact=(1<<view.selected.length)-1;picker();render();
  }
  function picker(){
    presetUi();
    const selected=people(),chips=$h("overlap-selected-chips"),list=$h("overlap-people-list");
    reset(chips);reset(list);
    $h("overlap-selected-count").textContent=selected.length+" / 4";
    selected.forEach(p=>{
      const b=node(chips,"button",p.name+" ×","person-chip");
      b.type="button";b.style.setProperty("--person-color",p.color);
      b.addEventListener("click",()=>toggle(p.id));
    });
    const query=$h("overlap-search").value.trim().toLocaleLowerCase();
    const options=[{id:"me",name:"You (live)",picks:[...state.picks],local:true},...view.profiles]
      .filter(p=>p.name.toLocaleLowerCase().includes(query)).slice(0,100);
    for(const p of options){
      const active=view.selected.includes(p.id);
      const b=node(list,"button","","person-option"+(active?" chosen":""));
      b.type="button";b.disabled=!active&&view.selected.length>=4;
      b.setAttribute("aria-pressed",String(active));
      node(b,"span",p.name);node(b,"small",(p.local?"Local":"Opted in")+" · "+p.picks.length+" marks");
      node(b,"b",active?"✓":"+");
      b.addEventListener("click",()=>toggle(p.id));
    }
    $h("overlap-browser-note").textContent=view.error?"Profile lookup failed: "+view.error:view.loading?
      "Loading public profiles…":view.profiles.length?
      view.profiles.length+" public profiles loaded (latest 200 maximum). If your own saved name is visible, avoid comparing it with “You (live)” as two separate people.":
      "No opt-in profiles yet. You can inspect your local marks or community density.";
    const select=$h("exact-combo");reset(select);
    for(let m=1;m<(1<<selected.length);m++){
      const opt=node(select,"option",bits(m)+" · "+combo(m,selected));opt.value=String(m);
    }
    if(!selected.length)view.exact=0;
    else if(!view.exact||view.exact>=(1<<selected.length))view.exact=(1<<selected.length)-1;
    select.value=String(view.exact);
  }
  function barRow(target,title,value,pct,paint,onclick){
    const row=node(target,onclick?"button":"div","","overlap-row");
    if(onclick){row.type="button";row.addEventListener("click",onclick);}
    const titleEl=node(row,"span",title,"overlap-row-title");titleEl.title=title;
    const track=node(row,"i","","overlap-row-track"),fill=node(track,"i","");
    fill.style.width=Math.max(0,Math.min(100,pct))+"%";fill.style.background=paint;
    node(row,"b",value,"overlap-row-value");
  }
  function analytics(){
    const selected=people(),n=selected.length;
    const comboPanel=$h("overlap-combinations"),pairPanel=$h("overlap-pairs"),groupPanel=$h("overlap-group-profile"),commonPanel=$h("overlap-common");
    [comboPanel,pairPanel,groupPanel,commonPanel].forEach(reset);
    if(!n){
      [comboPanel,pairPanel,groupPanel,commonPanel].forEach(target=>node(target,"p","Choose a person to start comparing.","empty"));
      return;
    }
    const masks=STATEMENTS.map(s=>mask(s.id,selected)),dist=new Map();
    masks.forEach(m=>dist.set(m,(dist.get(m)||0)+1));
    node(comboPanel,"p",(dist.get(0)||0)+" statements marked by none of these people.","mini-hint");
    [...dist].filter(([m])=>m!==0).sort((a,b)=>b[1]-a[1]).forEach(([m,quantity])=>{
      barRow(comboPanel,combo(m,selected),quantity+" / 100",quantity,color(m),()=>{
        view.mode="people";view.filter="exact";view.exact=m;picker();render();
        $h("overlap-box-grid").scrollIntoView({block:"center",behavior:"smooth"});
      });
    });
    if(n<2)node(pairPanel,"p","Choose at least two people for pairwise Jaccard similarity.","empty");
    else {
      const table=node(pairPanel,"table","","pair-table"),thead=node(table,"thead",""),tr=node(thead,"tr","");
      node(tr,"th","");
      selected.forEach(p=>node(tr,"th",p.name));
      const tbody=node(table,"tbody","");
      for(const p of selected){
        const r=node(tbody,"tr","");node(r,"th",p.name);
        for(const q of selected){
          const intersection=STATEMENTS.filter(s=>p.set.has(s.id)&&q.set.has(s.id)).length;
          const union=p.set.size+q.set.size-intersection;
          const score=union?intersection/union:null;
          const cell=node(r,"td",score===null?"N/A":Math.round(score*100)+"%");
          cell.title=intersection+" shared X / "+union+" marked by either";
          cell.style.background=score===null?"#292c32":"rgba(220,255,128,"+(.08+.48*score).toFixed(3)+")";
        }
      }
    }
    const table=node(groupPanel,"table","","group-profile-table");
    const h=node(table,"thead",""),hr=node(h,"tr","");
    node(hr,"th","Group");selected.forEach(p=>node(hr,"th",p.name));
    const body=node(table,"tbody","");
    GROUPS.forEach((g,i)=>{
      const tr=node(body,"tr",""),label=node(tr,"th",g.name);label.style.borderLeft="4px solid "+g.color;
      selected.forEach(p=>{
        const count=[...p.set].filter(id=>Math.floor(id/25)===i).length;
        const cell=node(tr,"td","");node(cell,"span",count+" / 25");
        const track=node(cell,"div","","group-profile-track");
        const fill=node(track,"i","");fill.style.width=count*4+"%";fill.style.background=g.color;
      });
    });
    const shared=STATEMENTS.map(s=>({...s,total:bits(masks[s.id])}))
      .filter(s=>s.total>=2).sort((a,b)=>b.total-a.total||a.id-b.id).slice(0,12);
    if(!shared.length)node(commonPanel,"p","No statement is marked by two or more selected people.","empty");
    shared.forEach(s=>barRow(commonPanel,String(s.id+1).padStart(2,"0")+". "+s.label,s.total+" / "+n,100*s.total/n,s.color,()=>{
      view.pinned=s.id;view.hover=-1;render();
      $h("overlap-box-grid").scrollIntoView({block:"center",behavior:"smooth"});
    }));
  }
  function render(){if(!$h("overlap-box-grid"))return;presetUi();renderTiles();inspect();analytics();}
  async function reload(){
    if(view.loading)return;
    view.loading=true;view.error="";picker();
    try{
      const rows=await rpc("political_grid_visible",{});
      if(!Array.isArray(rows))throw Error("Invalid response");
      view.profiles=rows.filter(p=>p&&/^[0-9a-f]{32}$/.test(p.id)&&typeof p.name==="string"&&
        p.name.trim().length>=2&&p.name.length<=40&&Array.isArray(p.picks)&&p.picks.length<=100&&
        p.picks.every(id=>Number.isInteger(id)&&id>=0&&id<100)&&new Set(p.picks).size===p.picks.length)
        .slice(0,200);
      const ids=new Set(["me",...view.profiles.map(p=>p.id)]);
      view.selected=view.selected.filter(k=>ids.has(k));
      if(!view.selected.length)view.selected=["me"];
    }catch(error){view.error=error.message||"Network unavailable";}
    finally{view.loading=false;picker();render();}
  }
  function setup(){
    $h("mode-community").addEventListener("click",()=>{view.mode="community";picker();render();});
    $h("mode-people").addEventListener("click",()=>{view.mode="people";picker();render();});
    $h("overlap-search").addEventListener("input",picker);
    $h("overlap-refresh").addEventListener("click",reload);
    $h("overlap-only-me").addEventListener("click",()=>{view.selected=["me"];view.exact=1;picker();render();});
    $h("overlap-presets").addEventListener("click",event=>{
      const b=event.target.closest("[data-filter]");if(!b)return;
      view.filter=b.dataset.filter;if(view.filter==="exact")view.exact=(1<<people().length)-1;
      picker();render();
    });
    $h("exact-combo").addEventListener("change",e=>{view.exact=Number(e.target.value);render();});
    picker();render();reload();
  }
  window.PoliticalGridOverlap={render,reload,coords,at,mask,bits,shown};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",setup);
  else setup();
})();