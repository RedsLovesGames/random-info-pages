const promises = new Map();

export function loadModuleOnce(key, url) {
  if (!key || !url) return Promise.reject(new Error('A loader key and URL are required.'));
  if (!promises.has(key)) promises.set(key, import(url));
  return promises.get(key);
}

export function loadScriptOnce(key, url, { integrity, crossOrigin = 'anonymous' } = {}) {
  if (!key || !url) return Promise.reject(new Error('A loader key and URL are required.'));
  if (promises.has(key)) return promises.get(key);
  if (typeof document === 'undefined') return Promise.reject(new Error('Script loading requires a browser document.'));

  const promise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-toolbox-loader="${CSS.escape(key)}"]`);
    if (existing?.dataset.loaded === 'true') return resolve(existing);
    const script = existing || document.createElement('script');
    script.src = url;
    script.async = true;
    script.dataset.toolboxLoader = key;
    if (integrity) {
      script.integrity = integrity;
      script.crossOrigin = crossOrigin;
    }
    script.addEventListener('load', () => {
      script.dataset.loaded = 'true';
      resolve(script);
    }, { once: true });
    script.addEventListener('error', () => {
      promises.delete(key);
      reject(new Error(`Failed to load ${key}.`));
    }, { once: true });
    if (!existing) document.head.append(script);
  });

  promises.set(key, promise);
  return promise;
}

export function forgetLoadedDependency(key) {
  promises.delete(key);
}

export function isDependencyPendingOrLoaded(key) {
  return promises.has(key);
}
