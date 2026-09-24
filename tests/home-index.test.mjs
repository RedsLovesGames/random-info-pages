import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

const routes = [
  './wheel/', './whenwemeet/', './school-schedule/', './friends/',
  './tideborne/', './tide2/', './vct-scout/', './oldasspolitic/',
  './heatmap/', './wanuiv2/', './nerdcore-prompts/'
];

test('homepage uses the archive folder interface', () => {
  assert.match(html, /data-archive-home/);
  assert.match(html, /id="searchDialog"/);
  for (const folder of ['tools','school','friends','games','data','experiments']) {
    assert.match(html, new RegExp(`data-folder="${folder}"`));
  }
  assert.doesNotMatch(html, /class="card(?:\s|\")/);
});

test('every public project route remains linked', () => {
  for (const route of routes) assert.match(html, new RegExp(`href="${route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`));
});
