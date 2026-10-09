// Service Worker for Expense Manager PWA & Web Push
const CACHE = 'ourhome-shell-v2';
const SHELL = ['/', '/manifest.webmanifest', '/icons/icon.svg', '/icons/icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Let API requests pass through without caching
  if (url.pathname.startsWith('/api/')) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (
          response.ok &&
          (request.destination === 'style' ||
            request.destination === 'script' ||
            request.destination === 'image' ||
            request.destination === 'font')
        ) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        if (request.mode === 'navigate') {
          const shellFallback = await caches.match('/');
          if (shellFallback) return shellFallback;
        }
        throw new Error('Offline asset unavailable');
      })
  );
});

// Helper: Sanitize navigation URL to same origin to prevent phishing redirects
function sanitizeTargetUrl(rawUrl) {
  try {
    const baseOrigin = self.location.origin;
    if (!rawUrl || typeof rawUrl !== 'string') {
      return `${baseOrigin}/home`;
    }
    const parsed = new URL(rawUrl, baseOrigin);
    // Disallow external domains
    if (parsed.origin !== baseOrigin) {
      return `${baseOrigin}/home`;
    }
    return parsed.href;
  } catch {
    return `${self.location.origin}/home`;
  }
}

// ---------------------------------------------------------------------------
// PUSH EVENT HANDLER
// ---------------------------------------------------------------------------
self.addEventListener('push', (event) => {
  let payload = {
    title: 'Expense Manager',
    body: 'There is a new update in your household.',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon.svg',
    url: '/home',
    data: {},
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      payload = {
        ...payload,
        ...parsed,
        data: {
          ...(payload.data || {}),
          ...(parsed.data || {}),
          url: parsed.url || parsed.data?.url || payload.url,
        },
      };
    } catch {
      const text = event.data.text();
      if (text) {
        payload.body = text;
      }
    }
  }

  const sanitizedUrl = sanitizeTargetUrl(payload.url || payload.data?.url);

  const notificationOptions = {
    body: payload.body,
    icon: payload.icon || '/icons/icon-192.png',
    badge: payload.badge || '/icons/icon.svg',
    image: payload.image || undefined,
    tag: payload.tag || undefined,
    renotify: Boolean(payload.renotify),
    silent: Boolean(payload.silent),
    requireInteraction: Boolean(payload.requireInteraction),
    data: {
      ...payload.data,
      url: sanitizedUrl,
      timestamp: Date.now(),
    },
  };

  event.waitUntil(
    self.registration.showNotification(payload.title || 'Expense Manager', notificationOptions)
  );
});

// ---------------------------------------------------------------------------
// NOTIFICATION CLICK HANDLER
// ---------------------------------------------------------------------------
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const rawUrl = event.notification.data?.url;
  const targetUrl = sanitizeTargetUrl(rawUrl);

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Check if there is already a window open on our origin
        for (const client of windowClients) {
          if ('focus' in client) {
            // If the client is already on the target URL or nearby, focus it and optionally navigate
            if (client.url === targetUrl && 'focus' in client) {
              return client.focus();
            }
            if ('navigate' in client) {
              return client.navigate(targetUrl).then((navigated) => (navigated ? navigated.focus() : client.focus()));
            }
            return client.focus();
          }
        }
        // If no matching tab is open, open a new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
