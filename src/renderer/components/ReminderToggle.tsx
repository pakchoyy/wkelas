import { useState } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { disableReminder, enableReminder, reminderEnabled, reminderSupported } from '../../lib/task-reminder'

export default function ReminderToggle() {
  const [on, setOn] = useState(reminderEnabled)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  if (!reminderSupported()) return null
  const toggle = async () => {
    setBusy(true); setMsg('')
    try {
      if (on) { disableReminder(); setOn(false); return }
      const result = await enableReminder()
      if (result === 'on') { setOn(true); setMsg('Pengingat aktif. Notifikasi muncul sekali sehari saat aplikasi dibuka bila ada tugas hari ini atau terlambat.') }
      else setMsg('Izin notifikasi ditolak. Aktifkan lewat pengaturan situs di browser, lalu coba lagi.')
    } finally { setBusy(false) }
  }
  return <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="flex items-center gap-2 font-semibold text-slate-700">{on ? <Bell size={17} className="text-teal-700"/> : <BellOff size={17} className="text-slate-400"/>}Pengingat tugas harian</span>
      <button type="button" role="switch" aria-checked={on} disabled={busy} onClick={() => void toggle()} className={`min-h-10 rounded-lg px-3 font-bold disabled:opacity-50 ${on ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-teal-700 text-white hover:bg-teal-800'}`}>{on ? 'Matikan' : 'Aktifkan'}</button>
    </div>
    {msg && <p role="status" className="mt-2 text-slate-600">{msg}</p>}
  </div>
}
