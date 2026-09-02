import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, CalendarDays, CheckCircle2, Circle, Clock3, ListTodo, Pencil, Plus, Trash2 } from 'lucide-react'
import { todayISO } from '../../../shared/utils'
import Modal from '../../components/Modal'
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges'
import { visibleTasks, type TaskFilter } from '../../../shared/todo-view'

type Filter = TaskFilter
type Form = { judul: string; deskripsi: string; prioritas: string; deadline: string }
const blank = (): Form => ({ judul: '', deskripsi: '', prioritas: 'normal', deadline: '' })

export default function ToDo() {
  const [data, setData] = useState<any[]>([])
  const [filter, setFilter] = useState<Filter>('aktif')
  const [search, setSearch] = useState('')
  const baseline = useRef(JSON.stringify(blank()))
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState<Form>(blank())
  const [toast, setToast] = useState('')
  const [today,setToday] = useState(todayISO())
  const [busy,setBusy] = useState(false)
  const lock = useRef(false)
  const [error,setError] = useState('')
  const [formError,setFormError] = useState('')
  const [loading,setLoading] = useState(true)
  useEffect(() => { const refresh=()=>setToday(todayISO()); const timer=setInterval(refresh,30000);window.addEventListener('focus',refresh);return()=>{clearInterval(timer);window.removeEventListener('focus',refresh)} },[])
  const load = async () => setData(await window.electronAPI.todo.list())
  useEffect(() => { load().catch(()=>setError('Tugas gagal dimuat. Muat ulang halaman.')).finally(()=>setLoading(false)) }, [])
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 2500); return () => clearTimeout(timer) }, [toast])

  const active = data.filter((item) => item.status !== 'selesai')
  const counts = { today: active.filter((item) => item.deadline === today).length, late: active.filter((item) => item.deadline && item.deadline < today).length, upcoming: active.filter((item) => item.deadline && item.deadline > today).length, done: data.filter((item) => item.status === 'selesai').length }
  const filtered = useMemo(() => visibleTasks(data, filter, today, search), [data, filter, today, search])
  const dirty = showForm && JSON.stringify(form) !== baseline.current
  useUnsavedChanges(dirty, busy)
  const closeForm = () => { if (!lock.current && (!dirty || window.confirm('Tutup tanpa menyimpan perubahan tugas?'))) setShowForm(false) }

  const openNew = () => { setFormError(''); setEditId(null); baseline.current = JSON.stringify(blank()); setForm(blank()); setShowForm(true) }
  const openEdit = (item: any) => { setFormError(''); setEditId(item.id); const initial = { judul: item.judul || '', deskripsi: item.deskripsi || '', prioritas: item.prioritas || 'normal', deadline: item.deadline || '' }; baseline.current = JSON.stringify(initial); setForm(initial); setShowForm(true) }
  const refresh = async () => {try {await load();setError('')} catch {setError('Perubahan tersimpan, tetapi daftar gagal dimuat ulang. Muat ulang halaman.')} }
  const save = async (event:React.FormEvent) => {
    event.preventDefault();if(lock.current)return
    lock.current=true;setBusy(true);setFormError('')
    try {
      if(!form.judul.trim())throw new Error('Judul wajib diisi.')
      await window.electronAPI.todo.save({...form,judul:form.judul.trim(),...(editId?{id:editId}:{})})
      setShowForm(false);setToast(editId?'Tugas berhasil diperbarui':'Tugas berhasil ditambahkan');await refresh()
    } catch {setFormError('Tugas gagal disimpan. Periksa judul dan coba lagi; isian tetap tersedia.')}
    finally {lock.current=false;setBusy(false)}
  }
  const toggle = async (id:number) => {
    if(lock.current)return
    lock.current=true;setBusy(true);setError('')
    try {await window.electronAPI.todo.toggle(id);setToast(data.find(item => item.id === id)?.status === 'selesai' ? 'Tugas diaktifkan kembali' : 'Tugas ditandai selesai');await refresh()} catch {setError('Status tugas gagal disimpan. Silakan coba lagi.')}
    finally {lock.current=false;setBusy(false)}
  }
  const remove = async () => {
    if(!editId || lock.current || !window.confirm('Hapus tugas ini?'))return
    lock.current=true;setBusy(true);setFormError('')
    try {await window.electronAPI.todo.delete(editId);setShowForm(false);setToast('Tugas berhasil dihapus');await refresh()}
    catch {setFormError('Tugas gagal dihapus. Silakan coba lagi.')}
    finally {lock.current=false;setBusy(false)}
  }
  const priorityStyle: Record<string, string> = { rendah: 'bg-slate-100 text-slate-600', normal: 'bg-blue-100 text-blue-700', tinggi: 'bg-red-100 text-red-700' }

  return <div className="mx-auto max-w-5xl space-y-4 pb-16">
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}{loading && <p role="status">Memuat tugas...</p>}
    {toast && <div role="status" className="fixed left-1/2 top-20 w-[calc(100%_-_2rem)] max-w-md z-[100] -translate-x-1/2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-xl">{toast}</div>}
    <div className="flex flex-wrap gap-3 items-center justify-between"><div><h2 className="text-xl font-extrabold text-slate-900">Tugas Saya</h2><p className="mt-1 text-sm text-slate-500">Pengingat pekerjaan administrasi dan kegiatan mengajar.</p></div><button disabled={busy || loading} onClick={openNew} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white"><Plus size={17}/>Tambah Tugas</button></div>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><Summary icon={CalendarDays} label="Hari Ini" value={counts.today} color="blue"/><Summary icon={AlertCircle} label="Terlambat" value={counts.late} color="red"/><Summary icon={Clock3} label="Mendatang" value={counts.upcoming} color="amber"/><Summary icon={CheckCircle2} label="Selesai" value={counts.done} color="emerald"/></div>
    <div className="flex gap-1 overflow-x-auto rounded-xl bg-slate-200/70 p-1 w-fit max-w-full">{([['aktif','Aktif'],['hari-ini','Hari Ini'],['terlambat','Terlambat'],['mendatang','Mendatang'],['selesai','Selesai']] as [Filter,string][]).map(([key, label]) => <button aria-pressed={filter === key} key={key} onClick={() => setFilter(key)} className={`min-h-11 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-bold ${filter === key ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'}`}>{label}</button>)}</div>
    <label className="block text-sm font-semibold text-slate-700">Cari tugas<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Cari judul atau keterangan..." className="field mt-1.5"/></label>
    <p className="text-xs text-slate-500">Diurutkan dari tenggat terdekat, lalu prioritas tertinggi. Tugas tanpa tenggat berada di bawah.</p>
    <div className="space-y-2">{filtered.map((item) => { const late = item.status !== 'selesai' && item.deadline && item.deadline < today; return <div key={item.id} className={`flex items-start gap-3 rounded-2xl border bg-white p-4 shadow-sm ${late ? 'border-red-200' : 'border-slate-200'} ${item.status === 'selesai' ? 'opacity-65' : ''}`}><button disabled={busy} aria-label={`${item.status === 'selesai' ? 'Aktifkan kembali' : 'Selesaikan'} ${item.judul}`} aria-pressed={item.status === 'selesai'} onClick={() => toggle(item.id)} className="size-11 shrink-0 grid place-items-center text-slate-400">{item.status === 'selesai' ? <CheckCircle2 size={21} className="text-emerald-500"/> : <Circle size={21}/>}</button><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className={`break-words font-bold text-slate-800 ${item.status === 'selesai' ? 'line-through text-slate-400' : ''}`}>{item.judul}</span><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${priorityStyle[item.prioritas] || priorityStyle.normal}`}>{item.prioritas}</span>{late && <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">TERLAMBAT</span>}</div>{item.deskripsi && <p className="mt-1 text-sm text-slate-500 whitespace-pre-wrap break-words">{item.deskripsi}</p>}{item.deadline && <div className={`mt-2 flex items-center gap-1 text-xs font-semibold ${late ? 'text-red-600' : 'text-slate-400'}`}><CalendarDays size={13}/>{item.deadline === today ? 'Hari ini' : item.deadline}</div>}</div><button disabled={busy} aria-label={`Edit ${item.judul}`} onClick={() => openEdit(item)} className="size-11 shrink-0 grid place-items-center rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-emerald-700"><Pencil size={16}/></button></div>})}{!loading && !error && filtered.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center"><ListTodo size={34} className="mx-auto mb-3 text-slate-300"/><div className="font-bold text-slate-600">{search.trim() ? 'Tidak ada tugas yang cocok' : 'Tidak ada tugas di bagian ini'}</div><p className="mt-1 text-sm text-slate-400">{search.trim() ? 'Coba kata kunci lain atau ganti filter.' : 'Tugas baru akan muncul sesuai tenggat dan statusnya.'}</p></div>}</div>
    {showForm && <Modal title={editId ? 'Edit Tugas' : 'Tambah Tugas'} onClose={closeForm} footer={<>{editId && <button disabled={busy} onClick={remove} className="mr-auto flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-bold text-red-600"><Trash2 size={16}/>Hapus</button>}<button disabled={busy} type="submit" form="todo-form" className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white">{busy ? 'Memproses...' : 'Simpan Tugas'}</button></>}><form id="todo-form" onSubmit={save}>{formError && <p role="alert" className="mb-3 text-sm text-red-700">{formError}</p>}<fieldset disabled={busy} className="min-w-0 space-y-4"><label className="block text-sm font-bold text-slate-700">Judul<input required value={form.judul} onChange={(e) => setForm({ ...form, judul: e.target.value })} className="field mt-1.5" placeholder="Contoh: Selesaikan rekap nilai"/></label><label className="block text-sm font-bold text-slate-700">Keterangan <span className="font-normal text-slate-400">(opsional)</span><textarea value={form.deskripsi} onChange={(e) => setForm({ ...form, deskripsi: e.target.value })} rows={3} className="field mt-1.5"/></label><div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><label className="text-sm font-bold text-slate-700">Prioritas<select value={form.prioritas} onChange={(e) => setForm({ ...form, prioritas: e.target.value })} className="field mt-1.5"><option value="rendah">Rendah</option><option value="normal">Normal</option><option value="tinggi">Tinggi</option></select></label><label className="text-sm font-bold text-slate-700">Tenggat <span className="font-normal text-slate-400">(opsional)</span><input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className="field mt-1.5"/></label></div></fieldset></form></Modal>}
  </div>
}

function Summary({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  const tone: Record<string, string> = { blue: 'bg-blue-50 text-blue-700 border-blue-100', red: 'bg-red-50 text-red-700 border-red-100', amber: 'bg-amber-50 text-amber-700 border-amber-100', emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100' }
  return <div className={`rounded-2xl border p-4 ${tone[color]}`}><div className="flex items-center justify-between"><div><div className="text-2xl font-extrabold">{value}</div><div className="mt-1 text-xs font-bold">{label}</div></div><Icon size={22}/></div></div>
}
