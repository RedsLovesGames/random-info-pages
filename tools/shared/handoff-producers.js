import { artifactHref, putArtifact } from './artifacts.js';

const HANDOFF_CLASS = 'tb-open-handoff';

async function openTextArtifact(text, { name = 'pdf-text.txt', sourceWorkspace = 'pdf' } = {}) {
  const id = await putArtifact({ data: text, type: 'text/plain;charset=utf-8', name, sourceWorkspace });
  location.href = artifactHref('../text/', id);
}

async function openJsonArtifact(data, { name = 'data.json', sourceWorkspace = 'data', target = '../developer/', action = 'json' } = {}) {
  const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  const id = await putArtifact({ data: text, type: 'application/json', name, sourceWorkspace });
  location.href = artifactHref(target, id, action ? { action } : {});
}

function installPdfTextHandoff() {
  const result = document.querySelector('#textResult');
  if (!result) return;
  const row = result.parentElement?.querySelector('.pdf-actions-row');
  if (!row || row.querySelector(`.${HANDOFF_CLASS}`)) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `tb-toolbutton ${HANDOFF_CLASS}`;
  button.textContent = 'Open in Text Studio';
  button.addEventListener('click', () => openTextArtifact(result.textContent || '', {
    name: `${document.querySelector('#sourceName')?.textContent?.replace(/\.pdf$/i, '') || 'pdf'}-text.txt`,
    sourceWorkspace: 'pdf',
  }));
  row.append(button);
}

function installDataJsonHandoff() {
  const panel = document.querySelector('#dataActionPanel');
  const jsonButton = panel?.querySelector('[data-export="json"]');
  const actions = jsonButton?.parentElement;
  if (!jsonButton || !actions || actions.querySelector(`.${HANDOFF_CLASS}`)) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `tb-toolbutton ${HANDOFF_CLASS}`;
  button.textContent = 'Open JSON in Developer Lab';
  button.addEventListener('click', () => {
    let resolved = false;
    const handler = async event => {
      if (event.detail?.format !== 'json') return;
      event.preventDefault();
      resolved = true;
      window.removeEventListener('toolbox:data-export', handler);
      await openJsonArtifact(event.detail.rows || [], {
        name: `${event.detail.baseName || 'data'}.json`,
        sourceWorkspace: 'data',
        target: '../developer/',
        action: 'json',
      });
    };
    window.addEventListener('toolbox:data-export', handler);
    jsonButton.click();
    setTimeout(() => { if (!resolved) window.removeEventListener('toolbox:data-export', handler); }, 1500);
  });
  actions.append(button);
}

function installFileMetadataHandoff() {
  const panel = document.querySelector('#filesActionPanel');
  if (!panel || !/Inspect file/i.test(panel.textContent || '') || panel.querySelector(`.${HANDOFF_CLASS}`)) return;
  const rows = [...panel.querySelectorAll('.files-result-item')];
  if (!rows.length) return;
  const metadata = {};
  for (const row of rows) {
    const key = row.querySelector('span')?.textContent?.trim();
    const value = row.querySelector('code')?.textContent?.trim();
    if (key) metadata[key.replace(/\s+/g, '_').toLowerCase()] = value || '';
  }
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `tb-toolbutton ${HANDOFF_CLASS}`;
  button.textContent = 'Open metadata in Data Studio';
  button.addEventListener('click', () => openJsonArtifact([metadata], {
    name: 'file-metadata.json',
    sourceWorkspace: 'files',
    target: '../data/',
    action: '',
  }));
  const head = panel.querySelector('.files-panel-head');
  (head || panel).append(button);
}

function scan() {
  installPdfTextHandoff();
  installDataJsonHandoff();
  installFileMetadataHandoff();
}

const observer = new MutationObserver(scan);
observer.observe(document.body, { childList: true, subtree: true });
scan();
