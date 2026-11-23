/* Deterministic 16-step edit operations and source-to-pattern quantization.
 * Audio hit lanes are approximate; MIDI voices are collapsed to eight tracks. */
import {LANES} from './music.mjs';
export const STEPS=16;
const fullMask=0xffff;
export function rotateRows(rows,amount){
 if(!Array.isArray(rows)||rows.length!==LANES.length||rows.some(n=>!Number.isInteger(n)||n<0||n>fullMask))
  throw new RangeError('Expected eight 16-step lane bitmasks');
 const shift=((Math.round(amount)%STEPS)+STEPS)%STEPS;
 return rows.map(bits=>((bits<<shift)|(bits>>>(STEPS-shift)))&fullMask);
}
export function euclideanRhythm(pulses,rotation=0,steps=STEPS){
 if(!Number.isInteger(steps)||steps<1||steps>32||!Number.isInteger(pulses)||pulses<0||pulses>steps)
  throw new RangeError('Pulses must fit the selected number of steps');
 if(!Number.isFinite(rotation))throw new RangeError('Rotation must be finite');
 const shift=((Math.trunc(rotation)%steps)+steps)%steps;
 let mask=0;
 for(let i=0;i<steps;i++){
  if(Math.floor(((i+1)*pulses)/steps)!==Math.floor((i*pulses)/steps))
   mask|=(1<<((i+shift)%steps));
 }
 return mask>>>0;
}
function laneForMidi(note,channel){
 if(channel===9){
  if([35,36].includes(note))return 0;
  if([38,40,37,39].includes(note))return 1;
  if([42,44,46,49,51,53,55,57,59].includes(note))return 2;
  return note<39?0:note<42?1:2;
 }
 let best=3,score=Infinity;
 for(let i=3;i<LANES.length;i++){
  const reference=LANES[i].note;
  // Match pitch classes first; distinguish broad range for unusual registers.
  const distance=Math.abs(((note-reference+6)%12+12)%12-6)+
    Math.abs(note-reference)/48;
  if(distance<score){score=distance;best=i}
 }
 return best;
}
export function patternFromEvents(song,{bpm=104,startTime=0}={}){
 if(!song||!Array.isArray(song.events)||!['audio','midi'].includes(song.kind))
  throw new TypeError('Load an audio recording or MIDI file before quantizing');
 if(!Number.isInteger(bpm)||bpm<40||bpm>240)
  throw new RangeError('Loop tempo must be 40 to 240 BPM');
 if(!Number.isFinite(startTime)||startTime<0)
  throw new RangeError('Invalid starting time');
 const stepSeconds=15/bpm,windowSeconds=STEPS*stepSeconds;
 const rows=LANES.map(()=>0);
 let mapped=0,discarded=0;
 for(const event of song.events){
  if(!Number.isFinite(event?.time)||event.time<startTime||event.time>=startTime+windowSeconds)continue;
  const lane=song.kind==='audio'?event.lane:
    laneForMidi(event.note,event.channel);
  if(!Number.isInteger(lane)||lane<0||lane>=LANES.length){discarded++;continue}
  const step=Math.min(STEPS-1,Math.max(0,Math.round((event.time-startTime)/stepSeconds)));
  rows[lane]|=1<<step;
  mapped++;
 }
 return {pattern:{bpm,rows},mapped,discarded,windowSeconds};
}
