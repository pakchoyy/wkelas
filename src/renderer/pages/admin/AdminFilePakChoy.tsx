import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Bell, FileText, LayoutDashboard, LogOut, Megaphone, Pencil, Plus, RefreshCw, ShieldAlert, Trash2, Upload, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import Modal from '../../components/Modal'
import ConfirmDialog from '../../components/ConfirmDialog'
import { db, type PerangkatAjarCache } from '../../../lib/db'
import { primaryClient, useChoySession, choySignIn, choySignOut, listChoyUsers, type ChoyAdminUser } from '../../../lib/choy-auth'
import { deleteChoyDocument, downloadChoyDocument, listChoyDocuments, publishChoyDocument, updateChoyDocument, uploadChoyDocument } from '../../../lib/document-service'
import { DOCUMENT_CATEGORIES, documentAudience, documentSize, type ChoyDocument } from '../../../shared/pak-choy-documents'
import AdminContentPanel from './AdminContentPanel'
import AdminFeedbackPanel from './AdminFeedbackPanel'

const CATEGORIES = ['CP','ATP','Prota','Promes','RPM','Modul Ajar','LKPD','Lainnya']
const emptyForm = { judul:'', jenis:'Modul Ajar', deskripsi:'', mata_pelajaran:'', jenjang:'', kelas:'', versi:'1.0', status:'terbit' as 'draft'|'terbit' }

export default function AdminFilePakChoy() {
  const cloud = primaryClient()
  if (cloud) return <AdminCloud client={cloud}/>
  return <AdminLokal/>
}

// ---------------- Mode cloud (Supabase, butuh login admin) ----------------
const cloudEmpty = { judul:'', kategori:'Modul Ajar', deskripsi:'', grades:[] as number[] }
const adminDate = (value:string|null) => value ? new Intl.DateTimeFormat('id-ID',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value)) : 'Belum pernah'
function AdminCloud({client}:{client:NonNullable<ReturnType<typeof primaryClient>>}) {
  const { user, admin, checking } = useChoySession(client)
  const [section,setSection] = useState<'ringkasan'|'pengguna'|'masukan'|'pengumuman'|'versi'|'file'>('ringkasan')
  const [items,setItems] = useState<ChoyDocument[]>([])
  const [loading,setLoading] = useState(true)
  const [users,setUsers] = useState<ChoyAdminUser[]>([])
  const [usersLoading,setUsersLoading] = useState(true)
  const [usersError,setUsersError] = useState('')
  const [feedbackCount,setFeedbackCount] = useState<number|null>(null)
  const [show,setShow] = useState(false)
  const [editing,setEditing] = useState<ChoyDocument|null>(null)
  const [form,setForm] = useState(cloudEmpty)
  const [file,setFile] = useState<File|null>(null)
  const [busy,setBusy] = useState(false)
  const [message,setMessage] = useState('')
  const [login,setLogin] = useState({email:'',password:''})
  const lock = useRef(false)
  const [confirmDelete,setConfirmDelete] = useState<ChoyDocument|null>(null)
  const load = async () => { try { setItems(await listChoyDocuments(client)) } catch { setMessage('Daftar gagal dimuat. Periksa koneksi lalu muat ulang.') } finally { setLoading(false) } }
  const loadUsers = async () => { setUsersError(''); try { setUsers(await listChoyUsers(client)) } catch(error) { setUsersError(error instanceof Error?error.message:'Daftar pengguna gagal dimuat.') } finally { setUsersLoading(false) } }
  useEffect(() => { if (admin) { void load(); void loadUsers(); void client.from('feedback').select('id',{count:'exact',head:true}).eq('status','baru').then(({count})=>setFeedbackCount(count||0)).catch(()=>setFeedbackCount(null)) } else { setLoading(false); setUsersLoading(false) } }, [admin])
  const doLogin = async (e:React.FormEvent) => { e.preventDefault(); if(lock.current)return; lock.current=true;setBusy(true);setMessage(''); try { await choySignIn(client,login.email,login.password) } catch(err) { setMessage(err instanceof Error?err.message:'Login gagal.') } finally { lock.current=false;setBusy(false) } }
  const openNew = () => { setEditing(null); setForm(cloudEmpty); setFile(null); setMessage(''); setShow(true) }
  const openEdit = (item:ChoyDocument) => { setEditing(item); setForm({judul:item.title,kategori:item.category,deskripsi:item.description,grades:[...item.target_grades]}); setFile(null); setMessage(''); setShow(true) }
  const toggleGrade = (g:number) => setForm(f => ({...f,grades:f.grades.includes(g)?f.grades.filter(x=>x!==g):[...f.grades,g]}))
  const save = async (e:React.FormEvent) => {
    e.preventDefault(); if(lock.current)return
    if(!editing && !file){ setMessage('Pilih berkas yang akan diunggah.'); return }
    lock.current=true;setBusy(true);setMessage('')
    try {
      const details = {title:form.judul,category:form.kategori,description:form.deskripsi,target_grades:form.grades}
      if (editing) await updateChoyDocument(client,editing,details)
      else await uploadChoyDocument(client,details,file!)
      setShow(false); setLoading(true); await load()
    } catch(err) { setMessage(err instanceof Error?err.message:'Penyimpanan gagal.') }
    finally { lock.current=false;setBusy(false) }
  }
  const flip = async (item:ChoyDocument) => { setMessage(''); try { await publishChoyDocument(client,item,!item.published); await load() } catch(err) { setMessage(err instanceof Error?err.message:'Status gagal diubah.') } }
  const remove = async () => { if(lock.current||!confirmDelete)return; const item=confirmDelete; setConfirmDelete(null); lock.current=true;setBusy(true); try { await deleteChoyDocument(client,item); await load() } catch(err) { setMessage(err instanceof Error?err.message:'Hapus gagal.') } finally { lock.current=false;setBusy(false) } }
  return <div className="mx-auto max-w-6xl space-y-5 pb-12">
    <header className="flex flex-wrap items-start justify-between gap-3"><div><Link to="/" className="mb-3 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-teal-700"><ArrowLeft size={17}/>Kembali ke aplikasi</Link><h1 className="text-2xl font-black text-slate-900">Admin Utama</h1><p className="mt-1 text-sm text-slate-500">Kelola pengguna dan File Pak Choy dari satu tempat.</p></div>{user&&<button onClick={()=>void choySignOut(client)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-600"><LogOut size={16}/>Keluar ({user.email})</button>}</header>
    {message&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{message}</p>}
    {checking||loading ? <p role="status" className="text-sm text-slate-500">Memuat…</p> : !user ? <form onSubmit={doLogin} className="mx-auto max-w-sm space-y-3 rounded-2xl border border-slate-200 bg-white p-6"><h2 className="font-extrabold text-slate-800">Login admin</h2><label className="block text-sm font-bold">Email<input required type="email" value={login.email} onChange={e=>setLogin({...login,email:e.target.value})} className="field mt-1.5"/></label><label className="block text-sm font-bold">Kata sandi<input required type="password" value={login.password} onChange={e=>setLogin({...login,password:e.target.value})} className="field mt-1.5"/></label><button disabled={busy} className="action-primary min-h-11 w-full rounded-xl px-4 font-bold disabled:opacity-40">{busy?'Memeriksa…':'Masuk'}</button></form>
    : !admin ? <aside className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><ShieldAlert className="shrink-0" size={20}/><p><strong>Akun ini bukan admin.</strong> Daftarkan User ID berikut ke tabel <code>pak_choy_admins</code> lewat SQL Editor Supabase:<br/><code className="break-all">{user.id}</code></p></aside>
    : <>
      <nav aria-label="Menu admin" className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-200/70 p-1.5 sm:grid-cols-6">
        {([
          ['ringkasan','Ringkasan',LayoutDashboard],
          ['pengguna','Pengguna',Users],
          ['masukan','Masukan',Bell],
          ['pengumuman','Pengumuman',Megaphone],
          ['versi','Versi',RefreshCw],
          ['file','File Pak Choy',FileText],
        ] as const).map(([value,label,Icon])=><button key={value} type="button" aria-pressed={section===value} onClick={()=>setSection(value)} className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-2 text-sm font-bold ${section===value?'bg-white text-teal-800 shadow-sm':'text-slate-600 hover:bg-white/60'}`}><Icon size={17}/><span className="hidden sm:inline">{label}</span><span className="sm:hidden">{value==='ringkasan'?'Beranda':value==='pengguna'?'User':value==='masukan'?'Masuk':value==='pengumuman'?'Info':value==='versi'?'Versi':'File'}</span></button>)}
      </nav>
      {section==='ringkasan'&&<section className="grid gap-3 sm:grid-cols-4">
        <article className="rounded-2xl border border-teal-100 bg-teal-50 p-5"><p className="text-sm font-bold text-teal-800">Pengguna terdaftar</p><p className="mt-2 text-3xl font-black text-teal-950">{usersLoading?'—':users.length}</p></article>
        <article className="rounded-2xl border border-sky-100 bg-sky-50 p-5"><p className="text-sm font-bold text-sky-800">File tersimpan</p><p className="mt-2 text-3xl font-black text-sky-950">{loading?'—':items.length}</p></article>
        <article className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5"><p className="text-sm font-bold text-emerald-800">File diterbitkan</p><p className="mt-2 text-3xl font-black text-emerald-950">{loading?'—':items.filter(item=>item.published).length}</p></article>
        <article className="rounded-2xl border border-amber-100 bg-amber-50 p-5"><p className="text-sm font-bold text-amber-800">Masukan baru</p><p className="mt-2 text-3xl font-black text-amber-950">{feedbackCount===null?'—':feedbackCount}</p></article>
        {usersError&&<p role="alert" className="sm:col-span-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{usersError}</p>}
      </section>}
      {section==='pengguna'&&<section className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="border-b border-slate-100 px-5 py-4"><h2 className="font-extrabold text-slate-800">Pengguna terdaftar</h2><p className="mt-1 text-sm text-slate-500">Akun yang masuk melalui Google atau email.</p></div>
        {usersError?<div className="p-5"><p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{usersError}</p></div>:usersLoading?<p role="status" className="p-5 text-sm text-slate-500">Memuat pengguna…</p>:<div className="divide-y divide-slate-100">{users.map(account=><article key={account.user_id} className="flex items-center gap-3 p-4 sm:p-5">{account.avatar_url?<img src={account.avatar_url} alt="" className="size-11 shrink-0 rounded-full object-cover" referrerPolicy="no-referrer"/>:<span className="grid size-11 shrink-0 place-items-center rounded-full bg-teal-100 font-black text-teal-800">{(account.full_name||account.email).charAt(0).toUpperCase()}</span>}<div className="min-w-0 flex-1"><h3 className="truncate font-bold text-slate-800">{account.full_name||'Tanpa nama'}</h3><p className="truncate text-sm text-slate-500">{account.email}</p><p className="mt-1 text-xs text-slate-400">Daftar {adminDate(account.created_at)} · Terakhir masuk {adminDate(account.last_sign_in_at)}</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold uppercase text-slate-600">{account.provider}</span></article>)}{!users.length&&<p className="p-8 text-center text-sm text-slate-500">Belum ada pengguna terdaftar.</p>}</div>}
      </section>}
      {section==='masukan'&&<AdminFeedbackPanel client={client}/>}
      {section==='pengumuman'&&<AdminContentPanel client={client} kind="pengumuman"/>}
      {section==='versi'&&<AdminContentPanel client={client} kind="versi"/>}
      {section==='file'&&<><div><button onClick={openNew} className="action-primary inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold"><Plus size={17}/>Tambah file</button></div>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="border-b border-slate-100 px-5 py-4"><h2 className="font-extrabold text-slate-800">{items.length} file tersimpan</h2></div>
        <div className="divide-y divide-slate-100">{items.map(item=><article key={item.id} className="flex flex-wrap items-center gap-3 p-4 sm:p-5"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-700"><FileText size={20}/></span><div className="min-w-48 flex-1"><h3 className="break-words font-bold text-slate-800">{item.title}</h3><p className="mt-1 text-xs text-slate-500">{item.category} · {documentAudience(item.target_grades)} · {documentSize(item.file_size)}</p></div><button disabled={busy} onClick={()=>void flip(item)} className={`min-h-11 rounded-full px-3 py-1 text-xs font-bold ${item.published?'bg-emerald-100 text-emerald-800':'bg-slate-100 text-slate-600'}`}>{item.published?'Terbit':'Draft'}</button><button onClick={()=>openEdit(item)} className="grid size-11 place-items-center rounded-xl text-teal-700 hover:bg-teal-50" aria-label={`Edit ${item.title}`}><Pencil size={17}/></button><button disabled={busy} onClick={()=>setConfirmDelete(item)} className="grid size-11 place-items-center rounded-xl text-red-700 hover:bg-red-50" aria-label={`Hapus ${item.title}`}><Trash2 size={17}/></button></article>)}
        {!items.length&&<div className="grid min-h-52 place-items-center p-6 text-center text-sm text-slate-500"><div><Upload size={30} className="mx-auto mb-3 text-slate-300"/><p>Belum ada file. Pilih Tambah file untuk mulai.</p></div></div>}</div>
      </section></>}
    </>}
    <ConfirmDialog open={!!confirmDelete} title="Hapus file?" message={confirmDelete ? `Hapus “${confirmDelete.title}” dari cloud? Berkas ikut terhapus permanen.` : ''} onCancel={() => setConfirmDelete(null)} onConfirm={remove} />
    {show&&<Modal title={editing?'Edit dokumen':'Tambah dokumen'} onClose={()=>{if(!busy)setShow(false)}} footer={<button type="submit" form="admin-cloud-form" disabled={busy||!form.judul.trim()} className="action-primary min-h-11 w-full rounded-xl px-4 font-bold disabled:opacity-40">{busy?'Menyimpan…':editing?'Simpan perubahan':'Unggah file'}</button>}><form id="admin-cloud-form" onSubmit={save}><fieldset disabled={busy} className="space-y-4">
      {message&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{message}</p>}
      {!editing&&<label className="relative flex min-h-20 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-teal-300 bg-teal-50 text-sm font-bold text-teal-800"><Upload size={18}/>{file?file.name:'Pilih berkas (maks 20 MB)'}<input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.png,.jpg,.jpeg,.webp" className="absolute inset-0 cursor-pointer opacity-0" onChange={e=>setFile(e.target.files?.[0]||null)}/></label>}
      <label className="block text-sm font-bold">Judul<input required className="field mt-1.5" value={form.judul} onChange={e=>setForm({...form,judul:e.target.value})}/></label>
      <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-bold">Kategori<select className="field mt-1.5" value={form.kategori} onChange={e=>setForm({...form,kategori:e.target.value})}>{DOCUMENT_CATEGORIES.map(v=><option key={v}>{v}</option>)}</select></label><div className="text-sm font-bold">Untuk kelas <span className="font-normal text-slate-400">(kosong = semua)</span><div className="mt-1.5 flex flex-wrap gap-1.5">{[1,2,3,4,5,6].map(g=><button type="button" key={g} aria-pressed={form.grades.includes(g)} onClick={()=>toggleGrade(g)} className={`grid size-11 place-items-center rounded-lg border text-sm font-bold ${form.grades.includes(g)?'border-teal-700 bg-teal-700 text-white':'border-slate-200 bg-white text-slate-600'}`}>{g}</button>)}</div></div></div>
      <label className="block text-sm font-bold">Deskripsi<textarea rows={3} className="field mt-1.5" value={form.deskripsi} onChange={e=>setForm({...form,deskripsi:e.target.value})}/></label>
    </fieldset></form></Modal>}
  </div>
}

// ---------------- Mode lokal (tanpa Supabase) ----------------
function AdminLokal() {
  const [items,setItems] = useState<PerangkatAjarCache[]>([])
  const [show,setShow] = useState(false)
  const [editing,setEditing] = useState<PerangkatAjarCache|null>(null)
  const [form,setForm] = useState(emptyForm)
  const [file,setFile] = useState<File|null>(null)
  const [busy,setBusy] = useState(false)
  const [message,setMessage] = useState('')
  const lock = useRef(false)
  const [confirmDelete, setConfirmDelete] = useState<PerangkatAjarCache | null>(null)
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
  const remove=async()=>{if(lock.current||!confirmDelete) return; const item = confirmDelete; setConfirmDelete(null); lock.current=true;setBusy(true);try{await db.perangkat_ajar_cache.delete(item.id);await load()}finally{lock.current=false;setBusy(false)}}
  return <div className="mx-auto max-w-6xl space-y-5 pb-12">
    <header className="flex flex-wrap items-start justify-between gap-3"><div><Link to="/" className="mb-3 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-teal-700"><ArrowLeft size={17}/>Kembali ke aplikasi</Link><h1 className="text-2xl font-black text-slate-900">Admin File Pak Choy</h1><p className="mt-1 text-sm text-slate-500">Kelola file yang tampil pada menu Perangkat Ajar.</p></div><button onClick={openNew} className="action-primary inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold"><Plus size={17}/>Tambah file</button></header>
    <aside className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><ShieldAlert className="shrink-0" size={20}/><p><strong>Mode admin lokal.</strong> File hanya tersedia pada browser ini. Isi VITE_SUPABASE_URL dan kunci publik di hosting agar tersambung ke cloud dan ada login admin.</p></aside>
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="border-b border-slate-100 px-5 py-4"><h2 className="font-extrabold text-slate-800">{items.length} file tersimpan</h2></div>
      <div className="divide-y divide-slate-100">{items.map(item=><article key={item.id} className="flex flex-wrap items-center gap-3 p-4 sm:p-5"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-700"><FileText size={20}/></span><div className="min-w-48 flex-1"><h3 className="break-words font-bold text-slate-800">{item.judul}</h3><p className="mt-1 text-xs text-slate-500">{item.jenis} · {item.format_file?.toUpperCase()||'FILE'} · {Math.max(1,Math.ceil((item.ukuran_file||0)/1024))} KB</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${item.status==='terbit'?'bg-emerald-100 text-emerald-800':'bg-slate-100 text-slate-600'}`}>{item.status==='terbit'?'Terbit':'Draft'}</span><button onClick={()=>openEdit(item)} className="grid size-11 place-items-center rounded-xl text-teal-700 hover:bg-teal-50" aria-label={`Edit ${item.judul}`}><Pencil size={17}/></button><button disabled={busy} onClick={()=>setConfirmDelete(item)} className="grid size-11 place-items-center rounded-xl text-red-700 hover:bg-red-50" aria-label={`Hapus ${item.judul}`}><Trash2 size={17}/></button></article>)}
      {!items.length&&<div className="grid min-h-52 place-items-center p-6 text-center text-sm text-slate-500"><div><Upload size={30} className="mx-auto mb-3 text-slate-300"/><p>Belum ada File Pak Choy. Pilih Tambah file untuk mulai.</p></div></div>}</div>
    </section>
    <ConfirmDialog open={!!confirmDelete} title="Hapus File Pak Choy?" message={confirmDelete ? `Hapus “${confirmDelete.judul}” dari File Pak Choy?` : ''} onCancel={() => setConfirmDelete(null)} onConfirm={remove} />
    {show&&<Modal title={editing?'Edit File Pak Choy':'Tambah File Pak Choy'} onClose={()=>{if(!busy)setShow(false)}} footer={<button type="submit" form="admin-file-form" disabled={busy||!form.judul.trim()} className="action-primary min-h-11 w-full rounded-xl px-4 font-bold disabled:opacity-40">{busy?'Menyimpan…':editing?'Simpan perubahan':'Simpan file'}</button>}><form id="admin-file-form" onSubmit={save}><fieldset disabled={busy} className="space-y-4">
      {message&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{message}</p>}
      <label className="relative flex min-h-20 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-teal-300 bg-teal-50 text-sm font-bold text-teal-800"><Upload size={18}/>{file?file.name:editing?'Ganti berkas (opsional)':'Pilih berkas'}<input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip" className="absolute inset-0 cursor-pointer opacity-0" onChange={event=>setFile(event.target.files?.[0]||null)}/></label>
      <label className="block text-sm font-bold">Judul<input required className="field mt-1.5" value={form.judul} onChange={e=>setForm({...form,judul:e.target.value})}/></label>
      <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-bold">Kategori<select className="field mt-1.5" value={form.jenis} onChange={e=>setForm({...form,jenis:e.target.value})}>{CATEGORIES.map(value=><option key={value}>{value}</option>)}</select></label><label className="text-sm font-bold">Status<select className="field mt-1.5" value={form.status} onChange={e=>setForm({...form,status:e.target.value as 'draft'|'terbit'})}><option value="draft">Draft</option><option value="terbit">Terbit</option></select></label><label className="text-sm font-bold">Mata pelajaran<input className="field mt-1.5" value={form.mata_pelajaran} onChange={e=>setForm({...form,mata_pelajaran:e.target.value})}/></label><label className="text-sm font-bold">Jenjang<input className="field mt-1.5" placeholder="Contoh: SD" value={form.jenjang} onChange={e=>setForm({...form,jenjang:e.target.value})}/></label><label className="text-sm font-bold">Kelas<input className="field mt-1.5" placeholder="Contoh: 5" value={form.kelas} onChange={e=>setForm({...form,kelas:e.target.value})}/></label><label className="text-sm font-bold">Versi<input className="field mt-1.5" value={form.versi} onChange={e=>setForm({...form,versi:e.target.value})}/></label></div>
      <label className="block text-sm font-bold">Deskripsi<textarea rows={3} className="field mt-1.5" value={form.deskripsi} onChange={e=>setForm({...form,deskripsi:e.target.value})}/></label>
    </fieldset></form></Modal>}
  </div>
}
