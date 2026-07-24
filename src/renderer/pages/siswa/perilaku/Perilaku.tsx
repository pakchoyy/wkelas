import { useState, useEffect } from 'react'
import { Plus, Trash2, Filter } from 'lucide-react'
import { useSiswaList } from '../../../hooks/useSiswa'
import { useAppStore } from '../../../stores/appStore'
import type { Perilaku as PerilakuType } from '../../../../shared/types'

export default function Perilaku() {
  const kelasId = useAppStore((s) => s.kelasAktifId) || 1
  const { data: siswa } = useSiswaList(kelasId)
  const [data, setData] = useState<PerilakuType[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ siswa_id: 0, tanggal: '', jenis: 'positif', kategori: '', deskripsi: '', tindak_lanjut: '' })

  const load = async () => {
    const res = await window.electronAPI.perilaku.list()
    setData(res)
  }

  useEffect(() => { load() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await window.electronAPI.perilaku.create({
      ...form,
      tanggal: form.tanggal || new Date().toISOString().split('T')[0],
    })
    setShowForm(false)
    setForm({ siswa_id: 0, tanggal: '', jenis: 'positif', kategori: '', deskripsi: '', tindak_lanjut: '' })
    load()
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus catatan ini?')) return
    await window.electronAPI.perilaku.delete(id)
    load()
  }

  const getSiswaName = (id: number) => siswa.find((s) => s.id === id)?.nama || 'Unknown'
  const getJenisColor = (j: string) => j === 'positif' ? '#16a34a' : '#dc2626'

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Catatan Perilaku</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-all duration-200 active:scale-[0.98]"
          style={{ background: 'linear-gradient(135deg, #0ea5a0, #0d7a8a)' }}
        >
          <Plus size={16} /> Tambah
        </button>
      </div>

      <div className="space-y-3">
        {data.map((item) => (
          <div key={item.id} className="rounded-xl p-4" style={{ background: 'var(--card-bg)', boxShadow: 'var(--shadow)' }}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <span className="text-sm font-semibold">{getSiswaName(item.siswa_id)}</span>
                <span className="text-xs ml-2" style={{ color: 'var(--text-light)' }}>{item.tanggal}</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full text-white"
                  style={{ background: getJenisColor(item.jenis) }}
                >
                  {item.jenis}
                </span>
                <button onClick={() => handleDelete(item.id)} className="p-1 hover:text-red-600 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <p className="text-sm mb-1">{item.deskripsi}</p>
            {item.kategori && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#f0f4f8', color: 'var(--text-light)' }}>
                {item.kategori}
              </span>
            )}
            {item.tindak_lanjut && (
              <p className="text-xs mt-2" style={{ color: 'var(--text-light)' }}>
                Tindak lanjut: {item.tindak_lanjut}
              </p>
            )}
          </div>
        ))}
        {data.length === 0 && (
          <p className="text-sm text-center py-8" style={{ color: 'var(--text-light)' }}>Belum ada catatan perilaku</p>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl" style={{ background: 'var(--card-bg)', boxShadow: 'var(--shadow-lg)' }}>
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
              <h3 className="text-sm font-bold">Tambah Catatan Perilaku</h3>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded-lg">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Siswa</label>
                <select
                  value={form.siswa_id}
                  onChange={(e) => setForm({ ...form, siswa_id: parseInt(e.target.value) })}
                  className="w-full rounded-lg px-3 py-2.5 text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }}
                  required
                >
                  <option value={0}>Pilih siswa</option>
                  {siswa.map((s) => <option key={s.id} value={s.id}>{s.nama}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Tanggal</label>
                  <input type="date" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
                    className="w-full rounded-lg px-3 py-2.5 text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Jenis</label>
                  <select value={form.jenis} onChange={(e) => setForm({ ...form, jenis: e.target.value })}
                    className="w-full rounded-lg px-3 py-2.5 text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }}>
                    <option value="positif">Positif</option>
                    <option value="negatif">Negatif</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Kategori</label>
                <input value={form.kategori} onChange={(e) => setForm({ ...form, kategori: e.target.value })}
                  placeholder="Kedisiplinan, Kerjasama, dll."
                  className="w-full rounded-lg px-3 py-2.5 text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Deskripsi</label>
                <textarea value={form.deskripsi} onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
                  className="w-full rounded-lg px-3 py-2.5 text-sm border" rows={3} style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }} required />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Tindak Lanjut</label>
                <input value={form.tindak_lanjut} onChange={(e) => setForm({ ...form, tindak_lanjut: e.target.value })}
                  className="w-full rounded-lg px-3 py-2.5 text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }} />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="rounded-xl px-4 py-2.5 text-sm font-semibold border" style={{ borderColor: 'var(--border)' }}>Batal</button>
                <button type="submit"
                  className="rounded-xl px-6 py-2.5 text-sm font-semibold text-white"
                  style={{ background: 'linear-gradient(135deg, #0ea5a0, #0d7a8a)' }}>Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
