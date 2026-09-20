const test=require('node:test');
const assert=require('node:assert/strict');
const T=require('./agent-tactics.js');

test('entry duelists outrank non-duelists for primary entry',()=>{
  for(const a of ['Jett','Raze','Neon','Waylay']) assert.ok(T.score(a,'primaryEntry')>T.score('Sova','primaryEntry'),a);
});

test('Yoru is a strong lurker and Cypher owns flank control',()=>{
  assert.ok(T.score('Yoru','lurker')>T.score('Jett','lurker'));
  assert.ok(T.score('Cypher','flankControl')>T.score('Phoenix','flankControl'));
});

test('double controller assignment gives Astra and Omen distinct jobs',()=>{
  const out=T.assign([{player:'Linh',agent:'Astra'},{player:'Jon',agent:'Omen'}],[{id:'global',subroles:['globalController']},{id:'local',subroles:['localController','lurker']}]);
  assert.equal(out.global.agent,'Astra');
  assert.equal(out.local.agent,'Omen');
  assert.notEqual(out.global.subrole,out.local.subrole);
});
