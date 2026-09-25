import { artifactIdFromSearch, artifactText, clearExpiredArtifacts, getArtifact } from './artifacts.js';

async function loadIncomingArtifact() {
  const id = artifactIdFromSearch(location.search);
  if (!id) return;
  await clearExpiredArtifacts().catch(() => {});
  const artifact = await getArtifact(id);
  if (!artifact) {
    const status = document.querySelector('#textStatus, #developerStatus');
    if (status) status.textContent = 'Temporary Toolbox handoff expired or was cleared.';
    return;
  }

  const textInput = document.querySelector('#textInput');
  if (textInput) {
    textInput.value = await artifactText(artifact);
    textInput.dispatchEvent(new Event('input', { bubbles: true }));
    const status = document.querySelector('#textStatus');
    if (status) status.textContent = `Opened ${artifact.name || 'temporary text'} from ${artifact.sourceWorkspace || 'Toolbox'}.`;
    return;
  }

  const developerInput = document.querySelector('#developerInput');
  if (developerInput) {
    developerInput.value = await artifactText(artifact);
    developerInput.dispatchEvent(new Event('input', { bubbles: true }));
    const status = document.querySelector('#developerStatus');
    if (status) status.textContent = `Opened ${artifact.name || 'temporary data'} from ${artifact.sourceWorkspace || 'Toolbox'}.`;
    return;
  }

  const dataPicker = document.querySelector('#dataPicker');
  if (dataPicker && typeof DataTransfer !== 'undefined') {
    const payload = artifact.data instanceof Blob ? artifact.data : new Blob([await artifactText(artifact)], { type: artifact.type || 'application/json' });
    const name = artifact.name || (artifact.type?.includes('json') ? 'toolbox-handoff.json' : 'toolbox-handoff.txt');
    const file = new File([payload], name, { type: artifact.type || payload.type || 'application/octet-stream' });
    const transfer = new DataTransfer();
    transfer.items.add(file);
    dataPicker.files = transfer.files;
    dataPicker.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

loadIncomingArtifact().catch(error => {
  const status = document.querySelector('#textStatus, #developerStatus');
  if (status) status.textContent = `Could not open Toolbox handoff: ${error.message || error}`;
});
