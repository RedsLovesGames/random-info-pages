import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.TOOLBOX_BASE || 'http://127.0.0.1:8000';
const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error));
  await page.goto(`${base}/tools/data/`, { waitUntil: 'domcontentloaded' });
  assert.ok(await page.locator('#dataWorkspace').isHidden(), 'Data Studio should start empty');

  const csv = [
    'team,score,region',
    'A,10,East',
    'A,20,East',
    'A,20,East',
    'B,5,West',
  ].join('\n');
  await page.locator('#dataPicker').setInputFiles({ name: 'scores.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
  await page.locator('#dataWorkspace').waitFor({ state: 'visible' });
  await page.waitForFunction(() => document.querySelectorAll('#dataTable tbody tr').length === 4, null, { timeout: 15000 });
  assert.equal(await page.locator('#dataRows').innerText(), '4');
  assert.equal(await page.locator('#dataColumns').innerText(), '3');

  await page.locator('#dataSearch').fill('West');
  await page.waitForFunction(() => document.querySelectorAll('#dataTable tbody tr').length === 1);
  assert.match(await page.locator('#dataTableFooter').innerText(), /1 of 1 matching rows/i);
  await page.locator('#resetDataView').click();

  const firstScoreCell = page.locator('#dataTable tbody tr').nth(0).locator('td').nth(2);
  await firstScoreCell.click();
  await firstScoreCell.fill('15');
  await firstScoreCell.press('Enter');
  await page.waitForFunction(() => Number(document.querySelector('#dataSteps')?.textContent) >= 1);
  assert.equal(await page.locator('#dataTable tbody tr').nth(0).locator('td').nth(2).innerText(), '15');

  await page.locator('#cleanData').click();
  await page.locator('#cleanDedupe').click();
  await page.waitForFunction(() => document.querySelector('#dataRows')?.textContent === '3');
  assert.equal(await page.locator('#dataRows').innerText(), '3');
  await page.locator('#undoData').click();
  assert.equal(await page.locator('#dataRows').innerText(), '4');
  await page.locator('#redoData').click();
  assert.equal(await page.locator('#dataRows').innerText(), '3');

  await page.locator('#statisticsData').click();
  await page.locator('#runSummary').click();
  assert.match(await page.locator('#statsResults').innerText(), /Mean/i);

  await page.locator('#chartData').click();
  await page.locator('#chartType').selectOption('histogram');
  await page.locator('#chartX').selectOption('score');
  await page.locator('#renderChart').click();
  await page.locator('#dataChart svg').waitFor({ state: 'visible', timeout: 20000 });

  await page.locator('#sqlData').click();
  await page.locator('#sqlQuery').fill('SELECT team, SUM(score) AS total FROM data GROUP BY team ORDER BY team');
  await page.locator('#runSql').click();
  await page.waitForFunction(() => document.querySelector('#sqlStatus')?.textContent?.includes('rows'), null, { timeout: 25000 });
  assert.match(await page.locator('#sqlResults').innerText(), /total/i);
  assert.match(await page.locator('#sqlResults').innerText(), /A/);

  await page.locator('#exportData').click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('[data-export="csv"]').click(),
  ]);
  assert.match(download.suggestedFilename(), /scores\.csv/i);
  assert.equal(errors.length, 0, `Data Studio page errors:\n${errors.map(error => error.stack || error.message).join('\n')}`);
  await page.close();

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobile.goto(`${base}/tools/data/`, { waitUntil: 'domcontentloaded' });
  const dims = await mobile.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  assert.ok(dims.scrollWidth <= dims.clientWidth + 2, `mobile Data Studio overflows page: ${dims.scrollWidth} > ${dims.clientWidth}`);
  await mobile.close();

  console.log('PASS Data Studio CSV/edit/pipeline/stats/chart/SQL/export/mobile smoke');
} finally {
  await browser.close();
}
