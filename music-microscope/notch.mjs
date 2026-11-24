/* User-controlled, reversible narrowband tonal attenuation.
 * Web Audio native BiquadFilterNode previews use the same RBJ notch parameters.
 * Offline PCM filtering occurs in a Worker; the unmodified source is retained.
 */
export const MAX_NOTCH_BANDS=6;
export const MAX_FILTERED_FRAMES=10_000_000;
export function notchBands(input,sampleRate){
 if(!Number.isFinite(sampleRate)||sampleRate<8000||sampleRate>384000)throw new RangeError('Unsupported sample rate.');
 const frequency=Number(input?.frequency),q=Number(input?.q),harmonics=Number(input?.harmonics);
 if(!Number.isFinite(frequency)||frequency<40||frequency>10000)
  throw new RangeError('Frequency must be between 40 and 10,000 Hz.');
 if(!Number.isFinite(q)||q<3||q>60)
  throw new RangeError('Filter Q must be between 3 and 60.');
 if(!Number.isInteger(harmonics)||harmonics<1||harmonics>MAX_NOTCH_BANDS)
  throw new RangeError('Harmonics must be between 1 and 6.');
 const nyquist=sampleRate*.5;
 const bands=[];
 for(let k=1;k<=harmonics;k++){
  const target=frequency*k;
  if(target>=nyquist*.92)break;
  const omega=2*Math.PI*target/sampleRate;
  const alpha=Math.sin(omega)/(2*q),cos=Math.cos(omega);
  const a0=1+alpha;
  bands.push({frequency:target,q,
   b0:1/a0,b1:-2*cos/a0,b2:1/a0,
   a1:-2*cos/a0,a2:(1-alpha)/a0});
 }
 if(!bands.length)throw new RangeError('Frequency must be below the recording Nyquist limit.');
 return bands;
}

export function spectrumFrequency(fraction,sampleRate){
 if(!Number.isFinite(sampleRate)||sampleRate<=0)throw new RangeError('Invalid sample rate.');
 return 20*Math.pow((sampleRate/2)/20,Math.max(0,Math.min(1,Number(fraction)||0)));
}

/* Stateful cascaded biquads: each channel receives independent filter memories.
 * Float32 input and output prevent repeated full-copy memory allocation.
 */
export function filterNotchPCM(channels,sampleRate,input,{warmup=0}={}){
 if(!Array.isArray(channels)||channels.length<1||channels.length>2||
    channels.some(channel=>!(channel instanceof Float32Array)))
  throw new TypeError('Expected one or two Float32 audio channels.');
 const count=channels[0].length;
 if(count<1||count>MAX_FILTERED_FRAMES||channels.some(channel=>channel.length!==count))
  throw new RangeError('Unsupported audio region size.');
 if(!Number.isInteger(warmup)||warmup<0||warmup>=count)
  throw new RangeError('Invalid filter warmup length.');
 const coefficients=notchBands(input,sampleRate);
 const output=channels.map(channel=>{
  const memory=coefficients.map(()=>({z1:0,z2:0}));
  const result=new Float32Array(count-warmup);
  for(let i=0;i<count;i++){
   let value=channel[i];
   if(!Number.isFinite(value))value=0;
   for(let j=0;j<coefficients.length;j++){
    const c=coefficients[j],state=memory[j];
    const next=c.b0*value+state.z1;
    state.z1=c.b1*value-c.a1*next+state.z2;
    state.z2=c.b2*value-c.a2*next;
    value=next;
   }
   if(i>=warmup)result[i-warmup]=Math.max(-1,Math.min(1,Number.isFinite(value)?value:0));
  }
  return result;
 });
 return {channels:output,length:count-warmup,sampleRate,numberOfChannels:output.length,
  duration:(count-warmup)/sampleRate,
  getChannelData(index){return output[index]}};
}
