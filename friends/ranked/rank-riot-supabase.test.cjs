const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const dir=__dirname;
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const edge=fs.readFileSync(path.join(dir,'supabase/index.ts'),'utf8');
const app=html.match(/<script>([\s\S]*?)<\/script>/)?.[1]||'';
const css=html.match(/<style>([\s\S]*?)<\/style>/)?.[1]||'';
test('Frontend parses and targets pinned Supabase function, never JSONP',()=>{
  assert.doesNotThrow(()=>new vm.Script(app));
  assert.match(app,/bpudsyyepiminpdxlquz\.supabase\.co\/functions\/v1\/rank-riot/);
  assert.match(app,/method:'POST'/);
  assert.doesNotMatch(app, /validServer\(|rankCb_|script\.google\.com|state\.server/);
});
test('Host setup no longer exposes Apps Script configuration fields',()=>{
  assert.match(app,/Host access key/);
  assert.match(app,/rank-riot-host-key/);
  assert.doesNotMatch(app,/id="serverUrl"|Save.*author assignments|function saveServer/);
});
test('Player invite links contain only public PIN',()=>{
  assert.match(app,/u\.searchParams\.set\('pin',state\.pin\)/);
  assert.doesNotMatch(app,/u\.searchParams\.set\('secret'/);
});
test('All actual answer authors may participate in either game',()=>{
  for(const n of ['Tommy','Mike','Jack','Ethan','Rita','Nora','Alex','Doron']) assert.ok(app.includes("'"+n+"'"));
});
test('Backend requires host credential and enforces locked, self-free, three-choice ballots',()=>{
  assert.match(edge,/await authorize\(tx,p\.secret\)/);
  assert.match(edge,/picks\.length===3&&new Set\(picks\)\.size===3/);
  assert.match(edge,/!s\.votes\[player\.name\]/);
  assert.match(edge,/o\.author!==player\.name/);
  assert.match(edge,/now<s\.closesAt/);
  assert.match(edge,/for update/);
  assert.match(edge,/if\(s\.stage==='question'&&s\.seconds>0&&now>=s\.closesAt\)/);
});
test('Server keeps answer authors hidden until reveal',()=>{
  assert.match(edge,/\.\.\.\(show\?\{author:o\.author/);
  assert.match(edge,/mine:Boolean\(player&&o\.author===player\.name\)/);
});
test('Host can start an existing lobby directly from Host Control Room',()=>{
  assert.match(app,/Existing room PIN/);
  assert.match(app,/case 'start-now'/);
  assert.match(app,/const room=await rpc\('state',\{pin,secret\}\)/);
  assert.match(app,/if\(room\.stage==='lobby'\)await rpc\('advance',\{pin,secret\}\)/);
  assert.match(app,/state\.pin=pin;state\.view='host'/);
  assert.match(app,/rank-riot-last-host-pin/);
  assert.match(app,/START NOW ↗/);
});
test('Total points are the primary leaderboard and winner metric',()=>{
  assert.match(edge,/\.sort\(\(a,b\)=>b\.sum-a\.sum\|\|b\.first-a\.first\|\|b\.average-a\.average/);
  assert.match(app,/const top=Math\.max\(1,\.\.\.scores\.map\(s=>s\.sum\)\)/);
  assert.match(app,/p\.sum\/top\*100/);
  assert.match(app,/score-value.*<strong class="animated-score" data-score="\$\{p\.sum\}">\$\{p\.sum\}<\/strong><span>PTS<\/span>/);
  assert.match(app,/\$\{p\.average\.toFixed\(2\)\} avg pts\/answer/);
  assert.match(app,/\$\{win\.sum\} total points/);
});
test('Finished matches are durably archived without exposing private player keys',()=>{
  const schema=fs.readFileSync(path.join(dir,'supabase/schema.sql'),'utf8');
  assert.match(schema,/create table if not exists public\.rankriot_results/);
  assert.match(schema,/alter table public\.rankriot_results enable row level security/);
  assert.match(schema,/revoke all on public\.rankriot_results from public, anon, authenticated/);
  assert.match(edge,/async function archiveFinished\(tx:any,s:any\)/);
  assert.match(edge,/await archiveFinished\(tx,s\)/);
  assert.match(edge,/on conflict\(pin\) do nothing/);
  assert.match(edge,/const playerNames=s\.players\.map\(\(p:any\)=>p\.name\)/);
});
test('Per-round score results are recorded and retained across the game',()=>{
  assert.match(edge,/async function settle\(tx:any,s:any\)/);
  assert.match(edge,/s\.history\.push\(round\)/);
  assert.match(edge,/status:'scored'/);
  assert.match(edge,/status:'skipped'/);
  assert.match(edge,/await settle\(tx,s\)/);
  assert.match(edge,/history:\[\],questionText:''/);
  assert.match(edge,/seconds_per_question,players,scores,by_game,rounds/);
});
test('Host-only saved match history and match detail APIs support pagination',()=>{
  assert.match(edge,/if\(action==='history'\)/);
  assert.match(edge,/if\(action==='result'\)/);
  assert.match(edge,/await authorize\(tx,p\.secret\)/);
  assert.match(edge,/limit \$\{limit\+1\} offset \$\{offset\}/);
  assert.match(edge,/nextOffset:offset\+Math\.min\(rows\.length,limit\)/);
  assert.match(edge,/rows\.length,'Saved game not found\.'/);
});
test('Finished games can be inspected and exported from the website',()=>{
  assert.match(app,/function historyView\(\)/);
  assert.match(app,/function resultView\(\)/);
  assert.match(app,/VIEW SAVED GAME RESULTS/);
  assert.match(app,/case 'history'/);
  assert.match(app,/case 'open-result'/);
  assert.match(app,/case 'more-history'/);
  assert.match(app,/case 'export-result'/);
  assert.match(app,/state\.view==='history'/);
  assert.match(app,/state\.view==='saved-result'/);
  assert.match(app,/JSON\.stringify\(state\.savedResult,null,2\)/);
});
test('Each saved question stores rank positions and supports tied answers',()=>{
  assert.match(edge,/const ranked=s\.options\.map/);
  assert.match(edge,/ranked\.forEach\(\(a:any,i:number\)=>/);
  assert.match(edge,/a\.rank=previous&&/);
  assert.match(edge,/results:ranked/);
  assert.match(edge,/s\.history\.push\(round\)/);
  assert.match(edge,/tx\.json\(Array\.isArray\(s\.history\)\?s\.history:\[\]\)/);
});
test('Saved results show a scrollable list of question-by-question ranked answers',()=>{
  assert.match(css,/\.history-round-scroll\{[^}]*overflow-y:auto/);
  assert.match(css,/\.ranked-answer-list/);
  assert.match(css,/@media\(max-width:600px\)/);
  assert.match(app,/function answerPlacements\(round\)/);
  assert.match(app,/class="history-rounds history-round-scroll"/);
  assert.match(app,/id="savedQuestionJump"/);
  assert.match(app,/id="saved-round-\$\{i\}"/);
  assert.match(app,/opt\.rank===1\?'first-answer'/);
  assert.match(app,/case 'open-finished-result'/);
  assert.match(app,/selected\.scrollIntoView\(/);
  assert.match(app,/button\('VIEW QUESTION RANKINGS/);
});
test('Legacy rounds without explicit stored ranks display ties correctly',()=>{
  const start=app.indexOf('  function answerPlacements(round){');
  const end=app.indexOf('  function resultView(){',start);
  assert.ok(start>=0&&end>start,'answerPlacements is present');
  const fn=vm.runInNewContext(app.slice(start,end)+'\nanswerPlacements');
  const placements=fn({results:[
    {author:'Alex',sum:10,first:3,second:0,third:1},
    {author:'Tommy',sum:6,first:2,second:0,third:0},
    {author:'Rita',sum:6,first:2,second:0,third:0},
    {author:'Doron',sum:2,first:0,second:1,third:0}
  ]});
  assert.deepEqual(Array.from(placements, r=>r.rank),[1,2,2,4]);
});
test('Unlimited rounds accept votes indefinitely and automatically reveal after everyone submits',()=>{
  assert.match(app,/<option value="0">No time limit/);
  assert.match(edge,/seconds===0\|\|\(seconds>=15&&seconds<=120\)/);
  assert.match(edge,/s\.closesAt=s\.seconds===0\?0:s\.openedAt\+s\.seconds\*1000/);
  assert.match(edge,/s\.stage==='question'&&\(s\.seconds===0\|\|now<s\.closesAt\)/);
  assert.match(edge,/Object\.keys\(s\.votes\)\.length===s\.players\.length\)await settle\(tx,s\)/);
  assert.match(edge,/s\.seconds>0&&now>=s\.closesAt/);
  assert.match(app,/function timer\(s\)\{return s\.seconds===0\?/);
  assert.match(app,/s\.stage!=='question'\|\|s\.seconds===0/);
});
test('Official spooky Kahoot audio is locally staged, default-on, and plays without YouTube',()=>{
  const music=fs.readFileSync(path.join(dir,'spooky-music.js'),'utf8');
  const workflow=fs.readFileSync(path.join(dir,'../../.github/workflows/pages.yml'),'utf8');
  assert.match(html,/id="spookyMusicPanel"/);
  assert.match(html,/id="musicButton"/);
  assert.match(html,/src="spooky-music\.js"/);
  assert.match(html,/id="spookyPlay"/);
  assert.match(html,/id="spookyPause"/);
  assert.match(app,/RankRiotSpookyMusic\(\)/);
  assert.match(app,/rank-riot-spooky-music'\)!=='off'/);
  assert.match(app,/pointerdown',beginSpookyMusic/);
  assert.match(app,/keydown',beginSpookyMusic/);
  assert.match(app,/spookyMusic\.setPhase\(snapshot\.stage\)/);
  assert.match(music,/\.\/music\/kahoot-halloween\.mp3/);
  assert.match(music,/https:\/\/kahoot\.com\/files\/2022\/10\/Lobby-Music-Halloween-Edition\.mp3/);
  assert.match(music,/audio\.loop=true/);
  assert.match(workflow,/Download Kahoot Halloween lobby music into Rank Riot site/);
  assert.match(workflow,/music\/kahoot-halloween\.mp3/);
  assert.doesNotMatch(html,/youtube\.com\/embed|youtube-nocookie\.com/);
});
test('Answer reveals use a six-answer podium with all placements and points',()=>{
  assert.match(app,/function podiumRanks\(s\)/);
  assert.match(app,/function answerPodium\(s,compact=false\)/);
  assert.match(app,/const upper=\[top\[0\],top\[1\],top\[2\]\]/);
  assert.match(app,/podium-top/);
  assert.match(app,/podium-bottom/);
  assert.match(app,/podium-score/);
  assert.match(app,/podium-votes/);
  assert.match(app,/answerPodium\(s\)/);
  assert.match(app,/answerPodium\(s,true\)/);
  assert.match(css,/\.podium-slot-center \.podium-base\{/);
  assert.match(css,/\.podium-small/);
  assert.match(css,/prefers-reduced-motion:reduce/);
  const start=app.indexOf('  function podiumRanks(s){');
  const end=app.indexOf('  function scoresBoard(',start);
  assert.ok(start>=0&&end>start);
  const portion=app.slice(start,end);
  const compiled=vm.runInNewContext(portion+'\n({podiumRanks,answerPodium})',{
    esc:x=>String(x),state:{view:'host'},hostActions:()=>'<button>Next</button>'
  });
  const o=(author,sum,first=0,second=0,third=0)=>({author,text:author+' answer',tally:{sum,first,second,third}});
  const question={game:'alex',number:7,question:'Sample',options:[
    o('Last',0),o('Second',12,3,1,1),o('Third',9,1,2,2),o('First',14,4,1,0),o('Fifth',3),o('Fourth',7)
  ]};
  const ranks=compiled.podiumRanks(question);
  assert.deepEqual(Array.from(ranks,r=>[r.author,r.place]),[
    ['First',1],['Second',2],['Third',3],['Fourth',4],['Fifth',5],['Last',6]
  ]);
  const output=compiled.answerPodium(question);
  assert.match(output,/#1/);assert.match(output,/#6/);
  assert.match(output,/14 <small>PTS<\/small>/);
  assert.match(output,/4 first/);
  assert.equal((output.match(/class="podium-entry/g)||[]).length,6);
  assert.match(output,/podium-top/);assert.match(output,/podium-bottom/);
  const topPart=output.split('class="podium-top">')[1].split('</div>\n      <div class="podium-bottom">')[0];
  assert.ok(topPart.indexOf('podium-slot-left')<topPart.indexOf('podium-slot-center'));
  assert.ok(topPart.indexOf('podium-slot-center')<topPart.indexOf('podium-slot-right'));
  assert.match(topPart,/podium-gold podium-slot-left/);
  assert.match(topPart,/podium-silver podium-slot-center/);
  assert.match(topPart,/podium-bronze podium-slot-right/);
  assert.match(css,/\.podium-slot-center \.podium-card\{min-height:260px\}/);
  assert.match(css,/\.podium-slot-left \.podium-card\{min-height:216px\}/);
  assert.match(css,/\.podium-slot-center \.podium-base\{height:96px\}/);
  assert.match(css,/\.podium-slot-left \.podium-base\{height:79px\}/);
  assert.match(css,/\.result-podium-tv \.podium-slot-center \.podium-card\{min-height:220px\}/);
});
test('Rank selection audio and game-show visual FX use accessible reduced-motion fallback',()=>{
  assert.match(app,/rank-tray-grid/);
  assert.match(app,/slot-medal/);
  assert.match(app,/function rankSound\(position,removed=false\)/);
  assert.match(app,/523\.25,659\.25,783\.99/);
  assert.match(app,/function lockSound\(\)/);
  assert.match(app,/function revealSound\(\)/);
  assert.match(app,/let audioContext=null/);
  assert.match(css,/@keyframes answerCurtain/);
  assert.match(css,/@keyframes scoreSlide/);
  assert.match(css,/@keyframes selectionBounce/);
  assert.match(css,/prefers-reduced-motion:reduce/);
  assert.match(app,/function animateScoreCounters\(\)/);
  assert.match(app,/podium-champion/);
});
test('Hall of Fame uses archived answers with host authorization, rankings, and filters',()=>{
  assert.match(edge,/if\(action==='fame'\)/);
  assert.match(edge,/await authorize\(tx,p\.secret\)/);
  assert.match(edge,/jsonb_array_elements\(h\.rounds\)/);
  assert.match(edge,/sum\(\(a\.item->>'sum'\)::int\)/);
  assert.match(app,/function fameView\(\)/);
  assert.match(app,/case 'fame'/);
  assert.match(app,/id="fameFilter"/);
  assert.match(app,/id="fameSort"/);
  assert.match(css,/\.fame-podium/);
});
test('Hall of Fame reset excludes old matches without deleting history',()=>{
  assert.match(edge,/key='hall_of_fame_since'/);
  assert.match(edge,/h\.finished_at>=\$\{since\}::timestamptz/);
  assert.match(edge,/rankriot_results where finished_at>=\$\{since\}::timestamptz/);
  assert.match(edge,/if\(action==='history'\)/);
  assert.match(edge,/if\(action==='result'\)/);
});
test('Projector access uses separate unguessable token and does not expose host key',()=>{
  assert.match(edge,/if\(action==='projector-access'\)/);
  assert.match(edge,/await authorize\(tx,p\.secret\)/);
  assert.match(edge,/s\.projectorHash=await hash\(viewerKey\)/);
  assert.match(edge,/action==='projector-state'/);
  assert.match(edge,/validSpectator=spectator&&viewerKey\.length===48/);
  assert.match(edge,/requireTrue\(spectator\?validSpectator:isHost\|\|player/);
  assert.match(edge,/result=snapshot\(s,Boolean\(isHost\),player,now,questionText\)/);
  assert.match(edge,/if\(modified\)await tx`update rankriot_rooms/);
  assert.doesNotMatch(app,/searchParams\.set\('secret'/);
});
test('Read-only TV view supports every stage and independent fullscreen projection',()=>{
  assert.match(html,/<meta name="referrer" content="no-referrer"/);
  assert.match(app,/u\.searchParams\.set\('display',state\.pin\)/);
  assert.match(app,/u\.searchParams\.set\('viewer',key\)/);
  assert.match(app,/case 'open-projector'/);
  assert.match(app,/case 'copy-projector'/);
  assert.match(app,/case 'tv-fullscreen'/);
  assert.match(app,/function tvView\(\)/);
  assert.match(app,/function tvToolbar\(\)/);
  assert.match(app,/state\.view==='projector'\)app\.innerHTML=tvView\(\)/);
  assert.match(app,/rpc\(projector\?'projector-state':'state'/);
  assert.match(app,/if\(s\.stage==='lobby'\)/);
  assert.match(app,/if\(s\.stage==='question'\)/);
  assert.match(app,/if\(s\.stage==='reveal'\)/);
  assert.match(app,/if\(s\.stage==='leaderboard'\)/);
  assert.match(app,/if\(s\.stage==='finished'\)/);
  assert.match(css,/\.tv-stage/);
  assert.match(css,/body\.tv-mode/);
});
test('Shared sound engine is reused and supports countdown and per-rank tones',()=>{
  assert.match(app,/let audioContext=null/);
  assert.match(app,/if\(!audioContext\|\|audioContext\.state==='closed'\)audioContext=new AC\(\)/);
  assert.match(app,/function rankSound\(/);
  assert.match(app,/function lockSound\(/);
  assert.match(app,/function revealSound\(/);
  assert.match(app,/lastTimerBeep/);
  assert.match(app,/audioReady\(\);beginSpookyMusic\(\);let action=target\.dataset\.action/);
});
test('Postgame awards are persistently saved and exposed on final, historical, and TV screens',()=>{
  const awards=fs.readFileSync(path.join(dir,'supabase/awards.mjs'),'utf8');
  const schema=fs.readFileSync(path.join(dir,'supabase/schema.sql'),'utf8');
  assert.match(awards,/export function buildAwards\(rounds, scores, mode\)/);
  assert.match(schema,/awards jsonb not null default/);
  assert.match(edge,/import \{ buildAwards \} from '\.\/awards\.mjs'/);
  assert.match(edge,/s\.awards=awards/);
  assert.match(edge,/tx\.json\(awards\)/);
  assert.match(edge,/result\.awards=s\.awards\?\.cards/);
  assert.match(edge,/awards:row\.awards\?\.cards/);
  assert.match(app,/function postgameAwardsPanel\(/);
  assert.match(app,/postgameAwardsPanel\(s\.awards\)/);
  assert.match(app,/postgameAwardsPanel\(s\.awards,true\)/);
  assert.match(app,/postgameAwardsPanel\(r\.awards\)/);
  assert.match(css,/\.award-card\{/);
  assert.match(css,/prefers-reduced-motion:reduce/);
});
test('Awards engine picks objective winners and rejects incomplete historical games',async()=>{
  const {pathToFileURL}=require('node:url');
  const {buildAwards}=await import(pathToFileURL(path.join(dir,'supabase/awards.mjs')).href);
  const names=['Alex','Doron','Jack','Mike','Nora','Rita'];
  const scores=Object.fromEntries(names.map(name=>[name,{sum:0,first:0,second:0,third:0,rounds:0}]));
  const rounds=Array.from({length:25},(_,i)=>({
    game:'alex',questionIndex:i,number:i+1,question:'Question '+(i+1),status:'scored',votes:1,
    results:names.map((name,k)=>{
      const sum=k===0?3:k===1?2:k===2?1:0;
      scores[name].sum+=sum;scores[name].rounds++;
      if(k===0)scores[name].first++;
      return {author:name,answer:name+' answer '+(i+1),sum,rank:k+1,first:k===0?1:0,second:k===1?1:0,third:k===2?1:0};
    })
  }));
  const result=buildAwards(rounds,scores,'alex');
  assert.equal(result.complete,true);
  const byId=Object.fromEntries(result.cards.map(card=>[card.id,card]));
  for(const id of ['crowd-favorite','top-answer','first-place-magnet','most-consistent'])assert.ok(byId[id],id);
  assert.equal(byId['crowd-favorite'].winner,'Alex');
  assert.equal(byId['first-place-magnet'].stat,'25 first-place votes');
  assert.equal(byId['most-consistent'].stat,'25/25 scoring rounds');
  assert.equal(result.cards.filter(card=>card.id==='biggest-comeback').length,0);
  const historic=buildAwards(rounds.slice(-1),scores,'alex');
  assert.equal(historic.complete,false);
  assert.deepEqual(historic.cards,[]);
  const duplicate=buildAwards([rounds[0],...rounds.slice(0,24)],scores,'alex');
  assert.equal(duplicate.complete,false);
  const both=buildAwards(rounds,scores,'both');
  assert.equal(both.complete,false);
});
test('Award winning honors never use uncast vote counts or fake humor judgments',async()=>{
  const {pathToFileURL}=require('node:url');
  const {buildAwards}=await import(pathToFileURL(path.join(dir,'supabase/awards.mjs')).href);
  const names=['A','B','C','D','E','F'];
  const scores=Object.fromEntries(names.map(name=>[name,{sum:0,rounds:25,first:0}]));
  const results=Array.from({length:25},(_,i)=>{
    const champion=i<9?'A':i<12?'B':i<16?'C':i<20?'D':'E';
    const opts=names.map(name=>({author:name,answer:name+' says hello',sum:name===champion?3:0,first:name===champion?1:0,second:0,third:0,rank:name===champion?1:2}));
    scores[champion].sum+=3;scores[champion].first++;
    return {game:'alex',questionIndex:i,number:i+1,question:'What?',status:'scored',votes:1,results:opts};
  });
  const awards=buildAwards(results,scores,'alex');
  assert.equal(awards.complete,true);
  assert.ok(awards.cards.some(c=>c.id==='underdog'||c.id==='biggest-comeback'), 'Dynamic awards should capture score changes');
  assert.ok(awards.cards.every(c=>typeof c.winner==='string'&&typeof c.detail==='string'));
  assert.ok(!awards.cards.some(c=>/funniest/i.test(c.title)),'Popularity is not an objective measure of humor');
});
test('Tiny TEST corner button loads isolated offline preview only',()=>{
  const lab=fs.readFileSync(path.join(dir,'test-lab.js'),'utf8');
  assert.match(html,/id="testToggle"/);
  assert.match(html,/src="test-lab\.js"/);
  assert.match(css,/\.test-corner\{/);
  assert.match(css,/\.test-preview\{/);
  assert.match(app,/testLab=window\.RankRiotTestLab\(/);
  assert.match(app,/if\(testLab\?\.open\)app\.innerHTML=testLab\.view\(\)/);
  assert.match(app,/if\(testLab\?\.open\|\|!\['host','player','projector'\]/);
  assert.match(app,/if\(testLab\?\.open\)return;const s=state\.snapshot/);
  assert.match(app,/await testLab\.action\(action,target\)/);
  assert.match(lab,/NO LIVE DATA CHANGED|NO LIVE DATA|No real game|NO LIVE DATA CHANGED|No LIVE DATA CHANGED|NO DATABASE WRITES|NO LIVE DATA CHANGED/i);
  assert.doesNotMatch(lab, /fetch\(|XMLHttpRequest|supabase\.co|localStorage|\.rpc\(/i);
  assert.doesNotMatch(lab,/window\.location\s*=|document\.cookie/);
});
test('Offline lab stages, mocked snapshots and voting simulation work',async()=>{
  const lab=fs.readFileSync(path.join(dir,'test-lab.js'),'utf8');
  const fakeRoot={};
  vm.runInNewContext(lab,{window:fakeRoot,setInterval:()=>123,clearInterval:()=>{}});
  assert.equal(typeof fakeRoot.RankRiotTestLab,'function');
  const seen=[],messages=[];
  let renderCount=0;
  const api={
    esc:v=>String(v),button:(label,action)=>'<button data-action="'+action+'">'+label+'</button>',
    preview:(scene,role,snapshot,picks)=>{seen.push({scene,role,snapshot,picks:[...picks]});return '<div class="shell tv-stage"><div id="savedRoundScroll"></div><div class="fame-entry"></div><div class="award-card"></div></div>';},
    render:()=>renderCount++,rankSound:()=>{},lockSound:()=>{},revealSound:()=>{},confetti:()=>{},
    music:()=>{},soundTest:()=>{},audioSupported:()=>true,testCanWrite:()=>false,notice:x=>messages.push(x)
  };
  const instance=fakeRoot.RankRiotTestLab(api);
  assert.equal(instance.open,false);
  instance.openLab();
  assert.equal(instance.open,true);
  assert.match(instance.view(),/TEST LAB/);
  assert.match(instance.view(),/FAKE DATA · NOT SAVED/);
  instance.change({target:{id:'testScene',value:'question'}});
  instance.change({target:{id:'testRole',value:'player'}});
  await instance.action('test-pick',{dataset:{id:'demo-0'}}); // self-voting disallowed
  await instance.action('test-pick',{dataset:{id:'demo-1'}});
  await instance.action('test-pick',{dataset:{id:'demo-2'}});
  await instance.action('test-pick',{dataset:{id:'demo-3'}});
  instance.view();
  assert.deepEqual(Array.from(seen.at(-1).picks),['demo-1','demo-2','demo-3']);
  await instance.action('test-vote',{dataset:{}});
  assert.match(instance.view(),/Rank three answers/);
  await instance.action('test-checks',{dataset:{}});
  assert.match(instance.view(),/8\/8 LOCAL CHECKS PASSED/);
  instance.close();
  assert.equal(instance.open,false);
  assert.ok(renderCount>3);
});
test('Original mobile game structure and styling remain intact',()=>{
  assert.match(html,/id="app"/);assert.match(html,/id="connectionStatus"/);
  assert.match(css,/\.answer-grid/);assert.match(css,/@media/);
});