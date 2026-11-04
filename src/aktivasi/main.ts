import './style.css'

// Kreacy mengganti {order} dan {sig} di link produk. Diteruskan ke aplikasi apa adanya;
// keabsahan tanda tangan dan "satu pesanan satu klaim" diperiksa server saat tombol Klaim ditekan.
const params = new URLSearchParams(window.location.search)
const order = params.get('order') || ''
const sig = params.get('sig') || ''
const $ = (id: string) => document.getElementById(id)!

if (/^[A-Za-z0-9_-]{1,80}$/.test(order) && /^[a-f0-9]{64}$/i.test(sig)) {
  $('claim').hidden = false
  $('info').hidden = true
  ;($('open') as HTMLAnchorElement).href = `/#/aktivasi?${new URLSearchParams({ order, sig: sig.toLowerCase() })}`
  history.replaceState(null, '', window.location.pathname)
}
