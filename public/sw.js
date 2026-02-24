const CACHE_NAME = 'bps-static-v2';
const DATA_CACHE_NAME = 'bps-data-v2';

const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/dashboard.html',
    '/inventory.html',
    '/sellers.html',
    '/rts.html',
    '/sales.html',
    '/accounts.html',
    '/documents.html',
    '/settings.html',
    '/audit-log.html',
    '/reports.html',
    '/style.css',
    '/js/main.js',
    '/js/api.js',
    '/js/render.js',
    '/logo/Bicodo Postal Services Logo.png'
];

self.addEventListener('install', (event) => {
    self.skipWaiting(); // Force the new worker to take over immediately
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME && cacheName !== DATA_CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim(); // Take control of all pages immediately
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);

    // Bypass ping entirely
    if (url.searchParams.has('ping')) {
        event.respondWith(fetch(event.request));
        return;
    }

    // NETWORK FIRST STRATEGY (For both API and Static files)
    event.respondWith(
        fetch(event.request).then((networkResponse) => {
            // If the network request is successful, cache a fresh copy
            if (networkResponse && networkResponse.status === 200) {
                const cacheName = url.pathname.includes('/api/') ? DATA_CACHE_NAME : CACHE_NAME;
                caches.open(cacheName).then((cache) => {
                    cache.put(event.request, networkResponse.clone());
                });
            }
            return networkResponse;
        }).catch(async () => {
            // ONLY fallback to cache if the network COMPLETELY fails (Offline)
            const cachedResponse = await caches.match(event.request);
            if (cachedResponse) return cachedResponse;
            throw new Error("Network offline and no cache available.");
        })
    );
});