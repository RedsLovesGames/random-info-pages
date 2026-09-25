const assert = require('node:assert/strict');
let TextCore = {};
try { TextCore = require('./text-core.js'); } catch (_) {}

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}: ${error.message}`);
    process.exitCode = 1;
  }
}

test('counts unicode characters without splitting surrogate pairs', () => {
  const stats = TextCore.stats('Hi 👋\nworld');
  assert.equal(stats.characters, 10);
  assert.equal(stats.lines, 2);
  assert.equal(stats.words, 2);
});

test('collapse whitespace keeps line breaks but normalizes runs within lines', () => {
  assert.equal(TextCore.collapseWhitespace('  a   b  \n c\t\td '), 'a b\nc d');
});

test('remove blank lines removes whitespace-only lines', () => {
  assert.equal(TextCore.removeBlankLines('a\n \n\n b'), 'a\n b');
});

test('dedupe lines preserves first occurrence order', () => {
  assert.equal(TextCore.dedupeLines('b\na\nb\na\nc'), 'b\na\nc');
});

test('title and sentence case handle basic unicode words', () => {
  assert.equal(TextCore.titleCase('hello WORLD déjà VU'), 'Hello World Déjà Vu');
  assert.equal(TextCore.sentenceCase('HELLO WORLD. HOW ARE YOU?'), 'Hello world. How are you?');
});

test('strip list markers handles bullets and common numbering', () => {
  assert.equal(TextCore.stripListMarkers('- alpha\n* beta\n1. gamma\n2) delta'), 'alpha\nbeta\ngamma\ndelta');
});

test('list helpers trim, remove blanks and dedupe', () => {
  assert.deepEqual(TextCore.listItems('  a\n\n b \na', { dedupe: true }), ['a', 'b']);
});

test('list sorting is locale-aware and deterministic enough for ascii', () => {
  assert.equal(TextCore.sortLines('c\na\nb', 'asc'), 'a\nb\nc');
  assert.equal(TextCore.sortLines('c\na\nb', 'desc'), 'c\nb\na');
});

test('comma and newline conversion trims empty entries', () => {
  assert.equal(TextCore.separatorToLines('a, b,, c', ','), 'a\nb\nc');
  assert.equal(TextCore.linesToSeparator('a\n b\n\n c', ', '), 'a, b, c');
});
