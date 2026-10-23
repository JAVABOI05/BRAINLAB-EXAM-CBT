// BrainLab Academy — PWA Service Worker (Low-Bandwidth & Offline Resilience)
// Optimized for Nigerian mobile network variability (3G/4G) and offline exam persistence.

const CACHE_NAME = "brainlab-pwa-v1.3";
const PRECACHE_ASSETS = [
  "/",
  "/resources",
  "/manifest.json",
  "/offline.html",
  "/favicon.svg",
  "/favicon-32x32.png",
  "/icon-192.png",
  "/brainlab-logo-light.svg",
  "/brainlab-mark.svg",
];

// Install: Cache essential shell and offline fallback
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(PRECACHE_ASSETS).catch((err) => {
          console.warn("[SW] Precache item failed to load:", err);
        });
      })
      .then(() => self.skipWaiting())
  );
});

// Activate: Clean up stale caches from earlier deployments
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME && name.startsWith("brainlab-"))
            .map((name) => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch: Strategy depending on request type
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only intercept GET requests
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  // Bypass API routes, Supabase endpoints, and auth/realtime traffic
  if (
    url.pathname.startsWith("/api/") ||
    url.hostname.includes("supabase.co") ||
    url.pathname.startsWith("/auth/")
  ) {
    return;
  }

  // 1. Static assets (JS chunks, CSS, fonts, icons) -> Cache-first with network fallback
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|woff|woff2|ttf|ico|css)$/i)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          return cached;
        }
        return fetch(request)
          .then((response) => {
            if (response && response.status === 200) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, clone);
              });
            }
            return response;
          })
          .catch(() => {
            // Return empty 404 response if asset cannot be fetched offline
            return new Response("", { status: 404, statusText: "Offline Not Found" });
          });
      })
    );
    return;
  }

  // 2. HTML navigation requests -> Network-first with cache fallback, then offline.html
  if (request.mode === "navigate" || request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clone);
            });
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) {
            return cached;
          }
          const offlinePage = await caches.match("/offline.html");
          if (offlinePage) {
            return offlinePage;
          }
          return new Response(
            "<html><body><h1>BrainLab Academy — Offline Mode</h1><p>You are currently offline. Please reconnect to continue.</p></body></html>",
            { headers: { "Content-Type": "text/html" } }
          );
        })
    );
    return;
  }

  // 3. All other requests: Network with cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        return new Response("Network offline", { status: 503, statusText: "Service Unavailable" });
      })
  );
});

// Listener for client messages
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
