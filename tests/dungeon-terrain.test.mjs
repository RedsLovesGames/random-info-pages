import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FLOOR,WALL,POOL} from '../dungeon-forge/generator.mjs';
import {makeBattlemap,universalVtt,wallSegments} from '../dungeon-forge/battlemap-core.mjs';
import {createProject,decodeProject} from '../dungeon-forge/dungeon-project.mjs';
import {normalizeTerrainEdits,replayTerrainEdits,paintTerrain,isReachableTopology,
  createTerrainHistory,interpolateTiles,MAX_TERRAIN_EDITS} from '../dungeon-forge/battlemap-terrain.mjs';
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const settings={seed:1337,roomCount:8,loopPercent:15,decorPercent:60,theme:'ancient'};
const dungeon=makeBattlemap(settings);
const walkable=(t)=>t===FLOOR||t===POOL;
function neighbors(base,x,y){
 return [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]
  .filter(([a,b])=>a>=0&&a<base.W&&b>=0&&b<base.H).map(([a,b])=>b*base.W+a);
}
function findLegalEdit(base,edits,mode,filter=()=>true){
 const current=replayTerrainEdits(base,edits).map;
 for(let y=2;y<base.H-2;y++)for(let x=2;x<base.W-2;x++){
  const i=y*base.W+x;
  if(!filter(current,x,y,i))continue;
  try{
   const result=paintTerrain(base,edits,x,y,mode);
   if(result.changed)return {x,y,...result};
  }catch{}
 }
 throw new Error('Could not find a valid '+mode+' edit in seed '+base.params.seed);
}

test('generated dungeons start connected with known regenerable wall segments',()=>{
 assert.ok(isReachableTopology(dungeon));
 assert.ok(dungeon.walls.length>0);
 assert.deepEqual(wallSegments(dungeon),dungeon.walls);
});
test('corridor carving creates real floor and regenerates VTT line-of-sight walls',()=>{
 const edit=findLegalEdit(dungeon,[],'corridor',(d,x,y,i)=>
  !walkable(d.grid[i])&&neighbors(d,x,y).some(n=>walkable(d.grid[n])));
 const {x,y,map,edits}=edit,index=y*dungeon.W+x;
 assert.equal(map.grid[index],FLOOR);
 assert.equal(map.roomId[index],-1);
 assert.equal(map.corridor[index],1);
 assert.equal(dungeon.grid[index]===FLOOR,false,'original generated map is unchanged');
 assert.ok(isReachableTopology(map));
 assert.notDeepEqual(map.walls,dungeon.walls);
 const vtt=universalVtt(map,{pixels:32,image:'cG5n'});
 assert.deepEqual(vtt.line_of_sight,map.walls);
 assert.equal(vtt.resolution.map_size.x,dungeon.W);
 const restored=replayTerrainEdits(dungeon,edits);
 assert.deepEqual(restored.map.walls,map.walls);
 assert.equal(restored.rejected,0);
});
test('room expansion attaches a newly carved tile to exactly one original room',()=>{
 const edit=findLegalEdit(dungeon,[],'room',(base,x,y,index)=>{
  if(walkable(base.grid[index]))return false;
  const ids=new Set(neighbors(base,x,y).map(i=>base.roomId[i]).filter(n=>n>=0));
  return ids.size===1;
 });
 const index=edit.y*dungeon.W+edit.x;
 assert.ok(edit.map.roomId[index]>=0);
 assert.equal(edit.map.grid[index],FLOOR);
 assert.ok(isReachableTopology(edit.map));
 const previous=edit.edits[0];
 assert.equal(previous.mode,'room');
 assert.equal(previous.roomId,edit.map.roomId[index]);
});
test('water is passable and sealed corridor spurs can be restored',()=>{
 const carved=findLegalEdit(dungeon,[],'corridor',(d,x,y,i)=>
   !walkable(d.grid[i])&&neighbors(d,x,y).some(n=>walkable(d.grid[n])));
 const water=paintTerrain(dungeon,carved.edits,carved.x,carved.y,'water');
 assert.equal(water.map.grid[carved.y*dungeon.W+carved.x],POOL);
 const dry=paintTerrain(dungeon,water.edits,carved.x,carved.y,'corridor');
 assert.equal(dry.map.grid[carved.y*dungeon.W+carved.x],FLOOR);
 const sealed=paintTerrain(dungeon,dry.edits,carved.x,carved.y,'wall');
 assert.equal(sealed.map.grid[carved.y*dungeon.W+carved.x],WALL);
 const restored=paintTerrain(dungeon,sealed.edits,carved.x,carved.y,'erase');
 assert.equal(restored.map.grid[carved.y*dungeon.W+carved.x],dungeon.grid[carved.y*dungeon.W+carved.x]);
});
test('original room interiors are immutable and sealing cannot split a walkable route',()=>{
 const room=dungeon.roomId.findIndex(id=>id>=0&&walkable(dungeon.grid[dungeon.roomId.indexOf(id)]));
 const rx=room%dungeon.W,ry=Math.floor(room/dungeon.W);
 assert.throws(()=>paintTerrain(dungeon,[],rx,ry,'wall'),/protected/);
 const base={W:5,H:5,grid:new Uint8Array(25),roomId:new Int16Array(25).fill(-1),
  corridor:new Uint8Array(25),doors:[],stats:{}};
 for(let x=1;x<=3;x++){base.grid[2*5+x]=FLOOR;base.corridor[2*5+x]=1}
 assert.ok(isReachableTopology(base));
 assert.throws(()=>paintTerrain(base,[],2,2,'wall'),/disconnect/);
});
test('untrusted saved edits are replayed through validation, preserving old v1 projects',()=>{
 const project=createProject(settings,{size:4,level:3,difficulty:'moderate'});
 assert.deepEqual(project.terrain,[]);
 const carved=findLegalEdit(dungeon,[],'corridor',(d,x,y,i)=>
  !walkable(d.grid[i])&&neighbors(d,x,y).some(n=>walkable(d.grid[n])));
 project.terrain=[...carved.edits,{x:1,y:1,mode:'room',roomId:79},
  {x:400,y:1,mode:'corridor'},
  {x:carved.x,y:carved.y,mode:'bad'},
  {x:2,y:2,mode:'wall'}];
 const decoded=decodeProject(JSON.stringify(project));
 const applied=replayTerrainEdits(dungeon,decoded.terrain);
 assert.equal(applied.map.grid[carved.y*dungeon.W+carved.x],FLOOR);
 assert.ok(applied.rejected>=1);
 assert.ok(isReachableTopology(applied.map));
 const original={...project};delete original.terrain;
 assert.deepEqual(decodeProject(JSON.stringify(original)).terrain,[]);
 assert.equal(decoded.version,1);
});
test('history saves one drag gesture and allows bidirectional undo/redo',()=>{
 const history=createTerrainHistory();
 const edit=findLegalEdit(dungeon,[],'corridor',(d,x,y,i)=>
  !walkable(d.grid[i])&&neighbors(d,x,y).some(n=>walkable(d.grid[n])));
 assert.equal(history.save([],edit.edits),true);
 assert.equal(history.undoable,true);
 assert.deepEqual(history.undo(edit.edits),[]);
 assert.deepEqual(history.redo([]),edit.edits);
 assert.deepEqual(interpolateTiles({x:1,y:1},{x:5,y:1}),
  [{x:1,y:1},{x:2,y:1},{x:3,y:1},{x:4,y:1},{x:5,y:1}]);
 assert.equal(MAX_TERRAIN_EDITS,384);
});
test('map editor and Owlbear image export use the modified dungeon, not cosmetic lines',()=>{
 const html=read('dungeon-forge/index.html'),code=read('dungeon-forge/battlemap.mjs');
 for(const id of ['battlemapTerrainDetails','battlemapTerrainUndo','battlemapTerrainRedo',
   'battlemapTerrainStatus','battlemapTerrainStop'])
  assert.match(html,new RegExp('id="'+id+'"'));
 for(const name of ['room','wall','corridor','water','erase'])
  assert.match(html,new RegExp('data-terrain-tool="'+name+'"'));
 assert.match(html,/3D dungeon remains unchanged/);
 assert.match(code,/baseDungeon=plan/);
 assert.match(code,/dungeon=terrainResult.map/);
 assert.match(code,/paintTerrain\(baseDungeon,project.terrain,x,y,terrainTool\)/);
 assert.match(code,/map\.addEventListener\('pointerdown'/);
 assert.match(code,/map\.addEventListener\('pointermove'/);
 assert.match(code,/terrainHistory\.save\(before,project.terrain\)/);
 assert.match(code,/universalVtt\(plan,/);
 assert.match(code,/const plan = dungeon;/);
});
