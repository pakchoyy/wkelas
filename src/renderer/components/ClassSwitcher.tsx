import { useState } from 'react'
import { useAppStore } from '../stores/appStore'
import { useAuthStore } from '../stores/authStore'
import { switchClass, useClasses } from '../hooks/useClasses'

export default function ClassSwitcher() {
  const classes = useClasses()
  const pro = useAuthStore(s => s.plan === 'pro' && s.mode === 'login')
  const kelasId = useAppStore(s => s.kelasAktifId)
  const [busy, setBusy] = useState(false)
  if (classes.length < 2 && !pro) return null
  return <label className="shrink-0">
    <span className="sr-only">Pilih kelas aktif</span>
    <select value={kelasId ?? ''} disabled={busy} onChange={async e => { setBusy(true); try { await switchClass(Number(e.target.value)) } catch { window.alert('Kelas belum bisa diganti. Coba lagi.') } finally { setBusy(false) } }}
      className="h-10 w-28 shrink-0 truncate rounded-xl sm:w-auto sm:max-w-56 border border-white/30 bg-white/15 pl-3 pr-8 text-sm font-bold text-white sm:max-w-56 [&>option]:text-slate-900">
      {classes.map(k => <option key={k.id} value={k.id}>{k.nama_kelas} · {k.tahun_ajaran}</option>)}
    </select>
  </label>
}
