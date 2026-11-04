import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, X } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { proDaysLeft, renewalReminder } from '../../shared/subscription'

// Pengingat perpanjangan Pro di H-14 dan H-3; ditutup = tidak muncul lagi untuk tahap itu.
export default function RenewalReminder() {
  const { mode, plan, proUntil } = useAuthStore()
  const days = proDaysLeft(proUntil)
  const level = mode === 'login' && plan === 'pro' ? renewalReminder(days) : null
  const key = `bgy-renewal-dismissed-${level}-${proUntil}`
  const [dismissed, setDismissed] = useState(() => { try { return !!localStorage.getItem(key) } catch { return false } })
  if (!level || dismissed) return null
  const close = () => { try { localStorage.setItem(key, '1') } catch {} setDismissed(true) }
  const when = days! <= 0 ? 'hari ini' : `${days} hari lagi`
  return <div role="status" className={`mb-4 flex items-center gap-3 rounded-xl border p-3 text-sm ${level === 'h3' ? 'border-amber-300 bg-amber-50 text-amber-950' : 'border-teal-200 bg-teal-50 text-teal-950'}`}>
    <Sparkles size={18} className="shrink-0"/>
    <p className="min-w-0 flex-1">Masa Pro berakhir {when}. Data tetap aman; perpanjang agar sinkron tidak berhenti.</p>
    <Link to="/aktivasi" className="inline-flex min-h-11 shrink-0 items-center rounded-lg bg-teal-700 px-3 font-bold text-white">Perpanjang</Link>
    <button onClick={close} aria-label="Tutup pengingat" className="grid size-11 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-white/60"><X size={16}/></button>
  </div>
}
