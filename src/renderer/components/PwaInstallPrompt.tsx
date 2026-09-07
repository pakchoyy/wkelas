import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'

const FLAG = 'bgy-pwa-installed'

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

const isInstalled = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (window.navigator as Navigator & { standalone?: boolean }).standalone === true ||
  localStorage.getItem(FLAG) === '1'

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

  return <section aria-label="Install aplikasi" className="relative mx-3 mt-3 shrink-0 overflow-hidden rounded-2xl border border-teal-800/10 bg-white p-4 shadow-sm sm:mx-4 sm:p-4 lg:mx-6">
    <button onClick={() => setVisible(false)} aria-label="Tutup" className="absolute right-2 top-2 grid size-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X size={16}/></button>
    <div className="flex items-start gap-3 pr-6">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-teal-700 text-white"><Download size={18}/></span>
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-extrabold text-slate-900">Install aplikasi Wali Kelas</h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">{deferred ? 'Buka lebih cepat dari layar utama HP seperti aplikasi biasa.' : 'Android: menu ⋮ Chrome → Install aplikasi. iPhone: Bagikan → Add to Home Screen.'}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {deferred && <button disabled={busy} onClick={() => void install()} className="min-h-9 rounded-xl bg-teal-700 px-4 py-2 text-sm font-bold text-white hover:bg-teal-800 disabled:opacity-50">{busy ? 'Menyiapkan…' : 'Install sekarang'}</button>}
          <button onClick={() => { localStorage.setItem(FLAG, '1'); setVisible(false) }} className="min-h-9 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">Saya sudah install</button>
          <button onClick={() => setVisible(false)} className="min-h-9 rounded-xl px-3 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700">Nanti</button>
        </div>
      </div>
    </div>
  </section>
}
