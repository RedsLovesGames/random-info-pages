(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.MoneyCore = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  function seriesKindForYear(year) {
    return Number(year) < 1913 ? 'estimated' : 'official';
  }

  function getIndex(series, year) {
    const key = String(Math.trunc(Number(year)));
    const value = series?.values?.[key];
    if (!Number.isFinite(Number(value)) || Number(value) <= 0) {
      throw new Error(`Missing CPI index for year ${key}.`);
    }
    return Number(value);
  }

  function calculateInflation(amount, fromYear, toYear, series) {
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount)) throw new Error('Amount must be a finite number.');
    const fromIndex = getIndex(series, fromYear);
    const toIndex = getIndex(series, toYear);
    const multiplier = toIndex / fromIndex;
    return {
      amount: numericAmount,
      fromYear: Number(fromYear),
      toYear: Number(toYear),
      fromIndex,
      toIndex,
      multiplier,
      equivalent: numericAmount * multiplier,
      priceLevelChangePercent: (multiplier - 1) * 100,
      fromKind: seriesKindForYear(fromYear),
      toKind: seriesKindForYear(toYear),
    };
  }

  function availableYears(series) {
    return Object.keys(series?.values || {})
      .map(Number)
      .filter(Number.isFinite)
      .sort((a, b) => a - b);
  }

  return { seriesKindForYear, getIndex, calculateInflation, availableYears };
});
