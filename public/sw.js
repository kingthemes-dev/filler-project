// Service Worker for aggressive caching
const CACHE_NAME = 'filler-cache-v1';
const STATIC_CACHE = 'filler-static-v1';
const API_CACHE = 'filler-api-v1';

// Cache strategies
const CACHE_STRATEGIES = {
  // Static assets - cache first
  static: ['/', '/sklep', '/kontakt', '/o-nas', '/moje-konto'],
  // API calls - network first with cache fallback
  api: ['/api/woocommerce'],
  // Images - cache first
  images: ['/wp-content/uploads/']
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('SW: Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll([
        '/',
        '/sklep',
        '/kontakt',
        '/o-nas',
        '/moje-konto',
        '/manifest.json'
      ]);
    })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('SW: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE && cacheName !== API_CACHE) {
            console.log('SW: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // API calls - Network First with Cache Fallback
  if (url.pathname.startsWith('/api/woocommerce')) {
    event.respondWith(networkFirstStrategy(request, API_CACHE));
    return;
  }

  // Images - Cache First
  if (url.hostname.includes('qvwltjhdjw.cfolks.pl') && url.pathname.includes('/wp-content/uploads/')) {
    event.respondWith(cacheFirstStrategy(request, CACHE_NAME));
    return;
  }

  // Static pages - Cache First
  if (url.pathname === '/' || url.pathname.startsWith('/sklep') || url.pathname.startsWith('/kontakt') || url.pathname.startsWith('/o-nas') || url.pathname.startsWith('/moje-konto')) {
    event.respondWith(cacheFirstStrategy(request, STATIC_CACHE));
    return;
  }

  // Other requests - Network First
  event.respondWith(networkFirstStrategy(request, CACHE_NAME));
});

// Cache First Strategy
async function cacheFirstStrategy(request, cacheName) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('SW: Serving from cache:', request.url);
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
      console.log('SW: Cached:', request.url);
    }
    return networkResponse;
  } catch (error) {
    console.log('SW: Cache first failed:', error);
    return new Response('Offline', { status: 503 });
  }
}

// Network First Strategy
async function networkFirstStrategy(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok && networkResponse.status !== 206) {
      // Don't cache partial responses (206) or video files
      if (!request.url.includes('.webm') && !request.url.includes('.mp4')) {
        const cache = await caches.open(cacheName);
        cache.put(request, networkResponse.clone());
        console.log('SW: Network first - cached:', request.url);
      }
    }
    return networkResponse;
  } catch (error) {
    console.log('SW: Network failed, trying cache:', request.url);
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('SW: Serving from cache (network failed):', request.url);
      return cachedResponse;
    }
    return new Response('Offline', { status: 503 });
  }
}

// Background sync for failed requests
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Retry failed API calls
  console.log('SW: Background sync triggered');
}
