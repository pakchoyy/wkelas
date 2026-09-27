import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'
import { clearInstallPrompt, installPlatform, installPrompt, onInstallChange } from '../pwa-install'

// Versi 2: penanda lama ikut terpasang saat guru hanya membuat shortcut, jadi diabaikan.
const FLAG = 'bgy-pwa-installed-v2'
const MANUAL_DELAY = 4000
const SESSION_KEY = 'bgy-pwa-dismissed-session'

const standalone = () => window.matchMedia('(display-mode: standalone)').matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true
const flagged = () => { try { return localStorage.getItem(FLAG) === '1' } catch { return false } }
// Ditutup sekali cukup untuk sesi browser ini; muncul lagi saat browser dibuka ulang.
const dismissedThisSession = () => { try { return sessionStorage.getItem(SESSION_KEY) === '1' } catch { return false } }
const dismiss = () => { try { sessionStorage.setItem(SESSION_KEY, '1') } catch {} }
const markInstalled = () => { try { localStorage.setItem(FLAG, '1') } catch {} }

const MANUAL: Record<ReturnType<typeof installPlatform>, string> = {
  android: 'Ketuk menu ⋮ di Chrome, lalu pilih "Instal aplikasi". Jangan pilih "Tambahkan ke layar utama" karena itu hanya membuat shortcut.',
  ios: 'Di Safari, ketuk tombol Bagikan lalu pilih "Tambahkan ke Layar Utama".',
  desktop: 'Klik ikon instal di ujung kanan kolom alamat Chrome/Edge, lalu pilih Instal.',
}

// Muncul sekali setiap browser dibuka sampai terpasang.
export default function PwaInstallPrompt() {
  const [deferred, setDeferred] = useState(installPrompt)
  const [manual, setManual] = useState(false)
  const [closed, setClosed] = useState(dismissedThisSession)
  const [busy, setBusy] = useState(false)
  const platform = installPlatform()

  useEffect(() => {
    if (standalone() || flagged()) return
    const off = onInstallChange(() => { setDeferred(installPrompt()); if (!installPrompt() && !standalone()) setManual(false) })
    // Tanpa sinyal pemasangan dari browser, tampilkan petunjuk manual setelah jeda singkat.
    const timer = window.setTimeout(() => { if (!installPrompt()) setManual(true) }, MANUAL_DELAY)
    const onInstalled = () => { markInstalled(); setClosed(true) }
    window.addEventListener('appinstalled', onInstalled)
    return () => { off(); window.clearTimeout(timer); window.removeEventListener('appinstalled', onInstalled) }
  }, [])

  const visible = !closed && !standalone() && !flagged() && (!!deferred || manual)
  if (!visible) return null

  const install = async () => {
    if (!deferred) return
    setBusy(true)
    try {
      await deferred.prompt()
      const choice = await deferred.userChoice
      clearInstallPrompt()
      if (choice.outcome === 'accepted') { markInstalled(); setClosed(true) }
    } finally { setBusy(false) }
  }

  return <div role="dialog" aria-modal="true" aria-label="Install aplikasi" className="fixed inset-0 z-[200] grid place-items-center bg-slate-950/50 p-4 print:hidden">
    <section className="w-full max-w-sm overflow-hidden rounded-3xl bg-white text-center shadow-2xl">
      <div className="relative bg-gradient-to-br from-teal-800 via-teal-900 to-slate-800 px-6 pb-6 pt-7">
        <button onClick={() => { dismiss(); setClosed(true) }} aria-label="Tutup" className="absolute right-3 top-3 grid size-8 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25"><X size={16}/></button>
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-white/15 text-white"><Download size={26}/></span>
        <h2 className="mt-3 text-lg font-black text-white">Install Wali Kelas</h2>
        <p className="mt-1 text-xs leading-5 text-teal-100">{deferred ? 'Pasang sebagai aplikasi: muncul di daftar aplikasi HP, terbuka layar penuh, dan bisa dipakai tanpa internet.' : MANUAL[platform]}</p>
      </div>
      <div className="space-y-2 p-5">
        {deferred && <button disabled={busy} onClick={() => void install()} className="min-h-11 w-full rounded-xl bg-teal-700 text-sm font-bold text-white hover:bg-teal-800 disabled:opacity-50">{busy ? 'Menyiapkan…' : 'Install sekarang'}</button>}
        <button onClick={() => { markInstalled(); setClosed(true) }} className="min-h-11 w-full rounded-xl border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50">Saya sudah install</button>
        <button onClick={() => { dismiss(); setClosed(true) }} className="min-h-9 w-full rounded-xl text-sm font-semibold text-slate-400 hover:text-slate-600">Nanti saja</button>
      </div>
    </section>
  </div>
}
