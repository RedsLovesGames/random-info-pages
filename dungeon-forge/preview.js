const preview = document.getElementById('dungeon-preview');
const title = document.getElementById('dname');
const status = document.getElementById('dungeon-preview-status');
const hints = document.getElementById('hints');
const canvasReady = () => Boolean(document.querySelector('canvas')) &&
  !['—', 'Generate a dungeon', ''].includes(title.textContent.trim());

const observer = new MutationObserver(() => {
  if (!canvasReady()) return;
  preview.hidden = true;
  hints.hidden = false;
  observer.disconnect();
  clearTimeout(timer);
});
observer.observe(document.body, { childList: true, subtree: true, characterData: true });
const timer = setTimeout(() => {
  if (!preview.hidden) {
    status.textContent = '3D rendering did not start. This image shows an example dungeon. Try reloading with hardware acceleration enabled.';
  }
}, 10000);
if (canvasReady()) {
  preview.hidden = true;
  hints.hidden = false;
  observer.disconnect();
  clearTimeout(timer);
}
