import { Bell, Menu, User } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { liveQuery } from 'dexie'
import { db } from '../../lib/db'
import { useAppStore } from '../stores/appStore'
import { useAuthStore } from '../stores/authStore'
import { documentClient } from '../../lib/document-client'

const ANNOUNCEMENT_READ_KEY = 'bgy-announcements-read'

function readAnnouncementIds() {
  try {
    const value = localStorage.getItem(ANNOUNCEMENT_READ_KEY)
    const ids = value ? JSON.parse(value) : []
    return new Set(Array.isArray(ids) ? ids : [])
  } catch {
    return new Set()
  }
}

export default function Header({onOpenMenu, menuOpen}: {onOpenMenu: () => void; menuOpen:boolean}) {
  const { mode } = useAuthStore()
  const isDemo = mode === 'demo'
  const kelasId = useAppStore(s => s.kelasAktifId) || 1
  const [nama, setNama] = useState('Profil')
  const [announcementCount, setAnnouncementCount] = useState(0)
  useEffect(() => {
    const subscription = liveQuery(async () => {
      const kelas = await db.kelas.get(kelasId)
      const guru = kelas?.guru_id ? await db.guru.get(kelas.guru_id) : undefined
      return guru?.nama?.trim() || 'Profil'
    }).subscribe({ next: setNama, error: () => setNama('Profil') })
    return () => subscription.unsubscribe()
  }, [kelasId, mode])
  useEffect(() => {
    const client = documentClient()
    if (!client) { setAnnouncementCount(0); return }
    let cancelled = false
    const refresh = () => {
      void client.from('announcements').select('id').then(({data,error}) => {
        if (cancelled || error) return
        const readIds = readAnnouncementIds()
        setAnnouncementCount((data || []).filter(item => !readIds.has(item.id)).length)
      }).catch(() => {})
    }
    refresh()
    window.addEventListener('storage', refresh)
    window.addEventListener('bgy-announcements-read', refresh)
    return () => { cancelled = true; window.removeEventListener('storage', refresh); window.removeEventListener('bgy-announcements-read', refresh) }
  }, [mode])

  return (
    <>
      {isDemo && (
        <div className="min-h-7 shrink-0 bg-amber-100 px-3 py-1 flex flex-wrap items-center justify-center gap-x-3 text-xs font-semibold text-amber-900">
          <span>Data contoh aktif</span><Link to="/" className="inline-flex min-h-8 items-center underline underline-offset-2">Kelola data contoh</Link>
        </div>
      )}
      <header
        className="app-header relative z-20 flex min-h-14 shrink-0 items-center justify-between gap-2 px-3 py-1 sm:px-4"
        style={{
          background: 'var(--header-bg)',
          boxShadow: '0 2px 10px rgba(0,0,0,.18)',
        }}
      >
        <div className="flex min-w-0 items-center gap-2">
          <button onClick={onOpenMenu} aria-label="Buka menu" aria-expanded={menuOpen} aria-controls="mobile-menu" className="grid size-11 shrink-0 place-items-center rounded-xl text-white hover:bg-white/15 lg:hidden"><Menu size={22}/></button>
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white shadow-sm"><img src="/icons/logo-bgy.webp" alt="" className="size-7 rounded-full object-contain" /></span>
          <span className="truncate text-white font-extrabold" style={{ fontSize: '0.95rem' }}>
            BGY Wali Kelas
          </span>
        </div>

        <div className="flex min-w-0 items-center gap-1">
        <Link to="/pembaruan" aria-label={announcementCount ? `${announcementCount} pengumuman baru` : 'Pengumuman'} className="relative grid size-11 shrink-0 place-items-center rounded-xl text-white hover:bg-white/15"><Bell size={18}/>{announcementCount>0&&<span aria-hidden="true" className="absolute -right-0.5 top-1 grid min-w-5 place-items-center rounded-full bg-amber-300 px-1.5 py-0.5 text-[10px] font-black leading-none text-teal-950 ring-2 ring-teal-800">{announcementCount>9?'9+':announcementCount}</span>}</Link>
        <Link to="/pengaturan" aria-label={`Buka profil ${nama}`} title={nama} className="flex min-h-11 max-w-[42vw] shrink-0 items-center gap-2 rounded-xl px-2 text-white hover:bg-white/15">
          <span className="truncate text-xs font-semibold sm:hidden">{nama.split(/\s+/)[0]}</span>
          <span className="hidden truncate text-sm font-semibold sm:block">{nama}</span>
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white/20"><User size={17}/></span>
        </Link>
        </div>
      </header>
    </>
  )
}
