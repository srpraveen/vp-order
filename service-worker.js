// service-worker.js
const CACHE_NAME = 'box-order-cache-v4'; // Consider incrementing cache name if significant changes
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.2.0/css/all.min.css' // Updated to 6.2.0
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
            // For cross-origin requests (like CDN), networkResponse.type might be 'opaque',
            // in which case status is 0. Only cache 'basic' type responses (same-origin)
            // or if you explicitly want to cache opaque responses (though you can't inspect them).
            // The current check is fine for basic assets and successful CDN fetches (which are usually type 'cors' if server configured, or 'opaque').
            if (!networkResponse || networkResponse.status !== 200 /* || networkResponse.type !== 'basic' */) {
              // Allowing non-'basic' types to be cached if they are 200 OK, e.g., CDN resources.
              // If FontAwesome fetch resulted in an opaque response, it would still be cached if status was 0 but that's not typical for successful CDN.
              // If FontAwesome gives a proper CORS response, its type is 'cors' and status 200.
              return networkResponse;
            }

            const responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                 if (event.request.method === 'GET') { // Only cache GET requests
                    cache.put(event.request, responseToCache);
                 }
              });

            return networkResponse;
          }
        ).catch(error => {
            console.error('Fetching failed:', error);
            // Optional: Return a fallback offline page here for navigation requests
            // if (event.request.mode === 'navigate') {
            //   return caches.match('/offline.html'); // You'd need an offline.html cached
            // }
        });
      })
  );
});

self.addEventListener('message', (event) => {
    console.log("[SW] Message received:", event.data);
    if (event.data && event.data.action === 'checkForUpdate') {
        console.log("[SW] Checking for updates...");
        event.waitUntil(
            caches.open(CACHE_NAME)
            .then(cache => {
                // Attempt to re-fetch and cache all essential assets specified in urlsToCache.
                // cache.addAll() fetches and caches. If any fetch fails, the promise rejects.
                return cache.addAll(urlsToCache.map(url => new Request(url, {cache: 'reload'}))); // Force network fetch
            })
            .then(() => {
                console.log("[SW] Cache updated successfully.");
                // Send success message back to the client that initiated the check
                if (event.source) { // Check if event.source is available
                    event.source.postMessage({ status: 'updateCheckComplete', success: true });
                } else { // Fallback for older browsers or different contexts
                    self.clients.matchAll().then(clients => {
                        clients.forEach(client => client.postMessage({ status: 'updateCheckComplete', success: true }));
                    });
                }
            })
            .catch(error => {
                console.error("[SW] Cache update failed:", error);
                if (event.source) {
                    event.source.postMessage({ status: 'updateCheckComplete', success: false, error: error.message });
                } else {
                     self.clients.matchAll().then(clients => {
                        clients.forEach(client => client.postMessage({ status: 'updateCheckComplete', success: false, error: error.message }));
                    });
                }
            })
        );
    }
});