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

  for (const type of pointerEvents) {
    document.addEventListener(type, (event) => forwardEvent(type, event), { passive: true });
  }
  for (const type of keyboardEvents) {
    document.addEventListener(type, (event) => forwardEvent(type, event));
  }

  window.addEventListener('load', () => document.body.focus());
})();
