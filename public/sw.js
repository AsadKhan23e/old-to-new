self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
    // Pass-through fetch handler is required for PWA installation criteria.
    // It allows the app to load from cache or network normally.
    event.respondWith(
        fetch(event.request).catch((err) => {
            // Offline fallback can be handled here if needed.
            return new Response("Offline mode active.");
        })
    );
});
