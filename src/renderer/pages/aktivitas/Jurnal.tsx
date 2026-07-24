import { useState, useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useAppStore } from '../../stores/appStore'
import { todayISO } from '../../../shared/utils'

export default function Jurnal() {
  const kelasId = useAppStore((s) => s.kelasAktifId) || 1
  const [data, setData] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState({ tanggal: todayISO(), jam_ke: '', mata_pelajaran: '', materi: '', kegiatan: '', kendala: '', refleksi: '' })

  const load = async () => { setData(await window.electronAPI.jurnal.list(kelasId)) }
  useEffect(() => { load() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await window.electronAPI.jurnal.save({ ...form, kelas_id: kelasId, id: editId })
    setShowForm(false); setEditId(null)
    setForm({ tanggal: todayISO(), jam_ke: '', mata_pelajaran: '', materi: '', kegiatan: '', kendala: '', refleksi: '' })
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Jurnal Harian</h2>
        <button onClick={() => { setEditId(null); setForm({ tanggal: todayISO(), jam_ke: '', mata_pelajaran: '', materi: '', kegiatan: '', kendala: '', refleksi: '' }); setShowForm(true) }}
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg, #0ea5a0, #0d7a8a)' }}><Plus size={16} /> Tambah</button>
      </div>

      <div className="space-y-3">
        {data.map((item) => (
          <div key={item.id} className="rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow" style={{ background: 'var(--card-bg)', boxShadow: 'var(--shadow)' }}
            onClick={() => { setEditId(item.id); setForm(item); setShowForm(true) }}>
            <div className="flex items-start justify-between mb-1">
              <div><span className="text-sm font-semibold">{item.mata_pelajaran || 'Umum'}</span><span className="text-xs ml-2 text-gray-400">{item.tanggal}{item.jam_ke ? ` · Jam ${item.jam_ke}` : ''}</span></div>
              <button onClick={(e) => { e.stopPropagation(); if (confirm('Hapus?')) { window.electronAPI.jurnal.delete(item.id); load() } }} className="p-1 hover:text-red-600"><Trash2 size={14} /></button>
            </div>
            {item.materi && <p className="text-xs text-gray-600 mb-1">{item.materi}</p>}
            {item.kendala && <p className="text-xs text-gray-400">Kendala: {item.kendala}</p>}
          </div>
        ))}
        {data.length === 0 && <p className="text-sm text-center py-8 text-gray-400">Belum ada jurnal</p>}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl" style={{ background: 'var(--card-bg)', boxShadow: 'var(--shadow-lg)' }}>
            <div className="flex items-center justify-between px-4 py-3 border-b"><h3 className="text-sm font-bold">{editId ? 'Edit' : 'Tambah'} Jurnal</h3><button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded-lg">✕</button></div>
            <form onSubmit={handleSubmit} className="p-4 space-y-3 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-3 gap-3">
                <div><label className="text-xs font-medium text-gray-700 block mb-1">Tanggal</label><input type="date" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }} /></div>
                <div><label className="text-xs font-medium text-gray-700 block mb-1">Jam ke</label><input value={form.jam_ke} onChange={(e) => setForm({ ...form, jam_ke: e.target.value })} placeholder="1-2" className="w-full rounded-lg px-3 py-2 text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }} /></div>
                <div><label className="text-xs font-medium text-gray-700 block mb-1">Mapel</label><input value={form.mata_pelajaran} onChange={(e) => setForm({ ...form, mata_pelajaran: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }} /></div>
              </div>
              <div><label className="text-xs font-medium text-gray-700 block mb-1">Materi</label><textarea value={form.materi} onChange={(e) => setForm({ ...form, materi: e.target.value })} rows={2} className="w-full rounded-lg px-3 py-2 text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }} /></div>
              <div><label className="text-xs font-medium text-gray-700 block mb-1">Kegiatan</label><textarea value={form.kegiatan} onChange={(e) => setForm({ ...form, kegiatan: e.target.value })} rows={2} className="w-full rounded-lg px-3 py-2 text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }} /></div>
              <div><label className="text-xs font-medium text-gray-700 block mb-1">Kendala</label><textarea value={form.kendala} onChange={(e) => setForm({ ...form, kendala: e.target.value })} rows={2} className="w-full rounded-lg px-3 py-2 text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }} /></div>
              <div><label className="text-xs font-medium text-gray-700 block mb-1">Refleksi</label><textarea value={form.refleksi} onChange={(e) => setForm({ ...form, refleksi: e.target.value })} rows={2} className="w-full rounded-lg px-3 py-2 text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }} /></div>
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
