const CACHE_NAME = 'firecheck-v4';

const APP_SHELL = [
  './',
  './index.html',
  './header.html',
  './main.html',
  './footer.html',
  './style.css',
  './script.js',
  './manifest.json',
  './icon.svg',
  './lib/react.production.min.js',
  './lib/react-dom.production.min.js',
  './lib/babel.min.js',
  './lib/supabase.js',
  './lib/jspdf.umd.min.js',
  './lib/jspdf.plugin.autotable.min.js',
  'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap'
];

// Installazione: mette in cache l'app shell (best-effort, una risorsa che fallisce non blocca le altre)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => Promise.all(APP_SHELL.map((url) =>
        fetch(url, { mode: 'cors' }).then((res) => {
          if (res && res.ok) return cache.put(url, res);
        }).catch(() => {})
      )))
      .then(() => self.skipWaiting())
  );
});

// Attivazione: rimuove le vecchie cache
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Fetch: stale-while-revalidate — risponde dalla cache se disponibile e aggiorna in background
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Le chiamate API a Supabase non vanno mai servite dalla cache: devono sempre riflettere i dati più recenti
  if (event.request.url.includes('.supabase.co')) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.ok) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return networkResponse;
      }).catch(() => cached);

      return cached || fetchPromise;
    })
  );
});
