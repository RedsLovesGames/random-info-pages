import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const filesUrl = new URL('../tools/files/index.html', import.meta.url);
const mediaUrl = new URL('../tools/media/index.html', import.meta.url);

test('File & Archive Lab page exists', () => assert.equal(existsSync(filesUrl), true));
test('Media Studio page exists', () => assert.equal(existsSync(mediaUrl), true));

const filesHtml = existsSync(filesUrl) ? readFileSync(filesUrl, 'utf8') : '';
const mediaHtml = existsSync(mediaUrl) ? readFileSync(mediaUrl, 'utf8') : '';

for (const token of ['filesDrop','filesPicker','fileList','renameFiles','hashFiles','findDuplicates','archiveFiles','inspectFile','downloadFiles','files-app.js']) {
  test(`File Lab exposes ${token}`, () => assert.match(filesHtml, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))));
}

for (const token of ['mediaDrop','mediaPicker','mediaPreview','mediaTimeline','trimMedia','convertMedia','extractAudio','recordMedia','toneGenerator','inspectMedia','media-app.js']) {
  test(`Media Studio exposes ${token}`, () => assert.match(mediaHtml, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))));
}
