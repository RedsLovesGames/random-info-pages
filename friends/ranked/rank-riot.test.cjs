const test = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const src = readFileSync(path.join(__dirname,'Code.gs'),'utf8');
function makeContext(withRows=true) {
  const props=new Map(),cache=new Map();
  const names=['Tommy','Mike','Jack','Ethan','Rita','Nora'];
  const ctx={console:{log(){}},Date,Math,JSON,Set,Error,Number,String,Object,Array};
  const calls=[];let serial=0;
  ctx.Utilities={getUuid:()=>('uuid'+(++serial)+'qwerty'.repeat(6)).slice(0,36)};
  ctx.PropertiesService={getScriptProperties:()=>({getProperty:k=>props.get(k)||null,setProperty:(k,v)=>props.set(k,v),deleteProperty:k=>props.delete(k)})};
  ctx.CacheService={getScriptCache:()=>({get:k=>cache.get(k)||null,put:(k,v)=>cache.set(k,v),remove:k=>cache.delete(k)})};
  ctx.LockService={getScriptLock:()=>({waitLock(ms){assert.equal(ms,18000);},releaseLock(){}})};
  ctx.ContentService={MimeType:{JAVASCRIPT:'js'},createTextOutput:text=>({text,setMimeType(){return this;}})};
  const buildSheet=(game)=>{
    const headers=['Timestamp', ...vm.runInContext('RR_PROMPTS',ctx).map(x=>x.replace(/\{name\}/g,game==='alex'?'Alex':'Doron'))];
    const rows=withRows?names.map((name,i)=>['2026-10-20 10:0'+i,...Array.from({length:25},(_,q)=>`${name} wrote ${game} answer ${q+1}`)]):[];
    return {getName:()=>game.toUpperCase()+' RESPONSES',getLastRow:()=>rows.length+1,getDataRange:()=>({getDisplayValues:()=>[headers,...rows]})};
  };
  ctx.SpreadsheetApp={openById:(id)=>{calls.push(id);return {getSheets:()=>[...(['alex','doron'].map(buildSheet))]};}};
  vm.createContext(ctx);
  vm.runInContext(src,ctx,{filename:'Code.gs'});
  ctx.installRankRiot();
  const secret=props.get('RANK_HOST_SECRET');
  return {ctx,props,secret,names,calls};
}
function setupGame(){const x=makeContext();for(const game of ['alex','doron'])x.ctx.rrSaveMap_({secret:x.secret,game,assignments:x.names.map((name,i)=>({row:i+2,name}))});return x;}
test('all 25 authentic prompts are preloaded for both forms',()=>{
  const {ctx}=makeContext();
  assert.equal(vm.runInContext('RR_PROMPTS.length',ctx),25);
  assert.equal(ctx.rrQuestion_('alex',0),"What inanimate object has Alex's same energy?");
  assert.equal(ctx.rrQuestion_('doron',24),'If Doron was secretly keeping a collection of something in their basement, what would it be?');
});
test('data is read from configured spreadsheet, response tabs determined from headers',()=>{
  const {ctx,secret,calls}=setupGame();const setup=ctx.rrSetup_({secret});
  assert.equal(setup.games.alex.tab,'ALEX RESPONSES');assert.equal(setup.games.doron.responses.length,6);
  assert.equal(setup.games.alex.perQuestion.length,25);
  assert.equal(setup.games.alex.perQuestion[0],6);
  assert.ok(calls.includes('1ZIs8vwnnIAy-rEU8QsGXRBSZ7BoudigjYU9v00-d5iY'));
});
test('missing source response tabs never substitute invented answers',()=>{
  const {ctx,secret,names}=makeContext(false);
  assert.throws(()=>ctx.rrCreate_({secret,game:'alex',seconds:45}),/form response tab was not found/);
});
test('host-only operations reject invalid passphrases',()=>{
  const {ctx,secret}=setupGame();
  assert.throws(()=>ctx.rrSetup_({secret:'wrong'}),/Invalid host passphrase/);
  const created=ctx.rrCreate_({secret,game:'both',seconds:45});
  assert.throws(()=>ctx.rrAdvance_({secret:'bad',pin:created.pin}),/Invalid host passphrase/);
});
test('room voting blocks self votes, enforces exactly 3 unique answers, hides authors',()=>{
  const {ctx,secret,names}=setupGame();const pin=ctx.rrCreate_({secret,game:'alex',seconds:45}).pin;
  const keys={};for(const name of names)keys[name]=ctx.rrJoin_({pin,name}).playerKey;
  ctx.rrAdvance_({secret,pin});
  const player=ctx.rrState_({pin,playerKey:keys.Tommy});
  assert.equal(player.options.length,6);
  assert.equal(player.stage,'question');
  assert.ok(player.options.every(o=>!Object.hasOwn(o,'author')));
  const mine=player.options.find(o=>o.mine);
  assert.throws(()=>ctx.rrVote_({pin,playerKey:keys.Tommy,picks:[mine.id,...player.options.filter(o=>!o.mine).slice(0,2).map(o=>o.id)]}),/cannot vote for yourself/);
  assert.throws(()=>ctx.rrVote_({pin,playerKey:keys.Tommy,picks:['a','b']}),/exactly three/);
  assert.throws(()=>ctx.rrVote_({pin,playerKey:keys.Tommy,picks:['a','a','a']}),/different answers/);
  const picks=player.options.filter(o=>!o.mine).slice(0,3).map(o=>o.id);
  ctx.rrVote_({pin,playerKey:keys.Tommy,picks});
  assert.equal(ctx.rrState_({pin,playerKey:keys.Tommy}).voted,true);
  assert.throws(()=>ctx.rrState_({pin,playerKey:'garbage'}),/Join the room/);
  ctx.rrAdvance_({secret,pin});
  const reveal=ctx.rrState_({pin,playerKey:keys.Tommy});
  assert.equal(reveal.stage,'reveal');assert.equal(reveal.options.reduce((n,o)=>n+o.tally.sum,0),6);
  assert.equal(reveal.leaderboard.reduce((n,p)=>n+p.sum,0),6);
  assert.equal(reveal.options.find(o=>o.id===picks[0]).tally.first,1);
  assert.equal(reveal.options.find(o=>o.id===picks[1]).tally.second,1);
  assert.equal(reveal.options.find(o=>o.id===picks[2]).tally.third,1);
  assert.ok(reveal.options.every(o=>names.includes(o.author)));
  ctx.rrAdvance_({secret,pin});assert.equal(ctx.rrState_({pin,secret}).stage,'leaderboard');
});
test('timed vote expiration is settled server-side and disallows late submissions',()=>{
  const {ctx,props,secret,names}=setupGame();const pin=ctx.rrCreate_({secret,game:'alex',seconds:15}).pin;
  const p=ctx.rrJoin_({pin,name:names[0]});ctx.rrAdvance_({secret,pin});
  const room=JSON.parse(props.get('RANK_ROOM_'+pin));room.closesAt=Date.now()-1000;props.set('RANK_ROOM_'+pin,JSON.stringify(room));
  const snapshot=ctx.rrState_({pin,playerKey:p.playerKey});
  assert.equal(snapshot.stage,'reveal');
  assert.throws(()=>ctx.rrVote_({pin,playerKey:p.playerKey,picks:['a','b','c']}),/Voting has closed/);
});
test('JSONP output accepts only safe callback and returns structured errors',()=>{
  const {ctx}=makeContext();
  assert.match(ctx.doGet({parameter:{callback:'rankCb_ABC',payload:'{"action":"ping"}'}}).text,/"connected":true/);
  assert.equal(ctx.doGet({parameter:{callback:'alert(1)//',payload:'{}'}}).text,'/* invalid callback */');
  assert.match(ctx.doGet({parameter:{callback:'rankCb_DEF',payload:'invalid'}}).text,/"ok":false/);
});