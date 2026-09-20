(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  if(root) root.VCTCompLab=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const DEFAULT_PLAYER_POOL={
    Linh:{Duelist:['Raze','Phoenix','Jett','Iso'],Initiator:['Breach','Sova','KAY/O'],Sentinel:['Cypher','Chamber','Deadlock','Vyse'],Controller:['Astra','Omen','Viper','Brimstone','Miks']},
    Jon:{Duelist:[],Initiator:['Sova','Tejo','Fade'],Sentinel:['Cypher','Chamber','Vyse'],Controller:['Viper','Omen','Brimstone']},
    Ben:{Duelist:['Waylay','Phoenix'],Initiator:['KAY/O'],Sentinel:['Deadlock','Chamber'],Controller:['Clove']},
    Tommy:{Duelist:['Iso'],Initiator:['Breach','Sova','Skye','Gekko'],Sentinel:['Chamber'],Controller:['Brimstone','Clove','Miks']},
    Dylan:{Duelist:['Neon','Phoenix','Yoru','Waylay','Raze'],Initiator:[],Sentinel:['Cypher'],Controller:[]},
    Backup:{Michael:{Duelist:['Iso'],Initiator:['Fade'],Sentinel:['Vyse'],Controller:['Omen']}}
  };
  const ROLE_ORDER=['Duelist','Initiator','Sentinel','Controller'];
  const KNOWN_ROLES={
    Raze:'Duelist',Phoenix:'Duelist',Jett:'Duelist',Iso:'Duelist',Waylay:'Duelist',Neon:'Duelist',Yoru:'Duelist',Reyna:'Duelist',
    Breach:'Initiator',Sova:'Initiator','KAY/O':'Initiator',Tejo:'Initiator',Fade:'Initiator',Skye:'Initiator',Gekko:'Initiator',
    Cypher:'Sentinel',Chamber:'Sentinel',Deadlock:'Sentinel',Vyse:'Sentinel',Killjoy:'Sentinel',Sage:'Sentinel',
    Astra:'Controller',Omen:'Controller',Viper:'Controller',Brimstone:'Controller',Miks:'Controller',Clove:'Controller',Harbor:'Controller'
  };
  function resolvePlayer(name,pool=DEFAULT_PLAYER_POOL){return pool[name]||(pool.Backup&&pool.Backup[name])||null}
  function defaultActivePlayers(pool=DEFAULT_PLAYER_POOL){return Object.keys(pool).filter(k=>k!=='Backup').slice(0,5)}
  function allPlayers(pool=DEFAULT_PLAYER_POOL){return [...Object.keys(pool).filter(k=>k!=='Backup'),...Object.keys(pool.Backup||{})]}
  function playerChoices(name,pool=DEFAULT_PLAYER_POOL){
    const row=resolvePlayer(name,pool);if(!row)return[];const seen=new Set(),out=[];
    for(const role of ROLE_ORDER)for(const agent of row[role]||[])if(!seen.has(agent)){seen.add(agent);out.push({agent,role})}
    return out
  }
  function roleOf(agent,pool=DEFAULT_PLAYER_POOL){
    if(KNOWN_ROLES[agent])return KNOWN_ROLES[agent];
    for(const p of allPlayers(pool)){const row=resolvePlayer(p,pool)||{};for(const role of ROLE_ORDER)if((row[role]||[]).includes(agent))return role}
    return'Flex'
  }
  function roleCounts(agents,pool=DEFAULT_PLAYER_POOL){const counts={Duelist:0,Initiator:0,Sentinel:0,Controller:0,Flex:0};for(const a of agents)counts[roleOf(a,pool)]=(counts[roleOf(a,pool)]||0)+1;return counts}
  function setOverlap(a,b){const sb=new Set(b||[]);return[...new Set(a||[])].filter(x=>sb.has(x)).length}
  function similarityPct(a,b){const den=Math.max(new Set(a||[]).size,new Set(b||[]).size,1);return Math.round(100*setOverlap(a,b)/den)}
  function observedCompositions(meta,extra=[]){const rows=[];for(const c of(meta&&meta.top_compositions)||[])if(c&&c.agents)rows.push(c);for(const c of extra||[])if(c&&c.agents)rows.push(c);return rows}
  function targetRoleProfiles(observed,pool){
    if(!observed.length)return[{Duelist:1,Initiator:2,Sentinel:1,Controller:1}];const counts=new Map();
    for(const c of observed){const r=roleCounts(c.agents,pool),key=ROLE_ORDER.map(k=>r[k]||0).join('-');counts.set(key,(counts.get(key)||0)+(Number(c.games)||1))}
    return[...counts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,3).map(([key])=>{const n=key.split('-').map(Number);return Object.fromEntries(ROLE_ORDER.map((r,i)=>[r,n[i]]))})
  }
  function roleFitScore(agents,profiles,pool){const actual=roleCounts(agents,pool);let best=0;for(const target of profiles){const diff=ROLE_ORDER.reduce((s,r)=>s+Math.abs((actual[r]||0)-(target[r]||0)),0);best=Math.max(best,Math.max(0,100-diff*20))}return best}
  function agentMetaScore(agents,meta){const rates=new Map(((meta&&meta.agent_pick_rates)||[]).map(x=>[x.agent,Number(x.rate)||0])),max=Math.max(1,...rates.values());return Math.round(agents.reduce((s,a)=>s+(rates.get(a)||0)/max,0)/Math.max(agents.length,1)*100)}
  function vctSimilarityScore(agents,observed){return observed.reduce((best,c)=>Math.max(best,similarityPct(agents,c.agents||[])),0)}
  function coverageStats(agents,meta){const rates=new Map(((meta&&meta.agent_pick_rates)||[]).map(x=>[x.agent,Number(x.rate)||0])),total=agents.reduce((s,a)=>s+(rates.get(a)||0),0),maxTop=((meta&&meta.agent_pick_rates)||[]).slice(0,5).reduce((s,x)=>s+(Number(x.rate)||0),0)||1;return{metaCoverage:Math.min(100,Math.round(100*total/maxTop)),pickedRates:agents.map(a=>({agent:a,rate:rates.get(a)||0}))}}
  function scoreAssignment(assignment,pool,meta,extraObserved=[]){const agents=Object.values(assignment),observed=observedCompositions(meta,extraObserved),profiles=targetRoleProfiles(observed,pool),metaFit=agentMetaScore(agents,meta),similarity=vctSimilarityScore(agents,observed),roleFit=roleFitScore(agents,profiles,pool),score=Math.round(metaFit*.45+similarity*.35+roleFit*.20);return{score,metaFit,similarity,roleFit,...coverageStats(agents,meta)}}
  function recommendComps(pool=DEFAULT_PLAYER_POOL,players=defaultActivePlayers(pool),meta={},extraObserved=[],limit=8){
    if(players.length!==5)return[];const choices=players.map(p=>playerChoices(p,pool));if(choices.some(x=>!x.length))return[];const best=[];
    function push(rec){best.push(rec);best.sort((a,b)=>b.score-a.score||b.similarity-a.similarity||b.metaFit-a.metaFit);if(best.length>Math.max(limit*5,40))best.length=Math.max(limit*5,40)}
    function walk(i,used,assignment){if(i===players.length){const stats=scoreAssignment(assignment,pool,meta,extraObserved),agents=Object.values(assignment);push({assignment:{...assignment},agents:[...agents].sort(),...stats});return}const player=players[i];for(const{agent}of choices[i]){if(used.has(agent))continue;used.add(agent);assignment[player]=agent;walk(i+1,used,assignment);used.delete(agent);delete assignment[player]}}
    walk(0,new Set(),{});const unique=[],seen=new Set();for(const r of best){const key=[...r.agents].sort().join('|');if(seen.has(key))continue;seen.add(key);unique.push(r);if(unique.length>=limit)break}return unique
  }
  function assignAgentsToPlayers(targetAgents,pool=DEFAULT_PLAYER_POOL,players=defaultActivePlayers(pool)){
    const agents=[...new Set(targetAgents||[])];if(agents.length!==players.length)return null;const eligible=new Map(players.map(p=>[p,new Set(playerChoices(p,pool).map(x=>x.agent))]));const ordered=[...agents].sort((a,b)=>players.filter(p=>eligible.get(p).has(a)).length-players.filter(p=>eligible.get(p).has(b)).length),usedPlayers=new Set(),assignment={};
    function walk(i){if(i===ordered.length)return true;const agent=ordered[i];for(const player of players){if(usedPlayers.has(player)||!eligible.get(player).has(agent))continue;usedPlayers.add(player);assignment[player]=agent;if(walk(i+1))return true;usedPlayers.delete(player);delete assignment[player]}return false}
    return walk(0)?assignment:null
  }
  function compareToTeams(agents,teams,mapName){const out=[];for(const team of teams||[]){const row=team.maps&&team.maps[mapName];if(!row)continue;let best=null;for(const comp of row.compositions||[]){const overlap=setOverlap(agents,comp.agents||[]),similarity=similarityPct(agents,comp.agents||[]),cand={team:team.name,tag:team.tag,region:team.region,overlap,similarity,agents:comp.agents||[],games:Number(comp.games)||0,wins:Number(comp.wins)||0,winRate:comp.win_rate??null,lastUsed:comp.last_used||'',exact:overlap===5};if(!best||cand.overlap>best.overlap||(cand.overlap===best.overlap&&cand.games>best.games))best=cand}if(best)out.push(best)}return out.sort((a,b)=>b.overlap-a.overlap||b.games-a.games||String(b.lastUsed).localeCompare(String(a.lastUsed)))}
  function assignmentRoles(assignment,pool){const out={};for(const[p,a]of Object.entries(assignment||{}))out[p]=roleOf(a,pool);return out}
  function buildPlaybook(assignment,pool=DEFAULT_PLAYER_POOL,mapName='Haven'){
    const agents=Object.values(assignment||{});if(!agents.length)return[];const roles=roleCounts(agents,pool),plays=[],lanes={Abyss:'A pressure / mid / B pressure',Ascent:'A Main / mid / B Main',Haven:'A pressure / Garage-C / C pressure',Lotus:'A / B pressure / C',Split:'A Main / mid / B Main',Summit:'A approach / central control / B approach',Sunset:'A Main / mid / B Main'},lane=lanes[mapName]||'primary lane / mid / opposite lane';
    if(roles.Initiator>=2)plays.push({phase:'Attack',title:'Layer the info',text:`You have two initiators. Use the first info tool to clear ${lane}, then layer the second flash/recon only when the entry commits instead of dumping both at round start.`});
    if(roles.Controller>=2)plays.push({phase:'Attack',title:'Staged smoke cycle',text:'With two controllers, spend the first smoke set to take space and keep the second controller alive for the site hit or post-plant refresh.'});
    if(roles.Duelist>=2)plays.push({phase:'Attack',title:'Two-wave entry',text:'Run a two-wave hit: first duelist forces defenders off the choke, second duelist trades through or punishes the rotation rather than entering shoulder-to-shoulder.'});
    if(roles.Duelist===1)plays.push({phase:'Attack',title:'Protect the entry window',text:'Only one duelist is carrying primary entry pressure. Save at least one flash, recon, stun, or smoke specifically for that entry timing.'});
    if(roles.Sentinel>=1)plays.push({phase:'Default',title:'Keep the map honest',text:'Use the sentinel utility to own flank or a low-contact lane so four players can pressure elsewhere without constantly turning around.'});
    if(agents.includes('Sova'))plays.push({phase:'Info',title:'Sova timing',text:'Use recon/drone after defenders have reacted to initial pressure, not automatically at 1:40. The second information cycle is usually more valuable for the final hit or retake.'});
    if(agents.some(a=>['Raze','Neon','Waylay','Jett'].includes(a)))plays.push({phase:'Tempo',title:'Explosive space conversion',text:'Your entry agent can cross dangerous ground quickly. Pair the movement timing with controller denial and one initiator cue so gained space is immediately tradeable.'});
    if(agents.includes('Cypher')||agents.includes('Chamber'))plays.push({phase:'Defense',title:'Anchor plus fast stack',text:'Let the sentinel hold one extremity with utility or an escape tool, then bias an extra defender toward the opposite pressure lane and rotate off confirmed contact.'});
    if(agents.includes('Viper'))plays.push({phase:'Defense',title:'Preserve fuel',text:'Avoid leaving Viper utility permanently active. Pulse it around contact windows so the wall/orb is available again when the hit or retake actually arrives.'});
    plays.push({phase:'Defense',title:'Retake rule',text:'If the site anchor has no trade path, give ground early and keep utility for a five-versus-five or four-versus-four retake instead of donating the opening death.'});return plays.slice(0,7)
  }
  function compSummary(assignment,pool=DEFAULT_PLAYER_POOL){const agents=Object.values(assignment||{}),rc=roleCounts(agents,pool);return{agents,roles:rc,roleLine:ROLE_ORDER.filter(r=>rc[r]).map(r=>`${rc[r]} ${r}`).join(' · ')}}
  return{DEFAULT_PLAYER_POOL,ROLE_ORDER,KNOWN_ROLES,defaultActivePlayers,allPlayers,playerChoices,roleOf,roleCounts,setOverlap,similarityPct,scoreAssignment,recommendComps,assignAgentsToPlayers,compareToTeams,buildPlaybook,compSummary,assignmentRoles};
});
