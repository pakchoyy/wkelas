import { Bell, Cloud, CloudOff, Lock, Moon, Settings, Sun, User } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { liveQuery } from 'dexie'
import { db } from '../../lib/db'
import { useAppStore } from '../stores/appStore'
import { useAuthStore } from '../stores/authStore'
import { readTheme, setTheme as saveThemePref } from '../theme'
import { readSyncState, type AutoDecision, type SyncState } from '../../lib/cloud-sync'
import ClassSwitcher from './ClassSwitcher'

function useSyncSummary(decision: AutoDecision | null) {
  const { mode, plan, user } = useAuthStore()
  const uid = mode === 'login' ? user?.id || null : null
  const [state, setState] = useState<SyncState | null>(() => (uid ? readSyncState(uid) : null))
  useEffect(() => {
    setState(uid ? readSyncState(uid) : null)
    const refresh = () => setState(uid ? readSyncState(uid) : null)
    window.addEventListener('bgy-sync-state', refresh)
    return () => window.removeEventListener('bgy-sync-state', refresh)
  }, [uid])
  if (!uid || plan !== 'pro') return null
  return { state, decision }
}

export default function Header(_props: {onOpenMenu: () => void; menuOpen:boolean; announcementCount: number; syncDecision: AutoDecision | null}) {
  const { announcementCount, syncDecision } = _props
  const sync = useSyncSummary(syncDecision)
  const { mode, plan, user: authUser } = useAuthStore()
  const location = useLocation()
  const [profileOpen, setProfileOpen] = useState(false)
  useEffect(() => setProfileOpen(false), [location.pathname])
  useEffect(() => {
    if (!profileOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setProfileOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [profileOpen])
  const toggleDark = () => { const next = !dark; saveThemePref(next ? 'dark' : 'light'); setDark(next) }
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
        <Link to="/pembaruan" aria-label={announcementCount ? `${announcementCount} pengumuman baru` : 'Pengumuman'} className="relative grid size-11 shrink-0 place-items-center rounded-xl text-white hover:bg-white/15"><Bell size={18}/>{announcementCount>0&&<span aria-hidden="true" className="absolute -right-0.5 top-1 grid min-w-5 place-items-center rounded-full bg-amber-300 px-1.5 py-0.5 text-[10px] font-black leading-none text-teal-950 ring-2 ring-teal-800">{announcementCount>9?'9+':announcementCount}</span>}</Link>
        <div className="relative shrink-0">
          <button onClick={() => setProfileOpen(o => !o)} aria-label="Menu profil" aria-expanded={profileOpen} aria-haspopup="menu" title={nama} className="flex min-h-11 max-w-[42vw] items-center gap-2 rounded-xl px-2 text-white hover:bg-white/15">
            <span className="hidden truncate text-sm font-semibold sm:block">{nama}</span>
            <span className="relative grid size-8 shrink-0 place-items-center rounded-full bg-white/20"><User size={17}/>{sync?.decision === 'remote-newer' && <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-amber-300 ring-2 ring-teal-800"/>}</span>
          </button>
          {profileOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setProfileOpen(false)} aria-hidden="true" />
              <div role="menu" aria-label="Menu profil" className="absolute right-0 top-full z-40 mt-2 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                <div className="border-b border-slate-100 px-4 py-3">
                  <p className="truncate text-sm font-extrabold text-slate-900">{authUser?.nama || nama}</p>
                  <p className="mt-0.5 flex items-center gap-2 text-xs text-slate-500"><span className="min-w-0 truncate">{authUser?.email || (mode === 'demo' ? 'Data contoh' : '')}</span>{plan === 'pro'
                    ? <span className="shrink-0 rounded-full bg-teal-700 px-2 py-0.5 text-[10px] font-bold text-white">PRO</span>
                    : <Link to="/aktivasi" role="menuitem" className="shrink-0 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600 hover:bg-slate-300">GRATIS</Link>}</p>
                </div>
                {sync ? (() => {
                  const last = (() => { try { return sync.state?.lastSyncAt ? new Date(sync.state.lastSyncAt).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'belum pernah' } catch { return 'belum pernah' } })()
                  const body = sync.decision === 'remote-newer'
                    ? { icon: <Cloud size={18} className="text-amber-600" />, title: 'Ada data baru di cloud', sub: 'Ketuk untuk meninjau' }
                    : sync.state?.enabled
                      ? { icon: <Cloud size={18} className="text-teal-700" />, title: 'Sinkron aktif', sub: `Terakhir: ${last}` }
                      : { icon: <CloudOff size={18} className="text-slate-400" />, title: 'Sinkron belum aktif', sub: 'Ketuk untuk mengaktifkan' }
                  return <Link to="/pengaturan" state={{ tab: 'backup' }} role="menuitem" className="flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50"><span className="shrink-0">{body.icon}</span><span className="min-w-0"><span className="block truncate text-sm font-bold text-slate-800">{body.title}</span><span className="block truncate text-xs text-slate-500">{body.sub}</span></span></Link>
                })() : (mode === 'login' && plan !== 'pro' ? <Link to="/aktivasi" role="menuitem" className="flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50"><Lock size={18} className="shrink-0 text-slate-400"/><span className="min-w-0"><span className="block truncate text-sm font-bold text-slate-800">Sinkron Cloud · Khusus Pro</span><span className="block truncate text-xs text-slate-500">Ketuk untuk aktivasi</span></span></Link> : null)}
                <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
                  <span className="flex items-center gap-2 text-sm font-bold text-slate-800">{dark ? <Moon size={16}/> : <Sun size={16}/>} Mode gelap</span>
                  <button role="switch" aria-checked={dark} aria-label="Mode gelap" onClick={toggleDark} className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${dark ? 'bg-teal-600' : 'bg-slate-300'}`}><span aria-hidden="true" className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${dark ? 'left-[22px]' : 'left-0.5'}`}/></button>
                </div>
                <Link to="/pengaturan" role="menuitem" className="flex items-center gap-3 border-t border-slate-100 px-4 py-3 text-sm font-bold text-slate-800 hover:bg-slate-50"><Settings size={18} className="shrink-0 text-slate-500"/>Pengaturan</Link>
              </div>
            </>
          )}
        </div>
        </div>
      </header>
    </>
  )
}
