import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { runInNewContext, Script } from 'node:vm';

const read = file => readFileSync(new URL('../' + file,import.meta.url),'utf8');
const code=read('design-system/projects.js');
const nav=read('design-system/rip.js');
const studio=read('design-system/studio.css');
const home=read('index.html');
const storage=new Map();
const ctx={
  window:{},
  localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)}
};
runInNewContext(code,ctx);
const {RIPCatalog:catalog,RIP_PROJECTS:projects}=ctx.window;
test('canonical registry is shared by the homepage and shared project navigation',()=>{
  assert.ok(projects.length>=35);
  assert.equal(catalog.active.length+catalog.archived.length,projects.length);
  assert.match(home,/const projects=window\.RIP_PROJECTS;/);
  assert.match(home,/src="\.\/design-system\/projects\.js"/);
  assert.match(nav,/design-system\/projects\.js/);
  assert.doesNotMatch(nav,/const catalog=\[/,'no duplicated hard-coded navigation list');
  assert.equal(new Set(projects.map(p=>p.slug)).size,projects.length);
  for(const project of projects){
    assert.equal(project.p,'./'+project.slug+'/');
    assert.ok(existsSync(new URL('../'+project.slug+'/index.html',import.meta.url)),project.slug+' route exists');
  }
});
test('search works across projects and handles small typos',()=>{
  assert.equal(catalog.search('fluid')[0].slug,'fluid-dynamics');
  assert.ok(catalog.search('dungon').some(p=>p.slug==='dungeon-forge'));
  assert.ok(catalog.search('audio').some(p=>p.slug==='music-microscope'));
  assert.ok(catalog.search('tideborne',{includeArchived:true}).some(p=>p.a));
  assert.ok(!catalog.search('tideborne',{includeArchived:false}).some(p=>p.a));
  assert.deepEqual(Array.from(catalog.search(''),p=>p.slug).sort(),Array.from(catalog.active,p=>p.slug).slice(0,100).sort());
});
test('favorites and recents persist locally and only accept known projects',()=>{
  assert.deepEqual(Array.from(catalog.favorites()),[]);
  catalog.toggleFavorite('fluid-dynamics');
  assert.deepEqual(Array.from(catalog.favorites()),['fluid-dynamics']);
  catalog.toggleFavorite('fluid-dynamics');
  assert.deepEqual(Array.from(catalog.favorites()),[]);
  catalog.toggleFavorite('unknown');
  assert.deepEqual(Array.from(catalog.favorites()),[]);
  catalog.recordVisit('fluid-dynamics');
  catalog.recordVisit('marble-sequencer');
  catalog.recordVisit('fluid-dynamics');
  assert.deepEqual(Array.from(catalog.recent()),['fluid-dynamics','marble-sequencer']);
});
test('related recommendations are valid and do not recommend self',()=>{
  const related=catalog.related('marble-sequencer');
  assert.ok(related.length>=2);
  assert.ok(related.every(p=>!p.a&&p.slug!=='marble-sequencer'));
  assert.ok(related.some(p=>p.slug==='music-microscope'));
});
test('site-wide studio is accessible without clobbering project state',()=>{
  new Script(nav);
  new Script(code);
  assert.match(nav,/showModal\(\)/);
  assert.match(nav,/aria-pressed/);
  assert.match(nav,/window\.RIPStudio/);
  assert.match(nav,/Ctrl\+K/);
  assert.match(nav,/function makeLink/);
  assert.match(studio,/@media\(max-width:650px\)/);
});
test('offline cache respects origin, HTTP method and content limits',()=>{
  const sw=read('sw.js');
  new Script(sw);
  assert.match(sw,/self\.addEventListener\('fetch'/);
  assert.match(sw,/url\.origin!==self\.location\.origin/);
  assert.match(sw,/request\.method!=='GET'/);
  assert.match(sw,/offline\.html/);
  assert.match(sw,/2_000_000/);
  assert.match(home,/rel="manifest" href="\.\/site\.webmanifest"/);
  const manifest=JSON.parse(read('site.webmanifest'));
  assert.equal(manifest.start_url,'./');
});
test('optional local audio handoff has explicit size and TTL limits',()=>{
  const bridge=read('design-system/bridge.mjs');
  assert.match(bridge,/MAX_HANDOFF_BYTES=50\*1024\*1024/);
  assert.match(bridge,/receiveMarbleAudio/);
  assert.match(bridge,/86400000/);
});
