import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {Script} from 'node:vm';

const root=new URL('../',import.meta.url);
const read=p=>readFileSync(new URL(p,root),'utf8');
const apps=[
 ['fiction-workspace','writing-desk'],
 ['nerdcore-prompts','brief-guide'],
 ['wanuiv2','director-guide']
];
test('the final three active projects load independent guide assets',()=>{
 for(const [slug,asset] of apps){
  const html=read(slug+'/index.html');
  for(const ext of ['css','js']){
   const path=slug+'/'+asset+'.'+ext;
   assert.ok(html.includes('./'+asset+'.'+ext),slug+' loads '+asset+'.'+ext);
   assert.ok(existsSync(new URL(path,root)),path+' exists');
  }
  assert.doesNotThrow(()=>new Script(read(slug+'/'+asset+'.js')),slug+' guide JS parses');
  const css=read(slug+'/'+asset+'.css');
  let depth=0;
  for(const character of css){if(character==='{')depth++;if(character==='}')depth--;assert.ok(depth>=0)}
  assert.equal(depth,0,slug+' CSS braces balanced');
  assert.match(css,/prefers-reduced-motion:reduce/);
 }
});

test('Draftroom focus view delegates to original chapter and backup buttons',()=>{
 const page=read('fiction-workspace/index.html');
 const js=read('fiction-workspace/writing-desk.js');
 for(const id of ['workspace','sidebar','mainContent','focusWriter','newChapterQuick','backupQuick',
                  'addChapter','exportBtn','importBtn','authForm'])
  assert.ok(page.includes('id="'+id+'"'),id+' present');
 assert.match(js,/writer-focus/);
 assert.match(js,/document\.getElementById\('addChapter'\)\?\.click\(\)/);
 assert.match(js,/document\.getElementById\('exportBtn'\)\?\.click\(\)/);
 assert.match(js,/Escape/);
 assert.doesNotMatch(js,/localStorage|sessionStorage|indexedDB|fetch\(/);
 assert.match(read('fiction-workspace/writing-desk.css'),/\.workspace\.writer-focus/);
});

test('Nerdcore writing guide tracks only two essential fields and keeps all prompt controls',()=>{
 const page=read('nerdcore-prompts/index.html');
 const js=read('nerdcore-prompts/brief-guide.js');
 for(const id of ['character','thesis','promptOutput','copyBtn','chatgptBtn','scoreRing',
                  'promptProgressFill','promptProgressCount','resetBtn','loadBtn'])
  assert.ok(page.includes('id="'+id+'"'),id+' retained');
 assert.match(page,/href="#character"/);
 assert.match(page,/href="#thesis"/);
 assert.match(page,/href="#promptOutput"/);
 assert.match(js,/n\/2\*100/);
 assert.match(js,/addEventListener\('input',refresh\)/);
 assert.doesNotMatch(js,/localStorage|sessionStorage|fetch\(/);
});

test('Emperor Director workflow is clear about preview simulations and preserves engine',()=>{
 const page=read('wanuiv2/index.html');
 const js=read('wanuiv2/director-guide.js');
 for(const id of ['directorHelpDialog','directorHelpBtn','directorHelpClose',
                  'scene','references','inspector','cmdBtn','goButton','shotPlan','demoBanner'])
  assert.ok(page.includes('id="'+id+'"'),id+' present');
 for(const step of ['scene','references','inspector','commands'])
  assert.ok(page.includes('data-director-jump="'+step+'"'));
 assert.match(page,/simulated when a compatible service is not connected/);
 assert.match(js,/modal\.showModal\(\)/);
 assert.match(js,/modal\.close\(\)/);
 assert.match(js,/document\.getElementById\('cmdBtn'\)\?\.click\(\)/);
 assert.doesNotMatch(js,/fetch\(|localStorage|sessionStorage|goButton.*\.click\(/);
 for(const inline of page.matchAll(/<script>([\s\S]*?)<\/script>/g))
  assert.doesNotThrow(()=>new Script(inline[1]),'existing inline app still parses');
});

test('all 19 projects in current index have received at least one bespoke interaction pass',()=>{
 const home=read('index.html');
 const block=home.match(/const projects=\[[\s\S]*?\];/)?.[0]||'';
 const archived=['vct-scout','tideborne','tide2'];
 const activeSlugs=['belief-atlas','9-11-timeline','fiction-workspace','algorithm-arena',
   'cryptography-museum','music-microscope','one-million','infrastructure-atlas','political-grid',
   'tools','wheel','whenwemeet','school-schedule','friends','stock-fights','oldasspolitic',
   'heatmap','wanuiv2','nerdcore-prompts'];
 assert.equal(activeSlugs.length,19);
 for(const slug of activeSlugs)assert.ok(block.includes("p:'./"+slug+"/'"),slug+' retained in active registry');
 for(const slug of archived){
  const archivedPage=read(slug+'/index.html');
  for(const [dir,asset] of apps)assert.ok(!archivedPage.includes(asset+'.js'),slug+' excluded from '+dir+' changes');
 }
 assert.equal((block.match(/a:true/g)||[]).length,3);
});
