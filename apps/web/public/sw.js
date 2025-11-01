// Advanced Service Worker for PWA functionality with enhanced caching
const DEBUG = false; // set to true for verbose logging
const CACHE_VERSION = 'filler-v2.0.1';
const STATIC_CACHE = 'filler-static-v2.0.1';
const DYNAMIC_CACHE = 'filler-dynamic-v2.0.1';
const API_CACHE = 'filler-api-v2.0.1';
const IMAGE_CACHE = 'filler-images-v2.0.1';
const IS_DEV = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';

// Cache configuration
const CACHE_CONFIG = {
  STATIC_MAX_AGE: 31536000, // 1 year
  DYNAMIC_MAX_AGE: 86400,   // 1 day
  API_MAX_AGE: 300,         // 5 minutes
  IMAGE_MAX_AGE: 604800,    // 1 week
  MAX_ENTRIES: 100
};

// Static assets to cache
const STATIC_ASSETS = [
  '/',
  '/sklep',
  '/koszyk',
  '/moje-konto',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/images/placeholder-product.jpg'
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/woocommerce?endpoint=products',
  '/api/woocommerce?endpoint=categories',
  '/api/health'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  DEBUG && console.log('[SW] Installing Service Worker');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        DEBUG && console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        DEBUG && console.log('[SW] Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        DEBUG && console.error('[SW] Failed to cache static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  DEBUG && console.log('[SW] Activating Service Worker');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (
              cacheName !== STATIC_CACHE &&
              cacheName !== DYNAMIC_CACHE &&
              cacheName !== API_CACHE &&
              cacheName !== IMAGE_CACHE
            ) {
              DEBUG && console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        DEBUG && console.log('[SW] Service Worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // In development, don't intercept requests at all (avoid dev noise and caching HMR chunks)
  if (IS_DEV) {
    return;
  }

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Handle API requests with advanced cache strategy
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(apiCacheStrategy(request));
    return;
  }

  // Handle images with advanced caching
  if (url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) {
    event.respondWith(imageCacheStrategy(request));
    return;
  }

  // Handle static assets with cache-first strategy
  if (url.pathname.startsWith('/_next/static/') || 
      url.pathname.startsWith('/icons/') ||
      url.pathname.endsWith('.css') ||
      url.pathname.endsWith('.js')) {
    
    event.respondWith(staticCacheStrategy(request));
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
        DEBUG && console.log('[SW] Network failed, trying cache:', url.pathname);
        
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
  DEBUG && console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Handle offline actions when connection is restored
      handleBackgroundSync()
    );
  }
});

// Push notification handling
self.addEventListener('push', (event) => {
  DEBUG && console.log('[SW] Push notification received');
  
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
  DEBUG && console.log('[SW] Notification clicked:', event.notification.tag);
  
  event.notification.close();
  
  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow(event.notification.data.url || '/')
    );
  }
});

// Advanced cache strategies
async function apiCacheStrategy(request) {
  const cache = await caches.open(API_CACHE);
  const cached = await cache.match(request);
  
  // Check if cached response is still valid
  if (cached) {
    const cacheDate = new Date(cached.headers.get('sw-cache-date'));
    const now = new Date();
    const age = (now.getTime() - cacheDate.getTime()) / 1000;
    
    if (age < CACHE_CONFIG.API_MAX_AGE) {
      DEBUG && console.log('[SW] Serving API from cache:', request.url);
      // Return a clone to avoid locked body issues when the same Response
      // instance is used by multiple consumers (Chrome safety)
      return cached.clone();
    }
  }
  
  try {
    const response = await fetch(request);
    if (response.status === 200) {
      // Clone for cache and append sw-cache-date header safely
      const cacheClone = response.clone();
      const headers = new Headers(cacheClone.headers);
      headers.set('sw-cache-date', new Date().toISOString());
      const bodyForCache = await cacheClone.blob();
      await cache.put(request, new Response(bodyForCache, { status: response.status, statusText: response.statusText, headers }));
      
      // Cleanup old entries
      cleanupCache(cache, CACHE_CONFIG.MAX_ENTRIES);
      DEBUG && console.log('[SW] Cached API response:', request.url);
    }
    return response;
  } catch (error) {
    DEBUG && console.error('[SW] API request failed:', error);
    return cached || new Response(
      JSON.stringify({ error: 'Network unavailable' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function imageCacheStrategy(request) {
  const cache = await caches.open(IMAGE_CACHE);
  const cached = await cache.match(request);
  
  if (cached) {
    DEBUG && console.log('[SW] Serving image from cache:', request.url);
    return cached;
  }
  
  try {
    const response = await fetch(request);
    if (response.status === 200) {
      cache.put(request, response.clone());
      cleanupCache(cache, CACHE_CONFIG.MAX_ENTRIES);
      DEBUG && console.log('[SW] Cached image:', request.url);
    }
    return response;
  } catch (error) {
    DEBUG && console.error('[SW] Image request failed:', error);
    // Return placeholder image for offline
    return cache.match('/images/placeholder-product.jpg') || new Response('Image Offline', { status: 503 });
  }
}

async function staticCacheStrategy(request) {
  const cached = await caches.match(request);
  
  if (cached) {
    DEBUG && console.log('[SW] Serving static asset from cache:', request.url);
    return cached;
  }
  
  try {
    const response = await fetch(request);
    if (response.status === 200) {
      const responseToCache = response.clone();
      caches.open(STATIC_CACHE)
        .then((cache) => cache.put(request, responseToCache));
    }
    return response;
  } catch (error) {
    DEBUG && console.error('[SW] Static asset request failed:', error);
    return new Response('Static Resource Offline', { status: 503 });
  }
}

// Cache cleanup utility
async function cleanupCache(cache, maxEntries) {
  const keys = await cache.keys();
  if (keys.length > maxEntries) {
    const keysToDelete = keys.slice(0, keys.length - maxEntries);
    await Promise.all(keysToDelete.map(key => cache.delete(key)));
  }
}

// Helper function for background sync
async function handleBackgroundSync() {
  try {
    // Sync offline cart items
    await syncOfflineCart();
    
    // Sync offline favorites
    await syncOfflineFavorites();
    
  DEBUG && console.log('[SW] Background sync completed');
  } catch (error) {
  DEBUG && console.error('[SW] Background sync failed:', error);
  }
}

// Sync offline cart items
async function syncOfflineCart() {
  // Implementation for syncing offline cart items
  DEBUG && console.log('[SW] Syncing offline cart items');
}

// Sync offline favorites
async function syncOfflineFavorites() {
  // Implementation for syncing offline favorites
  DEBUG && console.log('[SW] Syncing offline favorites');
}
