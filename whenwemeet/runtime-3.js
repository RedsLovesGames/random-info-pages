(() => {
  const load = (src) => new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.append(script);
  });
  load('./runtime-3-core.js?v=20260924c')
    .then(() => load('./supabase-storage.js?v=20260924c'))
    .then(() => load('./name-identity.js?v=20260924c'))
    .then(() => load('./schedule.js?v=20260924c'))
    .then(() => load('./dynamic-colors.js?v=20260924c'))
    .catch((error) => console.error('WhenWeMeet runtime failed to load.', error));
})();
