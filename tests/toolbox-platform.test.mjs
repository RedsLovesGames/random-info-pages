import test from 'node:test';
import assert from 'node:assert/strict';

import {
  TOOLBOX_REGISTRY,
  getWorkspace,
  findToolboxMatches,
  getVisibleWorkspaces,
} from '../tools/shared/registry.js';
import { createHistory } from '../tools/shared/history.js';
import { createWorkspaceState, readRequestedAction } from '../tools/shared/workspace.js';
import { getContextualActions } from '../tools/shared/actions.js';
import { formatBytes, safeFilename } from '../tools/shared/files.js';

test('registry defines 13 in-scope workspaces and excludes web/design', () => {
  assert.equal(TOOLBOX_REGISTRY.length, 13);
  assert.equal(TOOLBOX_REGISTRY.some(workspace => workspace.id === 'web-design'), false);
  for (const id of ['time', 'image', 'money', 'text', 'pdf', 'files', 'media', 'data', 'developer', 'math', 'random', 'codes', 'network']) {
    assert.ok(getWorkspace(id), `missing workspace ${id}`);
  }
});

test('step 5 publishes Data Studio after the existing seven workspaces', () => {
  assert.deepEqual(getVisibleWorkspaces().map(workspace => workspace.id), ['time', 'image', 'money', 'text', 'pdf', 'files', 'media', 'data']);
});

test('search ranks exact action aliases and returns deep-linkable actions', () => {
  const merge = findToolboxMatches('merge pdf');
  assert.equal(merge[0].workspaceId, 'pdf');
  assert.equal(merge[0].actionId, 'merge');
  assert.equal(merge[0].route, './pdf/?action=merge');
  assert.equal(merge[0].available, true);

  const checksum = findToolboxMatches('sha256 file');
  assert.equal(checksum[0].workspaceId, 'files');
  assert.equal(checksum[0].actionId, 'hash');
  assert.equal(checksum[0].available, true);

  const recorder = findToolboxMatches('screen recorder');
  assert.equal(recorder[0].workspaceId, 'media');
  assert.equal(recorder[0].actionId, 'record');
  assert.equal(recorder[0].available, true);

  const dedupe = findToolboxMatches('remove duplicate rows');
  assert.equal(dedupe[0].workspaceId, 'data');
  assert.equal(dedupe[0].actionId, 'dedupe');
  assert.equal(dedupe[0].route, './data/?action=dedupe');
  assert.equal(dedupe[0].available, true);

  const sql = findToolboxMatches('query csv');
  assert.equal(sql[0].workspaceId, 'data');
  assert.equal(sql[0].actionId, 'sql');
  assert.equal(sql[0].available, true);

  const base64 = findToolboxMatches('base64');
  assert.equal(base64[0].workspaceId, 'developer');
  assert.equal(base64[0].actionId, 'base64');

  const subnet = findToolboxMatches('cidr');
  assert.equal(subnet[0].workspaceId, 'network');
  assert.equal(subnet[0].actionId, 'subnet');
});

test('history supports undo, redo, and truncates redo branch after a new action', () => {
  const history = createHistory({ value: 0 });
  history.push({ label: 'one', state: { value: 1 } });
  history.push({ label: 'two', state: { value: 2 } });
  assert.deepEqual(history.undo(), { value: 1 });
  assert.deepEqual(history.redo(), { value: 2 });
  assert.deepEqual(history.undo(), { value: 1 });
  history.push({ label: 'three', state: { value: 3 } });
  assert.equal(history.canRedo(), false);
  assert.deepEqual(history.current(), { value: 3 });
  assert.deepEqual(history.entries().map(entry => entry.label), ['Initial state', 'one', 'three']);
});

test('workspace state keeps source, selection, current action, outputs, and history together', () => {
  const workspace = createWorkspaceState({ id: 'pdf', source: { name: 'paper.pdf' } });
  workspace.setSelection(['p1', 'p3']);
  workspace.setCurrentAction('rotate');
  workspace.addOutput({ type: 'pdf', name: 'edited.pdf' });
  workspace.commit('rotate pages', { source: { name: 'paper.pdf' }, workingState: { rotations: { p1: 90 } } });

  const snapshot = workspace.snapshot();
  assert.equal(snapshot.id, 'pdf');
  assert.deepEqual(snapshot.selection, ['p1', 'p3']);
  assert.equal(snapshot.currentAction, 'rotate');
  assert.equal(snapshot.outputs[0].name, 'edited.pdf');
  assert.equal(workspace.history.entries().at(-1).label, 'rotate pages');
});

test('requested action reads query first and hash second', () => {
  assert.equal(readRequestedAction('?action=merge', '#rotate'), 'merge');
  assert.equal(readRequestedAction('', '#action=rotate'), 'rotate');
  assert.equal(readRequestedAction('?mode=legacy', '#split'), 'legacy');
  assert.equal(readRequestedAction('', ''), null);
});

test('contextual actions honor source type and selection requirements', () => {
  const noSelection = getContextualActions('pdf', { sourceType: 'pdf', selectionCount: 0 });
  assert.ok(noSelection.some(action => action.id === 'merge'));
  assert.equal(noSelection.some(action => action.id === 'delete'), false);

  const selected = getContextualActions('pdf', { sourceType: 'pdf', selectionCount: 2 });
  assert.ok(selected.some(action => action.id === 'delete'));
  assert.ok(selected.some(action => action.id === 'rotate'));
});

test('shared file helpers format sizes and produce safe filenames', () => {
  assert.equal(formatBytes(0), '0 B');
  assert.equal(formatBytes(1536), '1.5 KB');
  assert.equal(safeFilename('  report: final?.pdf  '), 'report- final-.pdf');
  assert.equal(safeFilename(''), 'download');
});
