import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../tools/image/index.html', import.meta.url), 'utf8');

test('image studio loads hardened local processing modules', () => {
  assert.match(html, /image-core\.js/);
  assert.match(html, /image-engine\.js/);
  assert.match(html, /image-app\.js/);
  assert.match(html, /image\.css/);
  assert.match(html, /LOCAL PROCESSING/i);
});

test('image studio exposes real batch controls', () => {
  assert.match(html, /id="processSelected"/);
  assert.match(html, /id="processAll"/);
  assert.match(html, /id="downloadAll"/);
  assert.match(html, /id="cancelBatch"/);
  assert.match(html, /id="queue"/);
});

test('image studio exposes robust resize and output controls', () => {
  assert.match(html, /id="resizeMode"/);
  assert.match(html, /id="preventUpscale"/);
  assert.match(html, /id="format"/);
  assert.match(html, /id="quality"/);
  assert.match(html, /id="width"/);
  assert.match(html, /id="height"/);
  assert.match(html, /id="percent"/);
});

test('image studio exposes optional target-size compression', () => {
  assert.match(html, /id="targetSizeEnabled"/);
  assert.match(html, /id="targetSize"/);
  assert.match(html, /id="targetUnit"/);
  assert.match(html, /id="preserveResolution"/);
});

test('image studio exposes a lazy crop editor', () => {
  assert.match(html, /id="cropSelected"/);
  assert.match(html, /id="resetCrop"/);
  assert.match(html, /id="cropDialog"/);
  assert.match(html, /id="cropRatio"/);
  assert.match(html, /id="applyCrop"/);
  assert.match(html, /id="cropRotateLeft"/);
  assert.match(html, /id="cropRotateRight"/);
  assert.match(html, /id="cropFlipX"/);
  assert.match(html, /id="cropFlipY"/);
  assert.match(html, /crop-editor\.js/);
});

test('image studio exposes still-image gif creation', () => {
  assert.match(html, /id="gifMaker"/);
  assert.match(html, /id="gifDialog"/);
  assert.match(html, /id="gifFrameList"/);
  assert.match(html, /id="gifWidth"/);
  assert.match(html, /id="gifHeight"/);
  assert.match(html, /id="gifFps"/);
  assert.match(html, /id="gifLoop"/);
  assert.match(html, /id="gifColors"/);
  assert.match(html, /id="gifCreate"/);
  assert.match(html, /id="gifDownload"/);
  assert.match(html, /gif-maker\.js/);
});

test('image studio exposes browser-native video to gif controls', () => {
  assert.match(html, /id="gifImagesMode"/);
  assert.match(html, /id="gifVideoMode"/);
  assert.match(html, /id="gifVideoPicker"/);
  assert.match(html, /id="gifChooseVideo"/);
  assert.match(html, /id="gifVideoPreview"/);
  assert.match(html, /id="gifVideoStart"/);
  assert.match(html, /id="gifVideoEnd"/);
  assert.match(html, /id="gifVideoMeta"/);
});

test('image studio exposes local ai background removal', () => {
  assert.match(html, /id="removeBgSelected"/);
  assert.match(html, /id="bgRemoveDialog"/);
  assert.match(html, /id="bgRemovePreview"/);
  assert.match(html, /id="bgRemoveRun"/);
  assert.match(html, /id="bgRemoveApply"/);
  assert.match(html, /id="bgRemoveDownload"/);
  assert.match(html, /id="bgRemoveStatus"/);
  assert.match(html, /bg-remove-core\.js/);
  assert.match(html, /bg-remove\.js/);
});
