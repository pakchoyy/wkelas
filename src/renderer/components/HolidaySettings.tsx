import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, Plus } from 'lucide-react'
import { db } from '../../lib/db'
import { ensureIndonesianHolidays } from '../../lib/holiday-storage'
import { HOLIDAY_SOURCE } from '../../shared/indonesia-holidays'
import type { KalenderAkademik } from '../../shared/types'
import { todayISO } from '../../shared/utils'

export default function HolidaySettings({kelasId,onChanged}:{kelasId:number;onChanged:()=>void}) {
  const [days,setDays] = useState<KalenderAkademik[]>([])
  const [form,setForm] = useState({judul:'',tanggal_mulai:todayISO(),tanggal_selesai:''})
  const [adding,setAdding] = useState(false)
  const [busy,setBusy] = useState(false)
  const lock = useRef(false)
  const [error,setError] = useState('')
  const [notice,setNotice] = useState('')
  const [cutiApplied,setCutiApplied] = useState(false)
  const [supported,setSupported] = useState(false)
  const load = async () => {
    const [list, marker, kelas] = await Promise.all([window.electronAPI.kalender.list(kelasId),db.pengaturan.get('cuti_bersama_2026_' + kelasId),db.kelas.get(kelasId)])
    setDays(list.filter(d => ['libur_nasional','libur_sekolah'].includes(d.jenis)).sort((a,b) => a.tanggal_mulai.localeCompare(b.tanggal_mulai)))
    setCutiApplied(!!marker); setSupported(!!kelas?.tahun_ajaran.split('/').includes('2026'))
  }
  useEffect(() => { void load().catch(() => setError('Hari libur gagal dimuat. Tutup pengaturan lalu buka kembali.')) },[kelasId])
  const run = async (action:()=>Promise<unknown>,message:string) => {
    if (lock.current) return
    lock.current=true;setBusy(true);setError('');setNotice('')
    try { await action();await load();onChanged();setNotice(message) }
    catch(e) { setError(e instanceof Error ? e.message : 'Gagal menyimpan hari libur. Coba lagi.') }
    finally { lock.current=false;setBusy(false) }
  }
  const add = (e:React.FormEvent) => {
    e.preventDefault()
    void run(async () => {await window.electronAPI.kalender.save({...form,kelas_id:kelasId,jenis:'libur_sekolah'});setAdding(false);setForm({judul:'',tanggal_mulai:todayISO(),tanggal_selesai:''})},'Hari libur ditambahkan.')
  }
  const national = days.filter(d => d.jenis === 'libur_nasional')
  return <div className="space-y-3">
    <p className="text-sm text-slate-600">Libur nasional 2026 tersedia otomatis. Libur sekolah dan tahun lain bisa ditambahkan sendiri.</p>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}{notice && <p role="status" className="text-sm text-teal-700">{notice}</p>}
    <details className="rounded-xl border border-rose-100 bg-rose-50 px-3 text-sm"><summary className="min-h-11 cursor-pointer content-center font-semibold text-rose-800">Libur nasional ({national.length})</summary><ul className="space-y-2 pb-3 text-xs text-slate-700">{national.map(d => <li key={d.id}>{d.tanggal_mulai} · {d.judul}</li>)}</ul><a href={HOLIDAY_SOURCE} target="_blank" rel="noreferrer" className="mb-2 inline-flex min-h-11 items-center text-xs text-rose-800 underline">Sumber: Kemenko PMK 2026</a></details>
    {supported && <button disabled={busy || cutiApplied} onClick={() => void run(() => ensureIndonesianHolidays(db,kelasId,true),'Cuti bersama 2026 ditambahkan.')} className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm font-semibold disabled:opacity-50">{cutiApplied ? 'Cuti bersama 2026 sudah ditambahkan' : '+ Ikutkan cuti bersama 2026'}</button>}
    <div className="flex flex-wrap items-center justify-between gap-2"><button disabled={busy} onClick={() => setAdding(v => !v)} aria-expanded={adding} className="flex min-h-11 items-center gap-2 rounded-xl bg-teal-50 px-3 text-sm font-semibold text-teal-800"><Plus size={16}/>Tambah hari libur</button><Link to="/aktivitas/kalender" className="inline-flex min-h-11 items-center gap-1 text-xs text-teal-700 underline"><CalendarDays size={14}/>Kelola kalender</Link></div>
    {adding && <form onSubmit={add} className="space-y-3 rounded-xl border border-slate-200 p-3"><fieldset disabled={busy} className="min-w-0 space-y-3"><label className="block text-sm font-semibold">Nama libur<input required value={form.judul} onChange={e => setForm({...form,judul:e.target.value})} className="field mt-1" placeholder="Contoh: Libur semester"/></label><div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm font-semibold">Mulai<input required type="date" value={form.tanggal_mulai} onChange={e => setForm({...form,tanggal_mulai:e.target.value})} className="field mt-1"/></label><label className="block text-sm font-semibold">Selesai (opsional)<input type="date" min={form.tanggal_mulai} value={form.tanggal_selesai} onChange={e => setForm({...form,tanggal_selesai:e.target.value})} className="field mt-1"/></label></div><button className="min-h-11 rounded-xl bg-teal-700 px-4 text-sm font-semibold text-white">Simpan hari libur</button></fieldset></form>}
    {days.filter(d => d.jenis === 'libur_sekolah').map(d => <div key={d.id} className="rounded-lg bg-amber-50 p-3 text-sm"><strong className="block break-words text-amber-900">{d.judul}</strong><span className="text-xs text-slate-600">{d.tanggal_mulai}{d.tanggal_selesai ? ' — ' + d.tanggal_selesai : ''}</span></div>)}
  </div>
}
