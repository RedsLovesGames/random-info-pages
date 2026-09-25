import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const TextCore = require('./text-core.js');

test('unicodeCleanup normalizes smart punctuation and invisible spacing', () => {
  assert.equal(TextCore.unicodeCleanup('“Hello”\u00a0world\u200b…'), '"Hello" world...');
});

test('replaceText supports literal and regex replacement', () => {
  assert.equal(TextCore.replaceText('cat CAT cat', 'cat', 'dog', { caseSensitive: false }), 'dog dog dog');
  assert.equal(TextCore.replaceText('a1 b22', '\\d+', '#', { regex: true }), 'a# b#');
});

test('analyzeText returns frequency and readability metrics', () => {
  const result = TextCore.analyzeText('The cat sat. The cat ran quickly.');
  assert.equal(result.sentences, 2);
  assert.equal(result.frequency[0].word, 'the');
  assert.equal(result.frequency[0].count, 2);
  assert.ok(Number.isFinite(result.readingMinutes));
  assert.ok(Number.isFinite(result.fleschReadingEase));
});

test('diffText identifies additions and removals', () => {
  const diff = TextCore.diffText('one\ntwo', 'one\nthree');
  assert.ok(diff.some(part => part.type === 'remove' && part.value === 'two'));
  assert.ok(diff.some(part => part.type === 'add' && part.value === 'three'));
});
