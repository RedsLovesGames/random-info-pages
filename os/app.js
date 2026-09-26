(() => {
  const pointerEvents = new Set(['mousemove', 'mousedown', 'mouseup']);
  const keyboardEvents = new Set(['keydown', 'keyup']);
  const status = document.getElementById('inputStatus');

  function forwardEvent(type, event) {
    let payload;
    if (pointerEvents.has(type)) {
      payload = { type, clientX: event.clientX, clientY: event.clientY };
    } else if (keyboardEvents.has(type)) {
      payload = { type, key: event.key };
    } else {
      return;
    }

    document.documentElement.dataset.lastEvent = type;
    if (status) status.value = `INPUT LINK: ${type.toUpperCase()}`;
    if (window.parent !== window) {
      parent.postMessage(payload, window.location.origin);
    }
  }

  document.addEventListener('mousemove', (event) => forwardEvent('mousemove', event), { passive: true });
  document.addEventListener('mousedown', (event) => forwardEvent('mousedown', event), { passive: true });
  document.addEventListener('mouseup', (event) => forwardEvent('mouseup', event), { passive: true });
  document.addEventListener('keydown', (event) => forwardEvent('keydown', event));
  document.addEventListener('keyup', (event) => forwardEvent('keyup', event));

  window.addEventListener('load', () => document.body.focus());
})();
