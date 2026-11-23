import test from 'node:test';
import assert from 'node:assert/strict';
import {FLOOR,WALL,POOL} from '../dungeon-forge/generator.mjs';
import {normalizeMarkers,MARKER_LIMIT,MARKER_KINDS,isMarkerTile,addMarker,moveMarker,
 changeMarker,deleteMarker,findMarker,createMarkerHistory,markerText,drawMarkerOverlay}
 from '../dungeon-forge/battlemap-markers.mjs';
const map={W:8,H:6,grid:Array.from({length:48},(_,i)=>i===3?WALL:i===11?POOL:FLOOR)};
test('marker import validation enforces IDs, grid bounds, type and privacy',()=>{
 const arr=normalizeMarkers([
  {id:1,x:2,y:3,kind:'danger',label:'a'.repeat(150),player:true},
  {id:1,x:4,y:4,kind:'loot',label:'duplicate'},
  {id:2,x:3,y:2,kind:'unknown',label:'GM\nSECRET',player:'true'},
  {id:-2,x:1,y:1},{id:4,x:999,y:1},null]);
 assert.equal(arr.length,2);
 assert.equal(arr[0].label.length,96);
 assert.equal(arr[0].player,true);
 assert.equal(arr[1].player,false);
 assert.equal(arr[1].kind,'note');
 assert.equal(arr[1].label,'GM SECRET');
 assert.equal(Object.keys(MARKER_KINDS).length,6);
});
test('annotations can be placed and moved only on valid walkable squares',()=>{
 const project={markers:[]};
 assert.equal(isMarkerTile(map,3,0),false);
 assert.equal(isMarkerTile(map,3,1),true);
 const m=addMarker(project,map,{x:2,y:3,kind:'clue',label:'Silver key',player:false});
 assert.equal(m.id,1);
 assert.equal(project.markers.length,1);
 const second=addMarker(project,map,{id:1,x:1,y:1,kind:'note',label:'collision test'});
 assert.equal(second.id,2,'new marker IDs cannot be overridden by input');
 deleteMarker(project,second.id);
 assert.throws(()=>addMarker(project,map,{x:3,y:0}),/walkable/);
 assert.throws(()=>moveMarker(project,map,m.id,999,1),/walkable/);
 moveMarker(project,map,m.id,4,4);
 assert.equal(findMarker(project,4,4)?.id,1);
 changeMarker(project,m.id,{label:'Changed',player:true,kind:'npc'});
 assert.equal(project.markers[0].player,true);
 assert.match(markerText(project.markers[0]),/visible to players/);
 deleteMarker(project,m.id);
 assert.equal(project.markers.length,0);
});
test('marker edits support bounded independent undo and redo',()=>{
 const project={markers:[]},history=createMarkerHistory();
 history.edit(project,()=>addMarker(project,map,{x:1,y:1,kind:'note',label:'A'}));
 history.edit(project,()=>addMarker(project,map,{x:2,y:1,kind:'npc',label:'B'}));
 assert.equal(project.markers.length,2);
 assert.ok(history.undoable);
 history.undo(project);
 assert.equal(project.markers.length,1);
 history.redo(project);
 assert.equal(project.markers.length,2);
 history.undo(project);
 history.edit(project,()=>changeMarker(project,1,{label:'A2'}));
 assert.equal(history.redoable,false);
 history.clear();
 assert.equal(history.undoable,false);
});
test('GM/private marker is absent from player export and room crop',()=>{
 const log=[],context={
  save(){},restore(){},setTransform(){},beginPath(){},arc(){},fill(){},stroke(){},
  fillText(text){log.push(text)},fillRect(){},measureText(text){return {width:text.length*7}}
 };
 const canvas={width:400,height:300,getContext:()=>context};
 const markers=[{id:1,x:1,y:1,kind:'note',label:'SECRET',player:false},
  {id:2,x:4,y:2,kind:'loot',label:'OPEN',player:true}];
 drawMarkerOverlay(canvas,map,40,markers,{role:'player'});
 assert.ok(log.includes('OPEN'));
 assert.ok(!log.includes('SECRET'));
 log.length=0;
 drawMarkerOverlay(canvas,map,40,markers,{role:'gm',
  region:{x:0,y:0,W:3,H:3,visible:new Set([9])}});
 assert.ok(log.includes('SECRET'));
 assert.ok(!log.includes('OPEN'));
});
test('marker cap and unique IDs prevent unbounded project input',()=>{
 const markers=Array.from({length:MARKER_LIMIT},(_,i)=>({
  id:i+1,x:1,y:1,kind:'note',label:'x',player:false
 }));
 const project={markers};
 assert.throws(()=>addMarker(project,map,{x:1,y:1}),/limit/);
 assert.equal(normalizeMarkers([...markers,...markers]).length,MARKER_LIMIT);
});
