const MEDIABUNNY_ESM_URL = 'https://cdn.jsdelivr.net/npm/mediabunny@1.59.1/dist/bundles/mediabunny.mjs';

let modulePromise = null;

if (!window.Mediabunny) {
  const lazyModule = {
    then(resolve, reject) {
      if (!modulePromise) {
        modulePromise = import(MEDIABUNNY_ESM_URL).then(module => {
          window.Mediabunny = module;
          return module;
        }).catch(error => {
          modulePromise = null;
          if (window.Mediabunny === lazyModule) delete window.Mediabunny;
          throw new Error(`Could not load Media Studio conversion engine: ${error?.message || error}`);
        });
      }
      return modulePromise.then(resolve, reject);
    },
  };
  window.Mediabunny = lazyModule;
}
