import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const pageUrl = new URL('../tools/data/index.html', import.meta.url);

test('Data Studio page exists', () => assert.equal(existsSync(pageUrl), true));

const html = existsSync(pageUrl) ? readFileSync(pageUrl, 'utf8') : '';
for (const token of [
  'dataDrop','dataPicker','dataTable','dataSearch','dataSummary',
  'tableData','cleanData','transformData','statisticsData','sqlData','chartData','exportData',
  'undoData','redoData','dataHistory','data-app.js'
]) {
  test(`Data Studio exposes ${token}`, () => assert.match(html, new RegExp(token)));
}

test('Data Studio advertises planned local input formats', () => {
  for (const ext of ['.csv','.tsv','.json','.jsonl','.xlsx','.parquet','.sqlite']) {
    assert.match(html, new RegExp(ext.replace('.', '\\.')));
  }
});
