import { searchCommands, allWorkspaceCommands, commandLabel } from './command-core.js';
import { clearExpiredArtifacts, clearAllArtifacts, listArtifacts } from './artifacts.js';

const mainSearch = document.querySelector('#toolSearch');
const toolbar = document.querySelector('.tb-toolbar');
if (!mainSearch || !toolbar) {
  // The Step 10 command palette mounts on the Toolbox hub. Workspace deep links
  // remain normal URLs so GitHub Pages navigation stays framework-free.
} else {
  await clearExpiredArtifacts().catch(() => {});

  const actionResults = document.createElement('section');
  actionResults.id = 'toolActionResults';
  actionResults.className = 'tb-command-inline';
  actionResults.hidden = true;
  toolbar.insertAdjacentElement('afterend', actionResults);

  const button = document.createElement('button');
  button.id = 'commandSearchButton';
  button.type = 'button';
  button.className = 'tb-toolbutton';
  button.textContent = '⌘K Actions';
  toolbar.insertBefore(button, toolbar.firstChild?.nextSibling || null);

  const dialog = document.createElement('dialog');
  dialog.id = 'toolboxCommandPalette';
  dialog.className = 'tb-command-dialog';
  dialog.innerHTML = `
    <div class="tb-command-box">
      <div class="tb-command-head"><strong>Toolbox command search</strong><button type="button" class="tb-toolbutton" data-command-close>Esc</button></div>
      <input id="commandSearchInput" class="tb-command-input" type="search" autocomplete="off" placeholder="Search actions… e.g. merge pdf, base64, subnet">
      <div id="commandResults" class="tb-command-results" role="listbox" aria-label="Toolbox commands"></div>
      <div class="tb-command-foot"><span id="commandHint">↑↓ move · Enter open · Esc close</span><button id="clearToolboxArtifacts" type="button" class="tb-toolbutton">Clear temporary data</button></div>
    </div>`;
  document.body.append(dialog);

  const commandInput = dialog.querySelector('#commandSearchInput');
  const commandResults = dialog.querySelector('#commandResults');
  const clearArtifacts = dialog.querySelector('#clearToolboxArtifacts');
  const hint = dialog.querySelector('#commandHint');
  let currentMatches = [];
  let activeIndex = 0;

  function record(route) { window.Toolbox?.recordRecent?.(route); }

  function renderRows(target, matches, { compact = false } = {}) {
    target.innerHTML = '';
    matches.forEach((match, index) => {
      const a = document.createElement('a');
      a.href = match.route;
      a.className = compact ? 'tb-command-inline-row' : 'tb-command-row';
      a.dataset.commandIndex = String(index);
      a.setAttribute('role', 'option');
      a.setAttribute('aria-selected', String(index === activeIndex));
      a.innerHTML = `<span><strong>${escapeHtml(match.title)}</strong><small>${escapeHtml(match.workspaceTitle || match.title)}${match.kind === 'action' ? ' · action' : ' · workspace'}</small></span><code>${escapeHtml(match.actionId || 'open')}</code>`;
      a.addEventListener('click', () => record(match.route));
      target.append(a);
    });
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;' }[ch]));
  }

  function recentCommands() {
    const recentRoutes = window.Toolbox?.readState?.().recent || [];
    const all = allWorkspaceCommands();
    const recent = recentRoutes.map(route => all.find(item => item.route === route)).filter(Boolean);
    return [...recent, ...all.filter(item => !recent.some(recentItem => recentItem.route === item.route))].slice(0, 13);
  }

  function updateDialogResults() {
    const query = commandInput.value.trim();
    currentMatches = query ? searchCommands(query, { limit: 14 }) : recentCommands();
    activeIndex = Math.min(activeIndex, Math.max(0, currentMatches.length - 1));
    renderRows(commandResults, currentMatches);
    if (!currentMatches.length) commandResults.innerHTML = '<div class="tb-command-none">No matching action.</div>';
  }

  function updateInlineResults() {
    const query = mainSearch.value.trim();
    if (!query) {
      actionResults.hidden = true;
      actionResults.innerHTML = '';
      return;
    }
    const matches = searchCommands(query, { limit: 8 }).filter(match => match.kind === 'action');
    actionResults.hidden = false;
    actionResults.innerHTML = `<div class="tb-command-inline-head"><strong>Direct actions</strong><span>${matches.length} match${matches.length === 1 ? '' : 'es'}</span></div><div class="tb-command-inline-list"></div>`;
    const list = actionResults.querySelector('.tb-command-inline-list');
    renderRows(list, matches, { compact: true });
    if (!matches.length) list.innerHTML = '<div class="tb-command-none">No direct action match. Workspace cards are filtered below.</div>';
  }

  async function syncArtifactButton(message = '') {
    const count = (await listArtifacts().catch(() => [])).length;
    clearArtifacts.textContent = count ? `Clear temporary data · ${count}` : 'Clear temporary data';
    hint.textContent = message || '↑↓ move · Enter open · Esc close';
  }

  async function openPalette(initial = '') {
    commandInput.value = initial;
    activeIndex = 0;
    updateDialogResults();
    await syncArtifactButton();
    if (!dialog.open) dialog.showModal();
    requestAnimationFrame(() => commandInput.focus());
  }

  button.addEventListener('click', () => openPalette(mainSearch.value.trim()));
  dialog.querySelector('[data-command-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('cancel', event => { event.preventDefault(); dialog.close(); });
  commandInput.addEventListener('input', () => { activeIndex = 0; updateDialogResults(); });
  mainSearch.addEventListener('input', updateInlineResults);

  commandInput.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      dialog.close();
      return;
    }
    if (!currentMatches.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      activeIndex = (activeIndex + 1) % currentMatches.length;
      renderRows(commandResults, currentMatches);
      commandResults.querySelector(`[data-command-index="${activeIndex}"]`)?.scrollIntoView({ block: 'nearest' });
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      activeIndex = (activeIndex - 1 + currentMatches.length) % currentMatches.length;
      renderRows(commandResults, currentMatches);
      commandResults.querySelector(`[data-command-index="${activeIndex}"]`)?.scrollIntoView({ block: 'nearest' });
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const match = currentMatches[activeIndex];
      if (match) { record(match.route); location.href = match.route; }
    }
  });

  clearArtifacts.addEventListener('click', async () => {
    await clearAllArtifacts();
    await syncArtifactButton('Temporary Toolbox artifacts cleared.');
  });

  document.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      if (dialog.open) dialog.close(); else openPalette(mainSearch.value.trim());
    } else if (event.key === 'Escape' && dialog.open) {
      event.preventDefault();
      dialog.close();
    }
  });

  updateInlineResults();
}
