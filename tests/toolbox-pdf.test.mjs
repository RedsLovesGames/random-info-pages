import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const pdfDir = new URL('../tools/pdf/', import.meta.url);
const indexUrl = new URL('index.html', pdfDir);
const coreUrl = new URL('pdf-core.js', pdfDir);
const engineUrl = new URL('pdf-engine.js', pdfDir);
const appUrl = new URL('pdf-app.js', pdfDir);

test('pdf workspace files exist', () => {
  for (const url of [indexUrl, coreUrl, engineUrl, appUrl]) {
    assert.equal(existsSync(url), true, `${url.pathname} should exist`);
  }
});

test('pdf workspace exposes upload-once workspace controls and contextual tools', () => {
  const html = readFileSync(indexUrl, 'utf8');
  for (const id of ['pdfDrop','pdfInput','pdfWorkspace','pageRail','pdfPreview','selectionBar','undoPdf','redoPdf','downloadPdf']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  for (const action of ['merge','split','reorder','rotate','delete','duplicate','extract','blank','page-numbers','watermark','pdf-images','extract-text','metadata']) {
    assert.match(html, new RegExp(`data-pdf-action="${action}"`));
  }
});

test('pdf core supports non-destructive page operations', async () => {
  const core = await import(pathToFileURL(coreUrl.pathname).href);
  let state = core.createPdfState(4);
  assert.deepEqual(state.pages.map(p => p.sourceIndex), [0,1,2,3]);

  state = core.rotatePages(state, [1,3], 90);
  assert.deepEqual(state.pages.map(p => p.rotation), [90,0,90,0]);

  state = core.duplicatePages(state, [2]);
  assert.equal(state.pages.length, 5);
  assert.equal(state.pages[2].sourceIndex, 1);

  state = core.movePages(state, [5], -4);
  assert.equal(state.pages[0].sourceIndex, 3);

  state = core.deletePages(state, [2,4]);
  assert.equal(state.pages.length, 3);
  assert.deepEqual(core.normalizeSelection([0,1,1,9,2], 3), [1,2]);
});

test('pdf workspace pins local browser engines and keeps dependency URLs in one module', () => {
  const engine = readFileSync(engineUrl, 'utf8');
  assert.match(engine, /pdf-lib@1\.17\.1/);
  assert.match(engine, /pdfjs-dist@6\.3\.289/);
  assert.match(engine, /PDFDocument/);
  assert.match(engine, /getDocument/);
});
