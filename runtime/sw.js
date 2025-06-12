self.addEventListener('install', e => {
  e.waitUntil(caches.open('soulfra-os').then(c => c.addAll(['./os_ui.html'])));
});
self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
