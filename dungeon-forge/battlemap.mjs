import { makeBattlemap, pixelsPerSquare, pngExportSpec, roomExportRegion, universalVtt } from './battlemap-core.mjs';
import { drawBattlemap } from './battlemap-render.mjs';
import {MARKER_KINDS,createMarkerHistory,addMarker,moveMarker,changeMarker,deleteMarker,
  drawMarkerOverlay,findMarker,markerText} from './battlemap-markers.mjs';
import { encounterBudget, formatRoom, normalizeParty } from './adventure.mjs';
import { srdAttribution } from './adventure-monsters.mjs';
import { createProject, decodeProject, makeProjectAdventure, moveMonster, nextRoomState, projectRoomAt,
  rerollProjectAll, rerollProjectRoom, rerollProjectSingle, toggleCover, toggleProjectLock } from './dungeon-project.mjs';
import { createRoomHistory } from './dungeon-room-history.mjs';
import {createZip} from './session-zip.mjs';
import { sessionPlans } from './dungeon-routes.mjs';
import { labeledList, roomPanel, textElement } from './dungeon-room-panel.mjs';

const byId = id => document.getElementById(id);
const dialog = byId('battlemap');
const map = byId('battlemapCanvas');
const title = byId('battlemapTitle');
const stats = byId('battlemapStats');
const status = byId('battlemapStatus');
const editorStatus = byId('battlemapEditorStatus');
const roomList = byId('battlemapRooms');
const roomSelect = byId('battlemapRoomSelect');
const undo = byId('battlemapUndoRoom');
const roomPngSize = byId('battlemapRoomPngSize');
const markerList=byId('battlemapMarkerList');
const markerStatus=byId('battlemapMarkerStatus');
const markerKind=byId('battlemapMarkerKind');
const markerLabel=byId('battlemapMarkerLabel');
const markerPlayer=byId('battlemapMarkerPlayer');
const markerUndo=byId('battlemapMarkerUndo');
const markerRedo=byId('battlemapMarkerRedo');
const overview = byId('battlemapAdventure');
const form = byId('battlemapParty');
const budget = byId('battlemapBudget');
const reroll = byId('battlemapReroll');
const prepare = byId('battlemapPrepare');
const run = byId('battlemapRun');
const grid = byId('battlemapGrid');
const numbers = byId('battlemapNumbers');
const doors = byId('battlemapDoors');
const lights = byId('battlemapLights');
const entranceLight = byId('battlemapEntranceLight');
const quality = byId('battlemapPngQuality');
const projectFile = byId('battlemapProjectFile');
const roomCount = byId('rooms');
const zoom = byId('battlemapZoom');
const exports = [...dialog.querySelectorAll('[data-battlemap-export]')];
const partyKey = 'rip-dungeon-party-v1';
const projectHistories = new Map();

let dungeon;
let adventure;
let project;
let planKey;
let selected;
let placement;
let editorOpen = false;
let running = false;
let exporting = false;
let history;
let currentRegion;
let markerHistory=createMarkerHistory();
let selectedMarker=null,markerMode=null;

function readRecord(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  } catch { /* Local storage can be unavailable. */ }
  return {};
}

function saveRecord(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch { editorStatus.textContent = 'This browser cannot save changes. Download a project file to keep your work.'; }
}

function saveProject() {
  saveRecord(planKey + ':project', project);
}
function markerMessage(message,error=false){
  markerStatus.textContent=message;
  markerStatus.dataset.error=String(error);
}
function renderMarkers(){
  const entries=project?.markers||[];
  if(!entries.some(entry=>entry.id===selectedMarker))selectedMarker=null;
  const active=entries.find(entry=>entry.id===selectedMarker);
  markerList.replaceChildren(...entries.map(entry=>{
    const button=document.createElement('button');
    button.type='button';button.dataset.markerId=String(entry.id);
    button.setAttribute('aria-pressed',String(entry.id===selectedMarker));
    const name=document.createElement('span');
    name.textContent=(MARKER_KINDS[entry.kind]?.name||'Note')+' · '+(entry.label||'Unlabeled');
    const detail=document.createElement('small');
    detail.textContent=entry.player?'Player':'GM only';
    button.append(name,detail);
    button.addEventListener('click',()=>{
      selectedMarker=entry.id;markerMode=null;
      markerKind.value=entry.kind;
      markerLabel.value=entry.label;
      markerPlayer.checked=entry.player;
      markerMessage('Selected marker at column '+(entry.x+1)+', row '+(entry.y+1)+'.');
      renderMarkers();refreshPreview();
    });
    return button;
  }));
  if(!entries.length){
    const note=document.createElement('p');
    note.className='battlemap-fog-note';note.textContent='No annotations on this map yet.';
    markerList.append(note);
  }
  for(const name of ['battlemapMarkerMove','battlemapMarkerApply','battlemapMarkerDelete'])
    byId(name).disabled=!active;
  byId('battlemapMarkerAdd').disabled=!dungeon;
  markerUndo.disabled=!markerHistory.undoable;
  markerRedo.disabled=!markerHistory.redoable;
}
function afterMarkerEdit(message){
  markerMode=null;
  saveProject();renderMarkers();refreshPreview();
  markerMessage(message);
}
function editMarker(action,successMessage){
  if(!project||!dungeon)return;
  try{
    markerHistory.edit(project,action);
    afterMarkerEdit(successMessage);
  }catch(error){markerMessage(error.message||'The marker could not be changed.',true)}
}


function getSettings() {
  return {
    seed: byId('seed').value,
    roomCount: roomCount.value,
    loopPercent: byId('loops').value,
    decorPercent: byId('decor').value,
    theme: document.querySelector('#chips .on')?.dataset.t
  };
}

function syncSettings(settings) {
  byId('seed').value = settings.seed;
  roomCount.value = settings.roomCount;
  byId('loops').value = settings.loopPercent;
  byId('decor').value = settings.decorPercent;
  byId('vRooms').textContent = roomCount.value;
  byId('vLoops').textContent = settings.loopPercent + '%';
  byId('vDecor').textContent = settings.decorPercent + '%';
  document.querySelector('#chips [data-t="' + settings.theme + '"]')?.click();
}

function sessionOutline(minutes) {
  const time = sessionPlans[minutes]?.time;
  if (!time) return [];
  return ['Hook and approach', 'Exploration and clues', 'Fights and finale', 'Breathers and buffer']
    .map((label, index) => [label, time[index] + ' min']);
}

function syncParty() {
  const options = { ...project.party, minutes: project.minutes };
  for (const [key, value] of Object.entries(options)) form.elements.namedItem(key).value = value;
}

function sessionDoorStates() {
  const result = { ...adventure.kinds };
  if (running) for (const [index, open] of Object.entries(project.session.doors)) {
    result[index] = open ? 'open' : adventure.kinds[index] === 'open' ? 'closed' : adventure.kinds[index] ?? 'closed';
  }
  return result;
}

function refreshPreview() {
  if (!dungeon || !adventure) return;
  const pixels = Math.min(22, pixelsPerSquare(dungeon));
  map.style.setProperty('--battlemap-aspect', dungeon.W / dungeon.H);
  map.style.setProperty('--battlemap-detail-width', (dungeon.W * 17) + 'px');
  drawBattlemap(map, dungeon, pixels, { grid: grid.checked, numbers: numbers.checked, doors: doors.checked,
    adventure, furnishings: adventure.furnishings, doorStates: sessionDoorStates(), selected });
  drawMarkerOverlay(map,dungeon,pixels,project?.markers,{role:'gm',selected:selectedMarker});
}

function renderOverview() {
  const { name, hook, objective, complication, reward, rooms, keyed } = adventure;
  overview.replaceChildren(textElement('h4', name), labeledList([
    ['Hook', hook], ['Objective', objective], ['Complication', complication], ['Quest reward', reward + ' GP']
  ]));
  const counts = [
    [rooms.filter(room => room.encounter).length, 'encounter'],
    [rooms.filter(room => room.trap).length, 'trap'],
    [rooms.filter(room => room.treasure).length, 'treasure room']
  ];
  overview.append(textElement('p', counts.map(([count, label]) => count + ' ' + label + (count === 1 ? '' : 's')).join(' · '), 'battlemap-room-counts'));
  if (project.minutes) overview.append(textElement('h4', project.minutes + '-minute session plan'),
    labeledList(sessionOutline(project.minutes)));
  if (keyed.keys.length) {
    const message = keyed.bossReachable
      ? keyed.keys.length + ' door ' + (keyed.keys.length === 1 ? 'key or clue is' : 'keys or clues are') + ' reachable from the entrance.'
      : 'Check the route to the final room. It remains disconnected after opening the keyed doors.';
    overview.append(textElement('p', message));
  }
}

function updateUndo() {
  undo.disabled = running || !history?.length;
}

function recordRoomEdit(id, label, action, options) {
  const result = history.edit(project, id, label, action, options);
  updateUndo();
  return result;
}

function undoRoomEdit() {
  if (undo.disabled) return;
  const edit = history.undo(project);
  updateUndo();
  if (!edit) return;
  selected = edit.roomId;
  editorOpen = true;
  editorStatus.textContent = 'Undid ' + edit.label + '.';
  saveProject();
  refreshAdventure();
  if (undo.disabled) roomSelect.focus({ preventScroll: true });
}

function placeAt(x, y) {
  if (!placement) return;
  const accepted = recordRoomEdit(selected, placement.cover ? 'cover placement' : 'monster move', () =>
    placement.cover ? toggleCover(project, dungeon, selected, x, y)
      : moveMonster(project, dungeon, selected, placement.group, placement.index, x, y));

  if (!accepted) {
    editorStatus.textContent = 'Choose a clear square in this room. Large monsters also need their full footprint.';
    return;
  }
  editorStatus.textContent = placement.cover ? 'Cover updated.' : 'Starting space updated and encounter locked.';
  placement = undefined;
  saveProject();
  refreshAdventure();
}

function renderSelected() {
  const room = adventure?.rooms.find(entry => entry.id === selected);
  if (!room) return;
  const id = room.id;
  const state = running ? nextRoomState(project, id) : project.session.rooms[id];
  const afterEdit = () => { saveProject(); refreshAdventure(); };
  const actions = {
    editorOpen,
    keepEditorOpen: value => { editorOpen = value; },
    text(field, value) {
      recordRoomEdit(id, field === 'name' ? 'room title edit' : 'read-aloud edit', () => {
        const entry = project.text[id] ??= {};
        entry[field] = value.trim();
      });
      saveProject();
      const updated = makeProjectAdventure(dungeon, project).rooms.find(item => item.id === id);
      room[field] = updated[field];
      if (field === 'name') {
        roomList.querySelector('h4').textContent = String(room.number).padStart(2, '0') + ' · ' + room.name;
        roomSelect.selectedOptions[0].textContent = room.number + ' · ' + room.name;
      }
    },
    note(value) {
      const saveNote = () => { project.notes[id] = value; };
      if (running) saveNote();
      else recordRoomEdit(id, 'GM note edit', saveNote, { coalesce: true });
      saveProject();
    },
    furnishing(value) {
      const accepted = recordRoomEdit(id, 'furnishing change', () => {
        const previous = project.style[id];
        project.style[id] = value;
        const changed = makeProjectAdventure(dungeon, project).rooms.find(item => item.id === id);
        if (!changed.placementConflict) return true;
        if (previous === undefined) delete project.style[id];
        else project.style[id] = previous;
        return false;
      });
      if (!accepted) {
        editorStatus.textContent = 'These furnishings overlap a saved monster. Move it to a clear square first.';
        renderSelected();
        return;
      }
      editorStatus.textContent = 'Furnishings updated.';
      afterEdit();
    },
    roll(field, remove) {
      if (recordRoomEdit(id, field + (remove ? ' removal' : ' reroll'), () =>
        rerollProjectRoom(project, dungeon, id, field, remove))) {
        editorStatus.textContent = remove ? 'Removed ' + field + '.' : 'Updated ' + field + '.';
        afterEdit();
      } else {
        editorStatus.textContent = 'No valid ' + field + ' fits the current room and party settings.';
      }
    },
    rerollRoom() {
      recordRoomEdit(id, 'room reroll', () => rerollProjectSingle(project, id));
      editorStatus.textContent = 'Room rerolled. Locked contents and notes were kept.';
      afterEdit();
    },
    lock(field) {
      recordRoomEdit(id, field + ' lock change', () => toggleProjectLock(project, dungeon, id, field));
      editorStatus.textContent = project.changes[id][field].locked ? 'Locked ' + field + '.' : 'Unlocked ' + field + '.';
      afterEdit();
    },
    doorKind(index) { return adventure.kinds[index] ?? 'closed'; },
    doorLabel(index) {
      const point = dungeon.doors[index].position;
      const dx = point.x - (room.x + .5), dy = point.y - (room.y + .5);
      const side = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'west' : 'east') : (dy < 0 ? 'north' : 'south');
      return 'Door ' + (index + 1) + ' · ' + side;
    },
    door(index, value) {
      recordRoomEdit(id, 'door change', () => {
        project.doors[index] = value;
        delete project.session.doors[index];
      }, { door: index });
      afterEdit();
    },
    beginPlacement(settings) {
      placement = settings;
      editorStatus.textContent = 'Click a square on the map or enter its column and row.';
      renderSelected();
      roomList.querySelector('.battlemap-position input')?.focus({ preventScroll: true });
    },
    cancelPlacement() {
      placement = undefined;
      editorStatus.textContent = 'Placement cancelled.';
      renderSelected();
    },
    place: placeAt,
    go(number) { selectRoom(adventure.rooms.find(entry => entry.number === number)?.id); },
    flag(field, value) {
      state[field] = value;
      saveProject();
    },
    hp(key, value) {
      state.hp[key] = value;
      saveProject();
    },
    sessionDoor(index, value) {
      project.session.doors[index] = value;
      saveProject();
      refreshPreview();
    }
  };
  roomList.replaceChildren(roomPanel({ room, project, running, state, placement, actions }));
}

function selectRoom(id) {
  if (!adventure?.rooms.some(room => room.id === id)) return;
  selected = id;
  roomSelect.value = id;
  placement = undefined;
  if (running) {
    project.session.roomId = id;
    nextRoomState(project, id).visited = true;
    saveProject();
  }
  currentRegion = roomExportRegion(dungeon, selected);
  if (currentRegion) {
    const spec = pngExportSpec(currentRegion, 100, '');
    roomPngSize.textContent = currentRegion.W + ' × ' + currentRegion.H + ' grid · ' + spec.pixels + ' px/square';
  } else roomPngSize.textContent = '';
  renderSelected();
  refreshPreview();
}

function refreshAdventure() {
  if (!dungeon) return;
  adventure = makeProjectAdventure(dungeon, project);
  roomSelect.replaceChildren(...adventure.rooms.map(room => {
    const visited = running && project.session.rooms[room.id]?.visited;
    return new Option(room.number + ' · ' + room.name + (visited ? ' · visited' : ''), room.id);
  }));
  renderOverview();
  budget.textContent = '2024 D&D · Up to ' + encounterBudget(project.party).toLocaleString() + ' XP per encounter';
  selectRoom(adventure.rooms.some(room => room.id === selected) ? selected : dungeon.entrance);
}

function setRunning(value) {
  running = value;
  placement = undefined;
  prepare.setAttribute('aria-pressed', String(!value));
  run.setAttribute('aria-pressed', String(value));
  byId('battlemapKeyHeading').textContent = value ? 'Run session' : 'Room editor';
  form.hidden = value;
  reroll.hidden = value;
  undo.hidden = value;
  updateUndo();
  editorStatus.textContent = value ? 'Pick a room or follow an exit. Session progress is saved as you play.'
    : 'Click a room on the map or pick it from the list.';
  if (project && value) selected = project.session.roomId ?? selected;
  refreshAdventure();
}

function renderPngSize() {
  if (!dungeon) return;
  const spec = pngExportSpec(dungeon, quality.value, '');
  byId('battlemapPngSize').textContent = dungeon.W + ' × ' + dungeon.H + ' grid · ' +
    spec.width.toLocaleString() + ' × ' + spec.height.toLocaleString() + ' pixels · ' + spec.pixels + ' px/square';
}

function loadPlan(imported) {
  const settings = imported?.settings ?? getSettings();
  const plan = makeBattlemap(settings);
  const { seed, themeKey, roomCount, loopChance, decorDensity } = plan.params;
  const key = ['rip-dungeon-notes-v1', seed, roomCount, themeKey, loopChance, decorDensity].join(':');
  let next = imported;
  if (!next) {
    const stored = readRecord(key + ':project');
    if (stored.format) next = decodeProject(JSON.stringify(stored));
  }
  if (!next) {
    const defaults = readRecord(partyKey);
    next = createProject(settings, defaults);
    next.minutes = sessionPlans[defaults.minutes] ? defaults.minutes : 0;
    next.notes = { ...readRecord(key), ...readRecord(key + ':notes') };
    const legacy = readRecord(key + ':revision');
    next.revision = legacy.all >>> 0;
    next.roomRevisions = legacy.rooms && typeof legacy.rooms === 'object' ? legacy.rooms : {};
  }
  dungeon = plan;
  project = next;
  planKey = key;
  markerHistory=createMarkerHistory();
  selectedMarker=null;markerMode=null;
  renderMarkers();
  markerMessage('Place markers on walkable squares. Player visibility is opt-in.');
  if (imported || !projectHistories.has(key)) projectHistories.set(key, createRoomHistory());
  history = projectHistories.get(key);
  selected = project.session.roomId ?? dungeon.entrance;
  editorOpen = false;
  title.textContent = dungeon.name;
  stats.textContent = dungeon.rooms.length + ' rooms · ' + dungeon.W + ' × ' + dungeon.H + ' squares · 5 ft per square · Seed ' + seed;
  status.textContent = '';
  syncParty();
  renderPngSize();
  setRunning(false);
  map.hidden = false;
  for (const button of [...exports, reroll, prepare, run]) button.disabled = false;
}

function loadActiveLayout() {
  try { loadPlan(); }
  catch (error) {
    dungeon = adventure = project = history = currentRegion = undefined;
    updateUndo();
    roomPngSize.textContent = '';
    title.textContent = 'Battlemap';
    stats.textContent = '';
    roomList.replaceChildren();
    roomSelect.replaceChildren();
    overview.replaceChildren();
    budget.textContent = '';
    byId('battlemapPngSize').textContent = '';
    map.hidden = true;
    selectedMarker=null;markerMode=null;
    markerHistory=createMarkerHistory();
    renderMarkers();
    editorStatus.textContent = error.message;
    for (const button of [...exports, reroll, prepare, run]) button.disabled = true;
  }
}

function download(name, blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

function makeRoomKeyText(plan) {
  const { name, party, hook, objective, complication, reward, rooms } = adventure;
  const header = [
    name + ' · ' + plan.name,
    'GM ROOM KEY',
    'Seed ' + plan.params.seed + ' · ' + plan.params.themeKey + ' · ' + plan.rooms.length + ' rooms',
    party.size + ' characters at level ' + party.level + ' · 2024 D&D · ' + encounterBudget(party).toLocaleString() + ' XP cap per encounter',
    'Use the numbered GM map. Room 1 is the entrance. Each square is 5 ft. Red outlines mark monster starting spaces.',
    'Hook: ' + hook, 'Objective: ' + objective, 'Complication: ' + complication, 'Quest reward: ' + reward + ' GP'
  ];
  if (project.minutes) {
    header.push(project.minutes + '-minute session target.');
    for (const [label, duration] of sessionOutline(project.minutes)) header.push(label + ' · ' + duration);
  }
  const entries = rooms.map(room => {
    const formatted = formatRoom(room, typeof project.notes[room.id] === 'string' ? project.notes[room.id] : '');
    const doorText = room.doors.map(index => 'Door ' + (index + 1) + ' · ' + (adventure.kinds[index] ?? 'closed')).join('\n');
    return doorText ? formatted + '\n' + doorText : formatted;
  });
  const markers=project.markers?.length?
    ['CUSTOM MAP MARKERS',...project.markers.map(markerText)].join('\n'):'';
  const text = [header.join('\n'), ...entries,markers,srdAttribution].filter(Boolean).join('\n\n') + '\n';
  return text;
}
function downloadKey(plan,basename){
  download(basename+'-gm-room-key.txt',new Blob([makeRoomKeyText(plan)],{type:'text/plain;charset=utf-8'}));
}
async function packageSession(plan,basename){
  exporting=true;
  status.textContent='Preparing player and GM maps…';
  const spec=pngExportSpec(plan,quality.value,basename);
  async function makePNG(role){
    const c=document.createElement('canvas');
    try{
      drawBattlemap(c,plan,spec.pixels,{
        grid:grid.checked,numbers:role==='gm',doors:doors.checked,
        adventure:role==='gm'?adventure:undefined,
        furnishings:adventure.furnishings,doorStates:adventure.kinds
      });
      drawMarkerOverlay(c,plan,spec.pixels,project.markers,{role});
      return await new Promise((resolve,reject)=>c.toBlob(
        result=>result?resolve(result):reject(new Error('PNG encoding failed')),'image/png'));
    }finally{c.width=c.height=1}
  }
  try{
    const player=await makePNG('player');
    const gm=await makePNG('gm');
    status.textContent='Preparing Owlbear VTT scene and GM notes…';
    const sceneCanvas=document.createElement('canvas');
    let image;
    try{
      const pixels=pixelsPerSquare(plan);
      drawBattlemap(sceneCanvas,plan,pixels,{
        grid:false,numbers:false,doors:false,
        furnishings:adventure.furnishings,doorStates:adventure.kinds
      });
      drawMarkerOverlay(sceneCanvas,plan,pixels,project.markers,{role:'player'});
      image=sceneCanvas.toDataURL('image/png').split(',')[1];
      if(!image)throw new Error('The Owlbear scene image could not be encoded.');
    }finally{sceneCanvas.width=sceneCanvas.height=1}
    const scene=universalVtt(plan,{
      pixels:pixelsPerSquare(plan),image,
      doors:doors.checked,lights:lights.checked,entranceLight:entranceLight.checked
    });
    const gridName=plan.W+'x'+plan.H;
    const files=[
      {name:basename+'-player-'+gridName+'.png',data:player},
      {name:basename+'-gm-'+gridName+'.png',data:gm},
      {name:basename+'-owlbear.dd2vtt',data:JSON.stringify(scene)},
      {name:basename+'-gm-room-key.txt',data:makeRoomKeyText(plan)},
      {name:basename+'-editable.dungeon-forge.json',data:JSON.stringify(project,null,2)},
      {name:'README-GM.txt',data:
        'DUNGEON FORGE SESSION PACK\n\n'+
        'PLAYER FILE: The player PNG excludes GM-only markers, encounter outlines, and numbered room labels.\n'+
        'GM FILES: The GM PNG, room key, and editable JSON may include spoilers, trap information, and secret markers.\n'+
        'OWLBEAR: Import the .dd2vtt file through an importer that supports Universal VTT. Scene walls and door information depend on the importing extension.\n'+
        'GRIDS: This dungeon is '+gridName+' squares, 5 feet per square.\n'+
        'MARKERS: Only markers explicitly set to player-visible appear on player maps and the .dd2vtt image.\n'}
    ];
    status.textContent='Packaging '+files.length+' session files…';
    const archive=await createZip(files);
    download(basename+'-gm-session-pack.zip',archive);
    status.textContent='GM session package saved · '+(archive.size/1024/1024).toFixed(1)+' MB. Share only the player files with players.';
  }catch(error){
    status.textContent='Could not package this session: '+(error.message||String(error));
  }finally{exporting=false}
}
async function downloadMap(format) {
  if (!dungeon || exporting) return;
  const plan = dungeon;
  const basename = plan.name.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '-') + '-' + plan.params.seed;
  if (format === 'project') {
    download(basename + '.dungeon-forge.json', new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' }));
    editorStatus.textContent = 'Project downloaded with GM content and session progress.';
    return;
  }
  if (format === 'key') {
    downloadKey(plan, basename);
    return;
  }
  if (format === 'package') {
    await packageSession(plan,basename);
    return;
  }

  const isRoom = format.startsWith('room-');
  const region = isRoom ? currentRegion : undefined;
  if (isRoom && !region) return;
  const isGm = format === 'gm' || format === 'room-gm';
  const roomNumber = isRoom ? adventure.rooms.find(room => room.id === region.roomId).number : undefined;
  const imageName = basename + (isRoom ? '-room-' + String(roomNumber).padStart(2, '0') : '') +
    (isGm ? '-gm' : '-player');
  const exportStatus = isRoom ? editorStatus : status;
  exporting = true;
  exportStatus.textContent = 'Preparing the export…';
  const output = document.createElement('canvas');
  try {
    const png = pngExportSpec(region ?? plan, isRoom ? 100 : quality.value, imageName);
    const pixels = format === 'vtt' ? pixelsPerSquare(plan) : png.pixels;
    drawBattlemap(output, plan, pixels, {
      grid: format === 'vtt' ? false : grid.checked, numbers: isGm, doors: format !== 'vtt' && doors.checked,
      adventure: isGm ? adventure : undefined, furnishings: adventure.furnishings, doorStates: adventure.kinds, region
    });
    drawMarkerOverlay(output,plan,pixels,project.markers,{region,role:isGm?'gm':'player'});
    if (format === 'vtt') {
      const image = output.toDataURL('image/png').split(',')[1];
      if (!image) throw new Error('This browser could not encode the map image.');
      const vtt = universalVtt(plan, { pixels, image, doors: doors.checked, lights: lights.checked, entranceLight: entranceLight.checked });
      download(basename + '.dd2vtt', new Blob([JSON.stringify(vtt)], { type: 'application/json' }));
    } else {
      const blob = await new Promise(resolve => output.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('This browser could not encode the map image. Try compact PNG quality.');
      download(png.name, blob);
    }
    exportStatus.textContent = 'Download ready.';
  } catch (error) {
    exportStatus.textContent = error.message;
  } finally {
    output.width = output.height = 1;
    exporting = false;
  }
}

byId('openBattlemap').addEventListener('click', () => {
  dialog.showModal();
  loadActiveLayout();
});
byId('battlemapClose').addEventListener('click', () => dialog.close());
function openLayoutWithRooms(count) {
  roomCount.value = String(count);
  byId('vRooms').textContent = roomCount.value;
  roomCount.dispatchEvent(new Event('input', { bubbles: true }));
  loadActiveLayout();
}

byId('battlemapQuick').addEventListener('click', () => openLayoutWithRooms(8));
byId('battlemapFitLength').addEventListener('click', () => {
  if (!project || !form.reportValidity()) return;
  const settings = Object.fromEntries(new FormData(form));
  const minutes = Number(settings.minutes);
  const plan = sessionPlans[minutes];
  if (!plan) {
    editorStatus.textContent = 'Choose a timed session first.';
    return;
  }
  const party = normalizeParty(settings);
  openLayoutWithRooms(plan.rooms);
  if (project) applyPartySettings(party, minutes);
});
byId('battlemapOpenProject').addEventListener('click', () => projectFile.click());
byId('battlemapShowExports').addEventListener('click', () => byId('battlemapExportHeading').focus());
projectFile.addEventListener('change', async () => {
  const file = projectFile.files?.[0];
  projectFile.value = '';
  if (!file) return;
  try {
    if (file.size > 2_000_000) throw new Error('Choose a Dungeon Forge project no larger than 2 MB.');
    const imported = decodeProject(await file.text());
    loadPlan(imported);
    syncSettings(imported.settings);
    saveProject();
    editorStatus.textContent = 'Project restored. Choose Run session to resume saved progress.';
  } catch (error) {
    editorStatus.textContent = error.message;
  }
});
function applyPartySettings(party, minutes) {
  if (JSON.stringify(project.party) !== JSON.stringify(party) || project.minutes !== minutes) {
    history.clear();
    updateUndo();
    for (const [id, state] of Object.entries(project.session.rooms)) {
      if (!project.changes[id]?.encounter?.locked) state.hp = {};
    }
  }
  project.party = party;
  project.minutes = minutes;
  saveRecord(partyKey, { ...party, minutes });
  saveProject();
  syncParty();
  editorStatus.textContent = 'Adventure updated for this party and session length.';
  refreshAdventure();
}

form.addEventListener('submit', event => {
  event.preventDefault();
  if (!project) return;
  const settings = Object.fromEntries(new FormData(form));
  applyPartySettings(normalizeParty(settings), Number(settings.minutes));
});
reroll.addEventListener('click', () => {
  rerollProjectAll(project);
  history.clear();
  updateUndo();
  saveProject();
  editorStatus.textContent = 'Adventure rerolled. Locked contents and GM notes were kept.';
  refreshAdventure();
});
undo.addEventListener('click', undoRoomEdit);
prepare.addEventListener('click', () => setRunning(false));
run.addEventListener('click', () => setRunning(true));
roomSelect.addEventListener('change', () => selectRoom(Number(roomSelect.value)));
map.addEventListener('click', event => {
  if (!dungeon) return;
  const rect = map.getBoundingClientRect();
  const x = Math.floor((event.clientX - rect.left) * dungeon.W / rect.width);
  const y = Math.floor((event.clientY - rect.top) * dungeon.H / rect.height);
  if(markerMode==='place'){
    editMarker(()=>{
      const placed=addMarker(project,dungeon,{x,y,kind:markerKind.value,
        label:markerLabel.value,player:markerPlayer.checked});
      selectedMarker=placed.id;
    },'Marker placed at column '+(x+1)+', row '+(y+1)+'.');
    return;
  }
  if(markerMode==='move'){
    editMarker(()=>moveMarker(project,dungeon,selectedMarker,x,y),
      'Marker moved to column '+(x+1)+', row '+(y+1)+'.');
    return;
  }
  if (placement) { placeAt(x, y); return; }
  const hovered=findMarker(project,x,y);
  if(hovered){
    selectedMarker=hovered.id;
    markerKind.value=hovered.kind;markerLabel.value=hovered.label;
    markerPlayer.checked=hovered.player;
    markerMessage('Selected '+(hovered.label||MARKER_KINDS[hovered.kind]?.name||'marker')+'.');
    renderMarkers();refreshPreview();return;
  }
  const id = projectRoomAt(dungeon, x, y);
  if (id !== undefined) {
    selectRoom(id);
    editorStatus.textContent = 'Room ' + adventure.rooms.find(room => room.id === id).number + ' selected.';
  }
});
zoom.addEventListener('click', () => {
  const detail = zoom.getAttribute('aria-pressed') === 'false';
  zoom.setAttribute('aria-pressed', String(detail));
  map.dataset.detail = String(detail);
});
byId('battlemapMarkerAdd').addEventListener('click',()=>{
  if(!dungeon)return;
  markerMode=markerMode==='place'?null:'place';
  placement=undefined;
  markerMessage(markerMode==='place'
    ?'Click a walkable square to place '+(MARKER_KINDS[markerKind.value]?.name||'marker')+
      '. Use Esc to cancel.':'Marker placement cancelled.');
});
byId('battlemapMarkerMove').addEventListener('click',()=>{
  if(selectedMarker===null)return;
  markerMode=markerMode==='move'?null:'move';
  placement=undefined;
  markerMessage(markerMode==='move'
    ?'Click a new walkable square to move the selected marker.':'Move cancelled.');
});
byId('battlemapMarkerApply').addEventListener('click',()=>{
  if(selectedMarker===null)return;
  editMarker(()=>changeMarker(project,selectedMarker,{
    kind:markerKind.value,label:markerLabel.value,player:markerPlayer.checked
  }),'Marker type, label and visibility saved.');
});
byId('battlemapMarkerDelete').addEventListener('click',()=>{
  if(selectedMarker===null)return;
  editMarker(()=>{
    deleteMarker(project,selectedMarker);selectedMarker=null;
  },'Marker deleted.');
});
markerUndo.addEventListener('click',()=>{
  if(!markerHistory.undo(project))return;
  selectedMarker=null;afterMarkerEdit('Undid marker edit.');
});
markerRedo.addEventListener('click',()=>{
  if(!markerHistory.redo(project))return;
  selectedMarker=null;afterMarkerEdit('Redid marker edit.');
});
quality.addEventListener('change', renderPngSize);
for (const checkbox of [grid, numbers, doors]) checkbox.addEventListener('change', refreshPreview);
dialog.addEventListener('click', event => {
  const button = event.target.closest('[data-battlemap-export]');
  if (button) downloadMap(button.dataset.battlemapExport);
});
// The underlying exhibit listens for single-letter shortcuts on window.
dialog.addEventListener('keydown', event => {
  if(event.key==='Escape'&&markerMode){
    event.preventDefault();event.stopPropagation();
    markerMode=null;markerMessage('Marker operation cancelled.');return;
  }
  if (!undo.disabled && (event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey &&
      event.key.toLowerCase() === 'z' && !event.target.closest('input, textarea, select, [contenteditable]')) {
    event.preventDefault();
    undoRoomEdit();
  }
  event.stopPropagation();
});

// Shared Project Studio adapter. Uses Dungeon Forge's existing validated
// project format and existing renderer, without exposing the GM notes in captures.
window.RIPStudio = {
  getState() {
    if (!project) throw new Error('Open Battlemap to generate a dungeon first.');
    return JSON.parse(JSON.stringify(project));
  },
  setState(state) {
    const imported = decodeProject(JSON.stringify(state));
    syncSettings(imported.settings);
    loadPlan(imported);
    saveProject();
    if (!dialog.open) dialog.showModal();
    editorStatus.textContent = 'Dungeon project restored through Project Studio.';
  },
  async capture() {
    if (!dungeon) throw new Error('Generate a dungeon before saving a map image.');
    const output = document.createElement('canvas');
    try {
      const spec = pngExportSpec(dungeon, quality.value, 'dungeon-forge');
      drawBattlemap(output, dungeon, spec.pixels, {
        grid:grid.checked, numbers:false, doors:doors.checked,
        furnishings:adventure.furnishings, doorStates:adventure.kinds
      });
      drawMarkerOverlay(output,dungeon,spec.pixels,project.markers,{role:'player'});
      return await new Promise((resolve,reject) => output.toBlob(
        value=>value?resolve(value):reject(new Error('Map PNG encoding failed')),'image/png'));
    } finally { output.width=output.height=1; }
  },
  setQuality(level) {
    quality.value=level==='eco'?'48':'70';
    renderPngSize();
  }
};
