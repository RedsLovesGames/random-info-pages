(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.FxCore = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  const DEFAULT_TTL_MS = 12 * 60 * 60 * 1000;

  function normalizeRows(rows, base) {
    const normalizedBase = String(base || '').trim().toUpperCase();
    const rates = {};
    if (normalizedBase) rates[normalizedBase] = 1;
    let effectiveDate = '';
    for (const row of Array.isArray(rows) ? rows : []) {
      const quote = String(row?.quote || '').trim().toUpperCase();
      const rate = Number(row?.rate);
      if (!quote || !Number.isFinite(rate) || rate <= 0) continue;
      rates[quote] = rate;
      const date = String(row?.date || '');
      if (/^\d{4}-\d{2}-\d{2}$/.test(date) && date > effectiveDate) effectiveDate = date;
    }
    return { base: normalizedBase, rates, effectiveDate };
  }

  function convert(amount, rate) {
    const numericAmount = Number(amount);
    const numericRate = Number(rate);
    if (!Number.isFinite(numericAmount)) throw new Error('Amount must be a finite number.');
    if (!Number.isFinite(numericRate) || numericRate <= 0) throw new Error('Exchange rate must be positive.');
    return numericAmount * numericRate;
  }

  function fetchedAtMs(cache) {
    const raw = cache?.fetchedAt;
    if (typeof raw === 'number') return Number.isFinite(raw) ? raw : Number.NaN;
    const parsed = Date.parse(raw);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }

  function isFresh(cache, now = Date.now(), ttlMs = DEFAULT_TTL_MS) {
    const stamp = fetchedAtMs(cache);
    const current = Number(now);
    if (!Number.isFinite(stamp) || !Number.isFinite(current) || stamp > current) return false;
    return current - stamp <= ttlMs;
  }

  function ageText(ageMs) {
    if (!Number.isFinite(ageMs) || ageMs < 0) return 'unknown age';
    const minutes = Math.floor(ageMs / 60000);
    if (minutes < 60) return `${Math.max(1, minutes)}m old`;
    const hours = Math.floor(minutes / 60);
    if (hours < 48) return `${hours}h old`;
    return `${Math.floor(hours / 24)}d old`;
  }

  function cacheLabel(cache, now = Date.now(), fresh = isFresh(cache, now)) {
    const date = cache?.effectiveDate || 'unknown rate date';
    const stamp = fetchedAtMs(cache);
    const age = Number.isFinite(stamp) ? ageText(Number(now) - stamp) : 'unknown age';
    return fresh ? `Cached rates · ${date} · ${age}` : `Stale cached rates · ${date} · ${age}`;
  }

  return { DEFAULT_TTL_MS, normalizeRows, convert, isFresh, cacheLabel };
});
