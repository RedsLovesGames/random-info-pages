import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

const routes = [
  './tools/', './wheel/', './whenwemeet/', './school-schedule/', './friends/',
  './tideborne/', './tide2/', './vct-scout/', './oldasspolitic/',
  './heatmap/', './political-grid/', './infrastructure-atlas/', './wanuiv2/', './nerdcore-prompts/',
  './music-microscope/', './one-million/', './algorithm-arena/', './cryptography-museum/'
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

test('toolbox appears in the Tools folder and search index', () => {
  assert.match(html, /href="\.\/tools\/"/);
  assert.match(html, /<span class="folder-count">03 files<\/span>/);
  assert.match(html, /\{n:'Toolbox',p:'\.\/tools\/'/);
});

test('political grid is listed in the data folder and searchable', () => {
  assert.match(html, /data-folder="data"[\s\S]*?<span class="folder-count">05 files<\/span>/);
  assert.match(html, /href="\.\/political-grid\/"/);
  assert.match(html, /\{n:'Political Grid',p:'\.\/political-grid\/'/);
  assert.match(html, /id="searchLabel">18 files/);
});

test('folder counts, total and search metadata agree with all 18 archive links', () => {
  const index = runInNewContext(html.match(/const projects=(\[[\s\S]*?\]);/)[1]);
  assert.equal(index.length, 18);
  assert.equal(new Set(index.map(p=>p.p)).size, 18);
  let total=0;
  for (const folder of html.matchAll(/<details class="folder" data-folder="([^"]+)"[\s\S]*?<\/details>/g)) {
    const links=[...folder[0].matchAll(/class="file" href="([^"]+)"/g)].map(m=>m[1]);
    const count=Number(folder[0].match(/class="folder-count">(\d+)/)[1]);
    assert.equal(count,links.length,`${folder[1]} count`);
    const category=folder[1][0].toUpperCase()+folder[1].slice(1);
    for(const link of links) {
      const item=index.find(p=>p.p===link);
      assert.ok(item,`${link} searchable`);
      assert.equal(item.c,category);
      assert.ok(item.k.length>15,`${link} search keywords`);
    }
    total+=count;
  }
  assert.equal(total,18);
  assert.match(html,/<b>18<\/b><span>Files<\/span>/);
});

test('four exhibits are searchable in their requested folders', () => {
  for(const [name,route,category] of [
    ['Music Microscope','music-microscope','Experiments'],
    ['One Million, Actually','one-million','Data'],
    ['Algorithm Arena','algorithm-arena','Experiments'],
    ['Cryptography Museum','cryptography-museum','Experiments']
  ]) {
    const index = runInNewContext(html.match(/const projects=(\[[\s\S]*?\]);/)[1]);
    const item=index.find(p=>p.p===`./${route}/`);
    assert.ok(item,`${name} indexed`);
    assert.equal(item.n,name);
    assert.equal(item.c,category);
  }
});


test('infrastructure atlas is linked, categorized under Data, and searchable', () => {
  assert.match(html, /href="\.\/infrastructure-atlas\/"/);
  assert.match(html, /\{n:'Infrastructure Atlas',p:'\.\/infrastructure-atlas\/',c:'Data'/);
  assert.match(html, /data-folder="data"[\s\S]*?Infrastructure Atlas[\s\S]*?data-folder="experiments"/);
});
