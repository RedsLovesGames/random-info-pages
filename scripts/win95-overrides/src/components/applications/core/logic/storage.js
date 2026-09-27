function resolveStorage(storage) {
    if (storage !== undefined) return storage;
    try {
        return typeof window === 'undefined' ? null : window.localStorage;
    } catch (_error) {
        return null;
    }
}

export function loadLocal(key, fallback, storage) {
    try {
        const target = resolveStorage(storage);
        if (!target) return fallback;
        const raw = target.getItem(key);
        if (raw === null) return fallback;
        return JSON.parse(raw);
    } catch (_error) {
        return fallback;
    }
}

export function saveLocal(key, value, storage) {
    try {
        const target = resolveStorage(storage);
        if (!target) return false;
        target.setItem(key, JSON.stringify(value));
        return true;
    } catch (_error) {
        return false;
    }
}
