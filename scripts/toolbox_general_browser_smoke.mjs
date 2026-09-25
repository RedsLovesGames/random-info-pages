import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.TOOLBOX_BASE || 'http://127.0.0.1:8000';
const browser = await chromium.launch({ headless: true });

async function noOverflow(page, label) {
  const { scroll, client } = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  assert.ok(scroll <= client + 2, `${label} horizontal overflow ${scroll} > ${client}`);
}

async function assertNoErrors(errors, label) {
  assert.equal(errors.length, 0, `${label} page errors:\n${errors.map(error => error.stack || error.message).join('\n')}`);
}

try {
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = []; page.on('pageerror', error => errors.push(error));
    await page.goto(`${base}/tools/random/?action=pick`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-random-panel="pick"]').waitFor({ state: 'visible' });
    assert.match(await page.locator('body').innerText(), /Random &\s*Decision Lab/i);
    await page.locator('#randomInput').fill('Alpha | 2\nBeta\nGamma');
    await page.locator('#randomSeed').fill('repeatable');
    await page.locator('#runPick').click();
    const firstPick = (await page.locator('#randomResult').innerText()).trim();
    await page.locator('#runPick').click();
    const secondPick = (await page.locator('#randomResult').innerText()).trim();
    assert.equal(firstPick, secondPick, 'same seed should reproduce the same weighted pick');
    assert.match(firstPick, /Alpha|Beta|Gamma/);

    await page.locator('[data-random-mode="teams"]').click();
    await page.locator('#randomInput').fill('A\nB\nC\nD\nE\nF');
    await page.locator('#randomCount').fill('2');
    await page.locator('#runTeams').click();
    const teams = await page.locator('#randomResult').innerText();
    assert.match(teams, /Team 1/);
    assert.match(teams, /Team 2/);

    await page.locator('[data-random-mode="numbers"]').click();
    await page.locator('#numberMin').fill('1');
    await page.locator('#numberMax').fill('10');
    await page.locator('#numberCount').fill('5');
    await page.locator('#numberUnique').selectOption('true');
    await page.locator('#runNumbers').click();
    const generated = (await page.locator('#randomResult').innerText()).split(',').map(value => value.trim()).filter(Boolean);
    assert.equal(generated.length, 5);
    assert.equal(new Set(generated).size, 5);
    assert.equal(await page.locator('a.random-wheel-link').getAttribute('href'), '../../wheel/');
    await noOverflow(page, 'Random desktop');
    await assertNoErrors(errors, 'Random');
    await page.close();
  }

  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = []; page.on('pageerror', error => errors.push(error));
    await page.goto(`${base}/tools/codes/?action=password`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-codes-panel="password"]').waitFor({ state: 'visible' });
    assert.match(await page.locator('body').innerText(), /Codes &\s*Generator Lab/i);
    await page.locator('#passwordLength').fill('32');
    await page.locator('#generatePassword').click();
    assert.equal((await page.locator('#codesResult').innerText()).trim().length, 32);

    await page.locator('[data-codes-mode="uuid"]').click();
    await page.locator('#generateUuid').click();
    assert.match((await page.locator('#codesResult').innerText()).trim(), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    await page.locator('#tokenBytes').fill('16');
    await page.locator('#tokenFormat').selectOption('hex');
    await page.locator('#generateToken').click();
    assert.match((await page.locator('#codesResult').innerText()).trim(), /^[0-9a-f]{32}$/i);

    await page.locator('[data-codes-mode="qr"]').click();
    await page.locator('#qrType').selectOption('wifi');
    await page.locator('#qrPrimary').fill('LabNet');
    await page.locator('#qrExtra1').fill('correct-horse');
    await page.locator('#generateQr').click();
    await page.waitForFunction(() => document.querySelector('#codesResult')?.textContent?.startsWith('WIFI:'), null, { timeout: 15000 });
    assert.match(await page.locator('#codesResult').innerText(), /^WIFI:T:WPA;S:LabNet;P:correct-horse;;/);
    const canvasPainted = await page.locator('#codeCanvas').evaluate(canvas => {
      const context = canvas.getContext('2d');
      const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
      for (let index = 0; index < data.length; index += 4) {
        if (data[index] < 250 || data[index + 1] < 250 || data[index + 2] < 250) return true;
      }
      return false;
    });
    assert.equal(canvasPainted, true, 'QR canvas should contain rendered marks');
    await noOverflow(page, 'Codes desktop');
    await assertNoErrors(errors, 'Codes');
    await page.close();
  }

  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = []; page.on('pageerror', error => errors.push(error));
    await page.goto(`${base}/tools/network/?action=subnet`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-network-panel="subnet"]').waitFor({ state: 'visible' });
    assert.match(await page.locator('body').innerText(), /Network &\s*System Lab/i);
    await page.locator('#ipAddress').fill('192.168.1.130');
    await page.locator('#ipPrefix').fill('24');
    await page.locator('#calculateSubnet').click();
    let result = await page.locator('#networkResult').innerText();
    assert.match(result, /"network": "192\.168\.1\.0"/);
    assert.match(result, /"classification": "Private"/);

    await page.locator('#ipVersion').selectOption('6');
    await page.locator('#ipAddress').fill('2001:db8::1234');
    await page.locator('#ipPrefix').fill('64');
    await page.locator('#calculateSubnet').click();
    result = await page.locator('#networkResult').innerText();
    assert.match(result, /"network": "2001:db8::"/);
    assert.match(result, /Documentation/);

    await page.locator('[data-network-mode="transfer"]').click();
    await page.locator('#transferSize').fill('1');
    await page.locator('#transferSizeUnit').selectOption('GB');
    await page.locator('#transferSpeed').fill('100');
    await page.locator('#transferSpeedUnit').selectOption('Mbps');
    await page.locator('#calculateTransfer').click();
    assert.match(await page.locator('#networkResult').innerText(), /80\.0000 seconds/);

    await page.locator('[data-network-mode="display"]').click();
    await page.locator('#displayWidth').fill('1920');
    await page.locator('#displayHeight').fill('1080');
    await page.locator('#displayDiagonal').fill('24');
    await page.locator('#calculateDisplay').click();
    assert.match(await page.locator('#networkResult').innerText(), /Aspect ratio: 16:9/);
    assert.match(await page.locator('#networkResult').innerText(), /PPI: 91\.78/);

    await page.locator('[data-network-mode="device"]').click();
    await page.locator('#inspectDevice').click();
    assert.match(await page.locator('#deviceCapabilities').innerText(), /WebAssembly/i);
    assert.match(await page.locator('#deviceCapabilities').innerText(), /MediaRecorder/i);
    await noOverflow(page, 'Network desktop');
    await assertNoErrors(errors, 'Network');
    await page.close();
  }

  for (const [route, label] of [['random/?action=chance','Random'], ['codes/?action=uuid','Codes'], ['network/?action=display','Network']]) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = []; page.on('pageerror', error => errors.push(error));
    await page.goto(`${base}/tools/${route}`, { waitUntil: 'domcontentloaded' });
    await noOverflow(page, `${label} mobile`);
    await assertNoErrors(errors, `${label} mobile`);
    await page.close();
  }

  console.log('PASS Step 9 Random/Codes/Network seeded/generator/subnet/system/mobile smoke');
} finally {
  await browser.close();
}
