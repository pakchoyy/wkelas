import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, ChevronRight, ClipboardCheck, Download, NotebookPen, ScrollText, WifiOff, ExternalLink, FileText, Folder, FolderOpen } from 'lucide-react'
import { backendClients } from '../../../lib/choy-auth'
import { downloadChoyDocument, listChoyDocuments, listChoyFolders, openChoyLink } from '../../../lib/document-service'
import { documentAudience, documentSize, isLinkItem, type ChoyDocument } from '../../../shared/pak-choy-documents'
import { childFolders, folderPath, linkKind, visibleFolderIds, type ChoyFolder } from '../../../shared/pak-choy-folders'
import ShareFolderButton from '../../components/ShareFolderButton'

// Halaman publik Ref Dokumen: bisa dibuka dan diunduh tanpa daftar.
export default function RefPublik() {
  const { folderId = null } = useParams()
  const navigate = useNavigate()
  const [folders, setFolders] = useState<ChoyFolder[]>([])
  const [docs, setDocs] = useState<{ doc: ChoyDocument; backend: number }[]>([])
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading')
  const [error, setError] = useState('')
  useEffect(() => {
    const clients = backendClients()
    if (!clients[0]) { setState('error'); return }
    Promise.all([
      listChoyFolders(clients[0]),
      Promise.all(clients.map((client, backend) => listChoyDocuments(client).then(list => list.filter(doc => doc.published).map(doc => ({ doc, backend }))).catch(() => []))).then(lists => lists.flat()),
    ]).then(([f, d]) => { setFolders(f); setDocs(d); setState('ok') }, () => setState('error'))
  }, [])
  useEffect(() => { document.title = 'Ref Dokumen Gratis · Wkelas' }, [])

  const visible = visibleFolderIds(folders, docs.map(({ doc }) => doc))
  const subfolders = childFolders(folders, folderId).filter(folder => visible.has(folder.id))
  const items = docs.filter(({ doc }) => (doc.folder_id ?? null) === folderId).sort((a, b) => a.doc.title.localeCompare(b.doc.title, 'id', { numeric: true }))
  const crumbs = folderPath(folders, folderId)
  const current = crumbs[crumbs.length - 1]
  const go = (id: string | null) => navigate(id ? `/ref/${id}` : '/ref')
  const open = async ({ doc, backend }: { doc: ChoyDocument; backend: number }) => {
    try { if (isLinkItem(doc)) { openChoyLink(doc); return } await downloadChoyDocument(backendClients()[backend], doc) }
    catch { setError('Berkas gagal dibuka. Periksa koneksi lalu coba lagi.') }
  }

  return <div className="min-h-screen bg-slate-50">
    <header className="bg-teal-700 px-4 py-5 text-white"><div className="mx-auto max-w-5xl">
      <p className="text-xs font-semibold uppercase tracking-wide text-teal-100">Wkelas · gratis untuk guru</p>
      <h1 className="mt-1 text-xl font-bold">{current?.name || 'Ref Dokumen'}</h1>
      <p className="mt-1 text-sm text-teal-50">Perangkat ajar, buku, dan administrasi guru. Langsung buka atau unduh, tanpa daftar.</p>
    </div></header>
    <main className="mx-auto max-w-5xl space-y-4 px-4 py-5">
      {current && <button type="button" onClick={() => go(current.parent_id)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 hover:bg-slate-50"><ArrowLeft size={16}/>Kembali{crumbs.length > 1 ? ` ke ${crumbs[crumbs.length - 2].name}` : ''}</button>}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <nav aria-label="Lokasi folder" className="flex flex-wrap items-center gap-1 text-sm"><button type="button" onClick={() => go(null)} className="min-h-11 rounded-lg px-2 font-bold text-teal-700 hover:bg-teal-50">Semua</button>{crumbs.map(folder => <span key={folder.id} className="flex items-center gap-1"><ChevronRight size={15} className="text-slate-400"/><button type="button" onClick={() => go(folder.id)} className="min-h-11 rounded-lg px-2 font-bold text-teal-700 hover:bg-teal-50">{folder.name}</button></span>)}</nav>
        <ShareFolderButton folderId={folderId} name={current?.name || 'Ref Dokumen'}/>
      </div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {state === 'loading' && <p role="status" className="text-sm text-slate-500">Memuat dokumen…</p>}
      {state === 'error' && <p role="alert" className="text-sm text-red-700">Dokumen gagal dimuat. Periksa koneksi lalu muat ulang.</p>}
      {subfolders.length > 0 && <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{subfolders.map(folder => <button key={folder.id} type="button" onClick={() => go(folder.id)} className="flex min-h-14 items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left hover:bg-slate-50"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600"><Folder size={20}/></span><span className="min-w-0 flex-1 break-words font-bold text-slate-800">{folder.name}</span><ChevronRight size={17} className="shrink-0 text-slate-400"/></button>)}</div>}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{items.map(item => <article key={`${item.backend}-${item.doc.id}`} className="flex flex-col rounded-xl border border-slate-200 bg-white p-4">{isLinkItem(item.doc) ? <ExternalLink size={22} className="text-sky-700"/> : <FileText size={22} className="text-teal-700"/>}<h2 className="mt-3 break-words font-bold text-slate-800">{item.doc.title}</h2><p className="mt-1 text-xs text-slate-500">{isLinkItem(item.doc) ? linkKind(item.doc.link_url) : `${item.doc.category} · ${documentAudience(item.doc.target_grades)} · ${documentSize(item.doc.file_size)}`}</p>{item.doc.description && <p className="mt-3 flex-1 text-sm leading-6 text-slate-600">{item.doc.description}</p>}<button onClick={() => void open(item)} className="action-mint mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-bold">{isLinkItem(item.doc) ? <><ExternalLink size={16}/>Buka link</> : <><Download size={16}/>Unduh</>}</button></article>)}</div>
      {state === 'ok' && !items.length && !subfolders.length && <div className="flex min-h-40 flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-6 text-center"><FolderOpen size={30} className="mb-3 text-slate-400"/><p className="text-sm font-semibold text-slate-700">Folder ini belum berisi dokumen</p></div>}
      <section aria-label="Kenalan dengan Wkelas" className="overflow-hidden rounded-2xl bg-gradient-to-br from-teal-800 to-emerald-700 text-white shadow-lg">
        <div className="p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-teal-100">Untuk wali kelas SD</p>
          <h2 className="mt-1 text-xl font-extrabold leading-snug">Urusan kelas beres dari HP, tanpa tumpukan buku.</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            {[[ClipboardCheck,'Presensi harian: ketuk nama siswa, rekap bulanan jadi sendiri.'],[ScrollText,'Nilai per mapel langsung terekap, siap dicetak.'],[NotebookPen,'Jurnal mengajar dan jadwal pelajaran di satu tempat.'],[WifiOff,'Tetap jalan tanpa sinyal. Data aman di perangkat Anda.']].map(([Icon,text]) => { const I = Icon as typeof WifiOff; return <li key={text as string} className="flex items-start gap-2.5"><span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-lg bg-white/15"><I size={14}/></span><span>{text as string}</span></li> })}
          </ul>
        </div>
        <div className="flex flex-wrap items-center gap-3 bg-black/15 px-5 py-4">
          <Link to="/login" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-white px-5 text-sm font-extrabold text-teal-800 hover:bg-teal-50">Pakai Wkelas gratis<ArrowRight size={16}/></Link>
          <span className="text-xs text-teal-50">Daftar cukup dengan akun Google.</span>
        </div>
      </section>
    </main>
  </div>
}
