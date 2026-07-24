import { useState, useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useAppStore } from '../../stores/appStore'
import { todayISO } from '../../../shared/utils'
import type { RencanaMengajar, MataPelajaran } from '../../../shared/types'

export default function Rencana() {
  const kelasId = useAppStore((s) => s.kelasAktifId) || 1
  const [data, setData] = useState<RencanaMengajar[]>([])
  const [mapelList, setMapelList] = useState<MataPelajaran[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState({ tanggal: todayISO(), mata_pelajaran_id: '', topik: '', tujuan_pembelajaran: '', kegiatan: '', media: '', penilaian: '', catatan: '', status: 'draft' })

  const load = async () => {
    setData(await window.electronAPI.rencana.list(kelasId))
    setMapelList(await window.electronAPI.mapel.list(kelasId))
  }

  useEffect(() => { load() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await window.electronAPI.rencana.save({ ...form, kelas_id: kelasId, id: editId, mata_pelajaran_id: form.mata_pelajaran_id ? parseInt(form.mata_pelajaran_id) : null })
    setShowForm(false); setEditId(null)
    load()
  }

  const handleToggleStatus = async (item: RencanaMengajar) => {
    await window.electronAPI.rencana.save({ ...item, status: item.status === 'selesai' ? 'draft' : 'selesai' })
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Rencana Mengajar</h2>
        <button onClick={() => { setEditId(null); setForm({ tanggal: todayISO(), mata_pelajaran_id: '', topik: '', tujuan_pembelajaran: '', kegiatan: '', media: '', penilaian: '', catatan: '', status: 'draft' }); setShowForm(true) }}
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg, #0ea5a0, #0d7a8a)' }}>
          <Plus size={16} /> Tambah
        </button>
      </div>

      <div className="space-y-3">
        {data.map((item) => (
          <div key={item.id} className="rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow" style={{ background: 'var(--card-bg)', boxShadow: 'var(--shadow)' }}
            onClick={() => { setEditId(item.id); setForm({ tanggal: item.tanggal, mata_pelajaran_id: item.mata_pelajaran_id?.toString() || '', topik: item.topik, tujuan_pembelajaran: item.tujuan_pembelajaran || '', kegiatan: item.kegiatan || '', media: item.media || '', penilaian: item.penilaian || '', catatan: item.catatan || '', status: item.status }); setShowForm(true) }}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <span className="text-sm font-semibold">{item.topik}</span>
                <span className="text-xs ml-2 text-gray-400">{item.tanggal}</span>
              </div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${item.status === 'selesai' ? 'text-green-700 bg-green-50' : 'text-amber-700 bg-amber-50'}`}>
                {item.status}
              </span>
            </div>
            {item.mata_pelajaran_id && <span className="text-xs text-[#0ea5a0]">{mapelList.find((m) => m.id === item.mata_pelajaran_id)?.nama}</span>}
          </div>
        ))}
        {data.length === 0 && <p className="text-sm text-center py-8 text-gray-400">Belum ada rencana mengajar</p>}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl" style={{ background: 'var(--card-bg)', boxShadow: 'var(--shadow-lg)' }}>
            <div className="flex items-center justify-between px-4 py-3 border-b"><h3 className="text-sm font-bold">{editId ? 'Edit' : 'Tambah'} Rencana</h3><button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded-lg">✕</button></div>
            <form onSubmit={handleSubmit} className="p-4 space-y-3 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-gray-700 block mb-1">Tanggal</label><input type="date" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }} /></div>
                <div><label className="text-xs font-medium text-gray-700 block mb-1">Mapel</label>
                  <select value={form.mata_pelajaran_id} onChange={(e) => setForm({ ...form, mata_pelajaran_id: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }}>
                    <option value="">Pilih...</option>
                    {mapelList.map((m) => <option key={m.id} value={m.id}>{m.nama}</option>)}
                  </select></div>
              </div>
              <div><label className="text-xs font-medium text-gray-700 block mb-1">Topik</label><input value={form.topik} onChange={(e) => setForm({ ...form, topik: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }} required /></div>
              <div><label className="text-xs font-medium text-gray-700 block mb-1">Tujuan Pembelajaran</label><textarea value={form.tujuan_pembelajaran} onChange={(e) => setForm({ ...form, tujuan_pembelajaran: e.target.value })} rows={2} className="w-full rounded-lg px-3 py-2 text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }} /></div>
              <div><label className="text-xs font-medium text-gray-700 block mb-1">Kegiatan</label><textarea value={form.kegiatan} onChange={(e) => setForm({ ...form, kegiatan: e.target.value })} rows={2} className="w-full rounded-lg px-3 py-2 text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-gray-700 block mb-1">Media</label><input value={form.media} onChange={(e) => setForm({ ...form, media: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }} /></div>
                <div><label className="text-xs font-medium text-gray-700 block mb-1">Penilaian</label><input value={form.penilaian} onChange={(e) => setForm({ ...form, penilaian: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }} /></div>
              </div>
              <div><label className="text-xs font-medium text-gray-700 block mb-1">Catatan</label><textarea value={form.catatan} onChange={(e) => setForm({ ...form, catatan: e.target.value })} rows={2} className="w-full rounded-lg px-3 py-2 text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }} /></div>
              <div className="flex gap-2">
                <button type="button" onClick={() => handleToggleStatus({ id: editId! } as any)} className="rounded-xl px-4 py-2 text-sm font-semibold border border-gray-200">
                  Toggle Status
                </button>
              </div>
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
