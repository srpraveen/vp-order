// service-worker.js

// *** Increment Cache Version ***
const CACHE_NAME = 'box-order-cache-v6'; // Changed from v5 to v6

// *** Carefully define URLs to cache, including relative and absolute paths ***
const urlsToCache = [
  // Relative paths often needed for scope root and start_url resolution
  './',
  './index.html',

  // Absolute paths from the domain root (important for GitHub Pages subdirectory)
  '/vp-order/', // The root of your repository deployment
  '/vp-order/index.html',
  '/vp-order/style.css',
  '/vp-order/script.js',
  '/vp-order/manifest.json', // Cache the manifest itself
  '/vp-order/icons/icon-192x192.png',
  '/vp-order/icons/icon-512x512.png',

  // External resources (ensure URL is correct)
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.1.1/css/all.min.css' // Matches user's version
];

// Install event - caches core assets using a more robust method
self.addEventListener('install', event => {
  console.log('[SW] Install event - Cache Version:', CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching core assets:', urlsToCache);
        // Use individual add requests for better debugging if addAll fails
        const addPromises = urlsToCache.map(url => {
          return cache.add(url).catch(err => {
            console.error(`[SW] Failed to cache ${url}:`, err);
            // Optional: Decide if install should fail if certain files are missing
            // Example: Fail if core app files are missing
            if (url.includes('index.html') || url.includes('script.js') || url.includes('style.css') || url.includes('manifest.json')) {
               console.error(`[SW] CRITICAL FAILURE: Cannot cache essential file ${url}. Install failed.`);
               throw err; // Make the install fail
            }
            // Don't fail install for non-essentials like icons or external fonts if they glitch
          });
        });
        return Promise.all(addPromises);
      })
      .then(() => {
          console.log("[SW] Core assets cached successfully. Activating immediately.");
          return self.skipWaiting(); // Activate new SW immediately
      })
      .catch(error => {
          // This catch will trigger if any promise rejection wasn't caught above (like critical files)
          console.error("[SW] Install failed overall:", error);
          // Don't call skipWaiting if install failed
      })
  );
});

// Activate event - cleans up old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activate event');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
        console.log("[SW] Claiming clients.");
        return self.clients.claim(); // Take control immediately
    })
  );
});

// Fetch event - Use Network falling back to Cache for HTML, Cache First for others
self.addEventListener('fetch', event => {
   // Check if it's a navigation request (for an HTML page)
   if (event.request.mode === 'navigate') {
       console.log('[SW] Fetch (navigate):', event.request.url);
       event.respondWith(
           fetch(event.request) // Try network first
           .then(networkResponse => {
               // Check if we received a valid response
               if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                   // If network response is bad, maybe try cache immediately? Or just return bad response.
                   console.log('[SW] Navigate: Bad network response, trying cache.', networkResponse);
                   return caches.match(event.request) || caches.match('/vp-order/index.html') || caches.match('./index.html'); // Fallback
               }
               // Optional: Cache the successful navigation response? Not usually done for app shell.
               return networkResponse;
           })
           .catch(() => {
               // Network request failed entirely (offline), try the cache
               console.log('[SW] Navigate: Network fetch failed, trying cache.');
               // Important to match against the exact cached HTML file URLs
               return caches.match(event.request) || caches.match('/vp-order/index.html') || caches.match('./index.html');
           })
       );
       return; // Don't execute further code for navigate requests
   }

   // For non-navigation requests (CSS, JS, images, fonts), use Cache First
   console.log('[SW] Fetch (asset):', event.request.url);
   event.respondWith(
       caches.match(event.request)
       .then(cachedResponse => {
           // Cache hit - return response
           if (cachedResponse) {
               // console.log('[SW] Asset found in cache:', event.request.url);
               return cachedResponse;
           }
           // Not in cache - fetch from network
           // console.log('[SW] Asset not in cache, fetching:', event.request.url);
           return fetch(event.request).then(
               networkResponse => {
                   // Optionally cache newly fetched assets here if desired,
                   // but the core assets should already be in cache from install.
                   // Be careful not to cache everything indefinitely.
                   // Example: Cache Font Awesome response
                   // if (event.request.url.includes('cdnjs.cloudflare.com')) {
                   //    const responseToCache = networkResponse.clone();
                   //    caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
                   // }
                   return networkResponse;
               }
           ).catch(error => {
                console.error('[SW] Asset fetch failed:', error);
                // Optionally return a placeholder for failed assets like images
           });
       })
   );
});


// Message Listener for Update Check
self.addEventListener('message', (event) => {
    console.log("[SW] Message received:", event.data);
    if (event.data && event.data.action === 'checkForUpdate') {
        console.log("[SW] Checking for updates via message...");
        event.waitUntil(
            caches.open(CACHE_NAME)
            .then(cache => {
                console.log("[SW] Re-caching assets for update check:", urlsToCache);
                // Still using addAll here for simplicity, assumes initial install handled errors.
                // Could be replaced with individual add() like in install if needed.
                return cache.addAll(urlsToCache);
            })
            .then(() => {
                console.log("[SW] Cache update check complete (assets re-fetched/verified).");
                if (event.source) {
                     event.source.postMessage({ status: 'updateCheckComplete', success: true });
                } else {
                     console.warn("[SW] event.source not available to post message back.");
                }
            })
            .catch(error => {
                console.error("[SW] Cache update check failed:", error);
                 if (event.source) {
                    event.source.postMessage({ status: 'updateCheckComplete', success: false, error: error.message });
                 } else {
                     console.warn("[SW] event.source not available to post message back (error).");
                 }
            })
        );
    }
});