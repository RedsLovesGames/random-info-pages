const roomFields = ['changes', 'roomRevisions', 'notes', 'style', 'cover', 'text'];
const sessionFields = ['hp', 'trap', 'loot'];

function parent(project, path) {
  return path.slice(0, -1).reduce((value, key) => value?.[key], project);
}

function read(project, path) {
  return parent(project, path)?.[path.at(-1)];
}

function equal(a, b) {
  return Object.is(a, b) || JSON.stringify(a) === JSON.stringify(b);
}

export function createRoomHistory() {
  const entries = [];
  return {
    get length() { return entries.length; },
    clear() { entries.length = 0; },
    edit(project, roomId, label, change, { door, coalesce = false, now = Date.now() } = {}) {
      const paths = [
        ...roomFields.map(field => [field, roomId]),
        ...sessionFields.map(field => ['session', 'rooms', roomId, field])
      ];
      if (door !== undefined) paths.push(['doors', door], ['session', 'doors', door]);
      const before = paths.map(path => structuredClone(read(project, path)));
      const result = change();
      if (result === false) return result;
      let patches = paths.flatMap((path, index) => {
        const after = read(project, path);
        return equal(before[index], after) ? [] : [{ path, before: before[index], after: structuredClone(after) }];
      });
      if (!patches.length) return result;
      const previous = entries.at(-1);
      if (coalesce && previous?.coalesce && previous.roomId === roomId &&
          previous.label === label && now - previous.now < 800) {
        entries.pop();
        patches = patches.map(patch => {
          const old = previous.patches.find(entry => equal(entry.path, patch.path));
          return old ? { ...patch, before: old.before } : patch;
        }).filter(patch => !equal(patch.before, patch.after));
      }
      if (patches.length) entries.push({ roomId, label, patches, coalesce, now });
      if (entries.length > 32) entries.shift();
      return result;
    },
    undo(project) {
      while (entries.length) {
        const { roomId, label, patches } = entries.pop();
        let applied = false;
        for (const { path, before, after } of patches) {
          const target = parent(project, path);
          const key = path.at(-1);
          // Later changes made during play take precedence over an old edit.
          if (!target || !equal(target[key], after)) continue;
          if (before === undefined) delete target[key];
          else target[key] = before;
          applied = true;
        }
        if (applied) return { roomId, label };
      }
    }
  };
}
