(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.FinanceCore = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const nonNegative = (value, fallback = 0) => Math.max(0, finite(value, fallback));

  function normalizeScenario(input = {}) {
    return {
      amount: finite(input.amount, 0),
      currency: String(input.currency || 'USD').trim().toUpperCase() || 'USD',
      years: nonNegative(input.years, 0),
      annualRatePercent: finite(input.annualRatePercent, 0),
    };
  }

  function compoundGrowth({ principal = 0, annualRate = 0, years = 0, monthlyContribution = 0, compoundsPerYear = 12 } = {}) {
    const p = nonNegative(principal);
    const rate = finite(annualRate);
    const duration = nonNegative(years);
    const contribution = nonNegative(monthlyContribution);
    const compounds = Math.max(1, Math.trunc(nonNegative(compoundsPerYear, 12) || 12));
    const periods = Math.round(duration * compounds);
    const periodicRate = rate / compounds;
    const contributionPerPeriod = contribution * (12 / compounds);
    let futureValue;
    if (Math.abs(periodicRate) < 1e-12) futureValue = p + contributionPerPeriod * periods;
    else futureValue = p * Math.pow(1 + periodicRate, periods) + contributionPerPeriod * ((Math.pow(1 + periodicRate, periods) - 1) / periodicRate);
    const totalContributions = p + contributionPerPeriod * periods;
    return { futureValue, totalContributions, growth: futureValue - totalContributions, periods, periodicRate };
  }

  function cagr(beginning, ending, years) {
    const start = Number(beginning), end = Number(ending), duration = Number(years);
    if (!(start > 0) || !(end > 0) || !(duration > 0)) throw new Error('Beginning value, ending value, and years must be positive.');
    return Math.pow(end / start, 1 / duration) - 1;
  }

  function realRate(nominalRate, inflationRate) {
    const nominal = finite(nominalRate), inflation = finite(inflationRate);
    if (inflation <= -1) throw new Error('Inflation rate must be greater than -100%.');
    return (1 + nominal) / (1 + inflation) - 1;
  }

  function requiredMonthlySavings({ target = 0, current = 0, annualRate = 0, years = 0 } = {}) {
    const goal = nonNegative(target), present = nonNegative(current), duration = nonNegative(years);
    const months = Math.round(duration * 12);
    if (!months) return Math.max(0, goal - present);
    const monthlyRate = finite(annualRate) / 12;
    const grownCurrent = present * Math.pow(1 + monthlyRate, months);
    const remaining = Math.max(0, goal - grownCurrent);
    if (!remaining) return 0;
    if (Math.abs(monthlyRate) < 1e-12) return remaining / months;
    return remaining * monthlyRate / (Math.pow(1 + monthlyRate, months) - 1);
  }

  function loanPayment({ principal = 0, annualRate = 0, years = 0 } = {}) {
    const amount = nonNegative(principal), months = Math.round(nonNegative(years) * 12);
    if (!months) throw new Error('Loan term must be greater than zero.');
    const monthlyRate = finite(annualRate) / 12;
    if (Math.abs(monthlyRate) < 1e-12) return amount / months;
    return amount * monthlyRate / (1 - Math.pow(1 + monthlyRate, -months));
  }

  function amortizationSchedule({ principal = 0, annualRate = 0, years = 0, extraMonthly = 0 } = {}) {
    const amount = nonNegative(principal), scheduledPayment = loanPayment({ principal: amount, annualRate, years });
    const monthlyRate = finite(annualRate) / 12, extra = nonNegative(extraMonthly);
    let balance = amount, totalInterest = 0, totalPaid = 0, month = 0;
    const rows = [];
    const maxMonths = Math.max(1, Math.round(nonNegative(years) * 12) + 1200);
    while (balance > 0.005 && month < maxMonths) {
      month += 1;
      const interest = balance * monthlyRate;
      const payment = Math.min(balance + interest, scheduledPayment + extra);
      const principalPaid = payment - interest;
      balance = Math.max(0, balance - principalPaid);
      totalInterest += interest;
      totalPaid += payment;
      rows.push({ month, payment, principal: principalPaid, interest, balance });
    }
    return { payment: scheduledPayment, extraMonthly: extra, rows, totalInterest, totalPaid, payoffMonths: rows.length };
  }

  function salaryFromHourly(hourlyRate, hoursPerWeek = 40, weeksPerYear = 52) {
    return finite(hourlyRate) * nonNegative(hoursPerWeek, 40) * nonNegative(weeksPerYear, 52);
  }

  function hourlyFromSalary(salary, hoursPerWeek = 40, weeksPerYear = 52) {
    const hours = nonNegative(hoursPerWeek, 40) * nonNegative(weeksPerYear, 52);
    if (!hours) throw new Error('Annual work hours must be greater than zero.');
    return finite(salary) / hours;
  }

  function raiseAmount(value, rate) {
    const oldValue = finite(value), increase = oldValue * finite(rate);
    return { oldValue, increase, newValue: oldValue + increase };
  }

  function grossPaycheck({ hourlyRate = 0, regularHours = 0, overtimeHours = 0, overtimeMultiplier = 1.5 } = {}) {
    const rate = finite(hourlyRate), regular = nonNegative(regularHours), overtime = nonNegative(overtimeHours), multiplier = nonNegative(overtimeMultiplier, 1.5);
    return rate * regular + rate * multiplier * overtime;
  }

  return {
    normalizeScenario,
    compoundGrowth,
    cagr,
    realRate,
    requiredMonthlySavings,
    loanPayment,
    amortizationSchedule,
    salaryFromHourly,
    hourlyFromSalary,
    raiseAmount,
    grossPaycheck,
  };
});
