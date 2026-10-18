import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {webcrypto} from 'node:crypto';
const base=new URL('../fiction-workspace/',import.meta.url);
const html=readFileSync(new URL('index.html',base),'utf8');
const seedSource=readFileSync(new URL('rodion-seed.js',base),'utf8');
const templateSource=readFileSync(new URL('templates.js',base),'utf8');
const appSource=readFileSync(new URL('app.js',base),'utf8');

function makeStore(initial={}){const map=new Map(Object.entries(initial));return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k),toJSON:()=>Object.fromEntries(map)};}
function instantiate(store=makeStore()){
 const listeners={},nodes={};
 function el(id){return nodes[id]??= {value:'',innerHTML:'',textContent:'',firstChild:{textContent:'Open workspace '},classList:{add(){},remove(){},toggle(){}},addEventListener(type,fn){listeners[id+':'+type]=fn;},setAttribute(){},dataset:{},scrollIntoView(){}};}
 const document={getElementById:el, querySelector:()=>null,querySelectorAll:()=>[]};
 const ctx={window:{scrollY:0,scrollTo(){}},document,localStorage:store,sessionStorage:makeStore(),crypto:webcrypto,TextEncoder,setTimeout,clearTimeout,Date,Math,console,Number,String,Array,JSON,Blob,URL};
 runInNewContext(templateSource,ctx);runInNewContext(seedSource,ctx);runInNewContext(appSource,ctx);
 return {el,listeners,ctx,store};
}
const flush=()=>new Promise(resolve=>setTimeout(resolve,15));
test('Rodion / Rodion is visibly prefilled and includes the seed script',()=>{
 assert.match(html,/id="username"[^>]*value="Rodion"/);
 assert.match(html,/id="password"[^>]*value="Rodion"/);
 assert.match(html,/rodion-seed\.js/);
});
test('new Rodion login creates a manuscript with 9 individually reviewed chapters and prior 55-point baseline',async()=>{
 const mock=instantiate();await flush();
 assert.equal(mock.el('username').value,'Rodion');assert.equal(mock.el('password').value,'Rodion');
 assert.ok(JSON.parse(mock.store.getItem('rip_draftroom_profiles_v1')).rodion);
 await mock.listeners['authForm:submit']({preventDefault(){}});
 const saved=JSON.parse(mock.store.getItem('rip_draftroom_data_v1_rodion'));
 assert.equal(saved.books.length,1);
 const book=saved.books[0];
 assert.equal(book.title,'The Princess’ Thief');
 assert.equal(book.chapters.length,9);
 assert.ok(book.characters.includes('REMEL'));
 assert.ok(book.timeline.includes('Remel'));
 assert.ok(book.world.includes('ATONOSIS'));
 assert.equal(book.chapters[8].status,'Draft');
 assert.ok(book.chapters.every(ch=>ch.reviews.length===5));
 assert.ok(book.chapters.every(ch=>ch.reviews.every(r=>r.items.some(i=>i.evidence.length>15 && i.action.length>15))));
 const baseline=book.reviews.find(r=>r.type==='rubric');
 const templates=mock.ctx.window.FICTION_TEMPLATES;
 const rubric=templates.find(t=>t.id==='rubric');
 const points=baseline.items.reduce((sum,it)=>sum+(it.score*rubric.items.find(x=>x.id===it.id).weight/4),0);
 assert.ok(Math.abs(points-55)<0.0000001,`got ${points}`);
 assert.match(mock.el('mainContent').innerHTML,/55 \/ 100 assessed/);
});
test('no duplicated seed and no replacement of existing book data',async()=>{
 const mock=instantiate();await flush();await mock.listeners['authForm:submit']({preventDefault(){}});
 let saved=JSON.parse(mock.store.getItem('rip_draftroom_data_v1_rodion'));
 saved.books[0].characters='MY EDITED CHARACTERS';saved.books[0].chapters[0].goal='MY GOAL';
 mock.store.setItem('rip_draftroom_data_v1_rodion',JSON.stringify(saved));
 await mock.listeners['authForm:submit']({preventDefault(){}});
 saved=JSON.parse(mock.store.getItem('rip_draftroom_data_v1_rodion'));
 assert.equal(saved.books.length,1);
 assert.equal(saved.books[0].chapters.length,9);
 assert.equal(saved.books[0].characters,'MY EDITED CHARACTERS');
 assert.equal(saved.books[0].chapters[0].goal,'MY GOAL');
});
test('existing non-Rodion data is unchanged by preset account creation',async()=>{
 const original={books:[{title:'Do Not Touch',chapters:[]}]};
 const store=makeStore({'rip_draftroom_data_v1_someone':JSON.stringify(original)});
 instantiate(store);await flush();
 assert.deepEqual(JSON.parse(store.getItem('rip_draftroom_data_v1_someone')),original);
});
