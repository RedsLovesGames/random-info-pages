import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LEVELS,ADAPTIVE_THRESHOLDS,createAdaptiveController} from '../fluid-dynamics/adaptive.mjs';
import {QUALITY} from '../fluid-dynamics/quality.mjs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('adaptive quality levels match the fluid solver profiles',()=>{
 assert.deepEqual(LEVELS,Object.keys(QUALITY));
 assert.ok(ADAPTIVE_THRESHOLDS.fastFps>ADAPTIVE_THRESHOLDS.slowFps);
});
test('four sustained slow samples step down one quality level',()=>{
 const adaptive=createAdaptiveController();
 for(let second=1;second<4;second++)
  assert.equal(adaptive.observe(17,second*1000,'studio','studio'),null);
 assert.equal(adaptive.observe(17,4000,'studio','studio'),'extreme');
 assert.equal(adaptive.observe(17,5000,'extreme','studio'),null,'cooldown prevents rapid oscillation');
});
test('recovery requires a long fast streak, a cooldown, and a user ceiling',()=>{
 const adaptive=createAdaptiveController();
 assert.equal(adaptive.observe(15,1000,'high','ultra'),null);
 assert.equal(adaptive.observe(15,2000,'high','ultra'),null);
 assert.equal(adaptive.observe(15,3000,'high','ultra'),null);
 assert.equal(adaptive.observe(15,4000,'high','ultra'),'balanced');
 for(let second=5;second<=12;second++)
  assert.equal(adaptive.observe(30,second*1000,'balanced','ultra'),null);
 for(let second=13;second<=20;second++)
  assert.equal(adaptive.observe(30,second*1000,'balanced','ultra'),null);
 assert.equal(adaptive.observe(30,21000,'balanced','ultra'),'high');
 assert.equal(adaptive.observe(30,22000,'ultra','ultra'),null,'never exceeds the selected ceiling');
});
test('invalid samples and an already-low Eco profile do not downshift',()=>{
 const adaptive=createAdaptiveController();
 assert.equal(adaptive.observe(NaN,1000,'ultra','ultra'),null);
 assert.equal(adaptive.observe(0,1000,'ultra','ultra'),null);
 assert.equal(adaptive.observe(12,1000,'unknown','studio'),null);
 for(let second=1;second<=10;second++)assert.equal(adaptive.observe(12,second*1000,'eco','studio'),null);
});
test('manual reset drops streaks and starts the cooldown',()=>{
 const adaptive=createAdaptiveController();
 for(let second=1;second<4;second++)adaptive.observe(15,second*1000,'high','high');
 adaptive.reset(4000);
 assert.equal(adaptive.observe(15,5000,'high','high'),null);
 for(let second=13;second<16;second++)assert.equal(adaptive.observe(15,second*1000,'high','high'),null);
 assert.equal(adaptive.observe(15,16000,'high','high'),'balanced');
});
test('Fluid Dynamics exposes a real adaptive controller and shared performance metrics',()=>{
 const html=read('fluid-dynamics/index.html');
 const app=read('fluid-dynamics/app.mjs');
 assert.match(html,/id="auto-quality"/);
 assert.match(html,/id="adaptive-status"/);
 assert.match(app,/createAdaptiveController\(\)/);
 assert.match(app,/adaptiveController\.observe\(fps,time,qualityInput\.value,autoCeiling\)/);
 assert.match(app,/changeQuality\(\{manual:true\}\)/);
 assert.match(app,/window\.RIPStudio/);
 assert.match(app,/metrics\(\)/);
 assert.match(html,/does not measure GPU utilization/);
});
