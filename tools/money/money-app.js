(() => {
  const $ = (selector) => document.querySelector(selector);
  const inflationAmount = $('#inflationAmount');
  const inflationFrom = $('#inflationFrom');
  const inflationTo = $('#inflationTo');
  const inflationEquivalent = $('#inflationEquivalent');
  const inflationMultiplier = $('#inflationMultiplier');
  const inflationChange = $('#inflationChange');
  const inflationMethod = $('#inflationMethod');
  const inflationChart = $('#inflationChart');
  const inflationStatus = $('#inflationStatus');
  const fxAmount = $('#fxAmount');
  const fxBase = $('#fxBase');
  const fxAddCurrency = $('#fxAddCurrency');
  const fxAdd = $('#fxAdd');
  const fxRefresh = $('#fxRefresh');
  const fxResults = $('#fxResults');
  const fxStatus = $('#fxStatus');

  const FX_ENDPOINT = 'https://api.frankfurter.dev/v2/rates';
  const FX_CACHE_PREFIX = 'rip.toolbox.fx.v2.';
  const FX_TARGETS_KEY = 'rip.toolbox.fx.targets.v1';
  const COMMON_TARGETS = ['EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF'];
  const COMMON_BASES = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'MXN', 'BRL', 'KRW'];
  let cpi = null;
  let fxData = null;
  let fxTargets = loadTargets();

  function money(value, currency = 'USD') {
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: Math.abs(value) >= 1000 ? 0 : 2 }).format(value);
    } catch (_) {
      return `${currency} ${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    }
  }

  function compactNumber(value) {
    return Number(value).toLocaleString(undefined, { maximumFractionDigits: 3 });
  }

  function setInflationStatus(message, kind = '') {
    inflationStatus.textContent = message || '';
    inflationStatus.className = `fx-status${kind ? ` ${kind}` : ''}`;
  }

  function loadTargets() {
    try {
      const parsed = JSON.parse(localStorage.getItem(FX_TARGETS_KEY));
      if (Array.isArray(parsed) && parsed.length) return parsed.filter((code) => /^[A-Z]{3}$/.test(code)).slice(0, 16);
    } catch (_) {}
    return [...COMMON_TARGETS];
  }

  function saveTargets() {
    try { localStorage.setItem(FX_TARGETS_KEY, JSON.stringify(fxTargets)); } catch (_) {}
  }

  function populateYears() {
    const years = MoneyCore.availableYears(cpi);
    for (const select of [inflationFrom, inflationTo]) {
      select.innerHTML = '';
      for (const year of years) {
        const option = document.createElement('option');
        option.value = String(year);
        option.textContent = year < 1913 ? `${year} · estimate` : String(year);
        select.append(option);
      }
    }
    inflationFrom.value = years.includes(2000) ? '2000' : String(years[0]);
    inflationTo.value = String(years[years.length - 1]);
  }

  function renderInflationChart(fromYear, toYear) {
    const years = MoneyCore.availableYears(cpi);
    const values = years.map((year) => Number(cpi.values[String(year)]));
    const width = 700;
    const height = 180;
    const pad = 14;
    const minYear = years[0];
    const maxYear = years[years.length - 1];
    const maxValue = Math.max(...values);
    const x = (year) => pad + ((year - minYear) / (maxYear - minYear)) * (width - pad * 2);
    const y = (value) => height - pad - (value / maxValue) * (height - pad * 2);
    const points = years.map((year, index) => `${x(year).toFixed(2)},${y(values[index]).toFixed(2)}`).join(' ');
    const fromValue = Number(cpi.values[String(fromYear)]);
    const toValue = Number(cpi.values[String(toYear)]);
    inflationChart.setAttribute('viewBox', `0 0 ${width} ${height}`);
    inflationChart.innerHTML = `
      <line class="grid" x1="${pad}" y1="${height - pad}" x2="${width - pad}" y2="${height - pad}"></line>
      <line class="grid" x1="${pad}" y1="${height / 2}" x2="${width - pad}" y2="${height / 2}"></line>
      <polyline class="line" points="${points}"></polyline>
      <circle class="point selected" cx="${x(fromYear)}" cy="${y(fromValue)}" r="4"></circle>
      <circle class="point selected" cx="${x(toYear)}" cy="${y(toValue)}" r="4"></circle>`;
    inflationChart.setAttribute('aria-label', `Annual price index from ${minYear} through ${maxYear}; selected years ${fromYear} and ${toYear}`);
  }

  function renderInflation() {
    if (!cpi) return;
    try {
      const result = MoneyCore.calculateInflation(Number(inflationAmount.value), Number(inflationFrom.value), Number(inflationTo.value), cpi);
      inflationEquivalent.textContent = money(result.equivalent, 'USD');
      inflationMultiplier.textContent = `${compactNumber(result.multiplier)}× price level`;
      const sign = result.priceLevelChangePercent > 0 ? '+' : '';
      inflationChange.textContent = `${sign}${result.priceLevelChangePercent.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
      const estimated = result.fromKind === 'estimated' || result.toKind === 'estimated';
      inflationMethod.innerHTML = estimated
        ? '<strong>Historical estimate involved.</strong> Pre-1913 values are reconstructed estimates; modern comparable U.S. CPI begins in 1913.'
        : '<strong>Modern CPI series.</strong> 1913–1977 uses CPI and 1978 onward uses CPI-U in the Minneapolis Fed series.';
      setInflationStatus(`${inflationFrom.value} index ${result.fromIndex} → ${inflationTo.value} index ${result.toIndex}.`, estimated ? 'warn' : 'good');
      renderInflationChart(result.fromYear, result.toYear);
    } catch (error) {
      inflationEquivalent.textContent = '—';
      inflationMultiplier.textContent = '—';
      inflationChange.textContent = '—';
      setInflationStatus(error.message || String(error), 'error');
    }
  }

  async function loadInflation() {
    try {
      const response = await fetch('./data/us-cpi.json', { cache: 'no-cache' });
      if (!response.ok) throw new Error(`CPI data failed to load (${response.status}).`);
      cpi = await response.json();
      populateYears();
      renderInflation();
    } catch (error) {
      setInflationStatus(error.message || String(error), 'error');
    }
  }

  function cacheKey(base) {
    return `${FX_CACHE_PREFIX}${String(base).toUpperCase()}`;
  }

  function readFxCache(base) {
    try {
      const parsed = JSON.parse(localStorage.getItem(cacheKey(base)));
      if (parsed?.base === String(base).toUpperCase() && parsed?.rates) return parsed;
    } catch (_) {}
    return null;
  }

  function writeFxCache(record) {
    try { localStorage.setItem(cacheKey(record.base), JSON.stringify(record)); } catch (_) {}
  }

  function setFxStatus(message, kind = '') {
    fxStatus.textContent = message || '';
    fxStatus.className = `fx-status${kind ? ` ${kind}` : ''}`;
  }

  function ensureTargets(base, rates) {
    fxTargets = fxTargets.filter((code) => code !== base && Number.isFinite(rates?.[code]));
    for (const code of COMMON_TARGETS) {
      if (fxTargets.length >= 6) break;
      if (code !== base && Number.isFinite(rates?.[code]) && !fxTargets.includes(code)) fxTargets.push(code);
    }
    saveTargets();
  }

  function renderAddCurrency() {
    fxAddCurrency.innerHTML = '';
    if (!fxData) return;
    const available = Object.keys(fxData.rates).filter((code) => code !== fxData.base && !fxTargets.includes(code)).sort();
    for (const code of available) {
      const option = document.createElement('option');
      option.value = code;
      option.textContent = code;
      fxAddCurrency.append(option);
    }
    fxAdd.disabled = !available.length;
  }

  function renderFx() {
    fxResults.innerHTML = '';
    if (!fxData) return;
    ensureTargets(fxData.base, fxData.rates);
    const amount = Number(fxAmount.value);
    for (const code of fxTargets) {
      const rate = fxData.rates[code];
      if (!Number.isFinite(rate)) continue;
      const row = document.createElement('div');
      row.className = 'fx-row';
      const codeWrap = document.createElement('div');
      codeWrap.className = 'fx-code';
      const strong = document.createElement('strong');
      strong.textContent = code;
      const small = document.createElement('small');
      small.textContent = `1 ${fxData.base} = ${Number(rate).toLocaleString(undefined, { maximumSignificantDigits: 6 })} ${code}`;
      codeWrap.append(strong, small);
      const value = document.createElement('div');
      value.className = 'fx-value';
      try { value.textContent = money(FxCore.convert(amount, rate), code); }
      catch (_) { value.textContent = '—'; }
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'fx-remove';
      remove.textContent = '×';
      remove.setAttribute('aria-label', `Remove ${code}`);
      remove.addEventListener('click', () => {
        fxTargets = fxTargets.filter((entry) => entry !== code);
        saveTargets();
        renderFx();
      });
      row.append(codeWrap, value, remove);
      fxResults.append(row);
    }
    renderAddCurrency();
  }

  async function fetchFx(base, force = false) {
    const normalizedBase = String(base || 'USD').toUpperCase();
    const cached = readFxCache(normalizedBase);
    if (!force && cached && FxCore.isFresh(cached)) {
      fxData = cached;
      renderFx();
      setFxStatus(`${FxCore.cacheLabel(cached)} · Frankfurter`, 'good');
      return;
    }

    fxRefresh.disabled = true;
    setFxStatus('Loading current exchange rates from Frankfurter…');
    try {
      const response = await fetch(`${FX_ENDPOINT}?base=${encodeURIComponent(normalizedBase.toLowerCase())}`, { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`FX service returned ${response.status}.`);
      const normalized = FxCore.normalizeRows(await response.json(), normalizedBase);
      if (Object.keys(normalized.rates).length < 2) throw new Error('FX service returned no usable quote rates.');
      fxData = { ...normalized, fetchedAt: Date.now() };
      writeFxCache(fxData);
      renderFx();
      setFxStatus(`Live rates · effective ${fxData.effectiveDate || 'date unavailable'} · Frankfurter`, 'good');
    } catch (error) {
      if (cached) {
        fxData = cached;
        renderFx();
        setFxStatus(`${FxCore.cacheLabel(cached, Date.now(), false)} · network refresh failed`, 'warn');
      } else {
        fxData = null;
        fxResults.innerHTML = '';
        renderAddCurrency();
        setFxStatus(`Live currency conversion unavailable: ${error.message || error}`, 'error');
      }
    } finally {
      fxRefresh.disabled = false;
    }
  }

  for (const code of COMMON_BASES) {
    const option = document.createElement('option');
    option.value = code;
    option.textContent = code;
    fxBase.append(option);
  }
  fxBase.value = 'USD';

  inflationAmount.addEventListener('input', renderInflation);
  inflationFrom.addEventListener('change', renderInflation);
  inflationTo.addEventListener('change', renderInflation);
  fxAmount.addEventListener('input', renderFx);
  fxBase.addEventListener('change', () => fetchFx(fxBase.value));
  fxRefresh.addEventListener('click', () => fetchFx(fxBase.value, true));
  fxAdd.addEventListener('click', () => {
    const code = fxAddCurrency.value;
    if (code && !fxTargets.includes(code)) {
      fxTargets.push(code);
      saveTargets();
      renderFx();
    }
  });

  loadInflation();
  fetchFx('USD');
})();
