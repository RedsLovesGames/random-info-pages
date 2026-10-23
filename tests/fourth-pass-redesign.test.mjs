import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {Script} from 'node:vm';

const root=new URL('../',import.meta.url);
const read=p=>readFileSync(new URL(p,root),'utf8');
const changes=[
 ['belief-atlas','research-flow','research-flow-grid'],
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

test('four newly designed entrypoints load correct isolated assets',()=>{
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

test('Belief Atlas directs review through existing evidence filters and never adds claims',()=>{
 const page=read('belief-atlas/index.html'),code=read('belief-atlas/research-flow.js');
 for(const action of ['unresearched','researched','people','method'])
  assert.ok(page.includes('data-research-path="'+action+'"'));
 for(const id of ['statusFilter','matrixTable','search','recordView','reviewCount'])
  assert.ok(page.includes('id="'+id+'"'),id+' original control');
 assert.match(code,/status\.dispatchEvent\(new Event\('change'/);
 assert.match(code,/MutationObserver/);
 assert.doesNotMatch(code,/localStorage\.setItem|fetch\(|\.innerHTML\s*=/);
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
