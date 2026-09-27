import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const packageUrl = fs.existsSync(new URL('../computer-src/package.json', import.meta.url))
  ? new URL('../computer-src/package.json', import.meta.url)
  : new URL('../package.json', import.meta.url);
const require = createRequire(packageUrl);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { throw new Error('Playwright is required. In the full repo run: cd computer-src && npm install --no-save --package-lock=false playwright@1.59.1 && npx playwright install chromium'); }

const configured = (process.env.LACUNA_SMOKE_URL || 'http://127.0.0.1:4173/random-info-pages').replace(/\/$/, '');
const basePath = new URL(configured).pathname.replace(/\/$/, '');
const osURL = `${configured}/os/`;
const computerURL = `${configured}/computer/`;

async function verifyOuterComputer(browser) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const response = await page.goto(computerURL, { waitUntil:'domcontentloaded', timeout:60000 });
  assert.ok(response?.ok(), `computer route must load beneath ${basePath || '/'}`);
  assert.ok(await page.locator('#computer-fallback').count(), 'existing 3D computer fallback contract must remain present');
  await page.close();
}

async function verifyArg(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  const external = [];
  page.on('request', request => { const u = new URL(request.url()); if (u.origin !== new URL(configured).origin && !u.protocol.startsWith('data')) external.push(request.url()); });
  await page.goto(osURL, { waitUntil:'domcontentloaded', timeout:60000 });
  await page.locator('html[data-lacuna-runtime="ready"]').waitFor({ timeout:15000 });
  assert.equal(await page.locator('[data-lacuna-app="lacuna-console"]').count(), 0, 'console must not be a desktop shortcut');

  // Recycle Bin vertical-slice recovery.
  const recycle = page.locator('[data-lacuna-app="recycle-bin"]');
  await recycle.dblclick();
  const todo = page.locator('.lac-recycle-row', { hasText:'todo-old.txt' });
  await todo.getByRole('button', { name:'Restore' }).click();
  await todo.waitFor({ state:'detached' });

  await page.locator('[data-lacuna-app="my-computer"]').dblclick();
  const computer = page.locator('.lac-window', { hasText:'My Computer' }).last();
  const address = computer.getByLabel('Address');
  await address.fill('C:\\Users\\evale\\Documents');
  await address.press('Enter');
  assert.ok(await computer.getByText('todo-old.txt', { exact:true }).count(), 'restored clue must be visible in Explorer');

  await computer.getByRole('button', { name:'Command Prompt' }).click();
  const terminal = page.locator('.lac-terminal-window').last();
  const terminalGeometry = await terminal.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const output = element.querySelector('.lac-terminal-output');
    const windowStyle = getComputedStyle(element);
    const outputStyle = output ? getComputedStyle(output) : null;
    return { width: rect.width, height: rect.height, resize: windowStyle.resize, overflowX: outputStyle?.overflowX, overflowY: outputStyle?.overflowY };
  });
  assert.ok(terminalGeometry.width <= 644, `Command Prompt should retain a console-like width: ${JSON.stringify(terminalGeometry)}`);
  assert.ok(terminalGeometry.height >= 360, `Command Prompt should open with useful vertical space: ${JSON.stringify(terminalGeometry)}`);
  assert.equal(terminalGeometry.resize, 'vertical', 'desktop Command Prompt should resize vertically, not stretch horizontally');
  assert.equal(terminalGeometry.overflowX, 'hidden');
  assert.equal(terminalGeometry.overflowY, 'auto');
  const command = terminal.getByLabel('Command');
  await command.fill('attrib -h C:\\Research'); await command.press('Enter');
  await command.fill('dir C:\\Research /a'); await command.press('Enter');
  assert.match(await terminal.textContent(), /docs/i, 'Terminal and Explorer share the revealed filesystem');
  await terminal.getByRole('button', { name:'Close' }).click();
  await terminal.waitFor({ state:'detached' });

  // Late-game state is injected only through the same public store actions used by UI paths.
  await page.evaluate(async () => {
    const api = window.__RIP_LACUNA__;
    await api.store.event({ type:'file-opened', target:'c-temp-lacuna-log' });
    await api.store.event({ type:'file-opened', target:'c-opr019' });
    await api.store.event({ type:'file-opened', target:'c-crosswalk' });
  });
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('rip-lacuna-open-console')));
  const lacunaConsole = page.locator('[data-lacuna-window="lacuna-console"]').last();
  await lacunaConsole.getByText('RECONSTRUCTION SYSTEM', { exact:true }).waitFor();
  assert.ok(await lacunaConsole.getByText('SUBJECT 00 — [NO IDENTITY]', { exact:true }).count());

  // Follow the same z-order interaction a real player would use instead of clicking through
  // the foreground console. This keeps the smoke sensitive to window-management regressions.
  await lacunaConsole.getByRole('button', { name:'Close' }).click();
  await lacunaConsole.waitFor({ state:'detached' });

  await computer.getByRole('button', { name:'Disk Utility' }).click();
  const disk = page.locator('.lac-window', { hasText:'Disk Image Utility' }).last();
  assert.match(await disk.textContent(), /LACUNA-WS03\.img/);
  await disk.getByRole('button', { name:'Mount Image' }).click();
  await disk.getByRole('button', { name:'Compare Sources' }).click();
  assert.match(await disk.textContent(), /reconstruction_00\.txt/i);

  await page.evaluate(async () => {
    const api = window.__RIP_LACUNA__;
    await api.store.event({ type:'subject-opened', target:'subject-00' });
    await api.store.event({ type:'final-reconstruction-opened', target:'c-final-reconstruction' });
    window.dispatchEvent(new CustomEvent('rip-lacuna-open-finale'));
  });
  const finalModel = page.locator('.lac-window', { hasText:'LACUNA — FINAL MODEL' }).last();
  assert.doesNotMatch((await finalModel.textContent()) || '', /microphone data collected|camera data collected|geolocation collected/i);
  await finalModel.getByRole('button', { name:'RUN', exact:true }).click();
  await page.getByText('SUBJECT COUNT: 39', { exact:true }).waitFor();

  // Cookie persistence is the sole browser progression store. A reload keeps progress;
  // clearing cookies returns the ARG to its initial recoverable state.
  const cookieNames = (await context.cookies()).map((cookie) => cookie.name);
  assert.ok(cookieNames.some((name) => name.startsWith('rip_lacuna_v1_')), 'ARG progress must be persisted in cookies');
  await page.reload({ waitUntil:'domcontentloaded' });
  await page.locator('html[data-lacuna-runtime="ready"]').waitFor({ timeout:15000 });
  await page.locator('[data-lacuna-app="recycle-bin"]').dblclick();
  assert.equal(await page.locator('.lac-recycle-row', { hasText:'todo-old.txt' }).count(), 0, 'restored clue should stay restored after reload');

  await context.clearCookies();
  await page.reload({ waitUntil:'domcontentloaded' });
  await page.locator('html[data-lacuna-runtime="ready"]').waitFor({ timeout:15000 });
  await page.locator('[data-lacuna-app="recycle-bin"]').dblclick();
  await page.locator('.lac-recycle-row', { hasText:'todo-old.txt' }).waitFor();
  assert.equal(await page.locator('[data-lacuna-app="lacuna-console"]').count(), 0, 'clearing cookies must reset hidden ARG progression');

  assert.equal(external.length, 0, `ARG should not require external network requests: ${external.join(', ')}`);
  await context.close();
}

const browser = await chromium.launch({ headless:true });
try { await verifyOuterComputer(browser); await verifyArg(browser); }
finally { await browser.close(); }
console.log(`LACUNA browser smoke passed at ${configured} (repository prefix: ${basePath || '/'})`);
