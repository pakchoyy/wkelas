import { saveClassPeriod } from '../../../lib/grade-periods'
import { useEffect, useRef, useState } from 'react'
import { AlertCircle, BookOpen, CheckCircle, Database, Download, Save, School, Upload } from 'lucide-react'
import { db } from '../../../lib/db'
import { useAppStore } from '../../stores/appStore'
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges'

type Tab = 'profil' | 'kelas' | 'backup'

export default function Pengaturan() {
  const kelasId = useAppStore((s) => s.kelasAktifId) || 1
  return <PengaturanKelas key={kelasId} kelasId={kelasId}/>
}
function PengaturanKelas({kelasId}:{kelasId:number}) {
  const [busy,setBusy] = useState(false)
  const lock = useRef(false)
  const [error,setError] = useState('')
  const [loading,setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('profil')
  const [kelas, setKelas] = useState<any>(null)
  const [guru, setGuru] = useState<any>(null)
  const [toast, setToast] = useState('')
  const [savedClass, setSavedClass] = useState('null')
  const [savedTeacher, setSavedTeacher] = useState('null')
  const classDirty = !loading && JSON.stringify(kelas) !== savedClass
  const teacherDirty = !loading && JSON.stringify(guru) !== savedTeacher
  useUnsavedChanges(classDirty || teacherDirty, busy)
  const load = async () => {
    const k = await db.kelas.get(kelasId) || null
    const g = k?.guru_id ? await db.guru.get(k.guru_id) || null : null
    setKelas(k); setGuru(g)
    setSavedClass(JSON.stringify(k)); setSavedTeacher(JSON.stringify(g))
  }
  useEffect(()=>{load().catch(()=>setError('Pengaturan gagal dimuat. Muat ulang halaman.')).finally(()=>setLoading(false))},[kelasId])
  useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(''),2800);return()=>clearTimeout(timer)},[toast])
  const saveSettings = async (event:React.FormEvent,profile:boolean) => {
    event.preventDefault();if(lock.current || loading)return
    lock.current=true;setBusy(true);setError('')
    try {
      if(profile) {
        if(!guru?.id)throw new Error('Data guru belum tersedia. Muat ulang halaman.')
        const count=await db.guru.update(guru.id,{nama:guru.nama,nip:guru.nip,nama_sekolah:guru.nama_sekolah,updated_at:new Date().toISOString()})
        if(!count)throw new Error('Data guru tidak ditemukan.')
        setSavedTeacher(JSON.stringify(guru))
        setToast('Identitas sekolah dan guru berhasil disimpan')
      } else {
        if(!kelas?.id)throw new Error('Data kelas belum tersedia. Muat ulang halaman.')
        await saveClassPeriod(db,kelas);setToast('Periode aktif disimpan. Nilai periode lain tetap tersimpan.')
        setSavedClass(JSON.stringify(kelas))
      }
    } catch(error) {setError(error instanceof Error ? error.message : 'Pengaturan gagal disimpan. Isian tetap tersedia; silakan coba lagi.')}
    finally {lock.current=false;setBusy(false)}
  }


  const tabs=[{id:'profil' as Tab,label:'Sekolah & Guru',icon:School},{id:'kelas' as Tab,label:'Kelas & Semester',icon:BookOpen},{id:'backup' as Tab,label:'Data & Cadangan',icon:Database}]
  return <div className="mx-auto max-w-4xl space-y-4">
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}{loading && <p role="status">Memuat pengaturan...</p>}
    {toast&&<div className="fixed left-1/2 top-20 w-[calc(100%_-_2rem)] max-w-md z-[100] -translate-x-1/2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-xl">{toast}</div>}
    <div><h2 className="text-xl font-extrabold">Pengaturan</h2><p className="mt-1 text-sm text-slate-500">Data di sini digunakan pada Dashboard, Jurnal, dan laporan.</p></div>
    {(classDirty || teacherDirty) && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Belum disimpan: {[teacherDirty && 'Sekolah & Guru', classDirty && 'Kelas & Semester'].filter(Boolean).join(', ')}. Isian tetap ada saat berpindah tab. Simpan pada masing-masing tab sebelum meninggalkan halaman.</p>}
    <div className="flex gap-1 overflow-x-auto rounded-xl bg-slate-200/70 p-1 w-fit max-w-full">{tabs.map((item)=><button disabled={busy} aria-pressed={tab===item.id} key={item.id} onClick={()=>setTab(item.id)} className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-bold ${tab===item.id?'bg-white text-emerald-700 shadow-sm':'text-slate-500'}`}><item.icon size={16}/>{item.label}</button>)}</div>
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      {tab==='profil'&&<form onSubmit={e=>saveSettings(e,true)}><fieldset disabled={busy || loading} className="min-w-0 space-y-4"><div><h3 className="font-extrabold">Identitas Sekolah dan Guru</h3><p className="mt-1 text-xs text-slate-400">Akan ditampilkan pada kop jurnal dan laporan.</p></div><label className="block text-sm font-bold">Nama sekolah<input required value={guru?.nama_sekolah||''} onChange={(e)=>setGuru({...guru,nama_sekolah:e.target.value})} className="field mt-1.5"/></label><div className="grid gap-3 md:grid-cols-2"><label className="text-sm font-bold">Nama wali kelas<input required value={guru?.nama||''} onChange={(e)=>setGuru({...guru,nama:e.target.value})} className="field mt-1.5"/></label><label className="text-sm font-bold">NIP <span className="font-normal text-slate-400">(opsional)</span><input value={guru?.nip||''} onChange={(e)=>setGuru({...guru,nip:e.target.value})} className="field mt-1.5"/></label></div><button className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white"><Save size={16}/>Simpan Identitas</button></fieldset></form>}
      {tab==='kelas'&&<form onSubmit={e=>saveSettings(e,false)}><fieldset disabled={busy || loading} className="min-w-0 space-y-4"><div><h3 className="font-extrabold">Kelas dan Periode Akademik</h3><p className="mt-1 text-xs text-slate-400">Nilai dan bobot dipisahkan menurut tahun ajaran dan semester. Untuk membuka nilai lama, pilih kembali periode sebelumnya. Data siswa dan jadwal tetap digunakan. Nilai lama yang belum memiliki periode mengikuti periode kelas sebelum perubahan pertama.</p></div><div className="grid gap-3 md:grid-cols-2"><label className="text-sm font-bold">Nama kelas<input required value={kelas?.nama_kelas||''} onChange={(e)=>setKelas({...kelas,nama_kelas:e.target.value})} className="field mt-1.5"/></label><label className="text-sm font-bold">Tingkat kelas<select value={kelas?.tingkat||'1'} onChange={(e)=>setKelas({...kelas,tingkat:e.target.value})} className="field mt-1.5">{[1,2,3,4,5,6].map(n=><option key={n} value={n}>Kelas {n}</option>)}</select></label><label className="text-sm font-bold">Tahun ajaran<input required value={kelas?.tahun_ajaran||''} onChange={(e)=>setKelas({...kelas,tahun_ajaran:e.target.value})} className="field mt-1.5" placeholder="2026/2027"/></label><label className="text-sm font-bold">Semester<select value={kelas?.semester||1} onChange={(e)=>setKelas({...kelas,semester:Number(e.target.value)})} className="field mt-1.5"><option value={1}>Semester 1 (Ganjil)</option><option value={2}>Semester 2 (Genap)</option></select></label></div><button className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white"><Save size={16}/>Simpan Kelas</button></fieldset></form>}
      {tab==='backup'&&<Backup/>}
    </div>
  </div>
}

function Backup() {
  const [msg, setMsg] = useState<{ok:boolean;text:string}|null>(null)
  const [busy, setBusy] = useState(false)
  const run = async (action: 'create' | 'restore') => {
    if (busy) return
    setBusy(true)
    setMsg(null)
    try {
      const result = await window.electronAPI.backup[action]()
      if (!result.success) {
        setMsg({ok:false,text:result.error || 'Pemilihan file dibatalkan. Data tidak diubah.'})
        return
      }
      if (action === 'create') setMsg({ok:true,text:`Cadangan siap diunduh: ${result.path}. Pastikan file ada di folder Unduhan.`})
      else {
        setMsg({ok:true,text:'Data berhasil dipulihkan. Aplikasi akan dimuat ulang.'})
        setTimeout(() => window.location.reload(), 1300)
      }
    } catch {
      setMsg({ok:false,text:action === 'create' ? 'Cadangan gagal dibuat. Coba lagi; data Anda tetap tersimpan di browser ini.' : 'Pemulihan gagal. Data sebelumnya tetap tersimpan. Periksa file cadangan dan coba lagi.'})
    } finally { setBusy(false) }
  }
  return <div className="space-y-4">
    <div><h3 className="font-extrabold">Data & Cadangan</h3><p className="mt-1 text-sm text-slate-500">Simpan salinan data secara berkala dan sebelum memulihkan cadangan lain.</p></div>
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
      <strong>Data tersimpan di browser ini</strong>
      <p className="mt-1">Data belum tersinkron antara HP dan laptop. Menghapus data situs atau memakai browser lain dapat membuat data tidak tersedia di sini.</p>
      <p className="mt-2">Untuk pindah perangkat, buat cadangan, pindahkan file .bgy ke perangkat tujuan, lalu pilih Pulihkan Data. Pemulihan mengganti seluruh data pada browser tujuan.</p>
    </div>
    <div className="grid gap-3 md:grid-cols-2">
      <button disabled={busy} onClick={() => run('create')} className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-left text-emerald-800 disabled:opacity-50"><Download size={20}/><span><strong className="block">Buat Cadangan</strong><small>Simpan seluruh data dan dokumen ke file .bgy</small></span></button>
      <button disabled={busy} onClick={() => run('restore')} className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-left text-slate-700 disabled:opacity-50"><Upload size={20}/><span><strong className="block">Pulihkan Data</strong><small>Pilih file, periksa ringkasan, lalu konfirmasi</small></span></button>
    </div>
    {busy && <p role="status" className="text-sm text-slate-500">Memproses cadangan…</p>}
    {msg && <div role={msg.ok ? 'status' : 'alert'} className={`flex items-center gap-2 rounded-xl p-3 text-sm font-semibold ${msg.ok?'bg-emerald-50 text-emerald-700':'bg-red-50 text-red-700'}`}>{msg.ok ? <CheckCircle size={17}/> : <AlertCircle size={17}/>} {msg.text}</div>}
  </div>
}
