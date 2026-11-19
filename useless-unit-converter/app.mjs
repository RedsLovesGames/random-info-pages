import { calculateComparison, categories, formatNumber } from './converter.mjs';

const amount = document.querySelector('#amount');
const inputUnit = document.querySelector('#input-unit');
const inputMessage = document.querySelector('#input-message');
const modes = [...document.querySelectorAll('[data-mode]')];
const presets = document.querySelector('#presets');
const comparisons = document.querySelector('#comparisons');
const result = document.querySelector('#result');
const resultUnit = document.querySelector('#result-unit');
const math = document.querySelector('#math');
const definition = document.querySelector('#definition');
const formula = document.querySelector('#formula');
const copy = document.querySelector('#copy');
const copyStatus = document.querySelector('#copy-status');

const saved = Object.fromEntries(Object.entries(categories).map(([id, category]) => [
  id, { ...category.presets[0], comparison: category.comparisons[0].id },
]));
let mode = 'length';
let copyText = '';

function renderResult() {
  const current = saved[mode];
  const measurement = calculateComparison(current.amount, current.unit, current.comparison);
  const invalid = amount.validity.badInput || (current.amount !== '' && !measurement);
  inputMessage.hidden = !invalid;
  inputMessage.textContent = invalid ? 'Enter a nonnegative amount within range.' : '';
  amount.setAttribute('aria-invalid', String(invalid));
  copy.disabled = !measurement;
  copyStatus.textContent = '';
  math.hidden = !measurement;

  if (!measurement) {
    result.textContent = '—';
    resultUnit.textContent = 'Enter an amount to compare.';
    copyText = '';
    return;
  }

  const { amount: numericAmount, amountInBase, count, base, comparison } = measurement;
  const display = formatNumber(count);
  const name = count === 1 ? comparison.name : comparison.plural;
  result.textContent = display;
  resultUnit.textContent = name;

  definition.textContent = `1 ${comparison.name} = ${comparison.definition}`;
  if (comparison.source) {
    const source = document.createElement('a');
    source.href = comparison.source;
    source.textContent = 'Source';
    definition.append(' · ', source);
  }

  const original = `${formatNumber(numericAmount)} ${current.unit}`;
  const normalized = `${formatNumber(amountInBase)} ${base}`;
  const substituted = current.unit === base ? normalized : `${original} = ${normalized}`;
  const calculation = `${normalized} ÷ ${formatNumber(comparison.size)} ${base}`;
  const formattedCount = Number(display.replaceAll(',', ''));
  const relation = formattedCount === count ? '=' : '≈';
  formula.textContent = (current.unit === base ? '' : `${substituted} · `) + `${calculation} ${relation} ${display}`;
  copyText = `${original} ${relation} ${display} ${name}`;
}

function renderMode() {
  const current = saved[mode];
  const category = categories[mode];

  for (const button of modes) {
    button.setAttribute('aria-pressed', String(button.dataset.mode === mode));
  }
  inputUnit.replaceChildren(...Object.entries(category.inputs).map(([symbol, label]) => new Option(label, symbol)));
  inputUnit.value = current.unit;
  amount.value = current.amount;

  presets.replaceChildren(...category.presets.map(preset => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = preset.label;
    button.addEventListener('click', () => {
      current.amount = amount.value = preset.amount;
      current.unit = inputUnit.value = preset.unit;
      renderResult();
    });
    return button;
  }));

  comparisons.replaceChildren(...category.comparisons.map(comparison => {
    const label = document.createElement('label');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'comparison';
    radio.value = comparison.id;
    radio.checked = current.comparison === comparison.id;

    const title = document.createElement('span');
    title.className = 'comparison-name';
    title.textContent = comparison.plural;
    const detail = document.createElement('span');
    detail.className = 'comparison-detail';
    detail.textContent = comparison.definition;
    label.append(radio, title, detail);
    return label;
  }));
  renderResult();
}

for (const button of modes) {
  button.addEventListener('click', () => {
    if (mode === button.dataset.mode) return;
    mode = button.dataset.mode;
    renderMode();
  });
}
inputUnit.addEventListener('change', () => {
  saved[mode].unit = inputUnit.value;
  renderResult();
});
amount.addEventListener('input', () => {
  saved[mode].amount = amount.value;
  renderResult();
});
comparisons.addEventListener('change', event => {
  saved[mode].comparison = event.target.value;
  renderResult();
});
copy.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(copyText);
    copyStatus.textContent = 'Copied.';
  } catch {
    copyStatus.textContent = 'Select and copy the result above.';
  }
});

renderMode();
document.querySelector('#calculator').hidden = false;
