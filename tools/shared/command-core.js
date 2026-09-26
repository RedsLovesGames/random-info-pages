import { findToolboxMatches, TOOLBOX_REGISTRY } from './registry.js';

export function searchCommands(query, { limit = 14 } = {}) {
  const matches = findToolboxMatches(query, { includeUnavailable: false, limit: Math.max(limit * 2, 20) });
  return matches.filter(match => match.available).slice(0, limit);
}

export function allWorkspaceCommands() {
  return TOOLBOX_REGISTRY.filter(workspace => workspace.available).map(workspace => ({
    kind: 'workspace',
    workspaceId: workspace.id,
    workspaceTitle: workspace.title,
    actionId: null,
    title: workspace.title,
    route: workspace.route,
    available: true,
    score: 0,
  }));
}

export function commandLabel(match) {
  return match.kind === 'action' ? `${match.workspaceTitle} · ${match.title}` : match.title;
}
