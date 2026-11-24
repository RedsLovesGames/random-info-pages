/* Canvas piano-roll controller. Notes are picked from the exact imported MIDI
 * workspace; edits commit through its shared history, never directly mutate it. */
import {makeRollLayout,hitRollNote,dragRollNote,scrollForNote,hasRollDragIntent} from './piano-roll.mjs';
import {noteName} from './music.mjs';

const el=id=>document.getElementById(id);
const clamp=(x,min,max)=>Math.max(min,Math.min(max,x));
export function createPianoRoll({getState,onSelect,onEdit,onSeek}){
 const canvas=el('piano-canvas'),ctx=canvas.getContext('2d');
 if(!ctx)throw new Error('2D canvas rendering is unavailable for the piano roll.');
 const spanControl=el('piano-span'),lowControl=el('piano-low'),
  rowsControl=el('piano-rows'),scroll=el('piano-scroll'),
  snap=el('piano-snap'),hint=el('piano-hint');
 let layout=null,gesture=null,lastDraw=0;
 let duration=0;
 function getViewport(){
  const span=Number(spanControl.value),rows=Number(rowsControl.value);
  const low=clamp(Number(lowControl.value)||0,0,128-rows);
  lowControl.max=String(128-rows);lowControl.value=String(low);
  const maxStart=Math.max(0,duration-span);
  scroll.max=String(maxStart);
  const start=clamp(Number(scroll.value)||0,0,maxStart);
  scroll.value=String(start);
  el('piano-offset').textContent=start.toFixed(2)+' s';
  return {start,span,low,rows};
 }
 function colors(){
  const css=getComputedStyle(document.querySelector('.marble-page'));
  const pick=(name,fallback)=>css.getPropertyValue(name).trim()||fallback;
  return {ink:pick('--ink','#222b38'),paper:pick('--paper','#f2f1ec'),
   face:pick('--face','#fff'),line:pick('--border','#cbd0d5'),
   blue:pick('--blue','#2c40c6'),muted:pick('--muted','#66717a')};
 }
 function paint(){
  const state=getState();
  if(!state.workspace||state.kind!=='midi')return;
  duration=Math.max(.1,...state.workspace.events.map(e=>e.time+e.duration));
  const canvasWidth=Math.max(160,canvas.clientWidth);
  const canvasHeight=Math.max(120,canvas.clientHeight);
  const ratio=Math.min(2,window.devicePixelRatio||1);
  const w=Math.round(canvasWidth*ratio),h=Math.round(canvasHeight*ratio);
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}
  ctx.setTransform(ratio,0,0,ratio,0,0);
  const options=getViewport();
  layout=makeRollLayout(state.workspace.events,state.track,
   {...options,width:canvasWidth,height:canvasHeight});
  const c=colors();
  ctx.clearRect(0,0,canvasWidth,canvasHeight);
  ctx.fillStyle=c.face;ctx.fillRect(0,0,canvasWidth,canvasHeight);
  const {low,high,top,left,right,rowHeight,pxPerSecond,span,start}=layout;
  for(let midi=low;midi<=high;midi++){
   const y=top+(high-midi)*rowHeight;
   const isBlack=[1,3,6,8,10].includes(midi%12);
   if(isBlack){ctx.fillStyle=c.paper;ctx.fillRect(0,y,canvasWidth,rowHeight)}
   ctx.strokeStyle=c.line;ctx.globalAlpha=.38;
   ctx.beginPath();ctx.moveTo(0,y+rowHeight);ctx.lineTo(canvasWidth,y+rowHeight);ctx.stroke();
   ctx.globalAlpha=1;
   if(midi%12===0||rowHeight>18){
    ctx.fillStyle=c.muted;ctx.font='10px system-ui';
    ctx.fillText(noteName(midi),5,y+Math.max(10,rowHeight*.72));
   }
  }
  const interval=span<=4?.25:span<=8?.5:span<=16?1:2;
  ctx.textBaseline='alphabetic';
  for(let t=Math.ceil(start/interval)*interval;t<=start+span+1e-7;t+=interval){
   const x=left+(t-start)*pxPerSecond;
   ctx.strokeStyle=c.line;ctx.globalAlpha=Math.abs(t-Math.round(t))<1e-6?.8:.3;
   ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x,canvasHeight-8);ctx.stroke();
   ctx.globalAlpha=1;
   ctx.fillStyle=c.muted;ctx.font='10px system-ui';
   ctx.fillText(t.toFixed(interval<1?2:0)+'s',Math.min(right-37,x+3),17);
  }
  ctx.fillStyle=c.paper;ctx.fillRect(0,0,left,top);
  ctx.fillStyle=c.muted;ctx.font='10px system-ui';
  ctx.fillText('PITCH',5,17);
  ctx.strokeStyle=c.line;ctx.beginPath();ctx.moveTo(left,0);ctx.lineTo(left,canvasHeight);ctx.stroke();
  const mutedSet=new Set(state.workspace.muted);
  const isMuted=mutedSet.has(state.track);
  for(const rect of layout.rects){
   const selected=rect.id===state.selectedId;
   ctx.fillStyle=selected?'#d77b37':c.blue;
   ctx.globalAlpha=isMuted?.4:Math.max(.48,.5+rect.velocity*.5);
   const rw=Math.max(1,rect.width-1),rh=Math.max(2,rect.height-1);
   ctx.fillRect(rect.x,rect.y,rw,rh);
   ctx.globalAlpha=1;
   if(selected){ctx.strokeStyle=c.ink;ctx.lineWidth=1.5;
    ctx.strokeRect(rect.x+.5,rect.y+.5,Math.max(1,rw-1),Math.max(1,rh-1))}
   if(rect.width>=18){ctx.fillStyle='#fff';ctx.fillRect(rect.x+rect.width-5,rect.y+2,2,Math.max(1,rh-5))}
  }
  if(gesture?.draft){
   const preview=makeRollLayout([gesture.draft],state.track,
    {...options,width:canvasWidth,height:canvasHeight}).rects[0];
   if(preview){
    ctx.fillStyle='#d77b37';ctx.globalAlpha=.65;
    ctx.fillRect(preview.x,preview.y,Math.max(1,preview.width),preview.height);
    ctx.globalAlpha=1;ctx.strokeStyle='#fff';ctx.setLineDash([4,2]);
    ctx.strokeRect(preview.x,preview.y,Math.max(1,preview.width),preview.height);
    ctx.setLineDash([]);
   }
  }
  const playhead=state.position;
  if(Number.isFinite(playhead)&&playhead>=start&&playhead<=start+span){
   const x=left+(playhead-start)*pxPerSecond;
   ctx.strokeStyle='#d94848';ctx.lineWidth=2;
   ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,canvasHeight-7);ctx.stroke();
  }
  hint.textContent=gesture?.draft
   ?noteName(gesture.draft.note)+' · start '+gesture.draft.time.toFixed(3)+
     ' s · length '+gesture.draft.duration.toFixed(3)+' s · release to save'
   :'Track '+(state.track+1)+' · '+layout.rects.length+
    ' visible note(s) · '+start.toFixed(2)+'–'+(start+span).toFixed(2)+
    ' s · drag to move/resize. Arrow keys nudge a selected note; Shift+←/→ changes its duration.';
 }
 function focusNote(event){
  if(!event)return;
  const span=Number(spanControl.value),rows=Number(rowsControl.value);
  const start=Number(scroll.value)||0;
  if(event.time<start||event.time>=start+span)
   scroll.value=String(scrollForNote(event,span,duration||event.time+event.duration));
  const low=Number(lowControl.value)||0;
  if(event.note<low||event.note>=low+rows)
   lowControl.value=String(clamp(event.note-Math.floor(rows/2),0,128-rows));
  paint();
 }
 function position(event){
  const rect=canvas.getBoundingClientRect();
  return {x:(event.clientX-rect.left)*canvas.clientWidth/Math.max(1,rect.width),
   y:(event.clientY-rect.top)*canvas.clientHeight/Math.max(1,rect.height)};
 }
 function finishGesture(event,cancelled=false){
  if(!gesture||event.pointerId!==gesture.pointerId)return;
  if(!cancelled&&gesture.draft){
   const {original,draft,id}=gesture;
   if(original.note!==draft.note||original.time!==draft.time||original.duration!==draft.duration)
    onEdit(id,{note:draft.note,time:draft.time,duration:draft.duration});
  }
  gesture=null;canvas.dataset.dragging='false';
  if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);
  paint();
 }
 canvas.addEventListener('pointerdown',event=>{
  if(event.button!==0||!layout)return;
  const state=getState();
  if(!state.workspace||state.kind!=='midi')return;
  event.preventDefault();
  const p=position(event),hit=hitRollNote(layout,p.x,p.y);
  if(!hit){
   if(p.x>=layout.left&&p.y>=layout.top)
    onSeek(layout.start+(p.x-layout.left)/layout.pxPerSecond);
   return;
  }
  const original=state.workspace.events[hit.index];
  if(!original)return;
  onSelect(hit.id);
  gesture={pointerId:event.pointerId,id:hit.id,original:{...original},
   start:p,mode:hit.mode,draft:null,model:layout};
  canvas.setPointerCapture(event.pointerId);
  canvas.dataset.dragging='false';
 });
 canvas.addEventListener('pointermove',event=>{
  if(!gesture||event.pointerId!==gesture.pointerId)return;
  event.preventDefault();
  const at=position(event),dx=at.x-gesture.start.x,dy=at.y-gesture.start.y;
  // A small touch or mouse jitter is selection, not an edit. In particular
  // it must not quantize an originally off-grid note accidentally.
  if(!hasRollDragIntent(dx,dy)){
    if(gesture.draft){gesture.draft=null;paint()}
    return;
  }
  canvas.dataset.dragging='true';
  gesture.draft=dragRollNote(gesture.original,
   {dx,dy,mode:gesture.mode,snap:Number(snap.value)},gesture.model);
  paint();
 });
 canvas.addEventListener('pointerup',event=>finishGesture(event,false));
 canvas.addEventListener('pointercancel',event=>finishGesture(event,true));
 canvas.addEventListener('keydown',event=>{
  if(event.altKey||event.ctrlKey||event.metaKey||
     !['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key))return;
  const state=getState();
  const current=state.workspace?.events.find(note=>note.id===state.selectedId);
  if(!current||state.kind!=='midi')return;
  event.preventDefault();
  const step=Number(snap.value)||.01;
  const next={note:current.note,time:current.time,duration:current.duration};
  if(event.key==='ArrowUp')next.note=clamp(current.note+1,0,127);
  else if(event.key==='ArrowDown')next.note=clamp(current.note-1,0,127);
  else if(event.shiftKey){
    next.duration=clamp(Math.round((current.duration+
      (event.key==='ArrowRight'?step:-step))*1000)/1000,.001,600);
  }else{
    next.time=clamp(Math.round((current.time+
      (event.key==='ArrowRight'?step:-step))*1000)/1000,0,3600);
  }
  if(next.note!==current.note||next.time!==current.time||next.duration!==current.duration)
    onEdit(current.id,next);
 });
 for(const control of [spanControl,lowControl,rowsControl,snap,scroll])
  control.addEventListener(control===scroll?'input':'change',paint);
 el('piano-jump').addEventListener('click',()=>{
  const state=getState();if(!state.workspace)return;
  scroll.value=String(clamp(state.position-Number(spanControl.value)*.3,
   0,Math.max(0,duration-Number(spanControl.value))));
  paint();
 });
 const observer=new ResizeObserver(()=>paint());observer.observe(canvas);
 return {render:paint,focusNote,tick(now){
   if(now-lastDraw>=120&&getState().kind==='midi'){
    lastDraw=now;paint();
   }
 }};
}
