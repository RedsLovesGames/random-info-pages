/* Offline, deterministic PCM16 WAV export for a selected audio region. */
export function encodeWavRegion(buffer,from=0,to=buffer?.duration) {
  if (!buffer||typeof buffer.getChannelData!=='function'||!Number.isFinite(buffer.sampleRate))
    throw new TypeError('No decoded audio is available');
  const rate=Math.round(buffer.sampleRate);
  if(rate<8000||rate>384000)throw new RangeError('Unsupported sample rate');
  const available=Math.min(2,buffer.numberOfChannels);
  if(available<1)throw new RangeError('No audio channels');
  const start=Math.max(0,Math.floor(Number(from)*rate));
  const end=Math.min(buffer.length,Math.ceil(Number(to)*rate));
  if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)
    throw new RangeError('Select a region with positive duration');
  const frames=end-start;
  const dataBytes=frames*available*2;
  if(dataBytes>96*1024*1024)throw new RangeError('Selected region exceeds the 96 MB WAV export limit');
  const output=new ArrayBuffer(44+dataBytes);
  const data=new DataView(output);
  function name(at,value){for(let i=0;i<value.length;i++)data.setUint8(at+i,value.charCodeAt(i))}
  name(0,'RIFF');data.setUint32(4,36+dataBytes,true);name(8,'WAVE');
  name(12,'fmt ');data.setUint32(16,16,true);data.setUint16(20,1,true);
  data.setUint16(22,available,true);data.setUint32(24,rate,true);
  data.setUint32(28,rate*available*2,true);data.setUint16(32,available*2,true);
  data.setUint16(34,16,true);name(36,'data');data.setUint32(40,dataBytes,true);
  const channels=Array.from({length:available},(_,i)=>buffer.getChannelData(i));
  let offset=44;
  for(let i=start;i<end;i++){
    for(const channel of channels){
      const sample=Math.max(-1,Math.min(1,channel[i]||0));
      data.setInt16(offset,sample<0?Math.round(sample*32768):Math.round(sample*32767),true);
      offset+=2;
    }
  }
  return new Blob([output],{type:'audio/wav'});
}
