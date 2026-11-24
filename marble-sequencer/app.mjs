import {LANES,buildPattern,encodePattern,decodePattern,noteName} from './music.mjs';
import { exportPatternMidi } from './export-midi.mjs';
import {createPianoRoll} from './piano-roll-ui.mjs';
import {createMidiRecoveryVault} from './midi-recovery-history.mjs';
import {buildMidiWorkspace,midiPlaybackSong,trackSummary,changeMidiTrack,changeMidiNote,
  exportMultitrackMidi,MIDI_WORKSPACE_FORMAT} from './midi-workspace.mjs';
import { rotateRows, euclideanRhythm, patternFromEvents } from './pattern-tools.mjs';
import { receiveMarbleAudio } from '../design-system/bridge.mjs';
import {makeMachine} from './machine.mjs';
import {importMusic} from './imports.mjs';
import {Playback} from './playback.mjs';

const byId = id => document.getElementById(id);
const view = Object.fromEntries([
  'marble-canvas','source-kind','track-title','hit-count','time-now','time-total','position','play','rewind',
  'loop','speed','volume','open-file','file-input','drop-zone','file-status','use-loop','builder','bpm','demo',
  'clear','share','sequencer','share-result','share-link','share-status','lane-choice','ramp-choice','pitch-choice','pitch-control',
].map(id => [id,byId(id)]));

const demoRows = [0x1411,0x1010,0x5555,0x0901,0x0040,0x2024,0x4120,0x8080];
const loopFromURL = decodePattern(new URLSearchParams(location.hash.slice(1)).get('loop') || '');
let pattern = loopFromURL || {bpm:104, rows:[...demoRows]};
let patternName = loopFromURL ? 'Shared loop' : 'Demo loop';
const history=[],future=[];
const snapshot=()=>({loop:encodePattern(pattern),name:patternName});
function remember(){
  const previous=snapshot();
  if(history.at(-1)?.loop!==previous.loop){history.push(previous);if(history.length>36)history.shift();}
  future.length=0;
  updateUndo();
}
function updateUndo(){
  byId('undo-loop').disabled=history.length===0;
  byId('redo-loop').disabled=future.length===0;
}
function restore(state){
  const next=decodePattern(state.loop);
  if(!next)throw new Error('The saved loop is invalid');
  pattern=next;
  patternName=typeof state.name==='string'?state.name.slice(0,80):'Restored loop';
  updatePattern({rename:false,keepPosition:false});
  updateUndo();
}
let pendingImport = null;
let midiWorkspace=null,midiTrack=0,midiNotePage=0,selectedMidiId=null,pianoRoll=null;
const midiPast=[],midiFuture=[];
const midiSnapshot=()=>structuredClone(midiWorkspace);
const midiDraftStore=createMidiRecoveryVault();
const newMidiSession=()=>('s'+(globalThis.crypto?.randomUUID?.()||
  Date.now().toString(36)+'_'+Math.random().toString(36).slice(2)).replaceAll('-',''));
let midiDraftSession=newMidiSession(),midiDraftTimer=null,midiDraftRevision=0;
function updateMidiRecovery(entries,preferredId){
 const banner=byId('midi-recovery'),select=byId('midi-revision');
 const previous=preferredId||select.value;
 select.replaceChildren(...entries.map(entry=>new Option(
  new Date(entry.updatedAt).toLocaleString()+' · '+entry.name+
   ' · '+entry.notes.toLocaleString()+' notes',entry.id)));
 select.value=entries.some(entry=>entry.id===previous)?previous:entries[0]?.id||'';
 banner.hidden=!entries.length;
 for(const id of ['midi-restore-draft','midi-export-draft','midi-discard-draft'])
  byId(id).disabled=!entries.length;
 byId('midi-recovery-details').textContent=entries.length?
  'Stored locally: '+entries.length+' of 8 recent versions. Select a snapshot to restore, download, or delete. Loading another MIDI file will not erase these versions.':
  'No saved MIDI recovery versions in this browser.';
}
async function offerMidiRecovery(preferredId){
 try{
  const entries=await midiDraftStore.list();
  updateMidiRecovery(entries,preferredId);
 }catch(error){
  const banner=byId('midi-recovery');
  banner.hidden=false;
  byId('midi-recovery-details').textContent='Cannot read browser recovery history: '+
   (error?.message||String(error))+
   '. Existing recovery data has not been deleted. Download JSON for any open project.';
  for(const id of ['midi-restore-draft','midi-export-draft','midi-discard-draft'])
   byId(id).disabled=true;
 }
}
function scheduleMidiDraftSave(immediate=false,checkpoint=false){
 if(!midiWorkspace)return;
 clearTimeout(midiDraftTimer);
 const draft=midiSnapshot(),revision=++midiDraftRevision,session=midiDraftSession;
 const indicator=byId('midi-autosave-status');
 indicator.textContent='Saving recovery version to this browser…';
 indicator.dataset.error='false';
 const fail=error=>{
  if(revision!==midiDraftRevision)return;
  indicator.dataset.error='true';
  indicator.textContent='Autosave failed: '+(error?.message||'Browser storage unavailable')+
   '. Download editable JSON now to avoid losing changes.';
 };
 const persist=()=>{
  midiDraftTimer=null;
  try{
   midiDraftStore.save(draft,{session,checkpoint}).then(saved=>{
    if(revision!==midiDraftRevision)return;
    indicator.dataset.error='false';
    indicator.textContent=(checkpoint?'Checkpoint':'Autosave')+' stored locally at '+
     new Date(saved.draft.updatedAt).toLocaleTimeString()+
     '. '+saved.versions+' recovery version(s) kept. Download editable JSON for an independent backup.';
    offerMidiRecovery(saved.revision);
   }).catch(fail);
  }catch(error){fail(error)}
 };
 if(immediate)persist();
 else midiDraftTimer=setTimeout(persist,350);
}
function restoreMidiWorkspace(next,message){
 pendingImport?.abort();pendingImport=null;
 midiWorkspace=buildMidiWorkspace(next);
 midiDraftSession=newMidiSession();
 midiPast.length=0;midiFuture.length=0;
 midiTrack=trackSummary(midiWorkspace.events)[0].track;
 midiNotePage=0;selectedMidiId=null;
 selectSong(midiPlaybackSong(midiWorkspace));
 scheduleMidiDraftSave(true);
 midiStatus(message);
}
function midiStatus(text,error=false){
  const output=byId('midi-editor-status');
  output.textContent=text;output.dataset.error=String(error);
}
function midiSaveHistory(){
  if(!midiWorkspace)return;
  midiPast.push(midiSnapshot());
  if(midiPast.length>32)midiPast.shift();
  midiFuture.length=0;
}
function midiDownload(data,name,type){
  const url=URL.createObjectURL(new Blob([data],{type}));
  const a=document.createElement('a');a.href=url;a.download=name;a.click();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
}
function currentMidiGroup(){
  return trackSummary(midiWorkspace?.events||[]).find(t=>t.track===midiTrack);
}
function renderMidiNotes(){
  const noteChoice=byId('midi-note');
  const indices=currentMidiGroup()?.indices||[];
  if(selectedMidiId){
    const selectedPosition=indices.findIndex(index=>midiWorkspace.events[index].id===selectedMidiId);
    if(selectedPosition>=0)midiNotePage=Math.floor(selectedPosition/30);
    else selectedMidiId=null;
  }
  const pages=Math.max(1,Math.ceil(indices.length/30));
  midiNotePage=Math.max(0,Math.min(midiNotePage,pages-1));
  const subset=indices.slice(midiNotePage*30,(midiNotePage+1)*30);
  noteChoice.replaceChildren();
  for(const index of subset){
    const e=midiWorkspace.events[index],option=new Option(
      noteName(e.note)+' · '+e.time.toFixed(2)+'s · ch '+(e.channel+1),index);
    noteChoice.add(option);
  }
  let selectedIndex=subset.find(index=>midiWorkspace.events[index].id===selectedMidiId);
  if(selectedIndex===undefined)selectedIndex=subset[0];
  const selected=midiWorkspace?.events[selectedIndex];
  selectedMidiId=selected?.id||null;
  if(selected)noteChoice.value=String(selectedIndex);
  byId('midi-prev-page').disabled=midiNotePage===0;
  byId('midi-next-page').disabled=midiNotePage>=pages-1;
  for(const [id,value] of [
    ['midi-note-pitch',selected?.note],['midi-note-time',selected?.time],
    ['midi-note-length',selected?.duration],
    ['midi-note-velocity',selected?Math.round(selected.velocity*100):null]
  ])byId(id).value=value===undefined||value===null?'':String(value);
  byId('midi-apply-note').disabled=!selected;
}
function renderMidiWorkspace(){
  const panel=byId('midi-workspace');
  panel.hidden=!midiWorkspace||player.song?.kind!=='midi';
  if(panel.hidden)return;
  const groups=trackSummary(midiWorkspace.events);
  byId('midi-track-count').textContent=groups.length+' tracks · '+midiWorkspace.events.length.toLocaleString()+' notes';
  if(!groups.some(g=>g.track===midiTrack)){midiTrack=groups[0].track;midiNotePage=0}
  const select=byId('midi-track');
  const existing=[...select.options].map(option=>Number(option.value));
  if(existing.length!==groups.length||existing.some((v,i)=>v!==groups[i].track)){
    select.replaceChildren(...groups.map(g=>new Option(
      'Track '+(g.track+1)+' · '+g.notes+' notes',g.track)));
  }
  select.value=String(midiTrack);
  byId('midi-mute').checked=midiWorkspace.muted.includes(midiTrack);
  byId('midi-undo').disabled=!midiPast.length;
  byId('midi-redo').disabled=!midiFuture.length;
  renderMidiNotes();
  pianoRoll?.render();
}
function refreshMidiPlayback(message){
  if(!midiWorkspace)return;
  const position=player.position;
  const wasPlaying=player.running;
  selectSong(midiPlaybackSong(midiWorkspace));
  player.offset=Math.min(position,player.song.duration);
  renderMidiWorkspace();
  pianoRoll?.render();
  if(wasPlaying)start();
  if(message)midiStatus(message);
}
function midiEdit(action,message){
  if(!midiWorkspace)return;
  try{
    const previous=midiSnapshot();
    const next=action();
    if(JSON.stringify(next)===JSON.stringify(previous))return;
    midiSaveHistory();
    midiWorkspace=next;
    refreshMidiPlayback(message);
    scheduleMidiDraftSave();
  }catch(error){midiStatus(error.message||'MIDI edit failed.',true)}
}

let seeking = false;
let frame = 0;
let visibleStep = -1;
const gates = [];
const previews = [];
const columns = Array.from({length:16},() => []);
const machine = makeMachine(view['marble-canvas']);
const player = new Playback(() => {
  if (view.loop.checked) {
    player.offset = 0;
    start();
  } else renderPlayState();
});

function formatTime(seconds) {
  const date = Math.max(0,Math.floor(seconds));
  return Math.floor(date / 60) + ':' + String(date % 60).padStart(2,'0');
}

function setStatus(message='',error=false) {
  const output = view['file-status'];
  output.textContent = message;
  output.hidden = !message;
  output.dataset.error = String(error);
}

function renderPlayState() {
  view.play.textContent = player.running ? 'Pause' : 'Play';
  invalidate();
}

async function start() {
  try {
    await player.play();
  } catch (error) {
    player.pause();
    setStatus(error.message || 'Playback could not start.',true);
  }
  renderPlayState();
}

function selectSong(song) {
  player.load(song);
  const composing = song.kind === 'pattern';
  view['source-kind'].textContent = {audio:'Audio recording', midi:'MIDI file', pattern:'Step sequencer'}[song.kind];
  view['track-title'].textContent = song.name;
  view['hit-count'].textContent = song.events.length.toLocaleString() + (song.kind === 'midi' ? ' notes' : ' drops');
  view['time-total'].textContent = formatTime(song.duration);
  view.position.max = song.duration;
  view.position.value = 0;
  view['time-now'].textContent = '0:00';
  view['use-loop'].hidden = composing;
  byId('quantize-controls').hidden = composing;
  view.builder.hidden = !composing;
  renderMidiWorkspace();
  view.loop.checked = composing;
  seeking = false;
  updateStep(-1);
  renderPlayState();
}

function patternSong() {
  return {...buildPattern(pattern), kind:'pattern', name:patternName};
}

function labelForLane(index) {
  return LANES[index].channel === 9 ? LANES[index].label : noteName(pattern.tuning?.[index] ?? LANES[index].note);
}

function renderMachineOptions() {
  const lane = Number(view['lane-choice'].value);
  view['ramp-choice'].value = pattern.rails?.[lane] || 0;
  view['pitch-control'].hidden = lane < 3;
  view['pitch-choice'].value = pattern.tuning?.[lane] ?? LANES[lane].note;
}

function renderPattern() {
  view.bpm.value = pattern.bpm;
  renderMachineOptions();
  [...view['lane-choice'].options].forEach((option,index) => {option.textContent=labelForLane(index);});
  [...byId('euclid-lane').options].forEach((option,index)=>{
    option.textContent=labelForLane(index);
  });
  previews.forEach(button => {
    const label = labelForLane(Number(button.dataset.lane));
    button.textContent = label;
    button.setAttribute('aria-label','Try ' + label);
  });
  for (const gate of gates) {
    const {lane,step} = gate.dataset;
    gate.setAttribute('aria-label',labelForLane(Number(lane)) + ', step ' + (Number(step)+1));
    gate.setAttribute('aria-pressed',String(Boolean(pattern.rows[lane] & (1 << step))));
  }
}

function updatePattern({rename=true,keepPosition=true}={}) {
  const continuePlaying = player.running && player.song.kind === 'pattern';
  const offset = keepPosition ? player.position : 0;
  const loop = view.loop.checked;
  if (rename) patternName = 'Custom loop';
  selectSong(patternSong());
  view.loop.checked = loop;
  player.offset = offset % player.song.duration;
  renderPattern();
  view['share-result'].hidden = true;
  if (continuePlaying) start();
}

function updateStep(step) {
  if (step === visibleStep) return;
  if (visibleStep >= 0) for (const item of columns[visibleStep]) item.classList.remove('is-current');
  if (step >= 0) for (const item of columns[step]) item.classList.add('is-current');
  visibleStep = step;
}

function renderGrid() {
  for (let half=0; half<2; half++) {
    const group = document.createElement('div');
    group.className = 'measure';
    group.setAttribute('role','group');
    group.setAttribute('aria-label',half ? 'Steps nine to sixteen' : 'Steps one to eight');
    const head = document.createElement('div');
    head.className = 'step-row';
    head.append(document.createElement('span'));
    for (let step=half*8; step<half*8+8; step++) {
      const item = document.createElement('span');
      item.className = 'step-label';
      item.textContent = step+1;
      columns[step].push(item);
      head.append(item);
    }
    group.append(head);
    LANES.forEach((lane,index) => {
      const row = document.createElement('div');
      row.className = 'step-row';
      const sample = document.createElement('button');
      sample.type = 'button';
      sample.className = 'sound-test';
      sample.dataset.lane = index;
      previews.push(sample);
      sample.addEventListener('click',async () => {
        try {
          await player.preview({...lane,note:pattern.tuning?.[index] ?? lane.note},.57);
          machine.testDrop(index,performance.now());
          invalidate();
        } catch {
          setStatus('Audio preview could not start.',true);
        }
      });
      row.append(sample);
      for (let step=half*8; step<half*8+8; step++) {
        const gate = document.createElement('button');
        gate.type = 'button';
        gate.className = 'gate';
        gate.dataset.lane = index;
        gate.dataset.step = step;
        gate.setAttribute('aria-label',lane.label + ', step ' + (step+1));
        gate.addEventListener('click',() => {
          remember();
          pattern.rows[index] ^= 1 << step;
          updatePattern();
        });
        gates.push(gate);
        columns[step].push(gate);
        row.append(gate);
      }
      group.append(row);
    });
    view.sequencer.append(group);
  }
}

async function loadFile(file) {
  if (!file) return;
  pendingImport?.abort();
  const request = new AbortController();
  pendingImport = request;
  player.pause();
  renderPlayState();
  setStatus('Reading ' + file.name + '…');
  try {
    const song = await importMusic(file,player.openAudio(),request.signal,
      message => {if (pendingImport === request) setStatus(message);});
    if (pendingImport !== request) return;
    if(song.kind==='midi'){
      restoreMidiWorkspace(song,'Loaded '+song.events.length+
        ' notes. An editable recovery copy is saved locally.');
    }else{midiWorkspace=null;selectSong(song)}
    byId('convert-bpm').value=pattern.bpm;
    setStatus(song.events.length ? 'Ready. Tap Play to start the machine.' : 'Ready to play. No clear hits were detected in this recording.');
  } catch (error) {
    if (pendingImport === request && error.name !== 'AbortError') {
      setStatus(error.message || 'Could not open this file.',true);
    }
  } finally {
    if (pendingImport === request) pendingImport = null;
  }
}

byId('midi-track').addEventListener('change',()=>{
  midiTrack=Number(byId('midi-track').value);midiNotePage=0;selectedMidiId=null;
  renderMidiWorkspace();
});
byId('midi-note').addEventListener('change',()=>{
  const selected=midiWorkspace?.events[Number(byId('midi-note').value)];
  selectedMidiId=selected?.id||null;
  renderMidiNotes();
  pianoRoll?.focusNote(selected);
});
byId('midi-prev-page').addEventListener('click',()=>{
  midiNotePage=Math.max(0,midiNotePage-1);selectedMidiId=null;renderMidiNotes();pianoRoll?.render();
});
byId('midi-next-page').addEventListener('click',()=>{
  midiNotePage++;selectedMidiId=null;renderMidiNotes();pianoRoll?.render();
});
byId('midi-mute').addEventListener('change',()=>{
  const checked=byId('midi-mute').checked;
  midiEdit(()=>{
    const muted=new Set(midiWorkspace.muted);
    if(checked)muted.add(midiTrack);else muted.delete(midiTrack);
    return buildMidiWorkspace({...midiWorkspace,muted:[...muted]});
  },checked?'Track muted for playback. Export retains all notes.':'Track unmuted.');
});
byId('midi-apply-track').addEventListener('click',()=>{
  midiEdit(()=>buildMidiWorkspace({...midiWorkspace,
    events:changeMidiTrack(midiWorkspace.events,midiTrack,{
      transpose:Number(byId('midi-transpose').value),
      velocity:Number(byId('midi-velocity-scale').value),
      shiftMs:Number(byId('midi-shift').value)
    })}),'Updated track '+(midiTrack+1)+' pitch, timing, and velocity.');
  byId('midi-transpose').value='0';
  byId('midi-velocity-scale').value='100';byId('midi-shift').value='0';
});
byId('midi-apply-note').addEventListener('click',()=>{
  const index=Number(byId('midi-note').value);
  midiEdit(()=>buildMidiWorkspace({...midiWorkspace,
    events:changeMidiNote(midiWorkspace.events,index,{
      note:Number(byId('midi-note-pitch').value),
      time:Number(byId('midi-note-time').value),
      duration:Number(byId('midi-note-length').value),
      velocity:Number(byId('midi-note-velocity').value)/100
    })}),'Saved an individual MIDI note without changing the other tracks.');
});
byId('midi-undo').addEventListener('click',()=>{
  if(!midiPast.length)return;
  midiFuture.push(midiSnapshot());midiWorkspace=midiPast.pop();
  refreshMidiPlayback('Undid MIDI edit.');
  scheduleMidiDraftSave();
});
byId('midi-redo').addEventListener('click',()=>{
  if(!midiFuture.length)return;
  midiPast.push(midiSnapshot());midiWorkspace=midiFuture.pop();
  refreshMidiPlayback('Redid MIDI edit.');
  scheduleMidiDraftSave();
});
byId('midi-export').addEventListener('click',()=>{
  try{
    const bytes=exportMultitrackMidi(midiWorkspace);
    midiDownload(bytes,'marble-multitrack-edited.mid','audio/midi');
    midiStatus('Exported '+trackSummary(midiWorkspace.events).length+' MIDI tracks. '+
      (midiWorkspace.timing?'Preserved '+midiWorkspace.timing.changes.length+' source tempo segment(s).':
      'A constant 120 BPM export map was used because source tempo information is unavailable.'));
  }catch(error){midiStatus('MIDI export failed: '+error.message,true)}
});
byId('midi-save-json').addEventListener('click',()=>{
  if(!midiWorkspace)return;
  midiDownload(JSON.stringify(midiWorkspace,null,2),'marble-multitrack-workspace.json','application/json');
  midiStatus('Saved an editable, self-contained local MIDI workspace.');
});
byId('midi-open-json').addEventListener('click',()=>byId('midi-json-file').click());
byId('midi-json-file').addEventListener('change',async()=>{
  const file=byId('midi-json-file').files?.[0];
  byId('midi-json-file').value='';
  if(!file)return;
  try{
    if(file.size>12*1024*1024)throw new RangeError('MIDI project JSON is too large.');
    const object=JSON.parse(await file.text());
    if(object.format!==MIDI_WORKSPACE_FORMAT)throw new Error('Not a Marble MIDI workspace.');
    const next=buildMidiWorkspace(object);
    restoreMidiWorkspace(next,'Opened '+next.events.length+
      ' editable notes. Recovery autosave is active.');
  }catch(error){midiStatus('Could not open the MIDI workspace: '+error.message,true)}
});
byId('midi-checkpoint').addEventListener('click',()=>{
 if(!midiWorkspace)return;
 scheduleMidiDraftSave(true,true);
 midiStatus('Creating a separate recovery checkpoint for the current MIDI project.');
});
byId('midi-restore-draft').addEventListener('click',async()=>{
 try{
  const id=byId('midi-revision').value;
  const draft=await midiDraftStore.load(id);
  restoreMidiWorkspace(draft.workspace,'Recovered version from '+
   new Date(draft.updatedAt).toLocaleString()+'. Earlier versions remain available.');
 }catch(error){byId('midi-recovery-details').textContent=
   'Recovery failed: '+(error?.message||String(error));}
});
byId('midi-export-draft').addEventListener('click',async()=>{
 try{
  const draft=await midiDraftStore.load(byId('midi-revision').value);
  midiDownload(JSON.stringify(draft.workspace,null,2),
   'marble-recovery-'+new Date(draft.updatedAt).toISOString().replace(/[:.]/g,'-')+'.json',
   'application/json');
  midiStatus('Downloaded the selected recovery revision as an editable JSON project.');
 }catch(error){byId('midi-recovery-details').textContent=
   'Could not export this recovery version: '+(error?.message||String(error));}
});
byId('midi-discard-draft').addEventListener('click',async()=>{
 try{
  const id=byId('midi-revision').value;
  const remaining=await midiDraftStore.discard(id);
  updateMidiRecovery(remaining);
  midiStatus('Selected recovery revision deleted. '+remaining.length+
   ' older version(s) remain. Autosave continues while editing.');
 }catch(error){byId('midi-recovery-details').textContent=
   'Could not delete the selected version: '+(error?.message||String(error));}
});
document.addEventListener('visibilitychange',()=>{
 if(document.visibilityState==='hidden'&&midiWorkspace)scheduleMidiDraftSave(true);
});
window.addEventListener('pagehide',()=>{
 if(midiWorkspace)scheduleMidiDraftSave(true);
});
view['open-file'].addEventListener('click',() => view['file-input'].click());
view['file-input'].addEventListener('change',() => {
  loadFile(view['file-input'].files[0]);
  view['file-input'].value = '';
});
for (const event of ['dragenter','dragover']) {
  view['drop-zone'].addEventListener(event,e => {
    e.preventDefault();
    view['drop-zone'].dataset.over = 'true';
  });
}
view['drop-zone'].addEventListener('dragleave', e => {
  if (!view['drop-zone'].contains(e.relatedTarget)) delete view['drop-zone'].dataset.over;
});
window.addEventListener('dragover',e => {
  if (e.dataTransfer.types.includes('Files')) e.preventDefault();
});
window.addEventListener('drop',e => {
  if (!e.dataTransfer.files.length) return;
  e.preventDefault();
  delete view['drop-zone'].dataset.over;
  loadFile(e.dataTransfer.files[0]);
});

view.play.addEventListener('click',() => {
  if (!player.running) start();
  else {
    player.pause();
    renderPlayState();
  }
});
view.rewind.addEventListener('click',() => reposition(0));
view.position.addEventListener('input',() => {
  seeking = true;
  invalidate();
  view['time-now'].textContent = formatTime(view.position.valueAsNumber);
});
view.position.addEventListener('change',() => {
  seeking = false;
  reposition(view.position.valueAsNumber);
});
async function reposition(time) {
  try { await player.seek(time); }
  catch (error) { setStatus(error.message,true); }
  renderPlayState();
}
view.speed.addEventListener('change',async () => {
  try { await player.setSpeed(Number(view.speed.value)); }
  catch (error) { setStatus(error.message,true); }
  renderPlayState();
});
view.volume.addEventListener('input',() => player.setVolume(Number(view.volume.value)/100));
view['use-loop'].addEventListener('click',() => {
  pendingImport?.abort();
  pendingImport = null;
  setStatus();
  selectSong(patternSong());
});
view.bpm.addEventListener('change',() => {
  remember();
  pattern.bpm = Math.round(Math.max(40,Math.min(240,Number(view.bpm.value) || 104)));
  updatePattern();
});
view.demo.addEventListener('click',() => {
  remember();
  pattern = {bpm:104, rows:[...demoRows]};
  patternName = 'Demo loop';
  updatePattern({rename:false,keepPosition:false});
});
view.clear.addEventListener('click',() => {
  remember();
  pattern.rows.fill(0);
  updatePattern({keepPosition:false});
});
byId('undo-loop').addEventListener('click',()=>{
  if(!history.length)return;
  future.push(snapshot());restore(history.pop());
});
byId('redo-loop').addEventListener('click',()=>{
  if(!future.length)return;
  history.push(snapshot());restore(future.pop());
});
byId('random-loop').addEventListener('click',()=>{
  remember();
  pattern.rows=pattern.rows.map((row,lane)=>{
    let value=0;
    for(let step=0;step<16;step++){
      const density=lane<3?.33:.19;
      if(Math.random()<density)value|=1<<step;
    }
    return value;
  });
  if(pattern.rows.every(bits=>!bits))pattern.rows[0]=0x1111;
  updatePattern({keepPosition:false});
});
for(const [id,shift] of [['rotate-left',-1],['rotate-right',1]]){
  byId(id).addEventListener('click',()=>{
    remember();
    pattern.rows=rotateRows(pattern.rows,shift);
    updatePattern({keepPosition:false});
    setStatus('Shifted the complete 16-step pattern '+(shift>0?'right':'left')+'.');
  });
}
byId('euclid-fill').addEventListener('click',()=>{
  try{
    const lane=Number(byId('euclid-lane').value);
    const pulses=Number(byId('euclid-pulses').value);
    const rotation=Number(byId('euclid-rotation').value);
    if(!Number.isInteger(lane)||lane<0||lane>=LANES.length)
      throw new RangeError('Choose an instrument lane');
    remember();
    pattern.rows[lane]=euclideanRhythm(pulses,rotation);
    updatePattern({keepPosition:false});
    setStatus('Distributed '+pulses+' hits across 16 steps of '+labelForLane(lane)+'.');
  }catch(error){setStatus('Rhythm generation failed: '+error.message,true)}
});
byId('convert-to-pattern').addEventListener('click',()=>{
  try{
    if(!['midi','audio'].includes(player.song.kind))
      throw new Error('Open an audio or MIDI file first.');
    const bpm=Number(byId('convert-bpm').value);
    const startTime=Math.max(0,player.position);
    const {pattern:next,mapped,windowSeconds}=patternFromEvents(player.song,{bpm,startTime});
    if(!mapped)throw new Error('No detected notes or hits in this window. Move the playhead to a busier section.');
    remember();
    const previousName=player.song.name;
    pattern=next;
    patternName='From '+previousName.slice(0,65);
    view.loop.checked=true;
    updatePattern({rename:false,keepPosition:false});
    setStatus('Quantized '+mapped+' note/hit events from '+formatTime(startTime)+
      ' into '+windowSeconds.toFixed(2)+' seconds of editable steps. Timing and pitch are approximations.');
  }catch(error){setStatus('Cannot create pattern: '+error.message,true)}
});
byId('export-midi').addEventListener('click',()=>{
  try{
    const bytes=exportPatternMidi(pattern);
    const url=URL.createObjectURL(new Blob([bytes],{type:'audio/midi'}));
    const link=document.createElement('a');link.href=url;link.download='marble-loop.mid';
    link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
    setStatus('MIDI loop exported.');
  }catch(error){setStatus('MIDI export failed: '+error.message,true)}
});
view.share.addEventListener('click',async () => {
  const url = new URL(location.href);
  url.hash = 'loop=' + encodePattern(pattern);
  view['share-result'].hidden = false;
  view['share-link'].value = url.href;
  try {
    await navigator.clipboard.writeText(url.href);
    view['share-status'].textContent = 'Loop link copied.';
  } catch {
    view['share-link'].select();
    view['share-status'].textContent = 'Copy this link to share your loop.';
  }
});
window.addEventListener('keydown',e => {
  if (e.code !== 'Space' || e.target !== document.body || document.querySelector('dialog[open]')) return;
  e.preventDefault();
  view.play.click();
});

function invalidate() {
  if (!frame) frame = requestAnimationFrame(animate);
}

new ResizeObserver(() => {machine.resize();invalidate();}).observe(view['marble-canvas']);
function animate(now) {
  frame = 0;
  const position = seeking ? view.position.valueAsNumber : player.position;
  if (!seeking) {
    view.position.value = position;
    const label = formatTime(position);
    if (view['time-now'].textContent !== label) view['time-now'].textContent = label;
  }
  machine.draw(player.song,position,player.running,now);
  if(player.song.kind==='midi'&&player.running)pianoRoll?.tick(now);
  const step = player.song.kind === 'pattern' && (player.running || seeking)
    ? Math.min(15,Math.floor(position * pattern.bpm / 15)) : -1;
  updateStep(step);
  if (player.running || !machine.idle) invalidate();
}

LANES.forEach((lane,index) => {
  view['lane-choice'].add(new Option(lane.label,index));
  byId('euclid-lane').add(new Option(lane.label,index));
});
for (let note=48; note<=84; note++) view['pitch-choice'].add(new Option(noteName(note),note));
view['lane-choice'].value = 3;
view['lane-choice'].addEventListener('change',renderMachineOptions);
view['ramp-choice'].addEventListener('change',() => {
  remember();
  pattern.rails ||= Array(LANES.length).fill(0);
  pattern.rails[Number(view['lane-choice'].value)] = Number(view['ramp-choice'].value);
  updatePattern();
});
view['pitch-choice'].addEventListener('change',() => {
  remember();
  pattern.tuning ||= LANES.map(lane => lane.note);
  pattern.tuning[Number(view['lane-choice'].value)] = Number(view['pitch-choice'].value);
  updatePattern();
});

window.RIPStudio={
  getState(){
    if(player.song.kind==='midi'&&midiWorkspace)return midiSnapshot();
    if(player.song.kind!=='pattern')throw new Error('Switch back to your loop or an imported MIDI track before saving editable state');
    return snapshot();
  },
  setState(state){
    if(state?.format===MIDI_WORKSPACE_FORMAT){
      const next=buildMidiWorkspace(state);
      restoreMidiWorkspace(next,'Loaded editable MIDI state. Browser recovery copy updated.');
      return;
    }
    if(!state||typeof state.loop!=='string')throw new Error('Invalid marble project file');
    history.length=0;future.length=0;restore(state);
  },
  capture(){
    return new Promise((resolve,reject)=>view['marble-canvas'].toBlob(
      blob=>blob?resolve(blob):reject(new Error('Marble canvas capture failed')),'image/png'));
  },
  setQuality(level){
    document.documentElement.dataset.marbleEffects=level==='eco'?'reduced':'full';
    machine.resize();invalidate();
  },
  async transport(action){
    if(action==='play'){await start();return;}
    if(action==='pause'){player.pause();renderPlayState();return;}
    if(action==='reset'){player.pause();await reposition(0);renderPlayState();return;}
    throw new Error('Unknown transport command');
  }
};
pianoRoll=createPianoRoll({
  getState:()=>({
    workspace:midiWorkspace,kind:player.song?.kind,
    track:midiTrack,selectedId:selectedMidiId,position:player.position
  }),
  onSelect(id){
    selectedMidiId=id;
    const note=midiWorkspace?.events.find(event=>event.id===id);
    if(!note)return;
    midiTrack=note.track;
    renderMidiWorkspace();
  },
  onEdit(id,changes){
    const index=midiWorkspace?.events.findIndex(event=>event.id===id)??-1;
    if(index<0){midiStatus('The selected note no longer exists.',true);return}
    selectedMidiId=id;
    midiEdit(()=>buildMidiWorkspace({...midiWorkspace,
      events:changeMidiNote(midiWorkspace.events,index,changes)}),
      'Moved or resized '+noteName(changes.note)+' in the piano roll. Undo is available.');
  },
  onSeek(time){reposition(time)}
});
renderGrid();
renderPattern();
selectSong(patternSong());
updateUndo();
offerMidiRecovery();
if(new URLSearchParams(location.search).get('handoff')==='1'){
  receiveMarbleAudio().then(file=>{
    if(file){setStatus('Received recording locally from Music Microscope.');
      loadFile(file);}
    else setStatus('No pending local recording was found.',true);
  }).catch(error=>setStatus('Could not receive recording: '+error.message,true));
}
