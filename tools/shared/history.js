function clone(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

export function createHistory(initialState, { initialLabel = 'Initial state', limit = 100 } = {}) {
  let items = [{ label: initialLabel, state: clone(initialState) }];
  let index = 0;

  function current() {
    return clone(items[index]?.state);
  }

  function entries() {
    return items.map((entry, position) => ({ ...entry, state: clone(entry.state), current: position === index }));
  }

  function push({ label, state }) {
    const safeLabel = String(label || 'Change');
    items = items.slice(0, index + 1);
    items.push({ label: safeLabel, state: clone(state) });
    if (items.length > limit) items = items.slice(items.length - limit);
    index = items.length - 1;
    return current();
  }

  function canUndo() {
    return index > 0;
  }

  function canRedo() {
    return index < items.length - 1;
  }

  function undo() {
    if (canUndo()) index -= 1;
    return current();
  }

  function redo() {
    if (canRedo()) index += 1;
    return current();
  }

  function clear(state = current()) {
    items = [{ label: initialLabel, state: clone(state) }];
    index = 0;
    return current();
  }

  return { current, entries, push, canUndo, canRedo, undo, redo, clear };
}
