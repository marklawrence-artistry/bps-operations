const CACHE_NAME = 'bps-static-v1';
const DATA_CACHE_NAME = 'bps-data-v1';

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
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Service Worker] Caching static assets');
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
                        console.log('[Service Worker] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);

    // FIX 1: ALWAYS bypass the cache for health/ping checks
    if (url.searchParams.has('ping')) {
        event.respondWith(fetch(event.request));
        return;
    }

    // 1. API DATA: Network First -> Cache Fallback
    if (url.pathname.includes('/api/')) {
        event.respondWith(
            caches.open(DATA_CACHE_NAME).then(async (cache) => {
                try {
                    const networkResponse = await fetch(event.request);
                    // Only cache successful responses
                    if (networkResponse.status === 200) {
                        cache.put(event.request, networkResponse.clone());
                    }
                    return networkResponse;
                } catch (error) {
                    const cachedResponse = await cache.match(event.request);
                    if (cachedResponse) return cachedResponse;
                    throw error;
                }
            })
        );
        return;
    }

    // 2. STATIC FILES: Cache First -> Network
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});