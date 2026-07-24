import { useState, useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useAppStore } from '../../stores/appStore'
import { todayISO } from '../../../shared/utils'
import type { KalenderAkademik } from '../../../shared/types'

const JENIS_WARNA: Record<string, string> = { libur_nasional: '#dc2626', libur_sekolah: '#d97706', ujian: '#2563eb', rapat: '#7c3aed', kegiatan: '#0ea5a0', lainnya: '#6b7280' }

export default function Kalender() {
  const kelasId = useAppStore((s) => s.kelasAktifId) || 1
  const [data, setData] = useState<KalenderAkademik[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ tanggal_mulai: todayISO(), tanggal_selesai: '', judul: '', jenis: 'kegiatan', deskripsi: '' })

  const load = async () => { setData(await window.electronAPI.kalender.list(kelasId)) }
  useEffect(() => { load() }, [])

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
