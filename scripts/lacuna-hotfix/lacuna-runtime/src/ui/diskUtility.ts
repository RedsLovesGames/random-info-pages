import { compareSnapshotSources } from '../../../win95-overrides/src/arg/engine/finale.js';
import { ArgRuntimeStore } from '../state.js';
import { createWindow, escapeHtml } from './windowing.js';

export async function openDiskUtility(store: ArgRuntimeStore): Promise<void> {
  await store.event({ type: 'app-opened', target: 'disk-image-utility' });
  const ui = createWindow({ key: 'disk-image-utility', title: 'Disk Image Utility', icon: '💾', width: 650, height: 470 });
  const render = (): void => {
    const mounted = store.snapshot.filesystem.mountedVolumeIds.includes('historical-ws03');
    ui.body.innerHTML = `<div class="lac-menubar"><span>File</span><span>Image</span><span>Tools</span><span>Help</span></div><section class="lac-disk"><h2>LACUNA-WS03.img</h2><dl><dt>Source</dt><dd>C:\\Archive\\Images\\LACUNA-WS03.img</dd><dt>Snapshot</dt><dd>1999-04-20</dd><dt>Mode</dt><dd>Read-only</dd><dt>Status</dt><dd>${mounted ? 'Mounted as D:\\' : 'Not mounted'}</dd></dl><p><button type="button" data-mount ${mounted ? 'disabled' : ''}>${mounted ? 'Mounted' : 'Mount Image'}</button> <button type="button" data-compare ${mounted ? '' : 'disabled'}>Compare Sources</button></p><div data-results></div></section>`;
    ui.body.querySelector<HTMLButtonElement>('[data-mount]')?.addEventListener('click', async () => { await store.mountHistorical(); render(); });
    ui.body.querySelector<HTMLButtonElement>('[data-compare]')?.addEventListener('click', async () => {
      await store.event({ type: 'evidence-compared', target: 'historical-ws03' });
      const comparison = compareSnapshotSources();
      const results = ui.body.querySelector<HTMLElement>('[data-results]')!;
      results.innerHTML = `<h3>Source comparison</h3><p class="lac-disk-summary">${escapeHtml(comparison.interpretation)}</p><div class="lac-disk-compare-grid"><section class="lac-disk-compare-group"><h4>Corroborated</h4><ul>${comparison.corroborated.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></section><section class="lac-disk-compare-group"><h4>Later / not independently present</h4><ul>${comparison.laterAdditions.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></section></div>`;
      ui.status.textContent = 'Comparison complete • current C: vs read-only historical D:';
    });
    ui.status.textContent = mounted ? 'D:\ mounted read-only' : 'Image ready';
  };
  render();
}
