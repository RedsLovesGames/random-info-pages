import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.TOOLBOX_BASE || 'http://127.0.0.1:8000';

function makeWav({ seconds = 0.4, sampleRate = 8000, frequency = 440 } = {}) {
  const frames = Math.floor(seconds * sampleRate);
  const buffer = Buffer.alloc(44 + frames * 2);
  buffer.write('RIFF', 0); buffer.writeUInt32LE(36 + frames * 2, 4); buffer.write('WAVE', 8);
  buffer.write('fmt ', 12); buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24); buffer.writeUInt32LE(sampleRate * 2, 28); buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36); buffer.writeUInt32LE(frames * 2, 40);
  for (let i = 0; i < frames; i++) {
    const sample = Math.round(Math.sin(2 * Math.PI * frequency * i / sampleRate) * 12000);
    buffer.writeInt16LE(sample, 44 + i * 2);
  }
  return buffer;
}

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error));
  await page.goto(`${base}/tools/media/`, { waitUntil: 'domcontentloaded' });
  assert.ok(await page.locator('#mediaWorkspace').isHidden(), 'Media Studio should start without a source');

  await page.locator('#mediaPicker').setInputFiles({ name: 'tone.wav', mimeType: 'audio/wav', buffer: makeWav() });
  await page.locator('#mediaWorkspace').waitFor({ state: 'visible' });
  await page.waitForFunction(() => Number(document.querySelector('#trimEnd')?.value) > 0, null, { timeout: 10000 });
  assert.match(await page.locator('#mediaSourceName').innerText(), /tone\.wav/i);
  assert.ok(Number(await page.locator('#trimEnd').inputValue()) > 0.2);

  await page.locator('#trimMedia').click();
  await page.locator('#runTrim').click();
  await page.waitForFunction(() => !document.querySelector('#downloadMediaResult')?.disabled, null, { timeout: 20000 });
  const [trimDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#downloadMediaResult').click(),
  ]);
  assert.match(trimDownload.suggestedFilename(), /tone-toolbox\.wav/i);

  await page.locator('#audioEdit').click();
  await page.locator('#audioGain').fill('0.5');
  await page.locator('#audioReverse').check();
  await page.locator('#runAudioEdit').click();
  await page.waitForFunction(() => !document.querySelector('#downloadMediaResult')?.disabled, null, { timeout: 10000 });
  const [editDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#downloadMediaResult').click(),
  ]);
  assert.match(editDownload.suggestedFilename(), /tone-edited\.wav/i);
  assert.equal(errors.length, 0, `Media Studio page errors:\n${errors.map(error => error.stack || error.message).join('\n')}`);
  await page.close();

  const quick = await browser.newPage({ viewport: { width: 1000, height: 760 } });
  await quick.goto(`${base}/tools/media/`, { waitUntil: 'domcontentloaded' });
  await quick.locator('[data-media-quick="tone"]').click();
  await quick.locator('#mediaActionPanel').waitFor({ state: 'visible' });
  assert.match(await quick.locator('#mediaActionPanel').innerText(), /Tone \/ metronome/i);
  await quick.locator('#downloadTone').click();
  await quick.waitForFunction(() => !document.querySelector('#downloadMediaResult')?.disabled);
  const [toneDownload] = await Promise.all([
    quick.waitForEvent('download'),
    quick.locator('#downloadMediaResult').click(),
  ]);
  assert.match(toneDownload.suggestedFilename(), /tone-440hz\.wav/i);
  await quick.close();

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobile.goto(`${base}/tools/media/`, { waitUntil: 'domcontentloaded' });
  const dims = await mobile.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  assert.ok(dims.scrollWidth <= dims.clientWidth + 2, `mobile Media Studio overflows: ${dims.scrollWidth} > ${dims.clientWidth}`);
  await mobile.close();

  console.log('PASS Media Studio source/timeline/trim/audio-edit/tone/mobile smoke');
} finally {
  await browser.close();
}
