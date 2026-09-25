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
