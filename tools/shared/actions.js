import { getWorkspace } from './registry.js';

function acceptsSource(action, sourceType) {
  if (!action.accepts?.length || !sourceType) return true;
  return action.accepts.includes(sourceType);
}

export function getContextualActions(workspaceId, context = {}) {
  const workspace = getWorkspace(workspaceId);
  if (!workspace) return [];
  const selectionCount = Number(context.selectionCount || 0);
  return (workspace.actions || []).filter(action => {
    if (!acceptsSource(action, context.sourceType)) return false;
    if (action.requiresSelection && selectionCount < 1) return false;
    if (Number.isFinite(action.minSelection) && selectionCount < action.minSelection) return false;
    return true;
  });
}

export function groupActions(actions = []) {
  return actions.reduce((groups, action) => {
    const group = action.group || 'tools';
    (groups[group] ||= []).push(action);
    return groups;
  }, {});
}

export function findAction(workspaceId, actionId) {
  return getWorkspace(workspaceId)?.actions?.find(action => action.id === actionId) || null;
}
