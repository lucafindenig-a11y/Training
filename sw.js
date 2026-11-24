// Service Worker: macht die App offline nutzbar (z. B. im Fitnessstudio ohne Netz).
// Strategie: App-Dateien sofort aus dem Cache liefern und im Hintergrund aktualisieren.
// Trainingsdaten laufen NIE über diesen Cache.

const CACHE = 'trainingsplan-202611240701';
const FILES = [
  './', './index.html', './manifest.webmanifest', './css/style.css',
  './js/main.js', './js/store.js', './js/model.js', './js/analytics.js', './js/dates.js', './js/format.js',
  './js/ui.js', './js/charts.js',
  './js/views/common.js', './js/views/today.js', './js/views/plan.js', './js/views/session.js',
  './js/views/history.js', './js/views/stats.js', './js/views/settings.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || url.pathname.endsWith('/api/data')) return;
  const key = req.mode === 'navigate' ? './index.html' : req;
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(key, { ignoreSearch: true });
      const update = fetch(req)
        .then((res) => {
          if (res.ok) cache.put(key, res.clone());
          return res;
        })
        .catch(() => null);
      if (cached) {
        e.waitUntil(update);
        return cached;
      }
      return (await update) ?? new Response('Offline – Datei nicht im Cache.', { status: 503 });
    }),
  );
});
