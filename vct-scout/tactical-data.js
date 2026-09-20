(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.VCTTacticalData=api;
})(typeof self!=='undefined'?self:this,function(){
  const SOURCES={
    Abyss:{label:'NRG vs 100T · Sep 4, 2026',url:'https://rib.gg/matches/909/nrg-vs-100-thieves-vct-2026-americas-stage-2-playoffs',score:'NRG 3-13 100T',note:'RIB match page includes the 2D Replay tab for the Abyss map.'},
    Ascent:{label:'100T vs LOUD · Sep 6, 2026',url:'https://rib.gg/matches/968/100-thieves-vs-loud-vct-26-amer-s2-playoffs',score:'100T 14-12 LOUD',note:'RIB match page includes the 2D Replay tab for the Ascent map.'},
    Haven:{label:'100T vs LOUD · Sep 6, 2026',url:'https://rib.gg/matches/968/100-thieves-vs-loud-vct-26-amer-s2-playoffs',score:'100T 14-12 LOUD',note:'RIB match page includes the 2D Replay tab for the Haven decider.'},
    Lotus:{label:'LEV vs 100T · Aug 29, 2026',url:'https://rib.gg/matches/846/100-thieves-vs-leviatan',score:'LEV 2-13 100T',note:'RIB match page includes the 2D Replay tab for Lotus.'},
    Split:{label:'100T vs LOUD · Sep 6, 2026',url:'https://rib.gg/matches/968/100-thieves-vs-loud-vct-26-amer-s2-playoffs',score:'100T 7-13 LOUD',note:'RIB match page includes the 2D Replay tab for Split.'},
    Summit:{label:'100T vs LOUD · Sep 6, 2026',url:'https://rib.gg/matches/968/100-thieves-vs-loud-vct-26-amer-s2-playoffs',score:'100T 1-13 LOUD',note:'RIB match page includes the 2D Replay tab for Summit.'},
    Sunset:{label:'NRG vs 100T · Sep 4, 2026',url:'https://rib.gg/matches/909/nrg-vs-100-thieves-vct-2026-americas-stage-2-playoffs',score:'NRG 6-13 100T',note:'RIB match page includes the 2D Replay tab for Sunset.'}
  };

  const P=(id,title,tempo,positions,arrows,utility,notes)=>({id,title,tempo,positions,arrows,utility,notes});
  const S=(slot,label,callouts,fallback,roles)=>({slot,label,callouts:Array.isArray(callouts)?callouts:[callouts],fallback,roles});
  const A=(from,to,label,kind='move')=>({from,to,label,kind});
  const U=(kind,label,callouts,fallback)=>({kind,label,callouts:Array.isArray(callouts)?callouts:[callouts],fallback});

  const PLAYBOOK={
    Haven:{
      attack:[
        P('three-lane-default','Three-lane default','Slow / reactive',[
          S('entry','A pressure',['A Lobby','A Long'],[36,68],['Duelist']),
          S('second','Garage contact',['Garage','Mid Courtyard'],[50,60],['Duelist','Initiator']),
          S('support','C info',['C Lobby','C Long'],[63,63],['Initiator']),
          S('smoke','Mid flex',['Mid Courtyard','Mid Doors'],[48,53],['Controller']),
          S('lurk','C extremity',['C Lobby','C Long'],[67,70],['Sentinel'])
        ],[
          A('entry','A Site','take A space'),A('second','Garage','contest Garage'),A('support','C Site','probe C'),A('lurk','Mid Courtyard','late lurk','lurk')
        ],[
          U('recon','early info',['Garage','C Long'],[59,55]),U('smoke','flex smoke target',['A Site','C Site'],[42,42]),U('trap','anti-flank',['Attacker Side Spawn','C Lobby'],[64,76])
        ],[
          'Keep all three lanes represented until defenders reveal a weakness.',
          'Controller stays central enough to support either outer site.',
          'Sentinel owns the late-round extremity so the four-player core can regroup safely.'
        ]),
        P('a-explode','A explode','Fast',[
          S('entry','A Long entry',['A Long','A Lobby'],[34,60],['Duelist']),
          S('second','A Short trade',['A Sewer','A Lobby'],[39,58],['Duelist','Initiator']),
          S('support','A utility',['A Lobby','A Long'],[37,66],['Initiator']),
          S('smoke','A support',['A Lobby','A Long'],[40,69],['Controller']),
          S('lurk','Mid hold',['Mid Courtyard','Mid Doors'],[50,60],['Sentinel'])
        ],[
          A('entry','A Site','first contact','entry'),A('second','A Site','trade entry'),A('support','A Site','follow utility'),A('lurk','Mid Doors','cut rotate','lurk')
        ],[
          U('smoke','Heaven / CT isolation',['A Tower','A Link'],[38,40]),U('flash','front-site flash',['A Site'],[35,47]),U('recon','back-site clear',['A Site'],[33,44])
        ],[
          'Initiator utility should land immediately before the first duelist crosses the choke.',
          'Second contact player trades the entry instead of racing ahead of the utility.',
          'Sentinel keeps mid rotation honest and becomes the late-round pinch if the hit stalls.'
        ]),
        P('c-split','C split through Garage','Medium / burst finish',[
          S('entry','C Long entry',['C Long','C Lobby'],[64,61],['Duelist']),
          S('second','Garage entry',['Garage','Mid Courtyard'],[54,58],['Duelist','Initiator']),
          S('support','C Long support',['C Lobby','C Long'],[66,66],['Initiator']),
          S('smoke','Garage support',['Garage','Mid Courtyard'],[53,64],['Controller']),
          S('lurk','Mid / A hold',['Mid Courtyard','A Lobby'],[47,63],['Sentinel'])
        ],[
          A('entry','C Site','C Long hit','entry'),A('second','C Link','Garage pinch'),A('support','C Site','trade long'),A('smoke','Garage','follow split'),A('lurk','Mid Doors','late cut','lurk')
        ],[
          U('smoke','C CT',['C Link','Defender Side Spawn'],[61,41]),U('smoke','Garage window',['Garage'],[53,50]),U('recon','C back site',['C Site'],[67,47])
        ],[
          'Do not let C Long arrive significantly before Garage, because the value is the crossfire collapse.',
          'Use the controller to cut the defender-side rotate and protect the Garage exit.',
          'If Garage is denied, keep Long pressure and repivot through mid instead of forcing both chokepoints.'
        ])
      ],
      defense:[
        P('standard','Standard 1-1-1 + two flex','Default',[
          S('anchorA','A anchor',['A Site','A Tower'],[35,43],['Sentinel','Controller']),
          S('info','Garage info',['Garage','Mid Courtyard'],[52,50],['Initiator']),
          S('anchorC','C anchor',['C Site','C Link'],[66,45],['Sentinel','Controller']),
          S('rotate','B / links flex',['B Site','A Link','C Link'],[50,44],['Controller','Duelist']),
          S('anchorB','B contact',['B Site','Mid Courtyard'],[49,50],['Duelist','Initiator'])
        ],[
          A('rotate','A Site','rotate A'),A('rotate','C Site','rotate C'),A('info','Garage','early info')
        ],[
          U('trap','C lane trap',['C Long','C Lobby'],[68,57]),U('smoke','link smoke reserve',['A Link','C Link'],[50,42]),U('recon','Garage info',['Garage'],[52,50])
        ],[
          'Outer anchors should survive first contact long enough for the center players to rotate.',
          'Garage information is high value because it influences both B and C rotations.',
          'Keep at least one flexible smoke or flash for the retake rather than spending everything on first contact.'
        ]),
        P('garage-fight','Garage fight','Aggressive',[
          S('info','Garage first contact',['Garage'],[52,54],['Initiator']),
          S('anchorB','Garage trade',['Mid Courtyard','B Site'],[49,51],['Duelist']),
          S('rotate','C Link support',['C Link'],[58,47],['Controller']),
          S('anchorA','A solo',['A Site'],[35,44],['Sentinel','Controller']),
          S('anchorC','C solo',['C Site'],[67,45],['Sentinel'])
        ],[
          A('info','Mid Courtyard','take Garage info','entry'),A('anchorB','Garage','trade contact'),A('rotate','Garage','support escape')
        ],[
          U('flash','Garage flash',['Garage'],[52,53]),U('smoke','Garage exit',['Garage','C Link'],[56,49]),U('trap','weak-side trip',['A Lobby'],[37,60])
        ],[
          'Fight Garage with a planned two-player trade and a controller escape route.',
          'If the first utility misses, give the space instead of donating a second duel.',
          'Weak-side sentinel utility must cover the extra aggression elsewhere.'
        ]),
        P('retake-heavy','Retake-heavy outer sites','Conservative',[
          S('anchorA','A delay',['A Site','A Link'],[37,46],['Sentinel','Controller']),
          S('anchorC','C delay',['C Site','C Link'],[64,46],['Sentinel','Controller']),
          S('info','B info',['B Site','Mid Courtyard'],[50,47],['Initiator']),
          S('rotate','Defender spawn',['Defender Side Spawn'],[50,36],['Controller']),
          S('anchorB','Link rotator',['A Link','C Link'],[52,41],['Duelist','Initiator'])
        ],[
          A('rotate','A Site','A retake'),A('rotate','C Site','C retake'),A('anchorB','A Link','link support'),A('anchorB','C Link','link support')
        ],[
          U('smoke','retake isolation',['A Site'],[35,44]),U('smoke','retake isolation',['C Site'],[66,44]),U('recon','site retake scan',['B Site'],[50,47])
        ],[
          'Prioritize surviving first contact and preserving recon, flashes, and smoke for the five-player retake.',
          'The central pair should rotate only after site commitment is confirmed.',
          'Outer anchors play delay angles, not hero angles.'
        ])
      ]
    },
    Ascent:{
      attack:[
        P('mid-default','Mid control default','Slow / information',[
          S('entry','Top Mid',['Mid Top','Mid Courtyard'],[50,63],['Duelist']),S('second','Catwalk',['A Link','Mid Catwalk'],[44,57],['Duelist','Initiator']),S('support','B Main info',['B Main'],[64,67],['Initiator']),S('smoke','Mid support',['Mid Courtyard'],[52,60],['Controller']),S('lurk','A Main lurk',['A Main'],[36,68],['Sentinel'])
        ],[A('entry','Mid Market','take mid'),A('second','A Link','threat tree'),A('support','B Site','B pressure'),A('lurk','A Site','late A','lurk')],[U('smoke','Market',['Mid Market'],[57,49]),U('smoke','Catwalk',['A Link'],[44,52]),U('recon','mid scan',['Mid Courtyard'],[50,55])],['Use mid control to keep both sites available.','Sentinel extremity pressure punishes defenders who over-rotate.','Do not commit through Market until utility has displaced the close defender.']),
        P('a-split','A split through Catwalk','Medium',[
          S('entry','A Main',['A Main'],[36,63],['Duelist']),S('second','Catwalk',['A Link','Mid Catwalk'],[44,56],['Duelist','Initiator']),S('support','A Main support',['A Main'],[38,68],['Initiator']),S('smoke','Mid / A support',['Mid Courtyard'],[50,61],['Controller']),S('lurk','B Main hold',['B Main'],[64,68],['Sentinel'])
        ],[A('entry','A Site','main entry','entry'),A('second','A Link','tree split'),A('smoke','A Site','join hit'),A('lurk','Mid Market','late lurk','lurk')],[U('smoke','Heaven',['A Rafters','A Site'],[36,44]),U('smoke','Tree',['A Link'],[43,49]),U('flash','A Main pop',['A Main'],[37,57])],['Time Main and Catwalk contact within the same utility window.','Controller isolates Heaven and Tree before the duelists cross.','B lurk holds the fastest defender rotation.']),
        P('b-split','B split through Market','Medium / fast finish',[
          S('entry','B Main',['B Main'],[64,63],['Duelist']),S('second','Market split',['Mid Market'],[57,52],['Duelist','Initiator']),S('support','B Main support',['B Main'],[62,68],['Initiator']),S('smoke','Mid support',['Mid Courtyard'],[52,60],['Controller']),S('lurk','A Main hold',['A Main'],[36,68],['Sentinel'])
        ],[A('entry','B Site','main entry','entry'),A('second','B Site','Market pinch'),A('support','B Site','trade'),A('lurk','Mid Courtyard','cut rotate','lurk')],[U('smoke','CT',['B Site','Defender Side Spawn'],[63,43]),U('smoke','Market',['Mid Market'],[57,49]),U('recon','B back site',['B Site'],[64,47])],['Market pressure must be real enough to prevent all defenders from facing B Main.','Main group waits for Market utility before crossing the choke.','Keep one player responsible for the late Mid flank.'])
      ],
      defense:[
        P('standard','Standard site anchors + mid info','Default',[S('anchorA','A anchor',['A Site'],[36,44],['Sentinel']),S('info','Mid info',['Mid Courtyard','Mid Market'],[51,50],['Initiator']),S('anchorB','B anchor',['B Site'],[64,44],['Sentinel','Controller']),S('rotate','Tree flex',['A Link'],[43,47],['Controller']),S('anchorC','Market flex',['Mid Market'],[57,48],['Duelist','Initiator'])],[A('rotate','A Site','rotate A'),A('anchorC','B Site','rotate B')],[U('trap','A Main trap',['A Main'],[37,57]),U('recon','mid info',['Mid Courtyard'],[50,54]),U('smoke','B Main delay',['B Main'],[63,56])],['Anchor sites while the middle three deny free Mid control.','Preserve one smoke for Market or Tree during retakes.']),
        P('mid-fight','Fight Top Mid','Aggressive',[S('info','Top Mid contact',['Mid Top','Mid Courtyard'],[50,58],['Initiator']),S('anchorC','Catwalk trade',['A Link','Mid Catwalk'],[44,52],['Duelist']),S('rotate','Market support',['Mid Market'],[57,50],['Controller']),S('anchorA','A anchor',['A Site'],[36,44],['Sentinel']),S('anchorB','B anchor',['B Site'],[64,44],['Sentinel'])],[A('info','Mid Top','take mid','entry'),A('anchorC','Mid Courtyard','trade'),A('rotate','Mid Courtyard','support')],[U('flash','Top Mid flash',['Mid Top'],[50,61]),U('smoke','Mid choke',['Mid Courtyard'],[50,56]),U('trap','site safety',['A Main'],[37,58])],['Three players contest Mid with a planned fallback.','Both sites keep enough utility to survive a fast hit if Mid pressure is a fake.']),
        P('b-retake','B retake shell','Conservative',[S('anchorB','B delay',['B Site'],[64,46],['Sentinel','Controller']),S('anchorC','Market',['Mid Market'],[57,48],['Initiator']),S('rotate','Defender spawn',['Defender Side Spawn'],[50,38],['Controller']),S('anchorA','A hold',['A Site'],[36,44],['Sentinel']),S('info','Tree flex',['A Link'],[43,47],['Duelist'])],[A('rotate','B Site','retake B'),A('anchorC','B Site','Market retake'),A('info','Mid Market','late flank')],[U('smoke','B Main isolate',['B Main'],[63,56]),U('recon','B site scan',['B Site'],[64,46]),U('flash','Market pop',['Mid Market'],[57,49])],['B anchor delays and survives instead of taking a terminal fight.','Retake from Market plus CT to force attackers to watch two directions.'])
      ]
    },
    Lotus:{
      attack:[
        P('a-rubble','A Rubble control into hit','Medium',[S('entry','A Rubble',['A Rubble','A Root'],[37,62],['Duelist']),S('second','A Main trade',['A Main','A Root'],[39,58],['Duelist','Initiator']),S('support','A utility',['A Lobby','A Main'],[36,67],['Initiator']),S('smoke','A support',['A Lobby'],[40,69],['Controller']),S('lurk','C extremity',['C Lobby','C Mound'],[66,68],['Sentinel'])],[A('entry','A Site','break in','entry'),A('second','A Site','trade'),A('lurk','B Main','late pinch','lurk')],[U('smoke','A top',['A Site'],[39,45]),U('recon','A back site',['A Site'],[38,43]),U('trap','C flank',['C Lobby'],[66,68])],['Secure Rubble before committing the hit.','Keep C presence long enough to punish early rotations.']),
        P('c-split','C Main + B/C link split','Medium',[S('entry','C Mound',['C Mound','C Lobby'],[65,60],['Duelist']),S('second','B Main',['B Main'],[51,61],['Duelist','Initiator']),S('support','C support',['C Lobby'],[67,66],['Initiator']),S('smoke','B/C support',['B Main'],[52,66],['Controller']),S('lurk','A hold',['A Lobby'],[36,68],['Sentinel'])],[A('entry','C Site','C entry','entry'),A('second','C Link','link split'),A('smoke','C Link','join split'),A('lurk','B Main','late cut','lurk')],[U('smoke','C waterfall',['C Site'],[64,44]),U('smoke','C link',['C Link'],[57,47]),U('flash','C mound',['C Mound'],[64,56])],['C Main creates the front pressure while B link threatens the side door.','Do not open the split until both groups are ready to trade.']),
        P('b-pivot','B pressure into late pivot','Slow / pivot',[S('entry','B Main',['B Main'],[51,61],['Duelist']),S('second','A link threat',['A Link','A Main'],[44,55],['Duelist','Initiator']),S('support','B utility',['B Main'],[51,66],['Initiator']),S('smoke','central support',['B Main'],[53,64],['Controller']),S('lurk','C hold',['C Lobby'],[66,68],['Sentinel'])],[A('entry','B Site','take B space'),A('second','A Site','hold A option'),A('lurk','C Site','hold C option','lurk')],[U('smoke','B upper',['B Site'],[51,48]),U('recon','B scan',['B Site'],[51,48])],['Use B pressure to pull link defenders before choosing the outer site.','Sentinel keeps the opposite extremity alive as a late-round escape route.'])
      ],
      defense:[
        P('standard','Three-site standard','Default',[S('anchorA','A anchor',['A Site'],[39,45],['Sentinel']),S('anchorB','B anchor',['B Site'],[51,48],['Controller']),S('anchorC','C anchor',['C Site'],[64,45],['Sentinel','Controller']),S('info','A Rubble info',['A Rubble'],[38,56],['Initiator']),S('rotate','Links flex',['B Upper','B Site'],[52,44],['Duelist'])],[A('rotate','A Site','rotate A'),A('rotate','C Site','rotate C')],[U('trap','C Main trap',['C Mound'],[64,57]),U('recon','A Rubble info',['A Rubble'],[38,56]),U('smoke','B Main',['B Main'],[51,57])],['Outer anchors delay while center flex covers the fastest link rotation.','A Rubble info determines whether A needs immediate reinforcement.']),
        P('a-rubble-fight','A Rubble fight','Aggressive',[S('info','A Rubble first',['A Rubble'],[38,57],['Initiator']),S('anchorA','A trade',['A Root','A Main'],[40,53],['Duelist']),S('rotate','A support',['A Site'],[40,47],['Controller']),S('anchorB','B anchor',['B Site'],[51,48],['Sentinel']),S('anchorC','C anchor',['C Site'],[64,45],['Sentinel'])],[A('info','A Lobby','take Rubble','entry'),A('anchorA','A Rubble','trade'),A('rotate','A Rubble','support')],[U('flash','Rubble flash',['A Rubble'],[38,57]),U('smoke','A Main cutoff',['A Main'],[39,54]),U('trap','C weak side',['C Mound'],[64,57])],['Take Rubble with two players and a controller escape route.','If attackers spend multiple pieces of utility, back off and keep the resource trade.']),
        P('c-retake','C retake shell','Conservative',[S('anchorC','C delay',['C Site'],[64,46],['Sentinel','Controller']),S('info','C Link',['C Link'],[57,47],['Initiator']),S('rotate','B rotate',['B Site'],[51,48],['Controller']),S('anchorA','A hold',['A Site'],[39,45],['Sentinel']),S('anchorB','B flex',['B Upper','B Site'],[52,45],['Duelist'])],[A('rotate','C Site','CT retake'),A('info','C Site','link retake'),A('anchorB','C Link','join retake')],[U('smoke','C Main isolate',['C Mound'],[64,57]),U('recon','C site scan',['C Site'],[64,46]),U('flash','C link pop',['C Link'],[57,47])],['C anchor prioritizes survival.','Retake through defender side and link at the same time.'])
      ]
    },
    Split:{
      attack:[
        P('a-ramps-split','A Main + Ramps split','Medium',[S('entry','A Main',['A Main'],[37,63],['Duelist']),S('second','A Ramps',['A Ramps'],[43,57],['Duelist','Initiator']),S('support','A Main support',['A Main'],[38,68],['Initiator']),S('smoke','A support',['A Lobby'],[40,69],['Controller']),S('lurk','B Main hold',['B Main'],[63,68],['Sentinel'])],[A('entry','A Site','main entry','entry'),A('second','A Tower','ramps split'),A('smoke','A Site','join site'),A('lurk','Mid Top','late cut','lurk')],[U('smoke','A Screens',['A Screens'],[38,44]),U('smoke','A Tower',['A Tower'],[43,45]),U('flash','A Main',['A Main'],[37,57])],['Main and Ramps should collapse together.','Sentinel keeps B and Mid rotations uncomfortable.']),
        P('b-split','B Main + Mid split','Medium',[S('entry','B Main',['B Main'],[63,63],['Duelist']),S('second','Mid Mail',['Mid Mail','Mid Top'],[55,54],['Duelist','Initiator']),S('support','B Main support',['B Main'],[62,68],['Initiator']),S('smoke','Mid support',['Mid Top'],[51,60],['Controller']),S('lurk','A Main hold',['A Main'],[37,68],['Sentinel'])],[A('entry','B Site','B entry','entry'),A('second','B Tower','Heaven pinch'),A('smoke','B Site','join hit'),A('lurk','Mid Top','cut rotate','lurk')],[U('smoke','B Tower',['B Tower'],[59,45]),U('smoke','B Alley',['B Site'],[63,46]),U('recon','B back site',['B Site'],[63,46])],['Mid pressure must clear Mail before B Main commits.','Use the Heaven split to reduce the number of defenders facing the choke.']),
        P('mid-default','Mid control default','Slow',[S('entry','Mid Bottom',['Mid Bottom','Mid Top'],[50,63],['Duelist']),S('second','A Ramps pressure',['A Ramps'],[43,58],['Duelist','Initiator']),S('support','B Main info',['B Main'],[63,68],['Initiator']),S('smoke','Mid support',['Mid Bottom'],[50,67],['Controller']),S('lurk','A Main',['A Main'],[37,68],['Sentinel'])],[A('entry','Mid Top','take Mid'),A('second','A Tower','threat A'),A('support','B Site','B pressure')],[U('smoke','Mail',['Mid Mail'],[55,52]),U('smoke','Vents',['Mid Vent'],[46,52]),U('recon','Mid scan',['Mid Top'],[50,57])],['Force defenders to spend utility holding Mid before deciding the site.','Keep both mains occupied so rotations cannot stack early.'])
      ],
      defense:[
        P('standard','Standard anchors + Mid pair','Default',[S('anchorA','A anchor',['A Site'],[38,45],['Sentinel']),S('info','Mid Vents',['Mid Vent','Mid Top'],[46,51],['Initiator']),S('anchorB','B anchor',['B Site'],[63,46],['Sentinel','Controller']),S('rotate','A Tower flex',['A Tower'],[43,46],['Controller']),S('anchorC','B Tower / Mail',['B Tower','Mid Mail'],[58,49],['Duelist'])],[A('rotate','A Site','rotate A'),A('anchorC','B Site','rotate B')],[U('trap','B Main trap',['B Main'],[63,58]),U('recon','Mid info',['Mid Top'],[50,56]),U('smoke','A Main delay',['A Main'],[38,57])],['Mid pair controls the map while site anchors preserve stall utility.']),
        P('mid-deny','Hard deny Mid','Aggressive',[S('info','Vents contact',['Mid Vent'],[46,52],['Initiator']),S('anchorC','Mail contact',['Mid Mail'],[55,52],['Duelist']),S('rotate','Mid support',['Mid Top'],[50,50],['Controller']),S('anchorA','A solo',['A Site'],[38,45],['Sentinel']),S('anchorB','B solo',['B Site'],[63,46],['Sentinel'])],[A('info','Mid Bottom','fight Mid','entry'),A('anchorC','Mid Top','crossfire'),A('rotate','Mid Top','support')],[U('flash','Mid flash',['Mid Top'],[50,55]),U('smoke','Mid Bottom',['Mid Bottom'],[50,61]),U('trap','weak B',['B Main'],[63,58])],['Fight Mid from two elevations with a clear fallback timer.','Weak sites need early-warning sentinel utility.']),
        P('a-retake','A retake shell','Conservative',[S('anchorA','A delay',['A Site'],[38,46],['Sentinel','Controller']),S('info','A Tower',['A Tower'],[43,46],['Initiator']),S('rotate','Defender spawn',['Defender Side Spawn'],[51,38],['Controller']),S('anchorB','B hold',['B Site'],[63,46],['Sentinel']),S('anchorC','Vents flex',['Mid Vent'],[46,51],['Duelist'])],[A('rotate','A Site','spawn retake'),A('info','A Site','Heaven retake'),A('anchorC','A Tower','Vents rotate')],[U('smoke','A Main isolate',['A Main'],[38,57]),U('recon','A site scan',['A Site'],[38,46]),U('flash','A Tower pop',['A Tower'],[43,46])],['Delay A plant and preserve Heaven control for the retake.','Retake from spawn plus Tower instead of funneling through one lane.'])
      ]
    },
    Sunset:{
      attack:[
        P('mid-default','Mid control default','Slow',[S('entry','Mid Top',['Mid Top','Mid Bottom'],[50,62],['Duelist']),S('second','B Main pressure',['B Main'],[63,67],['Duelist','Initiator']),S('support','A Main info',['A Main'],[37,67],['Initiator']),S('smoke','Mid support',['Mid Bottom'],[50,67],['Controller']),S('lurk','A Main lurk',['A Main'],[36,70],['Sentinel'])],[A('entry','Mid Courtyard','take mid'),A('second','B Site','B threat'),A('support','A Site','A threat')],[U('smoke','Market',['B Market','Mid Courtyard'],[57,51]),U('recon','Mid scan',['Mid Courtyard'],[50,55]),U('trap','A flank',['A Main'],[37,67])],['Use Mid to keep Market and both sites accessible.','Outer pressure prevents defenders from collapsing five players into Mid.']),
        P('b-split','B Main + Market split','Medium',[S('entry','B Main',['B Main'],[63,62],['Duelist']),S('second','Mid / Market',['B Market','Mid Courtyard'],[57,53],['Duelist','Initiator']),S('support','B Main support',['B Main'],[63,68],['Initiator']),S('smoke','Mid support',['Mid Courtyard'],[51,61],['Controller']),S('lurk','A Main hold',['A Main'],[37,69],['Sentinel'])],[A('entry','B Site','B entry','entry'),A('second','B Site','Market pinch'),A('smoke','B Site','join split'),A('lurk','Mid Courtyard','late cut','lurk')],[U('smoke','B back site',['B Site'],[63,46]),U('smoke','Market',['B Market'],[57,50]),U('recon','B site scan',['B Site'],[63,46])],['Market and B Main hit within one utility cycle.','Sentinel holds the A-side rotation and late flank.']),
        P('a-exec','A Main execute','Fast',[S('entry','A Main entry',['A Main'],[37,61],['Duelist']),S('second','A elbow trade',['A Lobby','A Main'],[40,64],['Duelist','Initiator']),S('support','A utility',['A Main'],[37,68],['Initiator']),S('smoke','A support',['A Lobby'],[40,69],['Controller']),S('lurk','Mid hold',['Mid Bottom'],[50,67],['Sentinel'])],[A('entry','A Site','first contact','entry'),A('second','A Site','trade'),A('support','A Site','follow'),A('lurk','Mid Courtyard','cut rotate','lurk')],[U('smoke','A link',['A Link'],[43,48]),U('smoke','A back site',['A Site'],[38,46]),U('flash','A Main pop',['A Main'],[37,57])],['Explode behind layered utility rather than dry peeking the choke.','Mid lurk watches the fastest B-side rotate.'])
      ],
      defense:[
        P('standard','Standard anchors + Mid info','Default',[S('anchorA','A anchor',['A Site'],[38,46],['Sentinel']),S('info','Mid info',['Mid Courtyard'],[50,52],['Initiator']),S('anchorB','B anchor',['B Site'],[63,46],['Sentinel','Controller']),S('rotate','A Link flex',['A Link'],[43,48],['Controller']),S('anchorC','Market flex',['B Market'],[57,49],['Duelist'])],[A('rotate','A Site','rotate A'),A('anchorC','B Site','rotate B')],[U('trap','B Main trap',['B Main'],[63,58]),U('recon','Mid info',['Mid Courtyard'],[50,53]),U('smoke','A Main delay',['A Main'],[38,57])],['Hold both sites while maintaining enough Mid presence to stop free splits.']),
        P('mid-fight','Mid fight','Aggressive',[S('info','Mid first contact',['Mid Courtyard'],[50,55],['Initiator']),S('anchorC','Market trade',['B Market'],[57,51],['Duelist']),S('rotate','A Link support',['A Link'],[44,51],['Controller']),S('anchorA','A solo',['A Site'],[38,46],['Sentinel']),S('anchorB','B solo',['B Site'],[63,46],['Sentinel'])],[A('info','Mid Bottom','take Mid','entry'),A('anchorC','Mid Courtyard','trade'),A('rotate','Mid Courtyard','support')],[U('flash','Mid flash',['Mid Courtyard'],[50,55]),U('smoke','Mid choke',['Mid Bottom'],[50,61]),U('trap','B safety',['B Main'],[63,58])],['Take Mid with a three-player trade structure, then fall back after the first utility exchange.']),
        P('b-retake','B retake shell','Conservative',[S('anchorB','B delay',['B Site'],[63,47],['Sentinel','Controller']),S('info','Market',['B Market'],[57,49],['Initiator']),S('rotate','Defender spawn',['Defender Side Spawn'],[50,38],['Controller']),S('anchorA','A hold',['A Site'],[38,46],['Sentinel']),S('anchorC','Mid flex',['Mid Courtyard'],[50,51],['Duelist'])],[A('rotate','B Site','spawn retake'),A('info','B Site','Market retake'),A('anchorC','B Market','mid join')],[U('smoke','B Main isolate',['B Main'],[63,58]),U('recon','B site scan',['B Site'],[63,47]),U('flash','Market pop',['B Market'],[57,49])],['Keep Market control as long as possible so the retake has two lanes.','B anchor should delay rather than die before support arrives.'])
      ]
    },
    Abyss:{
      attack:[
        P('mid-default','Mid control default','Slow',[S('entry','Mid pressure',['Mid','Mid Bottom'],[50,62],['Duelist']),S('second','A Main pressure',['A Main'],[37,67],['Duelist','Initiator']),S('support','B Main info',['B Main'],[63,67],['Initiator']),S('smoke','Mid support',['Mid'],[50,67],['Controller']),S('lurk','A extremity',['A Main'],[36,70],['Sentinel'])],[A('entry','Mid','take mid'),A('second','A Site','A threat'),A('support','B Site','B threat')],[U('smoke','mid cross',['Mid'],[50,54]),U('recon','mid scan',['Mid'],[50,54]),U('trap','A flank',['A Main'],[37,67])],['Use central control to keep both sites live.','Sentinel extremity punishes early defender rotations.']),
        P('a-split','A split','Medium',[S('entry','A Main',['A Main'],[37,62],['Duelist']),S('second','A Link',['A Link','Mid'],[44,54],['Duelist','Initiator']),S('support','A Main support',['A Main'],[37,68],['Initiator']),S('smoke','Mid support',['Mid'],[50,62],['Controller']),S('lurk','B hold',['B Main'],[63,69],['Sentinel'])],[A('entry','A Site','main entry','entry'),A('second','A Site','link pinch'),A('smoke','A Site','join hit')],[U('smoke','A back site',['A Site'],[38,45]),U('flash','A choke',['A Main'],[37,58]),U('recon','A site scan',['A Site'],[38,45])],['Collapse Main and Link together.','Do not let the Main entry become isolated from the split group.']),
        P('b-exec','B execute','Fast',[S('entry','B Main',['B Main'],[63,62],['Duelist']),S('second','B trade',['B Main'],[61,65],['Duelist','Initiator']),S('support','B utility',['B Main'],[63,69],['Initiator']),S('smoke','B support',['B Main'],[60,69],['Controller']),S('lurk','Mid hold',['Mid'],[50,65],['Sentinel'])],[A('entry','B Site','first contact','entry'),A('second','B Site','trade'),A('support','B Site','follow')],[U('smoke','B back site',['B Site'],[63,45]),U('recon','B scan',['B Site'],[63,45]),U('flash','B pop',['B Main'],[63,58])],['Hit behind synchronized recon/flash and keep the second player close enough to trade immediately.'])
      ],
      defense:[
        P('standard','Standard anchors + Mid','Default',[S('anchorA','A anchor',['A Site'],[38,45],['Sentinel']),S('info','Mid info',['Mid'],[50,51],['Initiator']),S('anchorB','B anchor',['B Site'],[63,45],['Sentinel','Controller']),S('rotate','A Link flex',['A Link'],[44,48],['Controller']),S('anchorC','B Link flex',['B Link','Mid'],[56,48],['Duelist'])],[A('rotate','A Site','rotate A'),A('anchorC','B Site','rotate B')],[U('trap','B Main trap',['B Main'],[63,58]),U('recon','Mid info',['Mid'],[50,53]),U('smoke','A Main delay',['A Main'],[38,58])],['Center pair prevents free splits while the site anchors preserve stall utility.']),
        P('mid-fight','Mid fight','Aggressive',[S('info','Mid first contact',['Mid'],[50,55],['Initiator']),S('anchorC','Mid trade',['Mid'],[54,53],['Duelist']),S('rotate','Mid support',['Mid'],[47,51],['Controller']),S('anchorA','A solo',['A Site'],[38,45],['Sentinel']),S('anchorB','B solo',['B Site'],[63,45],['Sentinel'])],[A('info','Mid','take space','entry'),A('anchorC','Mid','trade'),A('rotate','Mid','support')],[U('flash','Mid flash',['Mid'],[50,55]),U('smoke','Mid cut',['Mid'],[50,58]),U('trap','weak site',['B Main'],[63,58])],['Contest Mid with three bodies and a predetermined fallback after first contact.']),
        P('retake','Retake shell','Conservative',[S('anchorA','A delay',['A Site'],[38,46],['Sentinel','Controller']),S('anchorB','B delay',['B Site'],[63,46],['Sentinel','Controller']),S('info','Mid info',['Mid'],[50,51],['Initiator']),S('rotate','Defender spawn',['Defender Side Spawn'],[50,38],['Controller']),S('anchorC','Link flex',['A Link','B Link'],[50,45],['Duelist'])],[A('rotate','A Site','retake A'),A('rotate','B Site','retake B')],[U('recon','retake scan',['A Site'],[38,46]),U('smoke','retake isolation',['B Site'],[63,46])],['Outer anchors delay and survive.','Central three collapse together once site commitment is confirmed.'])
      ]
    },
    Summit:{
      attack:[
        P('central-default','Central control default','Slow',[S('entry','Central pressure',['Mid','Central'],[50,62],['Duelist']),S('second','A pressure',['A Main'],[37,67],['Duelist','Initiator']),S('support','B pressure',['B Main'],[63,67],['Initiator']),S('smoke','Central support',['Mid','Central'],[50,67],['Controller']),S('lurk','A extremity',['A Main'],[36,70],['Sentinel'])],[A('entry','Mid','take center'),A('second','A Site','A threat'),A('support','B Site','B threat')],[U('smoke','center cross',['Mid','Central'],[50,54]),U('recon','center scan',['Mid','Central'],[50,54])],['Take central space before choosing the outer site.','Keep both outer lanes represented until defenders commit resources.']),
        P('a-split','A split','Medium',[S('entry','A Main',['A Main'],[37,62],['Duelist']),S('second','A Link',['A Link','Mid'],[44,54],['Duelist','Initiator']),S('support','A Main support',['A Main'],[37,68],['Initiator']),S('smoke','Central support',['Mid'],[50,62],['Controller']),S('lurk','B hold',['B Main'],[63,69],['Sentinel'])],[A('entry','A Site','main entry','entry'),A('second','A Site','link pinch')],[U('smoke','A back site',['A Site'],[38,45]),U('recon','A scan',['A Site'],[38,45])],['Main and link groups collapse inside the same utility window.']),
        P('b-split','B split','Medium',[S('entry','B Main',['B Main'],[63,62],['Duelist']),S('second','B Link',['B Link','Mid'],[56,54],['Duelist','Initiator']),S('support','B Main support',['B Main'],[63,68],['Initiator']),S('smoke','Central support',['Mid'],[50,62],['Controller']),S('lurk','A hold',['A Main'],[37,69],['Sentinel'])],[A('entry','B Site','main entry','entry'),A('second','B Site','link pinch')],[U('smoke','B back site',['B Site'],[63,45]),U('flash','B choke',['B Main'],[63,58])],['Link timing matters more than raw speed.','Keep the opposite extremity alive for the late round.'])
      ],
      defense:[
        P('standard','Standard anchors + center','Default',[S('anchorA','A anchor',['A Site'],[38,45],['Sentinel']),S('info','Central info',['Mid','Central'],[50,51],['Initiator']),S('anchorB','B anchor',['B Site'],[63,45],['Sentinel','Controller']),S('rotate','A link flex',['A Link'],[44,48],['Controller']),S('anchorC','B link flex',['B Link'],[56,48],['Duelist'])],[A('rotate','A Site','rotate A'),A('anchorC','B Site','rotate B')],[U('trap','B Main trap',['B Main'],[63,58]),U('recon','center info',['Mid','Central'],[50,53])],['Control central routes while outer anchors keep utility for first contact.']),
        P('center-fight','Center fight','Aggressive',[S('info','Center first',['Mid','Central'],[50,55],['Initiator']),S('anchorC','Center trade',['Mid','Central'],[54,53],['Duelist']),S('rotate','Center support',['Mid','Central'],[47,51],['Controller']),S('anchorA','A solo',['A Site'],[38,45],['Sentinel']),S('anchorB','B solo',['B Site'],[63,45],['Sentinel'])],[A('info','Mid','take center','entry'),A('anchorC','Mid','trade')],[U('flash','center flash',['Mid'],[50,55]),U('smoke','center cut',['Mid'],[50,58])],['Three-player center fight creates early information and rotation freedom.']),
        P('retake','Retake shell','Conservative',[S('anchorA','A delay',['A Site'],[38,46],['Sentinel','Controller']),S('anchorB','B delay',['B Site'],[63,46],['Sentinel','Controller']),S('info','Center info',['Mid'],[50,51],['Initiator']),S('rotate','Defender spawn',['Defender Side Spawn'],[50,38],['Controller']),S('anchorC','Link flex',['A Link','B Link'],[50,45],['Duelist'])],[A('rotate','A Site','retake A'),A('rotate','B Site','retake B')],[U('recon','retake scan',['A Site'],[38,46]),U('smoke','retake isolate',['B Site'],[63,46])],['Preserve utility and converge through multiple routes after plant.'])
      ]
    }
  };

  function plays(map,side){return PLAYBOOK[map]?.[side]||[]}
  function sourceFor(map){return SOURCES[map]||null}
  function validate(){
    const errors=[];
    for(const [map,sides] of Object.entries(PLAYBOOK)){
      for(const side of ['attack','defense']){
        const rows=sides[side]||[];
        if(rows.length<3)errors.push(`${map} ${side}: fewer than 3 plays`);
        for(const p of rows){
          if(!p.id||!p.title)errors.push(`${map} ${side}: play missing id/title`);
          if((p.positions||[]).length!==5)errors.push(`${map} ${side} ${p.id}: expected 5 positions`);
          for(const pos of p.positions||[]){
            if(!Array.isArray(pos.fallback)||pos.fallback.length!==2)errors.push(`${map} ${p.id}: bad fallback`);
            else if(pos.fallback.some(v=>v<0||v>100))errors.push(`${map} ${p.id}: fallback out of range`);
          }
        }
      }
      if(!SOURCES[map]?.url)errors.push(`${map}: missing replay source`);
    }
    return errors;
  }
  return{PLAYBOOK,SOURCES,plays,sourceFor,validate};
});
