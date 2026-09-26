import { createHistory } from './history.js';

function clone(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

export function readRequestedAction(search = '', hash = '') {
  const params = new URLSearchParams(String(search || '').replace(/^\?/, ''));
  const queryAction = params.get('action') || params.get('mode');
  if (queryAction) return queryAction;
  const rawHash = String(hash || '').replace(/^#/, '');
  if (!rawHash) return null;
  if (rawHash.includes('=')) {
    const hashParams = new URLSearchParams(rawHash);
    return hashParams.get('action') || hashParams.get('mode');
  }
  return rawHash || null;
}

export function createWorkspaceState({ id, source = null, workingState = {}, selection = [] } = {}) {
  let state = {
    id: id || null,
    source: clone(source),
    workingState: clone(workingState || {}),
    selection: [...selection],
    currentAction: null,
    outputs: [],
  };

  const history = createHistory({ source: state.source, workingState: state.workingState });

  function snapshot() {
    return clone(state);
  }

  function setSource(sourceValue, nextWorkingState = {}) {
    state.source = clone(sourceValue);
    state.workingState = clone(nextWorkingState || {});
    state.selection = [];
    state.currentAction = null;
    state.outputs = [];
    history.clear({ source: state.source, workingState: state.workingState });
    return snapshot();
  }

  function setWorkingState(value) {
    state.workingState = clone(value || {});
    return snapshot();
  }

  function setSelection(value) {
    state.selection = Array.isArray(value) ? [...value] : [];
    return snapshot();
  }

  function setCurrentAction(actionId) {
    state.currentAction = actionId || null;
    return snapshot();
  }

  function addOutput(output) {
    state.outputs = [...state.outputs, clone(output)];
    return snapshot();
  }

  function clearOutputs() {
    state.outputs = [];
    return snapshot();
  }

  function commit(label, patch = {}) {
    if ('source' in patch) state.source = clone(patch.source);
    if ('workingState' in patch) state.workingState = clone(patch.workingState || {});
    history.push({ label, state: { source: state.source, workingState: state.workingState } });
    return snapshot();
  }

  function applyHistory(historyState) {
    if (!historyState) return snapshot();
    state.source = clone(historyState.source);
    state.workingState = clone(historyState.workingState || {});
    state.selection = [];
    state.currentAction = null;
    return snapshot();
  }

  function undo() {
    return applyHistory(history.undo());
  }

  function redo() {
    return applyHistory(history.redo());
  }

  return {
    history,
    snapshot,
    setSource,
    setWorkingState,
    setSelection,
    setCurrentAction,
    addOutput,
    clearOutputs,
    commit,
    undo,
    redo,
  };
}

export function openWorkspaceAction(actionId, { replace = false } = {}) {
  if (typeof window === 'undefined') return false;
  const url = new URL(window.location.href);
  if (actionId) url.searchParams.set('action', actionId); else url.searchParams.delete('action');
  const method = replace ? 'replaceState' : 'pushState';
  window.history?.[method]?.({}, '', url);
  window.dispatchEvent(new CustomEvent('toolbox:actionchange', { detail: { actionId: actionId || null } }));
  return true;
}
