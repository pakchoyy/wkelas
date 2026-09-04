import { DatabaseBackup, GraduationCap, Menu, User } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { liveQuery } from 'dexie'
import { db } from '../../lib/db'
import { useAppStore } from '../stores/appStore'
import { useAuthStore } from '../stores/authStore'
import { BACKUP_HISTORY_KEY, backupIsDue, readBackupHistory } from '../../lib/backup-history'

export default function Header({onOpenMenu, menuOpen}: {onOpenMenu: () => void; menuOpen:boolean}) {
  const { mode } = useAuthStore()
  const isDemo = mode === 'demo'
  const kelasId = useAppStore(s => s.kelasAktifId) || 1
  const [nama, setNama] = useState('Profil')
  const [backupDue, setBackupDue] = useState(false)
  useEffect(() => {
    const refresh = () => setBackupDue(backupIsDue(readBackupHistory(localStorage.getItem(BACKUP_HISTORY_KEY))))
    refresh()
    window.addEventListener('focus', refresh)
    window.addEventListener('storage', refresh)
    return () => { window.removeEventListener('focus', refresh); window.removeEventListener('storage', refresh) }
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
          <GraduationCap size={22} className="hidden shrink-0 text-white sm:block" />
          <span className="truncate text-white font-extrabold" style={{ fontSize: '0.95rem' }}>
            BGY Wali Kelas
          </span>
        </div>

        <div className="flex min-w-0 items-center gap-1">
        <Link to="/pengaturan" state={{tab:'backup'}} aria-label={backupDue ? 'Cadangkan data sekarang' : 'Buka cadangan data'} title={backupDue ? 'Cadangan data perlu dibuat' : 'Cadangan data'} className="relative grid size-11 shrink-0 place-items-center rounded-xl text-white hover:bg-white/15"><DatabaseBackup size={19}/>{backupDue && <span className="absolute right-2 top-2 size-2.5 rounded-full bg-amber-300 ring-2 ring-teal-800"><span className="sr-only">Cadangan data perlu dibuat</span></span>}</Link>
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
