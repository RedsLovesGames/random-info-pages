import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fighters,teams,byId,labelForMode} from '../stock-fights/roster.mjs';
import {Battle,ARENA,WIDTH,HEIGHT} from '../stock-fights/engine.mjs';
import {referencePortraits,referencePage} from '../stock-fights/reference-portraits.mjs';
import {createCombatAudio} from '../stock-fights/audio.mjs';

test('complete fighter and preset-team catalog',()=>{
 assert.equal(fighters.length,43);
 assert.equal(new Set(fighters.map(f=>f.id)).size,43);
 assert.equal(Object.keys(teams).length,12);
 for(const [name,ids] of Object.entries(teams)){
   assert.equal(ids.length,3,name);
   ids.forEach(id=>assert.ok(byId[id],name+': '+id));
 }
 assert.equal(Object.keys(labelForMode).length,5);
});

test('fixed seed produces identical simulations',()=>{
 const a=new Battle({left:['boxing'],right:['chef'],seed:1212});
 const b=new Battle({left:['boxing'],right:['chef'],seed:1212});
 for(let i=0;i<620;i++){a.step();b.step();}
 assert.deepEqual(a.snapshot(),b.snapshot());
 assert.equal(a.snapshot().seed,1212);
});

test('duel starts two 1000 HP fighters in a bounded rectangle',()=>{
 const b=new Battle({left:['angry'],right:['woman'],seed:18});
 assert.equal(b.actors.length,2);
 assert.equal(b.actors[0].hp,1000);
 assert.equal(b.actors[1].hp,1000);
 for(let i=0;i<200;i++)b.step();
 for(const a of b.actors.filter(a=>a.hp>0)){
   assert.ok(a.x>=b.bounds.left&&a.x<=b.bounds.right);
   assert.ok(a.y>=b.bounds.top&&a.y<=b.bounds.bottom);
   assert.ok(Number.isFinite(a.hp));
 }
});

test('team lineup replaces defeated actor and preserves next slot',()=>{
 const b=new Battle({mode:'teams',left:teams['Team Sports'],right:teams['Team Tabletop'],seed:1});
 assert.equal(b.actors[0].id,'boxing');
 b.actors[0].hp=0;b.step();
 assert.equal(b.actors.find(a=>a.side==='left'&&a.hp>0).id,'tennis');
 assert.equal(b.queue.left.length,1);
 b.actors.find(a=>a.side==='left'&&a.hp>0).hp=0;b.step();
 assert.equal(b.actors.find(a=>a.side==='left'&&a.hp>0).id,'football');
 assert.equal(b.queue.left.length,0);
});

test('30 henchmen challenge never spawns more than 30',()=>{
 const b=new Battle({mode:'challenge',left:['knight'],seed:70});
 assert.equal(b.spawned,3);
 for(let iteration=0;iteration<30&&!b.done;iteration++){
   for(const a of b.actors)if(a.side==='right'&&a.hp>0)a.hp=0;
   b.step();
 }
 assert.equal(b.defeated,30);
 assert.equal(b.spawned,30);
 assert.equal(b.done,true);
 assert.equal(b.winner,'left');
});

test('endless henchmen refills groups and tallies defeats',()=>{
 const b=new Battle({mode:'endless',left:['knight'],seed:7});
 for(const a of b.actors)if(a.side==='right')a.hp=0;
 b.step();
 assert.equal(b.defeated,3);
 assert.equal(b.spawned,6);
 assert.equal(b.actors.filter(a=>a.hp>0&&a.side==='right').length,3);
});

test('time battle has 20 second fixed limit',()=>{
 const b=new Battle({mode:'time',left:['blind'],right:['blind'],seed:29});
 for(let i=0;i<1300&&!b.done;i++)b.step();
 assert.equal(b.done,true);
 assert.equal(b.reason,'20 seconds elapsed');
 assert.ok(b.time>=20&&b.time<20.1);
});

test('exploding guy only triggers fuse after damage, then detonates',()=>{
 const b=new Battle({left:['exploding'],right:['blind'],seed:45});
 const a=b.actors[0],other=b.actors[1];
 assert.equal(a.fuse,-1);
 b.hit(a,1,other,'projectile');
 assert.equal(a.fuse,10);
 for(let i=0;i<610&&!b.done;i++)b.step();
 assert.ok(b.done);
 assert.equal(a.hp,0);
});

test('watermark attack doubles independently of incoming damage',()=>{
 const b=new Battle({left:['watermark'],right:['blind'],seed:3});
 const a=b.actors[0],other=b.actors[1];
 b.attack(a,other);b.attack(a,other);b.attack(a,other);
 assert.deepEqual(b.projectiles.map(p=>p.damage),[1,2,4]);
});

test('all 43 fighter abilities execute without NaNs or exceptions',()=>{
 for(const f of fighters){
   const b=new Battle({left:[f.id],right:['henchman'],seed:777,hotWalls:true,shrink:true});
   for(let i=0;i<420&&!b.done;i++)b.step();
   for(const actor of b.actors){
     for(const key of ['x','y','hp','vx','vy'])assert.ok(Number.isFinite(actor[key]),f.id+' '+key);
   }
   for(const p of b.projectiles)for(const key of ['x','y','vx','vy','damage'])assert.ok(Number.isFinite(p[key]),f.id+' projectile '+key);
 }
});

test('invalid format rejected rather than silently changed',()=>{
 assert.throws(()=>new Battle({mode:'wrong'}),RangeError);
 assert.ok(WIDTH>ARENA.right&&HEIGHT>ARENA.bottom);
});

test('external reference photos are exact source links, not emoji or invented image IDs',()=>{
 assert.equal(Object.keys(referencePortraits).length,29);
 for(const [id,url] of Object.entries(referencePortraits)){
   assert.ok(byId[id],id);
   assert.match(url,/^https:\/\/file\.namu\.moe\/file\/[0-9a-f]{64,}$/);
 }
 assert.match(referencePage,/namu\.moe\/w\/Spenn/);
});

test('audio module is inert until user opts in and supports custom sample replacement',()=>{
 const audio=createCombatAudio();
 assert.equal(audio.enabled,false);
 audio.setSample('boxing','data:audio/wav;base64,AAAA');
 audio.setSample('boxing',null);
 audio.setVolume(.25);
 audio.play('punch');
 assert.equal(audio.enabled,false);
});

test('web page exposes replacement photos, sound samples, and fullscreen theater',()=>{
 const html=readFileSync(new URL('../stock-fights/index.html',import.meta.url),'utf8');
 for(const id of ['referencePhotos','portraitUpload','soundUpload','soundClear','theater','arena'])
    assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/REFERENCE PHOTOGRAPHS/);
});
