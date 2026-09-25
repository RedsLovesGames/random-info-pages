import { buildRenamePlan, groupDuplicateRecords, sniffFileType, toHexPreview } from './files-core.js';
import { createHistory } from '../shared/history.js';
import { downloadBlob, formatBytes } from '../shared/files.js';

const $ = selector => document.querySelector(selector);
const drop = $('#filesDrop');
const picker = $('#filesPicker');
const folderPicker = $('#folderPicker');
const workspace = $('#filesWorkspace');
const fileList = $('#fileList');
const summary = $('#filesSummary');
const meta = $('#filesMeta');
const selectionLabel = $('#filesSelection');
const panel = $('#filesActionPanel');
const progress = $('#filesProgress');
const progressLabel = $('#filesProgressLabel');
const progressValue = $('#filesProgressValue');
const progressBar = $('#filesProgressBar');
const historyPanel = $('#filesHistory');
const historyList = $('#filesHistoryList');

let nextId = 1;
let items = [];
let history = createHistory([], { initialLabel: 'Files loaded', limit: 50 });
let busy = false;
let fflatePromise = null;
let hashWasmPromise = null;

function selectedItems() { return items.filter(item => item.selected); }
function selectedOrAll() { const selected = selectedItems(); return selected.length ? selected : items; }
function totalBytes(list = items) { return list.reduce((sum, item) => sum + item.file.size, 0); }
function snapshotNames() { return items.map(item => ({ id: item.id, displayName: item.displayName })); }
function restoreNames(state) { for (const entry of state || []) { const item = items.find(x => x.id === entry.id); if (item) item.displayName = entry.displayName; } render(); }

function setBusy(value, label = 'Working…', fraction = 0) {
  busy = Boolean(value);
  progress.hidden = !busy;
  progressLabel.textContent = label;
  progressBar.value = Math.max(0, Math.min(1, fraction || 0));
  progressValue.textContent = `${Math.round(progressBar.value * 100)}%`;
  syncButtons();
}
function setProgress(label, current, total) {
  const fraction = total ? current / total : 0;
  progressLabel.textContent = label;
  progressBar.value = Math.max(0, Math.min(1, fraction));
  progressValue.textContent = `${Math.round(progressBar.value * 100)}%`;
}

function syncButtons() {
  const has = items.length > 0;
  const one = selectedItems().length === 1;
  for (const id of ['renameFiles','hashFiles','findDuplicates','archiveFiles']) $( `#${id}` ).disabled = !has || busy;
  $('#inspectFile').disabled = !has || busy;
  $('#downloadFiles').disabled = !has || busy;
  $('#undoFiles').disabled = busy || !history.canUndo();
  $('#redoFiles').disabled = busy || !history.canRedo();
  $('#showFilesHistory').disabled = !has;
  $('#clearFiles').disabled = busy;
  $('#addFiles').disabled = busy;
  $('#addFolder').disabled = busy;
  $('#inspectFile').title = one ? 'Inspect selected file' : 'Inspect the first selected or first file';
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

function render() {
  workspace.hidden = !items.length;
  drop.hidden = Boolean(items.length);
  summary.textContent = `${items.length} file${items.length === 1 ? '' : 's'}`;
  meta.textContent = formatBytes(totalBytes());
  const selected = selectedItems();
  selectionLabel.textContent = `${selected.length} selected`;
  fileList.innerHTML = '';
  if (!items.length) {
    const empty = document.createElement('div'); empty.className = 'files-empty'; empty.textContent = 'No files loaded.'; fileList.append(empty);
  }
  for (const item of items) {
    const row = document.createElement('div'); row.className = `files-row${item.selected ? ' selected' : ''}`;
    const check = document.createElement('input'); check.type = 'checkbox'; check.checked = item.selected; check.setAttribute('aria-label', `Select ${item.displayName}`);
    check.addEventListener('change', () => { item.selected = check.checked; render(); });
    const name = document.createElement('div'); name.className = 'files-name';
    const strong = document.createElement('strong'); strong.textContent = item.displayName;
    const small = document.createElement('small'); small.textContent = item.file.webkitRelativePath || item.file.name;
    name.append(strong, small);
    const type = document.createElement('span'); type.className = 'files-type'; type.textContent = item.file.type || 'unknown';
    const size = document.createElement('span'); size.className = 'files-size'; size.textContent = formatBytes(item.file.size);
    const status = document.createElement('span'); status.className = `files-status${item.sha256 ? ' good' : ''}`; status.textContent = item.sha256 ? 'SHA-256 ready' : 'Ready';
    row.append(check, name, type, size, status); fileList.append(row);
  }
  renderHistory(); syncButtons();
}

function addFiles(fileListLike) {
  const incoming = [...(fileListLike || [])];
  for (const file of incoming) items.push({ id: nextId++, file, displayName: file.name, selected: false, sha256: '', sha512: '' });
  if (incoming.length && !selectedItems().length) for (const item of items) item.selected = true;
  history = createHistory(snapshotNames(), { initialLabel: 'Files loaded', limit: 50 });
  render();
}

function clearAll() {
  items = []; panel.hidden = true; historyPanel.hidden = true; history = createHistory([], { initialLabel: 'Files loaded', limit: 50 }); render();
}

function openPanel(html) { panel.innerHTML = html; panel.hidden = false; panel.scrollIntoView({ block: 'nearest' }); }
function closePanel() { panel.hidden = true; panel.innerHTML = ''; }

function escapeHtml(value) { return String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char])); }

function showRename() {
  const targets = selectedOrAll();
  openPanel(`<div class="files-form"><div class="files-panel-head"><strong>Bulk rename · ${targets.length} file${targets.length===1?'':'s'}</strong><button id="closeFilesPanel" class="tb-toolbutton">Close</button></div><div class="files-form-grid">
    <label>Find<input id="renameFind" type="text" placeholder="text to replace"></label><label>Replace<input id="renameReplace" type="text" placeholder="replacement"></label>
    <label>Prefix<input id="renamePrefix" type="text"></label><label>Suffix<input id="renameSuffix" type="text"></label>
    <label>Case<select id="renameCase"><option value="keep">Keep</option><option value="lower">lowercase</option><option value="upper">UPPERCASE</option><option value="title">Title Case</option></select></label>
    <label><span><input id="renameNumbering" type="checkbox"> Number files</span><input id="renameStart" type="number" value="1" min="0"></label>
  </div><div id="renamePreview" class="files-preview-list"></div><div class="files-actions"><button id="applyRename" class="files-primary">Apply names</button></div></div>`);
  const controls = ['renameFind','renameReplace','renamePrefix','renameSuffix','renameCase','renameNumbering','renameStart'].map(id => $(`#${id}`));
  const update = () => {
    const plan = buildRenamePlan(targets.map(item => ({ id:item.id, name:item.displayName })), { find: $('#renameFind').value, replace: $('#renameReplace').value, prefix: $('#renamePrefix').value, suffix: $('#renameSuffix').value, caseMode: $('#renameCase').value, numbering: $('#renameNumbering').checked, numberStart: Number($('#renameStart').value), numberPad: Math.max(2, String(targets.length).length) });
    $('#renamePreview').innerHTML = plan.slice(0,80).map(entry => `<div class="files-preview-item"><code>${escapeHtml(entry.originalName)}</code><code>→ ${escapeHtml(entry.outputName)}</code></div>`).join('') + (plan.length>80?`<small>+ ${plan.length-80} more</small>`:'');
    return plan;
  };
  controls.forEach(control => control.addEventListener('input', update));
  $('#closeFilesPanel').addEventListener('click', closePanel);
  $('#applyRename').addEventListener('click', () => { const plan = update(); for (const entry of plan) { const item = items.find(x => x.id === entry.id); if (item) item.displayName = entry.outputName; } history.push({ label: `Rename ${plan.length} file${plan.length===1?'':'s'}`, state: snapshotNames() }); closePanel(); render(); });
  update();
}

async function loadHashWasm() {
  if (window.hashwasm) return window.hashwasm;
  if (!hashWasmPromise) hashWasmPromise = new Promise((resolve,reject) => {
    const script = document.createElement('script'); script.src = 'https://cdn.jsdelivr.net/npm/hash-wasm@4.12.0/dist/index.umd.min.js'; script.crossOrigin = 'anonymous';
    script.onload = () => window.hashwasm ? resolve(window.hashwasm) : reject(new Error('hash-wasm did not initialize.')); script.onerror = () => reject(new Error('Could not load large-file hashing support.')); document.head.append(script);
  }).catch(error => { hashWasmPromise = null; throw error; });
  return hashWasmPromise;
}

async function hashFile(file, algorithm = 'SHA-256') {
  if (file.size <= 64 * 1024 * 1024 && crypto?.subtle) {
    const digest = await crypto.subtle.digest(algorithm, await file.arrayBuffer());
    return [...new Uint8Array(digest)].map(x => x.toString(16).padStart(2,'0')).join('');
  }
  const wasm = await loadHashWasm();
  const hasher = algorithm === 'SHA-512' ? await wasm.createSHA512() : await wasm.createSHA256();
  hasher.init();
  const reader = file.stream().getReader();
  for (;;) { const { done, value } = await reader.read(); if (done) break; hasher.update(value); }
  return hasher.digest('hex');
}

async function runHashes(showResults = true) {
  const targets = selectedOrAll(); if (!targets.length) return [];
  setBusy(true, 'Hashing files…', 0);
  try {
    for (let i=0;i<targets.length;i++) { const item = targets[i]; setProgress(`Hashing ${item.displayName}`, i, targets.length); item.sha256 = await hashFile(item.file, 'SHA-256'); item.sha512 ||= ''; }
    setProgress('Hashes complete', targets.length, targets.length); render();
    if (showResults) openPanel(`<div class="files-panel-head"><strong>SHA-256 checksums</strong><button id="closeFilesPanel" class="tb-toolbutton">Close</button></div><div class="files-result-list">${targets.map(item=>`<div class="files-result-item"><span>${escapeHtml(item.displayName)}</span><code>${item.sha256}</code></div>`).join('')}</div>`), $('#closeFilesPanel').addEventListener('click', closePanel);
    return targets;
  } finally { setBusy(false); }
}

async function findDuplicateFiles() {
  const targets = selectedOrAll(); if (targets.length < 2) return;
  const bySize = new Map(); for (const item of targets) { const key=item.file.size; if(!bySize.has(key))bySize.set(key,[]); bySize.get(key).push(item); }
  const candidates = [...bySize.values()].filter(group=>group.length>1).flat();
  if (!candidates.length) return openPanel(`<div class="files-panel-head"><strong>Duplicates</strong><button id="closeFilesPanel" class="tb-toolbutton">Close</button></div><p>No same-size duplicate candidates.</p>`), $('#closeFilesPanel').addEventListener('click', closePanel);
  setBusy(true,'Checking duplicates…',0);
  try { for(let i=0;i<candidates.length;i++){const item=candidates[i];setProgress(`Checking ${item.displayName}`,i,candidates.length);item.sha256 ||= await hashFile(item.file,'SHA-256');} }
  finally { setBusy(false); }
  const groups = groupDuplicateRecords(candidates.map(item=>({id:item.id,size:item.file.size,hash:item.sha256,item})));
  const body = groups.length ? groups.map((group,index)=>`<div class="files-result-item"><strong>Group ${index+1}</strong><div>${group.map(entry=>escapeHtml(entry.item.displayName)).join('<br>')}</div></div>`).join('') : '<p>No byte-identical duplicates found.</p>';
  openPanel(`<div class="files-panel-head"><strong>Duplicates</strong><button id="closeFilesPanel" class="tb-toolbutton">Close</button></div><div class="files-result-list">${body}</div>`); $('#closeFilesPanel').addEventListener('click', closePanel);
}

async function loadFflate() {
  if (window.fflate?.zipSync) return window.fflate;
  if (!fflatePromise) fflatePromise = new Promise((resolve,reject)=>{ const script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/fflate@0.8.3/umd/index.js';script.crossOrigin='anonymous';script.onload=()=>window.fflate?.zipSync?resolve(window.fflate):reject(new Error('ZIP library did not initialize.'));script.onerror=()=>reject(new Error('Could not load ZIP support.'));document.head.append(script); }).catch(error=>{fflatePromise=null;throw error;});
  return fflatePromise;
}

async function makeZip(targets, filename='toolbox-files.zip') {
  const fflate = await loadFflate(); const entries={};
  for(let i=0;i<targets.length;i++){const item=targets[i];setProgress(`Reading ${item.displayName}`,i,targets.length);entries[item.displayName]=new Uint8Array(await item.file.arrayBuffer());}
  const zipped = fflate.zipSync(entries,{level:6}); downloadBlob(new Blob([zipped],{type:'application/zip'}),filename);
}

async function showArchive() {
  const targets = selectedOrAll(); if (!targets.length) return;
  const singleZip = targets.length===1 && /\.zip$/i.test(targets[0].displayName);
  openPanel(`<div class="files-form"><div class="files-panel-head"><strong>Archive</strong><button id="closeFilesPanel" class="tb-toolbutton">Close</button></div><p>${singleZip?'Create a new ZIP or inspect/extract the selected ZIP.':'Create one ZIP from the current selection.'}</p><div class="files-actions"><button id="createZip" class="files-primary">Create ZIP</button>${singleZip?'<button id="extractZip" class="tb-toolbutton">Inspect / extract ZIP</button>':''}</div><div id="archiveResults"></div></div>`);
  $('#closeFilesPanel').addEventListener('click',closePanel);
  $('#createZip').addEventListener('click',async()=>{setBusy(true,'Building ZIP…',0);try{await makeZip(targets);}catch(e){$('#archiveResults').textContent=e.message;}finally{setBusy(false);}});
  if(singleZip) $('#extractZip').addEventListener('click',async()=>{const out=$('#archiveResults');out.textContent='Reading ZIP…';try{const fflate=await loadFflate();const extracted=fflate.unzipSync(new Uint8Array(await targets[0].file.arrayBuffer()));out.innerHTML=`<div class="files-result-list">${Object.entries(extracted).map(([name,bytes],i)=>`<div class="files-result-item"><span>${escapeHtml(name)} · ${formatBytes(bytes.length)}</span><button class="tb-toolbutton" data-extract="${i}">Download</button></div>`).join('')}</div>`;Object.entries(extracted).forEach(([name,bytes],i)=>out.querySelector(`[data-extract="${i}"]`)?.addEventListener('click',()=>downloadBlob(new Blob([bytes]),name)));}catch(e){out.textContent=e.message;}});
}

async function inspectSelected() {
  const item = selectedItems()[0] || items[0]; if(!item)return;
  const bytes = new Uint8Array(await item.file.slice(0,64).arrayBuffer());
  openPanel(`<div class="files-panel-head"><strong>Inspect file</strong><button id="closeFilesPanel" class="tb-toolbutton">Close</button></div><div class="files-result-list"><div class="files-result-item"><span>Name</span><code>${escapeHtml(item.displayName)}</code></div><div class="files-result-item"><span>Size</span><code>${formatBytes(item.file.size)} (${item.file.size} bytes)</code></div><div class="files-result-item"><span>Browser MIME</span><code>${escapeHtml(item.file.type||'unknown')}</code></div><div class="files-result-item"><span>Signature</span><code>${sniffFileType(bytes)}</code></div><div class="files-result-item"><span>Modified</span><code>${new Date(item.file.lastModified).toLocaleString()}</code></div></div><strong>First ${bytes.length} bytes</strong><code class="files-code">${toHexPreview(bytes)}</code>`); $('#closeFilesPanel').addEventListener('click',closePanel);
}

async function downloadSelectedFiles() {
  const targets=selectedOrAll();if(!targets.length)return;
  if(targets.length===1)return downloadBlob(targets[0].file,targets[0].displayName);
  setBusy(true,'Building ZIP…',0);try{await makeZip(targets,'toolbox-selected-files.zip');}finally{setBusy(false);}
}

function undo(){if(!history.canUndo())return;restoreNames(history.undo());}
function redo(){if(!history.canRedo())return;restoreNames(history.redo());}

drop.addEventListener('click',()=>picker.click());drop.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();picker.click();}});
for(const type of ['dragenter','dragover'])drop.addEventListener(type,event=>{event.preventDefault();drop.classList.add('drag');});for(const type of ['dragleave','drop'])drop.addEventListener(type,event=>{event.preventDefault();drop.classList.remove('drag');});drop.addEventListener('drop',event=>addFiles(event.dataTransfer.files));
picker.addEventListener('change',()=>{addFiles(picker.files);picker.value='';});folderPicker.addEventListener('change',()=>{addFiles(folderPicker.files);folderPicker.value='';});
$('#addFiles').addEventListener('click',()=>picker.click());$('#addFolder').addEventListener('click',()=>folderPicker.click());$('#clearFiles').addEventListener('click',clearAll);$('#selectAllFiles').addEventListener('click',()=>{items.forEach(x=>x.selected=true);render();});$('#selectNoneFiles').addEventListener('click',()=>{items.forEach(x=>x.selected=false);render();});
$('#renameFiles').addEventListener('click',showRename);$('#hashFiles').addEventListener('click',()=>runHashes(true));$('#findDuplicates').addEventListener('click',findDuplicateFiles);$('#archiveFiles').addEventListener('click',showArchive);$('#inspectFile').addEventListener('click',inspectSelected);$('#downloadFiles').addEventListener('click',downloadSelectedFiles);
$('#undoFiles').addEventListener('click',undo);$('#redoFiles').addEventListener('click',redo);$('#showFilesHistory').addEventListener('click',()=>{renderHistory();historyPanel.hidden=false;});$('#closeFilesHistory').addEventListener('click',()=>{historyPanel.hidden=true;});

render();
