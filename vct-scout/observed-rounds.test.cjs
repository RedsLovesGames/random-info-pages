const test=require('node:test');
const assert=require('node:assert/strict');
const O=require('./observed-rounds.js');

test('observed evidence rejects planning templates and incomplete timestamps',()=>{
  assert.throws(()=>O.validate({id:'x',sourceClass:'planning-template'}),/observed/i);
  assert.throws(()=>O.validate({id:'x',sourceClass:'observed-round',match:'A vs B',event:'Event',date:'2026-09-01',map:'Ascent',round:1,side:'attack',team:'A',opponent:'B',sourceMatchUrl:'https://rib.gg/x',vodUrl:'https://youtu.be/x',evidenceNotes:'fixture'}),/timestamp/i);
});

test('every published observed round has exact identity and direct timestamp evidence',()=>{
  for(const row of O.all()){
    assert.equal(row.sourceClass,'observed-round');
    assert.ok(row.match&&row.event&&row.date&&row.map,row.id);
    assert.ok(Number.isInteger(row.round)&&row.round>0,row.id);
    assert.ok(row.team&&row.opponent&&row.side,row.id);
    assert.ok(/^https:\/\//.test(row.sourceMatchUrl),row.id);
    assert.ok(/^https:\/\//.test(row.vodUrl),row.id);
    assert.ok(Number.isFinite(row.vodStartSeconds)&&row.vodStartSeconds>=0,row.id);
    assert.ok(Number.isFinite(row.vodEndSeconds)&&row.vodEndSeconds>row.vodStartSeconds,row.id);
  }
});
