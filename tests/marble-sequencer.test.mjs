import test from 'node:test';
import assert from 'node:assert/strict';
import {decodeMidi, findMarbleHits, encodePattern, decodePattern, buildPattern, LANES} from '../marble-sequencer/music.mjs';

const chunk = (label, bytes) => [
  ...Buffer.from(label), (bytes.length >>> 24) & 255, (bytes.length >>> 16) & 255,
  (bytes.length >>> 8) & 255, bytes.length & 255, ...bytes
];
const track = bytes => chunk('MTrk', [...bytes, 0, 255, 47, 0]);
const midi = (format, division, ...tracks) => Uint8Array.from([
  ...chunk('MThd', [0, format, 0, tracks.length, division >>> 8, division & 255]), ...tracks.flat()
]);
const tempo = [0, 255, 81, 3, 15, 66, 64];

test('MIDI timing follows the shared tempo track and controller sustain', () => {
  const notes = track([
    0, 192, 9, 0, 144, 60, 100, 0, 176, 64, 127,
    96, 128, 60, 0, 96, 176, 64, 0, 0, 153, 36, 110, 12, 137, 36, 0
  ]);
  const song = decodeMidi(midi(1, 96, track(tempo), notes));
  assert.equal(song.events.length, 2);
  assert.deepEqual(song.events.map(({time, duration, note, program, channel}) => ({time, duration, note, program, channel})), [
    {time: 0, duration: 2, note: 60, program: 9, channel: 0},
    {time: 2, duration: .125, note: 36, program: 0, channel: 9},
  ]);
});

test('MIDI supports sequential type 2 and SMPTE timing', () => {
  const chord = track([0, 144, 64, 100, 96, 128, 64, 0]);
  assert.deepEqual(decodeMidi(midi(2, 96, chord, chord)).events.map(n => n.time), [0, .5]);
  const fixed = track([0, 144, 64, 100, 100, 128, 64, 0]);
  assert.equal(decodeMidi(midi(0, 0xe728, fixed)).events[0].duration, .1);
});

test('invalid inputs are rejected and valid RMID containers unwrap MIDI', () => {
  assert.throws(() => decodeMidi(Uint8Array.of(0, 1, 2)), /MIDI/);
  assert.throws(() => decodeMidi(midi(0, 96, track([0, 144, 60])).slice(0, -4)), /MIDI/);
  const song = midi(0, 96, track([0, 144, 64, 100, 96, 128, 64, 0]));
  const data = Buffer.alloc(20);
  data.write('RIFF', 0);
  data.writeUInt32LE(12 + song.length, 4);
  data.write('RMIDdata', 8);
  data.writeUInt32LE(song.length, 16);
  assert.equal(decodeMidi(Buffer.concat([data, song])).events[0].note, 64);
});

test('audio analysis follows impulses, includes both channels, and ignores silence', () => {
  const rate = 12000, left = new Float32Array(rate), right = new Float32Array(rate);
  for (const time of [.17, .41, .72]) {
    const start = Math.round(time * rate);
    for (let i = 0; i < 170; i++) {
      const value = Math.sin(i * .35) * (1 - i / 170);
      left[start + i] = value;
      right[start + i] = -value;
    }
  }
  const events = findMarbleHits([left, right], rate);
  for (const time of [.17, .41, .72]) assert.ok(events.some(hit => Math.abs(hit.time - time) < .03));
  assert.deepEqual(findMarbleHits([new Float32Array(rate)], rate), []);
});

test('a shared loop restores its exact gates and playback tempo', () => {
  const rows = Array(LANES.length).fill(0);
  rows[1] = 5;
  rows[3] = 32768;
  const input = {bpm: 100, rows};
  const encoded = encodePattern(input);
  assert.deepEqual(decodePattern(encoded), input);
  assert.equal(decodePattern('120:aa'), null);
  const pattern = buildPattern(input);
  assert.equal(pattern.duration, 2.4);
  assert.deepEqual(pattern.events.map(hit => hit.time), [0, .3, 2.25]);
});

test('custom ramps and bar pitches are preserved in a shared loop', () => {
  const pattern = {
    bpm:104, rows:[0,0,0,1,0,0,0,0],
    rails:[0,1,2,0,2,1,2,0], tuning:[36,38,42,70,62,64,67,69]
  };
  assert.deepEqual(decodePattern(encodePattern(pattern)), pattern);
  const song = buildPattern(pattern);
  assert.equal(song.events[0].note,70);
  assert.deepEqual(song.rails,pattern.rails);
});
