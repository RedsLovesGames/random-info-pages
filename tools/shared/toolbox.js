(() => {
  'use strict';

  const STORAGE_KEY = 'rip.toolbox.v1';

  function readState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  function writeState(next) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return true;
    } catch {
      return false;
    }
  }

  function recordRecent(route) {
    if (!route) return readState();
    const state = readState();
    const recent = [route, ...(state.recent || []).filter(item => item !== route)].slice(0, 4);
    const next = { ...state, recent };
    writeState(next);
    return next;
  }

  function isFavorite(route) {
    return (readState().favorites || []).includes(route);
  }

  function toggleFavorite(route) {
    const state = readState();
    const favorites = new Set(Array.isArray(state.favorites) ? state.favorites : []);
    if (favorites.has(route)) favorites.delete(route); else favorites.add(route);
    const next = { ...state, favorites: [...favorites].slice(0, 20) };
    writeState(next);
    return favorites.has(route);
  }

  window.Toolbox = { readState, writeState, recordRecent, isFavorite, toggleFavorite };
})();