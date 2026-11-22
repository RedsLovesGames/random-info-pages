import parseMidi from './vendor/midi-parser.mjs';

export const LANES = [
  {label:'Kick', note:36, channel:9}, {label:'Snare', note:38, channel:9},
  {label:'Hi-hat', note:42, channel:9}, {label:'C4', note:60},
  {label:'D4', note:62}, {label:'E4', note:64}, {label:'G4', note:67}, {label:'A4', note:69},
];

export function noteName(note) {
  const names = ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
  return names[note % 12] + (Math.floor(note / 12) - 1);
}

export function midiPayload(bytes) {
  const label = i => String.fromCharCode(...bytes.subarray(i, i + 4));
  if (label(0) === 'MThd') return bytes;
  if (label(0) !== 'RIFF' || label(8) !== 'RMID') return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const size = view.getUint32(offset + 4, true);
    const end = offset + 8 + size;
    if (end > bytes.length) break;
    if (label(offset) === 'data') return bytes.subarray(offset + 8, end);
    offset = end + size % 2;
  }
  throw new Error('The MIDI container is incomplete.');
}

export function decodeMidi(input) {
  try {
    const bytes = midiPayload(input);
    if (!bytes || bytes.length < 14) throw new Error('Missing MIDI header');
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const headerLength = view.getUint32(4);
    const count = view.getUint16(10);
    const division = view.getUint16(12);
    if (headerLength < 6 || !count || !division) throw new Error('Invalid header');
    // Use the declared chunk boundaries before handing event data to the parser.
    let offset = headerLength + 8;
    const chunks = [bytes.subarray(0, offset)];
    while (offset + 8 <= bytes.length && chunks.length <= count) {
      const size = view.getUint32(offset + 4);
      const end = offset + 8 + size;
      if (end > bytes.length) throw new Error('Truncated track');
      if (view.getUint32(offset) === 0x4d54726b) chunks.push(bytes.subarray(offset, end));
      offset = end;
    }
    if (chunks.length !== count + 1) throw new Error('Missing tracks');
    const clean = new Uint8Array(chunks.reduce((size, chunk) => size + chunk.length, 0));
    offset = 0;
    for (const chunk of chunks) {
      clean.set(chunk, offset);
      offset += chunk.length;
    }
    const {header, tracks} = parseMidi(clean);
    if (header.format > 2 || (header.format === 0 && tracks.length !== 1)) throw new Error('Unknown MIDI format');
    if (header.framesPerSecond && (![24, 25, 29, 30].includes(header.framesPerSecond) || !header.ticksPerFrame)) {
      throw new Error('Invalid SMPTE timing');
    }
    const stamped = tracks.map((track, trackIndex) => {
      let tick = 0;
      return track.map(event => ({...event, tick:tick += event.deltaTime, track:trackIndex}));
    });
    const pieces = header.format === 2 ? stamped : [stamped.flat().sort((a,b) => a.tick - b.tick)];
    const events = [];
    let duration = 0;
    for (const piece of pieces) {
      const result = convertTracks(piece, header, duration);
      for (const note of result.events) events.push(note);
      duration = result.end;
    }
    if (!events.length) throw new Error('No playable MIDI notes');
    return {events, duration, tracks:tracks.length};
  } catch (problem) {
    throw new Error('Could not read this MIDI file. ' + (problem?.message || String(problem)));
  }
}

function convertTracks(events, header, offset) {
  let tick = 0, time = offset, tempo = 500000;
  const secondsPerFrame = header.framesPerSecond === 29 ? 1001 / 30000 : 1 / header.framesPerSecond;
  const programs = new Uint8Array(16);
  const pedals = Array.from({length:16}, () => ({down:false, notes:[]}));
  const active = new Map();
  const notes = [];
  const finish = (note, end) => { note.duration = Math.max(.025, end - note.time); };
  for (const event of events) {
    const unit = header.ticksPerBeat ? tempo / (1e6 * header.ticksPerBeat) : secondsPerFrame / header.ticksPerFrame;
    time += (event.tick - tick) * unit;
    tick = event.tick;
    const {channel, noteNumber, velocity} = event;
    if (event.type === 'setTempo' && event.microsecondsPerBeat > 0) tempo = event.microsecondsPerBeat;
    if (event.type === 'programChange') programs[channel] = event.programNumber;
    if (event.type === 'controller' && event.controllerType === 64) {
      const pedal = pedals[channel];
      pedal.down = event.value >= 64;
      if (!pedal.down) {
        for (const note of pedal.notes) finish(note, time);
        pedal.notes.length = 0;
      }
    }
    if (event.type !== 'noteOn' && event.type !== 'noteOff') continue;
    const key = channel * 128 + noteNumber;
    if (event.type === 'noteOn' && velocity > 0) {
      const note = {time, duration:0, note:noteNumber, velocity:velocity / 127, channel, program:programs[channel], track:event.track};
      if (!active.has(key)) active.set(key, []);
      active.get(key).push(note);
      notes.push(note);
    } else {
      const held = active.get(key);
      if (!held?.length) continue;
      const note = held.shift();
      if (!held.length) active.delete(key);
      if (pedals[channel].down && channel !== 9) pedals[channel].notes.push(note);
      else finish(note, time);
    }
  }
  for (const group of [...active.values(), ...pedals.map(pedal => pedal.notes)]) {
    for (const note of group) finish(note, time);
  }
  return {events:notes, end:notes.reduce((end,note) => Math.max(end,note.time + note.duration), time)};
}

export function findMarbleHits(channels, sampleRate) {
  if (!channels.length || sampleRate <= 0) return [];
  const size = Math.max(1, Math.round(sampleRate * .014));
  const low = 1 - Math.exp(-2 * Math.PI * 210 / sampleRate);
  const mid = 1 - Math.exp(-2 * Math.PI * 1800 / sampleRate);
  const lowState = new Float64Array(channels.length);
  const midState = new Float64Array(channels.length);
  const levels = [[], [], []];
  for (let offset = 0; offset < channels[0].length; offset += size) {
    const end = Math.min(offset + size, channels[0].length);
    const sums = [0, 0, 0];
    for (let channel = 0; channel < channels.length; channel++) {
      const samples = channels[channel];
      let slow = lowState[channel], smooth = midState[channel];
      for (let i = offset; i < end; i++) {
        const sample = samples[i];
        slow += (sample - slow) * low;
        smooth += (sample - smooth) * mid;
        sums[0] += slow * slow;
        sums[1] += (smooth - slow) ** 2;
        sums[2] += (sample - smooth) ** 2;
      }
      lowState[channel] = slow;
      midState[channel] = smooth;
    }
    for (let band = 0; band < 3; band++) levels[band].push(Math.sqrt(sums[band] / ((end - offset) * channels.length)));
  }
  const hits = [];
  const divisions = [[0,1], [2,3,4,5], [6,7]];
  for (let band = 0; band < 3; band++) {
    const frames = levels[band];
    let peak = 0;
    for (const level of frames) peak = Math.max(peak,level);
    if (peak <= 1e-7) continue;
    const floor = peak * .022;
    const loudness = level => Math.log1p(level / floor);
    let baseline = 0, previous = 0, lastHit = -Infinity;
    const lanes = divisions[band];
    for (let i = 0; i < frames.length; i++) {
      const current = loudness(frames[i]);
      const rise = current - previous;
      const next = loudness(frames[i + 1] ?? 0) - current;
      if (frames[i] > floor && rise > Math.max(.18, baseline * 2.3) && rise >= next && i - lastHit >= 5) {
        const energy = Math.min(1, Math.sqrt(frames[i] / peak));
        const lane = lanes[Math.min(lanes.length - 1, Math.floor(energy * lanes.length))];
        hits.push({time:Math.max(0, (i - .25) * size / sampleRate), lane, velocity:energy});
        lastHit = i;
      }
      baseline = baseline * .9 + Math.max(0, rise) * .1;
      previous = current;
    }
  }
  return hits.sort((a,b) => a.time - b.time);
}

export function buildPattern({bpm,rows,rails,tuning}) {
  const step = 15 / bpm;
  const events = [];
  for (let i=0; i<16; i++) {
    rows.forEach((bits,lane) => {
      if (!(bits & (1 << i))) return;
      const {note,channel=0} = LANES[lane];
      events.push({time:i * step, duration:.18, lane, note:tuning?.[lane] ?? note, channel, velocity:.78, program:12});
    });
  }
  return {duration:16 * step, events, rails, tuning};
}

export function encodePattern({bpm,rows,rails,tuning}) {
  const gates = bpm + ':' + rows.map(row => row.toString(16).padStart(4,'0')).join('');
  if (!rails && !tuning) return gates;
  const paths = rails || Array(LANES.length).fill(0);
  const pitches = tuning || LANES.map(lane => lane.note);
  return gates + '~' + paths.join('') + '~' + pitches.slice(3).map(note => note.toString(16).padStart(2,'0')).join('');
}

export function decodePattern(fragment) {
  const match = /^([0-9]{2,3}):([a-f0-9]{32})(?:~([012]{8})~([a-f0-9]{10}))?$/i.exec(fragment);
  if (!match) return null;
  const bpm = Number(match[1]);
  if (bpm < 40 || bpm > 240) return null;
  const result = {bpm, rows:match[2].match(/.{4}/g).map(bits => parseInt(bits,16))};
  if (match[3]) {
    const notes = match[4].match(/../g).map(note => parseInt(note,16));
    if (notes.some(note => note < 48 || note > 84)) return null;
    result.rails = Array.from(match[3],Number);
    result.tuning = LANES.slice(0,3).map(lane => lane.note).concat(notes);
  }
  return result;
}

export function lowerBound(events, time) {
  let start = 0, end = events.length;
  while (start < end) {
    const middle = (start + end) >>> 1;
    if (events[middle].time < time) start = middle + 1;
    else end = middle;
  }
  return start;
}
