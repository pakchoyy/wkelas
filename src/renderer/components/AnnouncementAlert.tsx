import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Megaphone } from 'lucide-react'
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
    void client.from('announcements').select('id,judul,isi,jenis,created_at').order('created_at', { ascending: false }).limit(5)
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
  return <Modal title="Pengumuman" onClose={close} maxWidth="max-w-lg" footer={<div className="flex flex-wrap gap-2">
    <button onClick={close} className="min-h-11 flex-1 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50">Tutup</button>
    <Link to="/pembaruan" onClick={close} className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-teal-700 px-4 text-sm font-bold text-white hover:bg-teal-800">Lihat Selengkapnya</Link>
  </div>}>
    <ul className="space-y-3">{items.map((item) => <li key={item.id} className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <p className="flex items-center gap-2 text-sm font-extrabold text-slate-900"><Megaphone size={16} className="shrink-0 text-amber-600"/>{item.judul}</p>
      <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{item.isi}</p>
    </li>)}</ul>
  </Modal>
}
