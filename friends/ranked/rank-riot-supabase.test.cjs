const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const dir=__dirname;
const app=fs.readFileSync(path.join(dir,'app.js'),'utf8');
const edge=fs.readFileSync(path.join(dir,'index.ts'),'utf8');
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const css=fs.readFileSync(path.join(dir,'style.css'),'utf8');
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
test('Original mobile game structure and styling remain intact',()=>{
  assert.match(html,/id="app"/);assert.match(html,/id="connectionStatus"/);
  assert.match(css,/\.answer-grid/);assert.match(css,/@media/);
});