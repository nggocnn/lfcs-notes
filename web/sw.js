const CACHE = "lfcs-__BUILD__";
const ASSETS = [
  "./", "index.html", "app.js?v=__BUILD__", "style.css?v=__BUILD__", "data.json",
  "manifest.webmanifest", "icon.svg", "icon-180.png", "icon-192.png", "icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS.map((a) => new Request(a, { cache: "reload" })))));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("lfcs-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Pages and data: network first (fresh after a push), cache when offline or slow.
// Versioned assets (?v=build) and icons: cache first.
function networkFirst(req, key) {
  const net = fetch(req).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(key, copy)); }
    return res;
  });
  const timeout = new Promise((resolve) => setTimeout(resolve, 3000));
  return Promise.race([net, timeout.then(() => caches.match(key))])
    .then((res) => res || net)
    .catch(() => caches.match(key));
}

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  if (e.request.mode === "navigate") return e.respondWith(networkFirst(e.request, "index.html"));
  if (url.pathname.endsWith("/data.json")) return e.respondWith(networkFirst(e.request, "data.json"));
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
      return res;
    }))
  );
});
