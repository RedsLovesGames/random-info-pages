export const FINAL_COMMAND = 'reconstruct subject_00 /commit';
export const SOURCE_INTERVAL_UNREAD = 'ERROR: SOURCE INTERVAL UNREAD';
export const ARCHIVE_READ_COOKIE = 'rip_lacuna_v1_missing_interval_read';
export const SUBJECT00_COMMIT_COOKIE = 'rip_lacuna_v1_subject00_committed';

export function normalizeCommand(line = ''): string {
  return String(line).trim().replace(/\s+/g, ' ').toLowerCase();
}

export function isFinalCommand(line = ''): boolean {
  return normalizeCommand(line) === FINAL_COMMAND;
}

export function parseCookieString(cookieString = ''): Map<string, string> {
  const result = new Map<string, string>();
  for (const segment of String(cookieString).split(';')) {
    const trimmed = segment.trim();
    if (!trimmed) continue;
    const equals = trimmed.indexOf('=');
    const rawName = equals >= 0 ? trimmed.slice(0, equals) : trimmed;
    const rawValue = equals >= 0 ? trimmed.slice(equals + 1) : '';
    let name = rawName;
    let value = rawValue;
    try { name = decodeURIComponent(rawName); } catch {}
    try { value = decodeURIComponent(rawValue); } catch {}
    result.set(name, value);
  }
  return result;
}

export function hasArchiveRead(cookieString = ''): boolean {
  return parseCookieString(cookieString).get(ARCHIVE_READ_COOKIE) === '1';
}

export function hasSubject00Commit(cookieString = ''): boolean {
  return parseCookieString(cookieString).get(SUBJECT00_COMMIT_COOKIE) === '1';
}

export function gateFinalCommand(line: string, cookieString = ''): {
  handled: boolean;
  accepted: boolean;
  error: string | null;
} {
  if (!isFinalCommand(line)) {
    return { handled: false, accepted: false, error: null };
  }
  if (!hasArchiveRead(cookieString)) {
    return { handled: true, accepted: false, error: SOURCE_INTERVAL_UNREAD };
  }
  return { handled: true, accepted: true, error: null };
}

export function resolveFinaleRoute({
  legacyFinaleReached = false,
  archiveRead = false,
  committed = false,
}: {
  legacyFinaleReached?: boolean;
  archiveRead?: boolean;
  committed?: boolean;
} = {}): 'normal' | 'archive' | 'complete' {
  if (committed) return 'complete';
  if (legacyFinaleReached || archiveRead) return 'archive';
  return 'normal';
}
