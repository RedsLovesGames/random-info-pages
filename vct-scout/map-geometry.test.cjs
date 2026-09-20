const test=require('node:test');
const assert=require('node:assert/strict');
const G=require('./map-geometry.js');

const MAPS=['Abyss','Ascent','Haven','Lotus','Split','Summit','Sunset'];

test('all current maps expose deterministic spawn and site anchors',()=>{
  for(const name of MAPS){
    const m=G.getMap(name);
    assert.ok(m, name);
    assert.ok(m.anchors.attackSpawn, `${name} attackSpawn`);
    assert.ok(m.anchors.defenseSpawn, `${name} defenseSpawn`);
    assert.ok(m.anchors.siteA, `${name} siteA`);
    assert.ok(m.anchors.siteB, `${name} siteB`);
    for(const a of Object.values(m.anchors)){
      assert.ok(a.x>=0&&a.x<=1&&a.y>=0&&a.y<=1, `${name}:${a.id} out of bounds`);
      assert.ok(['verified','template'].includes(a.confidence), `${name}:${a.id} missing confidence`);
    }
  }
});

test('anchor lookup is map isolated and never fuzzy',()=>{
  assert.equal(G.anchor('Ascent','aMain').map,'Ascent');
  assert.equal(G.anchor('Haven','aMain').map,'Haven');
  assert.notDeepEqual(G.anchor('Ascent','aMain'),G.anchor('Haven','aMain'));
  assert.equal(G.anchor('Ascent','a ma'),null);
  assert.equal(G.anchor('Ascent','bMain').id,'bMain');
});

test('route graph returns traversable multi-node paths for major lanes',()=>{
  const a=G.path('Ascent','aMain','siteA');
  assert.ok(a.length>=3,a.map(x=>x.id).join(' > '));
  assert.equal(a[0].id,'aMain');
  assert.equal(a.at(-1).id,'siteA');
  const h=G.path('Haven','cLong','siteC');
  assert.ok(h.length>=3,h.map(x=>x.id).join(' > '));
});

test('validator rejects duplicate anchor ids',()=>{
  assert.throws(()=>G.validateMap({name:'Bad',anchors:[{id:'x',x:.1,y:.1,confidence:'template'},{id:'x',x:.2,y:.2,confidence:'template'}],edges:[]}),/duplicate anchor/i);
});

test('exact Valorant API callouts upgrade template anchors without fuzzy matching',()=>{
  const fake={displayName:'Ascent',xMultiplier:1,yMultiplier:1,xScalarToAdd:0,yScalarToAdd:0,callouts:[{regionName:'Main',superRegionName:'A',location:{x:.2,y:.3}},{regionName:'Main',superRegionName:'B',location:{x:.8,y:.7}}]};
  const n=G.hydrateFromValorantApi('Ascent',fake);
  assert.ok(n>=2);
  assert.equal(G.anchor('Ascent','aMain').confidence,'verified');
  assert.equal(G.anchor('Ascent','aMain').x,.3);
  assert.equal(G.anchor('Ascent','aMain').y,.2);
  assert.equal(G.anchor('Ascent','bMain').x,.7);
  assert.equal(G.anchor('Ascent','bMain').y,.8);
});
