import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.TOOLBOX_BASE || 'http://127.0.0.1:8000';
const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error));
  await page.goto(`${base}/tools/files/`, { waitUntil: 'domcontentloaded' });
  assert.ok(await page.locator('#filesWorkspace').isHidden(), 'File Lab should start empty');

  await page.locator('#filesPicker').setInputFiles([
    { name: 'IMG_alpha.txt', mimeType: 'text/plain', buffer: Buffer.from('same-content') },
    { name: 'IMG_beta.txt', mimeType: 'text/plain', buffer: Buffer.from('same-content') },
    { name: 'different.txt', mimeType: 'text/plain', buffer: Buffer.from('different') },
  ]);
  await page.locator('#filesWorkspace').waitFor({ state: 'visible' });
  assert.equal(await page.locator('.files-row').count(), 3);
  assert.match(await page.locator('#filesSummary').innerText(), /3 files/i);

  await page.locator('#renameFiles').click();
  await page.locator('#renameFind').fill('IMG_');
  await page.locator('#renamePrefix').fill('trip-');
  await page.locator('#renameCase').selectOption('lower');
  await page.locator('#applyRename').click();
  assert.match(await page.locator('#fileList').innerText(), /trip-alpha\.txt/i);

  await page.locator('#undoFiles').click();
  assert.match(await page.locator('#fileList').innerText(), /IMG_alpha\.txt/);
  await page.locator('#redoFiles').click();
  assert.match(await page.locator('#fileList').innerText(), /trip-alpha\.txt/i);

  await page.locator('#hashFiles').click();
  await page.waitForFunction(() => document.querySelector('#filesActionPanel')?.textContent?.includes('SHA-256 checksums'), null, { timeout: 10000 });
  const hashText = await page.locator('#filesActionPanel').innerText();
  assert.match(hashText, /[a-f0-9]{64}/i);

  await page.locator('#findDuplicates').click();
  await page.waitForFunction(() => document.querySelector('#filesActionPanel')?.textContent?.includes('Group 1'), null, { timeout: 10000 });
  assert.match(await page.locator('#filesActionPanel').innerText(), /trip-alpha\.txt/i);
  assert.match(await page.locator('#filesActionPanel').innerText(), /trip-beta\.txt/i);

  await page.locator('#inspectFile').click();
  await page.waitForFunction(() => document.querySelector('#filesActionPanel')?.textContent?.includes('First '));
  assert.match(await page.locator('#filesActionPanel').innerText(), /53 61 6d 65|73 61 6d 65/i);

  await page.locator('#archiveFiles').click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#createZip').click(),
  ]);
  assert.match(download.suggestedFilename(), /toolbox-files\.zip/i);
  assert.equal(errors.length, 0, `File Lab page errors:\n${errors.map(error => error.stack || error.message).join('\n')}`);
  await page.close();

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobile.goto(`${base}/tools/files/`, { waitUntil: 'domcontentloaded' });
  const dims = await mobile.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  assert.ok(dims.scrollWidth <= dims.clientWidth + 2, `mobile File Lab overflows: ${dims.scrollWidth} > ${dims.clientWidth}`);
  await mobile.close();

  console.log('PASS File & Archive Lab load/rename/history/hash/duplicate/inspect/archive smoke');
} finally {
  await browser.close();
}
