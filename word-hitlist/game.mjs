import { counts, TILE_VALUES } from '../tools/words/words-core.js';

const endpoint = 'https://bpudsyyepiminpdxlquz.supabase.co/functions/v1/word-hitlist';
const storageKey = 'random-info-pages.word-hitlist.seat';
const byId = (id) => document.getElementById(id);
const nickname = byId('nickname');
const joinCode = byId('join-code');
const wordInput = byId('word');
const rack = byId('rack');
const goals = byId('goals');
const start = byId('host-action');
const cleanWord = (text) => text.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 15);
const cleanCode = (text) => text.toUpperCase().replace(/[^A-Z2-9]/g, '').slice(0, 6);
const initialCode = cleanCode(new URL(location.href).searchParams.get('room') || '');
const newToken = () => crypto.randomUUID();

let session = null;
let token = newToken();
let state = null;
let chosen = '';
let busy = false;
let version = 0;
let offset = 0;
let timer = 0;
let renderedRoster = '';
let renderedGoals = '';
let roundView = '';

function node(tag, text = '', className = '') {
  const element = document.createElement(tag);
  if (text) element.textContent = text;
  if (className) element.className = className;
  return element;
}

class RoomError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

async function call(action, extra = {}) {
  const began = Date.now();
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, code: session?.room, token, ...extra }),
    signal: AbortSignal.timeout(10000),
  });
  const result = await response.json();
  if (!response.ok || result.error) throw new RoomError(result.error || 'Game service is unavailable.', result.code);
  if (result.serverTime) offset = Date.parse(result.serverTime) - (began + Date.now()) / 2;
  return result;
}

function remember(room, name) {
  session = { room, name, token };
  try { sessionStorage.setItem(storageKey, JSON.stringify(session)); } catch {}
  const url = new URL(location.href);
  url.searchParams.set('room', room);
  history.replaceState(null, '', url);
}

function clearSeat() {
  clearTimeout(timer);
  session = state = null;
  token = newToken();
  renderedRoster = renderedGoals = roundView = '';
  byId('room').hidden = true;
  byId('entry').hidden = false;
  byId('room-status').textContent = '';
  byId('word-status').textContent = '';
  const url = new URL(location.href);
  url.searchParams.delete('room');
  history.replaceState(null, '', url);
  try { sessionStorage.removeItem(storageKey); } catch {}
}

function status(id, message) {
  byId(id).textContent = message;
}

function updateTiles() {
  const remaining = counts(wordInput.value);
  for (const button of rack.querySelectorAll('button')) {
    button.disabled = Boolean(remaining[button.dataset.letter]);
    if (button.disabled) remaining[button.dataset.letter]--;
  }
  byId('submit-word').disabled = busy || !chosen || wordInput.value.length < 3;
}

function renderGoals() {
  const answerKey = JSON.stringify([state.goals, state.myAnswers, chosen]);
  if (answerKey === renderedGoals) return;
  renderedGoals = answerKey;
  goals.replaceChildren(...state.goals.map(goal => {
    const answer = state.myAnswers[goal.id];
    const button = node('button', '', answer ? 'goal done' : 'goal');
    button.type = 'button';
    button.setAttribute('aria-pressed', String(chosen === goal.id));
    button.disabled = Boolean(answer);
    button.append(node('strong', goal.title), node('span', answer ? `Cleared with ${answer}` : goal.description));
    button.addEventListener('click', () => {
      chosen = goal.id;
      status('word-status', '');
      renderGoals();
      updateTiles();
      wordInput.focus();
    });
    return button;
  }));
  wordInput.disabled = !chosen;
  byId('clear-word').disabled = !chosen;
}

function renderRack() {
  rack.replaceChildren(...[...state.letters].map(letter => {
    const button = node('button', '', 'tile');
    button.type = 'button';
    button.dataset.letter = letter;
    button.setAttribute('aria-label', `${letter}, ${TILE_VALUES[letter]} tile points`);
    button.append(document.createTextNode(letter), node('small', String(TILE_VALUES[letter])));
    button.addEventListener('click', () => {
      if (!chosen || wordInput.value.length >= state.letters.length) return;
      wordInput.value += letter;
      updateTiles();
      wordInput.focus();
    });
    return button;
  }));
}

function renderScoreboard() {
  const key = JSON.stringify([state.players, state.phase, state.host, state.you]);
  if (key === renderedRoster) return;
  renderedRoster = key;
  const lobby = state.phase === 'lobby';
  byId('score-title').textContent = lobby ? `Players (${state.players.length}/12)` : 'Scoreboard';
  let rank = 0;
  let lastScore = null;
  byId('scoreboard').replaceChildren(...state.players.map((player, index) => {
    if (player.score !== lastScore) rank = index + 1;
    lastScore = player.score;
    const item = node('li');
    const identity = node('span', '', 'player-name');
    identity.append(node('strong', player.name + (player.id === state.you ? ' (you)' : '')));
    const detail = player.left ? 'Left room' : [
      player.id === state.host ? 'Host' : '',
      state.phase === 'playing' ? `${player.progress}/3 goals` : '',
    ].filter(Boolean).join(' · ');
    if (detail) identity.append(node('small', detail));
    item.append(node('span', String(lobby ? index + 1 : rank), 'rank'), identity, node('span', lobby ? '' : `${player.score} pts`));
    return item;
  }));
}

function renderReview() {
  byId('answers').replaceChildren(...state.players.map(player => {
    const card = node('article', '', 'answer-card');
    card.append(node('strong', player.name));
    for (const goal of state.goals) card.append(node('p', `${goal.title}: ${player.answers?.[goal.id] || 'Missed'}`));
    return card;
  }));
  byId('examples').replaceChildren(...state.goals.map(goal => node('li', `${goal.title}: ${goal.example}`)));
}

function renderTime() {
  if (!state || !['countdown','playing'].includes(state.phase)) return;
  const countdown = state.phase === 'countdown';
  const remaining = Math.max(0, Math.ceil((Date.parse(countdown ? state.startsAt : state.endsAt) - Date.now() - offset) / 1000));
  const label = countdown ? String(remaining) : `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2,'0')}`;
  if (byId('timer').textContent !== label) byId('timer').textContent = label;
  byId('timer-wrap').classList.toggle('urgent', !countdown && remaining <= 10);
}

function show(snapshot) {
  const wasInRoom = Boolean(state);
  state = snapshot;
  byId('room-code').textContent = state.room;
  byId('entry').hidden = true;
  byId('room').hidden = false;
  renderScoreboard();

  const { phase } = state;
  const isHost = state.host === state.you;
  const activeCount = state.players.filter(player => !player.left).length;
  const playing = phase === 'playing';
  const review = phase === 'review' || phase === 'finished';
  const view = `${state.round}:${state.startsAt}:${phase}`;
  const viewChanged = view !== roundView;
  if (viewChanged) {
    roundView = view;
    chosen = state.goals.find(goal => !state.myAnswers[goal.id])?.id || '';
    wordInput.value = '';
    status('word-status', '');
    if (playing) renderRack();
    if (review) renderReview();
  }
  if (playing && (!chosen || state.myAnswers[chosen])) {
    chosen = state.goals.find(goal => !state.myAnswers[goal.id])?.id || '';
  }
  if (playing) {
    renderGoals();
    updateTiles();
  }

  const leaderScore = state.players[0]?.score;
  const leaders = state.players.filter(player => player.score === leaderScore).map(player => player.name);
  const titles = {
    lobby: 'Lobby', countdown: `Round ${state.round} of ${state.rounds}`, playing: `Round ${state.round} of ${state.rounds}`,
    review: `Round ${state.round} results`, finished: 'Final scores',
  };
  byId('stage-title').textContent = titles[phase];
  const message = {
    lobby: activeCount < 2 ? 'Share the room code. The game needs at least two players.' :
      isHost ? `${state.rounds} rounds · ${state.seconds} seconds per round. Start when everyone is ready.` : 'Waiting for the host to start the game.',
    countdown: 'Get ready. Everyone’s letters appear when the countdown ends.',
    playing: chosen ? 'Select a goal, then spell a word with the letters below.' : 'All three goals cleared. The round ends when time runs out.',
    review: isHost ? 'Review the answers, then start the next round.' : 'Waiting for the host to start the next round.',
    finished: leaders.length > 1 ? `${leaders.join(', ')} tie with ${leaderScore} points.` : `${leaders[0]} wins with ${leaderScore} points.`,
  };
  if (byId('stage-message').textContent !== message[phase]) byId('stage-message').textContent = message[phase];
  byId('playing').hidden = !playing;
  byId('review').hidden = !review;
  byId('timer-wrap').hidden = !playing && phase !== 'countdown';
  byId('timer-label').textContent = phase === 'countdown' ? 'Starts in' : 'Time left';
  renderTime();

  const hostActions = { lobby: ['start','Start game'], review: ['next','Next round'], finished: ['rematch','Play again'] };
  const hostAction = hostActions[phase];
  start.hidden = !isHost || !hostAction;
  start.disabled = busy || (phase !== 'review' && activeCount < 2);
  if (hostAction) {
    start.dataset.action = hostAction[0];
    if (start.textContent !== hostAction[1]) start.textContent = hostAction[1];
  }
  if (!wasInRoom || (viewChanged && phase === 'countdown')) byId('stage-title').focus();
}

function schedule() {
  clearTimeout(timer);
  if (session) timer = setTimeout(poll, state?.phase === 'countdown' ? 550 : 1850);
}

async function poll() {
  if (busy || !session) { schedule(); return; }
  const requested = version;
  try {
    const snapshot = await call('state');
    if (requested !== version || !session) return;
    if (byId('room-status').dataset.network === 'true') {
      delete byId('room-status').dataset.network;
      status('room-status', '');
    }
    show(snapshot);
  } catch (error) {
    if (requested !== version) return;
    if (error.code === 'room' || error.code === 'session') {
      clearSeat();
      status('entry-status', error.message);
    } else {
      byId('room-status').dataset.network = 'true';
      status('room-status', 'Connection interrupted. Reconnecting…');
    }
  } finally {
    schedule();
  }
}

async function interact(action, params, statusId) {
  if (busy) return;
  busy = true;
  version++;
  status(statusId, '');
  const entryButtons = [...document.querySelectorAll('#entry form button')];
  for (const button of [...entryButtons, start, byId('leave'), byId('submit-word')]) button.disabled = true;
  try {
    const response = await call(action, params);
    if (action === 'leave') { clearSeat(); return; }
    if (action === 'create' || action === 'join') remember(response.room, params.name);
    if (action === 'submit') {
      wordInput.value = '';
      status(statusId, `${params.word} accepted. +100 points.`);
    }
    show(response);
    if (action === 'submit' && chosen) wordInput.focus();
  } catch (error) {
    status(statusId, error instanceof RoomError ? error.message : 'Could not reach the room. Try again.');
  } finally {
    busy = false;
    for (const button of [...entryButtons, byId('leave')]) button.disabled = false;
    if (state) show(state);
    schedule();
  }
}

function nicknameValue() {
  if (nickname.value.trim()) return nickname.value.trim();
  nickname.reportValidity();
  nickname.focus();
  status('entry-status', 'Enter a nickname to continue.');
  return '';
}

byId('create-form').addEventListener('submit', event => {
  event.preventDefault();
  const name = nicknameValue();
  if (name) interact('create', { name, rounds: byId('round-setting').value, seconds: byId('time-setting').value }, 'entry-status');
});
byId('join-form').addEventListener('submit', event => {
  event.preventDefault();
  const name = nicknameValue();
  if (name) interact('join', { name, code: cleanCode(joinCode.value) }, 'entry-status');
});
joinCode.addEventListener('input', () => { joinCode.value = cleanCode(joinCode.value); });
start.addEventListener('click', () => interact(start.dataset.action, {}, 'room-status'));
byId('leave').addEventListener('click', () => interact('leave', {}, 'room-status'));
byId('invite').addEventListener('click', async () => {
  const invite = new URL(location.pathname, location.origin);
  invite.searchParams.set('room', state.room);
  try {
    await navigator.clipboard.writeText(invite.href);
    status('room-status', 'Invite link copied.');
  } catch {
    status('room-status', `Share room code ${state.room}.`);
  }
});
wordInput.addEventListener('input', () => {
  wordInput.value = cleanWord(wordInput.value);
  status('word-status', '');
  updateTiles();
});
byId('clear-word').addEventListener('click', () => {
  wordInput.value = '';
  status('word-status', '');
  updateTiles();
  wordInput.focus();
});
byId('word-form').addEventListener('submit', event => {
  event.preventDefault();
  const word = cleanWord(wordInput.value);
  if (state.phase === 'playing' && chosen && word.length >= 3) {
    interact('submit', { word, goal: chosen, round: state.round }, 'word-status');
  }
});
document.querySelector('.rules-link').addEventListener('click', () => { byId('rules').open = true; });
setInterval(renderTime, 200);

joinCode.value = initialCode;
try {
  const saved = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
  if (saved && typeof saved.token === 'string' && (!initialCode || saved.room === initialCode)) {
    session = saved;
    token = saved.token;
    nickname.value = saved.name;
    joinCode.value = saved.room;
    status('entry-status', 'Reconnecting to the room…');
    poll();
  }
} catch {}
