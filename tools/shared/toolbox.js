(() => {
  'use strict';

  const STORAGE_KEY = 'rip.toolbox.v1';

  function readState() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch {
      return {};
    }
  }

  function writeState(next) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage is optional. The toolbox must remain usable without it.
    }
  }

  function recordRecent(route) {
    const state = readState();
    const recent = [route, ...(state.recent || []).filter(item => item !== route)].slice(0, 4);
    writeState({ ...state, recent });
  }

  window.Toolbox = { readState, writeState, recordRecent };
})();