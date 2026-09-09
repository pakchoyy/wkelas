import { useEffect, useState } from 'react'
import { BellRing, CheckCircle2 } from 'lucide-react'
import { APP_UPDATED_AT, APP_UPDATES, APP_VERSION } from '../../../shared/app-info'
import { documentClient } from '../../../lib/document-client'

type Announcement = { id:string; judul:string; isi:string; jenis:string; created_at:string }
type Version = { id:string; versi:string; changelog:string; tanggal_rilis:string }

export default function InfoPembaruan() {
  const [announcements,setAnnouncements] = useState<Announcement[]>([])
  const [latestVersion,setLatestVersion] = useState<Version|null>(null)
  useEffect(() => {
    const client = documentClient()
    if (!client) return
    void Promise.all([
      client.from('announcements').select('id,judul,isi,jenis,created_at').order('created_at',{ascending:false}).limit(10),
      client.from('app_versions').select('id,versi,changelog,tanggal_rilis').order('tanggal_rilis',{ascending:false}).limit(1),
    ]).then(([announcementResult,versionResult]) => {
      if (!announcementResult.error) setAnnouncements((announcementResult.data || []) as Announcement[])
      if (!versionResult.error) setLatestVersion((versionResult.data?.[0] || null) as Version|null)
    }).catch(() => {})
  }, [])
  return <div className="mx-auto max-w-4xl space-y-6">
    <header className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700"><BellRing size={22}/></span><div><h1 className="text-2xl font-black text-slate-800">Yang Baru</h1><p className="text-sm text-slate-500">Versi {latestVersion?.versi || APP_VERSION} · diperbarui {latestVersion ? new Date(latestVersion.tanggal_rilis).toLocaleDateString('id-ID') : APP_UPDATED_AT}</p></div></header>
    {announcements.length > 0 && <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-6"><h2 className="text-lg font-extrabold text-amber-950">Pengumuman</h2><div className="mt-4 space-y-3">{announcements.map(item=><article key={item.id} className="rounded-xl border border-amber-100 bg-white/80 p-4"><h3 className="font-bold text-slate-800">{item.judul}</h3><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-600">{item.isi}</p></article>)}</div></section>}
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-extrabold text-slate-800">Pembaruan terbaru</h2>
      <ul className="mt-4 space-y-3">{latestVersion?.changelog ? latestVersion.changelog.split('\n').filter(Boolean).map(item => <li key={item} className="flex gap-3 text-sm leading-6 text-slate-600"><CheckCircle2 className="mt-0.5 shrink-0 text-teal-600" size={18}/><span>{item}</span></li>) : APP_UPDATES.map((item) => <li key={item} className="flex gap-3 text-sm leading-6 text-slate-600"><CheckCircle2 className="mt-0.5 shrink-0 text-teal-600" size={18}/><span>{item}</span></li>)}</ul>
    </section>
  </div>
}
