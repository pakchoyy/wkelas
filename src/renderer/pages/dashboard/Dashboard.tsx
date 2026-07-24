import { Calendar, BookOpen, CheckSquare, Megaphone, BarChart3, Bell } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'

const widgets = [
  { id: 'jadwal', icon: Calendar, title: 'Jadwal Hari Ini', desc: 'Belum ada jadwal', color: '#0ea5a0' },
  { id: 'rencana', icon: BookOpen, title: 'Rencana Mengajar', desc: 'Belum ada rencana', color: '#0d7a8a' },
  { id: 'todo', icon: CheckSquare, title: 'ToDo', desc: 'Tidak ada tugas', color: '#16a34a' },
  { id: 'pengumuman', icon: Megaphone, title: 'Pengumuman BGY', desc: 'Tidak ada pengumuman', color: '#d97706' },
  { id: 'statistik', icon: BarChart3, title: 'Statistik Singkat', desc: '0 siswa', color: '#2563eb' },
  { id: 'versi', icon: Bell, title: 'Notifikasi Versi', desc: 'Aplikasi terbaru', color: '#7c3aed' },
]

export default function Dashboard() {
  const { user } = useAuthStore()

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Dashboard</h2>
        {user && (
          <span className="text-xs" style={{ color: 'var(--text-light)' }}>
            {user.nama}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {widgets.map((w) => (
          <div
            key={w.id}
            className="rounded-xl p-6 transition-all duration-200 hover:shadow-md cursor-pointer"
            style={{
              background: 'var(--card-bg)',
              boxShadow: 'var(--shadow)',
            }}
          >
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-sm font-bold">{w.title}</h3>
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ background: `${w.color}15` }}
              >
                <w.icon size={18} style={{ color: w.color }} />
              </div>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-light)' }}>
              {w.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
