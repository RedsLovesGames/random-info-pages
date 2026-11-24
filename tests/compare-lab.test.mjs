import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { Script } from 'node:vm';
import { hasTour, tourSteps } from '../design-system/tours.mjs';
import { mediaType, pickCanvas, startCanvasRecording, MAX_RECORD_SECONDS } from '../design-system/recording.mjs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const html=read('compare/index.html');
const source=read('compare/app.mjs');
const nav=read('design-system/rip.js');
const catalog=read('design-system/projects.js');

test('Compare Lab is a public, indexed project with two real iframe workspaces',()=>{
 assert.match(catalog,/n:'Compare Lab'.*p:'\.\/compare\/'/);
 assert.match(read('index.html'),/href="\.\/compare\/"/);
 for(const id of ['left-select','right-select','compare-shell','left-frame','right-frame',
   'split-handle','copy-state','sync-scroll','share-compare','reset-split','layout'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/src="\.\.\/design-system\/appearance\.js"/);
 assert.match(html,/src="\.\.\/design-system\/projects\.js"/);
 assert.doesNotThrow(()=>new Script(source.replace(/^import .*?;\n/gm,''))); // ES-module imports are validated separately by node --check
 assert.match(source,/valid\.has\(params\.get\('left'\)\)/);
 assert.match(source,/history\.replaceState/);
 assert.match(source,/target\.scrollTo/);
 assert.match(source,/getState/);
 assert.match(source,/setState/);
 assert.match(source,/setPointerCapture/);
 assert.match(read('compare/styles.css'),/@media\(max-width:650px\)/);
});

test('site-wide Studio actions are wired to real on-demand capabilities',()=>{
 for(const action of ['compare','tour','record','diagnostics'])
  assert.match(nav,new RegExp("action==='"+action+"'"));
 assert.match(nav,/startCanvasRecording\(target/);
 assert.match(nav,/compare\/\?left=/);
 assert.match(nav,/tours\.startTour\(slug\)/);
 assert.match(nav,/monitor\.showDiagnostics\(\)/);
 assert.match(nav,/45 seconds/);
 assert.match(read('design-system/studio.css'),/rip-recording-dock/);
 assert.doesNotThrow(()=>new Script(nav));
});

test('guided tours use real, present controls for 13 major projects',()=>{
 const pages=['fluid-dynamics','dungeon-forge','marble-sequencer','music-microscope',
   'algorithm-arena','id-card-maker','wheel','today','chirality','word-hitlist',
   'school-schedule','fiction-workspace','compare'];
 for(const slug of pages){
  assert.equal(hasTour(slug),true,slug+' has a guide');
  const steps=tourSteps(slug);
  assert.ok(steps.length>=2,slug);
  const markup=read(slug+'/index.html');
  for(const step of steps){
   assert.ok(step.title.length>5&&step.body.length>25,slug+' teaches a meaningful action');
   const variants=[...step.selector.matchAll(/#([a-zA-Z0-9_-]+)/g)].map(m=>m[1]);
   const anyKnown=variants.some(id=>markup.includes('id="'+id+'"'));
   assert.ok(anyKnown||step.selector.includes('input[type="search"]'),slug+': '+step.selector);
  }
 }
 assert.equal(hasTour('not-a-project'),false);
 assert.match(read('design-system/tours.css'),/rip-tour-progress/);
});

test('video export picks a supported local recording container',()=>{
 assert.equal(mediaType(t=>t==='video/webm;codecs=vp8'),'video/webm;codecs=vp8');
 assert.equal(mediaType(t=>t==='video/mp4'),'video/mp4');
 assert.equal(mediaType(()=>false),'');
 assert.equal(MAX_RECORD_SECONDS,45);
});
test('canvas selection ignores hidden canvases and chooses the largest visible stage',()=>{
 const previous=globalThis.getComputedStyle;
 globalThis.getComputedStyle=()=>({display:'block',visibility:'visible',opacity:'1'});
 const canvas=(width,height,hidden=false)=>({
   width,height,hidden,closest:()=>null,getBoundingClientRect:()=>({width,height})
 });
 try{
  const a=canvas(400,300),b=canvas(700,400),c=canvas(1600,900,true);
  assert.equal(pickCanvas({querySelectorAll:()=>[a,b,c]}),b);
  assert.equal(pickCanvas({querySelectorAll:()=>[c]}),null);
 }finally{globalThis.getComputedStyle=previous}
});
test('recording writes a silent local Blob and closes capture tracks',()=>{
 const OriginalRecorder=globalThis.MediaRecorder,OriginalCanvas=globalThis.HTMLCanvasElement;
 let stopped=false,output=null;
 class Canvas {
  width=640;height=360;
  captureStream(){return {getVideoTracks:()=>[{}],
   getTracks:()=>[{stop:()=>{stopped=true}}]}}
 }
 class Recorder {
  static isTypeSupported(type){return type==='video/webm'}
  state='inactive';mimeType='video/webm';
  constructor(stream,options){this.mimeType=options.mimeType}
  start(){this.state='recording';this.ondataavailable?.({data:new Blob([new Uint8Array([1,2,3])],{type:'video/webm'})})}
  stop(){this.state='inactive';this.onstop?.()}
 }
 globalThis.MediaRecorder=Recorder;globalThis.HTMLCanvasElement=Canvas;
 try{
  const active=startCanvasRecording(new Canvas(),{onDone:(blob,extension)=>{output={blob,extension}}});
  assert.equal(active.active,true);
  active.stop();
  assert.equal(active.active,false);
  assert.equal(stopped,true);
  assert.equal(output.extension,'webm');
  assert.equal(output.blob.size,3);
 }finally{globalThis.MediaRecorder=OriginalRecorder;globalThis.HTMLCanvasElement=OriginalCanvas}
});
test('recording, tour, and monitor modules have safe limits and cleanup mechanisms',()=>{
 const rec=read('design-system/recording.mjs');
 const tour=read('design-system/tours.mjs');
 const monitor=read('design-system/monitor.mjs');
 assert.match(rec,/MAX_RECORD_BYTES=120\*1024\*1024/);
 assert.match(rec,/stream\.getTracks\(\)\.forEach\(track=>track\.stop\(\)\)/);
 assert.match(rec,/MAX_RECORD_SECONDS=45/);
 assert.match(tour,/controller\.abort\(\)/);
 assert.match(tour,/prefers-reduced-motion/);
 assert.match(monitor,/Browser animation-frame cadence/);
 assert.match(monitor,/cancelAnimationFrame/);
 assert.ok(existsSync(new URL('../design-system/monitor.css',import.meta.url)));
});
