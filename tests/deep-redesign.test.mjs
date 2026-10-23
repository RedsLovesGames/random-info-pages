import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { Script } from 'node:vm';

const root=new URL('../',import.meta.url);
const read=p=>readFileSync(new URL(p,root),'utf8');
const script=p=>assert.doesNotThrow(()=>new Script(read(p)),p+' must parse');
const assertRefs=(html,paths)=>{for(const p of paths){assert.ok(html.includes(p),'Expected '+p);assert.ok(existsSync(new URL(p.replace(/^\.\.\//,'').replace(/^\.\//,''),root))||existsSync(new URL(p,root)),'Local file exists '+p)}};

test('Toolbox task filters cover all 13 utilities and preserve existing favorite storage',()=>{
 const html=read('tools/index.html');
 const cards=[...html.matchAll(/<article class="tb-card-shell" data-group="([^"]+)" data-tool="[^"]+"[^>]*><a class="tb-card" href="\.\/([^/]+)\/"/g)];
 assert.equal(cards.length,13);
 const groups={create:4,plan:4,technical:5};
 for(const [group,count] of Object.entries(groups))assert.equal(cards.filter(c=>c[1]===group).length,count);
 assert.match(html,/data-workflow="all"/);
 assert.match(html,/data-workflow="plan"/);
 assert.match(html,/data-workflow="create"/);
 assert.match(html,/data-workflow="technical"/);
 assert.match(html,/id="resultCount"/);
 assert.match(html,/id="clearFilters"/);
 assert.match(html,/window\.Toolbox\?\.toggleFavorite/);
 assert.match(html,/window\.Toolbox\?\.recordRecent/);
 const inline=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
 assert.ok(inline.length);
 inline.forEach(m=>assert.doesNotThrow(()=>new Script(m[1])));
 assert.match(read('tools/shared/toolbox.css'),/\.tb-card-shell\[hidden\]\{display:none!important\}/);
});

test('School planner keeps existing task storage and correctly separates duplicate checkbox IDs',()=>{
 const html=read('school-schedule/index.html');
 assert.match(html,/planner-ui\.css/);
 assert.match(html,/planner-ui\.js/);
 assert.match(html,/function taskHTML\(t,scope='week'\)/);
 assert.match(html,/const domId=\`\$\{scope\}-\$\{id\}\`/);
 assert.match(html,/taskHTML\(t,'major'\)/);
 assert.match(html,/localStorage\.getItem\('school:'\+id\)/);
 assert.match(html,/localStorage\.setItem\('school:'\+cb\.dataset\.task/);
 assert.match(html,/id="plannerControls"/);
 assert.match(html,/id="weekFilterEmpty"/);
 assert.match(html,/id="majorFilterEmpty"/);
 const originalScript=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]);
 assert.ok(originalScript.length);
 originalScript.forEach(s=>assert.doesNotThrow(()=>new Script(s)));
 script('school-schedule/planner-ui.js');
 const addon=read('school-schedule/planner-ui.js');
 assert.match(addon,/rip\.schedule\.view\.v1/);
 assert.match(addon,/document\.addEventListener\('change'/);
 assert.match(addon,/eligible=new Map\(\)/);
 assert.doesNotMatch(addon,/localStorage\.removeItem\('school:'\)/);
});

test('Stock Fights has game-first layout without modifying engine or controls',()=>{
 const html=read('stock-fights/index.html');
 for(const id of ['matchSetup','battleArena','fighterIndex','focusArena','controlsHelp','experienceHelp',
                   'start','pause','step','theater','rematch','mode','seed','arena'])
   assert.ok(html.includes('id="'+id+'"'),id+' remains');
 assert.match(html,/type="module" src="\.\/app\.js"/);
 assert.match(html,/experience\.css/);
 assert.match(html,/experience\.js/);
 script('stock-fights/experience.js');
 const ux=read('stock-fights/experience.js');
 assert.match(ux,/aria-pressed/);
 assert.match(ux,/\.click\(\)/);
 assert.match(ux,/el\.closest\('input,textarea,select,button,a,summary/);
 assert.match(read('stock-fights/experience.css'),/\.arena-focus/);
 assert.match(read('stock-fights/experience.css'),/prefers-reduced-motion/);
});

test('Infrastructure wayfinder activates real existing panels and explains derived grades',()=>{
 const html=read('infrastructure-atlas/index.html');
 assert.match(html,/wayfinder\.js/);
 assert.match(html,/wayfinder\.css/);
 for(const view of ['map','rank','compare','insights']){
   assert.ok(html.includes('data-atlas-view="'+view+'"'));
   assert.ok(html.includes('data-tab="'+view+'"'));
   assert.ok(html.includes('id="view-'+view+'"'));
 }
 assert.match(html,/ASCE GRADE/);
 assert.match(html,/RELATIVE A–F/);
 assert.match(html,/not an ASCE grade/);
 script('infrastructure-atlas/wayfinder.js');
 assert.match(read('infrastructure-atlas/wayfinder.js'),/tab\.click\(\)/);
 assert.match(read('infrastructure-atlas/wayfinder.js'),/details\.open=true/);
});

test('Music Microscope provides an explanation-first workflow without changing audio transport',()=>{
  const html=read('music-microscope/index.html');
  const css=read('music-microscope/listening-guide.css');
  assert.match(html,/listening-guide\.css/);
  assert.match(html,/class="instrument-start"/);
  assert.match(html,/class="instrument-help"/);
  assert.match(html,/id="audioInputSection"/);
  assert.match(html,/href="#wave-title"/);
  assert.match(html,/href="#filter-title"/);
  for(const id of ['audioFile','exampleButton','waveform','spectrogram','spectrum','filterEnabled','playButton']){
    assert.ok(html.includes('id="'+id+'"'),id+' remains functional');
  }
  assert.match(css,/\.instrument-start-steps/);
  assert.match(css,/prefers-reduced-motion:reduce/);
});

test('Congress explorer quick views reuse its original controls and frozen snapshot',()=>{
  const html=read('oldasspolitic/index.html');
  assert.match(html,/explore-controls\.css/);
  assert.match(html,/explore-controls\.js/);
  for(const id of ['search','chamber','party','sort','members','resultLabel','clearCongressFilters']){
    assert.ok(html.includes('id="'+id+'"'),id+' remains present');
  }
  for(const preset of ['all','House','Senate','ageAsc','ageDesc']){
    assert.ok(html.includes('data-congress-preset="'+preset+'"'),preset+' is a preset');
  }
  assert.match(html,/frozen congressional roster/);
  assert.match(html,/September 24, 2026 snapshot/);
  script('oldasspolitic/explore-controls.js');
  const code=read('oldasspolitic/explore-controls.js');
  assert.match(code,/dispatchEvent\(new Event\('change'/);
  assert.match(code,/aria-pressed/);
  assert.doesNotMatch(code,/localStorage|sessionStorage/);
});

test('Archived projects and classic homepage are never redesign targets',()=>{
 for(const name of ['vct-scout','tideborne','tide2']){
   const html=read(name+'/index.html');
   assert.ok(!html.includes('experience.js'),name);
   assert.ok(!html.includes('wayfinder.js'),name);
   assert.ok(!html.includes('planner-ui.js'),name);
 }
 assert.ok(!read('classic.html').includes('wayfinder.js'));
 assert.match(read('archive/index.html'),/Three preserved projects/);
});
