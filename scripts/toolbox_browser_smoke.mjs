import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.TOOLBOX_BASE || 'http://127.0.0.1:8000';
const routes = [
  ['/', 'Random Info Pages'],
  ['/tools/', 'Toolbox'],
  ['/tools/time/', 'Time access'],
  ['/tools/image/', 'Image Studio'],
  ['/tools/money/', 'Money & Finance'],
  ['/tools/text/', 'Text Tools'],
];

const browser = await chromium.launch({ headless: true });

async function newCheckedPage(viewport) {
  const page = await browser.newPage({ viewport });
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error));
  return { page, pageErrors };
}

async function assertNoHorizontalOverflow(page, label) {
  const dimensions = await page.evaluate(() => {
    const clientWidth = document.documentElement.clientWidth;
    const describe = (element) => {
      const rect = element.getBoundingClientRect();
      return {
        tag: element.tagName.toLowerCase(),
        id: element.id || '',
        className: typeof element.className === 'string' ? element.className : '',
        text: (element.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 90),
        left: Math.round(rect.left * 10) / 10,
        right: Math.round(rect.right * 10) / 10,
        width: Math.round(rect.width * 10) / 10,
        scrollWidth: element.scrollWidth,
        clientWidth: element.clientWidth,
      };
    };
    const all = [...document.querySelectorAll('body *')];
    const offenders = all.map(describe)
      .filter(item => item.right > clientWidth + 2 || item.left < -2)
      .sort((a, b) => b.right - a.right)
      .slice(0, 8);
    const intrinsic = all.map(describe)
      .filter(item => item.scrollWidth > item.clientWidth + 2 && item.clientWidth > 0)
      .sort((a, b) => (b.scrollWidth - b.clientWidth) - (a.scrollWidth - a.clientWidth))
      .slice(0, 8);
    return {
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth,
      bodyScrollWidth: document.body.scrollWidth,
      bodyClientWidth: document.body.clientWidth,
      bodyRect: describe(document.body),
      offenders,
      intrinsic,
    };
  });
  const fmt = item => `${item.tag}${item.id ? `#${item.id}` : ''}${item.className ? `.${item.className.split(/\s+/).join('.')}` : ''} rect=[${item.left},${item.right}] box=${item.clientWidth}/${item.scrollWidth} ${item.text}`;
  const bounds = dimensions.offenders.map(fmt).join('\n');
  const intrinsic = dimensions.intrinsic.map(fmt).join('\n');
  const detail = `\nbody=${dimensions.bodyClientWidth}/${dimensions.bodyScrollWidth}`
    + (bounds ? `\nBounds offenders:\n${bounds}` : '')
    + (intrinsic ? `\nIntrinsic overflow:\n${intrinsic}` : '');
  assert.ok(dimensions.scrollWidth <= dimensions.clientWidth + 2, `${label} overflows horizontally: ${dimensions.scrollWidth} > ${dimensions.clientWidth}${detail}`);
}

async function assertNoPageErrors(pageErrors, label) {
  assert.equal(pageErrors.length, 0, `${label} page errors:\n${pageErrors.map(error => error.stack || error.message).join('\n')}`);
}

try {
  for (const [route, heading] of routes) {
    const { page, pageErrors } = await newCheckedPage({ width: 1280, height: 800 });
    await page.goto(`${base}${route}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(150);
    await assertNoHorizontalOverflow(page, `desktop ${route}`);
    assert.match(await page.locator('body').innerText(), new RegExp(heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), `${route} should contain ${heading}`);
    await assertNoPageErrors(pageErrors, `desktop ${route}`);
    await page.close();
  }

  {
    const { page, pageErrors } = await newCheckedPage({ width: 1280, height: 800 });
    await page.goto(`${base}/tools/`, { waitUntil: 'domcontentloaded' });
    await page.locator('#toolSearch').fill('image');
    const visibleCards = page.locator('.tb-card-shell:not([hidden])');
    await visibleCards.first().waitFor({ state: 'visible' });
    assert.equal(await visibleCards.count(), 1, 'tool search should filter to one Image Studio card');
    assert.match(await visibleCards.first().innerText(), /Image Studio/i);
    await assertNoPageErrors(pageErrors, 'toolbox search');
    await page.close();
  }

  {
    const { page, pageErrors } = await newCheckedPage({ width: 1280, height: 800 });
    await page.goto(`${base}/tools/time/`, { waitUntil: 'domcontentloaded' });
    await page.locator('#accessGate').waitFor({ state: 'visible' });
    assert.ok(await page.locator('#protectedTimeApp').isHidden(), 'time workspace should be hidden before login');
    await page.locator('#loginUsername').fill('tommy');
    await page.locator('#loginPassword').fill('wrong');
    await page.locator('#loginForm button[type="submit"]').click();
    await page.waitForFunction(() => /incorrect/i.test(document.querySelector('#loginMessage')?.textContent || ''));
    assert.ok(await page.locator('#protectedTimeApp').isHidden(), 'wrong credentials must keep the workspace hidden');
    await page.locator('#loginPassword').fill(String.fromCharCode(50, 51, 52, 53));
    await page.locator('#loginForm button[type="submit"]').click();
    await page.locator('#protectedTimeApp').waitFor({ state: 'visible' });
    assert.ok(await page.locator('#accessGate').isHidden(), 'login gate should hide after valid credentials');

    await page.locator('#mapView').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#locationCards .location-card').count(), 3, 'default map should group into three locations');
    assert.equal(await page.locator('#mapMarkers .map-marker').count(), 3, 'map should show one marker per grouped location');

    await page.locator('#addPerson').click();
    await page.locator('#personDialog').waitFor({ state: 'visible' });
    await page.locator('#personName').fill('Alex');
    await page.locator('#personCity').selectOption('philadelphia');
    await page.locator('#personAvailableStart').fill('09:00');
    await page.locator('#personAvailableEnd').fill('17:00');
    await page.locator('#personForm button[type="submit"]').click();
    await page.locator('#personDialog').waitFor({ state: 'hidden' });
    assert.equal(await page.locator('#locationCards .location-card').count(), 3, 'same-zone person should reuse an existing location group');
    assert.equal(await page.locator('#mapMarkers .map-marker').count(), 3, 'same-zone person should not create a duplicate marker');
    assert.match(await page.locator('#locationCards .location-card').first().innerText(), /Tommy[\s\S]*Alex|Alex[\s\S]*Tommy/i);

    await page.locator('#timelineSlider').evaluate(el => { el.value = '1440'; el.dispatchEvent(new Event('input', { bubbles: true })); });
    assert.match(await page.locator('#timelineLabel').innerText(), /\+1d/i);

    await page.locator('.time-view-tab[data-view="planner"]').click();
    await page.locator('#plannerView').waitFor({ state: 'visible' });
    assert.ok(await page.locator('#plannerGrid .planner-row').count() >= 4, 'planner should show every person');

    await page.locator('.time-view-tab[data-view="board"]').click();
    await page.locator('#boardView').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#peopleBoard .board-location').count(), 3, 'board should remain grouped by location');
    assert.ok(await page.locator('#peopleBoard [data-person-id]').count() >= 4, 'board should expose people inside groups');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('#protectedTimeApp').waitFor({ state: 'visible' });
    assert.match(await page.locator('#peopleBoard').innerText(), /Alex/i, 'grouped people should persist after reload');
    await page.locator('#logoutAccess').click();
    await page.locator('#accessGate').waitFor({ state: 'visible' });
    assert.ok(await page.locator('#protectedTimeApp').isHidden(), 'logout should hide the entire time workspace');
    await assertNoPageErrors(pageErrors, 'time map, grouping, planner, board, and authentication');
    await page.close();
  }

  {
    const { page, pageErrors } = await newCheckedPage({ width: 1280, height: 800 });
    await page.goto(`${base}/tools/text/`, { waitUntil: 'domcontentloaded' });
    await page.locator('#textInput').fill('  a   b  \n\n c\t\td ');
    await page.locator('[data-action="collapse"]').click();
    assert.equal(await page.locator('#textOutput').inputValue(), 'a b\n\nc d');
    assert.equal(await page.locator('#wordCount').innerText(), '4');
    await page.locator('#listMode').click();
    await page.locator('#textInput').fill('b\na\nb');
    await page.locator('[data-action="dedupe"]').click();
    assert.equal(await page.locator('#textOutput').inputValue(), 'b\na');
    await assertNoPageErrors(pageErrors, 'text tools interaction');
    await page.close();
  }

  {
    const { page, pageErrors } = await newCheckedPage({ width: 1280, height: 800 });
    await page.goto(`${base}/tools/money/`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelector('#inflationEquivalent')?.textContent?.trim() !== '—', null, { timeout: 5000 });
    assert.match(await page.locator('#inflationEquivalent').innerText(), /\$/);
    assert.match(await page.locator('#inflationStatus').innerText(), /index/i);
    await assertNoPageErrors(pageErrors, 'money inflation interaction');
    await page.close();
  }

  {
    const { page, pageErrors } = await newCheckedPage({ width: 1280, height: 800 });
    await page.goto(`${base}/tools/image/`, { waitUntil: 'domcontentloaded' });
    const tinyPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
    await page.locator('#picker').setInputFiles({ name: 'tiny.png', mimeType: 'image/png', buffer: tinyPng });
    await page.locator('.queue-item').first().waitFor({ state: 'visible' });
    await page.locator('#processSelected').click();
    await page.waitForFunction(() => document.querySelector('.status-dot.done') || document.querySelector('#status')?.classList.contains('error'), null, { timeout: 8000 });
    const statusText = await page.locator('#status').innerText();
    assert.doesNotMatch(statusText, /error|could not|unsupported/i, `image conversion failed: ${statusText}`);
    assert.ok(await page.locator('.status-dot.done').count() >= 1, 'image conversion should complete');
    await assertNoPageErrors(pageErrors, 'image conversion interaction');
    await page.close();
  }

  {
    const { page, pageErrors } = await newCheckedPage({ width: 390, height: 844 });
    await page.goto(`${base}/tools/time/`, { waitUntil: 'domcontentloaded' });
    await page.locator('#accessGate').waitFor({ state: 'visible' });
    await page.locator('#loginUsername').fill('tommy');
    await page.locator('#loginPassword').fill(String.fromCharCode(50, 51, 52, 53));
    await page.locator('#loginForm button[type="submit"]').click();
    await page.locator('#protectedTimeApp').waitFor({ state: 'visible' });
    await page.locator('#mapView').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#locationCards .location-card').count(), 3, 'mobile map should render grouped locations');
    assert.equal(await page.locator('#mapMarkers .map-marker').count(), 3, 'mobile map should render one marker per group');
    await assertNoHorizontalOverflow(page, 'mobile authenticated Time map');

    await page.locator('.time-view-tab[data-view="planner"]').click();
    await page.locator('#plannerView').waitFor({ state: 'visible' });
    assert.ok(await page.locator('#plannerGrid .planner-row').count() >= 3, 'mobile planner should render people');
    await assertNoHorizontalOverflow(page, 'mobile authenticated Time planner');

    await page.locator('.time-view-tab[data-view="board"]').click();
    await page.locator('#boardView').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#peopleBoard .board-location').count(), 3, 'mobile board should remain grouped');
    await assertNoHorizontalOverflow(page, 'mobile authenticated Time board');
    await assertNoPageErrors(pageErrors, 'mobile authenticated Time workspace');
    await page.close();
  }

  for (const [route] of routes) {
    const { page, pageErrors } = await newCheckedPage({ width: 390, height: 844 });
    await page.goto(`${base}${route}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(150);
    await assertNoHorizontalOverflow(page, `mobile ${route}`);
    await assertNoPageErrors(pageErrors, `mobile ${route}`);
    await page.close();
  }

  console.log('PASS Chromium desktop/mobile Toolbox smoke checks and core interactions');
} finally {
  await browser.close();
}
