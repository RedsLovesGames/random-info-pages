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
test('Original mobile game structure and styling remain intact',()=>{
  assert.match(html,/id="app"/);assert.match(html,/id="connectionStatus"/);
  assert.match(css,/\.answer-grid/);assert.match(css,/@media/);
});