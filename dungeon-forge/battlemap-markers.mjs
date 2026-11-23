/* Editable grid annotations with explicit GM/player disclosure.
 * Saved inside Dungeon Forge's existing v1 project JSON. */
import {FLOOR, POOL} from './generator.mjs';
export const MARKER_LIMIT=96;
export const MARKER_KINDS=Object.freeze({
 note:{name:'Note',glyph:'i',color:'#f0c66b'},
 danger:{name:'Hazard',glyph:'!',color:'#e87368'},
 loot:{name:'Treasure',glyph:'$',color:'#73d0a0'},
 npc:{name:'NPC',glyph:'N',color:'#b9a0ec'},
 clue:{name:'Clue',glyph:'?',color:'#6cb7e6'},
 objective:{name:'Objective',glyph:'★',color:'#f5b26e'}
});
function int(value,min,max){return Number.isInteger(value)&&value>=min&&value<=max}
export function normalizeMarker(value){
 if(!value||typeof value!=='object')return null;
 const id=Number(value.id),x=Number(value.x),y=Number(value.y);
 if(!int(id,1,0x7fffffff)||!int(x,0,300)||!int(y,0,300))return null;
 const kind=Object.hasOwn(MARKER_KINDS,value.kind)?value.kind:'note';
 const label=typeof value.label==='string'?value.label.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,96):'';
 return {id,x,y,kind,label,player:value.player===true};
}
export function normalizeMarkers(value){
 if(!Array.isArray(value))return [];
 const seen=new Set(),results=[];
 for(const raw of value){
  const marker=normalizeMarker(raw);
  if(!marker||seen.has(marker.id))continue;
  seen.add(marker.id);results.push(marker);
  if(results.length>=MARKER_LIMIT)break;
 }
 return results;
}
export function isMarkerTile(dungeon,x,y){
 if(!dungeon||!int(x,0,dungeon.W-1)||!int(y,0,dungeon.H-1))return false;
 const tile=dungeon.grid[y*dungeon.W+x];
 return tile===FLOOR||tile===POOL;
}
export function addMarker(project,dungeon,value){
 const existing=project.markers??=([]);
 if(existing.length>=MARKER_LIMIT)throw new Error('Marker limit reached ('+MARKER_LIMIT+').');
 if(!isMarkerTile(dungeon,value.x,value.y))
  throw new Error('Place a marker on a walkable floor or water square.');
 const max=Math.max(0,...existing.map(m=>m.id));
 if(max>=0x7ffffffe)throw new Error('Marker ID limit reached.');
 const raw=normalizeMarker({...value,id:max+1});
 if(!raw)throw new Error('Invalid map annotation.');
 existing.push(raw);return raw;
}
export function moveMarker(project,dungeon,id,x,y){
 const entry=project.markers?.find(m=>m.id===id);
 if(!entry)throw new Error('Select an existing marker first.');
 if(!isMarkerTile(dungeon,x,y))throw new Error('Move the marker to a walkable square.');
 entry.x=x;entry.y=y;return entry;
}
export function changeMarker(project,id,fields){
 const entry=project.markers?.find(m=>m.id===id);
 if(!entry)throw new Error('Choose a marker to edit.');
 const result=normalizeMarker({...entry,...fields,id:entry.id,x:entry.x,y:entry.y});
 if(!result)throw new Error('Invalid marker settings.');
 Object.assign(entry,result);return entry;
}
export function deleteMarker(project,id){
 const before=project.markers?.length??0;
 project.markers=project.markers?.filter(m=>m.id!==id)||[];
 if(project.markers.length===before)throw new Error('Marker no longer exists.');
 return true;
}
export function findMarker(project,x,y){
 return (project.markers||[]).find(m=>m.x===x&&m.y===y)||null;
}
export function createMarkerHistory(){
 const past=[],future=[];
 const clone=markers=>structuredClone(markers||[]);
 const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 return {
  get undoable(){return past.length>0},
  get redoable(){return future.length>0},
  clear(){past.length=0;future.length=0},
  edit(project,change){
   const before=clone(project.markers);
   const value=change();
   const after=clone(project.markers);
   if(!equal(before,after)){past.push(before);if(past.length>32)past.shift();future.length=0}
   return value;
  },
  undo(project){
   if(!past.length)return false;
   future.push(clone(project.markers));project.markers=past.pop();return true;
  },
  redo(project){
   if(!future.length)return false;
   past.push(clone(project.markers));project.markers=future.pop();return true;
  }
 };
}
export function markerText(marker){
 const info=MARKER_KINDS[marker.kind]||MARKER_KINDS.note;
 return info.name+' · '+(marker.label||'Unlabeled')+' · col '+(marker.x+1)+', row '+(marker.y+1)+
  (marker.player?' · visible to players':' · GM only');
}
export function drawMarkerOverlay(canvas,dungeon,pixels,markers,{role='gm',region,selected=null}={}){
 if(!markers?.length)return;
 const context=canvas.getContext('2d');
 if(!context)return;
 const originX=region?.x||0,originY=region?.y||0;
 context.save();context.setTransform(1,0,0,1,0,0);
 for(const marker of markers){
  if(role==='player'&&!marker.player)continue;
  if(!isMarkerTile(dungeon,marker.x,marker.y))continue;
  if(region){
   if(marker.x<region.x||marker.x>=region.x+region.W||
      marker.y<region.y||marker.y>=region.y+region.H||
      !region.visible.has(marker.y*dungeon.W+marker.x))continue;
  }
  const x=(marker.x-originX+.5)*pixels,y=(marker.y-originY+.5)*pixels;
  const kind=MARKER_KINDS[marker.kind]||MARKER_KINDS.note;
  const radius=Math.max(4.5,pixels*.30);
  context.shadowColor='#060a12bb';context.shadowBlur=Math.max(2,pixels*.13);
  context.fillStyle=kind.color;
  context.beginPath();context.arc(x,y,radius,0,Math.PI*2);context.fill();
  context.shadowBlur=0;
  context.strokeStyle=marker.id===selected?'#ffffff':'#172132';
  context.lineWidth=marker.id===selected?Math.max(2,pixels*.09):Math.max(1,pixels*.055);
  context.stroke();
  context.font='800 '+Math.max(9,Math.round(pixels*.39))+'px system-ui,sans-serif';
  context.textBaseline='middle';context.textAlign='center';context.fillStyle='#1d2531';
  context.fillText(kind.glyph,x,y+1);
  if(pixels<32||!marker.label)continue;
  const label=marker.label.length>23?marker.label.slice(0,22)+'…':marker.label;
  context.font='700 '+Math.max(10,Math.min(18,Math.round(pixels*.26)))+'px system-ui,sans-serif';
  const w=context.measureText(label).width+12;
  let left=x-w/2;
  left=Math.max(2,Math.min(canvas.width-w-2,left));
  const top=Math.min(canvas.height-21,y+radius+3);
  if(top<0)continue;
  context.fillStyle='#111722e8';context.fillRect(left,top,w,18);
  context.fillStyle='#ffffff';context.textAlign='center';
  context.fillText(label,left+w/2,top+10,Math.max(12,w-8));
 }
 context.restore();
}
