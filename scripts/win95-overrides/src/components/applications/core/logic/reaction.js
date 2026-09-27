export function recordReaction(history, value, limit = 5) {
    const safeHistory = Array.isArray(history) ? history : [];
    const safeLimit = Math.max(1, Number(limit) || 5);
    return [value, ...safeHistory].slice(0, safeLimit);
}
