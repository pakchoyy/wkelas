import { useState, useEffect } from 'react'
import { Plus, Upload, Settings, Search, Pencil, Trash2, X } from 'lucide-react'
import { useSiswaList, useFieldDefs } from '../../../hooks/useSiswa'
import { useAppStore } from '../../../stores/appStore'
import type { Siswa } from '../../../../shared/types'
import SiswaForm from './SiswaForm'
import KelolaField from './KelolaField'
import ImportData from './ImportData'
import ConfirmDialog from '../../../components/ConfirmDialog'

export default function DataSiswa() {
  const kelasId = useAppStore((s) => s.kelasAktifId) || 1
  const { data: siswa, loading, reload } = useSiswaList(kelasId)
  const { data: fields, reload: reloadFields } = useFieldDefs(kelasId)
  const [fieldValues, setFieldValues] = useState<Record<number, Record<number, string>>>({})
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editSiswa, setEditSiswa] = useState<Siswa | null>(null)
  const [fieldOpen, setFieldOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [hapus, setHapus] = useState<{ open: boolean; siswa: Siswa | null }>({ open: false, siswa: null })

  useEffect(() => {
    if (siswa.length === 0) return
    let cancelled = false
    ;(async () => {
      const entries = await Promise.all(
        siswa.map(async (s) => {
          const vals = await window.electronAPI.fieldVal.get(s.id)
          const map: Record<number, string> = {}
          for (const v of vals) {
            if (v.nilai) map[v.field_id] = v.nilai
          }
          return [s.id, map] as const
        })
      )
      if (!cancelled) setFieldValues(Object.fromEntries(entries))
    })()
    return () => { cancelled = true }
  }, [siswa])

  const filtered = siswa.filter((s) =>
    s.nama.toLowerCase().includes(search.toLowerCase()) ||
    (s.nis && s.nis.includes(search))
  )
  const isSearching = search.trim() !== ''

  const handleEdit = (s: Siswa) => {
    setEditSiswa(s)
    setFormOpen(true)
  }

  const confirmHapus = (s: Siswa) => setHapus({ open: true, siswa: s })

  const handleHapus = async () => {
    if (!hapus.siswa) return
    await window.electronAPI.siswa.delete(hapus.siswa.id)
    setHapus({ open: false, siswa: null })
    reload()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-xl font-bold">Data Siswa</h2>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFieldOpen(true)}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold border transition-all duration-200 active:scale-[0.98]"
            style={{ borderColor: 'var(--border)' }}
          >
            <Settings size={16} /> Kelola Field
          </button>
          <button
            onClick={() => setImportOpen(true)}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold border transition-all duration-200 active:scale-[0.98]"
            style={{ borderColor: 'var(--border)' }}
          >
            <Upload size={16} /> Import Data
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
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-light)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari berdasarkan nama atau NIS..."
            className="w-full rounded-lg pl-9 pr-9 py-2.5 text-sm border focus:outline-none focus:ring-2 focus:ring-[#0ea5a0]/30"
            style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }}
          />
          {isSearching && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <p className="text-xs mt-1.5" style={{ color: 'var(--text-light)' }}>
          {isSearching
            ? `${filtered.length} dari ${siswa.length} siswa`
            : `${siswa.length} siswa di kelas`}
        </p>
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
                  <td key={f.id} className="px-6 py-4" style={{ color: 'var(--text-light)' }}>
                    {fieldValues[s.id]?.[f.id] || '-'}
                  </td>
                ))}
                <td className="px-6 py-4 text-right whitespace-nowrap">
                  <button onClick={() => handleEdit(s)} className="p-1 hover:text-[#0ea5a0] transition-colors" title="Edit">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => confirmHapus(s)} className="p-1 hover:text-red-600 transition-colors ml-1" title="Hapus">
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && !loading && (
              <tr>
                <td colSpan={4 + fields.length} className="px-6 py-10 text-center text-sm" style={{ color: 'var(--text-light)' }}>
                  {isSearching ? 'Tidak ada siswa yang cocok dengan pencarian.' : 'Belum ada data siswa. Klik "Tambah" atau "Import Data".'}
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td colSpan={4 + fields.length} className="px-6 py-10 text-center text-sm" style={{ color: 'var(--text-light)' }}>
                  Memuat data...
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
          onClose={() => { setFieldOpen(false); reloadFields() }}
          onChanged={() => { setFieldOpen(false); reloadFields() }}
        />
      )}

      {importOpen && (
        <ImportData
          fields={fields}
          kelasId={kelasId}
          onClose={() => setImportOpen(false)}
          onImported={reload}
        />
      )}

      <ConfirmDialog
        open={hapus.open}
        title="Hapus Siswa"
        message={`Apakah Anda yakin ingin menghapus ${hapus.siswa?.nama}? Data akan diarsipkan.`}
        confirmText="Hapus"
        onCancel={() => setHapus({ open: false, siswa: null })}
        onConfirm={handleHapus}
      />
    </div>
  )
}
