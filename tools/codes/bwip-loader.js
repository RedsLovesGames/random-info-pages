let pending;

export function loadBwip() {
  if (window.bwipjs?.toCanvas) return Promise.resolve(window.bwipjs);
  if (!pending) {
    pending = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/bwip-js@4.11.4/dist/bwip-js-min.js';
      script.crossOrigin = 'anonymous';
      script.onload = () => {
        if (window.bwipjs?.toCanvas) resolve(window.bwipjs);
        else reject(new Error('The code renderer did not initialize.'));
      };
      script.onerror = () => {
        script.remove();
        reject(new Error('The code renderer could not load.'));
      };
      document.head.append(script);
    }).catch(error => {
      pending = null;
      throw error;
    });
  }
  return pending;
}
