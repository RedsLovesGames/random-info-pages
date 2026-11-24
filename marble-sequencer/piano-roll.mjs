/* Coordinate math for a bounded, touch-capable MIDI piano roll. Pure functions
 * are shared by hit-testing, drag previews and deterministic regression tests. */
export const ROLL_PITCH_ROWS=[12,24,36,48];
export const ROLL_TIME_SPANS=[4,8,16,32];
export const ROLL_SNAPS=[0,.05,.125,.25,.5,1];
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const finite=(x)=>Number.isFinite(x);
export function makeRollLayout(events,track,{start=0,span=8,low=48,rows=36,width=900,height=310}={}){
 if(!Array.isArray(events)||!Number.isInteger(track)||track<0||track>63||
  !finite(start)||start<0||!ROLL_TIME_SPANS.includes(span)||
  !Number.isInteger(low)||low<0||!ROLL_PITCH_ROWS.includes(rows)||
  !finite(width)||width<160||width>8192||!finite(height)||height<120||height>2048)
  throw new RangeError('Invalid piano-roll viewport.');
 const bottom=clamp(low,0,128-rows),left=56,top=28,right=width-12;
 const plotWidth=Math.max(1,right-left),plotHeight=height-top-10;
 const rowHeight=plotHeight/rows,pxPerSecond=plotWidth/span,rects=[];
 const high=bottom+rows-1,end=start+span;
 for(let index=0;index<events.length;index++){
  const event=events[index];
  if(event.track!==track||event.note<bottom||event.note>high||
     event.time>=end||event.time+event.duration<=start)continue;
  const begin=Math.max(start,event.time),finish=Math.min(end,event.time+event.duration);
  rects.push({
   index,id:event.id??String(index),note:event.note,velocity:event.velocity,
   x:left+(begin-start)*pxPerSecond,
   y:top+(high-event.note)*rowHeight+1,
   width:Math.max(1,(finish-begin)*pxPerSecond),
   height:Math.max(2,rowHeight-2)
  });
 }
 return {width,height,track,start,span,low:bottom,high,rows,left,top,right,plotHeight,
  rowHeight,pxPerSecond,rects};
}
export function hitRollNote(layout,x,y){
 if(!finite(x)||!finite(y))return null;
 for(let i=layout.rects.length-1;i>=0;i--){
  const r=layout.rects[i];
  if(x>=r.x&&x<=r.x+r.width&&y>=r.y&&y<=r.y+r.height)
   return {index:r.index,id:r.id,mode:r.width>=17&&x>=r.x+r.width-9?'resize':'move'};
 }
 return null;
}
export function dragRollNote(original,{dx=0,dy=0,mode='move',snap=.125},layout){
 if(!original||!finite(dx)||!finite(dy)||!['move','resize'].includes(mode)||
   !ROLL_SNAPS.includes(snap)||!layout?.pxPerSecond||!layout?.rowHeight)
  throw new TypeError('Invalid MIDI note drag.');
 const delta=dx/layout.pxPerSecond;
 const snapValue=v=>snap?Math.round(v/snap)*snap:Math.round(v*1000)/1000;
 const update={...original};
 if(mode==='move'){
  update.time=clamp(snapValue(Math.max(0,original.time+delta)),0,3600);
  update.note=clamp(original.note-Math.round(dy/layout.rowHeight),0,127);
 }else update.duration=clamp(snapValue(Math.max(.001,original.duration+delta)),.001,600);
 // An explicit sub-millisecond duration is never serialized.
 update.duration=Math.max(.001,Math.round(update.duration*1000)/1000);
 update.time=Math.round(update.time*1000)/1000;
 return update;
}
export function scrollForNote(event,span,duration){
 if(!event||!ROLL_TIME_SPANS.includes(span)||!finite(duration)||duration<0)
  throw new TypeError('Invalid MIDI timeline jump');
 return clamp(event.time-span*.3,0,Math.max(0,duration-span));
}
