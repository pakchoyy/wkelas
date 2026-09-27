import { Link } from 'react-router-dom'
import { useRef, useState } from 'react'
import { ArrowUpRight, Check, Lock, Plus } from 'lucide-react'
import Modal from './Modal'
import { db } from '../../lib/db'
import { createClass, nextAcademicYear, promoteClass, type NewClass } from '../../lib/class-manager'
import { useAppStore } from '../stores/appStore'
import { useAuthStore } from '../stores/authStore'
import { switchClass, useClasses } from '../hooks/useClasses'

type Mode = 'tambah' | 'naik' | null

export default function ClassManager() {
  const classes = useClasses()
  const pro = useAuthStore(s => s.plan === 'pro' && s.mode === 'login')
  const kelasId = useAppStore(s => s.kelasAktifId)
  const active = classes.find(k => k.id === kelasId)
  const [mode, setMode] = useState<Mode>(null)
  const [form, setForm] = useState<NewClass>({ nama_kelas: '', tingkat: '1', tahun_ajaran: '', semester: 1 })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const lock = useRef(false)

  const open = (next: Mode) => {
    if (!active) return
    const grade = Math.min(6, Number(active.tingkat) + (next === 'naik' ? 1 : 0))
    setForm(next === 'naik'
      ? { nama_kelas: active.nama_kelas.replace(/\d/, String(grade)), tingkat: String(grade), tahun_ajaran: nextAcademicYear(active.tahun_ajaran), semester: 1 }
      : { nama_kelas: '', tingkat: active.tingkat, tahun_ajaran: active.tahun_ajaran, semester: active.semester })
    setError(''); setMsg(''); setMode(next)
  }
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (lock.current || !active?.id) return
    lock.current = true; setBusy(true); setError('')
    try {
      if (mode === 'naik') {
        const result = await promoteClass(db, active.id, form)
        await switchClass(result.kelasId)
        setMsg(`Kelas ${form.nama_kelas} (${form.tahun_ajaran}) dibuat dengan ${result.siswa} siswa. Kelas lama tetap tersimpan sebagai arsip.`)
      } else {
        const id = await createClass(db, form, active.id)
        await switchClass(id)
        setMsg(`Kelas ${form.nama_kelas} dibuat dan sekarang aktif.`)
      }
      setMode(null)
    } catch (e) { setError(e instanceof Error ? e.message : 'Kelas belum berhasil dibuat.') }
    finally { lock.current = false; setBusy(false) }
  }

  return <section className="mt-6 space-y-3 border-t border-slate-100 pt-5">
    <div><h3 className="font-extrabold">Kelola Kelas {!pro && <span className="ml-1 rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-600">PRO</span>}</h3>
      <p className="mt-1 text-xs text-slate-500">Setiap kelas punya siswa, jadwal, presensi, dan nilai sendiri. Naik kelas menyalin siswa ke kelas baru; kelas lama tetap bisa dibuka sebagai arsip.</p></div>
    <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
      {classes.map(k => <li key={k.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm">
        <span className="min-w-0"><span className="font-bold text-slate-800">{k.nama_kelas}</span> <span className="text-slate-500">· {k.tahun_ajaran} · Semester {k.semester}</span></span>
        {k.id === kelasId ? <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-bold text-teal-800"><Check size={14}/>Aktif</span>
          : <button type="button" onClick={() => void switchClass(k.id!)} className="min-h-10 rounded-lg px-3 text-sm font-bold text-teal-700 hover:bg-teal-50">Buka kelas</button>}
      </li>)}
    </ul>
    {pro ? <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => open('tambah')} className="flex min-h-11 items-center gap-2 rounded-xl border border-teal-300 bg-white px-4 text-sm font-bold text-teal-800 hover:bg-teal-50"><Plus size={16}/>Tambah Kelas</button>
      <button type="button" onClick={() => open('naik')} className="flex min-h-11 items-center gap-2 rounded-xl bg-teal-700 px-4 text-sm font-bold text-white hover:bg-teal-800"><ArrowUpRight size={16}/>Naik Kelas</button>
    </div> : <p className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600"><Lock size={16} className="mt-0.5 shrink-0"/>Tambah kelas dan naik kelas tersedia untuk akun Pro. Kelas yang sudah ada tetap bisa dibuka. <Link to="/aktivasi" className="font-bold text-teal-700 underline underline-offset-2">Aktivasi Pro</Link></p>}
    {msg && <p role="status" className="rounded-lg bg-emerald-50 p-2.5 text-sm font-semibold text-emerald-800">{msg}</p>}

    {mode && <Modal title={mode === 'naik' ? `Naik kelas dari ${active?.nama_kelas}` : 'Tambah kelas'} onClose={() => { if (!busy) setMode(null) }}
      footer={<button type="submit" form="class-form" disabled={busy} className="min-h-11 w-full rounded-xl bg-teal-700 px-4 font-bold text-white disabled:opacity-50">{busy ? 'Menyimpan…' : mode === 'naik' ? 'Buat kelas baru & salin siswa' : 'Buat kelas'}</button>}>
      <form id="class-form" onSubmit={submit}><fieldset disabled={busy} className="space-y-3">
        {error && <p role="alert" className="rounded-lg bg-red-50 p-2.5 text-sm text-red-700">{error}</p>}
        {mode === 'naik' && <p className="rounded-lg bg-sky-50 p-2.5 text-sm text-sky-900">Siswa aktif dan kolom tambahannya disalin. Presensi, nilai, jadwal, dan jurnal dimulai kosong di kelas baru.</p>}
        <label className="block text-sm font-bold">Nama kelas<input required value={form.nama_kelas} onChange={e => setForm({ ...form, nama_kelas: e.target.value })} className="field mt-1.5" placeholder="Contoh: 5A"/></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm font-bold">Tingkat<select value={form.tingkat} onChange={e => setForm({ ...form, tingkat: e.target.value })} className="field mt-1.5">{[1,2,3,4,5,6].map(n => <option key={n} value={n}>Kelas {n}</option>)}</select></label>
          <label className="text-sm font-bold">Semester<select value={form.semester} onChange={e => setForm({ ...form, semester: Number(e.target.value) })} className="field mt-1.5"><option value={1}>1 (Ganjil)</option><option value={2}>2 (Genap)</option></select></label>
        </div>
        <label className="block text-sm font-bold">Tahun ajaran<input required value={form.tahun_ajaran} onChange={e => setForm({ ...form, tahun_ajaran: e.target.value })} className="field mt-1.5" placeholder="2027/2028"/></label>
      </fieldset></form>
    </Modal>}
  </section>
}
