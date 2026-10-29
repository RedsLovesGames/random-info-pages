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
  assert.match(edge,/if\(s\.stage==='question'&&now>=s\.closesAt\)/);
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
  assert.match(app,/score-value.*<strong>\$\{p\.sum\}<\/strong><span>PTS<\/span>/);
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
test('Original mobile game structure and styling remain intact',()=>{
  assert.match(html,/id="app"/);assert.match(html,/id="connectionStatus"/);
  assert.match(css,/\.answer-grid/);assert.match(css,/@media/);
});