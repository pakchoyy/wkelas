import { useState } from 'react'
import { Plus, Upload, Settings, Search, Pencil, Trash2 } from 'lucide-react'
import { useSiswaList, useFieldDefs } from '../../../hooks/useSiswa'
import { useAppStore } from '../../../stores/appStore'
import type { Siswa } from '../../../../shared/types'
import SiswaForm from './SiswaForm'
import KelolaField from './KelolaField'

export default function DataSiswa() {
  const kelasId = useAppStore((s) => s.kelasAktifId) || 1
  const { data: siswa, loading, reload } = useSiswaList(kelasId)
  const { data: fields } = useFieldDefs(kelasId)
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editSiswa, setEditSiswa] = useState<Siswa | null>(null)
  const [fieldOpen, setFieldOpen] = useState(false)

  const filtered = siswa.filter((s) =>
    s.nama.toLowerCase().includes(search.toLowerCase()) ||
    (s.nis && s.nis.includes(search))
  )

  const handleEdit = (s: Siswa) => {
    setEditSiswa(s)
    setFormOpen(true)
  }

  const handleDelete = async (s: Siswa) => {
    if (!confirm(`Hapus ${s.nama}? Data akan diarsipkan.`)) return
    await window.electronAPI.siswa.delete(s.id)
    reload()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Data Siswa</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setFieldOpen(true)}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold border transition-all duration-200 active:scale-[0.98]"
            style={{ borderColor: 'var(--border)' }}
          >
            <Settings size={16} /> Kelola Field
          </button>
          <button
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-all duration-200 active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #0ea5a0, #0d7a8a)' }}
          >
            <Upload size={16} /> Import CSV
          </button>
          <button
            onClick={() => { setEditSiswa(null); setFormOpen(true) }}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-all duration-200 active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #0ea5a0, #0d7a8a)' }}
          >
            <Plus size={16} /> Tambah
          </button>
        </div>
      </div>

      <div className="mb-4">
        <div className="relative max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-light)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama / NIS..."
            className="w-full rounded-lg pl-9 pr-3 py-2 text-sm border focus:outline-none focus:ring-2 focus:ring-[#0ea5a0]/30"
            style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }}
          />
        </div>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--card-bg)', boxShadow: 'var(--shadow)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider" style={{ background: '#f8fafc' }}>
              <th className="px-6 py-4 text-left font-medium">No</th>
              <th className="px-6 py-4 text-left font-medium">Nama</th>
              <th className="px-6 py-4 text-left font-medium">NIS</th>
              <th className="px-6 py-4 text-left font-medium">JK</th>
              {fields.map((f) => (
                <th key={f.id} className="px-6 py-4 text-left font-medium">{f.nama_field}</th>
              ))}
              <th className="px-6 py-4 text-right font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s, i) => (
              <tr key={s.id} className="border-t hover:bg-gray-50/50 transition-colors" style={{ borderColor: 'var(--border)' }}>
                <td className="px-6 py-4">{s.no_absen || i + 1}</td>
                <td className="px-6 py-4 font-medium">{s.nama}</td>
                <td className="px-6 py-4" style={{ color: 'var(--text-light)' }}>{s.nis || '-'}</td>
                <td className="px-6 py-4">{s.jenis_kelamin || '-'}</td>
                {fields.map((f) => (
                  <td key={f.id} className="px-6 py-4" style={{ color: 'var(--text-light)' }}>-</td>
                ))}
                <td className="px-6 py-4 text-right">
                  <button onClick={() => handleEdit(s)} className="p-1 hover:text-[#0ea5a0] transition-colors">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => handleDelete(s)} className="p-1 hover:text-red-600 transition-colors ml-1">
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && !loading && (
              <tr>
                <td colSpan={4 + fields.length} className="px-6 py-8 text-center text-sm" style={{ color: 'var(--text-light)' }}>
                  Belum ada data siswa
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="px-6 py-3 text-xs border-t" style={{ color: 'var(--text-light)', borderColor: 'var(--border)' }}>
          Total: {filtered.length} siswa
        </div>
      </div>

      {formOpen && (
        <SiswaForm
          siswa={editSiswa}
          fields={fields}
          kelasId={kelasId}
          onClose={() => { setFormOpen(false); setEditSiswa(null) }}
          onSaved={() => { setFormOpen(false); setEditSiswa(null); reload() }}
        />
      )}

      {fieldOpen && (
        <KelolaField
          kelasId={kelasId}
          onClose={() => setFieldOpen(false)}
          onChanged={() => setFieldOpen(false)}
        />
      )}
    </div>
  )
}
