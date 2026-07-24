import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  ScrollText,
  AlertTriangle,
  Calendar,
  BookOpen,
  ClipboardList,
  CalendarDays,
  BookText,
  CheckSquare,
  FileText,
  Settings,
  LogOut,
} from 'lucide-react'
import { useAuthStore } from '../stores/authStore'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  {
    label: 'Siswa',
    children: [
      { to: '/siswa/data-siswa', icon: Users, label: 'Data Siswa' },
      { to: '/siswa/presensi', icon: ClipboardCheck, label: 'Presensi' },
      { to: '/siswa/penilaian', icon: ScrollText, label: 'Penilaian' },
      { to: '/siswa/perilaku', icon: AlertTriangle, label: 'Perilaku' },
    ],
  },
  {
    label: 'Aktivitas Mengajar',
    children: [
      { to: '/aktivitas/jadwal', icon: Calendar, label: 'Jadwal' },
      { to: '/aktivitas/rencana', icon: BookOpen, label: 'Rencana' },
      { to: '/aktivitas/kalender', icon: CalendarDays, label: 'Kalender' },
      { to: '/aktivitas/jurnal', icon: ClipboardList, label: 'Jurnal' },
      { to: '/aktivitas/catatan', icon: BookText, label: 'Catatan' },
      { to: '/aktivitas/todo', icon: CheckSquare, label: 'ToDo' },
    ],
  },
  { to: '/perangkat-ajar', icon: FileText, label: 'Perangkat Ajar' },
  { to: '/laporan', icon: FileText, label: 'Laporan' },
  { to: '/pengaturan', icon: Settings, label: 'Pengaturan' },
]

export default function Sidebar() {
  return (
    <aside
      className="w-64 flex-shrink-0 flex flex-col border-r overflow-y-auto"
      style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}
    >
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          if ('children' in item) {
            return (
              <div key={item.label} className="mb-2">
                <div
                  className="text-xs font-bold uppercase tracking-[0.8px] px-3 py-2"
                  style={{ color: 'var(--text-light)' }}
                >
                  {item.label}
                </div>
                {item.children!.map((child) => (
                  <NavLink
                    key={child.to}
                    to={child.to}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors duration-200 ${
                        isActive
                          ? 'text-[#0ea5a0]'
                          : 'hover:bg-gray-100'
                      }`
                    }
                    style={({ isActive }) =>
                      isActive ? { background: 'rgba(14,165,160,0.1)' } : {}
                    }
                  >
                    <child.icon size={18} />
                    {child.label}
                  </NavLink>
                ))}
              </div>
            )
          }
          return (
            <NavLink
              key={item.to}
              to={item.to!}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors duration-200 ${
                  isActive ? 'text-[#0ea5a0]' : 'hover:bg-gray-100'
                }`
              }
              style={({ isActive }) =>
                isActive ? { background: 'rgba(14,165,160,0.1)' } : {}
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          )
        })}
      </nav>

      <div className="p-3 border-t" style={{ borderColor: 'var(--border)' }}>
        <button
          onClick={() => useAuthStore.getState().logout()}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 w-full transition-colors duration-200"
        >
          <LogOut size={18} />
          Keluar
        </button>
      </div>
    </aside>
  )
}
