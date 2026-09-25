import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.TOOLBOX_BASE || 'http://127.0.0.1:8000';
const browser = await chromium.launch({ headless: true });

async function assertNoOverflow(page, label) {
  const dims = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  assert.ok(dims.scrollWidth <= dims.clientWidth + 2, `${label} overflows: ${dims.scrollWidth} > ${dims.clientWidth}`);
}

try {
  const text = await browser.newPage({ viewport: { width: 1280, height: 820 } });
  const textErrors = [];
  text.on('pageerror', error => textErrors.push(error));
  await text.goto(`${base}/tools/text/`, { waitUntil: 'domcontentloaded' });
  await text.locator('#textInput').fill('Hello cat');
  await text.locator('#findReplaceTool').click();
  await text.locator('#textFind').fill('cat');
  await text.locator('#textReplace').fill('dog');
  await text.locator('#runTextReplace').click();
  assert.equal(await text.locator('#textOutput').inputValue(), 'Hello dog');
  await text.locator('#useOutput').click();
  assert.equal(await text.locator('#textInput').inputValue(), 'Hello dog');
  await text.locator('#undoText').click();
  assert.equal(await text.locator('#textInput').inputValue(), 'Hello cat', 'Text undo should restore the input from before applying output');
  await text.locator('#redoText').click();
  assert.equal(await text.locator('#textInput').inputValue(), 'Hello dog');

  await text.locator('#analyzeTool').click();
  assert.match(await text.locator('#textToolPanel').innerText(), /Flesch reading ease/i);
  await text.locator('#compareTool').click();
  await text.locator('#compareText').fill('Hello bird');
  await text.locator('#runTextDiff').click();
  assert.match(await text.locator('#textDiffResult').innerText(), /Hello dog/);
  assert.match(await text.locator('#textDiffResult').innerText(), /Hello bird/);

  await text.locator('[data-mode="cleaner"]').click();
  await text.locator('#textInput').fill('“Hello”\u00a0world\u200b…');
  await text.locator('#unicodeTool').click();
  assert.equal(await text.locator('#textOutput').inputValue(), '"Hello" world...');
  assert.equal(textErrors.length, 0, `Text Studio page errors:\n${textErrors.map(error => error.stack || error.message).join('\n')}`);
  await text.close();

  const developer = await browser.newPage({ viewport: { width: 1280, height: 820 } });
  const devErrors = [];
  developer.on('pageerror', error => devErrors.push(error));
  await developer.goto(`${base}/tools/developer/`, { waitUntil: 'domcontentloaded' });
  await developer.locator('#developerInput').fill('{"name":"Alex","n":2}');
  assert.equal((await developer.locator('#detectedType').innerText()).trim(), 'json');

  await developer.locator('#jsonTool').click();
  await developer.locator('#jsonPretty').click();
  assert.match(await developer.locator('#developerOutput').inputValue(), /\n\s+"name": "Alex"/);

  await developer.locator('#base64Tool').click();
  await developer.locator('#b64EncodeChain').click();
  assert.equal(await developer.locator('#operationChain span').count(), 1);
  const encoded = await developer.locator('#developerOutput').inputValue();
  assert.ok(encoded.length > 10 && !encoded.includes('{'));
  await developer.locator('#b64DecodeChain').click();
  assert.equal(await developer.locator('#operationChain span').count(), 2);
  assert.equal(await developer.locator('#developerOutput').inputValue(), '{"name":"Alex","n":2}');
  await developer.locator('#clearChain').click();

  await developer.locator('#yamlTool').click();
  await developer.locator('#jsonToYaml').click();
  await developer.waitForFunction(() => document.querySelector('#developerOutput')?.value?.includes('name: Alex'), null, { timeout: 10000 });
  assert.match(await developer.locator('#developerOutput').inputValue(), /name: Alex/);

  await developer.locator('#schemaTool').click();
  await developer.locator('#runSchema').click();
  await developer.waitForFunction(() => /Valid against schema|must have required property/i.test(document.querySelector('#devToolResult')?.textContent || ''), null, { timeout: 10000 });
  assert.match(await developer.locator('#devToolResult').innerText(), /Valid against schema/i);

  await developer.locator('#regexTool').click();
  await developer.locator('#regexPattern').fill('Alex');
  await developer.locator('#runRegex').click();
  assert.match(await developer.locator('#devToolResult').innerText(), /Alex/);

  await developer.locator('#hashTool').click();
  await developer.locator('[data-hash="SHA-256"]').click();
  await developer.waitForFunction(() => /^[a-f0-9]{64}$/i.test(document.querySelector('#devToolResult')?.textContent?.trim() || ''));

  await developer.locator('#playgroundTool').click();
  const sandbox = developer.locator('#playgroundFrame');
  assert.equal(await sandbox.getAttribute('sandbox'), 'allow-scripts');
  assert.match(await sandbox.getAttribute('srcdoc'), /<h1>Hello<\/h1>/);

  assert.equal(devErrors.length, 0, `Developer Lab page errors:\n${devErrors.map(error => error.stack || error.message).join('\n')}`);
  await developer.close();

  const deep = await browser.newPage({ viewport: { width: 1000, height: 760 } });
  await deep.goto(`${base}/tools/developer/?action=base64`, { waitUntil: 'domcontentloaded' });
  await deep.locator('#developerActionPanel').waitFor({ state: 'visible' });
  assert.match(await deep.locator('#developerActionPanel').innerText(), /Base64/i);
  await deep.close();

  for (const route of ['/tools/text/', '/tools/developer/']) {
    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await mobile.goto(`${base}${route}`, { waitUntil: 'domcontentloaded' });
    await assertNoOverflow(mobile, `mobile ${route}`);
    await mobile.close();
  }

  console.log('PASS Text Studio persistent input/history and Developer Lab transform/inspect/validate/playground smoke');
} finally {
  await browser.close();
}
