import { useEffect, useRef, useState } from 'react'
import { ChevronRight, ExternalLink, FileText, Folder, FolderPlus, Link2, Pencil, Plus, Trash2, Upload } from 'lucide-react'
import type { SupabaseClient } from '@supabase/supabase-js'
import Modal from '../../components/Modal'
import ConfirmDialog from '../../components/ConfirmDialog'
import { addChoyLink, createChoyFolder, deleteChoyDocument, deleteChoyFolder, listChoyFolders, publishChoyDocument, renameChoyFolder, updateChoyDocument, updateChoyLinkUrl, uploadChoyDocument } from '../../../lib/document-service'
import { DOCUMENT_CATEGORIES, documentAudience, documentSize, isLinkItem, type ChoyDocument } from '../../../shared/pak-choy-documents'
import { childFolders, folderOptions, folderPath, isFolderEmpty, type ChoyFolder } from '../../../shared/pak-choy-folders'

type Form = { judul: string; kategori: string; deskripsi: string; grades: number[]; url: string; folderId: string | null }
const emptyForm = (folderId: string | null): Form => ({ judul: '', kategori: 'Lainnya', deskripsi: '', grades: [], url: '', folderId })

// Penjelajah folder untuk admin: folder -> subfolder -> file / link.
export default function AdminDocuments({ client, items, onChanged }: { client: SupabaseClient; items: ChoyDocument[]; onChanged: () => Promise<void> }) {
  const [folders, setFolders] = useState<ChoyFolder[]>([])
  const [folderError, setFolderError] = useState('')
  const [current, setCurrent] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const lock = useRef(false)
  // modal
  const [folderModal, setFolderModal] = useState<{ rename?: ChoyFolder } | null>(null)
  const [folderName, setFolderName] = useState('')
  const [itemModal, setItemModal] = useState<{ kind: 'file' | 'link'; editing?: ChoyDocument } | null>(null)
  const [form, setForm] = useState<Form>(emptyForm(null))
  const [file, setFile] = useState<File | null>(null)
  const [deleteItem, setDeleteItem] = useState<ChoyDocument | null>(null)
  const [deleteFolder, setDeleteFolder] = useState<ChoyFolder | null>(null)

  const loadFolders = async () => {
    try { setFolders(await listChoyFolders(client)); setFolderError('') }
    catch (error) { setFolderError(error instanceof Error ? error.message : 'Folder gagal dimuat.') }
  }
  useEffect(() => { void loadFolders() }, [])
  // Folder terpilih bisa hilang (dihapus dari perangkat lain): kembali ke atas.
  useEffect(() => { if (current && folders.length && !folders.some(folder => folder.id === current)) setCurrent(null) }, [folders, current])

  const run = async (action: () => Promise<void>, after?: () => void) => {
    if (lock.current) return
    lock.current = true; setBusy(true); setMessage('')
    try { await action(); after?.() }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Belum berhasil. Coba lagi.') }
    finally { lock.current = false; setBusy(false) }
  }
  const refreshAll = async () => { await Promise.all([loadFolders(), onChanged()]) }

  const path = folderPath(folders, current)
  const subfolders = childFolders(folders, current)
  const here = items.filter(item => (item.folder_id ?? null) === current)
  const options = folderOptions(folders)

  const openFolderModal = (rename?: ChoyFolder) => { setFolderName(rename?.name || ''); setMessage(''); setFolderModal({ rename }) }
  const saveFolder = (event: React.FormEvent) => {
    event.preventDefault()
    const target = folderModal?.rename
    void run(async () => {
      if (target) await renameChoyFolder(client, target.id, folderName)
      else await createChoyFolder(client, current, folderName)
      await loadFolders()
    }, () => setFolderModal(null))
  }
  const removeFolder = () => {
    const target = deleteFolder; setDeleteFolder(null)
    if (target) void run(async () => { await deleteChoyFolder(client, target.id); await loadFolders() })
  }

  const openItemModal = (kind: 'file' | 'link', editing?: ChoyDocument) => {
    setMessage(''); setFile(null)
    setForm(editing
      ? { judul: editing.title, kategori: editing.category, deskripsi: editing.description, grades: [...editing.target_grades], url: editing.link_url || '', folderId: editing.folder_id }
      : emptyForm(current))
    setItemModal({ kind, editing })
  }
  const toggleGrade = (grade: number) => setForm(f => ({ ...f, grades: f.grades.includes(grade) ? f.grades.filter(x => x !== grade) : [...f.grades, grade] }))
  const saveItem = (event: React.FormEvent) => {
    event.preventDefault()
    const modal = itemModal; if (!modal) return
    if (!modal.editing && modal.kind === 'file' && !file) { setMessage('Pilih berkas yang akan diunggah.'); return }
    void run(async () => {
      if (modal.kind === 'link') {
        if (modal.editing) {
          await updateChoyDocument(client, modal.editing, { title: form.judul, category: 'Lainnya', description: form.deskripsi, target_grades: [] }, form.folderId)
          if (form.url.trim() !== modal.editing.link_url) await updateChoyLinkUrl(client, modal.editing, form.url)
        } else await addChoyLink(client, { title: form.judul, description: form.deskripsi, url: form.url, folderId: form.folderId })
      } else {
        const details = { title: form.judul, category: form.kategori, description: form.deskripsi, target_grades: form.grades }
        if (modal.editing) await updateChoyDocument(client, modal.editing, details, form.folderId)
        else await uploadChoyDocument(client, details, file!, form.folderId)
      }
      await onChanged()
    }, () => setItemModal(null))
  }
  const flip = (item: ChoyDocument) => void run(async () => { await publishChoyDocument(client, item, !item.published); await onChanged() })
  const removeItem = () => {
    const target = deleteItem; setDeleteItem(null)
    if (target) void run(async () => { await deleteChoyDocument(client, target); await onChanged() })
  }

  const rowBtn = 'grid size-11 shrink-0 place-items-center rounded-xl'
  return <div className="space-y-3">
    {folderError && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{folderError}</p>}
    {message && !folderModal && !itemModal && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{message}</p>}

    <nav aria-label="Lokasi folder" className="flex flex-wrap items-center gap-1 text-sm">
      <button type="button" onClick={() => setCurrent(null)} className={`min-h-11 rounded-lg px-2 font-bold ${current === null ? 'text-slate-900' : 'text-teal-700 hover:bg-teal-50'}`}>Semua</button>
      {path.map((folder, index) => <span key={folder.id} className="flex items-center gap-1"><ChevronRight size={15} className="text-slate-400"/>
        <button type="button" onClick={() => setCurrent(folder.id)} className={`min-h-11 rounded-lg px-2 font-bold ${index === path.length - 1 ? 'text-slate-900' : 'text-teal-700 hover:bg-teal-50'}`}>{folder.name}</button></span>)}
    </nav>

    <div className="grid grid-cols-3 gap-2">
      <button disabled={busy} onClick={() => openFolderModal()} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><FolderPlus size={16}/>Folder</button>
      <button disabled={busy} onClick={() => openItemModal('file')} className="action-primary inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-2 text-sm font-bold disabled:opacity-50"><Plus size={16}/>File</button>
      <button disabled={busy} onClick={() => openItemModal('link')} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-teal-300 bg-teal-50 px-2 text-sm font-bold text-teal-800 hover:bg-teal-100 disabled:opacity-50"><Link2 size={16}/>Link</button>
    </div>

    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="divide-y divide-slate-100">
        {subfolders.map(folder => {
          const direct = items.filter(item => item.folder_id === folder.id).length
          const sub = folders.filter(f => f.parent_id === folder.id).length
          return <article key={folder.id} className="flex items-center gap-2 p-2 pl-4">
            <button type="button" onClick={() => setCurrent(folder.id)} className="flex min-h-11 min-w-0 flex-1 items-center gap-3 text-left">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600"><Folder size={20}/></span>
              <span className="min-w-0"><span className="block break-words font-bold text-slate-800">{folder.name}</span><span className="block text-xs text-slate-500">{sub ? `${sub} folder · ` : ''}{direct} item</span></span>
            </button>
            <button disabled={busy} onClick={() => openFolderModal(folder)} aria-label={`Ganti nama ${folder.name}`} className={`${rowBtn} text-teal-700 hover:bg-teal-50`}><Pencil size={17}/></button>
            <button disabled={busy} onClick={() => isFolderEmpty(folders, items, folder.id) ? setDeleteFolder(folder) : setMessage(`Folder “${folder.name}” masih berisi file, link, atau subfolder. Kosongkan dulu.`)} aria-label={`Hapus ${folder.name}`} className={`${rowBtn} text-red-700 hover:bg-red-50`}><Trash2 size={17}/></button>
          </article>
        })}
        {here.map(item => <article key={item.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 p-4">
          <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${isLinkItem(item) ? 'bg-sky-50 text-sky-700' : 'bg-teal-50 text-teal-700'}`}>{isLinkItem(item) ? <ExternalLink size={20}/> : <FileText size={20}/>}</span>
          <div className="min-w-0 flex-1 basis-40"><h3 className="break-words font-bold text-slate-800">{item.title}</h3>
            <p className="mt-1 break-all text-xs text-slate-500">{isLinkItem(item) ? item.link_url : `${item.category} · ${documentAudience(item.target_grades)} · ${documentSize(item.file_size)}`}</p></div>
          <div className="flex w-full items-center justify-end gap-1 sm:w-auto">
            <button disabled={busy} onClick={() => flip(item)} className={`min-h-11 rounded-full px-4 text-xs font-bold ${item.published ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{item.published ? 'Terbit' : 'Draft'}</button>
            <button disabled={busy} onClick={() => openItemModal(isLinkItem(item) ? 'link' : 'file', item)} aria-label={`Edit ${item.title}`} className={`${rowBtn} text-teal-700 hover:bg-teal-50`}><Pencil size={17}/></button>
            <button disabled={busy} onClick={() => setDeleteItem(item)} aria-label={`Hapus ${item.title}`} className={`${rowBtn} text-red-700 hover:bg-red-50`}><Trash2 size={17}/></button>
          </div>
        </article>)}
        {!subfolders.length && !here.length && <div className="grid min-h-44 place-items-center p-6 text-center text-sm text-slate-500"><div><Upload size={30} className="mx-auto mb-3 text-slate-300"/><p>{current ? 'Folder ini masih kosong.' : 'Belum ada folder atau file.'}<br/>Pakai tombol Folder, File, atau Link di atas.</p></div></div>}
      </div>
    </section>

    {folderModal && <Modal title={folderModal.rename ? 'Ganti nama folder' : 'Folder baru'} onClose={() => { if (!busy) setFolderModal(null) }}
      footer={<button type="submit" form="folder-form" disabled={busy || !folderName.trim()} className="action-primary min-h-11 w-full rounded-xl px-4 font-bold disabled:opacity-40">{busy ? 'Menyimpan…' : 'Simpan'}</button>}>
      <form id="folder-form" onSubmit={saveFolder} className="space-y-3"><fieldset disabled={busy} className="space-y-3">
        {message && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{message}</p>}
        {!folderModal.rename && <p className="text-sm text-slate-500">Dibuat di: <strong>{path.length ? path.map(f => f.name).join(' › ') : 'paling atas'}</strong></p>}
        <label className="block text-sm font-bold">Nama folder<input autoFocus required maxLength={120} className="field mt-1.5" value={folderName} onChange={e => setFolderName(e.target.value)} placeholder="Contoh: Modul, Kelas 1, LKPD"/></label>
      </fieldset></form></Modal>}

    {itemModal && <Modal title={itemModal.editing ? (itemModal.kind === 'link' ? 'Edit link' : 'Edit dokumen') : (itemModal.kind === 'link' ? 'Tambah link' : 'Tambah file')} onClose={() => { if (!busy) setItemModal(null) }}
      footer={<button type="submit" form="item-form" disabled={busy || !form.judul.trim() || (itemModal.kind === 'link' && !form.url.trim())} className="action-primary min-h-11 w-full rounded-xl px-4 font-bold disabled:opacity-40">{busy ? 'Menyimpan…' : itemModal.editing ? 'Simpan perubahan' : itemModal.kind === 'link' ? 'Simpan link' : 'Unggah file'}</button>}>
      <form id="item-form" onSubmit={saveItem}><fieldset disabled={busy} className="space-y-4">
        {message && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{message}</p>}
        {itemModal.kind === 'file' && !itemModal.editing && <label className="relative flex min-h-20 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-teal-300 bg-teal-50 px-3 text-center text-sm font-bold text-teal-800"><Upload size={18}/>{file ? file.name : 'Pilih berkas (maks 20 MB)'}<input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.png,.jpg,.jpeg,.webp" className="absolute inset-0 cursor-pointer opacity-0" onChange={e => { const chosen = e.target.files?.[0] || null; setFile(chosen); if (chosen && !form.judul.trim()) setForm(f => ({ ...f, judul: chosen.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ') })) }}/></label>}
        <label className="block text-sm font-bold">Judul<input required className="field mt-1.5" value={form.judul} onChange={e => setForm({ ...form, judul: e.target.value })}/></label>
        {itemModal.kind === 'link' && <label className="block text-sm font-bold">Alamat link<input required type="url" inputMode="url" className="field mt-1.5" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://..."/></label>}
        <label className="block text-sm font-bold">Folder<select className="field mt-1.5" value={form.folderId || ''} onChange={e => setForm({ ...form, folderId: e.target.value || null })}>{options.map(option => <option key={option.id || 'root'} value={option.id || ''}>{option.label}</option>)}</select></label>
        {itemModal.kind === 'file' && <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-bold">Kategori<select className="field mt-1.5" value={form.kategori} onChange={e => setForm({ ...form, kategori: e.target.value })}>{DOCUMENT_CATEGORIES.map(v => <option key={v}>{v}</option>)}</select></label>
          <div className="text-sm font-bold">Untuk kelas <span className="font-normal text-slate-400">(kosong = semua)</span><div className="mt-1.5 flex flex-wrap gap-1.5">{[1, 2, 3, 4, 5, 6].map(g => <button type="button" key={g} aria-pressed={form.grades.includes(g)} onClick={() => toggleGrade(g)} className={`grid size-11 place-items-center rounded-lg border text-sm font-bold ${form.grades.includes(g) ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-200 bg-white text-slate-600'}`}>{g}</button>)}</div></div>
        </div>}
        <label className="block text-sm font-bold">Deskripsi <span className="font-normal text-slate-400">(opsional)</span><textarea rows={3} className="field mt-1.5" value={form.deskripsi} onChange={e => setForm({ ...form, deskripsi: e.target.value })}/></label>
      </fieldset></form></Modal>}

    <ConfirmDialog open={!!deleteItem} title={deleteItem && isLinkItem(deleteItem) ? 'Hapus link?' : 'Hapus file?'} message={deleteItem ? (isLinkItem(deleteItem) ? `Hapus link “${deleteItem.title}”?` : `Hapus “${deleteItem.title}” dari cloud? Berkas ikut terhapus permanen.`) : ''} onCancel={() => setDeleteItem(null)} onConfirm={removeItem}/>
    <ConfirmDialog open={!!deleteFolder} title="Hapus folder?" message={deleteFolder ? `Hapus folder kosong “${deleteFolder.name}”?` : ''} onCancel={() => setDeleteFolder(null)} onConfirm={removeFolder}/>
  </div>
}
