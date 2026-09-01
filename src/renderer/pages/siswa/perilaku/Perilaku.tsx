import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, CalendarDays, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Heart, History, Search, Sparkles, Trash2, X } from 'lucide-react'
import { useSiswaList } from '../../../hooks/useSiswa'
import { useAppStore } from '../../../stores/appStore'
import { todayISO } from '../../../../shared/utils'
import type { Perilaku as PerilakuType } from '../../../../shared/types'
import ConfirmDialog from '../../../components/ConfirmDialog'
import { db } from '../../../../lib/db'

const categories = {
  positif: ['Disiplin', 'Aktif Belajar', 'Membantu Teman', 'Tanggung Jawab', 'Kerja Sama', 'Prestasi'],
  perhatian: ['Terlambat', 'Tidak Mengerjakan Tugas', 'Mengganggu Kelas', 'Tidak Disiplin', 'Berkata Tidak Sopan', 'Lainnya'],
}
const initials = (name: string) => name.split(/\s+/).slice(0, 2).map((x) => x[0]).join('').toUpperCase()
const addDays = (date: string, amount: number) => { const d = new Date(`${date}T12:00:00`); d.setDate(d.getDate() + amount); return d.toISOString().slice(0, 10) }
const longDate = (date: string) => new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${date}T12:00:00`))

export default function Perilaku() {
  const kelasId = useAppStore((s) => s.kelasAktifId) || 1
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

  const load = async () => { const all = await window.electronAPI.perilaku.list(); const ids = new Set(siswa.map((s) => s.id)); setRecords(all.filter((r: PerilakuType) => ids.has(r.siswa_id))) }
  useEffect(() => { if (siswa.length) load() }, [siswa.length])
  useEffect(() => { db.pengaturan.get(`presensi_${kelasId}`).then((x) => { if (x?.value) try { setHariSekolah(JSON.parse(x.value).hariSekolah || 5) } catch {} }) }, [kelasId])
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 3500); return () => clearTimeout(t) }, [toast])
  const nameOf = (id: number) => siswa.find((s) => s.id === id)?.nama || 'Siswa'
  const todayRecords = records.filter((r) => r.tanggal === tanggal)
  const filteredSiswa = siswa.filter((s) => s.nama.toLowerCase().includes(search.toLowerCase()))
  const history = records.filter((r) => (!filterJenis || r.jenis === filterJenis) && nameOf(r.siswa_id).toLowerCase().includes(search.toLowerCase()))
  const selectedDay = new Date(`${tanggal}T12:00:00`).getDay()
  const isSchoolDay = selectedDay >= 1 && selectedDay <= hariSekolah

  const openStudent = (id: number) => { setActiveId(activeId === id ? null : id); setForm({ jenis: 'positif', kategori: '', deskripsi: '', tindak_lanjut: '' }) }
  const save = async () => {
    if (!activeId || !form.kategori) { setToast({ type: 'error', text: 'Pilih kategori perilaku terlebih dahulu.' }); return }
    setSaving(true)
    try { await window.electronAPI.perilaku.create({ siswa_id: activeId, tanggal, jenis: form.jenis, kategori: form.kategori, deskripsi: form.deskripsi || form.kategori, tindak_lanjut: form.tindak_lanjut || undefined }); await load(); setActiveId(null); setToast({ type: 'success', text: `Catatan ${nameOf(activeId)} berhasil disimpan.` }) }
    catch { setToast({ type: 'error', text: 'Catatan perilaku gagal disimpan.' }) } finally { setSaving(false) }
  }
  const remove = async () => { if (!deleteItem) return; try { await window.electronAPI.perilaku.delete(deleteItem.id); setDeleteItem(null); await load(); setToast({ type: 'success', text: 'Catatan berhasil dihapus.' }) } catch { setToast({ type: 'error', text: 'Catatan gagal dihapus.' }) } }

  return <div className="max-w-5xl mx-auto pb-16">
    <div className="flex rounded-xl bg-slate-200/70 p-1 w-fit mb-4"><button onClick={() => setTab('hari')} className={`px-4 py-2 rounded-lg text-sm font-bold ${tab === 'hari' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'}`}>Catatan Hari Ini</button><button onClick={() => setTab('riwayat')} className={`px-4 py-2 rounded-lg text-sm font-bold ${tab === 'riwayat' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'}`}>Riwayat & Rekap</button></div>
    {tab === 'hari' && <div className="rounded-2xl bg-white border border-slate-200 p-2.5 flex items-center justify-between mb-4"><button onClick={() => setTanggal(addDays(tanggal, -1))} className="w-11 h-11 rounded-xl border border-slate-200 grid place-items-center"><ChevronLeft size={21}/></button><div className="text-center"><div className="font-extrabold capitalize">{longDate(tanggal)}</div><div className="text-xs text-slate-400">Catatan perilaku harian</div></div><div className="flex gap-2"><label className="relative h-11 w-11 rounded-xl border border-slate-200 grid place-items-center cursor-pointer hover:bg-slate-50" title="Pilih tanggal"><CalendarDays size={20}/><input type="date" max={todayISO()} value={tanggal} onChange={(e) => e.target.value && setTanggal(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" aria-label="Pilih tanggal"/></label><button disabled={tanggal >= todayISO()} onClick={() => setTanggal(addDays(tanggal, 1))} className="w-11 h-11 rounded-xl border border-slate-200 grid place-items-center disabled:opacity-35"><ChevronRight size={21}/></button></div></div>}

    {tab === 'hari' ? <>{!isSchoolDay ? <div className="rounded-2xl bg-amber-50 border border-amber-200 text-center px-5 py-12"><CalendarDays size={34} className="mx-auto text-amber-500 mb-3"/><div className="font-extrabold text-amber-900">Hari Libur Sekolah</div><p className="text-sm text-amber-700 mt-1">Daftar siswa tidak ditampilkan karena tanggal ini bukan hari masuk sekolah.</p></div> : <>
      <div className="rounded-2xl bg-white border border-slate-200 p-4 mb-4"><div className="flex items-center gap-3"><Sparkles size={19} className="text-amber-500"/><div><div className="text-sm font-bold text-slate-800">Klik kartu siswa jika ingin membuat catatan</div><p className="text-xs text-slate-500 mt-1">Siswa tanpa kejadian tidak perlu diisi. Keterangan dan tindak lanjut bersifat opsional.</p></div></div></div>
      <div className="relative mb-4"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari siswa..." className="w-full field" style={{ paddingLeft: '2.25rem' }}/></div>
      {loading ? <div className="py-16 text-center text-slate-400">Memuat siswa...</div> : <div className="space-y-3">{filteredSiswa.map((s, index) => { const own = todayRecords.filter((r) => r.siswa_id === s.id); const open = activeId === s.id; return <div key={s.id} className={`rounded-2xl bg-white border overflow-hidden shadow-sm ${own.length ? 'border-l-4 border-l-emerald-500 border-slate-200' : 'border-slate-200'}`}><button onClick={() => openStudent(s.id)} className="w-full px-5 py-4 flex items-center gap-4 text-left"><div className="w-11 h-11 rounded-full bg-gradient-to-br from-teal-500 to-cyan-700 text-white grid place-items-center font-extrabold">{initials(s.nama)}</div><div className="flex-1"><div className="font-extrabold text-slate-900">{s.nama}</div><div className="text-sm text-slate-400 mt-0.5">No. {index + 1}</div></div>{own.length ? <div className="text-right"><span className="rounded-full bg-emerald-100 text-emerald-700 px-3 py-1.5 text-xs font-bold">{own.length} catatan</span><div className="text-xs text-slate-400 mt-1">Klik untuk tambah lagi</div></div> : <span className="rounded-full bg-slate-100 text-slate-500 px-3 py-1.5 text-xs font-bold">+ Catat</span>}</button>
        {own.length > 0 && <div className="px-5 pb-3 flex flex-wrap gap-2">{own.map((r) => <span key={r.id} className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${r.jenis === 'positif' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{r.kategori}</span>)}</div>}
        {open && <div className="border-t border-slate-100 bg-slate-50/70 p-5 space-y-4"><div className="flex gap-2"><button onClick={() => setForm({ ...form, jenis: 'positif', kategori: '' })} className={`rounded-xl px-4 py-2 text-sm font-bold ${form.jenis === 'positif' ? 'bg-emerald-600 text-white' : 'bg-white border text-slate-500'}`}>Positif</button><button onClick={() => setForm({ ...form, jenis: 'perhatian', kategori: '' })} className={`rounded-xl px-4 py-2 text-sm font-bold ${form.jenis === 'perhatian' ? 'bg-amber-500 text-white' : 'bg-white border text-slate-500'}`}>Perlu Perhatian</button></div><div><div className="text-xs font-bold text-slate-500 mb-2">Pilih kategori</div><div className="flex flex-wrap gap-2">{categories[form.jenis as keyof typeof categories].map((x) => <button key={x} onClick={() => setForm({ ...form, kategori: x })} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${form.kategori === x ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'bg-white border-slate-200 text-slate-600'}`}>{x}</button>)}</div></div><textarea value={form.deskripsi} onChange={(e) => setForm({ ...form, deskripsi: e.target.value })} placeholder="Keterangan kejadian (opsional)" rows={2} className="field resize-none"/><input value={form.tindak_lanjut} onChange={(e) => setForm({ ...form, tindak_lanjut: e.target.value })} placeholder="Tindak lanjut (opsional)" className="field"/><div className="flex justify-end"><button onClick={save} disabled={saving || !form.kategori} className="rounded-xl bg-emerald-600 text-white px-5 py-2.5 text-sm font-bold disabled:opacity-40">{saving ? 'Menyimpan...' : 'Simpan Catatan'}</button></div></div>}
      </div>})}</div>}
    </>}</> : <HistoryView records={history} siswa={siswa} search={search} setSearch={setSearch} filter={filterJenis} setFilter={setFilterJenis} onDelete={setDeleteItem}/>} 
    <ConfirmDialog open={!!deleteItem} title="Hapus Catatan Perilaku" message={`Hapus catatan ${deleteItem?.kategori || ''} milik ${deleteItem ? nameOf(deleteItem.siswa_id) : ''}?`} onCancel={() => setDeleteItem(null)} onConfirm={remove}/>
    {toast && <div className="fixed inset-x-0 top-6 z-[500] flex justify-center pointer-events-none px-4"><div className={`pointer-events-auto flex items-center gap-3 rounded-2xl border bg-white px-5 py-3.5 shadow-xl text-sm font-semibold ${toast.type === 'success' ? 'border-emerald-200 text-emerald-800' : 'border-red-200 text-red-800'}`}>{toast.type === 'success' ? <CheckCircle2 size={19}/> : <AlertCircle size={19}/>}<span>{toast.text}</span><button onClick={() => setToast(null)}><X size={15}/></button></div></div>}
  </div>
}

function HistoryView({ records, siswa, search, setSearch, filter, setFilter, onDelete }: any) {
  const name = (id: number) => siswa.find((s: any) => s.id === id)?.nama || 'Siswa'
  const positif = records.filter((r: any) => r.jenis === 'positif').length; const perhatian = records.filter((r: any) => r.jenis === 'perhatian' || r.jenis === 'negatif').length
  return <><div className="grid grid-cols-2 gap-3 mb-4"><div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-5"><Heart size={20} className="text-emerald-600 mb-2"/><div className="text-2xl font-extrabold text-emerald-800">{positif}</div><div className="text-xs font-bold text-emerald-700">Catatan Positif</div></div><div className="rounded-2xl bg-amber-50 border border-amber-200 p-5"><History size={20} className="text-amber-600 mb-2"/><div className="text-2xl font-extrabold text-amber-800">{perhatian}</div><div className="text-xs font-bold text-amber-700">Perlu Perhatian</div></div></div><div className="rounded-2xl bg-white border border-slate-200 p-3 mb-4 flex gap-3"><div className="relative flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari siswa..." className="field pl-9"/></div><div className="relative"><select value={filter} onChange={(e) => setFilter(e.target.value)} className="field appearance-none pr-9"><option value="">Semua Jenis</option><option value="positif">Positif</option><option value="perhatian">Perlu Perhatian</option></select><ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"/></div></div><div className="rounded-2xl bg-white border border-slate-200 overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead><tr className="bg-slate-50 text-xs uppercase text-slate-500"><th className="px-4 py-3 text-left">Tanggal</th><th className="px-4 py-3 text-left">Siswa</th><th className="px-4 py-3 text-left">Jenis</th><th className="px-4 py-3 text-left">Catatan</th><th className="px-4 py-3"></th></tr></thead><tbody>{records.map((r: any, i: number) => <tr key={r.id} className={`${i%2?'bg-slate-50/60':''} border-t border-slate-100`}><td className="px-4 py-3">{r.tanggal}</td><td className="px-4 py-3 font-bold">{name(r.siswa_id)}</td><td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${r.jenis === 'positif' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{r.jenis === 'positif' ? 'Positif' : 'Perlu Perhatian'}</span></td><td className="px-4 py-3"><div className="font-semibold">{r.kategori}</div><div className="text-xs text-slate-500">{r.deskripsi}</div>{r.tindak_lanjut && <div className="text-xs text-blue-600 mt-1">Tindak lanjut: {r.tindak_lanjut}</div>}</td><td className="px-4 py-3 text-right"><button onClick={() => onDelete(r)} className="p-2 text-slate-400 hover:text-red-600"><Trash2 size={15}/></button></td></tr>)}</tbody></table>{records.length === 0 && <div className="py-12 text-center text-sm text-slate-400">Belum ada catatan yang sesuai.</div>}</div></>
}
