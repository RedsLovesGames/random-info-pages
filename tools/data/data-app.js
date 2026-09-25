import {
  normalizeRows, inferColumns, dedupeRows, trimStringCells, fillMissingValues,
  renameColumn, removeColumn, splitColumn, combineColumns, transposeTable,
  groupRows, pivotRows, summarizeColumn, pearsonCorrelation, frequencyTable,
  sortRows, filterRows, searchRows, coerceColumn,
} from './data-core.js';
import { parseDataFile, exportRows } from './data-io.js';
import { arrowTableToRows, registerRowsAsDuckTable } from './data-engines.js';
import { renderDataChart } from './data-charts.js';
import { createHistory } from '../shared/history.js';
import { formatBytes } from '../shared/files.js';

const $ = selector => document.querySelector(selector);
const picker = $('#dataPicker');
const drop = $('#dataDrop');
const workspace = $('#dataWorkspace');
const tableTarget = $('#dataTable');
const tableFooter = $('#dataTableFooter');
const searchInput = $('#dataSearch');
const panel = $('#dataActionPanel');
const progress = $('#dataProgress');
const progressLabel = $('#dataProgressLabel');
const progressValue = $('#dataProgressValue');
const progressBar = $('#dataProgressBar');
const historyPanel = $('#dataHistory');
const historyList = $('#dataHistoryList');

const PREVIEW_LIMIT = 500;
let sourceFile = null;
let sourceFormat = '';
let sourceMeta = {};
let originalRows = [];
let rows = [];
let history = createHistory({ rows: [] }, { initialLabel: 'No dataset', limit: 20 });
let sortView = null;
let pendingAction = new URLSearchParams(location.search).get('action');
let sqlLastRows = null;

function cloneRows(input) {
  return (input || []).map(row => ({ ...row }));
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char]));
}

function formatCell(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function setProgress(label, fraction = null) {
  progress.hidden = fraction === null;
  progressLabel.textContent = label;
  const value = Math.max(0, Math.min(1, Number(fraction) || 0));
  progressBar.value = value;
  progressValue.textContent = `${Math.round(value * 100)}%`;
}

function clearProgress() {
  setProgress('', null);
}

function openPanel(html) {
  panel.innerHTML = html;
  panel.hidden = false;
  panel.scrollIntoView({ block: 'nearest' });
}

function closePanel() {
  panel.hidden = true;
  panel.innerHTML = '';
  sqlLastRows = null;
}

function columns() {
  return inferColumns(rows);
}

function columnOptions({ numericOnly = false, includeBlank = false } = {}) {
  const list = columns().filter(column => !numericOnly || column.type === 'number');
  return `${includeBlank ? '<option value="">None</option>' : ''}${list.map(column => `<option value="${escapeHtml(column.name)}">${escapeHtml(column.name)} · ${column.type}</option>`).join('')}`;
}

function visibleRows() {
  let result = searchRows(rows, searchInput.value);
  if (sortView?.column) result = sortRows(result, sortView.column, sortView.direction);
  return result;
}

function countMissing() {
  return rows.reduce((count, row) => count + Object.values(row).filter(value => value === null || value === undefined || value === '').length, 0);
}

function parseEditedValue(text, type) {
  if (text === '') return null;
  if (type === 'number') {
    const value = Number(text);
    return Number.isFinite(value) ? value : text;
  }
  if (type === 'boolean') {
    const normalized = text.trim().toLowerCase();
    if (['true','1','yes','y'].includes(normalized)) return true;
    if (['false','0','no','n'].includes(normalized)) return false;
  }
  return text;
}

function renderTable() {
  const schema = columns();
  const view = visibleRows();
  const displayed = view.slice(0, PREVIEW_LIMIT);
  if (!schema.length) {
    tableTarget.innerHTML = '<div class="data-empty">Dataset has no columns.</div>';
    tableFooter.textContent = '0 rows';
    return;
  }

  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  const rowHead = document.createElement('th');
  rowHead.className = 'data-row-number';
  rowHead.textContent = '#';
  headRow.append(rowHead);
  for (const column of schema) {
    const th = document.createElement('th');
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = `${column.name}${sortView?.column === column.name ? sortView.direction === 'asc' ? ' ↑' : ' ↓' : ''}`;
    button.title = `${column.type} · ${column.missing} missing · click for view sort`;
    button.addEventListener('click', () => {
      if (sortView?.column === column.name) sortView.direction = sortView.direction === 'asc' ? 'desc' : 'asc';
      else sortView = { column: column.name, direction: 'asc' };
      renderTable();
    });
    th.append(button);
    headRow.append(th);
  }
  thead.append(headRow);
  table.append(thead);

  const tbody = document.createElement('tbody');
  displayed.forEach((row, viewIndex) => {
    const tr = document.createElement('tr');
    const indexCell = document.createElement('td');
    indexCell.className = 'data-row-number';
    indexCell.textContent = String(viewIndex + 1);
    tr.append(indexCell);
    for (const column of schema) {
      const td = document.createElement('td');
      td.textContent = formatCell(row[column.name]);
      td.title = formatCell(row[column.name]);
      td.contentEditable = 'true';
      const original = row[column.name];
      td.addEventListener('keydown', event => {
        if (event.key === 'Enter') { event.preventDefault(); td.blur(); }
        if (event.key === 'Escape') { event.preventDefault(); td.textContent = formatCell(original); td.blur(); }
      });
      td.addEventListener('blur', () => {
        const nextValue = parseEditedValue(td.textContent, column.type);
        if (Object.is(nextValue, original) || String(nextValue ?? '') === String(original ?? '')) return;
        const rowIndex = rows.indexOf(row);
        if (rowIndex < 0) return;
        const next = cloneRows(rows);
        next[rowIndex][column.name] = nextValue;
        applyRows(`Edit ${column.name} row ${rowIndex + 1}`, next);
      }, { once: true });
      tr.append(td);
    }
    tbody.append(tr);
  });
  table.append(tbody);
  tableTarget.replaceChildren(table);
  tableFooter.textContent = `Showing ${displayed.length.toLocaleString()} of ${view.length.toLocaleString()} matching rows${view.length > PREVIEW_LIMIT ? ` · preview capped at ${PREVIEW_LIMIT.toLocaleString()}` : ''}`;
}

function renderHistory() {
  historyList.innerHTML = '';
  for (const entry of history.entries()) {
    const li = document.createElement('li');
    li.textContent = entry.label;
    if (entry.current) { li.classList.add('current'); li.setAttribute('aria-current', 'step'); }
    historyList.append(li);
  }
}

function renderSummary() {
  $('#dataRows').textContent = rows.length.toLocaleString();
  $('#dataColumns').textContent = columns().length.toLocaleString();
  $('#dataMissing').textContent = countMissing().toLocaleString();
  $('#dataSteps').textContent = Math.max(0, history.entries().length - 1).toLocaleString();
  const details = [sourceFormat, `${rows.length.toLocaleString()} rows`, `${columns().length.toLocaleString()} columns`];
  if (sourceFile) details.push(formatBytes(sourceFile.size));
  if (sourceMeta.sheet) details.push(`sheet: ${sourceMeta.sheet}`);
  if (sourceMeta.table) details.push(`table: ${sourceMeta.table}`);
  $('#dataSourceMeta').textContent = details.filter(Boolean).join(' · ');
  $('#undoData').disabled = !history.canUndo();
  $('#redoData').disabled = !history.canRedo();
}

function render() {
  workspace.hidden = !sourceFile;
  drop.hidden = Boolean(sourceFile);
  if (sourceFile) $('#dataSourceName').textContent = sourceFile.name;
  renderSummary();
  renderTable();
  renderHistory();
}

function applyRows(label, nextRows) {
  rows = normalizeRows(nextRows);
  sortView = null;
  history.push({ label, state: { rows: cloneRows(rows) } });
  render();
}

function restoreHistoryState(state) {
  rows = normalizeRows(cloneRows(state?.rows || []));
  sortView = null;
  render();
}

async function loadFile(file) {
  if (!file) return;
  sourceFile = file;
  closePanel();
  workspace.hidden = false;
  drop.hidden = true;
  setProgress('Reading dataset…', 0.02);
  try {
    const result = await parseDataFile(file, setProgress);
    rows = normalizeRows(result.rows || []);
    originalRows = cloneRows(rows);
    sourceMeta = result.meta || {};
    sourceFormat = result.format || 'Data';
    history = createHistory({ rows: cloneRows(rows) }, { initialLabel: `Loaded ${file.name}`, limit: 20 });
    searchInput.value = '';
    sortView = null;
    setProgress('Dataset ready', 1);
    render();
    if (pendingAction) {
      const button = document.getElementById({ table:'tableData', clean:'cleanData', transform:'transformData', statistics:'statisticsData', sql:'sqlData', chart:'chartData', convert:'exportData' }[pendingAction]);
      pendingAction = null;
      button?.click();
    }
  } catch (error) {
    sourceFile = null;
    rows = [];
    originalRows = [];
    workspace.hidden = true;
    drop.hidden = false;
    openPanel(`<div class="data-panel-head"><strong>Could not open dataset</strong><button id="closeDataPanel" class="tb-toolbutton">Close</button></div><p class="data-warning">${escapeHtml(error.message)}</p>`);
    $('#closeDataPanel').onclick = closePanel;
  } finally {
    setTimeout(clearProgress, 500);
  }
}

function showTableTools() {
  openPanel(`<div class="data-form"><div class="data-panel-head"><strong>Table operations</strong><button id="closeDataPanel" class="tb-toolbutton">Close</button></div>
    <div class="data-form-grid">
      <label>Sort column<select id="tableSortColumn">${columnOptions()}</select></label>
      <label>Direction<select id="tableSortDirection"><option value="asc">Ascending</option><option value="desc">Descending</option></select></label>
      <label>Filter column<select id="tableFilterColumn">${columnOptions()}</select></label>
      <label>Filter rule<select id="tableFilterOperator"><option value="contains">Contains</option><option value="equals">Equals</option><option value="not-equals">Not equal</option><option value="starts">Starts with</option><option value="gt">Greater than</option><option value="lt">Less than</option><option value="missing">Missing</option><option value="not-missing">Not missing</option></select></label>
      <label>Filter value<input id="tableFilterValue" type="text"></label>
      <label>Rename column<select id="tableRenameColumn">${columnOptions()}</select></label>
      <label>New name<input id="tableRenameValue" type="text"></label>
      <label>Remove column<select id="tableRemoveColumn">${columnOptions()}</select></label>
      <label>Change type<select id="tableTypeColumn">${columnOptions()}</select></label>
      <label>New type<select id="tableTypeValue"><option value="text">Text</option><option value="number">Number</option><option value="boolean">Boolean</option><option value="date">Date / time</option></select></label>
    </div>
    <div class="data-actions"><button id="applySort" class="tb-toolbutton">Apply sort to data</button><button id="applyFilter" class="tb-toolbutton">Keep matching rows</button><button id="applyRename" class="tb-toolbutton">Rename</button><button id="applyRemove" class="tb-toolbutton">Remove column</button><button id="applyType" class="tb-toolbutton">Change type</button><button id="restoreLoaded" class="tb-toolbutton">Restore loaded data</button></div>
    <p class="data-note">Column-header clicks sort only the preview. Operations here change the working dataset and enter the pipeline.</p></div>`);
  $('#closeDataPanel').onclick = closePanel;
  $('#applySort').onclick = () => applyRows(`Sort ${$('#tableSortColumn').value} ${$('#tableSortDirection').value}`, sortRows(rows, $('#tableSortColumn').value, $('#tableSortDirection').value));
  $('#applyFilter').onclick = () => applyRows(`Filter ${$('#tableFilterColumn').value}`, filterRows(rows, $('#tableFilterColumn').value, $('#tableFilterOperator').value, $('#tableFilterValue').value));
  $('#applyRename').onclick = () => {
    const from = $('#tableRenameColumn').value, to = $('#tableRenameValue').value.trim();
    if (!to) return;
    applyRows(`Rename ${from} → ${to}`, renameColumn(rows, from, to));
  };
  $('#applyRemove').onclick = () => {
    const column = $('#tableRemoveColumn').value;
    if (columns().length <= 1) return;
    applyRows(`Remove ${column}`, removeColumn(rows, column));
  };
  $('#applyType').onclick = () => applyRows(`Convert ${$('#tableTypeColumn').value} to ${$('#tableTypeValue').value}`, coerceColumn(rows, $('#tableTypeColumn').value, $('#tableTypeValue').value));
  $('#restoreLoaded').onclick = () => applyRows('Restore loaded dataset', cloneRows(originalRows));
}

function showCleanTools() {
  openPanel(`<div class="data-form"><div class="data-panel-head"><strong>Clean data</strong><button id="closeDataPanel" class="tb-toolbutton">Close</button></div>
    <div class="data-form-grid"><label>Missing-value replacement<input id="cleanFillValue" type="text" placeholder="e.g. Unknown or 0"></label><label>Date column<select id="cleanDateColumn">${columnOptions()}</select></label></div>
    <div class="data-actions"><button id="cleanDedupe" class="tb-toolbutton">Remove duplicate rows</button><button id="cleanTrim" class="tb-toolbutton">Trim strings</button><button id="cleanFill" class="tb-toolbutton">Fill missing values</button><button id="cleanDates" class="tb-toolbutton">Normalize selected dates</button><button id="cleanDropMissing" class="tb-toolbutton">Drop rows missing selected column</button></div>
    <p class="data-note">Cleaning actions are reversible through the transformation pipeline.</p></div>`);
  $('#closeDataPanel').onclick = closePanel;
  $('#cleanDedupe').onclick = () => applyRows('Remove duplicate rows', dedupeRows(rows));
  $('#cleanTrim').onclick = () => applyRows('Trim string cells', trimStringCells(rows));
  $('#cleanFill').onclick = () => applyRows('Fill missing values', fillMissingValues(rows, $('#cleanFillValue').value));
  $('#cleanDates').onclick = () => applyRows(`Normalize ${$('#cleanDateColumn').value} dates`, coerceColumn(rows, $('#cleanDateColumn').value, 'date'));
  $('#cleanDropMissing').onclick = () => applyRows(`Drop rows missing ${$('#cleanDateColumn').value}`, filterRows(rows, $('#cleanDateColumn').value, 'not-missing', ''));
}

async function parseJoinFile(file) {
  const result = await parseDataFile(file, setProgress);
  return normalizeRows(result.rows || []);
}

function joinRows(leftRows, rightRows, leftKey, rightKey, mode = 'left') {
  const rightIndex = new Map();
  for (const right of rightRows) {
    const key = JSON.stringify(right[rightKey]);
    if (!rightIndex.has(key)) rightIndex.set(key, []);
    rightIndex.get(key).push(right);
  }
  const output = [];
  const rightColumns = inferColumns(rightRows).map(column => column.name).filter(name => name !== rightKey);
  for (const left of leftRows) {
    const matches = rightIndex.get(JSON.stringify(left[leftKey])) || [];
    if (!matches.length && mode === 'left') output.push({ ...left, ...Object.fromEntries(rightColumns.filter(name => !(name in left)).map(name => [name, null])) });
    for (const right of matches) {
      const merged = { ...left };
      for (const [key, value] of Object.entries(right)) {
        if (key === rightKey && leftKey === rightKey) continue;
        merged[key in merged ? `right_${key}` : key] = value;
      }
      output.push(merged);
    }
  }
  return normalizeRows(output);
}

function showTransformTools() {
  openPanel(`<div class="data-form"><div class="data-panel-head"><strong>Transform data</strong><button id="closeDataPanel" class="tb-toolbutton">Close</button></div>
    <div class="data-form-grid">
      <label>Source column<select id="transformColumn">${columnOptions()}</select></label>
      <label>Separator<input id="transformSeparator" value="-" type="text"></label>
      <label>Split output names<input id="transformSplitNames" value="part_1,part_2" type="text"></label>
      <label>Combine columns<select id="transformCombineColumns" multiple size="4">${columnOptions()}</select></label>
      <label>Combined name<input id="transformCombinedName" value="combined" type="text"></label>
      <label>Group by<select id="transformGroupColumn">${columnOptions()}</select></label>
      <label>Value column<select id="transformValueColumn">${columnOptions({ numericOnly:true, includeBlank:true })}</select></label>
      <label>Pivot row<select id="transformPivotRow">${columnOptions()}</select></label>
      <label>Pivot columns<select id="transformPivotColumn">${columnOptions()}</select></label>
      <label>Pivot value<select id="transformPivotValue">${columnOptions({ numericOnly:true })}</select></label>
      <label>Join file<input id="transformJoinFile" type="file" accept=".csv,.tsv,.json,.jsonl,.xlsx,.parquet,.sqlite"></label>
      <label>Join type<select id="transformJoinType"><option value="left">Left join</option><option value="inner">Inner join</option></select></label>
      <label>Left key<select id="transformJoinLeft">${columnOptions()}</select></label>
      <label>Right key<select id="transformJoinRight"><option value="">Choose join file first</option></select></label>
    </div>
    <div class="data-actions"><button id="transformSplit" class="tb-toolbutton">Split column</button><button id="transformCombine" class="tb-toolbutton">Combine columns</button><button id="transformTranspose" class="tb-toolbutton">Transpose</button><button id="transformGroup" class="tb-toolbutton">Group</button><button id="transformPivot" class="tb-toolbutton">Pivot</button><button id="transformJoin" class="tb-toolbutton" disabled>Join</button></div>
    <div id="transformStatus" class="data-note">Join files stay local and are not added to the main workspace until you apply the join.</div></div>`);
  $('#closeDataPanel').onclick = closePanel;
  $('#transformSplit').onclick = () => {
    const names = $('#transformSplitNames').value.split(',').map(value => value.trim()).filter(Boolean);
    applyRows(`Split ${$('#transformColumn').value}`, splitColumn(rows, $('#transformColumn').value, $('#transformSeparator').value, names));
  };
  $('#transformCombine').onclick = () => {
    const selected = [...$('#transformCombineColumns').selectedOptions].map(option => option.value);
    if (!selected.length) return;
    applyRows(`Combine ${selected.join(', ')}`, combineColumns(rows, selected, $('#transformCombinedName').value.trim() || 'combined', $('#transformSeparator').value));
  };
  $('#transformTranspose').onclick = () => applyRows('Transpose table', transposeTable(rows));
  $('#transformGroup').onclick = () => applyRows(`Group by ${$('#transformGroupColumn').value}`, groupRows(rows, $('#transformGroupColumn').value, $('#transformValueColumn').value || null));
  $('#transformPivot').onclick = () => applyRows(`Pivot ${$('#transformPivotRow').value} × ${$('#transformPivotColumn').value}`, pivotRows(rows, $('#transformPivotRow').value, $('#transformPivotColumn').value, $('#transformPivotValue').value));
  let joinData = null;
  $('#transformJoinFile').onchange = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    setProgress('Reading join file…', 0.05);
    try {
      joinData = await parseJoinFile(file);
      $('#transformJoinRight').innerHTML = inferColumns(joinData).map(column => `<option value="${escapeHtml(column.name)}">${escapeHtml(column.name)}</option>`).join('');
      $('#transformJoin').disabled = !joinData.length;
      $('#transformStatus').textContent = `${file.name}: ${joinData.length.toLocaleString()} rows ready to join.`;
    } catch (error) {
      $('#transformStatus').textContent = error.message;
      joinData = null;
      $('#transformJoin').disabled = true;
    } finally { setTimeout(clearProgress, 400); }
  };
  $('#transformJoin').onclick = () => {
    if (!joinData) return;
    const mode = $('#transformJoinType').value;
    applyRows(`${mode === 'inner' ? 'Inner' : 'Left'} join`, joinRows(rows, joinData, $('#transformJoinLeft').value, $('#transformJoinRight').value, mode));
  };
}

function showStatistics() {
  openPanel(`<div class="data-form"><div class="data-panel-head"><strong>Statistics</strong><button id="closeDataPanel" class="tb-toolbutton">Close</button></div>
    <div class="data-form-grid"><label>Numeric column<select id="statsColumn">${columnOptions({ numericOnly:true })}</select></label><label>Frequency column<select id="frequencyColumn">${columnOptions()}</select></label><label>Correlation X<select id="corrX">${columnOptions({ numericOnly:true })}</select></label><label>Correlation Y<select id="corrY">${columnOptions({ numericOnly:true })}</select></label></div>
    <div class="data-actions"><button id="runSummary" class="tb-toolbutton">Describe</button><button id="runFrequency" class="tb-toolbutton">Frequency</button><button id="runCorrelation" class="tb-toolbutton">Correlation</button></div><div id="statsResults"></div></div>`);
  $('#closeDataPanel').onclick = closePanel;
  const results = $('#statsResults');
  $('#runSummary').onclick = () => {
    const summary = summarizeColumn(rows, $('#statsColumn').value);
    const iqr = summary.p75 - summary.p25;
    const lower = summary.p25 - 1.5 * iqr, upper = summary.p75 + 1.5 * iqr;
    const outliers = rows.filter(row => Number.isFinite(Number(row[summary.column])) && (Number(row[summary.column]) < lower || Number(row[summary.column]) > upper)).length;
    results.innerHTML = `<div class="data-result-grid">${[['Count',summary.count],['Missing',summary.missing],['Mean',summary.mean],['Median',summary.median],['SD',summary.sd],['Min',summary.min],['25th pct',summary.p25],['75th pct',summary.p75],['Max',summary.max],['IQR outliers',outliers]].map(([label,value]) => `<div class="data-result-card"><small>${label}</small><strong>${value == null ? '—' : typeof value === 'number' ? Number(value.toFixed(6)).toLocaleString() : escapeHtml(value)}</strong></div>`).join('')}</div>`;
  };
  $('#runFrequency').onclick = () => {
    const list = frequencyTable(rows, $('#frequencyColumn').value).slice(0, 100);
    results.innerHTML = `<div class="data-result-list">${list.map(entry => `<div class="data-result-row"><span>${escapeHtml(formatCell(entry.value) || '(missing)')}</span><strong>${entry.count.toLocaleString()}</strong></div>`).join('')}</div>`;
  };
  $('#runCorrelation').onclick = () => {
    const x = $('#corrX').value, y = $('#corrY').value, value = pearsonCorrelation(rows, x, y);
    results.innerHTML = `<div class="data-result-card"><small>Pearson r · ${escapeHtml(x)} vs ${escapeHtml(y)}</small><strong>${value == null ? 'Not enough varying paired values' : value.toFixed(6)}</strong></div>`;
  };
  if ($('#statsColumn').options.length) $('#runSummary').click();
}

function sqlHistoryRead() {
  try { return JSON.parse(localStorage.getItem('toolbox:data:sqlHistory') || '[]'); } catch { return []; }
}
function sqlHistoryPush(query) {
  const next = [query, ...sqlHistoryRead().filter(item => item !== query)].slice(0, 10);
  localStorage.setItem('toolbox:data:sqlHistory', JSON.stringify(next));
}
function renderSmallTable(target, data, limit = 200) {
  const normalized = normalizeRows(data);
  const schema = inferColumns(normalized);
  if (!schema.length) return target.innerHTML = '<p class="data-note">Query returned no columns.</p>';
  target.innerHTML = `<table><thead><tr>${schema.map(column => `<th>${escapeHtml(column.name)}</th>`).join('')}</tr></thead><tbody>${normalized.slice(0, limit).map(row => `<tr>${schema.map(column => `<td>${escapeHtml(formatCell(row[column.name]))}</td>`).join('')}</tr>`).join('')}</tbody></table>${normalized.length > limit ? `<p class="data-note">Showing first ${limit} of ${normalized.length.toLocaleString()} query rows.</p>` : ''}`;
}

function showSql() {
  const prior = sqlHistoryRead();
  openPanel(`<div class="data-form"><div class="data-panel-head"><strong>DuckDB SQL</strong><button id="closeDataPanel" class="tb-toolbutton">Close</button></div><p class="data-note">The current working dataset is registered locally as <code>data</code>. DuckDB-Wasm loads only when you run a query.</p><textarea id="sqlQuery" spellcheck="false">SELECT * FROM data LIMIT 100;</textarea><div class="data-actions"><button id="runSql" class="data-primary">Run query</button><button id="replaceWithSql" class="tb-toolbutton" disabled>Use result as dataset</button></div>${prior.length ? `<label>Recent query<select id="sqlHistorySelect"><option value="">Choose…</option>${prior.map((query,index) => `<option value="${index}">${escapeHtml(query.replace(/\s+/g,' ').slice(0,100))}</option>`).join('')}</select></label>` : ''}<div id="sqlStatus" class="data-note">Ready.</div><div id="sqlResults" class="data-sql-results"></div></div>`);
  $('#closeDataPanel').onclick = closePanel;
  if ($('#sqlHistorySelect')) $('#sqlHistorySelect').onchange = event => { const query = prior[Number(event.target.value)]; if (query) $('#sqlQuery').value = query; };
  $('#runSql').onclick = async () => {
    const query = $('#sqlQuery').value.trim();
    if (!query) return;
    setProgress('Starting local SQL engine…', 0.05);
    $('#sqlStatus').textContent = 'Running locally…';
    try {
      const { connection } = await registerRowsAsDuckTable(rows, 'data', setProgress);
      const started = performance.now();
      const result = await connection.query(query);
      sqlLastRows = normalizeRows(arrowTableToRows(result));
      sqlHistoryPush(query);
      $('#sqlStatus').textContent = `${sqlLastRows.length.toLocaleString()} rows · ${Math.round(performance.now() - started).toLocaleString()} ms`;
      renderSmallTable($('#sqlResults'), sqlLastRows);
      $('#replaceWithSql').disabled = false;
      setProgress('Query complete', 1);
    } catch (error) {
      sqlLastRows = null;
      $('#replaceWithSql').disabled = true;
      $('#sqlStatus').textContent = error.message;
    } finally { setTimeout(clearProgress, 600); }
  };
  $('#replaceWithSql').onclick = () => sqlLastRows && applyRows('Replace with SQL result', sqlLastRows);
}

function showCharts() {
  openPanel(`<div class="data-form"><div class="data-panel-head"><strong>Charts</strong><button id="closeDataPanel" class="tb-toolbutton">Close</button></div><div class="data-form-grid"><label>Chart type<select id="chartType"><option value="bar">Bar</option><option value="line">Line</option><option value="scatter">Scatter</option><option value="histogram">Histogram</option><option value="box">Box plot</option><option value="heatmap">Heatmap</option></select></label><label>X column<select id="chartX">${columnOptions()}</select></label><label>Y column<select id="chartY">${columnOptions()}</select></label><label>Heatmap value<select id="chartZ">${columnOptions({ numericOnly:true, includeBlank:true })}</select></label></div><div class="data-actions"><button id="renderChart" class="data-primary">Render chart</button></div><div id="chartStatus" class="data-note">One active exploratory chart. Hover/focus marks for exact values.</div><div id="dataChart" class="data-chart-wrap"></div></div>`);
  $('#closeDataPanel').onclick = closePanel;
  $('#renderChart').onclick = async () => {
    $('#chartStatus').textContent = 'Loading chart engine…';
    try {
      await renderDataChart($('#dataChart'), rows, { type: $('#chartType').value, x: $('#chartX').value, y: $('#chartY').value, z: $('#chartZ').value });
      $('#chartStatus').textContent = `${$('#chartType').selectedOptions[0].textContent} · ${rows.length.toLocaleString()} source rows`;
    } catch (error) { $('#chartStatus').textContent = error.message; }
  };
}

function showExport() {
  openPanel(`<div class="data-form"><div class="data-panel-head"><strong>Convert / export</strong><button id="closeDataPanel" class="tb-toolbutton">Close</button></div><p>${rows.length.toLocaleString()} rows · ${columns().length.toLocaleString()} columns</p><div class="data-actions"><button data-export="csv" class="tb-toolbutton">CSV</button><button data-export="tsv" class="tb-toolbutton">TSV</button><button data-export="json" class="tb-toolbutton">JSON</button><button data-export="jsonl" class="tb-toolbutton">JSONL</button><button data-export="xlsx" class="tb-toolbutton">XLSX</button><button data-export="parquet" class="data-primary">Parquet</button></div><div id="exportStatus" class="data-note">CSV/TSV/JSON are immediate. XLSX and Parquet lazy-load their local browser engines.</div></div>`);
  $('#closeDataPanel').onclick = closePanel;
  panel.querySelectorAll('[data-export]').forEach(button => button.onclick = async () => {
    const format = button.dataset.export;
    $('#exportStatus').textContent = `Preparing ${format.toUpperCase()}…`;
    try {
      await exportRows(rows, format, sourceFile?.name || 'data', setProgress);
      $('#exportStatus').textContent = `${format.toUpperCase()} export ready.`;
    } catch (error) { $('#exportStatus').textContent = error.message; }
    finally { setTimeout(clearProgress, 600); }
  });
}

function clearAll() {
  sourceFile = null;
  sourceFormat = '';
  sourceMeta = {};
  originalRows = [];
  rows = [];
  history = createHistory({ rows: [] }, { initialLabel: 'No dataset', limit: 20 });
  searchInput.value = '';
  sortView = null;
  closePanel();
  historyPanel.hidden = true;
  render();
}

drop.addEventListener('click', () => picker.click());
drop.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); picker.click(); } });
for (const type of ['dragenter','dragover']) drop.addEventListener(type, event => { event.preventDefault(); drop.classList.add('drag'); });
for (const type of ['dragleave','drop']) drop.addEventListener(type, event => { event.preventDefault(); drop.classList.remove('drag'); });
drop.addEventListener('drop', event => loadFile(event.dataTransfer.files?.[0]));
picker.addEventListener('change', () => { loadFile(picker.files?.[0]); picker.value = ''; });
$('#replaceData').onclick = () => picker.click();
$('#clearData').onclick = clearAll;
searchInput.addEventListener('input', renderTable);
$('#resetDataView').onclick = () => { searchInput.value = ''; sortView = null; renderTable(); };
$('#downloadQuickCsv').onclick = () => exportRows(rows, 'csv', sourceFile?.name || 'data');
$('#tableData').onclick = showTableTools;
$('#cleanData').onclick = showCleanTools;
$('#transformData').onclick = showTransformTools;
$('#statisticsData').onclick = showStatistics;
$('#sqlData').onclick = showSql;
$('#chartData').onclick = showCharts;
$('#exportData').onclick = showExport;
$('#downloadData').onclick = showExport;
$('#undoData').onclick = () => history.canUndo() && restoreHistoryState(history.undo());
$('#redoData').onclick = () => history.canRedo() && restoreHistoryState(history.redo());
$('#showDataHistory').onclick = () => { renderHistory(); historyPanel.hidden = false; historyPanel.scrollIntoView({ block:'nearest' }); };
$('#closeDataHistory').onclick = () => { historyPanel.hidden = true; };

render();
