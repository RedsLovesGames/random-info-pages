import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { Script } from 'node:vm';

const root=new URL('../',import.meta.url);
const file=path=>readFileSync(new URL(path,root),'utf8');
const active=[
  'belief-atlas','9-11-timeline','fiction-workspace','algorithm-arena',
  'cryptography-museum','music-microscope','one-million',
  'infrastructure-atlas','political-grid','tools','wheel','whenwemeet',
  'school-schedule','friends','stock-fights','oldasspolitic','heatmap',
  'wanuiv2','nerdcore-prompts'
];
const utility=['time','image','money','text','pdf','files','media','data',
 'developer','math','random','codes','network'];
const nested=['oldasspolitic/member','heatmap/compare'];
const excluded=[
  'vct-scout','tideborne','tide2','tideborne/fishing',
  'tideborne/fish','tideborne/getting-started','tide2/mechanics-reference.html'
];

test('all 19 active app entrypoints include one scoped site shell',()=>{
  assert.equal(active.length,19);
  for(const name of active){
    const html=file(name+'/index.html');
    assert.match(html,new RegExp('data-rip-page="'+name+'"'),name);
    assert.equal((html.match(/design-system\/rip\.js/g)||[]).length,1,name+' JS');
    assert.equal((html.match(/design-system\/rip\.css/g)||[]).length,1,name+' CSS');
    assert.equal((html.match(/design-system\/project-polish\.css/g)||[]).length,1,name+' polish');
    for(const asset of ['rip.js','rip.css','project-polish.css']){
      assert.ok(existsSync(new URL('design-system/'+asset,root)));
      assert.ok(html.includes('../design-system/'+asset),name+' correct asset path');
    }
  }
});

test('all 13 utility screens and two nested data views use correct relative paths',()=>{
  const entrypoints=[...utility.map(t=>'tools/'+t),...nested];
  assert.equal(entrypoints.length,15);
  for(const slug of entrypoints){
    const html=file(slug+'/index.html');
    assert.match(html,/data-rip-page="[^"]+"/);
    for(const asset of ['rip.js','rip.css','project-polish.css'])
      assert.ok(html.includes('../../design-system/'+asset),slug+' '+asset);
  }
});

test('archived VCT and Tideborne apps are excluded from the new visual system',()=>{
  for(const slug of excluded){
    const path=slug.endsWith('.html')?slug:slug+'/index.html';
    const html=file(path);
    assert.ok(!html.includes('design-system/rip.js'),slug+' left unchanged');
    assert.ok(!html.includes('data-rip-page='),slug+' no active-app styling');
  }
  assert.ok(!file('classic.html').includes('design-system/rip.js'));
  assert.ok(!file('archive/index.html').includes('design-system/rip.js'));
});

test('project switcher script is self-contained and does not intercept app shortcuts',()=>{
  const script=file('design-system/rip.js');
  assert.doesNotThrow(()=>new Script(script));
  assert.match(script,/window\.self!==window\.top/);
  assert.match(script,/dlg\.showModal\(\)/);
  assert.match(script,/dlg\.close\(\)/);
  assert.match(script,/const catalog=\[/);
  assert.doesNotMatch(script,/localStorage|sessionStorage|e\.ctrlKey|e\.metaKey/);
  for(const slug of active)assert.ok(script.includes("'"+slug+"'"),slug+' searchable');
  for(const slug of ['vct-scout','tideborne','tide2'])
    assert.ok(!script.includes("['"+slug+"'"),slug+' not offered as active');
});

test('design CSS is isolated from app CSS and respects reduced motion',()=>{
  const rail=file('design-system/rip.css');
  const polish=file('design-system/project-polish.css');
  for(const css of [rail,polish]){
    let depth=0;
    for(const char of css){if(char==='{')depth++;if(char==='}')depth--;assert.ok(depth>=0)}
    assert.equal(depth,0,'CSS block delimiters balance');
    assert.match(css,/prefers-reduced-motion:reduce/);
  }
  assert.match(rail,/#rip-site-layer/);
  assert.match(rail,/@media print/);
  assert.match(polish,/body\[data-rip-page="tools"\]/);
  assert.match(polish,/body\[data-rip-page="school-schedule"\]/);
  assert.match(polish,/body\[data-rip-page="stock-fights"\]/);
  assert.match(polish,/body\[data-rip-page="infrastructure-atlas"\]/);
});

test('redesigned project naming and archive separation still intact',()=>{
  const homepage=file('index.html');
  assert.match(homepage,/const activeProjects=projects\.filter\(p=>!p\.a\)/);
  assert.match(homepage,/const archivedProjects=projects\.filter\(p=>p\.a\)/);
  assert.match(homepage,/href="\.\/archive\/"/);
  assert.match(homepage,/id="heroTotal">20/);
  assert.match(file('archive/index.html'),/href="\.\.\/tideborne\/"/);
});
