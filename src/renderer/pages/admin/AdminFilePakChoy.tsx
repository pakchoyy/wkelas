import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Bell, ChevronRight, Crown, FileText, KeyRound, LayoutDashboard, LogOut, Megaphone, Pencil, Plus, RefreshCw, Search, ShieldAlert, Trash2, Upload, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import Modal from '../../components/Modal'
import ConfirmDialog from '../../components/ConfirmDialog'
import { db, type PerangkatAjarCache } from '../../../lib/db'
import { primaryClient, useChoySession, choySignIn, choySignOut, listChoyUsers, type ChoyAdminUser } from '../../../lib/choy-auth'
import { listChoyDocuments } from '../../../lib/document-service'
import { type ChoyDocument } from '../../../shared/pak-choy-documents'
import AdminContentPanel from './AdminContentPanel'
import AdminFeedbackPanel from './AdminFeedbackPanel'
import AdminLicensePanel from './AdminLicensePanel'
import AdminDocuments from './AdminDocuments'
import ShareFolderButton from '../../components/ShareFolderButton'

type Section = 'ringkasan'|'pengguna'|'lisensi'|'masukan'|'pengumuman'|'versi'|'file'
const MENU_GROUPS: { title: string; items: { value: Section; label: string; hint: string; Icon: typeof Users }[] }[] = [
  { title: 'Umum', items: [{ value: 'ringkasan', label: 'Ringkasan', hint: 'Angka penting hari ini', Icon: LayoutDashboard }] },
  { title: 'Pelanggan', items: [
    { value: 'pengguna', label: 'Pengguna', hint: 'Cari akun dan lihat status Pro', Icon: Users },
    { value: 'lisensi', label: 'Lisensi Pro', hint: 'Aktifkan atau perpanjang Pro manual', Icon: KeyRound },
    { value: 'masukan', label: 'Masukan', hint: 'Saran dan laporan dari guru', Icon: Bell },
  ] },
  { title: 'Konten', items: [
    { value: 'file', label: 'Ref Dokumen', hint: 'Folder, file, dan link untuk guru', Icon: FileText },
    { value: 'pengumuman', label: 'Pengumuman', hint: 'Info yang muncul di aplikasi', Icon: Megaphone },
    { value: 'versi', label: 'Info pembaruan', hint: 'Catatan versi aplikasi', Icon: RefreshCw },
  ] },
]
const SECTION_LABEL = Object.fromEntries(MENU_GROUPS.flatMap(g => g.items).map(i => [i.value, i.label])) as Record<Section, string>

const CATEGORIES = ['CP','ATP','Prota','Promes','RPM','Modul Ajar','LKPD','Lainnya']
const emptyForm = { judul:'', jenis:'Modul Ajar', deskripsi:'', mata_pelajaran:'', jenjang:'', kelas:'', versi:'1.0', status:'terbit' as 'draft'|'terbit' }

export default function AdminFilePakChoy() {
  const cloud = primaryClient()
  if (cloud) return <AdminCloud client={cloud}/>
  return <AdminLokal/>
}

// ---------------- Mode cloud (Supabase, butuh login admin) ----------------
const adminDate = (value:string|null) => value ? new Intl.DateTimeFormat('id-ID',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value)) : 'Belum pernah'
function AdminCloud({client}:{client:NonNullable<ReturnType<typeof primaryClient>>}) {
  const { user, admin, checking } = useChoySession(client)
  const [section,setSection] = useState<Section>('ringkasan')
  const [items,setItems] = useState<ChoyDocument[]>([])
  const [loading,setLoading] = useState(true)
  const [users,setUsers] = useState<ChoyAdminUser[]>([])
  const [usersLoading,setUsersLoading] = useState(true)
  const [usersError,setUsersError] = useState('')
  const [userQuery,setUserQuery] = useState('')
  const [feedbackCount,setFeedbackCount] = useState<number|null>(null)
  const [busy,setBusy] = useState(false)
  const [message,setMessage] = useState('')
  const [login,setLogin] = useState({email:'',password:''})
  const lock = useRef(false)
  const load = async () => { try { setItems(await listChoyDocuments(client)) } catch { setMessage('Daftar gagal dimuat. Periksa koneksi lalu muat ulang.') } finally { setLoading(false) } }
  const loadUsers = async () => { setUsersError(''); try { setUsers(await listChoyUsers(client)) } catch(error) { setUsersError(error instanceof Error?error.message:'Daftar pengguna gagal dimuat.') } finally { setUsersLoading(false) } }
  useEffect(() => { if (admin) { void load(); void loadUsers(); void client.from('feedback').select('id',{count:'exact',head:true}).eq('status','baru').then(({count})=>setFeedbackCount(count||0),()=>setFeedbackCount(null)) } else { setLoading(false); setUsersLoading(false) } }, [admin])
  const doLogin = async (e:React.FormEvent) => { e.preventDefault(); if(lock.current)return; lock.current=true;setBusy(true);setMessage(''); try { await choySignIn(client,login.email,login.password) } catch(err) { setMessage(err instanceof Error?err.message:'Login gagal.') } finally { lock.current=false;setBusy(false) } }
  return <div className="mx-auto max-w-6xl space-y-5 px-4 pb-12 pt-4 sm:px-6">
    <header className="flex flex-wrap items-start justify-between gap-3"><div><Link to="/" className="mb-3 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-teal-700"><ArrowLeft size={17}/>Kembali ke aplikasi</Link><h1 className="text-2xl font-black text-slate-900">{section==='ringkasan'?'Admin Wkelas':SECTION_LABEL[section]}</h1><p className="mt-1 text-sm text-slate-500">{section==='ringkasan'?'Pelanggan, dokumen, dan info aplikasi.':MENU_GROUPS.flatMap(g=>g.items).find(i=>i.value===section)?.hint}</p></div>{user&&<button onClick={()=>void choySignOut(client)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-600"><LogOut size={16}/>Keluar</button>}</header>
    {message&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{message}</p>}
    {checking||loading ? <p role="status" className="text-sm text-slate-500">Memuat…</p> : !user ? <form onSubmit={doLogin} className="mx-auto max-w-sm space-y-3 rounded-2xl border border-slate-200 bg-white p-6"><h2 className="font-extrabold text-slate-800">Login admin</h2><label className="block text-sm font-bold">Email<input required type="email" value={login.email} onChange={e=>setLogin({...login,email:e.target.value})} className="field mt-1.5"/></label><label className="block text-sm font-bold">Kata sandi<input required type="password" value={login.password} onChange={e=>setLogin({...login,password:e.target.value})} className="field mt-1.5"/></label><button disabled={busy} className="action-primary min-h-11 w-full rounded-xl px-4 font-bold disabled:opacity-40">{busy?'Memeriksa…':'Masuk'}</button><div className="flex items-center gap-2 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-200"/>atau<span className="h-px flex-1 bg-slate-200"/></div><button type="button" disabled={busy} onClick={()=>{try{localStorage.setItem('bgy-after-login','/admin')}catch{};void client.auth.signInWithOAuth({provider:'google',options:{redirectTo:`${window.location.origin}/`,queryParams:{prompt:'select_account',...(login.email?{login_hint:login.email}:{})}}})}} className="min-h-11 w-full rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50">Masuk dengan Google</button><button type="button" disabled={busy} onClick={async()=>{if(!login.email.trim()){setMessage('Isi email dulu untuk menerima link reset kata sandi.');return}setBusy(true);setMessage('');const {error}=await client.auth.resetPasswordForEmail(login.email.trim(),{redirectTo:`${window.location.origin}/#/login`});setBusy(false);setMessage(error?'Link reset belum terkirim. Coba lagi sebentar lagi.':'Link reset kata sandi sudah dikirim ke email.')}} className="min-h-11 w-full text-sm font-semibold text-teal-700 hover:underline">Lupa kata sandi?</button></form>
    : !admin ? <aside className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><ShieldAlert className="shrink-0" size={20}/><p><strong>Akun ini bukan admin.</strong> Panel admin hanya untuk akun pemilik yang sudah terdaftar di tabel <code>pak_choy_admins</code>.</p></aside>
    : <div className="lg:grid lg:grid-cols-[230px_minmax(0,1fr)] lg:gap-6">
      <aside className="hidden lg:block"><nav aria-label="Menu admin" className="sticky top-4 space-y-5">
        {MENU_GROUPS.map(group=><div key={group.title}><p className="px-3 pb-2 text-xs font-black uppercase tracking-wider text-slate-400">{group.title}</p><div className="space-y-1">{group.items.map(({value,label,Icon})=><button key={value} type="button" aria-current={section===value?'page':undefined} onClick={()=>setSection(value)} className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-bold ${section===value?'bg-teal-700 text-white':'text-slate-600 hover:bg-slate-100'}`}><Icon size={17}/><span className="flex-1 text-left">{label}</span>{value==='masukan'&&!!feedbackCount&&<span className="rounded-full bg-amber-400 px-2 text-xs font-black text-amber-950">{feedbackCount}</span>}</button>)}</div></div>)}
      </nav></aside>
      <div className="min-w-0 space-y-4">
      {section!=='ringkasan'&&<button type="button" onClick={()=>setSection('ringkasan')} className="inline-flex min-h-11 items-center gap-2 rounded-xl text-sm font-bold text-teal-700 lg:hidden"><ArrowLeft size={17}/>Menu admin</button>}
      {section==='ringkasan'&&<>
        <section aria-label="Angka penting" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {([
            ['Pengguna',usersLoading?'—':users.length,'pengguna',Users,'text-teal-700 bg-teal-50'],
            ['Pengguna Pro',usersLoading?'—':users.filter(u=>u.plan==='pro').length,'lisensi',Crown,'text-amber-700 bg-amber-50'],
            ['Dokumen terbit',loading?'—':items.filter(item=>item.published).length,'file',FileText,'text-sky-700 bg-sky-50'],
            ['Masukan baru',feedbackCount===null?'—':feedbackCount,'masukan',Bell,'text-rose-700 bg-rose-50'],
          ] as const).map(([label,value,target,Icon,tone])=><button key={label} type="button" onClick={()=>setSection(target)} className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-teal-300"><span className={`grid size-9 place-items-center rounded-xl ${tone}`}><Icon size={18}/></span><p className="mt-3 text-2xl font-black text-slate-900">{value}</p><p className="text-sm font-semibold text-slate-500">{label}</p></button>)}
        </section>
        {usersError&&<p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{usersError}</p>}
        <section className="flex flex-wrap items-center gap-3 rounded-2xl bg-teal-700 p-4 text-white"><div className="min-w-0 flex-1"><h2 className="font-extrabold">Bagikan Ref Dokumen</h2><p className="text-sm text-teal-50">Link publik, bisa dibuka guru tanpa daftar. Cocok untuk channel WA.</p></div><ShareFolderButton folderId={null} name="Ref Dokumen" always/></section>
        {MENU_GROUPS.map(group=><section key={group.title} className="lg:hidden"><h2 className="px-1 pb-2 text-xs font-black uppercase tracking-wider text-slate-400">{group.title}</h2><div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">{group.items.filter(item=>item.value!=='ringkasan').map(({value,label,hint,Icon})=><button key={value} type="button" onClick={()=>setSection(value)} className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700"><Icon size={19}/></span><span className="min-w-0 flex-1"><span className="block font-bold text-slate-800">{label}</span><span className="block text-xs text-slate-500">{hint}</span></span>{value==='masukan'&&!!feedbackCount&&<span className="rounded-full bg-amber-400 px-2 text-xs font-black text-amber-950">{feedbackCount}</span>}<ChevronRight size={17} className="text-slate-400"/></button>)}</div></section>)}
      </>}
      {section==='pengguna'&&<section className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="border-b border-slate-100 px-5 py-4"><h2 className="font-extrabold text-slate-800">Pengguna terdaftar</h2><p className="mt-1 text-sm text-slate-500">Akun yang masuk melalui Google atau email. {users.filter(u=>u.plan==='pro').length} Pro.</p><label className="relative mt-3 block"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={userQuery} onChange={e=>setUserQuery(e.target.value)} placeholder="Cari nama atau email" aria-label="Cari pengguna" className="field pl-9"/></label></div>
        {usersError?<div className="p-5"><p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{usersError}</p></div>:usersLoading?<p role="status" className="p-5 text-sm text-slate-500">Memuat pengguna…</p>:<div className="divide-y divide-slate-100">{users.filter(account=>{const q=userQuery.trim().toLowerCase();return !q||account.email.toLowerCase().includes(q)||(account.full_name||'').toLowerCase().includes(q)}).map(account=><article key={account.user_id} className="flex items-center gap-3 p-4 sm:p-5">{account.avatar_url?<img src={account.avatar_url} alt="" className="size-11 shrink-0 rounded-full object-cover" referrerPolicy="no-referrer"/>:<span className="grid size-11 shrink-0 place-items-center rounded-full bg-teal-100 font-black text-teal-800">{(account.full_name||account.email).charAt(0).toUpperCase()}</span>}<div className="min-w-0 flex-1"><h3 className="truncate font-bold text-slate-800">{account.full_name||'Tanpa nama'}</h3><p className="truncate text-sm text-slate-500">{account.email}</p><p className="mt-1 text-xs text-slate-400">Daftar {adminDate(account.created_at)} · Terakhir masuk {adminDate(account.last_sign_in_at)}</p></div><div className="shrink-0 text-right">{account.plan==='pro'?<span className="rounded-full bg-teal-100 px-2.5 py-1 text-xs font-bold text-teal-800">PRO</span>:<span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">Gratis</span>}{account.plan==='pro'&&account.pro_until&&<p className="mt-1 text-xs text-slate-500">s.d. {adminDate(account.pro_until).split(',')[0]}</p>}</div></article>)}{!users.length&&<p className="p-8 text-center text-sm text-slate-500">Belum ada pengguna terdaftar.</p>}</div>}
      </section>}
      {section==='lisensi'&&<AdminLicensePanel client={client}/>}
      {section==='masukan'&&<AdminFeedbackPanel client={client}/>}
      {section==='pengumuman'&&<AdminContentPanel client={client} kind="pengumuman"/>}
      {section==='versi'&&<AdminContentPanel client={client} kind="versi"/>}
      {section==='file'&&<AdminDocuments client={client} items={items} onChanged={load}/>}
      </div>
    </div>}
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
  const load = async () => setItems(await (await db.perangkat_ajar_cache.toArray()).sort((a,b)=>String(b.updated_at).localeCompare(String(a.updated_at))))
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
  return <div className="mx-auto max-w-6xl space-y-5 px-4 pb-12 pt-4 sm:px-6">
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
