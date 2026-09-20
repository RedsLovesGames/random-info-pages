(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AgentTactics=api;})(typeof self!=='undefined'?self:this,function(){
  'use strict';
  const D={};
  function add(agent,role,subroles){D[agent]={agent,role,subroles:{...subroles}}}
  add('Jett','Duelist',{primaryEntry:100,secondaryEntry:78,operatorAnchor:82,flex:35,lurker:22});
  add('Raze','Duelist',{primaryEntry:100,secondaryEntry:82,execInitiator:45,flex:34,lurker:18});
  add('Neon','Duelist',{primaryEntry:98,secondaryEntry:86,flex:38,lurker:24});
  add('Waylay','Duelist',{primaryEntry:96,secondaryEntry:88,flex:42,lurker:28});
  add('Phoenix','Duelist',{primaryEntry:82,secondaryEntry:92,flashEntry:95,postPlant:45,flex:44,lurker:30});
  add('Yoru','Duelist',{primaryEntry:72,secondaryEntry:91,flashEntry:82,lurker:100,flex:68,postPlant:50});
  add('Iso','Duelist',{primaryEntry:83,secondaryEntry:92,flex:48,lurker:34});
  add('Sova','Initiator',{infoInitiator:100,execInitiator:72,postPlant:86,flex:52,retakeController:30});
  add('Fade','Initiator',{infoInitiator:95,execInitiator:82,postPlant:65,flex:58});
  add('Breach','Initiator',{execInitiator:100,flashEntry:90,retakeController:75,flex:52});
  add('KAY/O','Initiator',{execInitiator:96,flashEntry:92,infoInitiator:66,flex:62});
  add('Skye','Initiator',{execInitiator:84,flashEntry:96,infoInitiator:72,flex:70});
  add('Gekko','Initiator',{execInitiator:82,infoInitiator:72,postPlant:78,flex:73});
  add('Tejo','Initiator',{execInitiator:90,infoInitiator:72,postPlant:66,flex:55});
  add('Astra','Controller',{globalController:100,localController:70,retakeController:92,postPlant:88,flex:58,lurker:42});
  add('Omen','Controller',{globalController:74,localController:100,retakeController:88,lurker:76,flex:82,postPlant:70});
  add('Viper','Controller',{globalController:78,localController:88,siteAnchor:83,postPlant:100,lurker:80,flankControl:58});
  add('Brimstone','Controller',{localController:96,retakeController:74,postPlant:93,flex:42});
  add('Clove','Controller',{localController:92,retakeController:86,secondaryEntry:56,flex:70});
  add('Miks','Controller',{localController:88,globalController:72,retakeController:75,flex:70});
  add('Cypher','Sentinel',{flankControl:100,lurker:94,siteAnchor:96,postPlant:66,flex:50});
  add('Chamber','Sentinel',{operatorAnchor:100,siteAnchor:82,lurker:70,flankControl:65,flex:45});
  add('Deadlock','Sentinel',{siteAnchor:96,flankControl:78,retakeController:70,postPlant:68,flex:42});
  add('Vyse','Sentinel',{siteAnchor:94,flankControl:86,retakeController:74,flex:52});
  add('Killjoy','Sentinel',{siteAnchor:98,flankControl:92,postPlant:82,lurker:68,flex:44});
  add('Sage','Sentinel',{siteAnchor:84,retakeController:88,postPlant:72,flex:58});
  function get(agent){return D[agent]||{agent,role:'Flex',subroles:{flex:50}}}
  function score(agent,subrole){return get(agent).subroles[subrole]||0}
  function assign(items,slots){
    const remaining=items.map(x=>({...x})),out={};
    const ordered=[...slots].sort((a,b)=>Math.max(...(b.subroles||['flex']).map(r=>Math.max(...remaining.map(x=>score(x.agent,r)),0)))-Math.max(...(a.subroles||['flex']).map(r=>Math.max(...remaining.map(x=>score(x.agent,r)),0))));
    for(const slot of ordered){
      let bi=0,bs=-1,br='flex';
      for(let i=0;i<remaining.length;i++)for(const r of slot.subroles||['flex']){const s=score(remaining[i].agent,r);if(s>bs){bs=s;bi=i;br=r}}
      const picked=remaining.splice(bi,1)[0]||{player:'',agent:'?'};out[slot.id]={...picked,subrole:br,assignment:slot.id,role:get(picked.agent).role};
    }
    return out;
  }
  return{get,score,assign,all:()=>({...D})};
});