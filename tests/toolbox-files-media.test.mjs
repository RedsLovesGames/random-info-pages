import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const filesHtml = readFileSync(new URL('../tools/files/index.html', import.meta.url), 'utf8');
const mediaHtml = readFileSync(new URL('../tools/media/index.html', import.meta.url), 'utf8');

for (const token of ['filesDrop','filesPicker','fileList','renameFiles','hashFiles','findDuplicates','archiveFiles','inspectFile','downloadFiles','files-app.js']) {
  test(`File Lab exposes ${token}`, () => assert.match(filesHtml, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))));
}

for (const token of ['mediaDrop','mediaPicker','mediaPreview','mediaTimeline','trimMedia','convertMedia','extractAudio','recordMedia','toneGenerator','inspectMedia','media-app.js']) {
  test(`Media Studio exposes ${token}`, () => assert.match(mediaHtml, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))));
}
