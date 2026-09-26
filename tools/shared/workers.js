export function runWorkerTask(workerUrl, message, { signal, transfer = [] } = {}) {
  if (typeof Worker === 'undefined') return Promise.reject(new Error('Web Workers are not supported in this browser.'));
  return new Promise((resolve, reject) => {
    const worker = new Worker(workerUrl, { type: 'module' });
    const cleanup = () => {
      signal?.removeEventListener('abort', onAbort);
      worker.terminate();
    };
    const onAbort = () => {
      cleanup();
      reject(new DOMException('Operation cancelled.', 'AbortError'));
    };
    worker.onmessage = event => {
      cleanup();
      const payload = event.data;
      if (payload?.ok === false) reject(new Error(payload.error || 'Worker task failed.'));
      else resolve(payload?.result ?? payload);
    };
    worker.onerror = event => {
      cleanup();
      reject(event.error || new Error(event.message || 'Worker task failed.'));
    };
    if (signal?.aborted) return onAbort();
    signal?.addEventListener('abort', onAbort, { once: true });
    worker.postMessage(message, transfer);
  });
}
