// Pengaman: bila CSS gagal dimuat (cache lama menunjuk file versi lama), bersihkan cache lalu muat ulang sekali.
window.addEventListener('load', function () {
  var ok = Array.prototype.some.call(document.styleSheets, function (s) {
    try { return !!(s.href && s.href.indexOf('/assets/') > -1 && s.cssRules && s.cssRules.length) } catch (e) { return false }
  })
  if (ok) { try { sessionStorage.removeItem('bgy-css-retry') } catch (e) {} return }
  try { if (sessionStorage.getItem('bgy-css-retry')) return; sessionStorage.setItem('bgy-css-retry', '1') } catch (e) { return }
  var done = function () { location.reload() }
  if (window.caches && caches.keys) caches.keys().then(function (keys) { return Promise.all(keys.map(function (k) { return caches.delete(k) })) }).then(done, done)
  else done()
})
