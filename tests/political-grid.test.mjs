import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const root = new URL('../political-grid/', import.meta.url);
const html = readFileSync(new URL('index.html', root), 'utf8');
const script = readFileSync(new URL('app.js', root), 'utf8');
const css = readFileSync(new URL('styles.css', root), 'utf8');
const schema = readFileSync(new URL('schema.sql', root), 'utf8');
const extension = readFileSync(new URL('overlap.js', root), 'utf8');
const comparisonSchema = readFileSync(new URL('comparisons-schema.sql', root), 'utf8');
const comparisonCss = readFileSync(new URL('overlap.css', root), 'utf8');

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


test('statement box heatmap retains every original image position without treating position as political data', () => {
  const context = {
    localStorage: { getItem: () => null },
    document: { readyState: 'loading', addEventListener() {} },
    window: {}
  };
  vm.runInNewContext(script + '\n' + extension, context, { timeout: 2000 });
  const api = context.window.PoliticalGridOverlap;
  assert.ok(api);
  const cells = new Set();
  for(let id = 0;id < 100;id++){
    const pos = api.coords(id);
    assert.ok(pos.x >= 0 && pos.x < 10 && pos.y >= 0 && pos.y < 10);
    assert.equal(api.at(pos.x, pos.y), id);
    cells.add(pos.x + ':' + pos.y);
  }
  assert.equal(cells.size, 100);
  assert.equal(api.at(0, 0), 0);
  assert.equal(api.at(5, 0), 25);
  assert.equal(api.at(0, 5), 50);
  assert.equal(api.at(5, 5), 75);
});

test('overlap uses exact selected checks, not jointly unchecked statements', () => {
  const context = {
    localStorage: { getItem: () => null },
    document: { readyState: 'loading', addEventListener() {} },
    window: {}
  };
  vm.runInNewContext(script + '\n' + extension, context, { timeout: 2000 });
  const { mask, bits, shown } = context.window.PoliticalGridOverlap;
  const profiles = [
    { set: new Set([0,25,50]) },
    { set: new Set([25,75]) },
    { set: new Set([25,50,75]) }
  ];
  assert.equal(mask(25, profiles), 7);
  assert.equal(mask(50, profiles), 5);
  assert.equal(mask(0, profiles), 1);
  assert.equal(mask(75, profiles), 6);
  assert.equal(mask(99, profiles), 0);
  assert.equal(bits(7), 3);
  assert.equal(bits(5), 2);
  assert.equal(shown(0, 3), false);
  assert.equal(shown(5, 3), true);
});

test('public comparisons are explicitly opt-in and named read is limited', () => {
  assert.match(html, /id="public-visible"/);
  assert.doesNotMatch(html, /id="public-visible"[^>]*checked/);
  for (const id of ['overlap-box-grid','mode-community','mode-people','overlap-presets',
    'exact-combo','overlap-pairs','overlap-combinations','overlap-common','overlap-group-profile']) {
    assert.match(html, new RegExp('id="' + id + '"'));
  }
  assert.match(html, /src="\.\/overlap\.js"/);
  assert.match(html, /href="\.\/overlap\.css"/);
  assert.match(extension, /political_grid_visible/);
  assert.match(script, /p_visible: submittedVisible/);
  assert.match(comparisonSchema, /public_visible boolean not null default false/i);
  assert.match(comparisonSchema, /where public_visible = true/i);
  assert.match(comparisonSchema, /limit 200/i);
  assert.doesNotMatch(comparisonSchema, /grant select on public\.political_grid_responses/i);
  assert.match(comparisonCss, /@media\(max-width:770px\)/);
});


test('comparison view uses labeled colored boxes, not a numbered canvas', () => {
  assert.match(html, /id="overlap-box-grid"/);
  assert.doesNotMatch(html, /id="overlap-canvas"/);
  assert.match(html, /Scroll horizontally/);
  assert.match(extension, /function renderTiles\(\)/);
  assert.match(extension, /statement\.label/);
  assert.match(extension, /style\.backgroundColor/);
  assert.match(extension, /gridColumn/);
  assert.match(extension, /aria-pressed/);
  assert.doesNotMatch(extension, /canvasDraw\(|getContext\(/);
  assert.match(comparisonCss, /grid-template-columns:repeat\(10,minmax\(92px,1fr\)\)/);
  assert.match(comparisonCss, /overflow-x:auto/);
});
