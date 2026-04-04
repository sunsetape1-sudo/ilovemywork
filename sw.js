const CACHE_NAME = "shift-calendar-static-v29";
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./predictions.json",
  "./manifest.webmanifest",
  "./favicon-32.png",
  "./icon-180.png",
  "./icon-192.png",
  "./icon-512.png",
  "./images/flowers/camellia.jpg",
  "./images/flowers/crocus.jpg",
  "./images/flowers/tulip.jpg",
  "./images/flowers/iris.jpg",
  "./images/flowers/daisy.jpg",
  "./images/flowers/sunflower.jpg",
  "./images/flowers/chrysanthemum.jpg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => cached);

      return cached || networkFetch;
    })
  );
});
