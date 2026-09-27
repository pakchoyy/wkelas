// Service worker minimal BGY Wali Kelas: mempercepat kunjungan ulang dan
// memenuhi syarat install PWA. Data aplikasi tetap di IndexedDB perangkat.
const CACHE = 'bgy-walikelas-v2'
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add('/')).then(() => self.skipWaiting()))
})
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
    .then(() => clients.claim()))
})
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin) return
  event.respondWith(
    fetch(event.request).then((response) => {
      if (response.ok) {
        const copy = response.clone()
        caches.open(CACHE).then((cache) => cache.put(event.request, copy))
      }
      return response
    }).catch(() => caches.match(event.request).then((cached) => cached || caches.match('/')))
  )
})
