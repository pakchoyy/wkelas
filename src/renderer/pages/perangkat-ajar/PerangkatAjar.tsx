import { useEffect, useRef, useState } from 'react'
import Modal from '../../components/Modal'

const JENIS = ['CP','ATP','Prota','Promes','RPM','Modul Ajar']
export default function PerangkatAjar() {
  const [tab,setTab] = useState('saya')
  const [docs,setDocs] = useState<any[]>([])
  const [show,setShow] = useState(false)
  const [form,setForm] = useState({judul:'',kategori:'',deskripsi:''})
  const [file,setFile] = useState<File|null>(null)
  const [busy,setBusy] = useState(false)
  const lock = useRef(false)
  const [error,setError] = useState('')
  const [formError,setFormError] = useState('')
  const [loading,setLoading] = useState(true)
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
    <div className="flex gap-2">{[['saya','Dokumen Saya'],['resmi','Dokumen Resmi']].map(([id,label])=><button key={id} aria-pressed={tab===id} onClick={()=>setTab(id)} className={`min-h-11 flex-1 rounded-xl border px-3 text-sm font-semibold ${tab===id?'bg-teal-600 text-white':'bg-white'}`}>{label}</button>)}</div>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {tab==='resmi' ? <><p className="text-sm text-slate-500">Dokumen resmi belum tersedia. Gunakan Dokumen Saya untuk menyimpan berkas Anda.</p><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{JENIS.map(j=><div key={j} className="rounded-xl border bg-white p-4"><h3 className="font-bold">{j}</h3><p className="text-sm text-slate-500">Belum tersedia</p></div>)}</div></> : <>
      <p className="text-xs text-slate-500">Tersimpan di browser ini. Sertakan berkas dalam backup.</p>
      <button disabled={busy} onClick={()=>{setForm({judul:'',kategori:'',deskripsi:''});setFile(null);setFormError('');setShow(true)}} className="min-h-11 rounded-xl bg-teal-600 px-3 text-sm text-white font-semibold">+ Dokumen</button>
      {loading ? <p role="status">Memuat dokumen...</p> : <div className="space-y-3">{docs.map(doc=><article key={doc.id} className="rounded-xl border bg-white p-4">
        <h3 className="font-bold break-words">{doc.judul}</h3><p className="mt-1 text-sm text-slate-500 break-words">{doc.format_file?.toUpperCase()} {doc.kategori && `· ${doc.kategori}`} · {Math.ceil((doc.ukuran_file || 0)/1024)} KB</p>
        {doc.deskripsi && <p className="mt-2 text-sm whitespace-pre-wrap break-words">{doc.deskripsi}</p>}
        <div className="mt-3 flex flex-wrap gap-3"><button onClick={()=>download(doc)} className="min-h-11 rounded-lg border px-4 text-sm text-teal-700">Unduh</button><button disabled={busy} onClick={()=>remove(doc)} className="min-h-11 rounded-lg border border-red-200 px-4 text-sm text-red-700">Hapus</button></div>
      </article>)}{!docs.length && <p className="rounded-lg border border-dashed border-slate-200 bg-white p-5 text-center text-sm text-slate-500">Belum ada berkas. Pilih + Dokumen untuk mulai.</p>}</div>}
    </>}
    {show && <Modal title="Tambah dokumen" onClose={()=>{if(!lock.current)setShow(false)}}><form onSubmit={upload}><fieldset disabled={busy} className="min-w-0 space-y-4">
      {formError && <p role="alert" className="text-sm text-red-700">{formError}</p>}
      <label className="block text-sm">Judul<input required value={form.judul} onChange={e=>setForm({...form,judul:e.target.value})} className="field mt-1"/></label>
      <label className="block text-sm">Kategori (opsional)<input value={form.kategori} onChange={e=>setForm({...form,kategori:e.target.value})} className="field mt-1"/></label>
      <label className="block text-sm">Deskripsi (opsional)<textarea value={form.deskripsi} onChange={e=>setForm({...form,deskripsi:e.target.value})} className="field mt-1"/></label>
      <label className="block text-sm">Berkas<input required type="file" onChange={e=>setFile(e.target.files?.[0] || null)} className="mt-2 block w-full min-w-0 text-sm"/></label>
      <button disabled={!file || busy} className="min-h-11 w-full rounded-xl bg-teal-600 px-4 text-white disabled:opacity-40">{busy?'Menyimpan...':'Simpan dokumen'}</button>
    </fieldset></form></Modal>}
  </div>
}
