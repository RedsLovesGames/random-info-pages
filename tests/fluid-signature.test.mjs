import test from 'node:test';
import assert from 'node:assert/strict';
import {FluidTank} from '../fluid-dynamics/fluid.mjs';
import {fluidSignature} from '../fluid-dynamics/signature.mjs';
test('equivalent seeded solver fields have equal digest, changed dyes do not',()=>{
 const a=new FluidTank(16,12),b=new FluidTank(16,12);
 assert.deepEqual(fluidSignature(a),fluidSignature(b));
 a.addDye(.5,.5,2,[1,.2,0],.7);
 assert.notEqual(fluidSignature(a).hash,fluidSignature(b).hash);
 b.addDye(.5,.5,2,[1,.2,0],.7);
 assert.deepEqual(fluidSignature(a),fluidSignature(b));
});
test('same inputs and number of update steps agree within a single JS engine',()=>{
 const run=()=>{
  const tank=new FluidTank(14,10);
  tank.addImpulse(.4,.5,.6,-.2,2,.08);
  tank.addDye(.4,.5,2,[0,1,.2],.5);
  for(let i=0;i<12;i++)tank.step({viscosity:.1,retention:.975,iterations:6});
  return fluidSignature(tank);
 };
 assert.deepEqual(run(),run());
 assert.throws(()=>fluidSignature({width:2,height:2,dye:[]}),/Expected/);
});
