import { useState, useEffect } from 'react'
import type { Siswa, SiswaFieldDefinition } from '../../../../shared/types'
import Modal from '../../../components/Modal'

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
  const [error, setError] = useState('')

  useEffect(() => {
    if (siswa) {
      setForm({
        nama: siswa.nama,
        nis: siswa.nis || '',
        jenis_kelamin: siswa.jenis_kelamin || '',
        no_absen: siswa.no_absen?.toString() || '',
      })
      ;(async () => {
        const vals = await window.electronAPI.fieldVal.get(siswa.id)
        const map: Record<number, string> = {}
        for (const v of vals) {
          if (v.nilai) map[v.field_id] = v.nilai
        }
        setCustom(map)
      })()
    }
  }, [siswa])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
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
    } catch {
      setError('Data siswa gagal disimpan. Periksa kembali isian lalu coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      title={siswa ? 'Edit Siswa' : 'Tambah Siswa'}
      onClose={onClose}
      maxWidth="max-w-md"
      footer={
        <>
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
            form="siswa-form"
            disabled={loading}
            className="rounded-xl px-6 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? 'Menyimpan...' : 'Simpan'}
          </button>
        </>
      }
    >
      <form id="siswa-form" onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</div>}
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
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
      </form>
    </Modal>
  )
}
