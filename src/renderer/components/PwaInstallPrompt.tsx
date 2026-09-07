import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'

const FLAG = 'bgy-pwa-installed'

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

const isInstalled = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (window.navigator as Navigator & { standalone?: boolean }).standalone === true ||
  localStorage.getItem(FLAG) === '1'

// Muncul di tengah layar setiap aplikasi dibuka sampai pengguna menginstall.
// "Nanti"/X hanya menutup untuk sesi ini; dibuka lagi muncul lagi.
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

  return <div role="dialog" aria-modal="true" aria-label="Install aplikasi" className="fixed inset-0 z-[200] grid place-items-center bg-slate-950/50 p-4 print:hidden">
    <section className="w-full max-w-sm overflow-hidden rounded-3xl bg-white text-center shadow-2xl">
      <div className="relative bg-gradient-to-br from-teal-700 via-teal-800 to-indigo-900 px-6 pb-6 pt-7">
        <button onClick={() => setVisible(false)} aria-label="Tutup" className="absolute right-3 top-3 grid size-8 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25"><X size={16}/></button>
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-white/15 text-white"><Download size={26}/></span>
        <h2 className="mt-3 text-lg font-black text-white">Install Wali Kelas</h2>
        <p className="mt-1 text-xs leading-5 text-teal-100">{deferred ? 'Buka lebih cepat dari layar utama HP seperti aplikasi biasa.' : 'Android: menu ⋮ Chrome → Install aplikasi. iPhone: Bagikan → Add to Home Screen.'}</p>
      </div>
      <div className="space-y-2 p-5">
        {deferred && <button disabled={busy} onClick={() => void install()} className="min-h-11 w-full rounded-xl bg-teal-700 text-sm font-bold text-white hover:bg-teal-800 disabled:opacity-50">{busy ? 'Menyiapkan…' : 'Install sekarang'}</button>}
        <button onClick={() => { localStorage.setItem(FLAG, '1'); setVisible(false) }} className="min-h-11 w-full rounded-xl border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50">Saya sudah install</button>
        <button onClick={() => setVisible(false)} className="min-h-9 w-full rounded-xl text-sm font-semibold text-slate-400 hover:text-slate-600">Nanti saja</button>
      </div>
    </section>
  </div>
}
