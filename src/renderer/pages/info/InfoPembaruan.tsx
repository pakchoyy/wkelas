import { useEffect, useState } from 'react'
import { BellRing, CheckCircle2, Megaphone, X } from 'lucide-react'
import { APP_UPDATED_AT, APP_UPDATES, APP_VERSION } from '../../../shared/app-info'
import { documentClient } from '../../../lib/document-client'

type Announcement = { id:string; judul:string; isi:string; jenis:string; created_at:string }
type Version = { id:string; versi:string; changelog:string; tanggal_rilis:string }
const ANNOUNCEMENT_READ_KEY = 'bgy-announcements-read'
const ANNOUNCEMENT_CLOSED_KEY = 'bgy-announcements-closed'

function markAnnouncementsRead(items: Announcement[]) {
  if (!items.length) return
  try {
    const value = localStorage.getItem(ANNOUNCEMENT_READ_KEY)
    const parsed = value ? JSON.parse(value) : []
    const ids = new Set<string>(Array.isArray(parsed) ? parsed : [])
    items.forEach(item => ids.add(item.id))
    localStorage.setItem(ANNOUNCEMENT_READ_KEY, JSON.stringify(Array.from(ids)))
    window.dispatchEvent(new Event('bgy-announcements-read'))
  } catch {}
}

function readClosedAnnouncements() {
  try {
    const value = localStorage.getItem(ANNOUNCEMENT_CLOSED_KEY)
    const parsed = value ? JSON.parse(value) : []
    return new Set<string>(Array.isArray(parsed) ? parsed : [])
  } catch {
    return new Set<string>()
  }
}

export default function InfoPembaruan() {
  const [announcements,setAnnouncements] = useState<Announcement[]>([])
  const [closedAnnouncements,setClosedAnnouncements] = useState<Set<string>>(() => readClosedAnnouncements())
  const [latestVersion,setLatestVersion] = useState<Version|null>(null)
  const closeAnnouncement = (id: string) => {
    setClosedAnnouncements((current) => {
      const next = new Set(current)
      next.add(id)
      localStorage.setItem(ANNOUNCEMENT_CLOSED_KEY, JSON.stringify(Array.from(next)))
      return next
    })
  }
  useEffect(() => {
    const client = documentClient()
    if (!client) return
    void Promise.all([
      client.from('announcements').select('id,judul,isi,jenis,created_at').order('created_at',{ascending:false}).limit(10),
      client.from('app_versions').select('id,versi,changelog,tanggal_rilis').order('tanggal_rilis',{ascending:false}).limit(1),
    ]).then(([announcementResult,versionResult]) => {
      if (!announcementResult.error) {
        const rows = (announcementResult.data || []) as Announcement[]
        setAnnouncements(rows)
        markAnnouncementsRead(rows)
      }
      if (!versionResult.error) setLatestVersion((versionResult.data?.[0] || null) as Version|null)
    }).catch(() => {})
  }, [])
  const visibleAnnouncements = announcements.filter(item => !closedAnnouncements.has(item.id))
  return <div className="mx-auto max-w-4xl space-y-6">
    <header className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700"><BellRing size={22}/></span><div><h1 className="text-2xl font-black text-slate-800">Yang Baru</h1><p className="text-sm text-slate-500">Versi {latestVersion?.versi || APP_VERSION} · diperbarui {latestVersion ? new Date(latestVersion.tanggal_rilis).toLocaleDateString('id-ID') : APP_UPDATED_AT}</p></div></header>
    {visibleAnnouncements.length > 0 && <section className="space-y-3" aria-label="Pengumuman">{visibleAnnouncements.map(item=><article key={item.id} role="alert" className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950 shadow-sm"><span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700"><Megaphone size={19}/></span><div className="min-w-0 flex-1"><h2 className="font-extrabold">{item.judul}</h2><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-amber-900/90">{item.isi}</p></div><button type="button" onClick={() => closeAnnouncement(item.id)} aria-label={`Tutup pengumuman ${item.judul}`} className="grid size-11 shrink-0 place-items-center rounded-xl text-amber-700 hover:bg-amber-100"><X size={18}/></button></article>)}</section>}
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-extrabold text-slate-800">Pembaruan terbaru</h2>
      <ul className="mt-4 space-y-3">{latestVersion?.changelog ? latestVersion.changelog.split('\n').filter(Boolean).map(item => <li key={item} className="flex gap-3 text-sm leading-6 text-slate-600"><CheckCircle2 className="mt-0.5 shrink-0 text-teal-600" size={18}/><span>{item}</span></li>) : APP_UPDATES.map((item) => <li key={item} className="flex gap-3 text-sm leading-6 text-slate-600"><CheckCircle2 className="mt-0.5 shrink-0 text-teal-600" size={18}/><span>{item}</span></li>)}</ul>
    </section>
  </div>
}
