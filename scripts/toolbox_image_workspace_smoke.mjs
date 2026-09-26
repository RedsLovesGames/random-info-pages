import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.TOOLBOX_BASE || 'http://127.0.0.1:8000';
const tinyPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error));
  await page.goto(`${base}/tools/image/`, { waitUntil: 'domcontentloaded' });
  await page.locator('#imageToolGrid').waitFor({ state: 'visible' });
  assert.ok(await page.locator('#imageSourceHeader').isHidden(), 'source header should start hidden');

  await page.locator('#picker').setInputFiles({ name: 'tiny.png', mimeType: 'image/png', buffer: tinyPng });
  await page.locator('#imageSourceHeader').waitFor({ state: 'visible' });
  assert.ok(await page.locator('#drop').isHidden(), 'drop zone should collapse once a source is loaded');
  assert.match(await page.locator('#imageSourceName').innerText(), /tiny\.png/i);

  await page.locator('[data-image-tool="resize"]').click();
  await page.locator('#imageSettingsDrawer').waitFor({ state: 'visible' });
  assert.match(await page.locator('#imageSettingsTitle').innerText(), /resize/i);

  await page.evaluate(() => {
    const raw = atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=');
    const bytes = Uint8Array.from(raw, char => char.charCodeAt(0));
    const edited = new File([bytes], 'tiny-crop.png', { type: 'image/png', lastModified: Date.now() });
    window.ImageStudioApp.applyWorkingFile(edited);
  });
  await page.waitForFunction(() => window.ImageStudioWorkspace?.getHistory?.()?.entries?.length === 2);
  assert.equal(await page.evaluate(() => window.ImageStudioApp.getSelectedItem().workingFile?.name), 'tiny-crop.png');

  await page.locator('#imageUndo').click();
  await page.waitForFunction(() => window.ImageStudioApp.getSelectedItem().workingFile == null);
  assert.equal(await page.evaluate(() => window.ImageStudioWorkspace.getHistory().index), 0);

  await page.locator('#imageRedo').click();
  await page.waitForFunction(() => window.ImageStudioApp.getSelectedItem().workingFile?.name === 'tiny-crop.png');
  assert.equal(await page.evaluate(() => window.ImageStudioWorkspace.getHistory().index), 1);

  await page.locator('#processSelected').click();
  await page.waitForFunction(() => document.querySelector('.status-dot.done') || document.querySelector('#status')?.classList.contains('error'), null, { timeout: 10000 });
  const status = await page.locator('#status').innerText();
  assert.doesNotMatch(status, /error|could not|unsupported/i, `image processing failed: ${status}`);
  await page.locator('#downloadSelected').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#downloadSelected').isDisabled(), false, 'selected result should be downloadable');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#downloadSelected').click(),
  ]);
  assert.match(download.suggestedFilename(), /tiny-crop/i);
  assert.equal(errors.length, 0, `image workspace page errors:\n${errors.map(error => error.stack || error.message).join('\n')}`);
  await page.close();

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobile.goto(`${base}/tools/image/`, { waitUntil: 'domcontentloaded' });
  const dims = await mobile.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  assert.ok(dims.scrollWidth <= dims.clientWidth + 2, `mobile image workspace overflows: ${dims.scrollWidth} > ${dims.clientWidth}`);
  await mobile.close();

  console.log('PASS Image Studio persistent workspace upload/edit/history/export smoke');
} finally {
  await browser.close();
}
