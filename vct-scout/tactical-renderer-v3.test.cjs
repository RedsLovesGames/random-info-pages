const test=require('node:test');
const assert=require('node:assert/strict');
const R=require('./tactical-renderer-v3.js');
const G=require('./map-geometry.js');

const fixtures=[
  {name:'Ascent double controller mid default',map:'Ascent',side:'attack',play:'mid-control',items:[['Ben','Waylay'],['Dylan','Yoru'],['Tommy','Sova'],['Linh','Astra'],['Jon','Omen']]},
  {name:'Ascent A split',map:'Ascent',side:'attack',play:'a-split',items:[['Linh','Jett'],['Ben','Phoenix'],['Tommy','Sova'],['Jon','Omen'],['Dylan','Cypher']]},
  {name:'Haven three lane',map:'Haven',side:'attack',play:'three-lane-default',items:[['Linh','Jett'],['Ben','Phoenix'],['Tommy','Sova'],['Jon','Omen'],['Dylan','Cypher']]}
];

for(const f of fixtures)test(f.name,()=>{
  const model=R.buildModel({map:f.map,side:f.side,playId:f.play,items:f.items.map(([player,agent])=>({player,agent}))});
  assert.equal(model.players.length,5);
  assert.equal(new Set(model.players.map(p=>p.start.id)).size,5,'players collapsed onto duplicate anchors');
  assert.ok(model.players.every(p=>p.label&&p.agent&&p.assignment),'all labels/subroles exist');
  assert.ok(model.routes.every(r=>r.points.length>=2),'all routes resolve');
  assert.ok(model.utility.every(u=>u.ownerSlot&&u.ownerAgent),'utility owner missing');
  assert.ok(model.spike&&model.plant,'attack spike/plant missing');
  assert.ok(model.players.some(p=>p.start.confidence==='template')||model.players.every(p=>p.start.confidence==='verified'));
});

test('recommended source copy cannot claim observation',()=>{
  const model=R.buildModel({map:'Ascent',side:'attack',playId:'a-split',items:[{player:'1',agent:'Jett'},{player:'2',agent:'Phoenix'},{player:'3',agent:'Sova'},{player:'4',agent:'Omen'},{player:'5',agent:'Cypher'}]});
  assert.equal(model.sourceClass,'planning-template');
  assert.doesNotMatch(model.badge,/observed|replay-backed/i);
});

test('renderer can hydrate exact API callouts before rendering',()=>{
  const before=G.anchor('Ascent','aMain').confidence;
  const count=R.hydrateMaps([{displayName:'Ascent',xMultiplier:1,yMultiplier:1,xScalarToAdd:0,yScalarToAdd:0,callouts:[{regionName:'Main',superRegionName:'A',location:{x:.2,y:.3}},{regionName:'Main',superRegionName:'B',location:{x:.8,y:.7}}]}]);
  assert.ok(count>=2);
  assert.equal(G.anchor('Ascent','aMain').confidence,'verified');
  assert.ok(before==='template'||before==='verified');
});
