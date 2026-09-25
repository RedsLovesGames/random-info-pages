import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

const coreUrl = new URL('./data-core.js', import.meta.url);

test('Data Studio core exists', () => assert.equal(existsSync(coreUrl), true));

if (existsSync(coreUrl)) {
  const core = await import('./data-core.js');
  const {
    normalizeRows, inferColumns, dedupeRows, trimStringCells, fillMissingValues,
    renameColumn, removeColumn, splitColumn, combineColumns, transposeTable,
    groupRows, pivotRows, summarizeColumn, pearsonCorrelation,
  } = core;

  test('normalizeRows preserves row order and fills sparse keys', () => {
    assert.deepEqual(normalizeRows([{ a: 1 }, { b: 2 }]), [{ a: 1, b: null }, { a: null, b: 2 }]);
  });

  test('inferColumns identifies numeric, boolean, date, and text columns', () => {
    const columns = inferColumns([
      { n: 1, flag: true, when: '2026-09-25', name: 'A' },
      { n: 2, flag: false, when: '2026-09-26', name: 'B' },
    ]);
    assert.deepEqual(Object.fromEntries(columns.map(column => [column.name, column.type])), {
      n: 'number', flag: 'boolean', when: 'date', name: 'text',
    });
  });

  test('dedupeRows removes identical rows', () => {
    assert.deepEqual(dedupeRows([{ a: 1 }, { a: 1 }, { a: 2 }]), [{ a: 1 }, { a: 2 }]);
  });

  test('trimStringCells trims only strings', () => {
    assert.deepEqual(trimStringCells([{ a: ' x ', b: 2 }]), [{ a: 'x', b: 2 }]);
  });

  test('fillMissingValues fills null, undefined, and empty strings', () => {
    assert.deepEqual(fillMissingValues([{ a: null, b: '', c: 0 }, { a: 2, b: undefined, c: false }], 'NA'), [
      { a: 'NA', b: 'NA', c: 0 }, { a: 2, b: 'NA', c: false },
    ]);
  });

  test('renameColumn and removeColumn transform schema without mutating source', () => {
    const source = [{ a: 1, b: 2 }];
    assert.deepEqual(renameColumn(source, 'a', 'alpha'), [{ alpha: 1, b: 2 }]);
    assert.deepEqual(removeColumn(source, 'b'), [{ a: 1 }]);
    assert.deepEqual(source, [{ a: 1, b: 2 }]);
  });

  test('splitColumn and combineColumns support common text transforms', () => {
    const split = splitColumn([{ full: 'A-B' }], 'full', '-', ['left', 'right']);
    assert.deepEqual(split, [{ full: 'A-B', left: 'A', right: 'B' }]);
    assert.deepEqual(combineColumns(split, ['left', 'right'], 'joined', ' / '), [{ full: 'A-B', left: 'A', right: 'B', joined: 'A / B' }]);
  });

  test('transposeTable returns row labels and column values', () => {
    assert.deepEqual(transposeTable([{ a: 1, b: 2 }, { a: 3, b: 4 }]), [
      { field: 'a', row_1: 1, row_2: 3 },
      { field: 'b', row_1: 2, row_2: 4 },
    ]);
  });

  test('groupRows aggregates count, sum, and mean', () => {
    assert.deepEqual(groupRows([
      { team: 'A', score: 10 }, { team: 'A', score: 20 }, { team: 'B', score: 5 },
    ], 'team', 'score'), [
      { team: 'A', count: 2, sum: 30, mean: 15 },
      { team: 'B', count: 1, sum: 5, mean: 5 },
    ]);
  });

  test('pivotRows pivots category values into columns', () => {
    assert.deepEqual(pivotRows([
      { region: 'E', quarter: 'Q1', sales: 10 },
      { region: 'E', quarter: 'Q2', sales: 20 },
      { region: 'W', quarter: 'Q1', sales: 5 },
    ], 'region', 'quarter', 'sales'), [
      { region: 'E', Q1: 10, Q2: 20 },
      { region: 'W', Q1: 5, Q2: null },
    ]);
  });

  test('summarizeColumn returns descriptive statistics', () => {
    const summary = summarizeColumn([{ x: 1 }, { x: 2 }, { x: 3 }, { x: null }], 'x');
    assert.equal(summary.count, 3);
    assert.equal(summary.missing, 1);
    assert.equal(summary.mean, 2);
    assert.equal(summary.median, 2);
    assert.equal(summary.min, 1);
    assert.equal(summary.max, 3);
  });

  test('pearsonCorrelation returns 1 for perfectly aligned vectors', () => {
    assert.equal(pearsonCorrelation([{ x: 1, y: 2 }, { x: 2, y: 4 }, { x: 3, y: 6 }], 'x', 'y'), 1);
  });
}
