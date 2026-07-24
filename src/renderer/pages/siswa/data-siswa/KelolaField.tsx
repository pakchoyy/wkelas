import { useState, useEffect } from 'react'
import { X, Plus, Pencil, Trash2, GripVertical } from 'lucide-react'
import { useFieldDefs } from '../../../hooks/useSiswa'
import type { SiswaFieldDefinition } from '../../../../shared/types'

interface Props {
  kelasId: number
  onClose: () => void
  onChanged: () => void
}

export default function KelolaField({ kelasId, onClose, onChanged }: Props) {
  const { data: fields, loading, reload } = useFieldDefs(kelasId)
  const [showForm, setShowForm] = useState(false)
  const [editField, setEditField] = useState<SiswaFieldDefinition | null>(null)
  const [form, setForm] = useState({ nama_field: '', slug: '', tipe: 'teks', pilihan: '', wajib: false, urutan: 0 })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (editField) {
      setForm({
        nama_field: editField.nama_field,
        slug: editField.slug,
        tipe: editField.tipe,
        pilihan: editField.pilihan || '',
        wajib: !!editField.wajib,
        urutan: editField.urutan,
      })
    }
  }, [editField])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const data = {
        kelas_id: kelasId,
        nama_field: form.nama_field,
        slug: form.slug || form.nama_field.toLowerCase().replace(/\s+/g, '_'),
        tipe: form.tipe,
        pilihan: form.tipe === 'dropdown' ? JSON.stringify(form.pilihan.split(',').map((s) => s.trim()).filter(Boolean)) : null,
        wajib: form.wajib ? 1 : 0,
        urutan: fields.length + 1,
      }

      if (editField) {
        await window.electronAPI.fieldDef.update(editField.id, { ...data, urutan: editField.urutan })
      } else {
        await window.electronAPI.fieldDef.create(data)
      }

      setShowForm(false)
      setEditField(null)
      resetForm()
      reload()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (f: SiswaFieldDefinition) => {
    if (!confirm(`Hapus field "${f.nama_field}"? Semua nilainya akan ikut terhapus.`)) return
    await window.electronAPI.fieldDef.delete(f.id)
    reload()
  }

  const resetForm = () => {
    setForm({ nama_field: '', slug: '', tipe: 'teks', pilihan: '', wajib: false, urutan: 0 })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl" style={{ background: 'var(--card-bg)', boxShadow: 'var(--shadow-lg)' }}>
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <h3 className="text-sm font-bold">Kelola Custom Field</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 max-h-[75vh] overflow-y-auto space-y-3">
          <button
            onClick={() => { setEditField(null); resetForm(); setShowForm(true) }}
            className="flex items-center gap-2 text-sm font-semibold text-[#0ea5a0] hover:underline"
          >
            <Plus size={16} /> Tambah Field Baru
          </button>

          {fields.map((f) => (
            <div key={f.id} className="flex items-center gap-3 rounded-xl p-3 border" style={{ borderColor: 'var(--border)' }}>
              <GripVertical size={16} className="text-gray-400" />
              <div className="flex-1">
                <div className="text-sm font-semibold">{f.nama_field}</div>
                <div className="text-xs" style={{ color: 'var(--text-light)' }}>
                  {f.tipe} {f.wajib ? '· Wajib' : ''} · Urutan {f.urutan}
                </div>
              </div>
              <button
                onClick={() => { setEditField(f); resetForm(); setShowForm(true) }}
                className="p-1 hover:text-[#0ea5a0] transition-colors"
              >
                <Pencil size={15} />
              </button>
              <button
                onClick={() => handleDelete(f)}
                className="p-1 hover:text-red-600 transition-colors"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}

          {fields.length === 0 && !loading && (
            <p className="text-sm text-center py-8" style={{ color: 'var(--text-light)' }}>
              Belum ada custom field. Klik "Tambah Field Baru" untuk mulai.
            </p>
          )}
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="px-4 pb-4 space-y-3 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Nama Field</label>
              <input
                value={form.nama_field}
                onChange={(e) => setForm({ ...form, nama_field: e.target.value })}
                className="w-full rounded-lg px-3 py-2 text-sm border focus:outline-none focus:ring-2 focus:ring-[#0ea5a0]/30"
                style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Tipe</label>
              <select
                value={form.tipe}
                onChange={(e) => setForm({ ...form, tipe: e.target.value })}
                className="w-full rounded-lg px-3 py-2 text-sm border focus:outline-none focus:ring-2 focus:ring-[#0ea5a0]/30"
                style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }}
              >
                <option value="teks">Teks</option>
                <option value="angka">Angka</option>
                <option value="tanggal">Tanggal</option>
                <option value="dropdown">Dropdown</option>
              </select>
            </div>
            {form.tipe === 'dropdown' && (
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Pilihan (pisah dengan koma)</label>
                <input
                  value={form.pilihan}
                  onChange={(e) => setForm({ ...form, pilihan: e.target.value })}
                  placeholder="Islam, Kristen, Katolik, Hindu, Buddha"
                  className="w-full rounded-lg px-3 py-2 text-sm border focus:outline-none focus:ring-2 focus:ring-[#0ea5a0]/30"
                  style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }}
                />
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="wajib"
                checked={form.wajib}
                onChange={(e) => setForm({ ...form, wajib: e.target.checked })}
                className="rounded"
              />
              <label htmlFor="wajib" className="text-sm">Wajib diisi</label>
            </div>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => { setShowForm(false); setEditField(null) }} className="text-sm px-4 py-2 rounded-xl border" style={{ borderColor: 'var(--border)' }}>Batal</button>
              <button type="submit" disabled={saving} className="text-sm px-4 py-2 rounded-xl text-white font-semibold" style={{ background: 'linear-gradient(135deg, #0ea5a0, #0d7a8a)' }}>
                {saving ? 'Menyimpan...' : editField ? 'Update' : 'Simpan'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
