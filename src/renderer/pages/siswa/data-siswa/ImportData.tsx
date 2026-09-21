import { useRef, useState } from 'react'
import Modal from '../../../components/Modal'
import type { SiswaFieldDefinition } from '../../../../shared/types'
import { downloadTemplate, readStudentFile, importRows, type ImportResult } from '../../../lib/spreadsheet'
import { CheckCircle2, Download, FileSpreadsheet, UploadCloud, X } from 'lucide-react'

interface Props { fields: SiswaFieldDefinition[]; kelasId:number; onClose:() => void; onImported:(result:ImportResult) => void }
export default function ImportData({fields,kelasId,onClose,onImported}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const lock = useRef(false)
  const [rows,setRows] = useState<string[][]|null>(null)
  const [fileName,setFileName] = useState('')
  const [result,setResult] = useState<ImportResult|null>(null)
  const [busy,setBusy] = useState(false)
  const [error,setError] = useState('')
  const [notice,setNotice] = useState('')
  const close = () => { if (lock.current) return; if (result) onImported(result); onClose() }
  const pick = async (file?:File) => {
    if (!file || lock.current) return
    lock.current = true; setBusy(true); setError(''); setRows(null)
    try {
      const parsed = await readStudentFile(file)
      if (parsed.length < 2 || !parsed[0].some(h => h.trim().toLowerCase() === 'nama')) throw new Error('File harus berisi kolom Nama dan minimal satu baris siswa.')
      setRows(parsed); setFileName(file.name)
    } catch(e) { setError(e instanceof Error ? e.message : 'File gagal dibaca.') }
    finally { lock.current = false; setBusy(false) }
  }
  const run = async () => {
    if (!rows || lock.current) return
    lock.current = true; setBusy(true); setError('')
    try { setResult(await importRows(rows,fields,kelasId)); setRows(null) }
    catch { setError('Impor gagal. Periksa data dan coba lagi.') }
    finally { lock.current = false; setBusy(false) }
  }
  const handleTemplate = async () => {
    try {
      await downloadTemplate(await window.electronAPI.fieldDef.list(kelasId))
      setNotice('Template berhasil diunduh.')
      setError('')
    } catch {
      setError('Template gagal dibuat.')
    }
  }
  return <Modal title="Impor Data Siswa" onClose={close} maxWidth="max-w-xl">
    {notice && <div className="fixed inset-x-0 top-6 z-[600] flex justify-center px-4 pointer-events-none"><div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-emerald-200 bg-white px-5 py-3.5 text-sm font-semibold text-emerald-800 shadow-xl"><span className="grid size-8 place-items-center rounded-full bg-emerald-100"><CheckCircle2 size={18}/></span><span>{notice}</span><button aria-label="Tutup pemberitahuan" onClick={() => setNotice('')} className="opacity-50 hover:opacity-100"><X size={15}/></button></div></div>}
    <div className="mb-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-cyan-50 p-4 ring-1 ring-emerald-100">
      <div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-emerald-700 shadow-sm"><FileSpreadsheet size={22}/></span><div><p className="font-bold text-slate-900">Mulai dari template</p><p className="mt-1 text-sm leading-relaxed text-slate-600">Template mengikuti kolom yang kamu atur. Isi nama siswa di Excel/CSV, lalu unggah kembali di sini.</p></div></div>
    </div>
    {error && <p role="alert" className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {busy && <p role="status" className="mb-3 text-sm">Memproses file...</p>}
    {!result && <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2"><button disabled={busy} onClick={handleTemplate} className="flex min-h-14 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-bold text-emerald-800 shadow-sm transition active:scale-[0.96] disabled:opacity-50"><Download size={17}/>Unduh Template</button><button disabled={busy} onClick={() => fileRef.current?.click()} className="flex min-h-14 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition active:scale-[0.96] disabled:opacity-50"><UploadCloud size={17}/>Pilih Excel / CSV</button></div>
      <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" disabled={busy} onChange={e => {pick(e.target.files?.[0]); e.currentTarget.value=''}}/>
      {rows && <><p className="text-sm font-semibold">{fileName} · {rows.slice(1).filter(r=>r.some(c=>c.trim())).length} baris</p><p className="text-xs text-slate-500">Pratinjau 5 baris. NIS yang sudah ada akan dilewati; data lama tetap.</p><div className="overflow-auto rounded-lg border"><table className="w-full text-xs"><thead><tr>{rows[0].map((h,i)=><th key={i} className="border p-2 text-left">{h}</th>)}</tr></thead><tbody>{rows.slice(1,6).map((r,i)=><tr key={i}>{r.map((c,j)=><td key={j} className="border p-2">{c}</td>)}</tr>)}</tbody></table></div><button disabled={busy} onClick={run} className="rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white disabled:opacity-50">Impor Data</button></>}
    </div>}
    {result && <div role="status" className="space-y-3"><p className="font-bold">{result.ok} ditambahkan · {result.dilewati || 0} dilewati · {result.gagal} gagal</p><p className="text-xs text-slate-500">Total {result.total} baris. Data lama tidak ditimpa.</p><div className="max-h-64 space-y-1 overflow-y-auto text-sm">{result.pesan.map((message,i)=><p key={i}>{message}</p>)}</div><button onClick={close} className="rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white">Selesai</button></div>}
  </Modal>
}
