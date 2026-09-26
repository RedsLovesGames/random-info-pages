import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.TOOLBOX_BASE || 'http://127.0.0.1:8000';
const browser = await chromium.launch({ headless: true });

async function noOverflow(page, label) {
  const result = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  assert.ok(result.scroll <= result.client + 2, `${label} horizontal overflow ${result.scroll} > ${result.client}`);
}

async function openMode(page, action) {
  await page.goto(`${base}/tools/math/?action=${action}`, { waitUntil: 'domcontentloaded' });
  await page.locator(`[data-math-panel="${action}"]`).waitFor({ state: 'visible' });
  assert.equal(await page.locator(`[data-math-mode="${action}"]`).getAttribute('aria-pressed'), 'true');
}

try {
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = []; page.on('pageerror', error => errors.push(error));

    await openMode(page, 'calculator');
    assert.match(await page.locator('body').innerText(), /Math &\s*Science Lab/i);
    await page.locator('#calcExpression').fill('2^3 + sqrt(16)');
    await page.locator('#calculateExpression').click();
    assert.equal((await page.locator('#calcResult strong').innerText()).trim(), '12');
    await page.locator('#calcExpression').fill('-2^2');
    await page.locator('#calculateExpression').click();
    assert.equal((await page.locator('#calcResult strong').innerText()).trim(), '-4');

    await openMode(page, 'units');
    await page.locator('#unitFrom').selectOption('F');
    await page.locator('#unitTo').selectOption('C');
    await page.locator('#unitValue').fill('32');
    assert.match(await page.locator('#unitResult strong').innerText(), /^0\s*C$/i);

    await openMode(page, 'algebra');
    assert.match(await page.locator('#quadResult strong').innerText(), /x = 2.*x = 3/i);
    assert.match(await page.locator('#linearResult strong').innerText(), /x = 2.*y = 1/i);

    await openMode(page, 'graph');
    await page.locator('#graphExpression').fill('x^2');
    await page.locator('#graphMin').fill('-2');
    await page.locator('#graphMax').fill('2');
    assert.match(await page.locator('#graphStatus').innerText(), /y = x\^2/i);
    const painted = await page.locator('#graphCanvas').evaluate(canvas => {
      const ctx = canvas.getContext('2d');
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      for (let i = 3; i < data.length; i += 4) if (data[i] !== 0) return true;
      return false;
    });
    assert.equal(painted, true);

    await openMode(page, 'geometry');
    await page.locator('#geometryShape').selectOption('sphere');
    await page.locator('#geometryA').fill('2');
    assert.match(await page.locator('#geometryResult').innerText(), /volume: 33\.5/i);
    assert.match(await page.locator('#geometryResult').innerText(), /4\/3πr³/i);

    await openMode(page, 'physics');
    await page.locator('#physicsType').selectOption('velocity');
    await page.locator('#physicsA').fill('5');
    await page.locator('#physicsB').fill('2');
    await page.locator('#physicsC').fill('4');
    assert.match(await page.locator('#physicsResult strong').innerText(), /^13\s*m\/s$/i);
    assert.match(await page.locator('#physicsResult').innerText(), /v = u \+ at/i);

    await openMode(page, 'chemistry');
    await page.locator('#chemFormula').fill('Ca(OH)2');
    await page.locator('#chemMass').fill('74.092');
    assert.match(await page.locator('#chemMassResult strong').innerText(), /74\.09.*g\/mol/i);
    assert.match(await page.locator('#chemMassResult').innerText(), /n = m\/M/i);

    await openMode(page, 'electronics');
    await page.locator('#ohmVoltage').fill('12');
    await page.locator('#ohmCurrent').fill('');
    await page.locator('#ohmResistance').fill('6');
    assert.match(await page.locator('#ohmResult strong').innerText(), /2\s*A/i);
    assert.match(await page.locator('#ohmResult').innerText(), /V = IR/i);

    await openMode(page, 'grades');
    await page.locator('#currentGrade').fill('84');
    await page.locator('#currentWeight').fill('80');
    await page.locator('#targetGrade').fill('85');
    await page.locator('#finalWeight').fill('20');
    assert.match(await page.locator('#requiredFinalResult strong').innerText(), /^89(?:\.0+)?%$/);

    await noOverflow(page, 'Math Science desktop');
    assert.equal(errors.length, 0, errors.map(error => error.stack || error.message).join('\n'));
    await page.close();
  }

  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = []; page.on('pageerror', error => errors.push(error));
    await openMode(page, 'chemistry');
    await noOverflow(page, 'Math Science mobile chemistry');
    await openMode(page, 'graph');
    await noOverflow(page, 'Math Science mobile graph');
    assert.equal(errors.length, 0, errors.map(error => error.stack || error.message).join('\n'));
    await page.close();
  }

  console.log('PASS Step 8 Math & Science Lab calculator/units/algebra/graph/science/grades/mobile smoke');
} finally {
  await browser.close();
}