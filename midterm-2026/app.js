(()=>{
"use strict";
const SOURCES={
ncsl:{name:"NCSL",url:"https://www.ncsl.org/news/details/2026-state-legislative-elections-the-results-and-what-they-mean"},
ballot:{name:"Ballotpedia",url:"https://news.ballotpedia.org/2026/11/04/democrats-win-u-s-house-and-senate-majorities/"},
ballot5:{name:"Ballotpedia (Nov 5)",url:"https://news.ballotpedia.org/2026/11/05/democrats-senate-gains-qualify-as-a-wave-election-while-house-gains-so-far-fall-short/"},
house:{name:"Polling Desk",url:"https://polling-desk.com/house-flips"}
};
const EVENTS=[];
function add(state,type,title,detail,source,status){EVENTS.push({state:state,type:type,title:title,detail:detail,source:source||"ncsl",status:status||"called"});}
[
["IA","Josh Turek","Ashley Hinson"],["KS","Adam Hamilton","Roger Marshall"],["ME","Troy Jackson","Susan Collins"],
["NC","Roy Cooper","Michael Whatley"],["OH","Sherrod Brown","Jon Husted"],["SC","Annie Andrews","Darline Graham"],
["TX","James Talarico","Ken Paxton"]
].forEach(r=>add(r[0],"senate","U.S. Senate · "+r[1],"Republican-held seat flipped to Democrat; defeated "+r[2]+".","ballot"));
[
["GA","Keisha Lance Bottoms","Rick Jackson"],["IA","Rob Sand","Zach Lahn"],["NV","Aaron Ford","Joe Lombardo"],
["OH","Amy Acton","Vivek Ramaswamy"],["TX","Gina Hinojosa","Greg Abbott"]
].forEach(r=>add(r[0],"governor","Governor · "+r[1],"Republican-held governorship gained; defeated "+r[2]+".",r[0]==="NV"?"ncsl":"ballot"));
[
["MI","State House","Republican → Democratic"],["MN","State House","Tied → Democratic"],
["NH","State House","Republican → Democratic"],["NH","State Senate","Republican → Democratic"],
["NC","State House","Republican → Democratic"],["PA","State Senate","Republican → Democratic"],
["TX","State House","Republican → Democratic"],["WI","State House","Republican → Democratic"],
["WI","State Senate","Republican → Democratic"]
].forEach(r=>add(r[0],"chamber",r[1],r[2],"ncsl"));
["MI","MN","NV","PA","WI"].forEach(s=>add(s,"trifecta","New Democratic trifecta","Democratic governor + both state legislative chambers; formerly divided government.","ncsl"));
["GA","IA","NH","OH","TX"].forEach(s=>add(s,"broken","Republican trifecta ended","New divided state government following a Democratic gain.","ncsl"));
add("AZ","chamber","State Senate · potential flip","Democrats ahead in preliminary reporting; control not yet confirmed.","ncsl","pending");
add("GA","chamber","State House · potential flip","Democrats ahead in preliminary reporting; control not yet confirmed.","ncsl","pending");
const HOUSE=[
["AZ-06","JoAnna Mendoza"],["CA-01","Mike McGuire"],["CA-22","Randy Villegas"],["CA-48","Marni von Wilpert"],
["CO-08","Manny Rutinel"],["IA-01","Christina Bohannan"],["IA-03","Sarah Trone Garriott"],["IN-05","J. D. Ford"],
["MO-02","Fred Wellman"],["NC-06","Cyril Jefferson"],["NC-09","Richard Ojeda"],["NC-11","Jamie Ager"],
["NC-13","Paul Barringer"],["NC-14","Lakesha Womack"],["NE-02","Denise Powell"],["NJ-07","Rebecca Bennett"],
["NV-02","Teresa Benitez-Thompson"],["OH-07","Brian Poindexter"],["OH-15","Don Leonard"],
["PA-01","Bob Harvie"],["PA-07","Bob Brooks"],["PA-08","Paige Cognetti"],["PA-10","Janelle Stelson"],
["TX-15","Bobby Pulido"],["TX-23","Katy Padilla Stout"],["VA-02","Elaine Luria"],
["WI-01","Mitchell Berman"],["WI-03","Rebecca Cooke"]
];
HOUSE.forEach(r=>add(r[0].slice(0,2),"house",r[0]+" · "+r[1],"Republican-held U.S. House district flipped to Democratic.","house"));
const NAMES={};
const $=id=>document.getElementById(id);
const typeNames={house:"U.S. House",senate:"U.S. Senate",governor:"Governor",chamber:"State legislature",trifecta:"Democratic trifecta",broken:"Republican trifecta broken"};
let layer="all",state="PA",term="";
function records(){return EVENTS.filter(e=>(layer==="all"||e.type===layer));}
function matches(e){const name=NAMES[e.state]||e.state;return (name+" "+e.state+" "+e.title+" "+e.detail+" "+typeNames[e.type]).toLowerCase().includes(term);}
function escape(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function anchor(e){const x=SOURCES[e.source];return '<a href="'+x.url+'" target="_blank" rel="noopener noreferrer">'+x.name+' ↗</a>';}
function renderMap(){
 const counts={};records().forEach(e=>{if(!counts[e.state])counts[e.state]={called:0,pending:0};counts[e.state][e.status]++;});
 document.querySelectorAll("#mapContainer path[data-state]").forEach(p=>{
  const code=p.dataset.state,c=counts[code]||{called:0,pending:0};p.classList.remove("called","multi","pending","neutral","selected");
  p.classList.add(c.called>1?"multi":c.called===1?"called":c.pending?"pending":"neutral");
  if(code===state)p.classList.add("selected");
  p.setAttribute("aria-label",p.dataset.name+(c.called?" · "+c.called+" change"+(c.called===1?"":"s"):"")+(c.pending?" · "+c.pending+" uncalled":""));
 });
 const n=Object.values(counts).filter(c=>c.called).length;
 $("mapCount").textContent=n+" states with listed gains"+(layer==="house"?" · "+HOUSE.length+" identifiable congressional district flips":"");
 $("mapSubtitle").textContent=layer==="all"?"All categories, including Republican trifectas lost":(layer==="house"?"State summary of named House district flips":(layer==="broken"?"Republican one-party government ended":(typeNames[layer]||layer)+" gains"));
 $("methodNote").textContent=layer==="house"?"This is a state map, not a district-boundary map. The exact flipped districts are identified in the ledger and when a state is selected.":"Blue states have a listed Democratic gain; darker blue indicates multiple gains. Amber means an uncalled lead. Gray does not mean all races were called or no seat changed.";
}
function renderDetail(){
 $("stateTitle").textContent=NAMES[state]||state;
 $("stateCode").textContent=state;
 const relevant=records().filter(e=>e.state===state);
 $("stateEvents").innerHTML=relevant.length?relevant.map(e=>
 '<article class="event '+(e.status==="pending"?"pending-event":e.type==="broken"?"broken-event":"")+'">'+
 '<div class="kind">'+escape(typeNames[e.type])+(e.status==="pending"?" · NOT CALLED":"")+'</div>'+
 '<h3>'+escape(e.title)+'</h3><p>'+escape(e.detail)+'</p>'+anchor(e)+'</article>'
 ).join(""):'<p class="no-gains">No recorded change in this selected category. Check other categories or the source for outstanding races.</p>';
}
function renderLedger(){
 const rows=records().filter(matches).sort((a,b)=>a.state.localeCompare(b.state)||a.type.localeCompare(b.type)||a.title.localeCompare(b.title));
 $("ledgerRows").innerHTML=rows.length?rows.map(e=>
 '<tr><td><b>'+escape(NAMES[e.state]||e.state)+'</b><div class="small">'+escape(e.state)+'</div></td>'+
 '<td><b>'+escape(e.title)+'</b><div class="small">'+escape(typeNames[e.type])+'</div></td>'+
 '<td>'+escape(e.detail)+'</td><td><span class="'+(e.status==="pending"?"status-pending":"status-called")+'">'+(e.status==="pending"?"Uncalled lead":"Reported flip")+'</span></td>'+
 '<td>'+anchor(e)+'</td></tr>').join(""):'<tr><td colspan="5">No matching changes in this snapshot.</td></tr>';
 $("ledgerDescription").textContent=rows.length+" matching records · "+(layer==="all"?"all categories":typeNames[layer]||layer);
 $("ledgerFootnote").textContent=layer==="house"?"28 named flips in Polling Desk's consulted snapshot; Ballotpedia reported 30 total as of its November 5 morning edition. See methodology.":"A state may appear more than once because governorships, congressional seats, chambers, and trifectas measure different changes. Reported flips are not final certified results.";
}
function render(){document.querySelectorAll("[data-layer]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.layer===layer)));renderMap();renderDetail();renderLedger();}
function selectState(code){state=code;renderMap();renderDetail();}
async function loadMap(){
 try{
 const response=await fetch("./us-states.svg",{cache:"force-cache"});if(!response.ok)throw Error("HTTP "+response.status);
 const raw=await response.text();const parsed=new DOMParser().parseFromString(raw,"image/svg+xml");const svg=parsed.querySelector("svg");
 if(!svg||parsed.querySelector("parsererror"))throw Error("Bad SVG");
 svg.querySelectorAll("path[data-state]").forEach(p=>{NAMES[p.dataset.state]=p.dataset.name;});
 $("mapContainer").replaceChildren(document.importNode(svg,true));
 const tip=$("mapTooltip");
 const stage=$("mapStage");
 stage.addEventListener("click",e=>{const p=e.target.closest("path[data-state]");if(p)selectState(p.dataset.state);});
 stage.addEventListener("keydown",e=>{const p=e.target.closest("path[data-state]");if(p&&(e.key==="Enter"||e.key===" ")){e.preventDefault();selectState(p.dataset.state);}});
 stage.addEventListener("pointermove",e=>{const p=e.target.closest("path[data-state]");if(!p){tip.style.display="none";return;}const c=records().filter(x=>x.state===p.dataset.state);tip.textContent=p.dataset.name+" · "+c.filter(x=>x.status==="called").length+" changes"+(c.some(x=>x.status==="pending")?" · uncalled leads":"");tip.style.display="block";const bounds=stage.getBoundingClientRect();tip.style.left=Math.max(5,Math.min(e.clientX-bounds.left+13,bounds.width-185))+"px";tip.style.top=Math.max(5,e.clientY-bounds.top-37)+"px";});
 stage.addEventListener("pointerleave",()=>tip.style.display="none");
 render();
 }catch(err){$("mapContainer").textContent="Geographic map unavailable. The complete filterable results ledger remains accessible below.";console.error(err);renderDetail();renderLedger();}
}
$("layerButtons").addEventListener("click",e=>{const b=e.target.closest("[data-layer]");if(b){layer=b.dataset.layer;render();}});
$("search").addEventListener("input",e=>{term=e.target.value.trim().toLowerCase();renderLedger();});
$("export").addEventListener("click",()=>{
 const q=s=>'"'+String(s).replace(/"/g,'""')+'"';
 const rows=[["State","State code","Category","Race or control","Change","Status","Source URL"]].concat(records().filter(matches).map(e=>[NAMES[e.state]||e.state,e.state,typeNames[e.type],e.title,e.detail,e.status,SOURCES[e.source].url]));
 const csv=rows.map(r=>r.map(q).join(",")).join("\r\n");
 const blob=new Blob(["\uFEFF",csv],{type:"text/csv;charset=utf-8"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="midterm-2026-democratic-gains-"+layer+".csv";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
$("metricSenate").textContent=EVENTS.filter(e=>e.type==="senate").length;
$("metricGovernor").textContent=EVENTS.filter(e=>e.type==="governor").length;
$("metricChamber").textContent=EVENTS.filter(e=>e.type==="chamber"&&e.status==="called").length;
$("metricTrifecta").textContent=EVENTS.filter(e=>e.type==="trifecta").length;
loadMap();
})();
