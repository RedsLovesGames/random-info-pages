const test=require('node:test');
const assert=require('node:assert/strict');
const P=require('./recommended-plays.js');
const G=require('./map-geometry.js');

const MAPS=['Abyss','Ascent','Haven','Lotus','Split','Summit','Sunset'];

test('every map has attack and defense planning templates',()=>{
  for(const map of MAPS){
    assert.ok(P.get(map,'attack').length>=2,`${map} attack`);
    assert.ok(P.get(map,'defense').length>=2,`${map} defense`);
  }
});

test('attack plays contain spike, plant, per-player post plant, contingency and owned utility',()=>{
  for(const map of MAPS){
    for(const play of P.get(map,'attack')){
      assert.equal(play.sourceClass,'planning-template');
      assert.ok(play.spikeCarrierSlot,`${map}:${play.id} spike`);
      assert.ok(play.plantAnchor,`${map}:${play.id} plant`);
      assert.ok(play.phases.some(p=>p.id==='postPlant'),`${map}:${play.id} postPlant phase`);
      assert.ok(play.contingencies?.length,`${map}:${play.id} contingency`);
      for(const s of play.slots){
        assert.ok(s.postPlantAnchor,`${map}:${play.id}:${s.id} postPlantAnchor`);
        assert.ok(G.anchor(map,s.postPlantAnchor),`${map}:${play.id}:${s.id} postPlant anchor resolves`);
      }
      for(const u of play.utility||[]) assert.ok(u.ownerSlot&&u.targetAnchor&&u.phase,`${map}:${play.id} utility ownership`);
    }
  }
});

test('all play anchors and routes resolve through map geometry',()=>{
  for(const map of MAPS){
    for(const side of ['attack','defense']) for(const play of P.get(map,side)){
      const starts=[];
      for(const s of play.slots){
        assert.ok(G.anchor(map,s.startAnchor),`${map}:${play.id}:${s.startAnchor}`);
        if(s.destinationAnchor) assert.ok(G.anchor(map,s.destinationAnchor),`${map}:${play.id}:${s.destinationAnchor}`);
        if(!s.allowStack) starts.push(s.startAnchor);
        if(s.destinationAnchor){
          const path=G.path(map,s.startAnchor,s.destinationAnchor);
          assert.ok(path.length>=2,`${map}:${play.id}:${s.id} route`);
          if(s.postPlantAnchor){
            const post=G.path(map,s.destinationAnchor,s.postPlantAnchor);
            assert.ok(post.length>=1,`${map}:${play.id}:${s.id} post-plant route`);
          }
        }
      }
      assert.equal(new Set(starts).size,starts.length,`${map}:${play.id} duplicate starts`);
      for(const u of play.utility||[]) assert.ok(G.anchor(map,u.targetAnchor),`${map}:${play.id}:${u.targetAnchor}`);
      if(play.plantAnchor) assert.ok(G.anchor(map,play.plantAnchor),`${map}:${play.id}:plant`);
    }
  }
});
