import DateNavigator from '../../../components/DateNavigator'
import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, CalendarDays, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Heart, History, Search, Sparkles, Trash2, X } from 'lucide-react'
import { useSiswaList } from '../../../hooks/useSiswa'
import { useAppStore } from '../../../stores/appStore'
import { todayISO } from '../../../../shared/utils'
import type { Perilaku as PerilakuType } from '../../../../shared/types'
import ConfirmDialog from '../../../components/ConfirmDialog'
import { db } from '../../../../lib/db'

const categories = {
  positif: ['Disiplin', 'Membantu Teman', 'Tanggung Jawab', 'Kerja Sama', 'Prestasi', 'Lainnya'],
  perhatian: ['Terlambat', 'Tidak Mengerjakan Tugas', 'Mengganggu Kelas', 'Tidak Disiplin', 'Berkata Tidak Sopan', 'Lainnya'],
}
const initials = (name: string) => name.split(/\s+/).slice(0, 2).map((x) => x[0]).join('').toUpperCase()
const addDays = (date: string, amount: number) => { const d = new Date(`${date}T12:00:00`); d.setDate(d.getDate() + amount); return todayISO(d) }
const longDate = (date: string) => new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${date}T12:00:00`))

export default function Perilaku() {
  const kelasId = useAppStore((s) => s.kelasAktifId) || 1
  return <PerilakuKelas key={kelasId} kelasId={kelasId}/>
}

function PerilakuKelas({kelasId}: {kelasId:number}) {
  const [loadError, setLoadError] = useState('')
  const { data: rawSiswa, loading } = useSiswaList(kelasId)
  const siswa = useMemo(() => [...rawSiswa].sort((a, b) => a.nama.localeCompare(b.nama, 'id')), [rawSiswa])
  const [records, setRecords] = useState<PerilakuType[]>([])
  const [tab, setTab] = useState<'hari' | 'riwayat'>('hari')
  const [tanggal, setTanggal] = useState(todayISO())
  const [activeId, setActiveId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [filterJenis, setFilterJenis] = useState('')
  const [form, setForm] = useState({ jenis: 'positif', kategori: '', deskripsi: '', tindak_lanjut: '' })
  const [saving, setSaving] = useState(false)
  const [deleteItem, setDeleteItem] = useState<PerilakuType | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [hariSekolah, setHariSekolah] = useState<5 | 6>(5)
  const [holidays, setHolidays] = useState<any[]>([])

  const load = async () => { const all = await window.electronAPI.perilaku.list(); const ids = new Set(siswa.map((s) => s.id)); setRecords(all.filter((r: PerilakuType) => ids.has(r.siswa_id))) }
  useEffect(() => {
    let cancelled = false
    setRecords([]); setLoadError(''); setActiveId(null)
    if (siswa.length) window.electronAPI.perilaku.list().then(all => {
      if (!cancelled) { const ids = new Set(siswa.map(s => s.id)); setRecords(all.filter(r => ids.has(r.siswa_id))) }
    }).catch(() => { if (!cancelled) setLoadError('Catatan gagal dimuat. Muat ulang halaman untuk mencoba lagi.') })
    return () => { cancelled = true }
  }, [siswa])
  useEffect(() => { db.pengaturan.get(`presensi_${kelasId}`).then((x) => { if (x?.value) try { setHariSekolah(JSON.parse(x.value).hariSekolah || 5) } catch {} }); window.electronAPI.kalender.list(kelasId).then(setHolidays) }, [kelasId])
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 3500); return () => clearTimeout(t) }, [toast])
  const nameOf = (id: number) => siswa.find((s) => s.id === id)?.nama || 'Siswa'
  const todayRecords = records.filter((r) => r.tanggal === tanggal)
  const filteredSiswa = siswa.filter((s) => s.nama.toLowerCase().includes(search.toLowerCase()))
  const history = records.filter((r) => (!filterJenis || r.jenis === filterJenis) && nameOf(r.siswa_id).toLowerCase().includes(search.toLowerCase()))
  const selectedDay = new Date(`${tanggal}T12:00:00`).getDay()
  const holiday = holidays.find((item) => ['libur_nasional','libur_sekolah'].includes(item.jenis) && tanggal >= item.tanggal_mulai && tanggal <= (item.tanggal_selesai || item.tanggal_mulai))
  const isSchoolDay = selectedDay >= 1 && selectedDay <= hariSekolah && !holiday

  const openStudent = (id: number) => { setActiveId(activeId === id ? null : id); setForm({ jenis: 'positif', kategori: '', deskripsi: '', tindak_lanjut: '' }) }
  const save = async () => {
    if (!activeId || !form.kategori) { setToast({ type: 'error', text: 'Pilih kategori perilaku terlebih dahulu.' }); return }
    setSaving(true)
    try { await window.electronAPI.perilaku.create({ siswa_id: activeId, tanggal, jenis: form.jenis, kategori: form.kategori, deskripsi: form.deskripsi || form.kategori, tindak_lanjut: form.tindak_lanjut || undefined }); await load(); setActiveId(null); setToast({ type: 'success', text: `Catatan ${nameOf(activeId)} berhasil disimpan.` }) }
    catch { setToast({ type: 'error', text: 'Catatan perilaku gagal disimpan.' }) } finally { setSaving(false) }
  }
  const remove = async () => { if (!deleteItem) return; try { await window.electronAPI.perilaku.delete(deleteItem.id); setDeleteItem(null); await load(); setToast({ type: 'success', text: 'Catatan berhasil dihapus.' }) } catch { setToast({ type: 'error', text: 'Catatan gagal dihapus.' }) } }

  return <div className="max-w-5xl mx-auto pb-16">{loadError && <p role="alert" className="mb-3 text-red-700">{loadError}</p>}
    <h1 className="mb-3 flex items-center gap-2 text-xl font-extrabold text-slate-900"><Heart size={21} className="text-teal-700"/>Catatan Perilaku</h1>
    <div className="flex max-w-full gap-1 rounded-xl p-1 w-fit mb-4"><button aria-pressed={tab === 'hari'} onClick={() => setTab('hari')} className={`tab-mint min-h-11 px-3 sm:px-4 py-2 rounded-lg text-sm font-bold ${tab === 'hari' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'}`}>Catatan Hari Ini</button><button aria-pressed={tab === 'riwayat'} onClick={() => setTab('riwayat')} className={`tab-teal min-h-11 px-3 sm:px-4 py-2 rounded-lg text-sm font-bold ${tab === 'riwayat' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'}`}>Riwayat & Rekap</button></div>
    {tab === 'hari' && <div className="mb-3"><DateNavigator direct value={tanggal} label={longDate(tanggal)} onChange={setTanggal} onPrevious={()=>setTanggal(addDays(tanggal,-1))} onNext={()=>setTanggal(addDays(tanggal,1))} nextDisabled={tanggal>=todayISO()} max={todayISO()}/></div>}

    {tab === 'hari' ? <>{!isSchoolDay ? <div className="rounded-2xl bg-amber-50 border border-amber-200 text-center px-5 py-12"><CalendarDays size={34} className="mx-auto text-amber-500 mb-3"/><div className="font-extrabold text-amber-900">{holiday?.judul || 'Hari Libur Sekolah'}</div><p className="text-sm text-amber-700 mt-1">Daftar siswa tidak ditampilkan karena tanggal ini bukan hari efektif belajar.</p></div> : <>
      <p className="mb-3 text-xs text-slate-500">Pilih siswa untuk menambah catatan.</p>
      <div className="relative mb-4"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input aria-label="Cari nama siswa" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari siswa..." className="w-full field" style={{ paddingLeft: '2.25rem' }}/></div>
      {!loading && !filteredSiswa.length && <p className="p-6 text-center text-sm text-slate-500">{siswa.length ? 'Tidak ada siswa yang cocok dengan pencarian.' : 'Tambahkan siswa melalui menu Data Siswa.'}</p>}
      {loading ? <div className="py-16 text-center text-slate-400">Memuat siswa...</div> : <div className="space-y-3">{filteredSiswa.map((s, index) => { const own = todayRecords.filter((r) => r.siswa_id === s.id); const open = activeId === s.id; return <div key={s.id} className={`rounded-2xl bg-white border overflow-hidden shadow-sm ${own.length ? 'border-l-4 border-l-emerald-500 border-slate-200' : 'border-slate-200'}`}><button onClick={() => openStudent(s.id)} aria-expanded={open} className="w-full px-3 py-2 flex items-center gap-3 text-left"><div className="w-11 h-11 shrink-0 rounded-full bg-gradient-to-br from-teal-500 to-cyan-700 text-white grid place-items-center font-extrabold">{initials(s.nama)}</div><div className="flex-1 min-w-0"><div className="font-extrabold text-slate-900 break-words">{s.nama}</div><div className="text-sm text-slate-400 mt-0.5">No. {index + 1}</div></div>{own.length ? <div className="shrink-0 text-right"><span className="rounded-full bg-emerald-100 text-emerald-700 px-3 py-1.5 text-xs font-bold">{own.length} catatan</span></div> : <span className="shrink-0 rounded-full bg-teal-100 text-teal-800 px-3 py-1.5 text-xs font-bold">+ Catat</span>}</button>
        {own.length > 0 && <div className="px-5 pb-3 flex flex-wrap gap-2">{own.map((r) => <span key={r.id} className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${r.jenis === 'positif' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{r.kategori}</span>)}</div>}
        {open && <div className="border-t border-slate-100 bg-slate-50/70 p-5 space-y-4"><div className="flex flex-wrap gap-2"><button aria-pressed={form.jenis === 'positif'} onClick={() => setForm({ ...form, jenis: 'positif', kategori: '' })} className={`min-h-11 rounded-xl px-4 py-2 text-sm font-bold ${form.jenis === 'positif' ? 'bg-emerald-700 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>Positif</button><button aria-pressed={form.jenis === 'perhatian'} onClick={() => setForm({ ...form, jenis: 'perhatian', kategori: '' })} className={`min-h-11 rounded-xl px-4 py-2 text-sm font-bold ${form.jenis === 'perhatian' ? 'bg-amber-700 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>Perlu Perhatian</button></div><div><div className="text-xs font-bold text-slate-500 mb-2">Pilih kategori</div><div className="flex flex-wrap gap-2">{categories[form.jenis as keyof typeof categories].map((x) => <button key={x} aria-pressed={form.kategori === x} onClick={() => setForm({ ...form, kategori: x })} className={`min-h-11 rounded-lg border px-3 py-2 text-sm font-semibold ${form.jenis === 'positif' ? (form.kategori === x ? 'border-emerald-700 bg-emerald-700 text-white' : 'bg-white border-slate-200 text-slate-600') : (form.kategori === x ? 'border-amber-700 bg-amber-700 text-white' : 'bg-white border-slate-200 text-slate-600')}`}>{x}</button>)}</div></div><textarea aria-label="Keterangan kejadian (opsional)" value={form.deskripsi} onChange={(e) => setForm({ ...form, deskripsi: e.target.value })} placeholder="Keterangan kejadian (opsional)" rows={2} className="field resize-none"/><input aria-label="Tindak lanjut (opsional)" value={form.tindak_lanjut} onChange={(e) => setForm({ ...form, tindak_lanjut: e.target.value })} placeholder="Tindak lanjut (opsional)" className="field"/><div className="flex justify-end"><button onClick={save} disabled={saving || !form.kategori} className="action-primary rounded-xl bg-emerald-600 text-white px-5 py-2.5 text-sm font-bold disabled:opacity-40">{saving ? 'Menyimpan...' : 'Simpan Catatan'}</button></div></div>}
      </div>})}</div>}
    </>}</> : <HistoryView records={history} siswa={siswa} search={search} setSearch={setSearch} filter={filterJenis} setFilter={setFilterJenis} onDelete={setDeleteItem}/>} 
    <ConfirmDialog open={!!deleteItem} title="Hapus Catatan Perilaku" message={`Hapus catatan ${deleteItem?.kategori || ''} milik ${deleteItem ? nameOf(deleteItem.siswa_id) : ''}?`} onCancel={() => setDeleteItem(null)} onConfirm={remove}/>
    {toast && <div className="fixed inset-x-0 top-6 z-[500] flex justify-center pointer-events-none px-4"><div className={`pointer-events-auto flex items-center gap-3 rounded-2xl border bg-white px-5 py-3.5 shadow-xl text-sm font-semibold ${toast.type === 'success' ? 'border-emerald-200 text-emerald-800' : 'border-red-200 text-red-800'}`}>{toast.type === 'success' ? <CheckCircle2 size={19}/> : <AlertCircle size={19}/>}<span>{toast.text}</span><button aria-label="Tutup pemberitahuan" onClick={() => setToast(null)}><X size={15}/></button></div></div>}
  </div>
}

function HistoryView({ records, siswa, search, setSearch, filter, setFilter, onDelete }: any) {
  const name = (id: number) => siswa.find((s: any) => s.id === id)?.nama || 'Siswa'
  const positif = records.filter((r: any) => r.jenis === 'positif').length; const perhatian = records.filter((r: any) => r.jenis === 'perhatian' || r.jenis === 'negatif').length
  return <><div className="mb-3"><h2 className="text-lg font-extrabold text-slate-900">Riwayat & Rekap Perilaku</h2><p className="mt-1 text-sm text-slate-500">Cari siswa atau saring jenis catatan untuk melihat rekapnya.</p></div><div className="grid grid-cols-2 gap-3 mb-4"><div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-5"><Heart size={20} className="text-emerald-600 mb-2"/><div className="text-2xl font-extrabold text-emerald-800">{positif}</div><div className="text-xs font-bold text-emerald-700">Catatan Positif</div></div><div className="rounded-2xl bg-amber-50 border border-amber-200 p-5"><History size={20} className="text-amber-600 mb-2"/><div className="text-2xl font-extrabold text-amber-800">{perhatian}</div><div className="text-xs font-bold text-amber-700">Perlu Perhatian</div></div></div><div className="rounded-2xl bg-white border border-slate-200 p-3 mb-4 flex flex-col sm:flex-row gap-3"><div className="relative flex-1"><Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input aria-label="Cari nama siswa" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama siswa..." className="field !pl-10"/></div><div className="relative sm:w-48"><select aria-label="Jenis catatan" value={filter} onChange={(e) => setFilter(e.target.value)} className="field appearance-none pr-9"><option value="">Semua Jenis</option><option value="positif">Positif</option><option value="perhatian">Perlu Perhatian</option></select><ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"/></div></div><div className="lg:hidden space-y-3">{records.map((record: PerilakuType) => <article key={record.id} className="rounded-xl border border-slate-200 bg-white p-4">
    <p className="text-sm text-slate-500">{record.tanggal}</p><h3 className="mt-1 font-bold break-words">{name(record.siswa_id)}</h3>
    <p className={`mt-2 text-sm font-semibold ${record.jenis === 'positif' ? 'text-emerald-700' : 'text-amber-700'}`}>{record.jenis === 'positif' ? 'Positif' : 'Perlu Perhatian'} · {record.kategori}</p>
    <p className="mt-2 text-sm whitespace-pre-wrap break-words">{record.deskripsi}</p>
    {record.tindak_lanjut && <p className="mt-2 text-sm text-blue-700 whitespace-pre-wrap break-words">Tindak lanjut: {record.tindak_lanjut}</p>}
    <button onClick={() => onDelete(record)} aria-label={`Hapus catatan ${name(record.siswa_id)} pada ${record.tanggal}`} className="mt-3 min-h-11 rounded-lg border border-red-200 px-3 text-sm text-red-700">Hapus catatan</button>
  </article>)}{!records.length && <p className="p-6 text-center text-sm text-slate-500">Belum ada catatan yang sesuai.</p>}</div><div className="hidden lg:block rounded-2xl bg-white border border-slate-200 overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead><tr className="bg-slate-50 text-xs uppercase text-slate-500"><th className="px-4 py-3 text-left">Tanggal</th><th className="px-4 py-3 text-left">Siswa</th><th className="px-4 py-3 text-left">Jenis</th><th className="px-4 py-3 text-left">Catatan</th><th className="px-4 py-3"></th></tr></thead><tbody>{records.map((r: any, i: number) => <tr key={r.id} className={`${i%2?'bg-slate-50/60':''} border-t border-slate-100`}><td className="px-4 py-3">{r.tanggal}</td><td className="px-4 py-3 font-bold">{name(r.siswa_id)}</td><td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${r.jenis === 'positif' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{r.jenis === 'positif' ? 'Positif' : 'Perlu Perhatian'}</span></td><td className="px-4 py-3"><div className="font-semibold">{r.kategori}</div><div className="text-xs text-slate-500">{r.deskripsi}</div>{r.tindak_lanjut && <div className="text-xs text-blue-600 mt-1">Tindak lanjut: {r.tindak_lanjut}</div>}</td><td className="px-4 py-3 text-right"><button onClick={() => onDelete(r)} className="p-2 text-slate-400 hover:text-red-600"><Trash2 size={15}/></button></td></tr>)}</tbody></table>{records.length === 0 && <div className="py-12 text-center text-sm text-slate-400">Belum ada catatan yang sesuai.</div>}</div></>
}
