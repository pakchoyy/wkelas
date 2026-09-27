import { useEffect, useRef, useState } from 'react'
import { Save } from 'lucide-react'
import { db } from '../../lib/db'
import { readThresholds, thresholdKey, validateThresholds } from '../../shared/student-profile'

export default function ProfileThresholdSettings({ kelasId }: { kelasId: number }) {
  const [form, setForm] = useState({ nilai: '75', kehadiran: '85' })
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  useEffect(() => {
    db.pengaturan.get(thresholdKey(kelasId)).then(row => { const t = readThresholds(row?.value); setForm({ nilai: String(t.nilai), kehadiran: String(t.kehadiran) }) }, () => {})
  }, [kelasId])
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); if (lock.current) return
    lock.current = true; setBusy(true); setMsg(null)
    try {
      const value = validateThresholds({ nilai: Number(form.nilai), kehadiran: Number(form.kehadiran) })
      await db.pengaturan.put({ key: thresholdKey(kelasId), value: JSON.stringify(value), updated_at: new Date().toISOString() })
      setMsg({ ok: true, text: 'Batas penanda Profil Siswa disimpan.' })
    } catch (error) { setMsg({ ok: false, text: error instanceof Error ? error.message : 'Gagal menyimpan.' }) }
    finally { lock.current = false; setBusy(false) }
  }
  return <form onSubmit={save} className="mt-6 space-y-3 border-t border-slate-100 pt-5">
    <div><h3 className="font-extrabold">Penanda Profil Siswa</h3><p className="mt-1 text-xs text-slate-500">Siswa ditandai "Perlu perhatian" bila nilai akhir atau kehadirannya di bawah batas ini.</p></div>
    <fieldset disabled={busy} className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm font-bold">Batas nilai (KKTP)<input type="number" inputMode="decimal" min={0} max={100} step="any" required value={form.nilai} onChange={e => setForm({ ...form, nilai: e.target.value })} className="field mt-1.5"/></label>
      <label className="text-sm font-bold">Batas kehadiran (%)<input type="number" inputMode="decimal" min={0} max={100} step="any" required value={form.kehadiran} onChange={e => setForm({ ...form, kehadiran: e.target.value })} className="field mt-1.5"/></label>
    </fieldset>
    <button disabled={busy} className="flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"><Save size={16}/>Simpan Batas</button>
    {msg && <p role={msg.ok ? 'status' : 'alert'} className={`rounded-lg p-2.5 text-sm font-semibold ${msg.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>{msg.text}</p>}
  </form>
}
