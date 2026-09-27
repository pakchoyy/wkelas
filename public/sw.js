// Service worker BGY Wali Kelas. Data aplikasi tetap di IndexedDB perangkat.
const CACHE = 'bgy-walikelas-v3'
const NAV_TIMEOUT = 3000

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add('/')).then(() => self.skipWaiting()))
})
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
    .then(() => clients.claim()))
})

function store(request, response) {
  if (response.ok) {
    const copy = response.clone()
    caches.open(CACHE).then((cache) => cache.put(request, copy))
  }
  return response
}

// File ber-hash tidak pernah berubah isinya: ambil dari cache tanpa menunggu jaringan.
function cacheFirst(request) {
  return caches.match(request).then((cached) => cached || fetch(request).then((response) => store(request, response)))
}

// Halaman: coba jaringan sebentar agar versi baru terambil, lalu jatuh ke cache bila lambat/offline.
function networkFirst(request) {
  const network = fetch(request).then((response) => store('/', response))
  const timeout = new Promise((resolve) => setTimeout(resolve, NAV_TIMEOUT))
  return Promise.race([network, timeout.then(() => caches.match('/'))])
    .then((response) => response || network)
    .catch(() => caches.match('/'))
}

function staleWhileRevalidate(request) {
  const network = fetch(request).then((response) => store(request, response)).catch(() => undefined)
  return caches.match(request).then((cached) => cached || network.then((response) => response || caches.match('/')))
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/assets/')) event.respondWith(cacheFirst(request))
  else if (request.mode === 'navigate') event.respondWith(networkFirst(request))
  else event.respondWith(staleWhileRevalidate(request))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = new URL(event.notification.data?.url || '/', self.location.origin).href
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
    const open = windows.find((client) => new URL(client.url).origin === self.location.origin)
    if (open) return open.focus().then(() => open.navigate(target))
    return clients.openWindow(target)
  }))
})
