import { Bell, Moon, Sun, User } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { liveQuery } from 'dexie'
import { db } from '../../lib/db'
import { useAppStore } from '../stores/appStore'
import { useAuthStore } from '../stores/authStore'
import { readTheme, setTheme as saveThemePref } from '../theme'
import ClassSwitcher from './ClassSwitcher'

export default function Header(_props: {onOpenMenu: () => void; menuOpen:boolean; announcementCount: number}) {
  const { announcementCount } = _props
  const { mode } = useAuthStore()
  const isDemo = mode === 'demo'
  const kelasId = useAppStore(s => s.kelasAktifId) || 1
  const [nama, setNama] = useState('Profil')
  const isDark = () => {
    const pref = readTheme()
    return pref === 'dark' || (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  }
  const [dark, setDark] = useState(isDark)
  useEffect(() => {
    const onStorage = () => setDark(isDark())
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])
  useEffect(() => {
    const subscription = liveQuery(async () => {
      const kelas = await db.kelas.get(kelasId)
      const guru = kelas?.guru_id ? await db.guru.get(kelas.guru_id) : undefined
      return guru?.nama?.trim() || 'Profil'
    }).subscribe({ next: setNama, error: () => setNama('Profil') })
    return () => subscription.unsubscribe()
  }, [kelasId, mode])
  return (
    <>
      {isDemo && (
        <div className="demo-bar min-h-7 shrink-0 bg-amber-100 px-3 py-1 flex flex-wrap items-center justify-center gap-x-3 text-xs font-semibold text-amber-900">
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
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white shadow-sm"><img src="/icons/logo-bgy.webp" alt="" className="size-7 rounded-full object-contain" /></span>
          <span className="truncate text-white font-extrabold" style={{ fontSize: '0.95rem' }}>
            BGY Wali Kelas
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1">
        <ClassSwitcher/>
        <button onClick={() => { const next = !dark; saveThemePref(next ? 'dark' : 'light'); setDark(next) }} aria-label={dark ? 'Ganti ke mode terang' : 'Ganti ke mode gelap'} aria-pressed={dark} title={dark ? 'Mode terang' : 'Mode gelap'} className="grid size-11 shrink-0 place-items-center rounded-xl text-white hover:bg-white/15">{dark ? <Sun size={18}/> : <Moon size={18}/>}</button>
        <Link to="/pembaruan" aria-label={announcementCount ? `${announcementCount} pengumuman baru` : 'Pengumuman'} className="relative grid size-11 shrink-0 place-items-center rounded-xl text-white hover:bg-white/15"><Bell size={18}/>{announcementCount>0&&<span aria-hidden="true" className="absolute -right-0.5 top-1 grid min-w-5 place-items-center rounded-full bg-amber-300 px-1.5 py-0.5 text-[10px] font-black leading-none text-teal-950 ring-2 ring-teal-800">{announcementCount>9?'9+':announcementCount}</span>}</Link>
        <Link to="/pengaturan" aria-label={`Buka profil ${nama}`} title={nama} className="flex min-h-11 max-w-[42vw] shrink-0 items-center gap-2 rounded-xl px-2 text-white hover:bg-white/15">
          <span className="hidden truncate text-sm font-semibold sm:block">{nama}</span>
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white/20"><User size={17}/></span>
        </Link>
        </div>
      </header>
    </>
  )
}
