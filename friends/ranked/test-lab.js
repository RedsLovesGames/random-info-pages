/* Rank Riot offline QA lab. No network or storage access; only renders sample state. */
(function(root){
  'use strict';
  root.RankRiotTestLab=function(api){
    const stages=['lobby','question','reveal','leaderboard','finished','skipped','archive','history','fame'];
    const stagesLabel=['Lobby / join PIN','Rank three answers','Answer reveal / FX','Leaderboard / overtakes','Winner + postgame awards','Skipped question','Saved match + answer ranks','Past game archive','Answer Hall of Fame'];
    const names=['Tommy','Alex','Doron','Jack','Mike','Nora'];
    const answers=[
      'An alarm clock that argues back',
      'A shopping cart with a jet engine',
      'The last slice of pizza at 3 AM',
      'A microwave that only plays jazz',
      'A haunted USB stick full of memes',
      'A disco ball in a chemistry lab'
    ];
    const awards={complete:true,cards:[
      {id:'crowd-favorite',title:'Crowd Favorite',winner:'Doron',stat:'5 first-place votes',answer:answers[1],detail:'Most first-place votes for a single answer.',question:'Which object has Alex energy?',game:'alex',number:1},
      {id:'top-answer',title:'Biggest Hit',winner:'Tommy',stat:'14 points',answer:answers[0],detail:'Highest-scoring individual answer.',question:'Which object has Alex energy?',game:'alex',number:1},
      {id:'first-place-magnet',title:'First-Place Magnet',winner:'Doron',stat:'37 first-place votes',detail:'Most first-place votes across all answers.'},
      {id:'most-consistent',title:'Consistency Crown',winner:'Nora',stat:'22/25 scoring rounds',detail:'Earned points in the largest share of rounds.'},
      {id:'biggest-comeback',title:'Biggest Comeback',winner:'Jack',stat:'Up 3 places',detail:'Largest one-round rise on the leaderboard.'},
      {id:'underdog',title:'Underdog Moment',winner:'Mike',stat:'9 points from #5',answer:answers[4],detail:'A bottom-half player won the question.',question:'What would Doron collect?',game:'doron',number:9}
    ]};
    const t={open:false,scene:'lobby',role:'player',timer:0,mode:'alex',picks:[],locked:false,checks:null};
    let tour=null;
    function esc(x){return api.esc(x)}
    function scores(){
      return ['Doron','Alex','Nora','Tommy','Jack','Mike'].map((name,i)=>{
        const sum=[112,109,98,84,67,55][i];
        return {name,sum,rounds:25,first:[34,30,21,14,8,4][i],second:18-i*2,third:12-i,average:sum/25};
      });
    }
    function options(){
      const authors=['Tommy','Doron','Alex','Nora','Jack','Mike'];
      return answers.map((text,i)=>({id:'demo-'+i,text,author:authors[i],mine:i===0,
        tally:{sum:[14,12,9,7,3,0][i],first:[4,3,1,1,0,0][i],second:[1,1,2,1,1,0][i],third:[0,1,2,2,1,0][i]}}));
    }
    function snapshot(){
      return {pin:'246810',mode:t.mode,stage:t.scene,game:t.mode==='doron'?'doron':'alex',number:7,questionIndex:6,count:t.mode==='both'?50:25,
        question:'If Alex were an inanimate object, which one would he be?',options:options(),players:names,seconds:t.timer,
        openedAt:Date.now(),closesAt:t.timer?Date.now()+t.timer*1000:0,voteCount:t.locked?6:4,
        voted:t.locked,picks:[...t.picks],viewer:'Tommy',leaderboard:scores(),
        byGame:{alex:scores(),doron:scores().map(p=>({...p,sum:Math.max(0,p.sum-18)}))},awards};
    }
    function saved(){
      const items=options().map((o,i)=>({author:o.author,answer:o.text,rank:i+1,...o.tally}));
      const rounds=[0,1].map(i=>({status:'scored',game:'alex',questionIndex:i,number:i+1,question:'Which object has Alex energy?',
        votes:6,completedAt:new Date().toISOString(),results:items}));
      return {pin:'246810',mode:t.mode,createdAt:new Date().toISOString(),finishedAt:new Date().toISOString(),
        players:names,seconds:t.timer,leaderboard:scores(),byGame:{alex:scores(),doron:scores()},awards,rounds};
    }
    function fame(){
      return {savedGames:12,entries:options().map((o,i)=>({
        author:o.author,answer:o.text,game:i%2?'doron':'alex',question_index:i,question:'Which object has Alex energy?',
        appearances:12,game_count:12,points:95-i*11,first_votes:24-i*3,second_votes:12-i,third_votes:10-i,best_rank:i+1
      }))};
    }
    function select(scene,fx=true){
      if(!stages.includes(scene))return;
      t.scene=scene;t.picks=[];t.locked=false;t.checks=null;
      if(fx){if(scene==='reveal')api.revealSound();if(scene==='finished'){api.lockSound();api.confetti();}}
      api.render();
    }
    function close(){if(tour){clearInterval(tour);tour=null}t.open=false;t.checks=null;api.render();}
    function checks(){
      const result=[];
      const check=(label,fn)=>{try{result.push({label,ok:Boolean(fn())})}catch{result.push({label,ok:false})}};
      check('Six sample answers',()=>options().length===6);
      check('Self-votes marked unavailable',()=>options().filter(o=>o.mine).length===1);
      check('Unlimited and timed mode available',()=>[0,15,45].includes(t.timer));
      check('Player, host and projector screens render',()=>{
        return ['lobby','question','reveal','leaderboard','finished','skipped'].every(scene=>
          ['player','host','projector'].every(role=>api.preview(scene,role,snapshotFor(scene),[],saved(),fame()).length>120));
      });
      check('Saved results and Hall of Fame render',()=>
        api.preview('archive','player',snapshot(),[],saved(),fame()).includes('savedRoundScroll')&&
        api.preview('fame','player',snapshot(),[],saved(),fame()).includes('fame-entry'));
      check('Six mock postgame awards',()=>awards.cards.length===6&&api.preview('finished','player',snapshotFor('finished'),[],saved(),fame()).includes('award-card'));
      check('Sound-effect API available',()=>api.audioSupported());
      check('Test actions cannot call room API',()=>!api.testCanWrite());
      return result;
    }
    function snapshotFor(scene){return {...snapshot(),stage:scene};}
    function view(){
      const entries=stages.map((value,i)=>'<option value="'+value+'" '+(t.scene===value?'selected':'')+'>'+esc(stagesLabel[i])+'</option>').join('');
      const role=['player','host','projector'].map((value,i)=>'<option value="'+value+'" '+(t.role===value?'selected':'')+'>'+['Player phone','Host controls','TV / Projector'][i]+'</option>').join('');
      const timers=[0,15,45].map(sec=>'<option value="'+sec+'" '+(t.timer===sec?'selected':'')+'>'+(sec===0?'No time limit':sec+' seconds')+'</option>').join('');
      const modes=['alex','doron','both'].map(value=>'<option value="'+value+'" '+(t.mode===value?'selected':'')+'>'+{alex:'Alex',doron:'Doron',both:'Double Feature'}[value]+'</option>').join('');
      const btn=(label,action)=>api.button(label,action,'btn ghost small');
      return '<section class="test-shell"><div class="test-header"><div><div class="eyebrow">OFFLINE PLAYGROUND · NO LIVE DATA CHANGED</div><h1>RANK RIOT <span>TEST LAB.</span></h1><p>Try the screens and effects with sample data. This never creates a real room or saves votes.</p></div>'+
        btn('EXIT ×','test-exit')+'</div>'+
        '<div class="test-controls"><label>Screen<select id="testScene">'+entries+'</select></label>'+
        '<label>Device<select id="testRole">'+role+'</select></label>'+
        '<label>Timer<select id="testTimer">'+timers+'</select></label>'+
        '<label>Mode<select id="testMode">'+modes+'</select></label></div>'+
        '<div class="test-actions">'+
        btn('NEXT SCREEN →','test-next')+btn(tour?'■ STOP TOUR':'▶ AUTO TOUR','test-tour')+
        btn('♫ MUSIC','test-music')+btn('♪ SOUND TEST','test-sound')+
        btn('✦ REPLAY FX','test-fx')+btn('✓ RUN CHECKS','test-checks')+btn('↻ RESET','test-reset')+'</div>'+
        (t.checks?'<div class="test-checks"><strong>'+t.checks.filter(c=>c.ok).length+'/'+t.checks.length+' LOCAL CHECKS PASSED</strong><div>'+t.checks.map(c=>'<span class="'+(c.ok?'test-ok':'test-fail')+'">'+(c.ok?'✓':'×')+' '+esc(c.label)+'</span>').join('')+'</div><small>Checks use sample data, not a live multiplayer session.</small></div>':'')+
        '<div class="test-preview-header"><span>PREVIEW · '+esc(t.role.toUpperCase())+' · '+esc(t.scene.toUpperCase())+'</span><strong>FAKE DATA · NOT SAVED</strong></div>'+
        '<div id="testPreview" class="test-preview '+(t.role==='projector'?'test-tv':'')+'">'+
        api.preview(t.scene,t.role,snapshot(),t.picks,saved(),fame())+'</div>'+
        '<p class="test-note">To test rank selection, choose Player phone → Rank three answers. Click three answer cards, then lock in. Other controls are simulated.</p></section>';
    }
    async function action(action,target){
      if(action==='test-exit'){close();return}
      if(action==='test-next'){if(tour){clearInterval(tour);tour=null}select(stages[(stages.indexOf(t.scene)+1)%stages.length]);return}
      if(action==='test-reset'){if(tour){clearInterval(tour);tour=null}Object.assign(t,{scene:'lobby',role:'player',timer:0,mode:'alex',picks:[],locked:false,checks:null});api.render();return}
      if(action==='test-tour'){
        if(tour){clearInterval(tour);tour=null;api.render();return}
        const route=['lobby','question','reveal','leaderboard','finished','archive','fame'];
        select(route[0],false);let i=0;
        tour=setInterval(()=>{if(!t.open||i>=route.length-1){clearInterval(tour);tour=null;api.render();return}select(route[++i]);},3200);
        api.render();return;
      }
      if(action==='test-music'){api.music();return}
      if(action==='test-sound'){api.soundTest();return}
      if(action==='test-fx'){if(t.scene==='reveal')api.revealSound();else{api.lockSound();api.confetti()}api.render();return}
      if(action==='test-checks'){t.checks=checks();api.render();return}
      if(action==='test-pick'){
        if(t.scene!=='question'||t.role!=='player'||t.locked)return;
        const o=options().find(o=>o.id===target.dataset.id);
        if(!o||o.mine)return;
        if(t.picks.includes(o.id)){t.picks=t.picks.filter(id=>id!==o.id);api.rankSound(0,true);}
        else if(t.picks.length<3){t.picks.push(o.id);api.rankSound(t.picks.length-1);}
        else{t.picks.shift();t.picks.push(o.id);api.rankSound(2)}
        api.render();return;
      }
      if(action==='test-vote'){if(t.picks.length!==3||t.locked)return;t.locked=true;api.lockSound();api.render();api.notice('Demo votes locked. No vote was sent.');return}
      if(action==='test-advance'){select(t.scene==='lobby'?'question':t.scene==='question'?'reveal':t.scene==='reveal'?'leaderboard':t.scene==='leaderboard'?'finished':'lobby');return}
      api.notice('Offline preview only. Live game controls are disabled.');
    }
    function change(event){
      const id=event.target?.id,value=event.target?.value;
      if(id==='testScene'){if(tour){clearInterval(tour);tour=null}select(value);return}
      if(id==='testRole'&&['player','host','projector'].includes(value)){t.role=value;t.checks=null;api.render();return}
      if(id==='testTimer'){t.timer=Number(value);t.checks=null;api.render();return}
      if(id==='testMode'&&['alex','doron','both'].includes(value)){t.mode=value;t.checks=null;api.render();return}
    }
    return {get open(){return t.open},openLab(){t.open=true;t.scene='lobby';t.picks=[];t.locked=false;t.checks=null;api.render()},close,view,action,change};
  };
})(window);
