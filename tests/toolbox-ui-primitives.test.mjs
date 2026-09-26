import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const shared = join(here, '..', 'tools', 'shared');
const css = readFileSync(join(shared, 'toolbox.css'), 'utf8');

test('shared workspace modules exist', () => {
  for (const file of ['registry.js', 'workspace.js', 'actions.js', 'history.js', 'session.js', 'artifacts.js', 'loader.js', 'files.js', 'workers.js']) {
    assert.equal(existsSync(join(shared, file)), true, `${file} should exist`);
  }
});

test('toolbox stylesheet exposes reusable workspace primitives', () => {
  for (const className of [
    '.tb-workspace', '.tb-sourcebar', '.tb-dropzone', '.tb-workarea', '.tb-preview', '.tb-toolgrid',
    '.tb-toolicon', '.tb-selectionbar', '.tb-action-panel', '.tb-history', '.tb-progress', '.tb-exportbar',
    '.tb-editorpane', '.tb-outputpane', '.tb-tablepane', '.tb-scenario', '.tb-empty-state', '.tb-error-state'
  ]) assert.match(css, new RegExp(className.replace('.', '\\.')));
});
