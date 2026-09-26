import assert from 'node:assert/strict';
import { chromium, firefox } from 'playwright';

const base = process.env.TOOLBOX_BASE || 'http://127.0.0.1:8000';
const browserName = String(process.env.TOOLBOX_BROWSER || 'chromium').toLowerCase();
const browserType = browserName === 'firefox' ? firefox : chromium;
const routes = ['time','image','money','text','pdf','files','media','data','developer','math','random','codes','network'];

async function noHorizontalOverflow(page, label) {
  const dims = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  assert.ok(dims.scroll <= dims.client + 2, `${label} horizontal overflow: ${dims.scroll} > ${dims.client}`);
}

async function openWithErrors(page, url) {
  const errors = [];
  const listener = error => errors.push(error);
  page.on('pageerror', listener);
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(80);
  page.off('pageerror', listener);
  return errors;
}

const browser = await browserType.launch({ headless: true });
try {
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

  // Corrupt persisted hub state must never prevent the Toolbox from opening.
  await desktop.goto(`${base}/tools/`, { waitUntil: 'domcontentloaded' });
  await desktop.evaluate(() => localStorage.setItem('rip.toolbox.v1', '{broken-json'));
  const hubErrors = await openWithErrors(desktop, `${base}/tools/`);
  assert.equal(hubErrors.length, 0, `hub errors after corrupt state: ${hubErrors.map(e => e.message).join('; ')}`);
  assert.equal(await desktop.locator('.tb-card-shell').count(), 13);
  await noHorizontalOverflow(desktop, `${browserName} desktop hub`);

  // The index must stay lightweight: no cross-origin engine/model request on initial load.
  const externalRequests = [];
  const perfPage = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  perfPage.on('request', request => {
    const url = new URL(request.url());
    if (url.origin !== new URL(base).origin) externalRequests.push(request.url());
  });
  await perfPage.goto(`${base}/tools/`, { waitUntil: 'networkidle' });
  assert.deepEqual(externalRequests, [], `Toolbox hub eagerly fetched external resources: ${externalRequests.join(', ')}`);
  await perfPage.close();

  // Keyboard-only hub navigation and command palette.
  await desktop.locator('#commandSearchButton').waitFor({ state: 'visible' });
  await desktop.keyboard.press('Tab');
  const focusVisible = await desktop.evaluate(() => {
    const active = document.activeElement;
    if (!active || active === document.body) return false;
    const style = getComputedStyle(active);
    return style.outlineStyle !== 'none' && parseFloat(style.outlineWidth || '0') > 0;
  });
  assert.equal(focusVisible, true, 'first keyboard focus should be visibly indicated');
  await desktop.keyboard.press('Control+K');
  await desktop.locator('#toolboxCommandPalette').waitFor({ state: 'visible' });
  await desktop.locator('#commandSearchInput').fill('base64');
  await desktop.locator('#commandResults a').first().waitFor({ state: 'visible' });
  await desktop.keyboard.press('ArrowDown');
  await desktop.keyboard.press('ArrowUp');
  await desktop.keyboard.press('Escape');
  await desktop.waitForFunction(() => !document.querySelector('#toolboxCommandPalette')?.open);

  // Failed optional dependencies must remain feature-scoped and retryable.
  const dependencyState = await desktop.evaluate(async () => {
    const loader = await import('./shared/loader.js');
    const key = `hardening-${Date.now()}`;
    try { await loader.loadModuleOnce(key, 'data:text/javascript,throw new Error("expected")'); } catch {}
    const moduleCachedAfterFailure = loader.isDependencyPendingOrLoaded(key);
    const scriptKey = `${key}-script`;
    try { await loader.loadScriptOnce(scriptKey, './definitely-missing-step11.js'); } catch {}
    const scriptCachedAfterFailure = loader.isDependencyPendingOrLoaded(scriptKey);
    return { moduleCachedAfterFailure, scriptCachedAfterFailure };
  });
  assert.deepEqual(dependencyState, { moduleCachedAfterFailure: false, scriptCachedAfterFailure: false });

  // Shared file guard must give the user a chance to cancel unusually large jobs.
  const largeGuard = await desktop.evaluate(async () => {
    const files = await import('./shared/files.js');
    let prompted = false;
    const decision = files.confirmLargeFileJob([{ size: 300 * 1024 * 1024 }], {
      confirmFn: () => { prompted = true; return false; },
    });
    return { prompted, decision, large: files.isUnusuallyLargeFileJob([{ size: 300 * 1024 * 1024 }]) };
  });
  assert.deepEqual(largeGuard, { prompted: true, decision: false, large: true });

  // Every workspace must survive initial load on the tested engine at a wide desktop size.
  for (const route of routes) {
    const errors = await openWithErrors(desktop, `${base}/tools/${route}/`);
    assert.equal(errors.length, 0, `${browserName} ${route} initial-load errors: ${errors.map(e => e.message).join('; ')}`);
    await noHorizontalOverflow(desktop, `${browserName} desktop ${route}`);
  }
  await desktop.close();

  // Reduced-motion preference must be honored by the shared visual system.
  const reduced = await browser.newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  await reduced.goto(`${base}/tools/`, { waitUntil: 'domcontentloaded' });
  const motion = await reduced.evaluate(() => {
    const card = document.querySelector('.tb-card');
    const style = getComputedStyle(card);
    return {
      matches: matchMedia('(prefers-reduced-motion: reduce)').matches,
      transitionSeconds: style.transitionDuration.split(',').map(value => parseFloat(value) || 0),
      animationSeconds: style.animationDuration.split(',').map(value => parseFloat(value) || 0),
    };
  });
  assert.equal(motion.matches, true);
  assert.ok(motion.transitionSeconds.every(value => value <= 0.001), `reduced-motion transition remained active: ${motion.transitionSeconds}`);
  assert.ok(motion.animationSeconds.every(value => value <= 0.001), `reduced-motion animation remained active: ${motion.animationSeconds}`);
  await reduced.close();

  // Representative 360–430px mobile width plus all workspace empty states.
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const mobileHubErrors = await openWithErrors(mobile, `${base}/tools/`);
  assert.equal(mobileHubErrors.length, 0);
  await mobile.locator('#commandSearchButton').waitFor({ state: 'visible' });
  await mobile.keyboard.press('Control+K');
  await mobile.locator('#toolboxCommandPalette').waitFor({ state: 'visible' });
  await noHorizontalOverflow(mobile, `${browserName} mobile command palette`);
  await mobile.keyboard.press('Escape');
  for (const route of routes) {
    const errors = await openWithErrors(mobile, `${base}/tools/${route}/`);
    assert.equal(errors.length, 0, `${browserName} mobile ${route} errors: ${errors.map(e => e.message).join('; ')}`);
    await noHorizontalOverflow(mobile, `${browserName} mobile ${route}`);
  }
  await mobile.close();

  console.log(`PASS Step 11 ${browserName} hardening: desktop/mobile, keyboard, reduced motion, corrupt state, lazy/CDN failure, large-job guard, lazy hub`);
} finally {
  await browser.close();
}
