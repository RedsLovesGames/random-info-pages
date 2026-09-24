(() => {
  const load = (src) => new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.append(script);
  });
  load('./runtime-3-core.js?v=20260924f')
    .then(() => load('./supabase-storage.js?v=20260924f'))
    .then(() => load('./name-identity.js?v=20260924f'))
    .then(() => load('./schedule.js?v=20260924f'))
    .then(() => load('./dynamic-colors.js?v=20260924f'))
    .then(() => load('./mobile-paint.js?v=20260924f'))
    .then(() => load('./ux-3456.js?v=20260924f'))
    .then(() => load('./ux-3456-ui.js?v=20260924f'))
    .then(() => load('./active-events.js?v=20260924f'))
    .catch((error) => console.error('WhenWeMeet runtime failed to load.', error));
})();
