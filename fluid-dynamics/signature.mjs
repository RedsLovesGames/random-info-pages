/* Compact, deterministic-within-one-engine signature of typed solver fields.
 * Not a cross-platform guarantee of bit-for-bit floating-point equivalence. */
export function fluidSignature(tank){
 if(!tank||!Number.isInteger(tank.width)||!Number.isInteger(tank.height)||
    !Array.isArray(tank.dye)||tank.dye.length<3)
  throw new TypeError('Expected a FluidTank with velocity and three dye channels');
 const fields=[tank.u,tank.v,...tank.dye];
 let hash=2166136261>>>0;
 const bits=new DataView(new ArrayBuffer(4));
 let nonzero=0;
 for(const field of fields){
  if(!(field instanceof Float32Array))throw new TypeError('Invalid typed solver field');
  for(let i=0;i<field.length;i++){
   const number=field[i];
   if(number!==0)nonzero++;
   bits.setFloat32(0,number,true);
   const word=bits.getUint32(0,true);
   hash=Math.imul(hash^word,16777619)>>>0;
  }
 }
 return {hash:hash.toString(16).padStart(8,'0'),
  grid:tank.width+'x'+tank.height,nonzero};
}
