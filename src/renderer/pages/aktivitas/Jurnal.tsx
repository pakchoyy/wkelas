import { useEffect, useMemo, useState } from 'react'
import { Download, Pencil, Plus, Trash2 } from 'lucide-react'
import { useAppStore } from '../../stores/appStore'
import { todayISO } from '../../../shared/utils'
import { db } from '../../../lib/db'
import Modal from '../../components/Modal'

type Form = { tanggal: string; jam_ke: string; mata_pelajaran: string; materi: string; kegiatan: string; kendala: string; refleksi: string }
const blank = (): Form => ({ tanggal: todayISO(), jam_ke: '', mata_pelajaran: '', materi: '', kegiatan: '', kendala: '', refleksi: '' })
const dateLabel = (value: string) => new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(`${value}T12:00:00`))

export default function Jurnal() {
  const kelasId = useAppStore((s) => s.kelasAktifId) || 1
  const [data, setData] = useState<any[]>([])
  const [identity, setIdentity] = useState({ kelas: '-', semester: '-', tahun: '-', sekolah: '-', guru: '-' })
  const [month, setMonth] = useState(todayISO().slice(0, 7))
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState<Form>(blank())
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null)

  const load = async () => setData(await window.electronAPI.jurnal.list(kelasId))
  useEffect(() => {
    load()
    db.kelas.get(kelasId).then(async (kelas) => {
      if (!kelas) return
      const guru = await db.guru.get(kelas.guru_id)
      setIdentity({ kelas: kelas.nama_kelas, semester: String(kelas.semester), tahun: kelas.tahun_ajaran, sekolah: guru?.nama_sekolah || '-', guru: guru?.nama || '-' })
    })
  }, [kelasId])
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(null), 3000); return () => clearTimeout(timer) }, [toast])

  const rows = useMemo(() => data.filter((item) => item.tanggal?.startsWith(month)).sort((a, b) => a.tanggal.localeCompare(b.tanggal) || String(a.jam_ke || '').localeCompare(String(b.jam_ke || ''))), [data, month])
  const monthName = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date(`${month}-01T12:00:00`))
  const openNew = () => { setEditId(null); setForm({ ...blank(), tanggal: month === todayISO().slice(0, 7) ? todayISO() : `${month}-01` }); setShowForm(true) }
  const openEdit = (item: any) => { setEditId(item.id); setForm({ tanggal: item.tanggal || todayISO(), jam_ke: item.jam_ke || '', mata_pelajaran: item.mata_pelajaran || '', materi: item.materi || '', kegiatan: item.kegiatan || '', kendala: item.kendala || '', refleksi: item.refleksi || '' }); setShowForm(true) }

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    try { await window.electronAPI.jurnal.save({ ...form, kelas_id: kelasId, ...(editId ? { id: editId } : {}) }); setShowForm(false); await load(); setToast({ text: editId ? 'Jurnal berhasil diperbarui' : 'Jurnal berhasil ditambahkan' }) }
    catch { setToast({ text: 'Jurnal gagal disimpan', error: true }) }
  }
  const remove = async () => { if (!editId || !window.confirm('Hapus jurnal ini?')) return; await window.electronAPI.jurnal.delete(editId); setShowForm(false); await load(); setToast({ text: 'Jurnal berhasil dihapus' }) }
  const quickSave = async (item: any, field: 'materi' | 'kegiatan' | 'kendala' | 'refleksi', value: string) => { if ((item[field] || '') === value) return; await window.electronAPI.jurnal.save({ ...item, [field]: value }); await load(); setToast({ text: 'Jurnal tersimpan otomatis' }) }

  const exportExcel = async () => {
    const XLSX = await import('xlsx')
    const report = [['JURNAL HARIAN MENGAJAR GURU'], ['Sekolah', identity.sekolah, '', 'Bulan', monthName], ['Kelas', identity.kelas, '', 'Semester', identity.semester], ['Tahun Pelajaran', identity.tahun, '', 'Guru', identity.guru], [], ['No', 'Hari / Tanggal', 'Jam', 'Mata Pelajaran', 'Materi', 'Kegiatan Pembelajaran', 'Kendala', 'Refleksi'], ...rows.map((item, index) => [index + 1, dateLabel(item.tanggal), item.jam_ke || '', item.mata_pelajaran || '', item.materi || '', item.kegiatan || '', item.kendala || '', item.refleksi || ''])]
    const sheet = XLSX.utils.aoa_to_sheet(report); sheet['!cols'] = [{ wch: 5 }, { wch: 24 }, { wch: 9 }, { wch: 20 }, { wch: 28 }, { wch: 36 }, { wch: 24 }, { wch: 28 }]
    const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, sheet, 'Jurnal Harian'); XLSX.writeFile(workbook, `jurnal-harian-${identity.kelas}-${month}.xlsx`); setToast({ text: 'Laporan Excel berhasil dibuat' })
  }

  return <div className="space-y-4">
    {toast && <div className={`fixed left-1/2 top-20 z-[100] -translate-x-1/2 rounded-xl px-5 py-3 text-sm font-bold text-white shadow-xl ${toast.error ? 'bg-red-600' : 'bg-emerald-600'}`}>{toast.text}</div>}
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-extrabold text-slate-900">Jurnal Harian Mengajar</h2><p className="mt-1 text-sm text-slate-500">Dokumentasi pembelajaran dan bahan laporan guru.</p></div><div className="flex gap-2"><button onClick={exportExcel} disabled={!rows.length} className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-bold text-emerald-700 disabled:opacity-40"><Download size={17}/>Ekspor Excel</button><button onClick={openNew} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white"><Plus size={17}/>Tambah Jurnal</button></div></div>

    <section className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"><strong className="text-slate-800">{identity.sekolah}</strong><span className="text-slate-500">{identity.kelas} · Semester {identity.semester} · {identity.tahun}</span><span className="lg:ml-auto text-slate-500">Wali Kelas: <strong className="text-slate-700">{identity.guru}</strong></span></section>
    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3"><div><div className="text-xs font-bold uppercase tracking-wider text-slate-400">Periode Laporan</div><div className="mt-0.5 font-bold capitalize text-slate-800">{monthName}</div></div><input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="field !w-auto" /></div>

    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-xs"><thead><tr className="bg-slate-100 text-slate-600"><th className="px-2 py-3">No.</th><th className="px-3 py-3 text-left">Hari / Tanggal</th><th className="px-2 py-3">Jam</th><th className="px-3 py-3 text-left">Mata Pelajaran</th><th className="px-3 py-3 text-left">Materi</th><th className="px-3 py-3 text-left">Kegiatan Pembelajaran</th><th className="px-3 py-3 text-left">Kendala / Refleksi</th><th className="px-2 py-3">Aksi</th></tr></thead><tbody>{rows.map((item, index) => <tr key={item.id} className={`${index % 2 ? 'bg-slate-50/70' : 'bg-white'} border-t border-slate-100 align-top hover:bg-emerald-50/40`}><td className="px-2 py-3 text-center text-slate-400">{index + 1}</td><td className="px-3 py-3 font-semibold capitalize text-slate-700">{dateLabel(item.tanggal)}</td><td className="px-2 py-3 text-center">{item.jam_ke || '—'}</td><td className="px-3 py-3 font-bold text-slate-700">{item.mata_pelajaran || 'Umum'}</td><td className="px-2 py-2"><input defaultValue={item.materi || ''} onBlur={(e)=>quickSave(item,'materi',e.target.value)} placeholder="Isi materi" className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-xs outline-none hover:border-slate-200 focus:border-emerald-400 focus:bg-white"/></td><td className="px-2 py-2"><textarea defaultValue={item.kegiatan || ''} onBlur={(e)=>quickSave(item,'kegiatan',e.target.value)} placeholder="Isi kegiatan" rows={2} className="w-full resize-none rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-xs outline-none hover:border-slate-200 focus:border-emerald-400 focus:bg-white"/></td><td className="px-3 py-3 text-slate-600">{item.kendala && <div><strong>Kendala:</strong> {item.kendala}</div>}{item.refleksi && <div className="mt-1"><strong>Refleksi:</strong> {item.refleksi}</div>}{!item.kendala && !item.refleksi && '—'}</td><td className="px-2 py-3 text-center"><button onClick={() => openEdit(item)} className="rounded-lg p-2 text-slate-400 hover:bg-emerald-50 hover:text-emerald-700"><Pencil size={15}/></button></td></tr>)}</tbody></table></div>{rows.length === 0 && <div className="py-16 text-center"><div className="font-bold text-slate-600">Belum ada jurnal pada bulan ini</div><p className="mt-1 text-sm text-slate-400">Tambahkan jurnal atau buat dari Rencana Mengajar.</p></div>}</div>

    {showForm && <Modal title={editId ? 'Edit Jurnal Harian' : 'Tambah Jurnal Harian'} onClose={() => setShowForm(false)} maxWidth="max-w-2xl" footer={<>{editId && <button type="button" onClick={remove} className="mr-auto flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-bold text-red-600"><Trash2 size={16}/>Hapus</button>}<button type="submit" form="journal-form" className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white">Simpan Jurnal</button></>}><form id="journal-form" onSubmit={save} className="space-y-4"><div className="grid grid-cols-1 gap-3 sm:grid-cols-3"><label className="text-xs font-bold text-slate-600">Tanggal<input required type="date" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} className="field mt-1.5"/></label><label className="text-xs font-bold text-slate-600">Jam ke<input value={form.jam_ke} onChange={(e) => setForm({ ...form, jam_ke: e.target.value })} placeholder="1–2" className="field mt-1.5"/></label><label className="text-xs font-bold text-slate-600">Mata pelajaran<input required value={form.mata_pelajaran} onChange={(e) => setForm({ ...form, mata_pelajaran: e.target.value })} className="field mt-1.5"/></label></div><label className="block text-xs font-bold text-slate-600">Materi<input required value={form.materi} onChange={(e) => setForm({ ...form, materi: e.target.value })} className="field mt-1.5"/></label><label className="block text-xs font-bold text-slate-600">Kegiatan pembelajaran<textarea value={form.kegiatan} onChange={(e) => setForm({ ...form, kegiatan: e.target.value })} rows={3} className="field mt-1.5" placeholder="Pembukaan, inti, dan penutup"/></label><div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><label className="text-xs font-bold text-slate-600">Kendala <span className="font-normal text-slate-400">(opsional)</span><textarea value={form.kendala} onChange={(e) => setForm({ ...form, kendala: e.target.value })} rows={2} className="field mt-1.5"/></label><label className="text-xs font-bold text-slate-600">Refleksi <span className="font-normal text-slate-400">(opsional)</span><textarea value={form.refleksi} onChange={(e) => setForm({ ...form, refleksi: e.target.value })} rows={2} className="field mt-1.5"/></label></div></form></Modal>}
  </div>
}
