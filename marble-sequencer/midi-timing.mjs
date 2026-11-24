/* Preserve Standard MIDI ppq tempo changes through editable note timelines.
 * SMPTE/format-2 sources deliberately fall back to flattened seconds. */
export const MAX_TEMPO_CHANGES=4096;
export function normalizeMidiTiming(input){
 if(input==null)return null;
 const {ppq,changes}=input;
 if(!Number.isInteger(ppq)||ppq<1||ppq>32767||
    !Array.isArray(changes)||changes.length<1||changes.length>MAX_TEMPO_CHANGES)
  throw new RangeError('Invalid MIDI tempo map.');
 let previous=-1;
 const result=changes.map(({tick,us})=>{
  if(!Number.isInteger(tick)||tick<=previous||tick<0||tick>0x0fffffff||
     !Number.isInteger(us)||us<1000||us>0xffffff)
   throw new RangeError('Invalid MIDI tempo event.');
  previous=tick;return {tick,us};
 });
 if(result[0].tick!==0)throw new RangeError('A MIDI tempo map must start at tick zero.');
 return {ppq,changes:result};
}
export function collectMidiTiming(events,ppq){
 if(!Number.isInteger(ppq)||ppq<1||ppq>32767)return null;
 const changes=[{tick:0,us:500000}];
 for(const e of events){
  if(e.type!=='setTempo'||!Number.isInteger(e.microsecondsPerBeat)||
    e.microsecondsPerBeat<1000||e.microsecondsPerBeat>0xffffff)continue;
  if(!Number.isInteger(e.tick)||e.tick<0)continue;
  const at=changes[changes.length-1];
  if(at.tick===e.tick)at.us=e.microsecondsPerBeat;
  else if(e.tick>at.tick){
   changes.push({tick:e.tick,us:e.microsecondsPerBeat});
   if(changes.length>MAX_TEMPO_CHANGES)return null;
  }
 }
 return normalizeMidiTiming({ppq,changes});
}
export function midiTickToSeconds(tick,timing){
 if(!Number.isFinite(tick)||tick<0)throw new RangeError('Invalid MIDI tick.');
 const {ppq,changes}=normalizeMidiTiming(timing);
 let seconds=0;
 for(let i=0;i<changes.length;i++){
  const from=changes[i],next=changes[i+1];
  if(!next||tick<next.tick)return seconds+(tick-from.tick)*from.us/(1e6*ppq);
  seconds+=(next.tick-from.tick)*from.us/(1e6*ppq);
 }
 return seconds;
}
export function midiSecondsToTick(time,timing){
 if(!Number.isFinite(time)||time<0)throw new RangeError('Invalid MIDI time.');
 const {ppq,changes}=normalizeMidiTiming(timing);
 let elapsed=0;
 for(let i=0;i<changes.length;i++){
  const from=changes[i],next=changes[i+1];
  const duration=next?(next.tick-from.tick)*from.us/(1e6*ppq):Infinity;
  if(!next||time<elapsed+duration){
   const tick=from.tick+Math.round((time-elapsed)*1e6*ppq/from.us);
   if(tick>0x0fffffff)throw new RangeError('MIDI delta timing overflow.');
   return tick;
  }
  elapsed+=duration;
 }
 return 0;
}
