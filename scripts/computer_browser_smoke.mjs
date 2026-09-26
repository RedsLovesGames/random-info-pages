import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../computer-src/package.json', import.meta.url));
const { chromium } = require('playwright');

const baseURL = process.env.COMPUTER_SMOKE_URL || 'http://127.0.0.1:4173';
const normalizedBaseURL = baseURL.replace(/\/$/, '');
const basePath = new URL(normalizedBaseURL).pathname.replace(/\/$/, '');
const computerURL = `${normalizedBaseURL}/computer/`;
const osURL = `${normalizedBaseURL}/os/`;
const expectedToolboxPath = `${basePath}/tools/` || '/tools/';

function attachDiagnostics(page) {
  const pageErrors = [];
  const criticalFailures = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('response', (response) => {
    const url = response.url();
    if (
      response.status() >= 400 &&
      (/\/computer\/(?:models|textures|audio|draco)\//.test(url) || /\/(?:os|tools)\//.test(url))
    ) {
      criticalFailures.push(`${response.status()} ${url}`);
    }
  });
  return { pageErrors, criticalFailures };
}

async function waitForComputerState(page) {
  await page.waitForFunction(
    () => {
      const fallback = document.getElementById('computer-fallback');
      return Boolean(document.querySelector('#computer-screen')) || Boolean(fallback && !fallback.hidden);
    },
    { timeout: 60000 }
  );
}

async function startComputer(page) {
  const start = page.getByText('START', { exact: true });
  await start.waitFor({ state: 'visible', timeout: 60000 });
  await start.click();
  await page.waitForFunction(() => getComputedStyle(document.getElementById('ui')).pointerEvents === 'none', { timeout: 10000 });
}

async function assertDesktopExperience(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  const diagnostics = attachDiagnostics(page);

  await page.goto(computerURL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitForComputerState(page);

  const fallbackVisible = await page.locator('#computer-fallback').isVisible();
  assert.equal(fallbackVisible, false, 'desktop Chromium should start the 3D experience');
  assert.ok(await page.locator('#webgl canvas').count(), 'WebGL canvas must be present');

  await startComputer(page);

  const iframe = page.locator('#computer-screen');
  await iframe.waitFor({ state: 'attached', timeout: 60000 });
  const frame = await iframe.elementHandle().then((handle) => handle?.contentFrame());
  assert.ok(frame, 'monitor iframe must expose a frame');
  await frame.waitForLoadState('domcontentloaded');
  assert.equal(new URL(frame.url()).origin, new URL(baseURL).origin, 'monitor iframe must be same-origin');
  assert.equal(new URL(frame.url()).pathname, new URL(osURL).pathname, 'monitor iframe must load /os/');
  assert.equal(await frame.title(), 'Random Info OS', 'monitor iframe must expose Random Info OS');

  await frame.getByText('Start', { exact: true }).waitFor({ state: 'visible', timeout: 15000 });
  await frame.getByText('Random Info Explorer', { exact: true }).first().waitFor({ state: 'visible', timeout: 15000 });

  const requiredFolders = ['Tools', 'School', 'Friends', 'Games', 'Data', 'Experiments'];
  for (const folder of requiredFolders) {
    assert.ok(
      await frame.getByRole('button', { name: new RegExp(`${folder}$`) }).count(),
      `Explorer must expose ${folder}`
    );
  }

  const toolbox = frame.getByRole('button', { name: /Toolbox/ }).first();
  await toolbox.click({ timeout: 10000 });
  const toolboxIframe = frame.locator('iframe[title="Toolbox"]');
  await toolboxIframe.waitFor({ state: 'attached', timeout: 10000 });
  const toolboxFrame = await toolboxIframe.elementHandle().then((handle) => handle?.contentFrame());
  assert.ok(toolboxFrame, 'Toolbox must launch inside a nested Win95 application window after a real pointer click');
  await toolboxFrame.waitForLoadState('domcontentloaded');
  assert.equal(
    new URL(toolboxFrame.url()).pathname,
    expectedToolboxPath,
    'embedded Toolbox must preserve the GitHub Pages repository prefix'
  );

  await frame.waitForTimeout(250);
  const embeddedMetrics = await toolboxIframe.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const parentRect = element.parentElement?.getBoundingClientRect();
    return {
      internalWidth: element.contentWindow?.innerWidth || 0,
      layoutWidth: Number.parseFloat(getComputedStyle(element).width),
      visibleWidth: rect.width,
      parentWidth: parentRect?.width || 0,
    };
  });
  assert.ok(
    embeddedMetrics.internalWidth >= 1400 && embeddedMetrics.layoutWidth >= 1400,
    `embedded pages must retain a desktop-sized internal viewport: ${JSON.stringify(embeddedMetrics)}`
  );
  assert.ok(
    Math.abs(embeddedMetrics.visibleWidth - embeddedMetrics.parentWidth) <= 2,
    `scaled desktop page must fit the Win95 content width: ${JSON.stringify(embeddedMetrics)}`
  );

  assert.ok(
    await frame.getByRole('link', { name: 'Open outside OS', exact: true }).count(),
    'embedded windows must offer an external-open fallback'
  );

  if (process.env.SKIP_KEY_BRIDGE !== '1') {
    await page.evaluate(() => {
      const screen = document.getElementById('computer-screen');
      window.__ripBridgeKeydown = false;
      screen?.addEventListener('keydown', () => {
        window.__ripBridgeKeydown = true;
      }, { once: true });
    });
    await frame.locator('body').press('A');
    await page.waitForFunction(() => window.__ripBridgeKeydown === true, { timeout: 5000 });
  }

  await page.waitForTimeout(500);
  assert.deepEqual(diagnostics.criticalFailures, [], `critical assets failed: ${diagnostics.criticalFailures.join(', ')}`);
  assert.deepEqual(diagnostics.pageErrors, [], `page errors: ${diagnostics.pageErrors.join(' | ')}`);
  await context.close();
}

async function assertNarrowExperience(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  const page = await context.newPage();
  const diagnostics = attachDiagnostics(page);
  await page.goto(computerURL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitForComputerState(page);

  const sizes = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    fallbackVisible: Boolean(document.getElementById('computer-fallback') && !document.getElementById('computer-fallback').hidden),
    hasMonitor: Boolean(document.getElementById('computer-screen')),
  }));
  assert.ok(sizes.scrollWidth <= sizes.clientWidth + 1, `mobile page overflows horizontally: ${JSON.stringify(sizes)}`);
  assert.ok(sizes.fallbackVisible || sizes.hasMonitor, 'mobile must expose either the 3D monitor or intentional fallback');
  assert.deepEqual(diagnostics.pageErrors, [], `mobile page errors: ${diagnostics.pageErrors.join(' | ')}`);
  await context.close();
}

async function assertDirectOsNarrowExperience(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  const page = await context.newPage();
  const diagnostics = attachDiagnostics(page);
  await page.goto(osURL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.getByText('Start', { exact: true }).waitFor({ state: 'visible', timeout: 15000 });
  await page.getByText('Random Info Explorer', { exact: true }).first().waitFor({ state: 'visible', timeout: 15000 });

  const sizes = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  assert.ok(sizes.scrollWidth <= sizes.clientWidth + 2, `direct OS overflows narrow viewport: ${JSON.stringify(sizes)}`);
  assert.deepEqual(diagnostics.pageErrors, [], `direct OS mobile errors: ${diagnostics.pageErrors.join(' | ')}`);
  await context.close();
}

async function assertReducedMotionExperience(browser) {
  const context = await browser.newContext({ viewport: { width: 1024, height: 768 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const diagnostics = attachDiagnostics(page);
  await page.goto(computerURL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitForComputerState(page);

  const state = await page.evaluate(() => {
    const fallback = document.getElementById('computer-fallback');
    const screen = document.getElementById('computer-screen');
    return {
      fallbackVisible: Boolean(fallback && !fallback.hidden),
      hasMonitor: Boolean(screen),
      jitterAnimation: screen ? getComputedStyle(screen).animationName : 'none',
    };
  });
  assert.ok(state.fallbackVisible || state.hasMonitor, 'reduced-motion mode must remain usable');
  if (state.hasMonitor) assert.equal(state.jitterAnimation, 'none', 'CRT jitter must be disabled for reduced motion');
  assert.deepEqual(diagnostics.pageErrors, [], `reduced-motion page errors: ${diagnostics.pageErrors.join(' | ')}`);
  await context.close();
}

const browser = await chromium.launch({
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
});

try {
  await assertDesktopExperience(browser);
  await assertNarrowExperience(browser);
  await assertDirectOsNarrowExperience(browser);
  await assertReducedMotionExperience(browser);
  console.log('Random Info Computer + authentic Win95 browser smoke passed.');
} finally {
  await browser.close();
}
