import { useEffect, useRef, useState } from 'react'
import Modal from '../../components/Modal'
import { FileText, FolderOpen, Plus, Upload, Download, Trash2 } from 'lucide-react'

const JENIS = ['CP','ATP','Prota','Promes','RPM','Modul Ajar','LKPD']
export default function PerangkatAjar() {
  const [tab,setTab] = useState('saya')
  const [category,setCategory] = useState('Semua')
  const [docs,setDocs] = useState<any[]>([])
  const [show,setShow] = useState(false)
  const [form,setForm] = useState({judul:'',kategori:'',deskripsi:''})
  const [file,setFile] = useState<File|null>(null)
  const [busy,setBusy] = useState(false)
  const lock = useRef(false)
  const [error,setError] = useState('')
  const [formError,setFormError] = useState('')
  const [loading,setLoading] = useState(true)
  const chooseFile = (selected:File|undefined) => {
    if (!selected) return
    setFile(selected)
    setForm(current=>({...current,judul:current.judul.trim() ? current.judul : selected.name.replace(/\.[^.]+$/,'').replace(/[_-]+/g,' ')}))
    setFormError('')
  }
  const load = async () => { try {setDocs(await window.electronAPI.dokumenSaya.list())} catch {setError('Daftar dokumen gagal dimuat. Muat ulang halaman.')} finally {setLoading(false)} }
  useEffect(() => {load()},[])
  const upload = async (event: React.FormEvent) => {
    event.preventDefault()
    if (lock.current || !file) return
    lock.current=true;setBusy(true);setFormError('')
    try {
      if (!form.judul.trim()) throw new Error('Judul wajib diisi.')
      await window.electronAPI.dokumenSaya.create({...form,judul:form.judul.trim(),file_data:new Uint8Array(await file.arrayBuffer()),format_file:file.name.split('.').pop()?.toLowerCase() || '',ukuran_file:file.size})
      setShow(false);setFile(null);await load()
    } catch {setFormError('Dokumen gagal disimpan. Pilihan berkas dan isian tetap tersedia; silakan coba lagi.')}
    finally {lock.current=false;setBusy(false)}
  }
  const download = (doc:any) => {
    try {
      if (!doc.file_data) throw new Error('Berkas tidak tersedia dalam dokumen ini.')
      const url=URL.createObjectURL(new Blob([new Uint8Array(doc.file_data)],{type:'application/octet-stream'}))
      const anchor=document.createElement('a');anchor.href=url
      anchor.download=`${String(doc.judul || 'dokumen').replace(/[<>:"/\\|?*]/g,'_')}${doc.format_file ? '.'+doc.format_file : ''}`
      document.body.appendChild(anchor);anchor.click();anchor.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000)
    } catch {setError('Berkas gagal diunduh. Periksa apakah dokumen memiliki berkas tersimpan.')}
  }
  const remove = async (doc:any) => {
    if (lock.current || !window.confirm(`Hapus dokumen ${doc.judul}?`)) return
    lock.current=true;setBusy(true);setError('')
    try {await window.electronAPI.dokumenSaya.delete(doc.id);await load()}
    catch {setError('Dokumen gagal dihapus. Silakan coba lagi.')}
    finally {lock.current=false;setBusy(false)}
  }
  return <div className="space-y-3">
    <h2 className="text-xl font-bold">Perangkat Ajar</h2>
    <div className="flex gap-2">{[['saya','Dokumen Saya'],['resmi','Dokumen Pak Choy']].map(([id,label])=><button key={id} aria-pressed={tab===id} onClick={()=>setTab(id)} className={`min-h-11 flex-1 rounded-xl border px-2 py-2 text-xs sm:text-sm font-semibold ${tab===id?'border-teal-700 bg-teal-700 text-white':'border-slate-200 bg-white text-slate-600'}`}>{label}</button>)}</div>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {tab==='resmi' ? <>
      <p className="text-sm text-slate-500">Kumpulan perangkat ajar dari Pak Choy.</p>
      <div className="flex flex-wrap gap-2" aria-label="Kategori dokumen Pak Choy">{['Semua',...JENIS].map(item=><button key={item} aria-pressed={category===item} onClick={()=>setCategory(item)} className={`min-h-11 rounded-lg border px-3 text-xs font-semibold ${category===item?'border-teal-700 bg-teal-700 text-white':'border-slate-200 bg-white text-slate-600'}`}>{item}</button>)}</div>
      <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-6 text-center"><FolderOpen size={30} className="mb-3 text-slate-400"/><h3 className="text-sm font-semibold text-slate-700">{category==='Semua'?'Dokumen Pak Choy belum tersedia':`${category} belum tersedia`}</h3><p className="mt-1 text-xs text-slate-500">Dokumen akan muncul setelah diterbitkan oleh Pak Choy.</p></div>
    </> : <>
      <p className="text-xs text-slate-500">Tersimpan di browser ini. Sertakan berkas dalam backup.</p>
      <button disabled={busy} onClick={()=>{setForm({judul:'',kategori:'',deskripsi:''});setFile(null);setFormError('');setShow(true)}} className="action-primary inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold"><Plus size={17}/>Tambah dokumen</button>
      {loading ? <p role="status">Memuat dokumen...</p> : <div className="space-y-3">{docs.map(doc=><article key={doc.id} className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="font-bold break-words">{doc.judul}</h3><p className="mt-1 text-sm text-slate-500 break-words">{doc.format_file?.toUpperCase()} {doc.kategori && `· ${doc.kategori}`} · {Math.ceil((doc.ukuran_file || 0)/1024)} KB</p>
        {doc.deskripsi && <p className="mt-2 text-sm whitespace-pre-wrap break-words">{doc.deskripsi}</p>}
        <div className="mt-3 flex flex-wrap gap-3"><button onClick={()=>download(doc)} className="action-mint inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 text-sm"><Download size={16}/>Unduh</button><button disabled={busy} onClick={()=>remove(doc)} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-red-200 px-4 text-sm text-red-700"><Trash2 size={16}/>Hapus</button></div>
      </article>)}{!docs.length && <p className="rounded-lg border border-dashed border-slate-200 bg-white p-5 text-center text-sm text-slate-500">Belum ada berkas. Pilih Tambah dokumen untuk mulai.</p>}</div>}
    </>}
    {show && <Modal title="Tambah dokumen saya" onClose={()=>{if(!lock.current)setShow(false)}} footer={<button type="submit" form="document-upload" disabled={!file || !form.judul.trim() || busy} className="action-primary min-h-11 w-full rounded-xl px-4 font-semibold disabled:opacity-40">{busy?'Menyimpan...':'Simpan dokumen'}</button>}><form id="document-upload" onSubmit={upload}><fieldset disabled={busy} className="min-w-0 space-y-4">
      {formError && <p role="alert" className="text-sm text-red-700">{formError}</p>}
      <div className="rounded-xl border border-dashed border-teal-200 bg-teal-50/50 p-4">
        {file && <div className="mb-3 flex items-start gap-2"><FileText size={19} className="shrink-0 text-teal-700"/><div className="min-w-0"><p className="break-words text-sm font-semibold text-slate-700">{file.name}</p><p className="mt-1 text-xs text-slate-500">{Math.max(1,Math.ceil(file.size/1024))} KB</p></div></div>}
        <label className="relative flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-teal-200 bg-white px-3 py-2 text-sm font-semibold text-teal-800 focus-within:ring-2 focus-within:ring-teal-600"><Upload size={17}/>{file?'Ganti berkas':'Pilih berkas'}<input aria-label="Pilih berkas dokumen" required type="file" onChange={e=>chooseFile(e.target.files?.[0])} className="absolute inset-0 h-full w-full cursor-pointer opacity-0"/></label>
      </div>
      <label className="block text-xs font-semibold text-slate-600">Judul dokumen<input required value={form.judul} onChange={e=>setForm({...form,judul:e.target.value})} placeholder="Contoh: LKPD Pecahan Kelas 5" className="field mt-1.5"/></label>
      <label className="block text-xs font-semibold text-slate-600">Kategori<select value={form.kategori} onChange={e=>setForm({...form,kategori:e.target.value})} className="field mt-1.5"><option value="">Tanpa kategori</option>{[...JENIS,'Lainnya'].map(item=><option key={item} value={item}>{item}</option>)}</select></label>
      <details><summary className="min-h-11 cursor-pointer content-center text-xs font-semibold text-slate-500">Tambah deskripsi (opsional)</summary><label className="mt-2 block text-xs font-semibold text-slate-600">Deskripsi<textarea value={form.deskripsi} onChange={e=>setForm({...form,deskripsi:e.target.value})} rows={2} className="field mt-1.5"/></label></details>
    </fieldset></form></Modal>}
  </div>
}
