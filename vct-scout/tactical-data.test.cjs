const test=require('node:test');
const assert=require('node:assert/strict');
const T=require('./tactical-data.js');

test('every map has source-backed attack and defense plays',()=>{
  assert.deepEqual(T.validate(),[]);
  for(const map of ['Abyss','Ascent','Haven','Lotus','Split','Summit','Sunset']){
    assert.ok(T.sourceFor(map)?.url?.startsWith('https://rib.gg/'));
    assert.ok(T.plays(map,'attack').length>=3);
    assert.ok(T.plays(map,'defense').length>=3);
  }
});

test('every play exposes five tactical positions',()=>{
  for(const [map,sides] of Object.entries(T.PLAYBOOK)){
    for(const side of ['attack','defense']){
      for(const play of sides[side]){
        assert.equal(play.positions.length,5,`${map} ${side} ${play.id}`);
        assert.equal(new Set(play.positions.map(p=>p.slot)).size,5,`${map} ${side} ${play.id} slots`);
      }
    }
  }
});
