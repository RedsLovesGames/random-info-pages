import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const packageUrl = fs.existsSync(new URL('../computer-src/package.json', import.meta.url))
  ? new URL('../computer-src/package.json', import.meta.url)
  : new URL('../package.json', import.meta.url);
const require = createRequire(packageUrl);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { throw new Error('Playwright is required for the LACUNA finale browser smoke.'); }

const configured = (process.env.LACUNA_SMOKE_URL || 'http://127.0.0.1:4173/random-info-pages').replace(/\/$/, '');
const osURL = `${configured}/os/`;
const FINAL_COMMAND = 'reconstruct subject_00 /commit';

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  await page.emulateMedia({ reducedMotion: 'reduce' });

  const external = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.origin !== new URL(configured).origin && !url.protocol.startsWith('data')) external.push(request.url());
  });

  await page.goto(osURL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.locator('html[data-lacuna-runtime="ready"]').waitFor({ timeout: 15000 });

  // Keep a command prompt open so the archive can return the operator to the one final command.
  await page.locator('[data-lacuna-app="my-computer"]').dblclick();
  const computer = page.locator('.lac-window', { hasText: 'My Computer' }).last();
  await computer.getByRole('button', { name: 'Command Prompt' }).click();
  const terminal = page.locator('.lac-terminal-window').last();
  const command = terminal.getByLabel('Command');

  // Reach the same evidence state as the normal ARG without bypassing store actions.
  await page.evaluate(async () => {
    const api = window.__RIP_LACUNA__;
    await api.store.event({ type: 'file-opened', target: 'c-temp-lacuna-log' });
    await api.store.event({ type: 'file-opened', target: 'c-opr019' });
    await api.store.event({ type: 'file-opened', target: 'c-crosswalk' });
  });

  await computer.getByRole('button', { name: 'Disk Utility' }).click();
  const disk = page.locator('.lac-window', { hasText: 'Disk Image Utility' }).last();
  await disk.getByRole('button', { name: 'Mount Image' }).click();
  await disk.getByRole('button', { name: 'Compare Sources' }).click();

  await page.evaluate(async () => {
    const api = window.__RIP_LACUNA__;
    await api.store.event({ type: 'subject-opened', target: 'subject-00' });
    await api.store.event({ type: 'final-reconstruction-opened', target: 'c-final-reconstruction' });
    window.dispatchEvent(new CustomEvent('rip-lacuna-open-finale'));
  });

  const finalModel = page.locator('.lac-window', { hasText: 'LACUNA — FINAL MODEL' }).last();
  await finalModel.waitFor();
  const archiveButton = finalModel.getByRole('button', { name: 'RUN', exact: true });
  await archiveButton.waitFor();
  assert.equal((await archiveButton.textContent())?.trim(), 'OPEN MISSING_INTERVAL.arc',
    'legacy three-way ending must collapse into the archive route');
  assert.equal(await finalModel.getByRole('button', { name: 'EXPORT', exact: true }).isVisible(), false);
  assert.equal(await finalModel.getByRole('button', { name: 'SHUT DOWN', exact: true }).isVisible(), false);

  await archiveButton.click();
  const archive = page.locator('.lac-archive-overlay');
  await archive.waitFor();
  await page.getByRole('dialog', { name: 'MISSING_INTERVAL.arc — LACUNA Archive' }).waitFor();

  // The command exists conceptually but cannot execute until the archive reaches its end.
  await archive.getByRole('button', { name: 'Return to Command Prompt' }).click();
  await command.fill(FINAL_COMMAND);
  await command.press('Enter');
  await terminal.getByText('ERROR: SOURCE INTERVAL UNREAD', { exact: true }).waitFor();

  await archiveButton.click();
  await archive.waitFor();
  const reader = archive.locator('.lac-archive-reader');
  await reader.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
    element.dispatchEvent(new Event('scroll'));
  });
  const releasedCommand = archive.locator('.lac-archive-command');
  await releasedCommand.waitFor();
  assert.equal((await releasedCommand.textContent())?.trim(), FINAL_COMMAND);

  const archiveCookie = (await context.cookies()).find((cookie) => cookie.name === 'rip_lacuna_v1_missing_interval_read');
  assert.equal(archiveCookie?.value, '1', 'reading to the end must persist the archive gate');

  await archive.getByRole('button', { name: 'Return to Command Prompt' }).click();
  await command.fill(FINAL_COMMAND);
  await command.press('Enter');

  await page.locator('html[data-lacuna-subject00-complete="true"]').waitFor({ timeout: 10000 });
  const cinematic = page.locator('.lac-subject00-cinematic');
  await cinematic.getByText('RECONSTRUCTION COMMITTED', { exact: true }).waitFor();
  await cinematic.getByText('SUBJECT 00 // CURRENT INVESTIGATOR', { exact: true }).waitFor();
  await cinematic.getByText('HISTORICAL PREDICTION CLAIM: UNRESOLVED', { exact: true }).waitFor();
  await cinematic.getByText('PENDING RECONSTRUCTIONS: 0', { exact: true }).waitFor();

  const completedCookie = (await context.cookies()).find((cookie) => cookie.name === 'rip_lacuna_v1_subject00_committed');
  assert.equal(completedCookie?.value, '1', 'Subject 00 completion must persist in the same cookie-reset model');

  assert.equal(external.length, 0, `finale must remain fully local: ${external.join(', ')}`);

  await context.clearCookies();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('html[data-lacuna-runtime="ready"]').waitFor({ timeout: 15000 });
  assert.equal(await page.locator('html[data-lacuna-subject00-complete="true"]').count(), 0,
    'clearing cookies must clear the final archive/Subject 00 completion state');

  await context.close();
} finally {
  await browser.close();
}

console.log(`LACUNA Subject 00 finale browser smoke passed at ${configured}`);
