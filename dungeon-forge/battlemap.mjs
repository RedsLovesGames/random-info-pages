import { makeBattlemap, pixelsPerSquare, universalVtt } from './battlemap-core.mjs';
import { drawBattlemap } from './battlemap-render.mjs';
import { buildAdventure, encounterBudget, formatRoom, normalizeParty, roomFeatures } from './adventure.mjs';
import { srdAttribution, srdPdf } from './adventure-monsters.mjs';

const byId = id => document.getElementById(id);
const openMap = byId('openBattlemap');
const dialog = byId('battlemap');
const map = byId('battlemapCanvas');
const title = byId('battlemapTitle');
const stats = byId('battlemapStats');
const status = byId('battlemapStatus');
const notesList = byId('battlemapRooms');
const overview = byId('battlemapAdventure');
const form = byId('battlemapParty');
const budget = byId('battlemapBudget');
const reroll = byId('battlemapReroll');
const grid = byId('battlemapGrid');
const numbers = byId('battlemapNumbers');
const doors = byId('battlemapDoors');
const lights = byId('battlemapLights');
const entranceLight = byId('battlemapEntranceLight');
const roomCount = byId('rooms');
const zoom = byId('battlemapZoom');
const exports = [...dialog.querySelectorAll('[data-battlemap-export]')];
const partyKey = 'rip-dungeon-party-v1';

let dungeon;
let adventure;
let party = normalizeParty(readRecord(partyKey));
let planKey;
let notes = {};
let revision = { all: 0, rooms: {} };
let exporting = false;

for (const [key, value] of Object.entries(party)) form.elements.namedItem(key).value = value;

function readRecord(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  } catch { /* Local storage can be unavailable. */ }
  return {};
}

function saveRecord(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch { status.textContent = 'This browser cannot save your changes. Download the GM room key to keep them.'; }
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

function refreshPreview() {
  if (!dungeon) return;
  const pixels = Math.min(22, pixelsPerSquare(dungeon));
  map.style.setProperty('--battlemap-aspect', dungeon.W / dungeon.H);
  map.style.setProperty('--battlemap-detail-width', (dungeon.W * 17) + 'px');
  drawBattlemap(map, dungeon, pixels, { grid: grid.checked, numbers: numbers.checked, doors: doors.checked, adventure });
}

function textElement(tag, content, className) {
  const element = document.createElement(tag);
  element.textContent = content;
  if (className) element.className = className;
  return element;
}

function labeledList(entries) {
  const list = document.createElement('dl');
  for (const [term, detail] of entries) list.append(textElement('dt', term), textElement('dd', detail));
  return list;
}

function renderOverview() {
  const { name, hook, objective, complication, reward, rooms } = adventure;
  overview.replaceChildren(textElement('h4', name), labeledList([
    ['Hook', hook], ['Objective', objective], ['Complication', complication], ['Quest reward', reward + ' GP']
  ]));
  const counts = [
    [rooms.filter(room => room.encounter).length, 'encounters'],
    [rooms.filter(room => room.trap).length, 'traps'],
    [rooms.filter(room => room.treasure).length, 'treasure rooms']
  ];
  overview.append(textElement('p', counts.map(([count, label]) => count + ' ' + label).join(' · '), 'battlemap-room-counts'));
}

function renderEncounter(encounter) {
  const section = document.createElement('div');
  section.className = 'battlemap-encounter';
  section.append(textElement('h4', encounter.totalXp.toLocaleString() + ' / ' + encounter.budget.toLocaleString() + ' XP'));
  const list = document.createElement('ul');
  for (const monster of encounter.monsters) {
    const item = document.createElement('li');
    const anchor = textElement('a', monster.name + ' stat block');
    anchor.href = srdPdf + '#page=' + monster.page;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    const initiative = (monster.initiative >= 0 ? '+' : '') + monster.initiative;
    const positions = monster.positions.map(tile => (tile.x + 1) + ',' + (tile.y + 1)).join(' · ');
    item.append(textElement('b', monster.positions.length + ' × ' + monster.name),
      textElement('p', 'AC ' + monster.ac + ' · HP ' + monster.hp + ' · Initiative ' + initiative +
        ' · CR ' + monster.cr + ' · ' + monster.xp.toLocaleString() + ' XP each'),
      textElement('p', 'Starting squares (column,row) ' + positions), anchor);
    list.append(item);
  }
  section.append(list);
  return section;
}

function renderRoom(room, opened) {
  const entry = document.createElement('details');
  entry.dataset.room = room.id;
  entry.open = opened;
  const number = String(room.number).padStart(2, '0');
  const role = room.role[0].toUpperCase() + room.role.slice(1);
  const summary = textElement('summary', number + ' · ' + room.name);
  summary.append(textElement('span', role, 'battlemap-room-role'));
  const content = document.createElement('div');
  content.className = 'battlemap-room-content';
  content.append(textElement('blockquote', room.readAloud), labeledList(roomFeatures(room)));
  if (room.encounter) content.append(renderEncounter(room.encounter));

  const label = textElement('label', 'GM notes', 'battlemap-note');
  const input = document.createElement('textarea');
  input.rows = 3;
  input.maxLength = 2000;
  input.placeholder = 'Add your own notes, changes, or reminders.';
  input.value = typeof notes[room.id] === 'string' ? notes[room.id] : '';
  input.addEventListener('input', () => {
    notes[room.id] = input.value;
    saveRecord(planKey + ':notes', notes);
  });
  label.append(input);
  const rerollRoom = textElement('button', 'Reroll this room');
  rerollRoom.type = 'button';
  rerollRoom.addEventListener('click', () => {
    revision.rooms[room.id] = (revision.rooms[room.id] ?? 0) + 1;
    saveRevision();
    refreshAdventure();
    notesList.querySelector('[data-room="' + room.id + '"] summary')?.focus();
  });
  content.append(label, rerollRoom);
  entry.append(summary, content);
  return entry;
}

function refreshAdventure() {
  if (!dungeon) return;
  adventure = buildAdventure(dungeon, party, revision.all, revision.rooms);
  const open = new Set([...notesList.querySelectorAll('details[open]')].map(entry => entry.dataset.room));
  renderOverview();
  notesList.replaceChildren(...adventure.rooms.map(room => renderRoom(room, open.has(String(room.id)))));
  budget.textContent = '2024 D&D · Up to ' + encounterBudget(party).toLocaleString() + ' XP per encounter';
  refreshPreview();
}

function loadPlan() {
  try {
    dungeon = makeBattlemap(getSettings());
    const { seed, themeKey, roomCount, loopChance, decorDensity } = dungeon.params;
    planKey = ['rip-dungeon-notes-v1', seed, roomCount, themeKey, loopChance, decorDensity].join(':');
    // Existing notes were stored directly at planKey.
    notes = { ...readRecord(planKey), ...readRecord(planKey + ':notes') };
    const saved = readRecord(planKey + ':revision');
    revision = { all: saved.all >>> 0, rooms: saved.rooms && typeof saved.rooms === 'object' ? saved.rooms : {} };
    title.textContent = dungeon.name;
    stats.textContent = dungeon.rooms.length + ' rooms · ' + dungeon.W + ' × ' + dungeon.H + ' squares · 5 ft per square · Seed ' + seed;
    status.textContent = '';
    refreshAdventure();
    map.hidden = false;
    for (const button of [...exports, reroll]) button.disabled = false;
  } catch (error) {
    dungeon = undefined;
    adventure = undefined;
    notesList.replaceChildren();
    overview.replaceChildren();
    map.hidden = true;
    title.textContent = 'Battlemap';
    stats.textContent = '';
    status.textContent = error.message;
    for (const button of [...exports, reroll]) button.disabled = true;
  }
}

function saveRevision() {
  saveRecord(planKey + ':revision', revision);
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
  const { name, party, hook, objective, complication, reward, rooms } = adventure;
  const header = [
    name + ' · ' + plan.name,
    'GM ROOM KEY',
    'Seed ' + plan.params.seed + ' · ' + plan.params.themeKey + ' · ' + plan.rooms.length + ' rooms',
    party.size + ' characters at level ' + party.level + ' · 2024 D&D · ' +
      encounterBudget(party).toLocaleString() + ' XP cap per encounter',
    'Use the numbered GM map. Room 1 is the entrance. Each square is 5 ft. Red outlines mark monster starting spaces.',
    '',
    'Hook: ' + hook,
    'Objective: ' + objective,
    'Complication: ' + complication,
    'Quest reward: ' + reward + ' GP'
  ];
  const entries = rooms.map(room => formatRoom(room, typeof notes[room.id] === 'string' ? notes[room.id] : ''));
  const text = [header.join('\n'), ...entries, srdAttribution].join('\n\n') + '\n';
  download(basename + '-gm-room-key.txt', new Blob([text], { type: 'text/plain;charset=utf-8' }));
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
      doors: format !== 'vtt' && doors.checked,
      adventure: format === 'gm' ? adventure : undefined
    });
    if (format === 'vtt') {
      const image = output.toDataURL('image/png').split(',')[1];
      if (!image) throw new Error('This browser could not encode the map image.');
      const vtt = universalVtt(plan, { pixels, image, doors: doors.checked, lights: lights.checked, entranceLight: entranceLight.checked });
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
byId('battlemapClose').addEventListener('click', () => dialog.close());
byId('battlemapQuick').addEventListener('click', () => {
  roomCount.value = '8';
  byId('vRooms').textContent = roomCount.value;
  roomCount.dispatchEvent(new Event('input', { bubbles: true }));
  loadPlan();
});
form.addEventListener('submit', event => {
  event.preventDefault();
  party = normalizeParty(Object.fromEntries(new FormData(form)));
  saveRecord(partyKey, party);
  refreshAdventure();
});
reroll.addEventListener('click', () => {
  revision = { all: revision.all + 1, rooms: {} };
  saveRevision();
  refreshAdventure();
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
