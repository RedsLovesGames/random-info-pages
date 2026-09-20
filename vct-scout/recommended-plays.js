(function(root,factory){const G=typeof module==='object'&&module.exports?require('./map-geometry.js'):root.MapGeometry;const api=factory(G);if(typeof module==='object'&&module.exports)module.exports=api;else root.RecommendedPlays=api;})(typeof self!=='undefined'?self:this,function(G){
  'use strict';
  const DB={};
  const slot=(id,label,start,dest,subroles,extra={})=>({id,label,startAnchor:start,destinationAnchor:dest,subroles,...extra});
  const util=(ownerSlot,abilityKind,targetAnchor,phase,label)=>({ownerSlot,abilityKind,targetAnchor,phase,label:label||abilityKind});
  const phase=(id,label)=>({id,label});
  function attack(map,id,title,tempo,slots,utility,spikeCarrierSlot,plantAnchor,contingencies){return{id,map,side:'attack',title,tempo,sourceClass:'planning-template',phases:[phase('opening','Opening shape'),phase('contact','First contact'),phase('execute','Execute'),phase('plant','Plant'),phase('postPlant','Post plant')],slots,utility,spikeCarrierSlot,plantAnchor,contingencies,postPlantAnchor:plantAnchor==='plantA'?'postA':plantAnchor==='plantB'?'postB':'postC'}}
  function defense(map,id,title,tempo,slots,utility,contingencies){return{id,map,side:'defense',title,tempo,sourceClass:'planning-template',phases:[phase('opening','Opening setup'),phase('contact','First contact'),phase('rotate','Rotate'),phase('retake','Retake')],slots,utility,contingencies}}
  function twoSite(map){
    return{
      attack:[
        attack(map,'mid-control','Mid control default','Slow',[
          slot('entry','Mid pressure','mid','bLink',['primaryEntry','secondaryEntry']),
          slot('second','A pressure','midLeft','aLink',['secondaryEntry','flashEntry','lurker']),
          slot('info','B Main info','bMain','siteB',['infoInitiator','execInitiator']),
          slot('global','Central support','flankLeft','aMain',['globalController','localController']),
          slot('lurk','B extremity','flankRight','bMain',['lurker','flankControl','localController'])
        ],[util('info','recon','midRight','contact','Mid information'),util('global','smoke','aLink','execute','A-link isolation'),util('lurk','smoke','bLink','execute','B-link isolation')],'info','plantB',[{if:'Mid denied',then:'Regroup through B Main and preserve A pressure.'},{if:'B stack shown',then:'Use Mid to pivot A.'}]),
        attack(map,'a-split','A split through mid','Medium',[
          slot('entry','A Main entry','aMain','siteA',['primaryEntry']),
          slot('second','Mid split','midLeft','siteA',['secondaryEntry','flashEntry']),
          slot('info','A support','flankLeft','aMain',['infoInitiator','execInitiator']),
          slot('global','Mid controller','mid','aLink',['globalController','localController']),
          slot('lurk','B hold','bMain','midRight',['lurker','flankControl','localController'])
        ],[util('info','recon','siteA','execute','Site clear'),util('global','smoke','aLink','execute','Link smoke'),util('second','flash','aEntry','execute','Entry flash')],'info','plantA',[{if:'Mid split is denied',then:'Collapse four through A Main while lurker holds rotation.'}])
      ],
      defense:[
        defense(map,'site-hold','Standard anchors + central flex','Default',[
          slot('anchorA','A anchor','siteA','aEntry',['siteAnchor','operatorAnchor']),slot('anchorB','B anchor','siteB','bEntry',['siteAnchor','operatorAnchor']),slot('info','Mid information','mid','midLeft',['infoInitiator','execInitiator']),slot('global','A link flex','aLink','siteA',['globalController','retakeController']),slot('rotate','B link flex','bLink','siteB',['localController','retakeController','secondaryEntry'])
        ],[util('info','recon','mid','contact','Early mid info'),util('global','smoke','aEntry','contact','A delay'),util('rotate','smoke','bEntry','contact','B delay')],[{if:'Site is lost',then:'Preserve central utility and regroup for retake.'}]),
        defense(map,'mid-fight','Contest central control','Aggressive',[
          slot('first','Mid-left contact','midLeft','mid',['primaryEntry','flashEntry','execInitiator']),slot('trade','Mid-right trade','midRight','mid',['secondaryEntry','flashEntry']),slot('anchorA','A solo','siteA','aEntry',['siteAnchor','operatorAnchor']),slot('anchorB','B solo','siteB','bEntry',['siteAnchor','operatorAnchor']),slot('support','Spawn support','defenseSpawn','mid',['globalController','localController','retakeController'])
        ],[util('first','flash','mid','contact','Mid fight flash'),util('support','smoke','mid','contact','Mid isolation')],[{if:'Opening utility misses',then:'Fall back to links and keep both site anchors alive.'}])
      ]
    };
  }
  for(const map of ['Abyss','Ascent','Lotus','Split','Summit','Sunset'])DB[map]=twoSite(map);
  DB.Haven={
    attack:[
      attack('Haven','three-lane-default','Three-lane default','Slow / reactive',[
        slot('entry','A pressure','aMain','siteA',['primaryEntry','secondaryEntry']),slot('second','Garage contact','garage','siteB',['secondaryEntry','flashEntry','execInitiator']),slot('info','C Long information','cLong','siteC',['infoInitiator','execInitiator']),slot('global','Mid support','mid','aLink',['globalController','localController']),slot('lurk','C extremity','flankRight','cLong',['flankControl','lurker','localController'])
      ],[util('info','recon','cEntry','contact','C information'),util('global','smoke','aLink','execute','A link isolation'),util('second','flash','bEntry','execute','Garage/B flash')],'info','plantC',[{if:'C is stacked',then:'Use retained A pressure to regroup A through mid.'},{if:'Garage is denied',then:'Keep C Long contact and pivot through B.'}]),
      attack('Haven','a-explode','A explode','Fast',[
        slot('entry','A Long entry','aMain','siteA',['primaryEntry']),slot('second','A Short trade','midLeft','siteA',['secondaryEntry','flashEntry']),slot('info','A utility support','flankLeft','aMain',['infoInitiator','execInitiator']),slot('global','Mid smoke support','mid','aLink',['globalController','localController']),slot('lurk','C hold','cLong','midRight',['flankControl','lurker','localController'])
      ],[util('info','recon','siteA','execute','A clear'),util('global','smoke','aLink','execute','A link smoke'),util('second','flash','aEntry','execute','Front-site flash')],'info','plantA',[{if:'A utility is stalled',then:'Return through mid and preserve the C lurk for a late pivot.'}])
    ],
    defense:[
      defense('Haven','standard','Standard three-site shell','Default',[
        slot('anchorA','A anchor','siteA','aEntry',['siteAnchor','operatorAnchor']),slot('garage','Garage info','garage','midRight',['infoInitiator','execInitiator']),slot('anchorC','C anchor','siteC','cEntry',['siteAnchor','operatorAnchor']),slot('global','A/B link flex','aLink','siteB',['globalController','retakeController']),slot('rotate','C/B link flex','cLink','siteB',['localController','retakeController','secondaryEntry'])
      ],[util('garage','recon','garage','contact','Garage info'),util('global','smoke','aEntry','contact','A delay'),util('rotate','smoke','cEntry','contact','C delay')],[{if:'Outer site is lost',then:'Regroup through links for a five-player retake.'}]),
      defense('Haven','garage-fight','Garage fight','Aggressive',[
        slot('first','Garage first contact','garage','mid',['flashEntry','execInitiator','primaryEntry']),slot('trade','B trade','bMain','garage',['secondaryEntry','flashEntry']),slot('anchorA','A solo','siteA','aEntry',['siteAnchor','operatorAnchor']),slot('anchorC','C solo','siteC','cEntry',['siteAnchor','operatorAnchor']),slot('support','C Link support','cLink','garage',['globalController','localController','retakeController'])
      ],[util('first','flash','garage','contact','Garage flash'),util('support','smoke','midRight','contact','Garage exit smoke')],[{if:'Garage contact is lost',then:'Give Garage and reset into links instead of re-peeking.'}])
    ]
  };
  function validate(play){
    if(!G.getMap(play.map))throw new Error(`unknown map ${play.map}`);
    const ids=new Set(play.slots.map(s=>s.id));if(ids.size!==play.slots.length)throw new Error('duplicate slot id');
    for(const s of play.slots){if(!G.anchor(play.map,s.startAnchor))throw new Error(`missing anchor ${s.startAnchor}`);if(s.destinationAnchor&&!G.path(play.map,s.startAnchor,s.destinationAnchor).length)throw new Error(`invalid route ${s.id}`)}
    if(play.side==='attack'&&(!play.spikeCarrierSlot||!play.plantAnchor))throw new Error('attack play missing spike/plant');
    for(const u of play.utility||[]){if(!ids.has(u.ownerSlot))throw new Error(`utility owner missing ${u.ownerSlot}`);if(!G.anchor(play.map,u.targetAnchor))throw new Error(`utility target missing ${u.targetAnchor}`)}
    return play;
  }
  for(const map of Object.keys(DB))for(const side of ['attack','defense'])DB[map][side].forEach(validate);
  return{get:(map,side)=>DB[map]?.[side]||[],getById:(map,side,id)=>(DB[map]?.[side]||[]).find(p=>p.id===id)||null,validate,all:()=>DB};
});