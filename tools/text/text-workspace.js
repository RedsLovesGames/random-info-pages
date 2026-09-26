import { createHistory } from '../shared/history.js';

const $ = selector => document.querySelector(selector);
const textInput = $('#textInput');
const textOutput = $('#textOutput');
const panel = $('#textToolPanel');
const historyPanel = $('#textHistory');
const historyList = $('#textHistoryList');
const status = $('#textStatus');
const history = createHistory('', { initialLabel: 'Initial text', limit: 80 });

function setStatus(message) { if (status) status.textContent = message || ''; }
function writeOutput(value, message = 'Output updated.') { textOutput.value = String(value ?? ''); setStatus(message); }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[char])); }

function pushHistory(label, state) {
  if (history.current() === state) return;
  history.push({ label, state });
}
function commitInputBoundary(before, label) {
  pushHistory('Input before change', before);
  pushHistory(label, textInput.value);
  renderHistory();
  syncHistoryButtons();
}
function restore(value) {
  textInput.value = value ?? '';
  textInput.dispatchEvent(new Event('input', { bubbles: true }));
  syncHistoryButtons();
}
function syncHistoryButtons() {
  $('#undoText').disabled = !history.canUndo();
  $('#redoText').disabled = !history.canRedo();
}
function renderHistory() {
  historyList.innerHTML = '';
  for (const entry of history.entries()) {
    const li = document.createElement('li');
    li.textContent = entry.label;
    if (entry.current) li.classList.add('current');
    historyList.append(li);
  }
}
function showPanel(html) { panel.innerHTML = html; panel.hidden = false; }
function hidePanel() { panel.hidden = true; panel.innerHTML = ''; }
function setLauncher(tool) {
  for (const button of document.querySelectorAll('.text-launch')) button.classList.toggle('active', button.dataset.textTool === tool);
}

$('#unicodeTool').addEventListener('click', () => writeOutput(TextCore.unicodeCleanup(textInput.value), 'Unicode normalized.'));
$('#shuffleLines').addEventListener('click', () => writeOutput(TextCore.shuffleLines(textInput.value), 'Lines shuffled.'));

$('#findReplaceTool').addEventListener('click', () => {
  setLauncher('find');
  showPanel(`<div class="text-tool-grid">
    <label>Find<input id="textFind" type="text" placeholder="text or pattern"></label>
    <label>Replace<input id="textReplace" type="text" placeholder="replacement"></label>
    <label><span><input id="textRegex" type="checkbox"> Regular expression</span></label>
    <label><span><input id="textCaseSensitive" type="checkbox"> Case sensitive</span></label>
  </div><div class="text-actions"><button id="runTextReplace" class="text-button primary" type="button">Preview replacement</button><button id="closeTextTool" class="text-button" type="button">Close</button></div>`);
  $('#runTextReplace').onclick = () => {
    try { writeOutput(TextCore.replaceText(textInput.value, $('#textFind').value, $('#textReplace').value, { regex: $('#textRegex').checked, caseSensitive: $('#textCaseSensitive').checked }), 'Replacement preview ready.'); }
    catch (error) { setStatus(`Regex error: ${error.message || error}`); }
  };
  $('#closeTextTool').onclick = hidePanel;
});

$('#analyzeTool').addEventListener('click', () => {
  setLauncher('analyze');
  const result = TextCore.analyzeText(textInput.value);
  const frequency = result.frequency.slice(0, 30).map(item => `<span>${escapeHtml(item.word)} · ${item.count}</span>`).join('');
  showPanel(`<div class="text-tool-result"><strong>${result.words.toLocaleString()} words</strong> · ${result.sentences.toLocaleString()} sentences · ${result.uniqueWords.toLocaleString()} unique<br>Reading time: ${Math.max(0.1, result.readingMinutes).toFixed(1)} min · Flesch reading ease: ${result.fleschReadingEase}</div><div class="text-frequency">${frequency || '<span>No words yet</span>'}</div><div class="text-actions"><button id="closeTextTool" class="text-button" type="button">Close</button></div>`);
  $('#closeTextTool').onclick = hidePanel;
});

$('#compareTool').addEventListener('click', () => {
  setLauncher('compare');
  showPanel(`<div class="text-tool-grid"><label style="grid-column:1/-1">Compare input<textarea id="compareText" rows="7" placeholder="Paste the second version here"></textarea></label></div><div class="text-actions"><button id="runTextDiff" class="text-button primary" type="button">Compare</button><button id="closeTextTool" class="text-button" type="button">Close</button></div><div id="textDiffResult" class="text-tool-result" hidden></div>`);
  $('#runTextDiff').onclick = () => {
    const parts = TextCore.diffText(textInput.value, $('#compareText').value);
    const target = $('#textDiffResult');
    target.hidden = false;
    target.innerHTML = `<div class="text-diff">${parts.map(part => `<div class="${part.type}">${part.type === 'add' ? '+' : part.type === 'remove' ? '-' : ' '} ${escapeHtml(part.value)}</div>`).join('')}</div>`;
  };
  $('#closeTextTool').onclick = hidePanel;
});

$('#undoText').addEventListener('click', () => { if (history.canUndo()) { restore(history.undo()); setStatus('Undid input change.'); renderHistory(); } });
$('#redoText').addEventListener('click', () => { if (history.canRedo()) { restore(history.redo()); setStatus('Redid input change.'); renderHistory(); } });
$('#showTextHistory').addEventListener('click', () => { renderHistory(); historyPanel.hidden = false; });
$('#closeTextHistory').addEventListener('click', () => { historyPanel.hidden = true; });

for (const [selector, label] of [['#useOutput', 'Use output as input'], ['#swapText', 'Swap input/output']]) {
  const button = $(selector);
  let before = '';
  button.addEventListener('click', () => { before = textInput.value; }, { capture: true });
  button.addEventListener('click', () => queueMicrotask(() => commitInputBoundary(before, label)));
}

for (const button of document.querySelectorAll('[data-mode]')) {
  button.addEventListener('click', () => {
    hidePanel();
    for (const launch of document.querySelectorAll('.text-launch')) launch.classList.toggle('active', launch === button);
  });
}

const requested = new URLSearchParams(location.search).get('action');
if (requested === 'find-replace') $('#findReplaceTool').click();
else if (requested === 'analyze') $('#analyzeTool').click();
else if (requested === 'diff') $('#compareTool').click();
else if (requested === 'lists') $('#listMode').click();
else if (requested === 'markdown') $('#markdownMode').click();

renderHistory();
syncHistoryButtons();
