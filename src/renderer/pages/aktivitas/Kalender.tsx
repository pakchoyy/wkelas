import { useState, useEffect } from 'react'
import { CalendarDays, Plus, Trash2 } from 'lucide-react'
import { useAppStore } from '../../stores/appStore'
import { todayISO } from '../../../shared/utils'
import type { KalenderAkademik } from '../../../shared/types'
import { db } from '../../../lib/db'

const JENIS_WARNA: Record<string, string> = { libur_nasional: '#dc2626', libur_sekolah: '#d97706', ujian: '#2563eb', rapat: '#7c3aed', kegiatan: '#0ea5a0', lainnya: '#6b7280' }

export default function Kalender() {
  const kelasId = useAppStore((s) => s.kelasAktifId) || 1
  const [data, setData] = useState<KalenderAkademik[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ tanggal_mulai: todayISO(), tanggal_selesai: '', judul: '', jenis: 'kegiatan', deskripsi: '' })
  const [period, setPeriod] = useState({ mulai: '2026-07-01', akhir: '2026-12-31', hariSekolah: 5 })

  const load = async () => { setData(await window.electronAPI.kalender.list(kelasId)) }
  useEffect(() => { load(); Promise.all([db.kelas.get(kelasId), db.pengaturan.get(`presensi_${kelasId}`)]).then(([kelas, setting]) => { let cfg:any={}; if(setting?.value) try{cfg=JSON.parse(setting.value)}catch{}; const semester=kelas?.semester||1; setPeriod({ mulai: semester===1 ? cfg.s1Mulai||'2026-07-01' : cfg.s2Mulai||'2027-01-01', akhir: semester===1 ? cfg.s1Akhir||'2026-12-31' : cfg.s2Akhir||'2027-06-30', hariSekolah: cfg.hariSekolah||5 }) }) }, [kelasId])

  const effectiveDays = (() => { let count=0; const cursor=new Date(`${period.mulai}T12:00:00`); const end=new Date(`${period.akhir}T12:00:00`); while(cursor<=end){ const day=cursor.getDay(); const iso=cursor.toISOString().slice(0,10); const holiday=data.some((item)=>['libur_nasional','libur_sekolah'].includes(item.jenis)&&iso>=item.tanggal_mulai&&iso<=(item.tanggal_selesai||item.tanggal_mulai)); if(day>=1&&day<=period.hariSekolah&&!holiday) count++; cursor.setDate(cursor.getDate()+1) } return count })()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await window.electronAPI.kalender.save({ ...form, kelas_id: kelasId })
    setShowForm(false)
    setForm({ tanggal_mulai: todayISO(), tanggal_selesai: '', judul: '', jenis: 'kegiatan', deskripsi: '' })
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Kalender Akademik</h2>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg, #0ea5a0, #0d7a8a)' }}><Plus size={16} /> Tambah</button>
      </div>

      <div className="grid gap-4 mb-5 lg:grid-cols-[1fr_260px]"><div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="mb-4 flex items-center gap-2 font-bold"><CalendarDays size={18} className="text-emerald-600"/>Batas Waktu Semester</div><div className="grid gap-3 md:grid-cols-3"><label className="text-xs font-bold text-slate-500">Mulai Semester<input type="date" value={period.mulai} onChange={(e)=>setPeriod({...period,mulai:e.target.value})} className="field mt-1.5"/></label><label className="text-xs font-bold text-slate-500">Akhir Semester<input type="date" value={period.akhir} onChange={(e)=>setPeriod({...period,akhir:e.target.value})} className="field mt-1.5"/></label><label className="text-xs font-bold text-slate-500">Sistem Hari Sekolah<select value={period.hariSekolah} onChange={(e)=>setPeriod({...period,hariSekolah:Number(e.target.value)})} className="field mt-1.5"><option value={5}>Senin–Jumat</option><option value={6}>Senin–Sabtu</option></select></label></div><p className="mt-3 text-xs text-slate-400">Periode mengikuti pengaturan Presensi. Perubahan hari sekolah disimpan melalui menu Pengaturan Presensi.</p></div><div className="rounded-2xl bg-indigo-900 p-5 text-white"><div className="text-xs font-bold uppercase tracking-wider text-emerald-300">Hari Efektif Belajar</div><div className="mt-4 text-4xl font-extrabold">{effectiveDays}</div><div className="mt-1 text-xs text-indigo-200">hari setelah akhir pekan dan hari libur</div></div></div>

      <div className="space-y-3">
        {data.map((item) => (
          <div key={item.id} className="rounded-xl p-4 flex items-start gap-3" style={{ background: 'var(--card-bg)', boxShadow: 'var(--shadow)' }}>
            <div className="w-1 h-full rounded-full flex-shrink-0 mt-1" style={{ background: JENIS_WARNA[item.jenis] || '#6b7280', width: 4 }} />
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-sm font-semibold">{item.judul}</span>
                  <span className="text-xs ml-2 text-gray-400">{item.tanggal_mulai}{item.tanggal_selesai ? ` - ${item.tanggal_selesai}` : ''}</span>
                </div>
                <button onClick={async () => { await window.electronAPI.kalender.delete(item.id); load() }} className="p-1 hover:text-red-600"><Trash2 size={14} /></button>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ background: JENIS_WARNA[item.jenis] || '#6b7280' }}>{item.jenis.replace('_', ' ')}</span>
              {item.deskripsi && <p className="text-xs mt-1 text-gray-500">{item.deskripsi}</p>}
            </div>
          </div>
        ))}
        {data.length === 0 && <p className="text-sm text-center py-8 text-gray-400">Belum ada event</p>}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl" style={{ background: 'var(--card-bg)', boxShadow: 'var(--shadow-lg)' }}>
            <div className="flex items-center justify-between px-4 py-3 border-b"><h3 className="text-sm font-bold">Tambah Event</h3><button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded-lg">✕</button></div>
            <form onSubmit={handleSubmit} className="p-4 space-y-3">
              <div><label className="text-xs font-medium text-gray-700 block mb-1">Judul</label><input value={form.judul} onChange={(e) => setForm({ ...form, judul: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }} required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-gray-700 block mb-1">Mulai</label><input type="date" value={form.tanggal_mulai} onChange={(e) => setForm({ ...form, tanggal_mulai: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }} /></div>
                <div><label className="text-xs font-medium text-gray-700 block mb-1">Selesai</label><input type="date" value={form.tanggal_selesai} onChange={(e) => setForm({ ...form, tanggal_selesai: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }} /></div>
              </div>
              <div><label className="text-xs font-medium text-gray-700 block mb-1">Jenis</label>
                <select value={form.jenis} onChange={(e) => setForm({ ...form, jenis: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }}>
                  <option value="libur_nasional">Libur Nasional</option>
                  <option value="libur_sekolah">Libur Sekolah</option>
                  <option value="ujian">Ujian</option>
                  <option value="rapat">Rapat</option>
                  <option value="kegiatan">Kegiatan</option>
                  <option value="lainnya">Lainnya</option>
                </select></div>
              <div><label className="text-xs font-medium text-gray-700 block mb-1">Deskripsi</label><textarea value={form.deskripsi} onChange={(e) => setForm({ ...form, deskripsi: e.target.value })} rows={2} className="w-full rounded-lg px-3 py-2 text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }} /></div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="rounded-xl px-4 py-2 text-sm font-semibold border" style={{ borderColor: 'var(--border)' }}>Batal</button>
                <button type="submit" className="rounded-xl px-6 py-2 text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg, #0ea5a0, #0d7a8a)' }}>Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
