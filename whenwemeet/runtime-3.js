(() => {
  const load = (src) => new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.append(script);
  });
  load('./runtime-3-core.js?v=20260924')
    .then(() => load('./schedule.js?v=20260924'))
    .catch((error) => console.error('WhenWeMeet runtime failed to load.', error));
})();
