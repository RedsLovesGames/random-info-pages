import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { loadModuleOnce, isDependencyPendingOrLoaded } from '../tools/shared/loader.js';
import { readSession, writeSession, clearSession } from '../tools/shared/session.js';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('failed lazy module loads are feature-scoped and not poisoned in the shared cache', async () => {
  const key = `hardening-failure-${Date.now()}`;
  await assert.rejects(loadModuleOnce(key, 'data:text/javascript,throw new Error("expected hardening failure")'));
  assert.equal(isDependencyPendingOrLoaded(key), false, 'failed dependency must be removable/retryable');
});

test('session helpers recover from corrupt and unavailable local state', () => {
  const original = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: () => '{not-json',
    setItem: () => { throw new Error('quota'); },
    removeItem: () => { throw new Error('blocked'); },
  };
  try {
    assert.deepEqual(readSession('corrupt', { safe: true }), { safe: true });
    assert.equal(writeSession('corrupt', { value: 1 }), false);
    assert.equal(clearSession('corrupt'), false);
  } finally {
    if (original === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = original;
  }
});

test('shared visual system exposes keyboard focus and reduced-motion hardening', () => {
  const css = read('../tools/shared/toolbox.css');
  assert.match(css, /a:focus-visible[^\{]*,button:focus-visible|button:focus-visible[^\{]*,input:focus-visible/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
});

test('Step 11 CI includes dedicated cross-browser hardening coverage', () => {
  const workflow = read('../.github/workflows/toolbox-ci.yml');
  assert.match(workflow, /toolbox_hardening_browser_smoke\.mjs/);
  assert.match(workflow, /playwright install --with-deps firefox/);
  assert.match(workflow, /TOOLBOX_BROWSER=firefox/);
});
