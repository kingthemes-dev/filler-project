// Service Worker for PWA functionality
const CACHE_NAME = 'filler-v1.0.0';
const STATIC_CACHE = 'filler-static-v1.0.0';
const DYNAMIC_CACHE = 'filler-dynamic-v1.0.0';

// Static assets to cache
const STATIC_ASSETS = [
  '/',
  '/sklep',
  '/koszyk',
  '/moje-konto',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/woocommerce?endpoint=products',
  '/api/woocommerce?endpoint=categories',
  '/api/health'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service Worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Handle API requests with cache-first strategy
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      caches.open(DYNAMIC_CACHE)
        .then((cache) => {
          return cache.match(request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                console.log('[SW] Serving API from cache:', url.pathname);
                return cachedResponse;
              }

              return fetch(request)
                .then((networkResponse) => {
                  // Clone the response before caching
                  const responseToCache = networkResponse.clone();
                  
                  // Cache successful responses
                  if (networkResponse.status === 200) {
                    cache.put(request, responseToCache);
                    console.log('[SW] Cached API response:', url.pathname);
                  }
                  
                  return networkResponse;
                })
                .catch((error) => {
                  console.error('[SW] Network request failed:', error);
                  // Return cached response if available
                  return cachedResponse || new Response(
                    JSON.stringify({ error: 'Network unavailable' }),
                    { status: 503, headers: { 'Content-Type': 'application/json' } }
                  );
                });
            });
        })
    );
    return;
  }

  // Handle static assets with cache-first strategy
  if (url.pathname.startsWith('/_next/static/') || 
      url.pathname.startsWith('/icons/') ||
      url.pathname.endsWith('.css') ||
      url.pathname.endsWith('.js')) {
    
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            console.log('[SW] Serving static asset from cache:', url.pathname);
            return cachedResponse;
          }

          return fetch(request)
            .then((networkResponse) => {
              const responseToCache = networkResponse.clone();
              caches.open(STATIC_CACHE)
                .then((cache) => cache.put(request, responseToCache));
              
              return networkResponse;
            });
        })
    );
    return;
  }

  // Handle page requests with network-first strategy
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        // Cache successful page responses
        if (networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(DYNAMIC_CACHE)
            .then((cache) => cache.put(request, responseToCache));
        }
        
        return networkResponse;
      })
      .catch((error) => {
        console.log('[SW] Network failed, trying cache:', url.pathname);
        
        return caches.match(request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            
            // Return offline page for navigation requests
            if (request.mode === 'navigate') {
              return caches.match('/offline.html');
            }
            
            // Return generic error for other requests
            return new Response('Offline', { status: 503 });
          });
      })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Handle offline actions when connection is restored
      handleBackgroundSync()
    );
  }
});

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body || 'Nowa wiadomość z Filler.pl',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
      tag: data.tag || 'default',
      data: data.data || {},
      actions: data.actions || [],
      requireInteraction: data.requireInteraction || false,
      silent: data.silent || false
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'Filler.pl', options)
    );
  }
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification.tag);
  
  event.notification.close();
  
  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow(event.notification.data.url || '/')
    );
  }
});

// Helper function for background sync
async function handleBackgroundSync() {
  try {
    // Sync offline cart items
    await syncOfflineCart();
    
    // Sync offline favorites
    await syncOfflineFavorites();
    
    console.log('[SW] Background sync completed');
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// Sync offline cart items
async function syncOfflineCart() {
  // Implementation for syncing offline cart items
  console.log('[SW] Syncing offline cart items');
}

// Sync offline favorites
async function syncOfflineFavorites() {
  // Implementation for syncing offline favorites
  console.log('[SW] Syncing offline favorites');
}
