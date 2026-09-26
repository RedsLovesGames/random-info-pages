export const LARGE_FILE_WARNING_BYTES = 256 * 1024 * 1024;

export function formatBytes(bytes) {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  const amount = value / (1024 ** index);
  const rounded = index === 0 || amount >= 10 ? Math.round(amount) : Math.round(amount * 10) / 10;
  return `${rounded} ${units[index]}`;
}

export function safeFilename(name, fallback = 'download') {
  const cleaned = String(name || '')
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
    .replace(/[. ]+$/g, '');
  return cleaned || fallback;
}

export function totalFileBytes(files) {
  return [...(files || [])].reduce((sum, file) => sum + Math.max(0, Number(file?.size) || 0), 0);
}

export function isUnusuallyLargeFileJob(files, thresholdBytes = LARGE_FILE_WARNING_BYTES) {
  const threshold = Math.max(1, Number(thresholdBytes) || LARGE_FILE_WARNING_BYTES);
  return totalFileBytes(files) >= threshold;
}

export function confirmLargeFileJob(files, { thresholdBytes = LARGE_FILE_WARNING_BYTES, confirmFn = globalThis.confirm } = {}) {
  const total = totalFileBytes(files);
  if (total < Math.max(1, Number(thresholdBytes) || LARGE_FILE_WARNING_BYTES)) return true;
  if (typeof confirmFn !== 'function') return true;
  return Boolean(confirmFn(`This local job is ${formatBytes(total)}. Large browser jobs can use substantial memory or become slow. Continue processing on this device?`));
}

export function safeObjectUrl(blob) {
  if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
    throw new Error('Object URLs are not supported in this browser.');
  }
  const url = URL.createObjectURL(blob);
  return { url, revoke: () => URL.revokeObjectURL(url) };
}

export function downloadBlob(blob, filename = 'download') {
  if (typeof document === 'undefined') return false;
  const { url, revoke } = safeObjectUrl(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = safeFilename(filename);
  anchor.style.display = 'none';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(revoke, 0);
  return true;
}

export function pickLocalFiles({ accept = '', multiple = false, directory = false } = {}) {
  if (typeof document === 'undefined') return Promise.resolve([]);
  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.multiple = Boolean(multiple);
    if (directory) input.setAttribute('webkitdirectory', '');
    input.addEventListener('change', () => resolve([...input.files]), { once: true });
    input.click();
  });
}

function installLargeFileGuard() {
  if (typeof document === 'undefined' || document.documentElement?.dataset.toolboxLargeFileGuard === 'true') return;
  if (document.documentElement) document.documentElement.dataset.toolboxLargeFileGuard = 'true';
  document.addEventListener('change', event => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.type !== 'file' || !input.files?.length) return;
    const configured = Number(input.dataset.largeFileThreshold);
    const thresholdBytes = Number.isFinite(configured) && configured > 0 ? configured : LARGE_FILE_WARNING_BYTES;
    if (!isUnusuallyLargeFileJob(input.files, thresholdBytes)) return;
    if (confirmLargeFileJob(input.files, { thresholdBytes })) return;
    input.value = '';
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
}

installLargeFileGuard();
