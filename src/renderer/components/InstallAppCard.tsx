import { useEffect, useState } from 'react'
import { CheckCircle2, Download } from 'lucide-react'
import { clearInstallPrompt, installPlatform, installPrompt, isInstalledFlag, isStandalone, manualInstructions, markInstalledFlag, onInstallChange } from '../pwa-install'

// Tombol install di Pengaturan untuk yang belum memasang aplikasi.
export default function InstallAppCard() {
  const [deferred, setDeferred] = useState(installPrompt())
  const [done, setDone] = useState(() => isStandalone() || isInstalledFlag())
  const [busy, setBusy] = useState(false)
  const platform = installPlatform()
  useEffect(() => onInstallChange(() => setDeferred(installPrompt())), [])

  if (done) return <section className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><CheckCircle2 size={20} className="shrink-0"/><div><h4 className="font-bold">Aplikasi sudah terpasang</h4><p className="mt-1">Buka lewat ikon di daftar aplikasi HP agar layar penuh dan hemat kuota.</p></div></section>

  const install = async () => {
    const prompt = installPrompt()
    if (!prompt) return
    setBusy(true)
    try {
      await prompt.prompt()
      const choice = await prompt.userChoice
      clearInstallPrompt()
      setDeferred(null)
      if (choice.outcome === 'accepted') { markInstalledFlag(); setDone(true) }
    } finally { setBusy(false) }
  }

  return <section className="space-y-2">
    <div className="flex items-start gap-3"><Download size={20} className="mt-0.5 shrink-0 text-teal-700"/><div className="min-w-0"><h4 className="font-bold text-slate-900">Install Aplikasi</h4>
      <p className="mt-1 text-sm text-slate-600">{deferred ? 'Pasang sebagai aplikasi: muncul di daftar aplikasi HP, terbuka layar penuh, dan bisa dipakai tanpa internet.' : manualInstructions(platform)}</p></div></div>
    {deferred
      ? <button disabled={busy} onClick={() => void install()} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-teal-700 px-5 text-sm font-bold text-white hover:bg-teal-800 disabled:opacity-50"><Download size={16}/>{busy ? 'Menyiapkan…' : 'Install sekarang'}</button>
      : <button onClick={() => { markInstalledFlag(); setDone(true) }} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-700 hover:bg-slate-50">Saya sudah install</button>}
  </section>
}
