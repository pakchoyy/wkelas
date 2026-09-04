import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, FileText, Pencil, Plus, ShieldAlert, Trash2, Upload } from 'lucide-react'
import { Link } from 'react-router-dom'
import Modal from '../../components/Modal'
import { db, type PerangkatAjarCache } from '../../../lib/db'

const CATEGORIES = ['CP','ATP','Prota','Promes','RPM','Modul Ajar','LKPD','Lainnya']
const emptyForm = { judul:'', jenis:'Modul Ajar', deskripsi:'', mata_pelajaran:'', jenjang:'', kelas:'', versi:'1.0', status:'draft' as 'draft'|'terbit' }

export default function AdminFilePakChoy() {
  const [items,setItems] = useState<PerangkatAjarCache[]>([])
  const [show,setShow] = useState(false)
  const [editing,setEditing] = useState<PerangkatAjarCache|null>(null)
  const [form,setForm] = useState(emptyForm)
  const [file,setFile] = useState<File|null>(null)
  const [busy,setBusy] = useState(false)
  const [message,setMessage] = useState('')
  const lock = useRef(false)
  const load = async () => setItems(await db.perangkat_ajar_cache.orderBy('updated_at').reverse().toArray())
  useEffect(()=>{void load()},[])
  const openNew=()=>{setEditing(null);setForm(emptyForm);setFile(null);setMessage('');setShow(true)}
  const openEdit=(item:PerangkatAjarCache)=>{setEditing(item);setForm({judul:item.judul,jenis:item.jenis||'Lainnya',deskripsi:item.deskripsi||'',mata_pelajaran:item.mata_pelajaran||'',jenjang:item.jenjang||'',kelas:item.kelas||'',versi:item.versi||'1.0',status:item.status||'draft'});setFile(null);setMessage('');setShow(true)}
  const save=async(event:React.FormEvent)=>{
    event.preventDefault();if(lock.current)return
    if(!editing&&!file){setMessage('Pilih berkas yang akan disimpan.');return}
    if(file&&file.size>25*1024*1024){setMessage('Ukuran berkas maksimal 25 MB untuk penyimpanan lokal.');return}
    lock.current=true;setBusy(true);setMessage('')
    try{
      const now=new Date().toISOString()
      const fileData=file?new Uint8Array(await file.arrayBuffer()):editing?.file_data
      const format=file?.name.split('.').pop()?.toLowerCase()||editing?.format_file||''
      const item:PerangkatAjarCache={id:editing?.id||crypto.randomUUID(),...form,judul:form.judul.trim(),deskripsi:form.deskripsi.trim(),mata_pelajaran:form.mata_pelajaran.trim(),jenjang:form.jenjang.trim(),kelas:form.kelas.trim(),file_data:fileData,file_url:'',format_file:format,ukuran_file:file?.size||editing?.ukuran_file||0,sudah_diunduh:editing?.sudah_diunduh||0,created_at:editing?.created_at||now,updated_at:now}
      await db.perangkat_ajar_cache.put(item);await load();setShow(false)
    }catch{setMessage('File belum berhasil disimpan. Isian tetap tersedia.')}
    finally{lock.current=false;setBusy(false)}
  }
  const remove=async(item:PerangkatAjarCache)=>{if(lock.current||!window.confirm(`Hapus “${item.judul}” dari File Pak Choy?`))return;lock.current=true;setBusy(true);try{await db.perangkat_ajar_cache.delete(item.id);await load()}finally{lock.current=false;setBusy(false)}}
  return <div className="mx-auto max-w-6xl space-y-5 pb-12">
    <header className="flex flex-wrap items-start justify-between gap-3"><div><Link to="/" className="mb-3 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-teal-700"><ArrowLeft size={17}/>Kembali ke aplikasi</Link><h1 className="text-2xl font-black text-slate-900">Admin File Pak Choy</h1><p className="mt-1 text-sm text-slate-500">Kelola file yang tampil pada menu Perangkat Ajar.</p></div><button onClick={openNew} className="action-primary inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold"><Plus size={17}/>Tambah file</button></header>
    <aside className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><ShieldAlert className="shrink-0" size={20}/><p><strong>Mode admin lokal.</strong> File hanya tersedia pada browser ini. Login admin dan publikasi untuk semua pengguna akan aktif setelah Supabase disambungkan.</p></aside>
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="border-b border-slate-100 px-5 py-4"><h2 className="font-extrabold text-slate-800">{items.length} file tersimpan</h2></div>
      <div className="divide-y divide-slate-100">{items.map(item=><article key={item.id} className="flex flex-wrap items-center gap-3 p-4 sm:p-5"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-700"><FileText size={20}/></span><div className="min-w-48 flex-1"><h3 className="break-words font-bold text-slate-800">{item.judul}</h3><p className="mt-1 text-xs text-slate-500">{item.jenis} · {item.format_file?.toUpperCase()||'FILE'} · {Math.max(1,Math.ceil((item.ukuran_file||0)/1024))} KB</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${item.status==='terbit'?'bg-emerald-100 text-emerald-800':'bg-slate-100 text-slate-600'}`}>{item.status==='terbit'?'Terbit':'Draft'}</span><button onClick={()=>openEdit(item)} className="grid size-11 place-items-center rounded-xl text-teal-700 hover:bg-teal-50" aria-label={`Edit ${item.judul}`}><Pencil size={17}/></button><button disabled={busy} onClick={()=>void remove(item)} className="grid size-11 place-items-center rounded-xl text-red-700 hover:bg-red-50" aria-label={`Hapus ${item.judul}`}><Trash2 size={17}/></button></article>)}
      {!items.length&&<div className="grid min-h-52 place-items-center p-6 text-center text-sm text-slate-500"><div><Upload size={30} className="mx-auto mb-3 text-slate-300"/><p>Belum ada File Pak Choy. Pilih Tambah file untuk mulai.</p></div></div>}</div>
    </section>
    {show&&<Modal title={editing?'Edit File Pak Choy':'Tambah File Pak Choy'} onClose={()=>{if(!busy)setShow(false)}} footer={<button type="submit" form="admin-file-form" disabled={busy||!form.judul.trim()} className="action-primary min-h-11 w-full rounded-xl px-4 font-bold disabled:opacity-40">{busy?'Menyimpan…':editing?'Simpan perubahan':'Simpan file'}</button>}><form id="admin-file-form" onSubmit={save}><fieldset disabled={busy} className="space-y-4">
      {message&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{message}</p>}
      <label className="relative flex min-h-20 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-teal-300 bg-teal-50 text-sm font-bold text-teal-800"><Upload size={18}/>{file?file.name:editing?'Ganti berkas (opsional)':'Pilih berkas'}<input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip" className="absolute inset-0 cursor-pointer opacity-0" onChange={event=>setFile(event.target.files?.[0]||null)}/></label>
      <label className="block text-sm font-bold">Judul<input required className="field mt-1.5" value={form.judul} onChange={e=>setForm({...form,judul:e.target.value})}/></label>
      <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-bold">Kategori<select className="field mt-1.5" value={form.jenis} onChange={e=>setForm({...form,jenis:e.target.value})}>{CATEGORIES.map(value=><option key={value}>{value}</option>)}</select></label><label className="text-sm font-bold">Status<select className="field mt-1.5" value={form.status} onChange={e=>setForm({...form,status:e.target.value as 'draft'|'terbit'})}><option value="draft">Draft</option><option value="terbit">Terbit</option></select></label><label className="text-sm font-bold">Mata pelajaran<input className="field mt-1.5" value={form.mata_pelajaran} onChange={e=>setForm({...form,mata_pelajaran:e.target.value})}/></label><label className="text-sm font-bold">Jenjang<input className="field mt-1.5" placeholder="Contoh: SD" value={form.jenjang} onChange={e=>setForm({...form,jenjang:e.target.value})}/></label><label className="text-sm font-bold">Kelas<input className="field mt-1.5" placeholder="Contoh: 5" value={form.kelas} onChange={e=>setForm({...form,kelas:e.target.value})}/></label><label className="text-sm font-bold">Versi<input className="field mt-1.5" value={form.versi} onChange={e=>setForm({...form,versi:e.target.value})}/></label></div>
      <label className="block text-sm font-bold">Deskripsi<textarea rows={3} className="field mt-1.5" value={form.deskripsi} onChange={e=>setForm({...form,deskripsi:e.target.value})}/></label>
    </fieldset></form></Modal>}
  </div>
}
