// ════════════════════════════════════════════════════════════
// SERVICE WORKER — Pemantauan Tenaga USM
// Versi cache — tukar bila ada update
// ════════════════════════════════════════════════════════════
const CACHE_NAME = 'tenaga-usm-v1';
const CACHE_URLS = [
  '/',
  '/index.html',
  'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@2.44.0/tabler-icons.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js',
  'https://cdnjs.cloudflare.com/ajax/libs/chartjs-plugin-datalabels/2.2.0/chartjs-plugin-datalabels.min.js'
];

// ── Install: cache semua aset penting ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Caching app shell');
      return cache.addAll(CACHE_URLS);
    }).catch(err => console.log('[SW] Cache error:', err))
  );
  self.skipWaiting();
});

// ── Activate: buang cache lama ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => {
              console.log('[SW] Deleting old cache:', key);
              return caches.delete(key);
            })
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: strategi Network First untuk data Google Sheets,
//           Cache First untuk aset statik ──
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Google Sheets API — sentiasa ambil dari network (data live)
  if (url.hostname.includes('docs.google.com') ||
      url.hostname.includes('script.google.com')) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({ ok: false, error: 'Tiada sambungan internet.' }),
          { headers: { 'Content-Type': 'application/json' } })
      )
    );
    return;
  }

  // Aset CDN & statik — Cache First
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Cache response baru untuk kegunaan offline
        if (response && response.status === 200 && response.type === 'basic') {
          const toCache = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, toCache));
        }
        return response;
      });
    }).catch(() => {
      // Offline fallback untuk halaman utama
      if (event.request.mode === 'navigate') {
        return caches.match('/index.html');
      }
    })
  );
});
