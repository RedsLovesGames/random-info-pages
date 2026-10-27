import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createInitialState, normalizeState, transition, signature, asciiSignal, createSignalStore,
  PALETTES, MAX_EVENTS, SCHEMA_VERSION } from '../device-worlds/signal-core.mjs';

const page=readFileSync(new URL('../device-worlds/index.html',import.meta.url),'utf8');
const app=readFileSync(new URL('../device-worlds/v2.mjs',import.meta.url),'utf8');
const css=readFileSync(new URL('../device-worlds/v2.css',import.meta.url),'utf8');

test('new experience is served through the original page without losing the OS switcher',()=>{
  assert.match(page,/href="\.\/v2\.css"/);
  assert.match(page,/src="\.\/v2\.mjs"/);
  for(const world of ['windows','linux','apple','android'])assert.match(page,new RegExp('data-os="'+world+'"'));
  assert.match(page,/id="showAll"/);
  assert.match(page,/id="worldChooser"/);
  assert.match(app,/createSignalStore/);
  assert.match(app,/MutationObserver/);
});
test('each world has functional input and a cross-world representation',()=>{
  for(const hook of ['dw2-windows','dw2-explorer','dw2-pixel','dw2-pet','dw2-chips','dw2-instrument',
      'dw2-note-grid','dw2-pocket','dw2-pip','dw2Between']){
    assert.ok(app.includes(hook)||css.includes(hook),hook);
  }
  assert.match(app,/window\.AudioContext/);
  assert.match(app,/pointermove/);
  assert.match(app,/stopImmediatePropagation/);
  assert.match(app,/signal reverse/);
  assert.match(app,/weather rain 80/);
  assert.match(css,/prefers-reduced-motion/);
});
test('state normalization bounds unknown and malicious inputs',()=>{
  const s=normalizeState({schemaVersion:300,seed:'X'.repeat(500),revision:1e50,
    signal:{steps:[-5,100,3,2,1,0,7,4],tempo:12000,palette:'<script>',charge:100},
    weather:{rain:-100,sun:500,wind:'wat'},sketch:Array(64).fill(999),
    visited:['windows','windows','bogus','linux'],discoveries:Array(70).fill('x'),
    creature:{mood:1000,energy:-1,name:'a'.repeat(90)},journal:Array(400).fill({label:'x'.repeat(500),world:'bogus'})});
  assert.equal(s.schemaVersion,SCHEMA_VERSION);
  assert.equal(s.seed.length,80);
  assert.equal(s.signal.steps.length,8);
  assert.deepEqual(s.signal.steps.slice(0,2),[0,7]);
  assert.equal(s.signal.tempo,190);
  assert.ok(PALETTES.includes(s.signal.palette));
  assert.equal(s.weather.rain,0);
  assert.equal(s.weather.sun,100);
  assert.equal(s.creature.name.length,25);
  assert.deepEqual(s.visited,['windows','linux']);
  assert.ok(s.journal.length<=MAX_EVENTS);
  assert.equal(s.journal.at(-1).world,'between');
  assert.equal(s.sketch[0],3);
});
test('same pulse can be transformed from different worlds without changing its identity',()=>{
  let state=createInitialState('visitor-01');
  const startSignature=signature(state);
  state=transition(state,{type:'STEP',index:3,value:6,world:'apple'});
  assert.equal(state.signal.steps[3],6);
  assert.ok(state.discoveries.includes('signal.composed'));
  state=transition(state,{type:'REVERSE',world:'linux'});
  assert.equal(state.signal.steps[4],6);
  state=transition(state,{type:'PALETTE',value:'blue',world:'windows'});
  state=transition(state,{type:'WEATHER',key:'rain',value:75,world:'android'});
  assert.equal(state.weather.rain,75);
  assert.equal(state.signal.palette,'blue');
  assert.notEqual(signature(state),startSignature);
  assert.match(asciiSignal(state),/●/);
  assert.deepEqual(state.journal.slice(-2).map(x=>x.world),['windows','android']);
});
test('a shared 8×8 painting and pocket companion react deterministically',()=>{
  let state=createInitialState();
  state=transition(state,{type:'SKETCH',index:14,value:3,world:'windows'});
  assert.equal(state.sketch[14],3);
  const mood=state.creature.mood;
  state=transition(state,{type:'PET',world:'android'});
  assert.equal(state.creature.mood,mood+13);
  state=transition(state,{type:'GARDEN',world:'linux'});
  assert.equal(state.weather.rain,34);
  assert.ok(state.discoveries.includes('garden.grown'));
});
test('repeated replay with a fixed seed has exactly the same remix results',()=>{
  const seq=[
    {type:'REMIX',world:'linux'},
    {type:'STEP',index:7,value:2,world:'apple'},
    {type:'ROTATE',world:'windows'},
    {type:'REMIX',world:'android'}
  ];
  const replay=()=>seq.reduce(transition,createInitialState('identical-seed'));
  assert.deepEqual(replay(),replay());
  assert.notDeepEqual(replay(),createInitialState('different-seed'));
});
test('local export/import and reset are reversible through a simple storage interface',()=>{
  const memory=new Map();
  const storage={getItem:key=>memory.get(key)||null,setItem:(key,value)=>memory.set(key,value)};
  const store=createSignalStore(storage,'test');
  let called=0;store.subscribe(()=>called++);
  store.dispatch({type:'STEP',world:'apple',index:0,value:7});
  store.dispatch({type:'VISIT',world:'android'});
  const save=store.exportJSON();assert.equal(JSON.parse(save).signal.steps[0],7);
  store.reset();assert.notEqual(store.get().signal.steps[0],7);
  store.replace(JSON.parse(save));
  assert.equal(store.get().signal.steps[0],7);
  assert.deepEqual(store.get().visited,['android']);
  assert.ok(called>=3);
  assert.equal(createSignalStore(storage,'test').get().signal.steps[0],7);
});
test('event history is bounded, unknown actions do not modify state',()=>{
  let s=createInitialState();
  for(let i=0;i<100;i++)s=transition(s,{type:'TEMPO',value:50+i,world:'apple'});
  assert.ok(s.journal.length<=MAX_EVENTS);
  assert.equal(transition(s,{type:'UNKNOWN',world:'linux'}).revision,s.revision);
  const seen=transition(s,{type:'VISIT',world:'linux'});
  assert.deepEqual(transition(seen,{type:'VISIT',world:'linux'}).visited,['linux']);
});
