import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const root = new URL('../political-grid/', import.meta.url);
const html = readFileSync(new URL('index.html', root), 'utf8');
const script = readFileSync(new URL('app.js', root), 'utf8');
const css = readFileSync(new URL('styles.css', root), 'utf8');
const schema = readFileSync(new URL('schema.sql', root), 'utf8');

function loadDefinitions() {
  const context = {
    localStorage: { getItem: () => null },
    document: { readyState: 'loading', addEventListener() {} }
  };
  vm.runInNewContext(script + '\nglobalThis.__definitions = { GROUPS, STATEMENTS, state };',
    context, { timeout: 2000, filename: 'political-grid/app.js' });
  return context.__definitions;
}

test('source questionnaire has 100 uniquely identified items in the four original 25-tile groups', () => {
  const { GROUPS, STATEMENTS } = loadDefinitions();
  assert.equal(GROUPS.length, 4);
  assert.deepEqual(Array.from(GROUPS, x => x.key), ['rose', 'blue', 'green', 'yellow']);
  for (const group of GROUPS) assert.equal(group.statements.length, 25);
  assert.equal(STATEMENTS.length, 100);
  assert.deepEqual(Array.from(STATEMENTS, item => item.id), Array.from({ length: 100 }, (_, i) => i));
  assert.equal(new Set(Array.from(STATEMENTS, x => x.id)).size, 100);
  assert.equal(STATEMENTS[0].label, 'Execute all capitalists');
  assert.equal(STATEMENTS[25].label, 'Hitler was right');
  assert.equal(STATEMENTS[50].label, 'Hates white people');
  assert.equal(STATEMENTS[75].label, 'Gamer');
  assert.equal(STATEMENTS[99].label, 'Unironic anarcho-capitalist');
});

test('page includes accessible grid, name entry, and real aggregate insights', () => {
  for (const id of ['participant-name','save-button','statement-board','selection-count',
    'statistics','stats-status','group-bars','personal-bars','ranking-list','export-button',
    'clear-dialog','refresh-button']) assert.match(html, new RegExp('id="' + id + '"'));
  assert.match(html, /content-warning/);
  assert.match(script, /political_grid_submit/);
  assert.match(script, /political_grid_load/);
  assert.match(script, /political_grid_stats/);
  assert.match(script, /crypto\.randomUUID/);
  assert.match(css, /@media\(max-width:440px\)/);
});

test('SQL isolates named responses and exposes only limited aggregate RPCs', () => {
  assert.match(schema, /enable row level security/i);
  assert.match(schema, /revoke all on public\.political_grid_responses from public, anon, authenticated/i);
  assert.match(schema, /security definer/i);
  assert.match(schema, /select jsonb_build_object\(/);
  assert.doesNotMatch(schema, /grant select on public\.political_grid_responses to anon/i);
});
