/* Standard MIDI File Format 0 export of a 16-step marble loop. */
import {buildPattern} from './music.mjs';
const VLQ_MAX=0x0fffffff;
function variable(value) {
  if(!Number.isInteger(value)||value<0||value>VLQ_MAX)throw new RangeError('Invalid MIDI delta time');
  let bytes=[value&127];
  while((value>>=7)>0)bytes.unshift((value&127)|128);
  return bytes;
}
const ascii=text=>[...text].map(character=>character.charCodeAt(0));
const uint16=n=>[(n>>8)&255,n&255];
const uint32=n=>[(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255];
export function exportPatternMidi(pattern) {
  if(!pattern||!Number.isFinite(pattern.bpm)||pattern.bpm<40||pattern.bpm>240)
    throw new RangeError('Tempo must be between 40 and 240 BPM');
  if(!Array.isArray(pattern.rows)||pattern.rows.length!==8||
    pattern.rows.some(row=>!Number.isInteger(row)||row<0||row>0xffff))
    throw new RangeError('Expected eight rows of sixteen steps');
  const ppq=480,secondsPerQuarter=60/pattern.bpm;
  const entries=[];
  const microseconds=Math.round(60_000_000/pattern.bpm);
  entries.push({tick:0,sort:-1,bytes:[0xff,0x51,0x03,(microseconds>>>16)&255,
    (microseconds>>>8)&255,microseconds&255]});
  for(const event of buildPattern(pattern).events){
    const tick=Math.max(0,Math.round(event.time/secondsPerQuarter*ppq));
    const end=Math.max(tick+1,Math.round((event.time+event.duration)/secondsPerQuarter*ppq));
    const channel=Math.max(0,Math.min(15,Number(event.channel)||0));
    const note=Math.max(0,Math.min(127,Number(event.note)||60));
    const velocity=Math.max(1,Math.min(127,Math.round((event.velocity||0.78)*127)));
    entries.push({tick,sort:1,bytes:[0x90|channel,note,velocity]});
    entries.push({tick:end,sort:0,bytes:[0x80|channel,note,0]});
  }
  entries.sort((a,b)=>a.tick-b.tick||a.sort-b.sort);
  const track=[];
  let previous=0;
  for(const entry of entries){
    track.push(...variable(entry.tick-previous),...entry.bytes);
    previous=entry.tick;
  }
  track.push(0,0xff,0x2f,0);
  const header=[...ascii('MThd'),...uint32(6),...uint16(0),...uint16(1),...uint16(ppq)];
  return new Uint8Array([...header,...ascii('MTrk'),...uint32(track.length),...track]);
}
