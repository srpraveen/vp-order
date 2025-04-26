// service-worker.js

// Increment version number when you update assets
const CACHE_NAME = 'vp-order-cache-v1.0'; // Start with a clear version

// Define assets relative to the service worker's location (root)
const ASSETS_TO_CACHE = [
    './', // Cache the root (important for start_url='/')
    './index.html', // Explicitly cache index.html
    './style.css',
    './script.js',
    './manifest.json',
    './icons/icon-192x192.png', // Path relative to sw.js
    './icons/icon-512x512.png', // Path relative to sw.js
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.2.0/css/all.min.css' // Use the correct version from your HTML
];

// Install Service Worker - Cache core assets
self.addEventListener('install', (event) => {
    console.log('[SW] Install event - Cache Version:', CACHE_NAME);
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching core assets:', ASSETS_TO_CACHE);
                // Using individual add for debugging potential failures
                 const addPromises = ASSETS_TO_CACHE.map(url => {
                    return cache.add(url).catch(err => {
                        console.error(`[SW] Failed to cache ${url}:`, err);
                         // Optional: Fail install only for critical files
                         if (url.includes('index.html') || url.includes('script.js') || url.includes('style.css') || url.includes('manifest.json')) {
                            throw err;
                         }
                    });
                });
                return Promise.all(addPromises);
            })
            .then(() => {
                console.log('[SW] Installation successful, activating now.');
                return self.skipWaiting(); // Activate immediately
            })
            .catch(error => {
                console.error("[SW] Installation failed:", error);
                // Don't skip waiting if install failed
            })
    );
});

// Activate Service Worker - Clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activate event');
    event.waitUntil(
        Promise.all([
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('[SW] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            }),
            self.clients.claim() // Take control immediately
        ])
    );
});

// Fetch Events - Cache first strategy
self.addEventListener('fetch', (event) => {
    // console.log('[SW] Fetching:', event.request.url); // Can be noisy, enable for debug
    event.respondWith(
        caches.match(event.request) // Check the cache first
            .then((response) => {
                // Return response from cache if found, otherwise fetch from network
                return response || fetch(event.request);
            })
            // Optional: Basic offline fallback for navigation?
            // .catch(() => {
            //     // If fetch fails (network error) and it wasn't in cache
            //     if (event.request.mode === 'navigate') {
            //         return caches.match('./index.html'); // Fallback to cached index
            //     }
            //     // For other failed requests (like images offline), maybe return nothing or a placeholder
            // })
    );
});

// Listen for messages from the client (for update check)
self.addEventListener('message', (event) => {
    console.log("[SW] Message received:", event.data);
    if (event.data && event.data.action === 'checkForUpdate') {
        console.log("[SW] Update check requested via message...");
        event.waitUntil(
            caches.open(CACHE_NAME)
            .then(cache => {
                console.log("[SW] Attempting to re-cache assets for update:", ASSETS_TO_CACHE);
                // Re-fetch and cache assets. addAll will fetch everything.
                // If any fetch fails, it rejects.
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => {
                console.log("[SW] Update check successful (assets re-fetched/verified).");
                if (event.source) event.source.postMessage({ status: 'updateCheckComplete', success: true });
            })
            .catch(error => {
                console.error("[SW] Update check failed:", error);
                if (event.source) event.source.postMessage({ status: 'updateCheckComplete', success: false, error: error.message });
            })
        );
    } else if (event.data === 'SKIP_WAITING') { // Keep the skip waiting message if needed elsewhere
         console.log("[SW] SKIP_WAITING message received.");
         self.skipWaiting();
    }
});