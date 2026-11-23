/* Non-destructive 2D/VTT topology editing for generated dungeons.
 * The 3D exhibit remains the original seeded layout.
 * The original rooms, graph, entry/exit doors, and encounter positions are protected.
 */
import {FLOOR,WALL,POOL} from './generator.mjs';
import {wallSegments} from './battlemap-core.mjs';

export const MAX_TERRAIN_EDITS=384;
export const TERRAIN_TOOLS=Object.freeze(['corridor','room','wall','water','erase']);
const passable=tile=>tile===FLOOR||tile===POOL;
const whole=(value,min,max)=>Number.isInteger(value)&&value>=min&&value<=max;
const key=(x,y)=>x+','+y;

export function normalizeTerrainEdits(source){
 if(!Array.isArray(source))return [];
 const result=new Map();
 for(const raw of source){
  if(!raw||!whole(raw.x,0,300)||!whole(raw.y,0,300)||
      !TERRAIN_TOOLS.includes(raw.mode)||raw.mode==='erase')continue;
  const entry={x:raw.x,y:raw.y,mode:raw.mode};
  if(entry.mode==='room'){
   if(!whole(raw.roomId,0,79))continue;
   entry.roomId=raw.roomId;
  }
  result.set(key(entry.x,entry.y),entry);
  if(result.size>MAX_TERRAIN_EDITS)result.delete(result.keys().next().value);
 }
 return [...result.values()];
}

export function rebuildTopology(base,overrides=[]){
 const edits=normalizeTerrainEdits(overrides);
 const grid=new Uint8Array(base.grid);
 const roomId=new Int16Array(base.roomId);
 const corridor=new Uint8Array(base.corridor);
 for(const edit of edits){
  if(edit.x>=base.W||edit.y>=base.H)continue;
  const index=edit.y*base.W+edit.x;
  if(edit.mode==='corridor'){grid[index]=FLOOR;roomId[index]=-1;corridor[index]=1}
  else if(edit.mode==='room'){grid[index]=FLOOR;roomId[index]=edit.roomId;corridor[index]=0}
  else if(edit.mode==='water'){grid[index]=POOL;roomId[index]=-1;corridor[index]=1}
  else if(edit.mode==='wall'){grid[index]=WALL;roomId[index]=-1;corridor[index]=0}
 }
 const updated={...base,grid,roomId,corridor};
 updated.walls=wallSegments(updated);
 updated.stats={...base.stats,editedTiles:edits.length};
 return updated;
}

export function isReachableTopology(dungeon){
 const {W,H,grid}=dungeon;
 let first=-1,count=0;
 for(let i=0;i<grid.length;i++){
  if(passable(grid[i])){count++;if(first<0)first=i}
 }
 if(first<0)return false;
 const seen=new Uint8Array(W*H),stack=[first];seen[first]=1;
 let visited=0;
 while(stack.length){
  const at=stack.pop();visited++;
  const x=at%W,y=(at/W)|0;
  for(const other of [x>0?at-1:-1,x<W-1?at+1:-1,y>0?at-W:-1,y<H-1?at+W:-1]){
   if(other<0||seen[other]||!passable(grid[other]))continue;
   seen[other]=1;stack.push(other);
  }
 }
 return visited===count;
}

/* Keep every expanded room tile connected to its original room interior,
 * even if an alternate corridor would keep global walkability connected. */
export function hasConnectedRoomFootprints(base,updated){
 const {W,H,roomId,grid}=updated;
 const reachable=new Uint8Array(W*H),stack=[];
 for(let i=0;i<grid.length;i++){
  if(base.roomId[i]<0||!passable(base.grid[i]))continue;
  if(roomId[i]!==base.roomId[i]||!passable(grid[i]))return false;
  if(!reachable[i]){reachable[i]=1;stack.push(i)}
 }
 while(stack.length){
  const at=stack.pop(),x=at%W,y=(at/W)|0;
  for(const next of [x>0?at-1:-1,x<W-1?at+1:-1,y>0?at-W:-1,y<H-1?at+W:-1]){
   if(next<0||reachable[next]||roomId[next]!==roomId[at]||!passable(grid[next]))continue;
   reachable[next]=1;stack.push(next);
  }
 }
 for(let i=0;i<grid.length;i++){
  if(roomId[i]>=0&&passable(grid[i])&&!reachable[i])return false;
 }
 return true;
}

function protectedDoor(base,x,y){
 for(const portal of base.doors||[]){
  if(Math.abs(portal.position.x-(x+.5))<=1.5 &&
     Math.abs(portal.position.y-(y+.5))<=1.5)return true;
 }
 return false;
}
function neighbors(dungeon,x,y){
 return [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]
  .filter(([col,row])=>col>=0&&row>=0&&col<dungeon.W&&row<dungeon.H)
  .map(([col,row])=>row*dungeon.W+col);
}
export function paintTerrain(base,edits,x,y,mode){
 if(!whole(x,1,base.W-2)||!whole(y,1,base.H-2))
  throw new Error('Paint inside the map border.');
 if(!TERRAIN_TOOLS.includes(mode))throw new Error('Choose a terrain brush.');
 const index=y*base.W+x;
 const existing=normalizeTerrainEdits(edits);
 const current=rebuildTopology(base,existing);
 const original=base.grid[index],cell=current.grid[index],originalRoom=base.roomId[index];
 const next=existing.filter(entry=>entry.x!==x||entry.y!==y);
 if(mode==='erase'){
  if(next.length===existing.length)return {edits:existing,map:current,changed:false};
 }else{
  if(protectedDoor(base,x,y))throw new Error('Generated doorways are protected.');
  if(originalRoom>=0&&passable(original))throw new Error('Original room tiles are protected; expand outward instead.');
  if(mode==='wall'){
   if(!passable(cell)||current.roomId[index]>=0)
    throw new Error('Seal only corridor or water tiles, not rooms.');
  }else if(mode==='water'){
   if(!passable(cell)||current.roomId[index]>=0)
    throw new Error('Water replaces a corridor floor. It cannot flood a room.');
   if(cell===POOL)return {edits:existing,map:current,changed:false};
  }else{
   if(cell===FLOOR&&mode==='corridor'&&current.roomId[index]===-1)
    return {edits:existing,map:current,changed:false};
   if(passable(cell)&&mode==='room'&&current.roomId[index]>=0)
    return {edits:existing,map:current,changed:false};
   if(!neighbors(current,x,y).some(other=>passable(current.grid[other])))
    throw new Error('Extend an existing walkable tile; isolated tiles are not permitted.');
   if(mode==='room'){
    const adjacentRooms=new Set(neighbors(current,x,y).map(i=>current.roomId[i]).filter(id=>id>=0));
    if(adjacentRooms.size!==1)
      throw new Error('Expand from exactly one room. A tile cannot merge separate rooms.');
    if(passable(cell))
      throw new Error('Expand into an unoccupied wall or empty tile.');
    next.push({x,y,mode,roomId:[...adjacentRooms][0]});
   }else{
    if(current.roomId[index]>=0)
      throw new Error('Generated room tiles are protected.');
    next.push({x,y,mode});
   }
  }
  if(mode==='wall'||mode==='water')next.push({x,y,mode});
 }
 if(next.length>MAX_TERRAIN_EDITS)
  throw new Error('This map has reached the '+MAX_TERRAIN_EDITS+'-tile edit limit.');
 const candidate=rebuildTopology(base,next);
 if(!isReachableTopology(candidate))
  throw new Error('This change would disconnect reachable rooms or corridors.');
 if(!hasConnectedRoomFootprints(base,candidate))
  throw new Error('This change would detach an expanded room tile from its original room.');
 return {edits:next,map:candidate,changed:true};
}

/* Imported save files are never trusted to directly replace generated room/door
 * geometry. Replay each requested edit through the same live validation. */
export function replayTerrainEdits(base,source){
 let edits=[],map=base,rejected=0;
 for(const entry of normalizeTerrainEdits(source)){
  try{
   const result=paintTerrain(base,edits,entry.x,entry.y,entry.mode);
   if(result.changed){
    // The requested room owner must match the validated adjacent room.
    if(entry.mode==='room'){
     const applied=result.edits.find(e=>e.x===entry.x&&e.y===entry.y);
     if(applied?.roomId!==entry.roomId){rejected++;continue}
    }
    edits=result.edits;map=result.map;
   }
  }catch{rejected++}
 }
 return {edits,map,rejected};
}

export function createTerrainHistory(){
 const past=[],future=[];
 const snapshot=edits=>structuredClone(normalizeTerrainEdits(edits));
 return{
  get undoable(){return past.length>0},
  get redoable(){return future.length>0},
  clear(){past.length=0;future.length=0},
  save(before,after){
   if(JSON.stringify(before)===JSON.stringify(after))return false;
   past.push(snapshot(before));if(past.length>32)past.shift();future.length=0;return true;
  },
  undo(current){
   if(!past.length)return null;
   future.push(snapshot(current));return past.pop();
  },
  redo(current){
   if(!future.length)return null;
   past.push(snapshot(current));return future.pop();
  }
 };
}
export function interpolateTiles(a,b){
 const result=[];
 let x=a.x,y=a.y;
 const dx=Math.abs(b.x-x),dy=Math.abs(b.y-y);
 const sx=x<b.x?1:-1,sy=y<b.y?1:-1;
 let error=dx-dy;
 for(let limit=0;limit<400;limit++){
  result.push({x,y});
  if(x===b.x&&y===b.y)break;
  const twice=2*error;
  if(twice>-dy){error-=dy;x+=sx}
  if(twice<dx){error+=dx;y+=sy}
 }
 return result;
}
