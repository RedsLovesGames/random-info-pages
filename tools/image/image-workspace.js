import { downloadBlob, formatBytes } from '../shared/files.js';
import { readRequestedAction } from '../shared/workspace.js';

const app = window.ImageStudioApp;
if (!app) throw new Error('Image Studio core did not initialize.');

const $ = selector => document.querySelector(selector);
const sourceHeader = $('#imageSourceHeader');
const sourceName = $('#imageSourceName');
const sourceMeta = $('#imageSourceMeta');
const drop = $('#drop');
const picker = $('#picker');
const addMore = $('#imageAddMore');
const settingsDrawer = $('#imageSettingsDrawer');
const settingsTitle = $('#imageSettingsTitle');
const closeSettings = $('#closeImageSettings');
const undoButton = $('#imageUndo');
const redoButton = $('#imageRedo');
const historyButton = $('#showImageHistory');
const historyPanel = $('#imageHistoryPanel');
const historyList = $('#imageHistoryList');
const closeHistory = $('#closeImageHistory');
const downloadSelected = $('#downloadSelected');
const queue = $('#queue');

const originalApplyWorkingFile = app.applyWorkingFile.bind(app);
const originalResetWorkingFile = app.resetWorkingFile.bind(app);
const histories = new Map();
let requestedAction = readRequestedAction(location.search, location.hash);
let requestedActionHandled = false;
let activeSettingsMode = null;

function currentItem() {
  return app.getSelectedItem?.() || null;
}

function currentInput() {
  return app.getInputFile?.() || null;
}

function ensureHistory(item = currentItem()) {
  if (!item) return null;
  if (!histories.has(item.id)) {
    histories.set(item.id, {
      entries: [{ label: 'Original source', file: item.workingFile || null }],
      index: 0,
    });
  }
  return histories.get(item.id);
}

function trimRedo(history) {
  if (history.index < history.entries.length - 1) history.entries = history.entries.slice(0, history.index + 1);
}

function editLabel(file) {
  const name = String(file?.name || '').toLowerCase();
  if (name.includes('-crop')) return 'Crop / rotate';
  if (name.includes('-no-bg')) return 'Remove background';
  return 'Edit source';
}

function pushHistory(label, file) {
  const history = ensureHistory();
  if (!history) return;
  trimRedo(history);
  history.entries.push({ label, file: file || null });
  if (history.entries.length > 40) history.entries.splice(1, history.entries.length - 40);
  history.index = history.entries.length - 1;
  syncHistory();
}

function restoreHistoryEntry(history) {
  const entry = history?.entries?.[history.index];
  if (!entry) return;
  if (entry.file) originalApplyWorkingFile(entry.file);
  else originalResetWorkingFile();
}

function undo() {
  const history = ensureHistory();
  if (!history || history.index <= 0) return;
  history.index -= 1;
  restoreHistoryEntry(history);
  syncWorkspace();
}

function redo() {
  const history = ensureHistory();
  if (!history || history.index >= history.entries.length - 1) return;
  history.index += 1;
  restoreHistoryEntry(history);
  syncWorkspace();
}

app.applyWorkingFile = file => {
  const item = currentItem();
  if (!item || !file) return;
  originalApplyWorkingFile(file);
  pushHistory(editLabel(file), file);
};

app.resetWorkingFile = () => {
  const item = currentItem();
  if (!item?.workingFile) return;
  originalResetWorkingFile();
  pushHistory('Restore original', null);
};

function renderHistory() {
  const history = ensureHistory();
  historyList.innerHTML = '';
  if (!history) return;
  history.entries.forEach((entry, index) => {
    const li = document.createElement('li');
    li.textContent = entry.label;
    if (index === history.index) {
      li.classList.add('current');
      li.setAttribute('aria-current', 'step');
    }
    historyList.append(li);
  });
}

function syncHistory() {
  const history = ensureHistory();
  const canUndo = Boolean(history && history.index > 0);
  const canRedo = Boolean(history && history.index < history.entries.length - 1);
  undoButton.disabled = !canUndo;
  redoButton.disabled = !canRedo;
  historyButton.disabled = !history;
  renderHistory();
}

function syncSourceHeader() {
  const item = currentItem();
  const input = currentInput();
  const hasSource = Boolean(item && input);
  sourceHeader.hidden = !hasSource;
  drop.hidden = hasSource;
  if (!hasSource) {
    sourceName.textContent = 'image.png';
    sourceMeta.textContent = 'Local source';
    downloadSelected.disabled = true;
    return;
  }
  sourceName.textContent = item.file?.name || input.name || 'image';
  const dimensions = item.width && item.height ? `${item.width}×${item.height} · ` : '';
  const edited = item.workingFile ? ' · edited source' : '';
  sourceMeta.textContent = `${dimensions}${formatBytes(input.size)} · ${(input.type || 'image').replace('image/', '').toUpperCase()}${edited}`;
  downloadSelected.disabled = !item.result;
}

function syncToolAvailability() {
  const item = currentItem();
  document.querySelectorAll('[data-image-tool]').forEach(button => {
    const action = button.dataset.imageTool;
    if (action === 'gif' || action === 'reset' || action === 'crop' || action === 'remove-bg') return;
    button.disabled = !item;
  });
}

function syncWorkspace() {
  syncSourceHeader();
  syncToolAvailability();
  syncHistory();
  maybeHandleRequestedAction();
}

function showSettingGroups(mode) {
  document.querySelectorAll('[data-image-setting]').forEach(group => {
    const modes = String(group.dataset.imageSetting || '').split(/\s+/).filter(Boolean);
    group.hidden = !modes.includes(mode);
  });
}

function openSettings(mode) {
  if (!currentItem()) return;
  activeSettingsMode = mode;
  settingsDrawer.hidden = false;
  settingsTitle.textContent = mode === 'compress' ? 'Compress' : mode === 'convert' ? 'Convert' : 'Resize';
  showSettingGroups(mode);
  document.querySelectorAll('[data-open-image-settings]').forEach(button => button.classList.toggle('active', button.dataset.openImageSettings === mode));
  settingsDrawer.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest' });
}

function hideSettings() {
  activeSettingsMode = null;
  settingsDrawer.hidden = true;
  document.querySelectorAll('[data-open-image-settings]').forEach(button => button.classList.remove('active'));
}

function maybeHandleRequestedAction() {
  if (requestedActionHandled || !requestedAction) return;
  if (requestedAction === 'gif') {
    requestedActionHandled = true;
    $('#gifMaker')?.click();
    return;
  }
  if (!currentItem()) return;
  const settingsMap = { resize: 'resize', convert: 'convert', compress: 'compress' };
  if (settingsMap[requestedAction]) {
    requestedActionHandled = true;
    openSettings(settingsMap[requestedAction]);
    return;
  }
  const directMap = {
    crop: '#cropSelected',
    'background-remove': '#removeBgSelected',
  };
  const selector = directMap[requestedAction];
  if (selector) {
    requestedActionHandled = true;
    $(selector)?.click();
  }
}

function downloadCurrentResult() {
  const result = currentItem()?.result;
  if (!result?.blob) return;
  downloadBlob(result.blob, result.name || 'image-output');
}

addMore?.addEventListener('click', () => picker?.click());
closeSettings?.addEventListener('click', hideSettings);
undoButton?.addEventListener('click', undo);
redoButton?.addEventListener('click', redo);
historyButton?.addEventListener('click', () => { renderHistory(); historyPanel.hidden = false; });
closeHistory?.addEventListener('click', () => { historyPanel.hidden = true; });
downloadSelected?.addEventListener('click', downloadCurrentResult);

document.querySelectorAll('[data-open-image-settings]').forEach(button => {
  button.addEventListener('click', () => openSettings(button.dataset.openImageSettings));
});

window.addEventListener('imagestudio:selectionchange', () => {
  ensureHistory();
  syncWorkspace();
});

const queueObserver = new MutationObserver(() => {
  syncSourceHeader();
  syncToolAvailability();
});
if (queue) queueObserver.observe(queue, { childList: true, subtree: true, characterData: true });

window.addEventListener('beforeunload', () => queueObserver.disconnect(), { once: true });

window.ImageStudioWorkspace = {
  undo,
  redo,
  openSettings,
  hideSettings,
  getActiveSettingsMode: () => activeSettingsMode,
  getHistory: () => {
    const history = ensureHistory();
    return history ? { index: history.index, entries: history.entries.map(entry => ({ label: entry.label, hasFile: Boolean(entry.file) })) } : null;
  },
};

ensureHistory();
syncWorkspace();
