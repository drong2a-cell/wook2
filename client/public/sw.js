// Service Worker for 우리만의 공간 - Couple App
const CACHE_NAME = 'couple-app-v1';
const IMAGE_CACHE_NAME = 'couple-app-images-v1';

// Core assets to cache on install
const CORE_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// Install: cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== IMAGE_CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: network-first for API, cache-first for images
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // API requests: network only (no cache)
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Image requests (manus-storage): cache-first
  if (url.pathname.startsWith('/manus-storage/') || request.destination === 'image') {
    event.respondWith(
      caches.open(IMAGE_CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        
        try {
          const response = await fetch(request);
          if (response.ok && response.status === 200) {
            // Only cache same-origin or manus-storage images
            if (url.origin === self.location.origin || url.pathname.startsWith('/manus-storage/')) {
              cache.put(request, response.clone());
            }
          }
          return response;
        } catch {
          return new Response('', { status: 503 });
        }
      })
    );
    return;
  }

  // Navigation requests: network-first, fallback to cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match('/').then((cached) => cached || new Response('Offline', { status: 503 })))
    );
    return;
  }

  // Static assets: stale-while-revalidate
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      const fetchPromise = fetch(request).then((response) => {
        if (response.ok) cache.put(request, response.clone());
        return response;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

// Background sync for offline messages (future enhancement)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-messages') {
    // Handle background sync
    console.log('[SW] Background sync: messages');
  }
});

// Push notifications - 기념일, 메시지, 펫 알림
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: '우리만의 공간', body: event.data.text() };
  }

  // 타입별 제목 설정
  let title = data.title || '우리만의 공간 💕';
  if (data.type === 'anniversary') {
    title = '🎉 기념일 알림';
  } else if (data.type === 'message') {
    title = '💬 새 메시지';
  } else if (data.type === 'pet') {
    title = '🐾 펫 알림';
  }

  const notificationOptions = {
    body: data.body || '새로운 알림이 있어요!',
    icon: '/pwa-icon-192.png',
    badge: '/pwa-icon-192.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/', type: data.type || 'general' },
    tag: data.tag || 'couple-app-notification',
    requireInteraction: data.type === 'anniversary' || data.type === 'message',
    actions: [
      { action: 'open', title: '열기' },
      { action: 'close', title: '닫기' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(title, notificationOptions)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'close') return;
  
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
