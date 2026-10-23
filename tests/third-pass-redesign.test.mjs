import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {Script} from 'node:vm';

const root=new URL('../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');
function checkAssets(project,names){
 const page=read(project+'/index.html');
 for(const name of names){
  assert.ok(page.includes('./'+name),project+' loads '+name);
  assert.ok(existsSync(new URL(project+'/'+name,root)),project+'/'+name+' exists');
 }
}
function checkScript(path){
 assert.doesNotThrow(()=>new Script(read(path)),path+' parses');
}
function balancedCss(path){
 const css=read(path);
 let braces=0;
 for(const c of css){if(c==='{')braces++;if(c==='}')braces--;assert.ok(braces>=0,path+' braces never underflow');}
 assert.equal(braces,0,path+' braces balance');
 assert.match(css,/prefers-reduced-motion:reduce/,path+' respects reduced motion');
}

test('Algorithm Visualizer has three intentional lesson launchers that reuse live app controls',()=>{
 checkAssets('algorithm-arena',['learning-path.css','learning-path.js']);
 const html=read('algorithm-arena/index.html');
 for(const id of ['sort-random','sort-reverse','path-weight'])
  assert.match(html,new RegExp('data-learning="'+id+'"'),id);
 for(const id of ['generateArray','runSorts','pathAlgorithm','makeMaze','sortGrid','pathGrid'])
  assert.ok(html.includes('id="'+id+'"'),id+' remains');
 const js=read('algorithm-arena/learning-path.js');
 assert.match(js,/document\.getElementById\('runSorts'\)\?\.click\(\)/);
 assert.match(js,/document\.getElementById\('makeMaze'\)\?\.click\(\)/);
 assert.doesNotMatch(js,/localStorage|indexedDB|fetch\(/);
 checkScript('algorithm-arena/learning-path.js');balancedCss('algorithm-arena/learning-path.css');
});

test('Political Survey supports selected-only review while retaining its exact original statements',()=>{
 checkAssets('political-grid',['guided-review.css','guided-review.js']);
 const html=read('political-grid/index.html');
 for(const id of ['markedOnly','showAllStatements','surveyProgressFill','surveyProgressCount',
                  'selection-count','statement-board','save-button','participant-name'])
  assert.ok(html.includes('id="'+id+'"'),id+' remains');
 assert.match(html,/not a validated political test/);
 assert.match(html,/Unmarked statements do not necessarily mean disagreement/);
 const js=read('political-grid/guided-review.js');
 assert.match(js,/MutationObserver/);
 assert.match(js,/classList\.toggle\('survey-marked-only'/);
 assert.match(js,/aria-pressed/);
 assert.doesNotMatch(js,/localStorage|sessionStorage|SUPABASE/);
 checkScript('political-grid/guided-review.js');balancedCss('political-grid/guided-review.css');
});

test('WhenWeMeet setup suggestions remain optional and do not create events by themselves',()=>{
 checkAssets('whenwemeet',['event-presets.css','event-presets.js']);
 const html=read('whenwemeet/index.html');
 for(const mode of ['study','dinner','hangout'])
  assert.match(html,new RegExp('data-event-preset="'+mode+'"'));
 for(const id of ['create-form','date-start','date-end','weekdays-only','start-time',
                  'end-time','meeting-duration','slot-size','create-event-button'])
  assert.ok(html.includes('id="'+id+'"'),id+' remains');
 const js=read('whenwemeet/event-presets.js');
 assert.match(js,/if\(title&&!title\.value\.trim\(\)\)/);
 assert.match(js,/dispatchEvent\(new Event\('change'/);
 assert.match(js,/date-start'\)\?\.focus\(\)/);
 assert.doesNotMatch(js,/\.submit\(|requestSubmit|fetch\(|localStorage|sessionStorage/);
 checkScript('whenwemeet/event-presets.js');balancedCss('whenwemeet/event-presets.css');
});

test('September 11 chapter jumps use existing source-linked events and never synthesize data',()=>{
 checkAssets('9-11-timeline',['archive-reader.css','archive-reader.js']);
 const html=read('9-11-timeline/index.html');
 for(const name of ['aviation','attack','response'])
  assert.match(html,new RegExp('data-timeline-category="'+name+'"'));
 for(const id of ['events','scrub','clock','moment','momentSource'])
  assert.ok(html.includes('id="'+id+'"'),id+' remains');
 const js=read('9-11-timeline/archive-reader.js');
 assert.match(js,/window\.TIMELINE_EVENTS/);
 assert.match(js,/match\.click\(\)/);
 assert.doesNotMatch(js,/fetch\(|localStorage|PAGER_COUNTS\s*=/);
 checkScript('9-11-timeline/archive-reader.js');balancedCss('9-11-timeline/archive-reader.css');
});

test('Wheel has a visible spin action, correct grid slots and original canvas controls',()=>{
 checkAssets('wheel',['spin-experience.css','spin-experience.js']);
 const html=read('wheel/index.html');
 for(const id of ['spinPrimary','wheel','winnerModal','entriesInput','resultCount','wheelStage'])
  assert.ok(html.includes('id="'+id+'"'),id+' remains');
 const js=read('wheel/spin-experience.js');
 assert.match(js,/primary\.addEventListener\('click',\(\)=>wheel\.click\(\)\)/);
 assert.doesNotMatch(js,/localStorage|winner\s*=|random\(/);
 const css=read('wheel/spin-experience.css');
 assert.match(css,/grid-template-rows:auto minmax\(0,1fr\) auto auto/);
 assert.match(css,/max-height:100%/);
 assert.match(css,/\.presentation \.spin-cta/);
 checkScript('wheel/spin-experience.js');balancedCss('wheel/spin-experience.css');
});

test('archived VCT and Tideborne remain outside bespoke design changes',()=>{
 for(const route of ['vct-scout','tideborne','tide2']){
  const html=read(route+'/index.html');
  assert.doesNotMatch(html,/learning-path\.js|guided-review\.js|event-presets\.js|archive-reader\.js|spin-experience\.js/);
 }
 const archive=read('archive/index.html');
 assert.match(archive,/href="\.\.\/vct-scout\/"/);
 assert.match(archive,/href="\.\.\/tideborne\/"/);
 assert.match(archive,/href="\.\.\/tide2\/"/);
});
