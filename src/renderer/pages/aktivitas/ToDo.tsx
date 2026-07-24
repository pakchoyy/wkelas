import { useState, useEffect } from 'react'
import { Plus, Trash2, Circle, CheckCircle2 } from 'lucide-react'
import { todayISO } from '../../../shared/utils'

export default function ToDo() {
  const [data, setData] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState({ judul: '', deskripsi: '', prioritas: 'normal', deadline: '' })

  const load = async () => { setData(await window.electronAPI.todo.list()) }
  useEffect(() => { load() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await window.electronAPI.todo.save({ ...form, id: editId })
    setShowForm(false); setEditId(null)
    setForm({ judul: '', deskripsi: '', prioritas: 'normal', deadline: '' })
    load()
  }

  const toggleDone = async (id: number) => {
    await window.electronAPI.todo.toggle(id)
    load()
  }

  const prioritasWarna: Record<string, string> = { rendah: '#6b7280', normal: '#0ea5a0', tinggi: '#dc2626' }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">ToDo</h2>
        <button onClick={() => { setEditId(null); setForm({ judul: '', deskripsi: '', prioritas: 'normal', deadline: '' }); setShowForm(true) }}
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg, #0ea5a0, #0d7a8a)' }}><Plus size={16} /> Tambah</button>
      </div>

      <div className="space-y-2">
        {data.map((item) => (
          <div key={item.id} className="rounded-xl p-4 flex items-start gap-3" style={{ background: 'var(--card-bg)', boxShadow: 'var(--shadow)', opacity: item.status === 'selesai' ? 0.6 : 1 }}>
            <button onClick={() => toggleDone(item.id)} className="mt-0.5 text-gray-400 hover:text-[#0ea5a0] transition-colors">
              {item.status === 'selesai' ? <CheckCircle2 size={20} className="text-green-500" /> : <Circle size={20} />}
            </button>
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <span className={`text-sm font-semibold ${item.status === 'selesai' ? 'line-through text-gray-400' : ''}`}>{item.judul}</span>
                <div className="flex gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ background: prioritasWarna[item.prioritas] || '#6b7280' }}>{item.prioritas}</span>
                  <button onClick={() => { if (confirm('Hapus?')) { window.electronAPI.todo.delete(item.id); load() } }} className="p-1 hover:text-red-600"><Trash2 size={14} /></button>
                </div>
              </div>
              {item.deskripsi && <p className="text-xs text-gray-500 mt-1">{item.deskripsi}</p>}
              {item.deadline && <span className="text-xs text-gray-400 mt-1 block">Deadline: {item.deadline}</span>}
            </div>
          </div>
        ))}
        {data.length === 0 && <p className="text-sm text-center py-8 text-gray-400">Belum ada tugas</p>}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl" style={{ background: 'var(--card-bg)', boxShadow: 'var(--shadow-lg)' }}>
            <div className="flex items-center justify-between px-4 py-3 border-b"><h3 className="text-sm font-bold">{editId ? 'Edit' : 'Tambah'} ToDo</h3><button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded-lg">✕</button></div>
            <form onSubmit={handleSubmit} className="p-4 space-y-3">
              <div><label className="text-xs font-medium text-gray-700 block mb-1">Judul</label><input value={form.judul} onChange={(e) => setForm({ ...form, judul: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }} required /></div>
              <div><label className="text-xs font-medium text-gray-700 block mb-1">Deskripsi</label><textarea value={form.deskripsi} onChange={(e) => setForm({ ...form, deskripsi: e.target.value })} rows={2} className="w-full rounded-lg px-3 py-2 text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-gray-700 block mb-1">Prioritas</label>
                  <select value={form.prioritas} onChange={(e) => setForm({ ...form, prioritas: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }}>
                    <option value="rendah">Rendah</option>
                    <option value="normal">Normal</option>
                    <option value="tinggi">Tinggi</option>
                  </select></div>
                <div><label className="text-xs font-medium text-gray-700 block mb-1">Deadline</label><input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }} /></div>
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
