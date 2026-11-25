import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {Script,runInNewContext} from 'node:vm';

const root=new URL('../',import.meta.url);
const read=p=>readFileSync(new URL(p,root),'utf8');
const changes=[
 ['cryptography-museum','visitor-route','museum-paths'],
 ['one-million','comparison-presets','scale-examples'],
 ['heatmap','explore-guide','heatmap-guide']
];
function checkCss(path){
 const css=read(path);
 let level=0;
 for(const c of css){if(c==='{')level++;if(c==='}')level--;assert.ok(level>=0,path+' extra closing brace');}
 assert.equal(level,0,path+' balanced braces');
 assert.match(css,/prefers-reduced-motion:reduce/,path+' motion accessibility');
}

test('remaining guided entrypoints load correct isolated assets',()=>{
 for(const [slug,asset,selector] of changes){
  const page=read(slug+'/index.html');
  assert.match(page,new RegExp('class="'+selector),slug+' visual flow');
  for(const extension of ['css','js']){
   const rel=slug+'/'+asset+'.'+extension;
   assert.ok(page.includes('./'+asset+'.'+extension),slug+' links '+rel);
   assert.ok(existsSync(new URL(rel,root)),rel+' exists');
  }
  assert.doesNotThrow(()=>new Script(read(slug+'/'+asset+'.js')),slug+' JS parses');
  checkCss(slug+'/'+asset+'.css');
 }
});

test('Belief Atlas supports evidence review and keeps published and local records separate',()=>{
 const page=read('belief-atlas/index.html');
 const source=page.match(/<script>([\s\S]*?)<\/script>/)[1];
 for(const id of ['statusFilter','matrixTable','search','recordView','reviewCount','matrixMode','listMode','prevColumns','nextColumns','editRecord','resetFilters'])
  assert.ok(page.includes('id="'+id+'"'),id+' control exists');
 for(const filter of ['published','external','local','researched','unresearched'])
  assert.ok(page.includes('value="'+filter+'"'),filter+' filter exists');
 assert.match(page,/data-appearance-engine="native"/);
 assert.match(page,/prefers-reduced-motion:reduce/);
 assert.doesNotThrow(()=>new Script(source));
 const elements=new Map(),stored=new Map();
 const element=selector=>{
  if(!elements.has(selector))elements.set(selector,{
   value:selector==='#statusFilter'?'published':selector==='#sort'?'name':'',
   innerHTML:'',textContent:'',hidden:false,open:false,style:{},disabled:false,
   setAttribute(){},addEventListener(){},querySelectorAll(){return[]},focus(){},isConnected:true
  });
  return elements.get(selector);
 };
 const location={hash:''};
 const document={querySelector:element,addEventListener(){},body:{style:{}},activeElement:null};
 const localStorage={getItem:k=>stored.get(k)||null,setItem:(k,v)=>stored.set(k,v)};
 const api=runInNewContext(source+';({filtered,render,openCell,closeCell,record,id,view:()=>view,offset:()=>columnOffset,published:PUBLISHED,externalUrl,people:PEOPLE,topics:TOPICS})',{document,localStorage,window:{location},location,URL,alert:message=>{throw Error(message)}});
 assert.ok(Object.keys(api.published).length>0);
 for(const [key,row] of Object.entries(api.published)){
  const [person,topic]=JSON.parse(key);
  assert.ok(api.people.includes(person)&&api.topics.includes(topic),'valid pairing');
  assert.ok(row.quote&&row.notes&&/^https?:\/\//.test(row.source),'attributed evidence');
  assert.ok(['believes','leans-believe','unclear','leans-deny','denies'].includes(row.stance));
 }
 const person='Donald Trump',topic='2020 presidential election stolen';
 const key=api.id(person,topic),original=api.published[key];
 assert.ok(original);
 assert.match(element('#matrixTable').innerHTML,/scope="row"/);
 element('#listMode').onclick();
 assert.equal(api.view(),'list');
 assert.equal(element('#shown').textContent,Object.keys(api.published).length+' matching evidence records');
 api.openCell(person,topic);
 assert.match(element('#recordView').innerHTML,/Open evidence source/);
 assert.equal(element('#editRecord').open,false);
 element('#stance').value='unclear';
 element('#quote').value='Local test summary';
 element('#save').onclick();
 assert.equal(api.record(person,topic).stance,'unclear');
 assert.equal(api.published[key].stance,original.stance);
 assert.equal(JSON.parse(stored.get('rip-belief-atlas-v1')).records[key].stance,'unclear');
 element('#statusFilter').value='local';api.render();
 assert.equal(element('#shown').textContent,'1 matching evidence records');
 api.openCell(person,topic);
 element('#remove').onclick();
 assert.equal(api.record(person,topic).stance,original.stance);
 assert.equal(Object.keys(JSON.parse(stored.get('rip-belief-atlas-v1')).records).length,0);
 element('#matrixMode').onclick();
 element('#statusFilter').value='external';api.render();
 assert.equal(api.filtered().pp.length,40);
 assert.equal(api.filtered().tt.length,17);
 element('#statusFilter').value='';api.render();
 element('#nextColumns').onclick();
 assert.equal(api.offset(),24);
 assert.match(element('#columnPage').textContent,/^25/);
 element('#prevColumns').onclick();
 assert.equal(api.offset(),0);
 element('#resetFilters').onclick();
 assert.equal(element('#statusFilter').value,'published');
});

test('Cryptography Museum tour uses the pre-existing device-only passport',()=>{
 const page=read('cryptography-museum/index.html'),code=read('cryptography-museum/visitor-route.js');
 for(const id of ['caesar','enigma','hashing'])assert.ok(page.includes('href="#'+id+'"'));
 for(const id of ['navigation','progress','progress-count','exhibit','museumTourNext'])
  assert.ok(page.includes('id="'+id+'"'));
 assert.match(code,/cryptography-museum-passport-v1/);
 assert.match(code,/visited/);
 assert.match(code,/requestAnimationFrame\(update\)/);
 assert.doesNotMatch(code,/localStorage\.setItem|indexedDB|fetch\(/);
 assert.ok(page.includes('<div class="museum-path-cards"'));
});

test('One Million examples are precise and delegate to original comparison validation',()=>{
 const page=read('one-million/index.html'),code=read('one-million/comparison-presets.js');
 for(const p of ['percents','million','group'])
  assert.ok(page.includes('data-scale-example="'+p+'"'));
 for(const id of ['denominator','quantity0','quantity1','quantity2','comparisonTable','scaleCanvas'])
  assert.ok(page.includes('id="'+id+'"'));
 assert.match(code,/percents:\{den:1000000,values:\[100000,10000,1000\]/);
 assert.match(code,/million:\{den:1000000,values:\[1,10,100\]/);
 assert.match(code,/dispatchEvent\(new Event\('input'/);
 assert.match(code,/data-exponent="6"/);
 assert.doesNotMatch(code,/localStorage|indexedDB|\.innerHTML/);
});

test('10Groups navigation is non-destructive and linked to real visualization sections',()=>{
 const page=read('heatmap/index.html'),code=read('heatmap/explore-guide.js');
 for(const id of ['combinedMap','singleCircleMap','coordinateExplorer','heatmap','singleHeatmap','tables'])
  assert.ok(page.includes('id="'+id+'"'),id+' retained');
 for(const p of ['combined','single','coordinates'])
  assert.ok(page.includes('data-heatmap-section="'+p+'"'));
 assert.match(code,/target\.scrollIntoView/);
 assert.match(code,/target\.open=true/);
 assert.doesNotMatch(code,/\.checked\s*=|fetch\(|localStorage|sessionStorage/);
});

test('Friend Group quote spotlight draws only from existing archive records',()=>{
 const page=read('friends/index.html');
 for(const id of ['featuredQuote','featuredSpeaker','anotherFeatured','findFeatured','guess','answers','score','streak'])
  assert.ok(page.includes('id="'+id+'"'));
 assert.ok(page.includes('friend-zine.css'));
 assert.ok(existsSync(new URL('friends/friend-zine.css',root)));
 checkCss('friends/friend-zine.css');
 assert.match(page,/function showFeaturedQuote\(\)/);
 assert.match(page,/quotes\.filter\(q=>typeof q\.text/);
 assert.match(page,/text\.textContent=/);
 assert.match(page,/featuredQuote\.text/);
 assert.match(page,/game-key-hint/);
 assert.doesNotMatch(page,/createElement\(['"]iframe['"]\)/);
 const scripts=[...page.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
 assert.ok(scripts.length);
 for(const source of scripts)assert.doesNotThrow(()=>new Script(source));
});

test('archived project pages and original URLs are unaffected by current work',()=>{
 for(const slug of ['vct-scout','tideborne','tide2']){
  const s=read(slug+'/index.html');
  for(const feature of ['research-flow','visitor-route','comparison-presets','explore-guide','friend-zine'])
   assert.ok(!s.includes(feature),slug+' has no '+feature);
 }
 for(const slug of ['vct-scout','tideborne','tide2'])
  assert.ok(read('archive/index.html').includes('href="../'+slug+'/"'));
 assert.ok(!read('classic.html').includes('friend-zine.css'));
});
