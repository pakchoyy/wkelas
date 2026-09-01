import { dropdownText, encodeDropdown } from '../../../../shared/dropdown'
import { useState, useRef } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
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
  const [error, setError] = useState('')
  const busyRef = useRef(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [hapus, setHapus] = useState<{ open: boolean; field: SiswaFieldDefinition | null }>({ open: false, field: null })

  const openEdit = (field: SiswaFieldDefinition) => {
    if (busyRef.current) return
    setError('')
    try {
      const pilihan = field.tipe === 'dropdown' ? dropdownText(field.pilihan) : ''
      setEditField(field)
      setForm({nama_field:field.nama_field,slug:field.slug,tipe:field.tipe,pilihan,wajib:!!field.wajib,urutan:field.urutan})
      setShowForm(true)
    } catch(error) { setError(error instanceof Error ? error.message : 'Kolom gagal dibuka.'); setShowForm(false); setEditField(null) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busyRef.current) return
    busyRef.current = true
    setError('')
    setSaving(true)
    try {
      if (!form.nama_field.trim()) throw new Error('Nama kolom wajib diisi.')
      const data = {
        kelas_id: kelasId,
        nama_field: form.nama_field.trim(),
        slug: form.slug || form.nama_field.trim().toLowerCase().replace(/\s+/g, '_'),
        tipe: form.tipe,
        pilihan: form.tipe === 'dropdown' ? encodeDropdown(form.pilihan) : null,
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
    } catch(error) { setError(error instanceof Error ? error.message : 'Kolom gagal disimpan. Silakan coba lagi.') } finally {
      busyRef.current = false
      setSaving(false)
    }
  }

  const confirmHapus = (f: SiswaFieldDefinition) => setHapus({ open: true, field: f })

  const handleHapus = async () => {
    if (!hapus.field || busyRef.current) return
    busyRef.current = true
    setError('')
    setDeleting(true)
    try {
      await window.electronAPI.fieldDef.delete(hapus.field.id)
      setHapus({ open: false, field: null })
      await reload()
      onChanged()
    } catch { setError('Kolom gagal dihapus. Silakan coba lagi.') } finally {
      busyRef.current = false
      setDeleting(false)
    }
  }

  const resetForm = () => {
    setError('')
    setForm({ nama_field: '', slug: '', tipe: 'teks', pilihan: '', wajib: false, urutan: 0 })
  }

  return (
    <Modal title="Atur Kolom Data Siswa" onClose={() => {if (!busyRef.current) onClose()}}>
      {error && <p role="alert" className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <fieldset disabled={saving || deleting} className="min-w-0">
      <div className="space-y-3">
        <p className="text-xs" style={{ color: 'var(--text-light)' }}>
          Tambahkan informasi yang ingin dicatat untuk setiap siswa, misalnya agama, alamat, atau nomor telepon orang tua.
        </p>

        {!showForm && <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
          <div className="text-xs font-bold text-slate-600 mb-2">Saran kolom yang umum dipakai</div>
          <div className="flex flex-wrap gap-2">{['NISN', 'Agama', 'Alamat', 'Nama Orang Tua', 'No. HP Orang Tua'].map((nama) => <button key={nama} onClick={() => { setEditField(null); setForm({ nama_field: nama, slug: '', tipe: 'teks', pilihan: '', wajib: false, urutan: 0 }); setShowForm(true) }} className="rounded-lg bg-white border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:border-emerald-300 hover:text-emerald-700">+ {nama}</button>)}</div>
        </div>}

        <button
          onClick={() => { setEditField(null); resetForm(); setShowForm(true) }}
          className="flex items-center gap-2 text-sm font-semibold text-[#0ea5a0] hover:underline"
        >
          <Plus size={16} /> Tambah Kolom Baru
        </button>

        {fields.map((f, i) => (
          <div key={f.id} className="flex items-center gap-3 rounded-xl p-3 border" style={{ borderColor: 'var(--border)' }}>
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ background: '#e7f6f5', color: '#0d7a8a' }}
            >
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">{f.nama_field}</div>
              <div className="text-xs" style={{ color: 'var(--text-light)' }}>
                {f.tipe} {f.wajib ? '· Wajib' : ''}
              </div>
            </div>
            <button
              onClick={() => openEdit(f)}
              className="p-1 hover:text-[#0ea5a0] transition-colors"
              title="Edit"
            >
              <Pencil size={15} />
            </button>
            <button
              onClick={() => confirmHapus(f)}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:text-red-700 hover:bg-red-50 transition-colors"
              title="Hapus"
            >
              <Trash2 size={14} /> Hapus
            </button>
          </div>
        ))}

        {fields.length === 0 && !loading && (
          <p className="text-sm text-center py-8" style={{ color: 'var(--text-light)' }}>
            Belum ada kolom tambahan. Klik "Tambah Kolom Baru" untuk mulai.
          </p>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-4 space-y-3 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Nama Kolom</label>
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
              <label className="text-sm font-medium text-gray-700 block mb-1">Pilihan (satu pilihan per baris)</label>
              <textarea
                rows={5}
                value={form.pilihan}
                onChange={(e) => setForm({ ...form, pilihan: e.target.value })}
                placeholder={"Islam\nKristen\nKatolik\nHindu\nBuddha"}
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
            <button type="submit" disabled={saving} className="text-sm px-4 py-2 rounded-xl text-white font-bold bg-emerald-600 hover:bg-emerald-700">
              {saving ? 'Menyimpan...' : editField ? 'Update' : 'Simpan'}
            </button>
          </div>
        </form>
      )}

      </fieldset>
      <ConfirmDialog
        open={hapus.open}
        title="Hapus Kolom"
        message={`Hapus kolom "${hapus.field?.nama_field}"? Semua nilainya akan ikut terhapus.`}
        confirmText={deleting ? 'Menghapus...' : 'Hapus'}
        onCancel={() => {if (!busyRef.current) setHapus({ open: false, field: null })}}
        onConfirm={handleHapus}
      />
    </Modal>
  )
}
