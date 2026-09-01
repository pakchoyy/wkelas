import { useEffect, useId, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { AlertTriangle, BookOpen, Calendar, CalendarDays, CheckSquare, ChevronDown, ClipboardCheck, ClipboardList, FileText, FolderOpen, LayoutDashboard, ScrollText, Settings, Users } from 'lucide-react'

const groups = [
  { label: 'Siswa', icon: Users, children: [
    { to: '/siswa/data-siswa', icon: Users, label: 'Data Siswa' },
    { to: '/siswa/presensi', icon: ClipboardCheck, label: 'Presensi' },
    { to: '/siswa/penilaian', icon: ScrollText, label: 'Penilaian' },
    { to: '/siswa/perilaku', icon: AlertTriangle, label: 'Perilaku' },
  ] },
  { label: 'Aktivitas Mengajar', icon: BookOpen, children: [
    { to: '/aktivitas/mapel', icon: BookOpen, label: 'Mata Pelajaran' },
    { to: '/aktivitas/jadwal', icon: Calendar, label: 'Jadwal' },
    { to: '/aktivitas/rencana', icon: BookOpen, label: 'Rencana Mengajar' },
    { to: '/aktivitas/jurnal', icon: ClipboardList, label: 'Jurnal Harian' },
  ] },
  { label: 'Referensi Mengajar', icon: FolderOpen, children: [
    { to: '/aktivitas/kalender', icon: CalendarDays, label: 'Kalender Akademik' },
    { to: '/perangkat-ajar', icon: FileText, label: 'Perangkat Ajar' },
  ] },
  { label: 'Lainnya', icon: CheckSquare, children: [
    { to: '/aktivitas/todo', icon: CheckSquare, label: 'Tugas Saya' },
  ] },
]

const standaloneItems = [
  { to: '/laporan', icon: FileText, label: 'Laporan' },
  { to: '/pengaturan', icon: Settings, label: 'Pengaturan' },
]

const linkClass = ({ isActive }: { isActive: boolean }) => `flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${isActive ? 'bg-teal-50 text-[#0ea5a0]' : 'text-slate-600 hover:bg-slate-100'}`

export default function Sidebar({onNavigate}: {onNavigate?: () => void}) {
  const menuId = useId()
  const location = useLocation()
  const activeGroup = groups.find((group) => group.children.some((item) => location.pathname === item.to))?.label
  const [opened, setOpened] = useState<string[]>(activeGroup ? [activeGroup] : ['Siswa'])
  useEffect(() => { if (activeGroup) setOpened(current => current.includes(activeGroup) ? current : [...current,activeGroup]) },[location.pathname,activeGroup])
  const isOpen = (label: string) => opened.includes(label)
  const toggle = (label: string) => setOpened((current) => current.includes(label) ? current.filter((item) => item !== label) : [...current, label])

  return <aside className="min-h-0 w-full flex-1 overflow-y-auto overscroll-contain border-r bg-white" style={{ borderColor: 'var(--border)' }}><nav aria-label="Menu utama" className="space-y-1 p-3">
    <NavLink onClick={onNavigate} to="/" end className={linkClass}><LayoutDashboard size={18}/>Dashboard</NavLink>
    {groups.map((group, index) => { const open = isOpen(group.label); const active = activeGroup === group.label; return <div key={group.label} className="pt-1"><button aria-expanded={open} aria-controls={`${menuId}-${index}`} onClick={() => toggle(group.label)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold transition ${active ? 'text-teal-700' : 'text-slate-700 hover:bg-slate-100'}`}><group.icon size={18}/><span className="flex-1 text-left">{group.label}</span><ChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`}/></button>{open && <div id={`${menuId}-${index}`} className="ml-4 mt-1 space-y-1 border-l border-slate-200 pl-2">{group.children.map((item) => <NavLink onClick={onNavigate} key={item.to} to={item.to} className={linkClass}><item.icon size={17}/>{item.label}</NavLink>)}</div>}</div> })}
    <div className="mt-2 space-y-1 border-t border-slate-100 pt-2">{standaloneItems.map((item) => <NavLink onClick={onNavigate} key={item.to} to={item.to} className={linkClass}><item.icon size={18}/>{item.label}</NavLink>)}</div>
  </nav></aside>
}
