import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Megaphone } from 'lucide-react'
import Modal from './Modal'
import { documentClient } from '../../lib/document-client'

type Announcement = { id: string; judul: string; isi: string; jenis: string; created_at: string }
const READ_KEY = 'bgy-announcements-read'

function readIds(): Set<string> {
  try {
    const value = JSON.parse(localStorage.getItem(READ_KEY) || '[]')
    return new Set(Array.isArray(value) ? value : [])
  } catch {
    return new Set()
  }
}

function markRead(ids: string[]) {
  if (!ids.length) return
  try {
    const set = readIds()
    ids.forEach((id) => set.add(id))
    localStorage.setItem(READ_KEY, JSON.stringify(Array.from(set)))
    window.dispatchEvent(new Event('bgy-announcements-read'))
  } catch {}
}

// Alert pengumuman: muncul saat aplikasi dibuka bila masih ada yang belum dibaca,
// sebelum alert install. Menutup/membuka halaman = dianggap dibaca.
export default function AnnouncementAlert() {
  const [items, setItems] = useState<Announcement[] | null>(null)
  useEffect(() => {
    const client = documentClient()
    if (!client) { setItems([]); return }
    let cancelled = false
    void Promise.resolve(client.from('announcements').select('id,judul,isi,jenis,created_at').order('created_at', { ascending: false }).limit(5))
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) { setItems([]); return }
        const read = readIds()
        setItems(((data || []) as Announcement[]).filter((a) => !read.has(a.id)))
      })
      .catch(() => { if (!cancelled) setItems([]) })
    // Bila pengguna membaca lewat halaman/lonceng saat alert terbuka, tutup alert.
    const onRead = () => { if (!cancelled) setItems([]) }
    window.addEventListener('bgy-announcements-read', onRead)
    return () => { cancelled = true; window.removeEventListener('bgy-announcements-read', onRead) }
  }, [])
  if (!items || !items.length) return null
  const close = () => markRead(items.map((i) => i.id))
  const [first, ...rest] = items
  const date = (v: string) => { try { return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(new Date(v)) } catch { return '' } }
  return <Modal title={items.length > 1 ? `${items.length} pengumuman baru` : 'Pengumuman baru'} onClose={close} maxWidth="max-w-md" footer={<div className="flex gap-2">
    <button onClick={close} className="min-h-11 whitespace-nowrap rounded-xl px-4 text-sm font-bold text-slate-600 hover:bg-slate-100">Nanti</button>
    <Link to="/pembaruan" onClick={close} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-teal-700 px-4 text-sm font-bold text-white hover:bg-teal-800">Lihat detail<ArrowRight size={16}/></Link>
  </div>}>
    <article className="overflow-hidden rounded-2xl border border-teal-100">
      <div className="relative bg-gradient-to-br from-teal-700 to-emerald-600 px-4 pb-4 pt-5 text-white">
        <span aria-hidden className="absolute -right-6 -top-6 size-24 rounded-full bg-white/10"/>
        <span className="grid size-10 place-items-center rounded-xl bg-white/15"><Megaphone size={20}/></span>
        <p className="mt-3 text-xs font-bold uppercase tracking-wide text-teal-100">Baru · {date(first.created_at)}</p>
        <h3 className="mt-1 text-lg font-extrabold leading-snug">{first.judul}</h3>
      </div>
      <p className="whitespace-pre-line break-words px-4 py-3 text-sm leading-6 text-slate-700">{first.isi.replace(/\n{3,}/g, '\n\n')}</p>
    </article>
    {rest.length > 0 && <ul className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200">{rest.map((item) => <li key={item.id} className="flex items-start gap-3 px-3 py-2.5"><Megaphone size={15} className="mt-0.5 shrink-0 text-teal-700"/><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-800">{item.judul}</p><p className="text-xs text-slate-500">{date(item.created_at)}</p></div></li>)}</ul>}
  </Modal>
}
