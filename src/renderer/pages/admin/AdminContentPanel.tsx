import { useEffect, useState } from 'react'
import { Bell, CheckCircle2, Plus, Trash2, UploadCloud } from 'lucide-react'
import type { SupabaseClient } from '@supabase/supabase-js'

type Kind = 'pengumuman' | 'versi'
type Announcement = { id:string; judul:string; isi:string; jenis:string; target:string; is_aktif:boolean; created_at:string }
type AppVersion = { id:string; versi:string; platform:string; tipe:string; changelog:string; url_download:string|null; is_wajib:boolean; tanggal_rilis:string; created_at:string }

export default function AdminContentPanel({ client, kind }: { client: SupabaseClient; kind: Kind }) {
  const [announcements,setAnnouncements] = useState<Announcement[]>([])
  const [versions,setVersions] = useState<AppVersion[]>([])
  const [loading,setLoading] = useState(true)
  const [saving,setSaving] = useState(false)
  const [error,setError] = useState('')
  const [showForm,setShowForm] = useState(false)
  const [announcementForm,setAnnouncementForm] = useState({judul:'',isi:'',jenis:'info',target:'semua'})
  const [versionForm,setVersionForm] = useState({versi:'',changelog:'',platform:'all',tipe:'stable',tanggal_rilis:new Date().toISOString().slice(0,10),url_download:''})
  const load = async () => {
    setLoading(true); setError('')
    const table = kind === 'pengumuman' ? 'announcements' : 'app_versions'
    const {data,error:loadError} = await client.from(table).select('*').order(kind === 'pengumuman' ? 'created_at' : 'tanggal_rilis',{ascending:false}).limit(100)
    if (loadError) setError('Menu ini belum aktif. Jalankan SQL Admin Konten di Supabase lalu muat ulang.')
    else if (kind === 'pengumuman') setAnnouncements((data||[]) as Announcement[])
    else setVersions((data||[]) as AppVersion[])
    setLoading(false)
  }
  useEffect(()=>{ void load() },[kind])
  const save = async (event:React.FormEvent) => {
    event.preventDefault(); if(saving)return; setSaving(true); setError('')
    const payload = kind === 'pengumuman' ? {...announcementForm,created_by:(await client.auth.getUser()).data.user?.id||null} : {...versionForm,url_download:versionForm.url_download||null}
    const {error:saveError} = await client.from(kind === 'pengumuman' ? 'announcements' : 'app_versions').insert(payload)
    if(saveError) setError('Belum berhasil disimpan. Periksa kolom isian dan jalankan SQL Admin Konten.')
    else { setShowForm(false); setAnnouncementForm({judul:'',isi:'',jenis:'info',target:'semua'}); setVersionForm({...versionForm,versi:'',changelog:'',url_download:''}); await load() }
    setSaving(false)
  }
  const remove = async (id:string) => { if(!window.confirm('Hapus item ini?'))return; const {error:deleteError}=await client.from(kind==='pengumuman'?'announcements':'app_versions').delete().eq('id',id); if(deleteError)setError('Item belum berhasil dihapus.'); else await load() }
  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4"><div><h2 className="font-extrabold text-slate-800">{kind==='pengumuman'?'Pengumuman':'Versi aplikasi'}</h2><p className="mt-1 text-sm text-slate-500">{kind==='pengumuman'?'Informasi yang tampil untuk pengguna.':'Catatan rilis dan tautan pembaruan aplikasi.'}</p></div><button type="button" onClick={()=>setShowForm(v=>!v)} className="action-primary inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold"><Plus size={17}/>{kind==='pengumuman'?'Tambah pengumuman':'Tambah versi'}</button></div>
    {error&&<p role="alert" className="m-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{error}</p>}
    {showForm&&<form onSubmit={save} className="border-b border-slate-100 bg-slate-50 p-5"><fieldset disabled={saving} className="space-y-3">{kind==='pengumuman'?<><label className="block text-sm font-bold">Judul<input required maxLength={160} value={announcementForm.judul} onChange={e=>setAnnouncementForm({...announcementForm,judul:e.target.value})} className="field mt-1.5"/></label><label className="block text-sm font-bold">Isi<textarea required maxLength={4000} rows={4} value={announcementForm.isi} onChange={e=>setAnnouncementForm({...announcementForm,isi:e.target.value})} className="field mt-1.5"/></label><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-bold">Jenis<select value={announcementForm.jenis} onChange={e=>setAnnouncementForm({...announcementForm,jenis:e.target.value})} className="field mt-1.5"><option value="info">Info</option><option value="update">Pembaruan</option><option value="penting">Penting</option><option value="peringatan">Peringatan</option></select></label><label className="text-sm font-bold">Untuk<select value={announcementForm.target} onChange={e=>setAnnouncementForm({...announcementForm,target:e.target.value})} className="field mt-1.5"><option value="semua">Semua pengguna</option><option value="free">Gratis</option><option value="pro">Pro</option></select></label></div></>:<><label className="block text-sm font-bold">Nomor versi<input required maxLength={32} placeholder="Contoh: 1.1.0" value={versionForm.versi} onChange={e=>setVersionForm({...versionForm,versi:e.target.value})} className="field mt-1.5"/></label><label className="block text-sm font-bold">Catatan perubahan<textarea maxLength={4000} rows={4} value={versionForm.changelog} onChange={e=>setVersionForm({...versionForm,changelog:e.target.value})} className="field mt-1.5"/></label><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-bold">Tanggal rilis<input required type="date" value={versionForm.tanggal_rilis} onChange={e=>setVersionForm({...versionForm,tanggal_rilis:e.target.value})} className="field mt-1.5"/></label><label className="text-sm font-bold">Platform<select value={versionForm.platform} onChange={e=>setVersionForm({...versionForm,platform:e.target.value})} className="field mt-1.5"><option value="all">Semua</option><option value="windows">Windows</option><option value="macos">macOS</option></select></label></div><label className="block text-sm font-bold">Tautan unduhan (opsional)<input type="url" value={versionForm.url_download} onChange={e=>setVersionForm({...versionForm,url_download:e.target.value})} className="field mt-1.5"/></label></>}</fieldset><button disabled={saving} className="action-primary mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold">{saving?'Menyimpan…':'Simpan'}</button></form>}
    {loading?<p role="status" className="p-5 text-sm text-slate-500">Memuat…</p>:kind==='pengumuman'?<div className="divide-y divide-slate-100">{announcements.map(item=><article key={item.id} className="flex items-start gap-3 p-4 sm:p-5"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700"><Bell size={18}/></span><div className="min-w-0 flex-1"><h3 className="font-bold text-slate-800">{item.judul}</h3><p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{item.isi}</p><p className="mt-2 text-xs text-slate-400">{item.jenis} · {item.target} · {new Date(item.created_at).toLocaleDateString('id-ID')}</p></div><button type="button" onClick={()=>void remove(item.id)} aria-label={`Hapus ${item.judul}`} className="grid size-11 shrink-0 place-items-center rounded-xl text-red-700 hover:bg-red-50"><Trash2 size={17}/></button></article>)}{!announcements.length&&<EmptyContent icon={<Bell size={24}/>} text="Belum ada pengumuman."/>}</div>:<div className="divide-y divide-slate-100">{versions.map(item=><article key={item.id} className="flex items-start gap-3 p-4 sm:p-5"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-sky-100 text-sky-700"><UploadCloud size={18}/></span><div className="min-w-0 flex-1"><h3 className="font-bold text-slate-800">Versi {item.versi}</h3><p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{item.changelog||'Tidak ada catatan perubahan.'}</p><p className="mt-2 text-xs text-slate-400">{item.platform} · {item.tipe} · rilis {new Date(item.tanggal_rilis).toLocaleDateString('id-ID')}</p></div><button type="button" onClick={()=>void remove(item.id)} aria-label={`Hapus versi ${item.versi}`} className="grid size-11 shrink-0 place-items-center rounded-xl text-red-700 hover:bg-red-50"><Trash2 size={17}/></button></article>)}{!versions.length&&<EmptyContent icon={<CheckCircle2 size={24}/>} text="Belum ada catatan versi."/>}</div>}
  </section>
}
function EmptyContent({icon,text}:{icon:React.ReactNode;text:string}) { return <div className="grid min-h-40 place-items-center gap-2 p-6 text-center text-sm text-slate-500"><span className="text-slate-300">{icon}</span><p>{text}</p></div> }
