import { makeBattlemap, pixelsPerSquare, roomKey, universalVtt } from './battlemap-core.mjs';
import { drawBattlemap } from './battlemap-render.mjs';

const openMap = document.getElementById('openBattlemap');
const dialog = document.getElementById('battlemap');
const map = document.getElementById('battlemapCanvas');
const title = document.getElementById('battlemapTitle');
const stats = document.getElementById('battlemapStats');
const status = document.getElementById('battlemapStatus');
const notesList = document.getElementById('battlemapRooms');
const grid = document.getElementById('battlemapGrid');
const numbers = document.getElementById('battlemapNumbers');
const doors = document.getElementById('battlemapDoors');
const lights = document.getElementById('battlemapLights');
const roomCount = document.getElementById('rooms');
const zoom = document.getElementById('battlemapZoom');
const exports = [...dialog.querySelectorAll('[data-battlemap-export]')];
const prompts = {
  entrance: 'Give the party something they can see, hear, or smell before they cross the threshold.',
  combat: 'Who is here, what do they want, and what terrain or cover can either side use?',
  elite: 'Give this room a threat that changes once the party disturbs it.',
  treasure: 'What makes the reward worth the detour? Put a clue or cost nearby.',
  shrine: 'What can the party learn or change here? Decide what happens if they interact.',
  boss: 'Give the party an objective and a way to succeed even if the enemy survives.'
};

let dungeon;
let notes = {};
let storageKey;
let exporting = false;

function getSettings() {
  return {
    seed: document.getElementById('seed').value,
    roomCount: roomCount.value,
    loopPercent: document.getElementById('loops').value,
    decorPercent: document.getElementById('decor').value,
    theme: document.querySelector('#chips .on')?.dataset.t
  };
}

function refreshPreview() {
  if (!dungeon) return;
  const pixels = Math.min(19, pixelsPerSquare(dungeon));
  map.style.setProperty('--battlemap-aspect', dungeon.W / dungeon.H);
  map.style.setProperty('--battlemap-detail-width', (dungeon.W * 15) + 'px');
  drawBattlemap(map, dungeon, pixels, { grid: grid.checked, numbers: numbers.checked, doors: doors.checked });
}

function addRoomNotes() {
  notesList.replaceChildren();
  for (const room of roomKey(dungeon)) {
    const entry = document.createElement('details');
    const summary = document.createElement('summary');
    const number = String(room.number).padStart(2, '0');
    summary.textContent = number + ' · ' + room.type[0].toUpperCase() + room.type.slice(1);
    const label = document.createElement('label');
    label.className = 'battlemap-note';
    label.textContent = 'GM notes';
    const input = document.createElement('textarea');
    input.rows = 3;
    input.maxLength = 2000;
    input.placeholder = prompts[room.type];
    input.value = notes[room.id] || '';
    input.addEventListener('input', () => {
      notes[room.id] = input.value;
      try { localStorage.setItem(storageKey, JSON.stringify(notes)); }
      catch { status.textContent = 'Can’t save notes in this browser. Download the room key to keep them.'; }
    });
    label.append(input);
    entry.append(summary, label);
    notesList.append(entry);
  }
}

function loadPlan() {
  try {
    dungeon = makeBattlemap(getSettings());
    const { seed, themeKey, roomCount, loopChance, decorDensity } = dungeon.params;
    storageKey = ['rip-dungeon-notes-v1', seed, roomCount, themeKey, loopChance, decorDensity].join(':');
    notes = {};
    try { notes = JSON.parse(localStorage.getItem(storageKey)) || {}; } catch { /* Local storage can be unavailable. */ }
    title.textContent = dungeon.name;
    stats.textContent = dungeon.rooms.length + ' rooms · ' + dungeon.W + ' × ' + dungeon.H + ' squares · 5 ft per square · Seed ' + seed;
    status.textContent = '';
    refreshPreview();
    map.hidden = false;
    addRoomNotes();
    for (const button of exports) button.disabled = false;
  } catch (error) {
    dungeon = undefined;
    notesList.replaceChildren();
    map.hidden = true;
    title.textContent = 'Battlemap';
    stats.textContent = '';
    status.textContent = error.message;
    for (const button of exports) button.disabled = true;
  }
}

function download(name, blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadKey(plan, basename) {
  const rooms = roomKey(plan).map(room =>
    room.number + '. ' + room.type.toUpperCase() + '\n' +
    (notes[room.id]?.trim() || prompts[room.type])
  );
  const header = [
    plan.name,
    'GM ROOM KEY',
    'Seed ' + plan.params.seed + ' · ' + plan.params.themeKey + ' · ' + plan.rooms.length + ' rooms · ' + plan.params.loopChance * 100 + '% loops',
    'Use the numbered GM map. Room 1 is the entrance. Each square is 5 ft.'
  ];
  download(basename + '-gm-room-key.txt', new Blob([header.join('\n') + '\n\n' + rooms.join('\n\n') + '\n'], { type: 'text/plain;charset=utf-8' }));
}

async function downloadMap(format) {
  if (!dungeon || exporting) return;
  const plan = dungeon;
  const basename = plan.name.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '-') + '-' + plan.params.seed;
  if (format === 'key') {
    downloadKey(plan, basename);
    return;
  }
  exporting = true;
  status.textContent = 'Preparing the export…';
  const output = document.createElement('canvas');
  try {
    const pixels = pixelsPerSquare(plan);
    drawBattlemap(output, plan, pixels, {
      grid: format === 'vtt' ? false : grid.checked,
      numbers: format === 'gm',
      // Visible door bars on a static PNG. Owlbear draws its editable door
      // items above the gridless image so opening a door removes its mark.
      doors: format !== 'vtt' && doors.checked
    });
    if (format === 'vtt') {
      const image = output.toDataURL('image/png').split(',')[1];
      if (!image) throw new Error('This browser could not encode the map image.');
      const vtt = universalVtt(plan, { pixels, image, doors: doors.checked, lights: lights.checked });
      download(basename + '.dd2vtt', new Blob([JSON.stringify(vtt)], { type: 'application/json' }));
    } else {
      const blob = await new Promise(resolve => output.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('This browser could not encode the map image.');
      download(basename + (format === 'gm' ? '-gm.png' : '-player.png'), blob);
    }
    status.textContent = 'Download ready.';
  } catch (error) {
    status.textContent = error.message;
  } finally {
    output.width = output.height = 1;
    exporting = false;
  }
}

openMap.addEventListener('click', () => {
  dialog.showModal();
  loadPlan();
});
document.getElementById('battlemapClose').addEventListener('click', () => dialog.close());
document.getElementById('battlemapQuick').addEventListener('click', () => {
  roomCount.value = '8';
  document.getElementById('vRooms').textContent = roomCount.value;
  roomCount.dispatchEvent(new Event('input', { bubbles: true }));
  loadPlan();
});
zoom.addEventListener('click', () => {
  const detail = zoom.getAttribute('aria-pressed') === 'false';
  zoom.setAttribute('aria-pressed', String(detail));
  map.dataset.detail = String(detail);
});
for (const checkbox of [grid, numbers, doors]) checkbox.addEventListener('change', refreshPreview);
dialog.addEventListener('click', event => {
  const button = event.target.closest('[data-battlemap-export]');
  if (button) downloadMap(button.dataset.battlemapExport);
});
// The underlying exhibit listens for single-letter shortcuts on window.
dialog.addEventListener('keydown', event => event.stopPropagation());
