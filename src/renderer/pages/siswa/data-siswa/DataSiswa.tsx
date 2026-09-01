import { useState, useEffect } from 'react'
import { Plus, Upload, Settings2, Search, Pencil, Trash2, X, Users, ChevronDown, CheckCircle2, AlertCircle } from 'lucide-react'
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
  const [sortBy, setSortBy] = useState('nama')
  const [kelasLabel, setKelasLabel] = useState('Kelas aktif')
  const [formOpen, setFormOpen] = useState(false)
  const [editSiswa, setEditSiswa] = useState<Siswa | null>(null)
  const [fieldOpen, setFieldOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [hapus, setHapus] = useState<{ open: boolean; siswa: Siswa | null }>({ open: false, siswa: null })
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

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
      if (kelas) setKelasLabel(`${/^kelas\s/i.test(kelas.nama_kelas) ? kelas.nama_kelas : `Kelas ${kelas.nama_kelas}`} · ${kelas.tahun_ajaran} · Semester ${kelas.semester}`)
    })
  }, [kelasId])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(timer)
  }, [toast])

  const filtered = siswa.filter((s) => {
    const q = search.toLowerCase().trim()
    const cocok = !q || s.nama.toLowerCase().includes(q) || (s.nis && s.nis.includes(q)) || String(s.no_absen || '').includes(q)
    return cocok && (!jkFilter || s.jenis_kelamin === jkFilter)
  }).sort((a, b) => sortBy === 'nama' ? a.nama.localeCompare(b.nama, 'id') : b.id - a.id)
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
    const nama = hapus.siswa.nama
    try {
      await window.electronAPI.siswa.delete(hapus.siswa.id)
      setHapus({ open: false, siswa: null })
      reload()
      setToast({ type: 'success', text: `${nama} berhasil dihapus dari daftar siswa.` })
    } catch {
      setToast({ type: 'error', text: `Gagal menghapus ${nama}. Silakan coba lagi.` })
    }
  }

  return (
    <div className="max-w-[1440px] mx-auto">
      <div className="flex items-start justify-between mb-5 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1"><Users size={20} className="text-emerald-600"/><h2 className="text-xl font-extrabold text-slate-900">Data Siswa</h2></div>
          <p className="text-sm text-slate-500">{kelasLabel}</p>
          <div className="flex flex-wrap gap-3 mt-2 text-xs font-semibold text-slate-500"><span>{siswa.length} siswa</span><span>•</span><span>{laki} laki-laki</span><span>•</span><span>{perempuan} perempuan</span></div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFieldOpen(true)}
            className="min-h-11 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          >
            <Settings2 size={16} /> Atur Kolom Data
          </button>
          <button
            onClick={() => setImportOpen(true)}
            className="min-h-11 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          >
            <Upload size={16} /> Import Data
          </button>
          <button
            onClick={() => { setEditSiswa(null); setFormOpen(true) }}
            className="min-h-11 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition active:scale-[0.98]"
          >
            <Plus size={16} /> Tambah Siswa
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 p-3 mb-4 flex flex-col md:flex-row gap-3 md:items-center">
        <div className="relative flex-1 max-w-xl">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-light)' }} />
          <input
            aria-label="Cari nama, NIS, atau nomor absen"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari berdasarkan nama atau NIS..."
            className="w-full rounded-xl pl-9 pr-11 py-2.5 text-base lg:text-sm border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              aria-label="Hapus pencarian"
              className="absolute right-0 top-1/2 -translate-y-1/2 size-11 grid place-items-center text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <SelectWrap><select aria-label="Filter jenis kelamin" value={jkFilter} onChange={(e) => setJkFilter(e.target.value)} className="min-h-11 w-full appearance-none rounded-xl pl-3 pr-9 py-2.5 text-base lg:text-sm border border-slate-200 bg-slate-50 text-slate-600 focus:bg-white focus:border-emerald-500 outline-none"><option value="">Semua JK</option><option value="L">Laki-laki</option><option value="P">Perempuan</option></select></SelectWrap>
        <SelectWrap><select aria-label="Urutan siswa" value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="min-h-11 w-full appearance-none rounded-xl pl-3 pr-9 py-2.5 text-base lg:text-sm border border-slate-200 bg-slate-50 text-slate-600 focus:bg-white focus:border-emerald-500 outline-none"><option value="nama">Urut A–Z</option><option value="terbaru">Siswa Terbaru</option></select></SelectWrap>
        <div className="md:ml-auto text-xs font-semibold text-slate-500 whitespace-nowrap">{isFiltering ? `${filtered.length} dari ${siswa.length}` : `${siswa.length} siswa`}</div>
      </div>

      <section className="lg:hidden space-y-3" aria-label="Daftar siswa">
        {loading ? <p role="status" className="p-6 text-center">Memuat data siswa...</p> : filtered.map(student => <article key={student.id} className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="font-bold text-slate-800 break-words">{student.nama}</h3>
          <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
            <dt className="text-slate-500">NIS</dt><dd className="break-words">{student.nis || 'Belum diisi'}</dd>
            <dt className="text-slate-500">Jenis kelamin</dt><dd>{student.jenis_kelamin === 'L' ? 'Laki-laki' : student.jenis_kelamin === 'P' ? 'Perempuan' : 'Belum diisi'}</dd>
            <dt className="text-slate-500">No. absen</dt><dd>{student.no_absen || 'Belum diisi'}</dd>
          </dl>
          {!!fields.length && <details className="mt-3 border-t border-slate-100"><summary className="min-h-11 py-3 cursor-pointer text-sm font-semibold text-teal-700">Data tambahan ({fields.length})</summary><dl className="space-y-3 text-sm">{fields.map(field => <div key={field.id}><dt className="text-slate-500 break-words">{field.nama_field}</dt><dd className="whitespace-pre-wrap break-words">{fieldValues[student.id]?.[field.id] || '—'}</dd></div>)}</dl></details>}
          <div className="mt-3 flex flex-wrap gap-3"><button onClick={() => handleEdit(student)} aria-label={`Edit data ${student.nama}`} className="min-h-11 rounded-xl bg-emerald-50 px-4 text-sm font-bold text-emerald-700">Edit siswa</button><button onClick={() => confirmHapus(student)} aria-label={`Hapus ${student.nama}`} className="min-h-11 rounded-xl border border-red-200 px-4 text-sm text-red-700">Hapus</button></div>
        </article>)}
        {!loading && !filtered.length && <div className="rounded-xl border border-dashed p-6 text-center text-sm text-slate-500"><p>{isFiltering ? 'Tidak ada siswa yang cocok dengan pencarian atau filter.' : 'Belum ada siswa. Gunakan Tambah Siswa atau Import Data di atas.'}</p>{isFiltering && <button onClick={() => { setSearch(''); setJkFilter('') }} className="mt-3 min-h-11 rounded-lg border px-4 font-semibold">Reset pencarian dan filter</button>}</div>}
      </section>
      <div className="hidden lg:block rounded-2xl overflow-hidden border border-slate-200 bg-white">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider bg-slate-50 text-slate-500 border-b border-slate-200">
              <th className="px-5 py-3.5 text-left font-bold whitespace-nowrap">No.</th>
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
              <tr key={s.id} className={`border-b border-slate-100 hover:bg-emerald-50/60 transition-colors ${i % 2 ? 'bg-slate-50/60' : 'bg-white'}`}>
                <td className="px-5 py-3.5 font-bold text-slate-600">{i + 1}</td>
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
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-red-700 hover:bg-red-50 transition-colors ml-1.5"
                  >
                    <Trash2 size={13} /> Hapus
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && !loading && (
              <tr>
                <td colSpan={5 + fields.length} className="px-6 py-10 text-center text-sm" style={{ color: 'var(--text-light)' }}>
                  {isFiltering ? 'Tidak ada siswa yang cocok dengan pencarian atau filter.' : <div className="py-5"><Users size={34} className="mx-auto mb-3 text-slate-300"/><div className="font-bold text-slate-700">Belum ada siswa di kelas ini</div><div className="text-xs mt-1">Tambahkan satu per satu atau impor sekaligus dari Excel.</div><div className="flex justify-center gap-2 mt-4"><button onClick={() => { setEditSiswa(null); setFormOpen(true) }} className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold">Tambah Siswa</button><button onClick={() => setImportOpen(true)} className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-600">Impor Excel</button></div></div>}
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td colSpan={5 + fields.length} className="px-6 py-10 text-center text-sm" style={{ color: 'var(--text-light)' }}>
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
          onSaved={() => { const editing = !!editSiswa; setFormOpen(false); setEditSiswa(null); reload(); setToast({ type: 'success', text: editing ? 'Data siswa berhasil diperbarui.' : 'Siswa baru berhasil ditambahkan.' }) }}
        />
      )}

      {fieldOpen && (
        <KelolaField
          kelasId={kelasId}
          onClose={() => { setFieldOpen(false); reloadFields() }}
          onChanged={() => { reloadFields(); setToast({ type: 'success', text: 'Kolom data siswa berhasil diperbarui.' }) }}
        />
      )}

      {importOpen && (
        <ImportData
          fields={fields}
          kelasId={kelasId}
          onClose={() => setImportOpen(false)}
          onImported={(result) => { reload(); setToast({type:result.gagal ? 'error' : 'success',text:`${result.ok} ditambahkan, ${result.dilewati || 0} dilewati, ${result.gagal} gagal.`}) }}
        />
      )}

      <ConfirmDialog
        open={hapus.open}
        title="Hapus Siswa"
        message={`Hapus ${hapus.siswa?.nama} dari daftar siswa? Tindakan ini akan menyembunyikan datanya dari kelas aktif.`}
        confirmText="Hapus"
        onCancel={() => setHapus({ open: false, siswa: null })}
        onConfirm={handleHapus}
      />
      {toast && <div className="fixed inset-x-0 top-6 z-[500] flex justify-center pointer-events-none px-4"><div className={`pointer-events-auto flex items-center gap-3 rounded-2xl border px-5 py-3.5 shadow-xl text-sm font-semibold ${toast.type === 'success' ? 'bg-white border-emerald-200 text-emerald-800' : 'bg-white border-red-200 text-red-800'}`}>{toast.type === 'success' ? <span className="w-8 h-8 rounded-full bg-emerald-100 grid place-items-center"><CheckCircle2 size={18}/></span> : <span className="w-8 h-8 rounded-full bg-red-100 grid place-items-center"><AlertCircle size={18}/></span>}<span>{toast.text}</span><button onClick={() => setToast(null)} className="ml-3 opacity-50 hover:opacity-100"><X size={15}/></button></div></div>}
    </div>
  )
}

function SelectWrap({ children }: { children: React.ReactNode }) {
  return <div className="relative inline-flex">{children}<ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" /></div>
}
