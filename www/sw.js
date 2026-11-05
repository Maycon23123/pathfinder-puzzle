/* Service worker: guarda os arquivos do jogo para funcionar offline (PWA).
   Ao alterar qualquer arquivo, aumente CACHE_VERSION para forçar a atualização. */
var CACHE_VERSION = "pathfinder-v0.1.0";
var FILES = [
  "./", "index.html", "manifest.webmanifest", "css/style.css",
  "js/config.js", "js/storage.js", "js/audio.js", "js/geometry.js", "js/level.js",
  "js/background.js", "js/help.js", "js/game.js", "js/app.js",
  "fonts/poppins-latin-400-normal.woff2", "fonts/poppins-latin-500-normal.woff2",
  "fonts/poppins-latin-600-normal.woff2", "fonts/poppins-latin-700-normal.woff2",
  "icons/icon-192.png", "icons/icon-512.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE_VERSION).then(function (c) { return c.addAll(FILES); }));
  self.skipWaiting();
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE_VERSION; })
                           .map(function (k) { return caches.delete(k); }));
  }));
  self.clients.claim();
});

self.addEventListener("fetch", function (e) {
  e.respondWith(caches.match(e.request).then(function (hit) { return hit || fetch(e.request); }));
});
