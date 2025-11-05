const CACHE_NAME = 'spy-cache-v6';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

// ახალი ვერსიის შემოწმების ფუნქცია
function isNewVersionAvailable() {
  return fetch('/index.html')
    .then(response => response.text())
    .then(newHtml => {
      return caches.match('/index.html')
        .then(cachedResponse => cachedResponse.text())
        .then(cachedHtml => cachedHtml !== newHtml);
    })
    .catch(() => false);
}

// --- Install Event ---
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .catch(err => {
        console.error('Failed to cache resources:', err);
      })
  );
});

// --- Activate Event ---
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all([
        // ძველი ქეშების წაშლა
        ...cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        }),
        // ახალი ვერსიის შემოწმება
        isNewVersionAvailable().then(hasNewVersion => {
          if (hasNewVersion) {
            console.log('New version detected, clearing cache');
            return caches.delete(CACHE_NAME);
          }
        })
      ]);
    }).then(() => {
      self.clients.claim();
    })
  );
});

// --- Fetch Event ---
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return cache.match(event.request).then(cachedResponse => {
        const fetchPromise = fetch(event.request).then(networkResponse => {
          if (networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      });
    })
  );
});