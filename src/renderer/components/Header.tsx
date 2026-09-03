import { GraduationCap, Menu, User } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

export default function Header({onOpenMenu, menuOpen}: {onOpenMenu: () => void; menuOpen:boolean}) {
  const { mode, user } = useAuthStore()
  const isDemo = mode === 'demo'

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
          <GraduationCap size={22} className="text-white" />
          <span className="truncate text-white font-extrabold" style={{ fontSize: '0.95rem' }}>
            BGY Wali Kelas
          </span>
        </div>

        <div className="flex items-center gap-3">
          {user && (
            <>
              <span className="max-w-64 break-words text-white text-sm font-semibold hidden sm:inline">
                {user.nama}
              </span>
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                <User size={14} className="text-white" />
              </div>
            </>
          )}
        </div>
      </header>
    </>
  )
}
