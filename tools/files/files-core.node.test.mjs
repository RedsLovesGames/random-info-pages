import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRenamePlan, groupDuplicateRecords, sanitizeFilename, sniffFileType, toHexPreview } from './files-core.js';

test('sanitizeFilename removes path/control characters', () => {
  assert.equal(sanitizeFilename(' ../bad\\name\u0000.txt '), '.._bad_name_.txt');
});

test('buildRenamePlan applies find replace, case, prefix suffix and numbering', () => {
  const plan = buildRenamePlan([{ id: 1, name: 'IMG_cat.JPG' }, { id: 2, name: 'IMG_dog.JPG' }], {
    find: 'IMG_', replace: '', caseMode: 'lower', prefix: 'trip-', suffix: '-edited', numbering: true, numberStart: 3, numberPad: 2,
  });
  assert.deepEqual(plan.map(x => x.outputName), ['03-trip-cat-edited.jpg', '04-trip-dog-edited.jpg']);
});

test('duplicate grouping requires equal size and hash', () => {
  const groups = groupDuplicateRecords([
    { id: 'a', size: 10, hash: 'aaa' }, { id: 'b', size: 10, hash: 'aaa' }, { id: 'c', size: 11, hash: 'aaa' }, { id: 'd', size: 10, hash: 'bbb' },
  ]);
  assert.deepEqual(groups.map(g => g.map(x => x.id)), [['a', 'b']]);
});

test('sniffFileType recognizes common signatures', () => {
  assert.equal(sniffFileType(new Uint8Array([0x50,0x4b,0x03,0x04])), 'ZIP archive');
  assert.equal(sniffFileType(new Uint8Array([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])), 'PNG image');
});

test('toHexPreview formats bytes compactly', () => {
  assert.equal(toHexPreview(new Uint8Array([0,15,16,255])), '00 0f 10 ff');
});
