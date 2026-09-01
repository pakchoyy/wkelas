import { saveCalendarPeriod } from '../../../lib/calendar-storage'
import { useState, useEffect, useRef } from 'react'
import { CalendarDays, Pencil, Plus, Save, Trash2 } from 'lucide-react'
import { useAppStore } from '../../stores/appStore'
import { todayISO } from '../../../shared/utils'
import type { KalenderAkademik } from '../../../shared/types'
import { db } from '../../../lib/db'

const JENIS_WARNA: Record<string, string> = { libur_nasional: '#dc2626', libur_sekolah: '#d97706', ujian: '#2563eb', rapat: '#7c3aed', kegiatan: '#0ea5a0', lainnya: '#6b7280' }

export default function Kalender() {
  const kelasId = useAppStore((s) => s.kelasAktifId) || 1
  return <KalenderKelas key={kelasId} kelasId={kelasId}/>
}

function KalenderKelas({kelasId}: {kelasId:number}) {
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [ready, setReady] = useState(false)
  const [data, setData] = useState<KalenderAkademik[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ tanggal_mulai: todayISO(), tanggal_selesai: '', judul: '', jenis: 'kegiatan', deskripsi: '' })
  const [period, setPeriod] = useState({ mulai: '2026-07-01', akhir: '2026-12-31', hariSekolah: 5 })
  const [editId,setEditId]=useState<number|null>(null)
  const [semester,setSemester]=useState(1)
  const [toast,setToast]=useState('')

  const load = async () => { setData(await window.electronAPI.kalender.list(kelasId)) }
  useEffect(() => { Promise.all([load(), Promise.all([db.kelas.get(kelasId), db.pengaturan.get(`presensi_${kelasId}`)]).then(([kelas, setting]) => { let cfg:any={}; if(setting?.value) try{cfg=JSON.parse(setting.value)}catch{}; const sem=kelas?.semester||1; const year=Number(kelas?.tahun_ajaran?.split('/')[0]) || new Date().getFullYear(); setSemester(sem); setPeriod({ mulai: sem===1 ? cfg.s1Mulai||`${year}-07-01` : cfg.s2Mulai||`${year+1}-01-01`, akhir: sem===1 ? cfg.s1Akhir||`${year}-12-31` : cfg.s2Akhir||`${year+1}-06-30`, hariSekolah: cfg.hariSekolah||5 }) })]).then(() => setReady(true)).catch(() => setError('Kalender gagal dimuat. Muat ulang halaman untuk mencoba lagi.')) }, [kelasId])
  useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(''),2800);return()=>clearTimeout(timer)},[toast])

  const effectiveDays = (() => { let count=0; const cursor=new Date(`${period.mulai}T12:00:00`); const end=new Date(`${period.akhir}T12:00:00`); while(cursor<=end){ const day=cursor.getDay(); const iso=todayISO(cursor); const holiday=data.some((item)=>['libur_nasional','libur_sekolah'].includes(item.jenis)&&iso>=item.tanggal_mulai&&iso<=(item.tanggal_selesai||item.tanggal_mulai)); if(day>=1&&day<=period.hariSekolah&&!holiday) count++; cursor.setDate(cursor.getDate()+1) } return count })()

  const refresh = async () => { try { await load() } catch { setError('Perubahan tersimpan, tetapi daftar gagal dimuat ulang. Muat ulang halaman.') } }
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (lock.current) return
    lock.current = true; setBusy(true); setFormError('')
    try {
      await window.electronAPI.kalender.save({...form,kelas_id:kelasId,...(editId ? {id:editId} : {})})
      setShowForm(false); setToast(editId ? 'Kegiatan berhasil diperbarui' : 'Kegiatan berhasil ditambahkan')
      await refresh()
    } catch(error) { setFormError(error instanceof Error ? error.message : 'Kegiatan gagal disimpan. Isian tetap tersedia; silakan coba lagi.') }
    finally { lock.current = false; setBusy(false) }
  }
  const savePeriod = async () => {
    if (lock.current) return
    lock.current = true; setBusy(true); setError('')
    try { await saveCalendarPeriod(db,kelasId,semester,period); setToast('Periode akademik berhasil disimpan') }
    catch(error) { setError(error instanceof Error ? error.message : 'Periode gagal disimpan. Silakan coba lagi.') }
    finally { lock.current = false; setBusy(false) }
  }
  const openEdit=(item:KalenderAkademik)=>{setFormError('');setEditId(item.id);setForm({tanggal_mulai:item.tanggal_mulai,tanggal_selesai:item.tanggal_selesai||'',judul:item.judul,jenis:item.jenis,deskripsi:item.deskripsi||''});setShowForm(true)}
  const remove = async (item: KalenderAkademik) => {
    if (lock.current || !window.confirm(`Hapus ${item.judul}?`)) return
    lock.current = true; setBusy(true); setError('')
    try { await window.electronAPI.kalender.delete(item.id); setToast('Kegiatan berhasil dihapus'); await refresh() }
    catch { setError('Kegiatan gagal dihapus. Silakan coba lagi.') }
    finally { lock.current = false; setBusy(false) }
  }

  return (
    <div>{error && <p role="alert" className="mb-3 text-red-700">{error}</p>}{!ready && !error && <p role="status">Memuat kalender...</p>}<fieldset disabled={busy || !ready} className="min-w-0">{toast&&<div className="fixed left-1/2 top-20 w-[calc(100%_-_2rem)] max-w-md z-[100] -translate-x-1/2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-xl">{toast}</div>}
      <div className="flex flex-wrap gap-3 items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Kalender Akademik</h2>
        <button onClick={() => {setFormError('');setEditId(null);setForm({ tanggal_mulai: todayISO(), tanggal_selesai: '', judul: '', jenis: 'kegiatan', deskripsi: '' });setShowForm(true)}} className="min-h-11 flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg, #0ea5a0, #0d7a8a)' }}><Plus size={16} /> Tambah</button>
      </div>

      <div className="grid gap-4 mb-5 lg:grid-cols-[1fr_260px]"><div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="mb-4 flex items-center gap-2 font-bold"><CalendarDays size={18} className="text-emerald-600"/>Batas Waktu Semester</div><div className="grid gap-3 md:grid-cols-3"><label className="text-xs font-bold text-slate-500">Mulai Semester<input type="date" value={period.mulai} onChange={(e)=>setPeriod({...period,mulai:e.target.value})} className="field mt-1.5"/></label><label className="text-xs font-bold text-slate-500">Akhir Semester<input type="date" value={period.akhir} onChange={(e)=>setPeriod({...period,akhir:e.target.value})} className="field mt-1.5"/></label><label className="text-xs font-bold text-slate-500">Sistem Hari Sekolah<select value={period.hariSekolah} onChange={(e)=>setPeriod({...period,hariSekolah:Number(e.target.value)})} className="field mt-1.5"><option value={5}>Senin–Jumat</option><option value={6}>Senin–Sabtu</option></select></label></div><div className="mt-3 flex flex-wrap gap-3 items-center justify-between"><p className="text-xs text-slate-400">Periode ini digunakan oleh Presensi, Perilaku, Rencana, dan Jurnal.</p><button onClick={savePeriod} className="min-h-11 flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white"><Save size={14}/>Simpan Periode</button></div></div><div className="rounded-2xl bg-indigo-900 p-5 text-white"><div className="text-xs font-bold uppercase tracking-wider text-emerald-300">Hari Efektif Belajar</div><div className="mt-4 text-4xl font-extrabold">{effectiveDays}</div><div className="mt-1 text-xs text-indigo-200">hari setelah akhir pekan dan hari libur</div></div></div>

      <div className="space-y-3">
        {data.map((item) => (
          <div key={item.id} className="rounded-xl p-4 flex items-start gap-3" style={{ background: 'var(--card-bg)', boxShadow: 'var(--shadow)' }}>
            <div className="w-1 h-full rounded-full flex-shrink-0 mt-1" style={{ background: JENIS_WARNA[item.jenis] || '#6b7280', width: 4 }} />
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row gap-2 sm:items-start justify-between">
                <div>
                  <span className="block text-sm font-semibold break-words">{item.judul}</span>
                  <span className="block mt-1 text-sm text-slate-500">{item.tanggal_mulai}{item.tanggal_selesai ? ` - ${item.tanggal_selesai}` : ''}</span>
                </div>
                <div className="flex"><button onClick={()=>openEdit(item)} aria-label={`Edit ${item.judul}`} className="min-h-11 rounded-lg px-3 flex items-center gap-2 text-sm text-teal-700"><Pencil size={16}/>Edit</button><button onClick={()=>remove(item)} aria-label={`Hapus ${item.judul}`} className="min-h-11 rounded-lg px-3 flex items-center gap-2 text-sm text-red-700"><Trash2 size={16}/>Hapus</button></div>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ background: JENIS_WARNA[item.jenis] || '#6b7280' }}>{item.jenis.replaceAll('_', ' ')}</span>
              {item.deskripsi && <p className="text-sm mt-2 text-slate-500 whitespace-pre-wrap break-words">{item.deskripsi}</p>}
            </div>
          </div>
        ))}
        {data.length === 0 && <p className="text-sm text-center py-8 text-gray-400">Belum ada event</p>}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-2xl" style={{ background: 'var(--card-bg)', boxShadow: 'var(--shadow-lg)' }}>
            <div className="flex items-center justify-between px-4 py-3 border-b"><h3 className="text-sm font-bold">{editId?'Edit Kegiatan':'Tambah Kegiatan'}</h3><button onClick={() => setShowForm(false)} aria-label="Tutup formulir kegiatan" className="size-11 hover:bg-gray-100 rounded-lg">✕</button></div>
            <form onSubmit={handleSubmit} className="p-4 space-y-3">{formError && <p role="alert" className="text-sm text-red-700">{formError}</p>}
              <div><label className="text-xs font-medium text-gray-700 block mb-1">Judul</label><input aria-label="Judul kegiatan" value={form.judul} onChange={(e) => setForm({ ...form, judul: e.target.value })} className="min-w-0 min-h-11 w-full rounded-lg px-3 py-2 text-base lg:text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }} required /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-gray-700 block mb-1">Mulai</label><input type="date" aria-label="Tanggal mulai" value={form.tanggal_mulai} onChange={(e) => setForm({ ...form, tanggal_mulai: e.target.value })} className="min-w-0 min-h-11 w-full rounded-lg px-3 py-2 text-base lg:text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }} /></div>
                <div><label className="text-xs font-medium text-gray-700 block mb-1">Selesai</label><input type="date" aria-label="Tanggal selesai (opsional)" value={form.tanggal_selesai} onChange={(e) => setForm({ ...form, tanggal_selesai: e.target.value })} className="min-w-0 min-h-11 w-full rounded-lg px-3 py-2 text-base lg:text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }} /></div>
              </div>
              <div><label className="text-xs font-medium text-gray-700 block mb-1">Jenis</label>
                <select aria-label="Jenis kegiatan" value={form.jenis} onChange={(e) => setForm({ ...form, jenis: e.target.value })} className="min-w-0 min-h-11 w-full rounded-lg px-3 py-2 text-base lg:text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }}>
                  <option value="libur_nasional">Libur Nasional</option>
                  <option value="libur_sekolah">Libur Sekolah</option>
                  <option value="ujian">Ujian</option>
                  <option value="rapat">Rapat</option>
                  <option value="kegiatan">Kegiatan</option>
                  <option value="lainnya">Lainnya</option>
                </select></div>
              <div><label className="text-xs font-medium text-gray-700 block mb-1">Deskripsi</label><textarea aria-label="Deskripsi kegiatan" value={form.deskripsi} onChange={(e) => setForm({ ...form, deskripsi: e.target.value })} rows={2} className="min-w-0 min-h-11 w-full rounded-lg px-3 py-2 text-base lg:text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }} /></div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="min-h-11 rounded-xl px-4 py-2 text-sm font-semibold border" style={{ borderColor: 'var(--border)' }}>Batal</button>
                <button type="submit" className="min-h-11 rounded-xl px-6 py-2 text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg, #0ea5a0, #0d7a8a)' }}>Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </fieldset></div>
  )
}
