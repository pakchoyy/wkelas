import { useState, useEffect } from 'react'
import { Plus, Pin, PinOff, Trash2 } from 'lucide-react'

export default function Catatan() {
  const [data, setData] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState({ judul: '', isi: '', tag: '', warna: '#ffffff', is_pinned: 0 })

  const load = async () => { setData(await window.electronAPI.catatan.list()) }
  useEffect(() => { load() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await window.electronAPI.catatan.save({ ...form, id: editId })
    setShowForm(false); setEditId(null)
    setForm({ judul: '', isi: '', tag: '', warna: '#ffffff', is_pinned: 0 })
    load()
  }

  const togglePin = async (item: any) => {
    await window.electronAPI.catatan.save({ ...item, is_pinned: item.is_pinned ? 0 : 1 })
    load()
  }

  const COLORS = ['#ffffff', '#fef2f2', '#fff7ed', '#fefce8', '#f0fdf4', '#ecfeff', '#eff6ff', '#faf5ff']

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Catatan Guru</h2>
        <button onClick={() => { setEditId(null); setForm({ judul: '', isi: '', tag: '', warna: '#ffffff', is_pinned: 0 }); setShowForm(true) }}
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg, #0ea5a0, #0d7a8a)' }}><Plus size={16} /> Tambah</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.map((item) => (
          <div key={item.id} className="rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow relative" style={{ background: item.warna || '#ffffff', boxShadow: 'var(--shadow)' }}
            onClick={() => { setEditId(item.id); setForm({ judul: item.judul, isi: item.isi || '', tag: item.tag || '', warna: item.warna || '#ffffff', is_pinned: item.is_pinned }); setShowForm(true) }}>
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-sm font-semibold">{item.judul}</h3>
              <div className="flex gap-1">
                <button onClick={(e) => { e.stopPropagation(); togglePin(item) }} className="p-1 hover:text-[#0ea5a0]">{item.is_pinned ? <PinOff size={14} /> : <Pin size={14} />}</button>
                <button onClick={(e) => { e.stopPropagation(); if (confirm('Hapus?')) { window.electronAPI.catatan.delete(item.id); load() } }} className="p-1 hover:text-red-600"><Trash2 size={14} /></button>
              </div>
            </div>
            {item.isi && <p className="text-xs text-gray-600 mb-2 line-clamp-3">{item.isi}</p>}
            {item.tag && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{item.tag}</span>}
          </div>
        ))}
        {data.length === 0 && <p className="text-sm text-center py-8 text-gray-400 col-span-full">Belum ada catatan</p>}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl" style={{ background: 'var(--card-bg)', boxShadow: 'var(--shadow-lg)' }}>
            <div className="flex items-center justify-between px-4 py-3 border-b"><h3 className="text-sm font-bold">{editId ? 'Edit' : 'Tambah'} Catatan</h3><button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded-lg">✕</button></div>
            <form onSubmit={handleSubmit} className="p-4 space-y-3">
              <div><label className="text-xs font-medium text-gray-700 block mb-1">Judul</label><input value={form.judul} onChange={(e) => setForm({ ...form, judul: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }} required /></div>
              <div><label className="text-xs font-medium text-gray-700 block mb-1">Isi</label><textarea value={form.isi} onChange={(e) => setForm({ ...form, isi: e.target.value })} rows={4} className="w-full rounded-lg px-3 py-2 text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }} /></div>
              <div><label className="text-xs font-medium text-gray-700 block mb-1">Tag</label><input value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })} placeholder="contoh: rapat, evaluasi" className="w-full rounded-lg px-3 py-2 text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }} /></div>
              <div><label className="text-xs font-medium text-gray-700 block mb-1">Warna</label>
                <div className="flex gap-2">
                  {COLORS.map((c) => (
                    <button key={c} type="button" onClick={() => setForm({ ...form, warna: c })} className={`w-7 h-7 rounded-lg border-2 transition-all ${form.warna === c ? 'border-[#0ea5a0]' : 'border-transparent'}`} style={{ background: c }} />
                  ))}
                </div>
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
