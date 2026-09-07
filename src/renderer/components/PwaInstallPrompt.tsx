import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'

const FLAG = 'bgy-pwa-installed'

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

const isInstalled = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (window.navigator as Navigator & { standalone?: boolean }).standalone === true ||
  localStorage.getItem(FLAG) === '1'

// Muncul setiap aplikasi dibuka sampai pengguna menginstall.
// "Nanti" hanya menutup untuk sesi ini; dibuka lagi besok muncul lagi.
export default function PwaInstallPrompt() {
  const [visible, setVisible] = useState(false)
  const [deferred, setDeferred] = useState<PromptEvent | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (isInstalled()) return
    setVisible(true)
    const onPrompt = (event: Event) => { event.preventDefault(); setDeferred(event as PromptEvent) }
    const onInstalled = () => { localStorage.setItem(FLAG, '1'); setVisible(false); setDeferred(null) }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => { window.removeEventListener('beforeinstallprompt', onPrompt); window.removeEventListener('appinstalled', onInstalled) }
  }, [])

  if (!visible) return null

  const install = async () => {
    if (!deferred) return
    setBusy(true)
    try {
      await deferred.prompt()
      const choice = await deferred.userChoice
      if (choice.outcome === 'accepted') { localStorage.setItem(FLAG, '1'); setVisible(false) }
      setDeferred(null)
    } finally { setBusy(false) }
  }

  return <section aria-label="Install aplikasi" className="mx-3 mt-3 shrink-0 rounded-2xl bg-gradient-to-r from-teal-700 to-indigo-800 p-4 text-white shadow sm:mx-4 lg:mx-6">
    <div className="flex items-start gap-3">
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/15"><Download size={22}/></span>
      <div className="min-w-0 flex-1">
        <h2 className="font-extrabold">Install aplikasi Wali Kelas</h2>
        <p className="mt-1 text-xs leading-5 text-teal-50">{deferred ? 'Buka lebih cepat dari layar utama HP seperti aplikasi biasa.' : 'Android: menu ⋮ Chrome → "Install aplikasi/Tambahkan ke Layar Utama". iPhone: tombol Bagikan → "Add to Home Screen".'}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {deferred && <button disabled={busy} onClick={() => void install()} className="min-h-11 rounded-xl bg-white px-4 py-2 text-sm font-bold text-teal-800 disabled:opacity-50">{busy ? 'Menyiapkan…' : 'Install sekarang'}</button>}
          <button onClick={() => { localStorage.setItem(FLAG, '1'); setVisible(false) }} className="min-h-11 rounded-xl border border-white/40 px-4 py-2 text-sm font-bold">Saya sudah install</button>
          <button onClick={() => setVisible(false)} aria-label="Ingatkan lagi nanti" className="inline-flex min-h-11 items-center gap-1 rounded-xl px-3 py-2 text-sm font-semibold text-teal-100"><X size={15}/>Nanti</button>
        </div>
      </div>
    </div>
  </section>
}
