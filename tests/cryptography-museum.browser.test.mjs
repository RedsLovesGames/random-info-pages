// Optional real-browser regressions. Install playwright-core under .qa, then run:
// $env:CRYPTOMUSEUM_BROWSER_TESTS='1'; node --test tests/cryptography-museum.browser.test.mjs
// Set EXHIBITS_BROWSER_EXECUTABLE when Chromium is not installed by Playwright.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';

test('museum retained envelopes and skip navigation survive real browser input', {skip:process.env.CRYPTOMUSEUM_BROWSER_TESTS !== '1'}, async t => {
  const require=createRequire(new URL('../.qa/package.json', import.meta.url));
  let automation;
  try { automation=require('playwright'); } catch { automation=require('playwright-core'); }
  const {startExhibitsServer}=await import('../scripts/exhibits-server.mjs');
  const local=await startExhibitsServer();
  const browser=await automation.chromium.launch({headless:true,...(process.env.EXHIBITS_BROWSER_EXECUTABLE?{executablePath:process.env.EXHIBITS_BROWSER_EXECUTABLE}:{})});
  t.after(async()=>{await browser.close();await new Promise(resolve=>local.server.close(resolve));});
  for(const [label,plaintext] of [['ASCII','A'.repeat(10000)],['Unicode','界'.repeat(10000)]]) {
    await t.test(`${label} maximum-length plaintext can be saved, pasted and decrypted`, async()=>{
      const page=await browser.newPage();
      try {
        await page.goto(local.url+'cryptography-museum/#modern');
        await page.locator('#passphrase').fill('retained envelope regression passphrase');
        await page.locator('#modern-plain').fill(plaintext);
        await page.locator('#encrypt').click();
        await page.waitForFunction(()=>document.getElementById('status').textContent.startsWith('Sealed'));
        const retained=await page.locator('#envelope').inputValue();
        assert.ok(retained.length>10000,'fixture exercises an envelope larger than the old limit');
        await page.locator('#envelope').fill('');
        await page.locator('#envelope').focus();
        await page.keyboard.insertText(retained);
        assert.equal(await page.locator('#envelope').inputValue(),retained,'native input insertion must retain the complete envelope');
        await page.locator('#decrypt').click();
        await page.waitForFunction(()=>document.getElementById('status').textContent.startsWith('Authentication succeeded'));
        assert.equal(await page.locator('#modern-result').textContent(),plaintext);
      } finally { await page.close(); }
    });
  }
  for(const gallery of ['enigma','modern']) {
    await t.test(`skip link keeps #${gallery} and its ephemeral form`,async()=>{
      const page=await browser.newPage();
      try {
        await page.goto(local.url+'cryptography-museum/#'+gallery);
        const field=gallery==='enigma'?'#plain':'#modern-plain';
        await page.locator(field).fill('Preserve this museum experiment');
        if(gallery==='modern')await page.locator('#passphrase').fill('keep this too');
        await page.locator('.skip').focus();
        await page.keyboard.press('Enter');
        await page.waitForTimeout(50);
        assert.equal(new URL(page.url()).hash,'#'+gallery);
        assert.equal(await page.locator(field).inputValue(),'Preserve this museum experiment');
        if(gallery==='modern')assert.equal(await page.locator('#passphrase').inputValue(),'keep this too');
        assert.equal(await page.evaluate(()=>document.activeElement.id),'exhibit');
      } finally { await page.close(); }
    });
  }
  await t.test('gallery names retain their correct UTF-8 spelling',async()=>{
    const page=await browser.newPage();
    try {await page.goto(local.url+'cryptography-museum/#vigenere');assert.equal(await page.locator('h2').textContent(),'Vigenère cipher');}
    finally {await page.close();}
  });
  await t.test('invalid classical keys clear the previously valid mechanism',async()=>{
    const page=await browser.newPage();
    try {
      await page.goto(local.url+'cryptography-museum/#vigenere');
      assert.notEqual(await page.locator('#map-out').textContent(),'—');
      await page.locator('#key').fill('123');
      assert.equal(await page.locator('#output').textContent(),'');
      assert.equal(await page.locator('#map-out').textContent(),'—');
      assert.equal(await page.locator('#v-alphabet').textContent(),'');
      await page.goto(local.url+'cryptography-museum/#substitution');
      assert.ok(await page.locator('#frequency .column').count());
      await page.locator('#alphabet').fill('AAAAAAAAAAAAAAAAAAAAAAAAAA');
      assert.equal(await page.locator('#frequency .column').count(),0);
      assert.equal(await page.locator('#counts').textContent(),'');
      assert.match(await page.locator('#sub-key').textContent(),/valid alphabet/i);
    } finally {await page.close();}
  });
});
