import './style.css'

// Token klaim dibawa di hash (#t=...) agar tidak terkirim ke server mana pun lewat URL/referrer.
const token = new URLSearchParams(window.location.hash.slice(1)).get('t') || ''
const $ = (id: string) => document.getElementById(id)!

if (/^[a-f0-9]{64}$/.test(token)) {
  $('claim').hidden = false
  $('info').hidden = true
  ;($('open') as HTMLAnchorElement).href = `/#/aktivasi?${new URLSearchParams({ klaim: token })}`
  // Hapus token dari bilah alamat setelah dibaca.
  history.replaceState(null, '', window.location.pathname)
}
