// ════════════════════════════════════════════════════════════
// SERVICE WORKER — Pemantauan Tenaga USM
// Versi cache — tukar nombor ini bila ada update fail
// ════════════════════════════════════════════════════════════
const CACHE_NAME = 'tenaga-usm-v2';

// Guna path relatif supaya berfungsi dalam mana-mana subfolder
const CACHE_URLS = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@2.44.0/tabler-icons.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js',
  'https://cdnjs.cloudflare.com/ajax/libs/chartjs-plugin-datalabels/2.2.0/chartjs-plugin-datalabels.min.js'
];

// ── Install: cache semua aset penting ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CACHE_URLS))
      .catch(err => console.log('[SW] Cache error (ok to ignore):', err))
  );
  self.skipWaiting();
});

// ── Activate: buang cache lama ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch ──
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Google Sheets & Apps Script — sentiasa dari network
  if (url.hostname.includes('docs.google.com') ||
      url.hostname.includes('script.google.com')) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response('{"ok":false,"error":"Tiada internet"}',
          { headers: { 'Content-Type': 'application/json' } })
      )
    );
    return;
  }

  // Semua lain — Cache First, fallback to network
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return response;
      });
    }).catch(() => caches.match('./index.html'))
  );
});
