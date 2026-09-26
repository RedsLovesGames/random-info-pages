import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.TOOLBOX_BASE || 'http://127.0.0.1:8000';

function tinyPdf() {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>',
  ];
  let body = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(body, 'binary'));
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(body, 'binary');
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) body += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(body, 'binary');
}

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error));

  await page.goto(`${base}/tools/pdf/`, { waitUntil: 'domcontentloaded' });
  await page.locator('#pdfDrop').waitFor({ state: 'visible' });
  await page.locator('#pdfInput').setInputFiles({ name: 'tiny.pdf', mimeType: 'application/pdf', buffer: tinyPdf() });
  await page.locator('#pdfWorkspace').waitFor({ state: 'visible', timeout: 15000 });
  await page.locator('#pageRail .pdf-thumb').first().waitFor({ state: 'visible', timeout: 15000 });
  assert.equal(await page.locator('#pageRail .pdf-thumb').count(), 1, 'one-page source should render one thumbnail');
  assert.match(await page.locator('#sourceName').innerText(), /tiny\.pdf/i);

  await page.locator('[data-pdf-action="rotate"]').click();
  await page.waitForFunction(() => /90°/.test(document.querySelector('.pdf-thumb-label')?.textContent || ''));

  await page.locator('[data-pdf-action="duplicate"]').click();
  await page.waitForFunction(() => document.querySelectorAll('#pageRail .pdf-thumb').length === 2);
  assert.equal(await page.locator('#pageRail .pdf-thumb').count(), 2, 'duplicate should add a second working page');

  await page.locator('[data-pdf-action="page-numbers"]').click();
  await page.locator('#numbersForm').waitFor({ state: 'visible' });
  await page.locator('#numberStart').fill('3');
  await page.locator('#numbersForm button[type="submit"]').click();

  const downloadPromise = page.waitForEvent('download', { timeout: 20000 });
  await page.locator('#downloadPdf').click();
  const download = await downloadPromise;
  assert.match(download.suggestedFilename(), /tiny-edited\.pdf/i);
  const path = await download.path();
  assert.ok(path, 'edited PDF should produce a download file');

  await page.waitForTimeout(200);
  assert.equal(pageErrors.length, 0, `PDF page errors:\n${pageErrors.map(error => error.stack || error.message).join('\n')}`);

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const mobileErrors = [];
  mobile.on('pageerror', error => mobileErrors.push(error));
  await mobile.goto(`${base}/tools/pdf/`, { waitUntil: 'domcontentloaded' });
  const dims = await mobile.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  assert.ok(dims.scroll <= dims.client + 2, `mobile PDF page overflows: ${dims.scroll} > ${dims.client}`);
  assert.equal(mobileErrors.length, 0, `mobile PDF page errors: ${mobileErrors.map(error => error.message).join('; ')}`);
  await mobile.close();

  await page.close();
  console.log('PASS PDF upload-once workspace browser smoke');
} finally {
  await browser.close();
}
