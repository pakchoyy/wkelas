import { GraduationCap, LogOut, User } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'

export default function Header() {
  const { mode, user } = useAuthStore()
  const isDemo = mode === 'demo'

  return (
    <>
      {isDemo && (
        <div className="h-7 bg-amber-500 flex items-center justify-center text-xs font-semibold text-white">
          DEMO MODE — Data tidak tersimpan
        </div>
      )}
      <header
        className="sticky top-0 h-12 flex items-center justify-between px-4 z-300"
        style={{
          background: 'linear-gradient(135deg, #0ea5a0, #0d7a8a, #2d6a7f)',
          boxShadow: '0 2px 10px rgba(0,0,0,.18)',
        }}
      >
        <div className="flex items-center gap-2">
          <GraduationCap size={22} className="text-white" />
          <span className="text-white font-extrabold" style={{ fontSize: '0.95rem' }}>
            BGY Wali Kelas
          </span>
        </div>

        <div className="flex items-center gap-3">
          {user && (
            <>
              <span className="text-white/90 text-sm font-semibold hidden sm:inline">
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
