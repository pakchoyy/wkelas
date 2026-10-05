import type { LucideIcon } from 'lucide-react'
import { BarChart3, BookOpen, Calendar, CalendarDays, CheckSquare, ClipboardCheck, ClipboardList, Files, HeartHandshake, NotebookPen, ScrollText, Settings, Users, AlertTriangle } from 'lucide-react'

export interface QuickNavOption { to: string; label: string; icon: LucideIcon }

// Slot kunci: Beranda (/) + Menu drawer. Tiga slot bebas dipilih dari katalog ini.
export const QUICK_NAV_OPTIONS: QuickNavOption[] = [
  { to: '/siswa/data-siswa', label: 'Data Siswa', icon: Users },
  { to: '/siswa/presensi', label: 'Presensi', icon: ClipboardCheck },
  { to: '/siswa/penilaian', label: 'Penilaian', icon: ScrollText },
  { to: '/siswa/perilaku', label: 'Perilaku', icon: AlertTriangle },
  { to: '/aktivitas/mapel', label: 'Mapel', icon: BookOpen },
  { to: '/aktivitas/jadwal', label: 'Jadwal', icon: Calendar },
  { to: '/aktivitas/rencana', label: 'Rencana', icon: NotebookPen },
  { to: '/aktivitas/jurnal', label: 'Jurnal', icon: ClipboardList },
  { to: '/aktivitas/kalender', label: 'Kalender', icon: CalendarDays },
  { to: '/perangkat-ajar', label: 'Perangkat', icon: Files },
  { to: '/aktivitas/todo', label: 'Tugas', icon: CheckSquare },
  { to: '/laporan', label: 'Laporan', icon: BarChart3 },
  { to: '/pengaturan', label: 'Pengaturan', icon: Settings },
  { to: '/bantuan', label: 'Bantuan', icon: HeartHandshake },
]

export const QUICK_NAV_DEFAULTS = ['/siswa/presensi', '/aktivitas/jurnal', '/siswa/data-siswa']

export function resolveQuickNavOptions(paths: unknown): QuickNavOption[] {
  return resolveQuickNav(paths)
    .map((to) => QUICK_NAV_OPTIONS.find((o) => o.to === to))
    .filter((o): o is QuickNavOption => !!o)
}

export function resolveQuickNav(paths: unknown): string[] {
  const valid = QUICK_NAV_OPTIONS.map((o) => o.to)
  const picked = Array.isArray(paths) ? paths.filter((p): p is string => typeof p === 'string' && valid.includes(p)) : []
  const unique = Array.from(new Set(picked)).slice(0, 3)
  while (unique.length < 3) {
    const fallback = QUICK_NAV_DEFAULTS.find((d) => !unique.includes(d))
    if (!fallback) break
    unique.push(fallback)
  }
  return unique
}
