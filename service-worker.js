// service-worker.js
const CACHE_NAME = 'box-order-cache-v3';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.1.1/css/all.min.css' // Cache FontAwesome too
];

// Install event: Cache essential assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting(); // Activate worker immediately
});

// Activate event: Clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Clearing old cache', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  return self.clients.claim(); // Take control of pages immediately
});

// Fetch event: Serve from cache first, then network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        // Not in cache - fetch from network
        return fetch(event.request).then(
          networkResponse => {
            // Check if we received a valid response
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            // IMPORTANT: Clone the response. A response is a stream
            // and because we want the browser to consume the response
            // as well as the cache consuming the response, we need
            // to clone it so we have two streams.
            const responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                // Don't cache POST requests or non-essential files if needed
                 if (event.request.method === 'GET') {
                    cache.put(event.request, responseToCache);
                 }
              });

            return networkResponse;
          }
        ).catch(error => {
            console.error('Fetching failed:', error);
            // Optional: Return a fallback offline page here
        });
      })
  );
});
// *** ADDED Message Listener ***
self.addEventListener('message', (event) => {
    console.log("[SW] Message received:", event.data);
    if (event.data && event.data.action === 'checkForUpdate') {
        console.log("[SW] Checking for updates...");
        // Attempt to update the cache
        event.waitUntil(
            caches.open(CACHE_NAME)
            .then(cache => {
                // Re-fetch and cache all essential assets
                // addAll fetches AND caches. If any fetch fails, it rejects.
                return cache.addAll(urlsToCache);
            })
            .then(() => {
                console.log("[SW] Cache updated successfully.");
                // Send success message back to the client
                event.source.postMessage({ status: 'updateCheckComplete', success: true });
            })
            .catch(error => {
                console.error("[SW] Cache update failed:", error);
                // Send failure message back to the client
                event.source.postMessage({ status: 'updateCheckComplete', success: false, error: error.message });
            })
        );
    }
});