import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.TOOLBOX_BASE || 'http://127.0.0.1:8000';

async function noOverflow(page, label) {
  const dims = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  assert.ok(dims.scroll <= dims.client + 2, `${label} horizontal overflow: ${dims.scroll} > ${dims.client}`);
}

async function putArtifact(page, options) {
  return page.evaluate(async options => {
    const mod = await import('/tools/shared/artifacts.js');
    return mod.putArtifact(options);
  }, options);
}

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error));

  // Hub action search + keyboard command palette.
  await page.goto(`${base}/tools/`, { waitUntil: 'domcontentloaded' });
  await page.locator('#commandSearchButton').waitFor({ state: 'visible' });
  await page.locator('#toolSearch').fill('merge pdf');
  await page.locator('#toolActionResults').waitFor({ state: 'visible' });
  const mergeLink = page.locator('#toolActionResults a').filter({ hasText: 'Merge PDFs' }).first();
  assert.equal(await mergeLink.getAttribute('href'), './pdf/?action=merge');

  await page.keyboard.press('Control+K');
  await page.locator('#toolboxCommandPalette').waitFor({ state: 'visible' });
  await page.locator('#commandSearchInput').fill('base64');
  const base64Link = page.locator('#commandResults a').filter({ hasText: 'Base64' }).first();
  await base64Link.waitFor({ state: 'visible' });
  assert.equal(await base64Link.getAttribute('href'), './developer/?action=base64');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('#toolboxCommandPalette')?.open);

  // Artifact count and manual clear from command palette.
  const tempId = await putArtifact(page, { data: 'temporary', type: 'text/plain', name: 'temp.txt', sourceWorkspace: 'test' });
  assert.ok(tempId.startsWith('tb_'));
  await page.keyboard.press('Control+K');
  await page.locator('#clearToolboxArtifacts').waitFor({ state: 'visible' });
  assert.match(await page.locator('#clearToolboxArtifacts').innerText(), /1/);
  await page.locator('#clearToolboxArtifacts').click();
  const afterClear = await page.evaluate(async () => (await (await import('/tools/shared/artifacts.js')).listArtifacts()).length);
  assert.equal(afterClear, 0);
  await page.keyboard.press('Escape');

  // Direct receiver contract: a local temporary text artifact opens in Text Studio.
  const directTextId = await putArtifact(page, { data: 'Direct local handoff text', type: 'text/plain', name: 'direct.txt', sourceWorkspace: 'test' });
  await page.goto(`${base}/tools/text/?artifact=${encodeURIComponent(directTextId)}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#textInput')?.value === 'Direct local handoff text');
  assert.match(await page.locator('#textStatus').innerText(), /Opened direct\.txt/i);

  // PDF result producer -> Text Studio receiver. The PDF extraction implementation's
  // result markup is locked separately by the Step 10 interface contract; this keeps
  // the handoff smoke focused on the integration rather than PDF fixture parsing.
  await page.goto(`${base}/tools/pdf/`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    const panel = document.querySelector('#actionPanel');
    panel.hidden = false;
    panel.innerHTML = '<div class="pdf-panel-head"><strong>Extracted text</strong></div><div class="pdf-result" id="textResult">--- Page 1 ---\nHello Step 10</div><div class="pdf-actions-row"><button class="tb-toolbutton" id="copyText" type="button">Copy</button><button class="tb-toolbutton" id="downloadText" type="button">Download TXT</button></div>';
  });
  const pdfHandoff = page.getByRole('button', { name: 'Open in Text Studio' });
  await pdfHandoff.waitFor({ state: 'visible' });
  await Promise.all([
    page.waitForURL(/\/tools\/text\/\?artifact=/, { timeout: 10000 }),
    pdfHandoff.click(),
  ]);
  await page.waitForFunction(() => /Hello Step 10/.test(document.querySelector('#textInput')?.value || ''));

  // Data JSON producer -> Developer Lab receiver.
  await page.goto(`${base}/tools/data/`, { waitUntil: 'domcontentloaded' });
  await page.locator('#dataPicker').setInputFiles({
    name: 'people.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('name,score\nAda,10\nLin,20\n'),
  });
  await page.locator('#dataWorkspace').waitFor({ state: 'visible', timeout: 10000 });
  await page.locator('#exportData').click();
  const jsonHandoff = page.getByRole('button', { name: 'Open JSON in Developer Lab' });
  await jsonHandoff.waitFor({ state: 'visible' });
  await Promise.all([
    page.waitForURL(/\/tools\/developer\/\?artifact=.*action=json/, { timeout: 10000 }),
    jsonHandoff.click(),
  ]);
  await page.waitForFunction(() => /"name":\s*"Ada"/.test(document.querySelector('#developerInput')?.value || ''));
  assert.match(await page.locator('#developerInput').inputValue(), /"score": 10/);
  await page.locator('#developerActionPanel').waitFor({ state: 'visible' });
  assert.match(await page.locator('#developerActionPanel').innerText(), /JSON/i);

  // File metadata producer -> Data Studio receiver.
  await page.goto(`${base}/tools/files/`, { waitUntil: 'domcontentloaded' });
  await page.locator('#filesPicker').setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hello metadata') });
  await page.locator('#filesWorkspace').waitFor({ state: 'visible' });
  await page.locator('#inspectFile').click();
  const metadataHandoff = page.getByRole('button', { name: 'Open metadata in Data Studio' });
  await metadataHandoff.waitFor({ state: 'visible' });
  await Promise.all([
    page.waitForURL(/\/tools\/data\/\?artifact=/, { timeout: 10000 }),
    metadataHandoff.click(),
  ]);
  await page.locator('#dataWorkspace').waitFor({ state: 'visible', timeout: 10000 });
  assert.match(await page.locator('#dataTable').innerText(), /notes\.txt/i);
  assert.match(await page.locator('#dataTable').innerText(), /text\/plain/i);

  assert.equal(errors.length, 0, `Step 10 desktop page errors:\n${errors.map(error => error.stack || error.message).join('\n')}`);
  await page.close();

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const mobileErrors = [];
  mobile.on('pageerror', error => mobileErrors.push(error));
  await mobile.goto(`${base}/tools/`, { waitUntil: 'domcontentloaded' });
  await mobile.locator('#commandSearchButton').waitFor({ state: 'visible' });
  await mobile.keyboard.press('Control+K');
  await mobile.locator('#toolboxCommandPalette').waitFor({ state: 'visible' });
  await mobile.locator('#commandSearchInput').fill('subnet');
  await mobile.locator('#commandResults a').first().waitFor({ state: 'visible' });
  await noOverflow(mobile, 'Step 10 mobile command palette');
  assert.equal(mobileErrors.length, 0, `Step 10 mobile page errors: ${mobileErrors.map(error => error.message).join('; ')}`);
  await mobile.close();

  console.log('PASS Step 10 command search, artifact clear, PDF→Text, Data→Developer, File→Data, mobile smoke');
} finally {
  await browser.close();
}
