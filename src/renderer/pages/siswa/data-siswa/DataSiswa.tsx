import { useState, useEffect } from 'react'
import { Plus, Upload, Settings2, Search, Pencil, Archive, X, Users } from 'lucide-react'
import { db } from '../../../../lib/db'
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
  const [jkFilter, setJkFilter] = useState('')
  const [sortBy, setSortBy] = useState('absen')
  const [kelasLabel, setKelasLabel] = useState('Kelas aktif')
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

  useEffect(() => {
    db.kelas.get(kelasId).then((kelas) => {
      if (kelas) setKelasLabel(`${kelas.nama_kelas} · ${kelas.tahun_ajaran} · Semester ${kelas.semester}`)
    })
  }, [kelasId])

  const filtered = siswa.filter((s) => {
    const q = search.toLowerCase().trim()
    const cocok = !q || s.nama.toLowerCase().includes(q) || (s.nis && s.nis.includes(q)) || String(s.no_absen || '').includes(q)
    return cocok && (!jkFilter || s.jenis_kelamin === jkFilter)
  }).sort((a, b) => sortBy === 'nama' ? a.nama.localeCompare(b.nama) : sortBy === 'terbaru' ? b.id - a.id : (a.no_absen || 9999) - (b.no_absen || 9999))
  const isFiltering = search.trim() !== '' || jkFilter !== ''
  const laki = siswa.filter((s) => s.jenis_kelamin === 'L').length
  const perempuan = siswa.filter((s) => s.jenis_kelamin === 'P').length

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
    <div className="max-w-[1440px] mx-auto">
      <div className="flex items-start justify-between mb-5 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1"><Users size={20} className="text-emerald-600"/><h2 className="text-xl font-extrabold text-slate-900">Data Siswa</h2></div>
          <p className="text-sm text-slate-500">{kelasLabel}</p>
          <div className="flex gap-3 mt-2 text-xs font-semibold text-slate-500"><span>{siswa.length} siswa</span><span>•</span><span>{laki} laki-laki</span><span>•</span><span>{perempuan} perempuan</span></div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFieldOpen(true)}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          >
            <Settings2 size={16} /> Kolom Tambahan
          </button>
          <button
            onClick={() => setImportOpen(true)}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          >
            <Upload size={16} /> Import Data
          </button>
          <button
            onClick={() => { setEditSiswa(null); setFormOpen(true) }}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition active:scale-[0.98]"
          >
            <Plus size={16} /> Tambah Siswa
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 p-3 mb-4 flex flex-col md:flex-row gap-3 md:items-center">
        <div className="relative flex-1 max-w-xl">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-light)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari berdasarkan nama atau NIS..."
            className="w-full rounded-xl pl-9 pr-9 py-2.5 text-sm border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <select value={jkFilter} onChange={(e) => setJkFilter(e.target.value)} className="rounded-xl px-3 py-2.5 text-sm border border-slate-200 bg-white text-slate-600"><option value="">Semua JK</option><option value="L">Laki-laki</option><option value="P">Perempuan</option></select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="rounded-xl px-3 py-2.5 text-sm border border-slate-200 bg-white text-slate-600"><option value="absen">Urut No. Absen</option><option value="nama">Urut Nama</option><option value="terbaru">Siswa Terbaru</option></select>
        <div className="md:ml-auto text-xs font-semibold text-slate-500 whitespace-nowrap">{isFiltering ? `${filtered.length} dari ${siswa.length}` : `${siswa.length} siswa`}</div>
      </div>

      <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider bg-slate-50 text-slate-500 border-b border-slate-200">
              <th className="px-5 py-3.5 text-left font-bold whitespace-nowrap">No. Absen</th>
              <th className="px-6 py-3.5 text-left font-bold">Nama</th>
              <th className="px-6 py-3.5 text-left font-bold">NIS</th>
              <th className="px-6 py-3.5 text-left font-bold">JK</th>
              {fields.map((f) => (
                <th key={f.id} className="px-6 py-3.5 text-left font-bold">{f.nama_field}</th>
              ))}
              <th className="px-6 py-3.5 text-right font-bold">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s, i) => (
              <tr key={s.id} className="border-b border-slate-100 bg-white hover:bg-emerald-50/40 transition-colors">
                <td className="px-5 py-3.5 font-bold text-slate-600">{s.no_absen || <span className="text-amber-500" title="Nomor absen belum diisi">—</span>}</td>
                <td className="px-6 py-3.5 font-semibold text-slate-800">{s.nama}</td>
                <td className="px-6 py-3.5" style={{ color: 'var(--text-light)' }}>{s.nis || '-'}</td>
                <td className="px-6 py-3.5">{s.jenis_kelamin || '-'}</td>
                {fields.map((f) => (
                  <td key={f.id} className="px-6 py-3.5" style={{ color: 'var(--text-light)' }}>
                    {fieldValues[s.id]?.[f.id] || '-'}
                  </td>
                ))}
                <td className="px-6 py-3.5 text-right whitespace-nowrap">
                  <button
                    onClick={() => handleEdit(s)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                  >
                    <Pencil size={13} /> Edit
                  </button>
                  <button
                    onClick={() => confirmHapus(s)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-amber-700 hover:bg-amber-50 transition-colors ml-1.5"
                  >
                    <Archive size={13} /> Arsipkan
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && !loading && (
              <tr>
                <td colSpan={4 + fields.length} className="px-6 py-10 text-center text-sm" style={{ color: 'var(--text-light)' }}>
                  {isFiltering ? 'Tidak ada siswa yang cocok dengan pencarian atau filter.' : <div className="py-5"><Users size={34} className="mx-auto mb-3 text-slate-300"/><div className="font-bold text-slate-700">Belum ada siswa di kelas ini</div><div className="text-xs mt-1">Tambahkan satu per satu atau impor sekaligus dari Excel.</div><div className="flex justify-center gap-2 mt-4"><button onClick={() => { setEditSiswa(null); setFormOpen(true) }} className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold">Tambah Siswa</button><button onClick={() => setImportOpen(true)} className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-600">Impor Excel</button></div></div>}
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
        </table></div>
        <div className="px-5 py-3 text-xs border-t border-slate-100 font-semibold text-slate-500 bg-slate-50">Menampilkan {filtered.length} siswa</div>
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
        title="Arsipkan Siswa"
        message={`Arsipkan ${hapus.siswa?.nama}? Siswa tidak akan tampil di daftar aktif.`}
        confirmText="Arsipkan"
        onCancel={() => setHapus({ open: false, siswa: null })}
        onConfirm={handleHapus}
      />
    </div>
  )
}
