import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import type { Siswa, SiswaFieldDefinition } from '../../../../shared/types'

interface Props {
  siswa?: Siswa | null
  fields: SiswaFieldDefinition[]
  kelasId: number
  onClose: () => void
  onSaved: () => void
}

export default function SiswaForm({ siswa, fields, kelasId, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    nama: '',
    nis: '',
    jenis_kelamin: '',
    no_absen: '',
  })
  const [custom, setCustom] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (siswa) {
      setForm({
        nama: siswa.nama,
        nis: siswa.nis || '',
        jenis_kelamin: siswa.jenis_kelamin || '',
        no_absen: siswa.no_absen?.toString() || '',
      })
    }
  }, [siswa])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const data = {
        kelas_id: kelasId,
        nama: form.nama,
        nis: form.nis || null,
        jenis_kelamin: form.jenis_kelamin || null,
        no_absen: form.no_absen ? parseInt(form.no_absen) : null,
      }

      let saved: Siswa
      if (siswa) {
        saved = await window.electronAPI.siswa.update(siswa.id, data)
      } else {
        saved = await window.electronAPI.siswa.create(data)
      }

      for (const [fieldId, nilai] of Object.entries(custom)) {
        await window.electronAPI.fieldVal.set(saved.id, parseInt(fieldId), nilai || null)
      }

      onSaved()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl" style={{ background: 'var(--card-bg)', boxShadow: 'var(--shadow-lg)' }}>
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <h3 className="text-sm font-bold">{siswa ? 'Edit Siswa' : 'Tambah Siswa'}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Nama <span className="text-red-500">*</span></label>
            <input
              value={form.nama}
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
              className="w-full rounded-lg px-3 py-2.5 text-sm border focus:outline-none focus:ring-2 focus:ring-[#0ea5a0]/30"
              style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }}
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">NIS</label>
              <input
                value={form.nis}
                onChange={(e) => setForm({ ...form, nis: e.target.value })}
                className="w-full rounded-lg px-3 py-2.5 text-sm border focus:outline-none focus:ring-2 focus:ring-[#0ea5a0]/30"
                style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">JK</label>
              <select
                value={form.jenis_kelamin}
                onChange={(e) => setForm({ ...form, jenis_kelamin: e.target.value })}
                className="w-full rounded-lg px-3 py-2.5 text-sm border focus:outline-none focus:ring-2 focus:ring-[#0ea5a0]/30"
                style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }}
              >
                <option value="">-</option>
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">No. Absen</label>
              <input
                type="number"
                value={form.no_absen}
                onChange={(e) => setForm({ ...form, no_absen: e.target.value })}
                className="w-full rounded-lg px-3 py-2.5 text-sm border focus:outline-none focus:ring-2 focus:ring-[#0ea5a0]/30"
                style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }}
              />
            </div>
          </div>

          {fields.map((f) => (
            <div key={f.id}>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                {f.nama_field}
                {f.wajib ? <span className="text-red-500"> *</span> : null}
              </label>
              {f.tipe === 'dropdown' ? (
                <select
                  value={custom[f.id] || ''}
                  onChange={(e) => setCustom({ ...custom, [f.id]: e.target.value })}
                  className="w-full rounded-lg px-3 py-2.5 text-sm border focus:outline-none focus:ring-2 focus:ring-[#0ea5a0]/30"
                  style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }}
                >
                  <option value="">-</option>
                  {JSON.parse(f.pilihan || '[]').map((p: string) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              ) : f.tipe === 'tanggal' ? (
                <input
                  type="date"
                  value={custom[f.id] || ''}
                  onChange={(e) => setCustom({ ...custom, [f.id]: e.target.value })}
                  className="w-full rounded-lg px-3 py-2.5 text-sm border focus:outline-none focus:ring-2 focus:ring-[#0ea5a0]/30"
                  style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }}
                />
              ) : (
                <input
                  type={f.tipe === 'angka' ? 'number' : 'text'}
                  value={custom[f.id] || ''}
                  onChange={(e) => setCustom({ ...custom, [f.id]: e.target.value })}
                  className="w-full rounded-lg px-3 py-2.5 text-sm border focus:outline-none focus:ring-2 focus:ring-[#0ea5a0]/30"
                  style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }}
                />
              )}
            </div>
          ))}

          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold border transition-all duration-200"
              style={{ borderColor: 'var(--border)' }}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl px-6 py-2.5 text-sm font-semibold text-white transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #0ea5a0, #0d7a8a)' }}
            >
              {loading ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
