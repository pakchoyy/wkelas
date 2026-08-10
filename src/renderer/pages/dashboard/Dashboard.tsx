import { useEffect, useState } from 'react'
import { Calendar, BookOpen, CheckSquare, Megaphone, BarChart3, Bell } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { useAppStore } from '../../stores/appStore'
import { todayISO } from '../../../shared/utils'

const HARI_INI = (() => { const d = new Date().getDay(); return d === 0 ? 7 : d })()

export default function Dashboard() {
  const { user, mode } = useAuthStore()
  const kelasId = useAppStore((s) => s.kelasAktifId) || 1
  const isDemo = mode === 'demo'

  const [jumlahSiswa, setJumlahSiswa] = useState(0)
  const [jadwalHariIni, setJadwalHariIni] = useState(0)
  const [todoBelum, setTodoBelum] = useState(0)
  const [rencanaBelum, setRencanaBelum] = useState(0)
  const [tidakHadir, setTidakHadir] = useState(0)

  useEffect(() => {
    ;(async () => {
      try {
        const [siswa, jadwal, todo, rencana, presensi] = await Promise.all([
          window.electronAPI.siswa.list(kelasId),
          window.electronAPI.jadwal.list(kelasId),
          window.electronAPI.todo.list(),
          window.electronAPI.rencana.list(kelasId),
          window.electronAPI.presensi.get(kelasId, todayISO()),
        ])
        setJumlahSiswa(siswa.length)
        setJadwalHariIni(jadwal.filter((j) => j.hari === HARI_INI).length)
        setTodoBelum(todo.filter((t) => t.status !== 'selesai').length)
        setRencanaBelum(rencana.filter((r) => r.status !== 'selesai').length)
        setTidakHadir(presensi.filter((p) => p.status !== 'H').length)
      } catch {
        // abaikan, tampilkan nilai default
      }
    })()
  }, [kelasId])

  const widgets = [
    { id: 'jadwal', icon: Calendar, title: 'Jadwal Hari Ini', desc: jadwalHariIni > 0 ? `${jadwalHariIni} jam pelajaran hari ini` : 'Belum ada jadwal', color: '#0ea5a0' },
    { id: 'rencana', icon: BookOpen, title: 'Rencana Mengajar', desc: rencanaBelum > 0 ? `${rencanaBelum} rencana belum selesai` : 'Belum ada rencana', color: '#0d7a8a' },
    { id: 'todo', icon: CheckSquare, title: 'ToDo', desc: todoBelum > 0 ? `${todoBelum} tugas belum selesai` : 'Tidak ada tugas', color: '#16a34a' },
    { id: 'pengumuman', icon: Megaphone, title: 'Pengumuman BGY', desc: 'Tidak ada pengumuman', color: '#d97706' },
    { id: 'statistik', icon: BarChart3, title: 'Statistik Singkat', desc: `${jumlahSiswa} siswa · ${tidakHadir} tidak hadir hari ini`, color: '#2563eb' },
    { id: 'versi', icon: Bell, title: 'Notifikasi Versi', desc: 'Aplikasi terbaru', color: '#7c3aed' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Dashboard</h2>
        {user && (
          <span className="text-xs" style={{ color: 'var(--text-light)' }}>
            {user.nama} {isDemo && <span className="text-amber-600 font-semibold">(Demo)</span>}
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
