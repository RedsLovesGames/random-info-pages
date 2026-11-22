import {LANES,buildPattern,encodePattern,decodePattern,noteName} from './music.mjs';
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
let pendingImport = null;
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
  view.builder.hidden = !composing;
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
    selectSong(song);
    setStatus(song.events.length ? 'Ready. Tap Play to start the machine.' : 'Ready to play. No clear hits were detected in this recording.');
  } catch (error) {
    if (pendingImport === request && error.name !== 'AbortError') {
      setStatus(error.message || 'Could not open this file.',true);
    }
  } finally {
    if (pendingImport === request) pendingImport = null;
  }
}

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
  pattern.bpm = Math.round(Math.max(40,Math.min(240,Number(view.bpm.value) || 104)));
  updatePattern();
});
view.demo.addEventListener('click',() => {
  pattern = {bpm:104, rows:[...demoRows]};
  patternName = 'Demo loop';
  updatePattern({rename:false,keepPosition:false});
});
view.clear.addEventListener('click',() => {
  pattern.rows.fill(0);
  updatePattern({keepPosition:false});
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
  const step = player.song.kind === 'pattern' && (player.running || seeking)
    ? Math.min(15,Math.floor(position * pattern.bpm / 15)) : -1;
  updateStep(step);
  if (player.running || !machine.idle) invalidate();
}

LANES.forEach((lane,index) => view['lane-choice'].add(new Option(lane.label,index)));
for (let note=48; note<=84; note++) view['pitch-choice'].add(new Option(noteName(note),note));
view['lane-choice'].value = 3;
view['lane-choice'].addEventListener('change',renderMachineOptions);
view['ramp-choice'].addEventListener('change',() => {
  pattern.rails ||= Array(LANES.length).fill(0);
  pattern.rails[Number(view['lane-choice'].value)] = Number(view['ramp-choice'].value);
  updatePattern();
});
view['pitch-choice'].addEventListener('change',() => {
  pattern.tuning ||= LANES.map(lane => lane.note);
  pattern.tuning[Number(view['lane-choice'].value)] = Number(view['pitch-choice'].value);
  updatePattern();
});

renderGrid();
renderPattern();
selectSong(patternSong());
