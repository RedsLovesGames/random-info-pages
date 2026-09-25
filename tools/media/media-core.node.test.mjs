import test from 'node:test';
import assert from 'node:assert/strict';
import { clampTrimRange, detectMediaKind, estimatePcmWavBytes, formatDuration, noteFrequency } from './media-core.js';

test('clampTrimRange constrains and orders trim points', () => {
  assert.deepEqual(clampTrimRange(-2, 99, 12.5), { start: 0, end: 12.5, duration: 12.5 });
  assert.deepEqual(clampTrimRange(9, 3, 12), { start: 3, end: 9, duration: 6 });
});

test('detectMediaKind uses MIME prefixes', () => {
  assert.equal(detectMediaKind({ type: 'audio/mpeg', name: 'x.mp3' }), 'audio');
  assert.equal(detectMediaKind({ type: 'video/mp4', name: 'x.mp4' }), 'video');
});

test('formatDuration produces clock text', () => {
  assert.equal(formatDuration(65.25), '01:05.250');
});

test('noteFrequency maps A4 and A5', () => {
  assert.equal(Math.round(noteFrequency('A4')), 440);
  assert.equal(Math.round(noteFrequency('A5')), 880);
});

test('estimatePcmWavBytes includes WAV header', () => {
  assert.equal(estimatePcmWavBytes(1, 48000, 2, 16), 192044);
});
