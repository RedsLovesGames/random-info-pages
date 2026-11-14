/* Keep Word Finder usable offline after one successful online visit. */
const VERSION = 'rip-word-finder-offline-v1';
const PREFIX = 'rip-word-finder-offline-';
const ROOT = new URL('./', self.location.href);
const ASSETS = [
  './',
  './index.html',
  './words.css',
  './words-app.js',
  './words-core.js',
  './dictionary-loader.js',
  './dictionaries/enable.txt',
  '../shared/toolbox.css',
  '../../design-system/rip.css',
  '../../design-system/project-polish.css',
  '../../design-system/rip.js'
].map(path => new URL(path, ROOT).href);

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(VERSION).then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key.startsWith(PREFIX) && key !== VERSION).map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (event.request.mode === 'navigate' && url.pathname.startsWith(ROOT.pathname)) {
    event.respondWith(fetch(event.request).catch(() =>
      caches.match(new URL('./index.html', ROOT).href)));
    return;
  }
  event.respondWith(
    caches.match(event.request).then(hit => hit || fetch(event.request))
  );
});
