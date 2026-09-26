import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../computer-src/package.json', import.meta.url));
const { chromium } = require('playwright');

const baseURL = process.env.COMPUTER_SMOKE_URL || 'http://127.0.0.1:4173';
const computerURL = `${baseURL.replace(/\/$/, '')}/computer/`;
const osURL = `${baseURL.replace(/\/$/, '')}/os/`;

function attachDiagnostics(page) {
  const pageErrors = [];
  const criticalFailures = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('response', (response) => {
    const url = response.url();
    if (
      response.status() >= 400 &&
      /\/computer\/(?:models|textures|audio|draco)\//.test(url)
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

async function assertDesktopExperience(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  const diagnostics = attachDiagnostics(page);

  await page.goto(computerURL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitForComputerState(page);

  const fallbackVisible = await page.locator('#computer-fallback').isVisible();
  assert.equal(fallbackVisible, false, 'desktop Chromium should start the 3D experience');
  assert.ok(await page.locator('#webgl canvas').count(), 'WebGL canvas must be present');

  const iframe = page.locator('#computer-screen');
  await iframe.waitFor({ state: 'attached', timeout: 60000 });
  const frame = await iframe.elementHandle().then((handle) => handle?.contentFrame());
  assert.ok(frame, 'monitor iframe must expose a frame');
  await frame.waitForLoadState('domcontentloaded');
  assert.equal(new URL(frame.url()).origin, new URL(baseURL).origin, 'monitor iframe must be same-origin');
  assert.equal(new URL(frame.url()).pathname, new URL(osURL).pathname, 'monitor iframe must load /os/');
  await frame.locator('.desktop-shortcuts').waitFor({ state: 'visible', timeout: 10000 });
  assert.equal(await frame.title(), 'Random Info OS', 'monitor iframe must expose the Random Info OS desktop');

  const toolsShortcut = frame.locator('.folder-shortcut[data-folder="tools"]');
  // The iframe is transformed as a CSS3D monitor surface until the camera enters
  // interaction mode, so validate the OS desktop handler inside its own DOM here.
  await toolsShortcut.dispatchEvent('dblclick');
  const toolsWindow = frame.locator('.explorer-window').filter({ hasText: 'Tools' });
  await toolsWindow.waitFor({ state: 'visible', timeout: 5000 });
  assert.ok(await toolsWindow.getByText('Toolbox', { exact: true }).count(), 'Tools folder must expose Toolbox');

  await page.evaluate(() => {
    const screen = document.getElementById('computer-screen');
    window.__ripBridgeKeydown = false;
    screen?.addEventListener('keydown', () => {
      window.__ripBridgeKeydown = true;
    }, { once: true });
  });
  await frame.locator('body').press('A');
  await page.waitForFunction(() => window.__ripBridgeKeydown === true, { timeout: 5000 });
  assert.match(await frame.locator('html').getAttribute('data-last-event') || '', /key(?:down|up)/);

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
  await assertReducedMotionExperience(browser);
  console.log('Random Info Computer browser smoke passed.');
} finally {
  await browser.close();
}
