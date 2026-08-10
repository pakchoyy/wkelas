import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, GripVertical } from 'lucide-react'
import { useFieldDefs } from '../../../hooks/useSiswa'
import type { SiswaFieldDefinition } from '../../../../shared/types'
import Modal from '../../../components/Modal'
import ConfirmDialog from '../../../components/ConfirmDialog'

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
  const [hapus, setHapus] = useState<{ open: boolean; field: SiswaFieldDefinition | null }>({ open: false, field: null })

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
      onChanged()
    } finally {
      setSaving(false)
    }
  }

  const confirmHapus = (f: SiswaFieldDefinition) => setHapus({ open: true, field: f })

  const handleHapus = async () => {
    if (!hapus.field) return
    await window.electronAPI.fieldDef.delete(hapus.field.id)
    setHapus({ open: false, field: null })
    reload()
    onChanged()
  }

  const resetForm = () => {
    setForm({ nama_field: '', slug: '', tipe: 'teks', pilihan: '', wajib: false, urutan: 0 })
  }

  return (
    <Modal title="Kelola Custom Field" onClose={onClose}>
      <div className="space-y-3">
        <button
          onClick={() => { setEditField(null); resetForm(); setShowForm(true) }}
          className="flex items-center gap-2 text-sm font-semibold text-[#0ea5a0] hover:underline"
        >
          <Plus size={16} /> Tambah Field Baru
        </button>

        {fields.map((f) => (
          <div key={f.id} className="flex items-center gap-3 rounded-xl p-3 border" style={{ borderColor: 'var(--border)' }}>
            <GripVertical size={16} className="text-gray-400" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">{f.nama_field}</div>
              <div className="text-xs" style={{ color: 'var(--text-light)' }}>
                {f.tipe} {f.wajib ? '· Wajib' : ''} · Urutan {f.urutan}
              </div>
            </div>
            <button
              onClick={() => { setEditField(f); resetForm(); setShowForm(true) }}
              className="p-1 hover:text-[#0ea5a0] transition-colors"
              title="Edit"
            >
              <Pencil size={15} />
            </button>
            <button
              onClick={() => confirmHapus(f)}
              className="p-1 hover:text-red-600 transition-colors"
              title="Hapus"
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
        <form onSubmit={handleSubmit} className="mt-4 space-y-3 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
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
          <div className="flex gap-3 justify-end pt-1">
            <button type="button" onClick={() => { setShowForm(false); setEditField(null) }} className="text-sm px-4 py-2 rounded-xl border" style={{ borderColor: 'var(--border)' }}>Batal</button>
            <button type="submit" disabled={saving} className="text-sm px-4 py-2 rounded-xl text-white font-semibold" style={{ background: 'linear-gradient(135deg, #0ea5a0, #0d7a8a)' }}>
              {saving ? 'Menyimpan...' : editField ? 'Update' : 'Simpan'}
            </button>
          </div>
        </form>
      )}

      <ConfirmDialog
        open={hapus.open}
        title="Hapus Field"
        message={`Hapus field "${hapus.field?.nama_field}"? Semua nilainya akan ikut terhapus.`}
        confirmText="Hapus"
        onCancel={() => setHapus({ open: false, field: null })}
        onConfirm={handleHapus}
      />
    </Modal>
  )
}
