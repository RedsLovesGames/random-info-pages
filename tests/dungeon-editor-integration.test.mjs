import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeBattlemap} from '../dungeon-forge/battlemap-core.mjs';
import {FLOOR} from '../dungeon-forge/generator.mjs';
import {createProject,decodeProject,makeProjectAdventure} from '../dungeon-forge/dungeon-project.mjs';
import {addMarker,MARKER_KINDS} from '../dungeon-forge/battlemap-markers.mjs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('v1 dungeon saves round-trip map annotations without changing old formats',()=>{
 const settings={seed:1337,roomCount:8,loopPercent:15,decorPercent:60,theme:'ancient'};
 const map=makeBattlemap(settings);
 const project=createProject(settings,{size:4,level:3,difficulty:'moderate'});
 assert.deepEqual(project.markers,[]);
 const first=map.grid.findIndex(tile=>tile===FLOOR);
 const x=first%map.W,y=Math.floor(first/map.W);
 addMarker(project,map,{x,y,kind:'clue',label:'Secret GM clue',player:false});
 addMarker(project,map,{x,y,kind:'loot',label:'Visible treasure',player:true});
 const restored=decodeProject(JSON.stringify(project));
 assert.equal(restored.version,1);
 assert.equal(restored.markers.length,2);
 assert.equal(restored.markers[0].label,'Secret GM clue');
 assert.equal(restored.markers[0].player,false);
 assert.equal(restored.markers[1].player,true);
 assert.equal(makeProjectAdventure(map,restored).rooms.length,8);
 const old=JSON.parse(JSON.stringify(project));delete old.markers;
 assert.deepEqual(decodeProject(JSON.stringify(old)).markers,[]);
});
test('project import strips hostile coordinates and caps marker collection',()=>{
 const project=createProject({seed:1337,roomCount:8});
 project.markers=[{id:1,x:1,y:1,kind:'clue',label:'safe',player:true},
 {id:2,x:-999,y:1,kind:'loot',label:'invalid',player:true},
 {id:3,x:2,y:3,kind:'unknown',label:'X\nY',player:'true'},
 {id:1,x:10,y:10,kind:'danger',label:'duplicate'}];
 const restored=decodeProject(JSON.stringify(project));
 assert.equal(restored.markers.length,2);
 assert.equal(restored.markers[1].kind,'note');
 assert.equal(restored.markers[1].player,false);
 assert.equal(restored.markers[1].label,'X Y');
});
test('Dungeon Forge exposes marker controls, undo/redo and player-safe PNG/VTT paths',()=>{
 const html=read('dungeon-forge/index.html'),app=read('dungeon-forge/battlemap.mjs');
 for(const id of ['battlemapMarkerDetails','battlemapMarkerAdd','battlemapMarkerKind','battlemapMarkerLabel',
   'battlemapMarkerPlayer','battlemapMarkerApply','battlemapMarkerMove','battlemapMarkerDelete',
   'battlemapMarkerUndo','battlemapMarkerRedo','battlemapMarkerList'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(app,/drawMarkerOverlay\(output,plan,pixels,project\.markers,\{region,role:isGm\?'gm':'player'\}\)/);
 assert.match(app,/drawMarkerOverlay\(sceneCanvas,plan,pixels,project\.markers,\{role:'player'\}\)/);
 assert.match(app,/markerHistory\.edit\(project,action\)/);
 assert.match(app,/function makeRoomKeyText\(plan\)/);
 assert.match(app,/CUSTOM MAP MARKERS/);
});
test('ZIP button creates one package with a project, VTT scene, two maps and GM notes',()=>{
 const html=read('dungeon-forge/index.html'),app=read('dungeon-forge/battlemap.mjs');
 assert.match(html,/data-battlemap-export="package"/);
 assert.match(app,/async function packageSession\(plan,basename\)/);
 assert.match(app,/createZip\(files\)/);
 for(const name of ['-player-','-gm-','-owlbear.dd2vtt','-gm-room-key.txt','-editable.dungeon-forge.json','README-GM.txt'])
  assert.ok(app.includes(name),name);
 assert.match(html,/do not share the full ZIP with players/i);
});
test('Marble Sequencer exposes quantization and Euclidean controls and standard MIDI export',()=>{
 const html=read('marble-sequencer/index.html'),app=read('marble-sequencer/app.mjs');
 for(const id of ['quantize-controls','convert-bpm','convert-to-pattern','rotate-left','rotate-right',
   'euclid-lane','euclid-pulses','euclid-rotation','euclid-fill'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(app,/patternFromEvents\(player\.song,\{bpm,startTime\}\)/);
 assert.match(app,/if\(!mapped\)throw new Error/);
 assert.match(app,/rotateRows\(pattern\.rows,shift\)/);
 assert.match(app,/euclideanRhythm\(pulses,rotation\)/);
 assert.match(app,/exportPatternMidi\(pattern\)/);
});
test('Compare Lab exposes coordinated transport and both simulation adapters implement it',()=>{
 const html=read('compare/index.html'),app=read('compare/app.mjs');
 const fluid=read('fluid-dynamics/app.mjs'),marble=read('marble-sequencer/app.mjs');
 for(const id of ['play-both','pause-both','reset-both','transport-help'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(app,/typeof .*?RIPStudio\?\.transport==='function'/);
 assert.match(app,/Promise\.all\(\['left','right'\]/);
 assert.match(fluid,/transport\(action\)/);
 assert.match(marble,/async transport\(action\)/);
 assert.match(html,/does not synchronize audio or simulation clocks precisely/);
});
