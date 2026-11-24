/* Multitrack MIDI editor and SMF1 exporter.
 * The parser supplies seconds-based note timing and, when possible, the
 * source PPQ tempo map. Export uses inverse timing to reconstruct tick
 * positions across tempo changes; unsupported timing uses 120 BPM.
 */
import {normalizeMidiTiming,midiSecondsToTick} from './midi-timing.mjs';
export const MIDI_MAX_EVENTS=50000;
export const MIDI_WORKSPACE_FORMAT='rip-marble-midi-workspace-v1';
const valid=(n,min,max)=>Number.isFinite(n)&&n>=min&&n<=max;
const byte=(n)=>Math.max(0,Math.min(127,Math.round(n)));
export function normalizeMidiEvents(input){
 if(!Array.isArray(input)||!input.length||input.length>MIDI_MAX_EVENTS)
  throw new RangeError('A MIDI workspace needs 1 to 50,000 notes.');
 const usedIds=new Set();
 return input.map((e,index)=>{
  if(!e||!valid(e.time,0,3600)||!valid(e.duration,.001,600)||!valid(e.note,0,127)||
     !valid(e.channel,0,15)||!valid(e.track,0,63)||
     !valid(e.velocity,0,1)||!valid(e.program??0,0,127))
   throw new RangeError('Invalid MIDI event or unsupported track/channel.');
  let id=typeof e.id==='string'&&/^[a-zA-Z0-9:_-]{1,64}$/.test(e.id)
   ?e.id:'n'+index;
  if(usedIds.has(id)){
   id='n'+index;let suffix=0;
   while(usedIds.has(id))id='n'+index+'_'+(++suffix);
  }
  usedIds.add(id);
  return {id,time:Number(e.time),duration:Number(e.duration),note:byte(e.note),
   channel:Math.round(e.channel),track:Math.round(e.track),velocity:Number(e.velocity),
   program:byte(e.program??0)};
 }).sort((a,b)=>a.time-b.time||a.track-b.track||a.note-b.note);
}
export function trackSummary(events){
 const groups=new Map();
 events.forEach((event,index)=>{
  let group=groups.get(event.track);
  if(!group){group={track:event.track,notes:0,channels:new Set(),minNote:127,maxNote:0,
    indices:[]};groups.set(event.track,group)}
  group.notes++;group.channels.add(event.channel);
  group.minNote=Math.min(group.minNote,event.note);
  group.maxNote=Math.max(group.maxNote,event.note);
  group.indices.push(index);
 });
 return [...groups.values()].sort((a,b)=>a.track-b.track).map(g=>({
  ...g,channels:[...g.channels].sort((a,b)=>a-b)}));
}
export function changeMidiTrack(events,track,{transpose=0,velocity=100,shiftMs=0}={}){
 if(!Number.isInteger(track)||track<0||track>63||!Number.isInteger(transpose)||
    transpose<-24||transpose>24||!valid(velocity,10,200)||
    !Number.isInteger(shiftMs)||shiftMs<-2000||shiftMs>2000)
  throw new RangeError('Track change is outside supported pitch, velocity or timing limits.');
 if(!events.some(e=>e.track===track))throw new Error('MIDI track not found.');
 return normalizeMidiEvents(events.map(event=>event.track===track?{
  ...event,note:byte(event.note+transpose),
  velocity:Math.max(0,Math.min(1,event.velocity*velocity/100)),
  time:Math.max(0,event.time+shiftMs/1000)
 }:event));
}
export function changeMidiNote(events,index,{note,time,duration,velocity}={}){
 if(!Number.isInteger(index)||index<0||index>=events.length)throw new RangeError('Invalid note index.');
 const old=events[index];
 const edited={...old,
   note:note===undefined?old.note:Number(note),
   time:time===undefined?old.time:Number(time),
   duration:duration===undefined?old.duration:Number(duration),
   velocity:velocity===undefined?old.velocity:Number(velocity)};
 return normalizeMidiEvents(events.map((event,i)=>i===index?edited:event));
}
export function buildMidiWorkspace({name,events,muted=[],timing=null}){
 const notes=normalizeMidiEvents(events);
 const groups=trackSummary(notes).map(group=>group.track);
 const mutedSet=new Set(muted);
 if(!Array.isArray(muted)||muted.some(track=>!Number.isInteger(track)||!groups.includes(track)))
  throw new RangeError('Unrecognized muted track.');
 const nameSafe=typeof name==='string'?name.slice(0,120):'Imported MIDI';
 const tempoMap=normalizeMidiTiming(timing);
 return {format:MIDI_WORKSPACE_FORMAT,name:nameSafe,
  events:notes,muted:[...mutedSet].sort((a,b)=>a-b),
  ...(tempoMap?{timing:tempoMap}:{})};
}
export function midiPlaybackSong(workspace){
 const muted=new Set(workspace.muted);
 const events=workspace.events.filter(e=>!muted.has(e.track));
 const duration=Math.max(.1,...workspace.events.map(e=>e.time+e.duration));
 return {kind:'midi',name:workspace.name,events,duration,tracks:trackSummary(workspace.events).length};
}
const ascii=s=>Array.from(s,x=>x.charCodeAt(0));
const u16=n=>[(n>>>8)&255,n&255],u32=n=>[(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255];
function vlq(n){
 if(!Number.isInteger(n)||n<0||n>0x0fffffff)throw new RangeError('MIDI tick overflow.');
 const arr=[n&127];
 while((n>>=7))arr.unshift((n&127)|128);
 return arr;
}
function chunk(entries){
 entries.sort((a,b)=>a.tick-b.tick||a.order-b.order);
 let tick=0;const bytes=[];
 for(const event of entries){
  bytes.push(...vlq(event.tick-tick),...event.data);
  tick=event.tick;
 }
 bytes.push(0,0xff,0x2f,0);
 return [...ascii('MTrk'),...u32(bytes.length),...bytes];
}
export function exportMultitrackMidi(workspace){
 const w=buildMidiWorkspace(workspace);
 const groups=trackSummary(w.events);
 const ppq=w.timing?.ppq??480;
 const toTick=seconds=>w.timing
  ?midiSecondsToTick(seconds,w.timing):Math.round(seconds*ppq*2);
 const tempoEntries=w.timing
  ?w.timing.changes.map(({tick,us})=>({tick,order:0,data:[
    0xff,0x51,0x03,(us>>>16)&255,(us>>>8)&255,us&255]}))
  :[{tick:0,order:0,data:[0xff,0x51,0x03,0x07,0xa1,0x20]}];
 const start=chunk(tempoEntries);
 const tracks=groups.map(group=>{
  const entries=[],programs=new Array(16).fill(-1);
  for(const event of w.events.filter(e=>e.track===group.track)){
   const tick=toTick(event.time),end=Math.max(tick+1,toTick(event.time+event.duration));
   if(event.channel!==9&&programs[event.channel]!==event.program){
    entries.push({tick,order:-1,data:[0xc0|event.channel,event.program]});
    programs[event.channel]=event.program;
   }
   entries.push({tick,order:1,data:[0x90|event.channel,event.note,
     Math.max(1,Math.min(127,Math.round(event.velocity*127)))]});
   entries.push({tick:end,order:0,data:[0x80|event.channel,event.note,0]});
  }
  return chunk(entries);
 });
 const header=[...ascii('MThd'),...u32(6),...u16(1),...u16(1+tracks.length),...u16(ppq)];
 return new Uint8Array([...header,...start,...tracks.flat()]);
}
