(() => {
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const STORAGE_KEY = 'rip.toolbox.money.scenario.v1';
  const DEFAULT = { amount: 100, currency: 'USD', years: 10, annualRatePercent: 7 };
  const modeMap = { 'purchasing-power':'inflation', currency:'currency', growth:'growth', savings:'savings', loans:'loans', income:'income' };

  function readScenario() {
    try { return FinanceCore.normalizeScenario({ ...DEFAULT, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }); }
    catch (_) { return { ...DEFAULT }; }
  }
  let scenario = readScenario();

  function saveScenario() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(scenario)); } catch (_) {} }
  function currency(value) {
    try { return new Intl.NumberFormat(undefined,{style:'currency',currency:scenario.currency,maximumFractionDigits:2}).format(value); }
    catch (_) { return `${scenario.currency} ${Number(value).toLocaleString(undefined,{maximumFractionDigits:2})}`; }
  }
  function percent(value) { return `${(Number(value) * 100).toLocaleString(undefined,{maximumFractionDigits:2})}%`; }
  function syncScenarioInputs() {
    $('#scenarioAmount').value = scenario.amount;
    $('#scenarioCurrency').value = scenario.currency;
    $('#scenarioYears').value = scenario.years;
    $('#scenarioRate').value = scenario.annualRatePercent;
  }

  function syncAmountMirrors(sourceId = '') {
    for (const id of ['growthPrincipal','savingsCurrent','loanPrincipal']) {
      const element = document.getElementById(id);
      if (element && id !== sourceId) element.value = scenario.amount;
    }
    const inflationAmount = $('#inflationAmount');
    if (inflationAmount && sourceId !== 'inflationAmount') {
      inflationAmount.value = scenario.amount;
      inflationAmount.dispatchEvent(new Event('input',{bubbles:true}));
    }
    const fxAmount = $('#fxAmount');
    if (fxAmount && sourceId !== 'fxAmount') {
      fxAmount.value = scenario.amount;
      fxAmount.dispatchEvent(new Event('input',{bubbles:true}));
    }
  }

  function setSharedAmount(value, sourceId = '') {
    scenario.amount = Math.max(0, Number(value) || 0);
    $('#scenarioAmount').value = scenario.amount;
    saveScenario();
    syncAmountMirrors(sourceId);
  }

  function commitScenario() {
    scenario = FinanceCore.normalizeScenario({
      amount: $('#scenarioAmount').value,
      currency: $('#scenarioCurrency').value,
      years: $('#scenarioYears').value,
      annualRatePercent: $('#scenarioRate').value,
    });
    saveScenario();
    syncAmountMirrors('scenarioAmount');
    const fxBase = $('#fxBase');
    if (fxBase && [...fxBase.options].some(o=>o.value===scenario.currency) && fxBase.value !== scenario.currency) {
      fxBase.value=scenario.currency;
      fxBase.dispatchEvent(new Event('change',{bubbles:true}));
    }
    renderActiveFinance();
  }

  function setMode(mode, {updateUrl=true} = {}) {
    const safe = ['inflation','currency','growth','savings','loans','income'].includes(mode) ? mode : 'inflation';
    $$('[data-money-mode]').forEach(button => { const active = button.dataset.moneyMode === safe; button.classList.toggle('active',active); button.setAttribute('aria-selected',String(active)); });
    $$('.money-mode-panel').forEach(panel => panel.hidden = panel.dataset.moneyPanel !== safe);
    if (updateUrl) {
      const url = new URL(location.href); url.searchParams.set('action', safe === 'inflation' ? 'purchasing-power' : safe); history.replaceState(null,'',url);
    }
    renderActiveFinance();
  }

  function renderGrowth() {
    try {
      const result = FinanceCore.compoundGrowth({ principal:+$('#growthPrincipal').value, annualRate:+$('#scenarioRate').value/100, years:+$('#scenarioYears').value, monthlyContribution:+$('#growthContribution').value, compoundsPerYear:12 });
      const inflation = +$('#growthInflation').value/100;
      const real = FinanceCore.realRate(+$('#scenarioRate').value/100, inflation);
      $('#growthResult').innerHTML = `<strong>${currency(result.futureValue)}</strong><span>${currency(result.totalContributions)} contributed · ${currency(result.growth)} growth · ${percent(real)} real annual rate after assumed inflation</span>`;
    } catch (error) { $('#growthResult').textContent = error.message || error; }
  }

  function renderSavings() {
    try {
      const monthly = FinanceCore.requiredMonthlySavings({ target:+$('#savingsTarget').value, current:+$('#savingsCurrent').value, annualRate:+$('#scenarioRate').value/100, years:+$('#scenarioYears').value });
      $('#savingsMonthly').innerHTML = `<strong>${currency(monthly)} / month</strong><span>Target ${currency(+$('#savingsTarget').value)} in ${scenario.years} years from ${currency(+$('#savingsCurrent').value)} current savings.</span>`;
    } catch (error) { $('#savingsMonthly').textContent = error.message || error; }
  }

  function renderLoan() {
    try {
      const result = FinanceCore.amortizationSchedule({ principal:+$('#loanPrincipal').value, annualRate:+$('#scenarioRate').value/100, years:+$('#scenarioYears').value, extraMonthly:+$('#loanExtra').value });
      $('#loanPayment').textContent = currency(result.payment);
      $('#loanInterest').textContent = currency(result.totalInterest);
      const years = Math.floor(result.payoffMonths/12), months = result.payoffMonths%12;
      $('#loanPayoff').textContent = `${years}y ${months}m`;
      $('#loanSummaryRows').innerHTML = result.rows.filter((_,index)=>index<12 || index===result.rows.length-1).map(row=>`<tr><td>${row.month}</td><td>${currency(row.payment)}</td><td>${currency(row.principal)}</td><td>${currency(row.interest)}</td><td>${currency(row.balance)}</td></tr>`).join('');
    } catch (error) { $('#loanPayment').textContent='—'; $('#loanInterest').textContent=error.message||error; }
  }

  function renderIncome(source='hourly') {
    try {
      const weekly = +$('#incomeWeeklyHours').value || 40, weeks = +$('#incomeWeeks').value || 52;
      if (source === 'salary') $('#incomeHourly').value = FinanceCore.hourlyFromSalary(+$('#incomeSalary').value,weekly,weeks).toFixed(2);
      else $('#incomeSalary').value = FinanceCore.salaryFromHourly(+$('#incomeHourly').value,weekly,weeks).toFixed(2);
      const gross = FinanceCore.grossPaycheck({ hourlyRate:+$('#incomeHourly').value, regularHours:+$('#incomeRegularHours').value, overtimeHours:+$('#incomeOvertimeHours').value, overtimeMultiplier:+$('#incomeOvertimeMultiplier').value });
      const raised = FinanceCore.raiseAmount(+$('#incomeSalary').value,(+$('#incomeRaise').value||0)/100);
      $('#incomePaycheck').innerHTML = `<strong>${currency(gross)} gross paycheck</strong><span>Annualized salary ${currency(+$('#incomeSalary').value)} · after ${$('#incomeRaise').value || 0}% raise: ${currency(raised.newValue)}. Gross only; taxes and deductions are not estimated.</span>`;
    } catch (error) { $('#incomePaycheck').textContent = error.message || error; }
  }

  function renderActiveFinance() {
    const active = $('[data-money-mode].active')?.dataset.moneyMode;
    if (active === 'growth') renderGrowth();
    else if (active === 'savings') renderSavings();
    else if (active === 'loans') renderLoan();
    else if (active === 'income') renderIncome();
  }

  for (const code of ['USD','EUR','GBP','JPY','CAD','AUD','CHF','CNY','INR','MXN','BRL','KRW']) {
    const option=document.createElement('option'); option.value=code; option.textContent=code; $('#scenarioCurrency').append(option);
  }
  syncScenarioInputs();
  for (const selector of ['#scenarioAmount','#scenarioCurrency','#scenarioYears','#scenarioRate']) $(selector).addEventListener('change',commitScenario);
  $('#scenarioAmount').addEventListener('input',commitScenario);
  $('#scenarioYears').addEventListener('input',commitScenario);
  $('#scenarioRate').addEventListener('input',commitScenario);
  $$('[data-money-mode]').forEach(button=>button.addEventListener('click',()=>setMode(button.dataset.moneyMode)));

  $('#growthPrincipal').addEventListener('input', () => { setSharedAmount($('#growthPrincipal').value, 'growthPrincipal'); renderGrowth(); });
  $('#savingsCurrent').addEventListener('input', () => { setSharedAmount($('#savingsCurrent').value, 'savingsCurrent'); renderSavings(); });
  $('#loanPrincipal').addEventListener('input', () => { setSharedAmount($('#loanPrincipal').value, 'loanPrincipal'); renderLoan(); });
  for (const selector of ['#growthContribution','#growthInflation']) $(selector).addEventListener('input',renderGrowth);
  $('#savingsTarget').addEventListener('input',renderSavings);
  $('#loanExtra').addEventListener('input',renderLoan);
  for (const selector of ['#incomeHourly','#incomeWeeklyHours','#incomeWeeks','#incomeRegularHours','#incomeOvertimeHours','#incomeOvertimeMultiplier','#incomeRaise']) $(selector).addEventListener('input',()=>renderIncome('hourly'));
  $('#incomeSalary').addEventListener('input',()=>renderIncome('salary'));

  const requested = new URLSearchParams(location.search).get('action');
  const initial = modeMap[requested] || (['inflation','currency','growth','savings','loans','income'].includes(requested) ? requested : 'inflation');
  $('#growthPrincipal').value=scenario.amount; $('#savingsCurrent').value=scenario.amount; $('#loanPrincipal').value=scenario.amount;
  setMode(initial,{updateUrl:false});
})();
