const PREFIX = 'rip.toolbox.session.';

export function readSession(key, fallback = null) {
  if (typeof localStorage === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(`${PREFIX}${key}`);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function writeSession(key, value) {
  if (typeof localStorage === 'undefined') return false;
  try {
    localStorage.setItem(`${PREFIX}${key}`, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function clearSession(key) {
  if (typeof localStorage === 'undefined') return false;
  try {
    localStorage.removeItem(`${PREFIX}${key}`);
    return true;
  } catch {
    return false;
  }
}
