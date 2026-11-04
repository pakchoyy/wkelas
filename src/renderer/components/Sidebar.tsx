import { useEffect, useId, useState } from 'react'
import { documentClient } from '../../lib/document-client'
import { signOutUser } from '../../lib/user-auth'
import { deleteAccountData } from '../../lib/db'
import Modal from './Modal'
import { mayLeave } from '../../shared/unsaved-changes'
import { useAuthStore } from '../stores/authStore'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { AlertTriangle, BarChart3, BookOpen, Calendar, CalendarDays, CheckSquare, ChevronDown, ClipboardCheck, ClipboardList, Files, FolderOpen, HeartHandshake, Info, Sparkles, LayoutDashboard, LogOut, NotebookPen, ScrollText, Settings, Users } from 'lucide-react'

const groups = [
  { label: 'Siswa', icon: Users, children: [
    { to: '/siswa/data-siswa', icon: Users, label: 'Data Siswa' },
    { to: '/siswa/presensi', icon: ClipboardCheck, label: 'Presensi' },
    { to: '/siswa/penilaian', icon: ScrollText, label: 'Penilaian' },
    { to: '/siswa/perilaku', icon: AlertTriangle, label: 'Catatan Perilaku' },
  ] },
  { label: 'Aktivitas Mengajar', icon: BookOpen, children: [
    { to: '/aktivitas/mapel', icon: BookOpen, label: 'Mata Pelajaran' },
    { to: '/aktivitas/jadwal', icon: Calendar, label: 'Jadwal' },
    { to: '/aktivitas/rencana', icon: NotebookPen, label: 'Rencana Mengajar' },
    { to: '/aktivitas/jurnal', icon: ClipboardList, label: 'Jurnal Harian' },
  ] },
  { label: 'Referensi Mengajar', icon: FolderOpen, children: [
    { to: '/aktivitas/kalender', icon: CalendarDays, label: 'Kalender Akademik' },
    { to: '/perangkat-ajar', icon: Files, label: 'Perangkat Ajar' },
  ] },
  { label: 'Lainnya', icon: CheckSquare, children: [
    { to: '/aktivitas/todo', icon: CheckSquare, label: 'Tugas Saya' },
  ] },
]

const standaloneItems = [
  { to: '/laporan', icon: BarChart3, label: 'Laporan' },
  { to: '/pengaturan', icon: Settings, label: 'Pengaturan' },
  { to: '/bantuan', icon: HeartHandshake, label: 'Bantuan & Komunitas' },
  { to: '/tentang', icon: Info, label: 'Tentang' },
]

const linkClass = ({ isActive }: { isActive: boolean }) => `flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors [&>svg]:shrink-0 ${isActive ? 'bg-[var(--accent-soft)] text-[var(--accent)] ring-1 ring-inset ring-teal-200' : 'text-slate-600 hover:bg-slate-100'}`

export default function Sidebar({onNavigate}: {onNavigate?: () => void}) {
  const menuId = useId()
  const location = useLocation()
  const activeGroup = groups.find((group) => group.children.some((item) => location.pathname === item.to))?.label
  const [opened, setOpened] = useState<string[]>(activeGroup ? [activeGroup] : ['Siswa'])
  useEffect(() => { if (activeGroup) setOpened(current => current.includes(activeGroup) ? current : [...current,activeGroup]) },[location.pathname,activeGroup])
  const isOpen = (label: string) => opened.includes(label)
  const navigate = useNavigate()
  const loggedIn = useAuthStore((s) => s.mode === 'login' && !!s.user?.email)
  const pro = useAuthStore((s) => s.plan === 'pro')
  const [leaving, setLeaving] = useState(false)
  const [askLogout, setAskLogout] = useState(false)
  const [wipe, setWipe] = useState(false)
  const uid = useAuthStore((s) => s.user?.id || null)
  const startLogout = () => {
    if (!documentClient() || leaving) return
    if (!mayLeave(message => window.confirm(message), message => window.alert(message))) return
    setWipe(false); setAskLogout(true)
  }
  const logout = async () => {
    const client = documentClient()
    if (!client || leaving) return
    setLeaving(true)
    try {
      await signOutUser(client)
      if (wipe && uid) await deleteAccountData(uid).catch(() => {})
      setAskLogout(false); onNavigate?.(); navigate('/login', { replace: true })
    } finally { setLeaving(false) }
  }
  const toggle = (label: string) => setOpened((current) => current.includes(label) ? current.filter((item) => item !== label) : [...current, label])

  return <aside className="min-h-0 w-full flex-1 overflow-y-auto overscroll-contain border-r bg-white" style={{ borderColor: 'var(--border)' }}><nav aria-label="Menu utama" className="space-y-1 p-3">
    <NavLink onClick={onNavigate} to="/" end className={linkClass}><LayoutDashboard size={18}/>Dashboard</NavLink>
    {groups.map((group, index) => { const open = isOpen(group.label); const active = activeGroup === group.label; return <div key={group.label} className="pt-1"><button aria-expanded={open} aria-controls={`${menuId}-${index}`} onClick={() => toggle(group.label)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold transition ${active ? 'text-teal-700' : 'text-slate-700 hover:bg-slate-100'}`}><group.icon size={18}/><span className="flex-1 text-left">{group.label}</span><ChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`}/></button>{open && <div id={`${menuId}-${index}`} className="ml-4 mt-1 space-y-1 border-l border-slate-200 pl-2">{group.children.map((item) => <NavLink onClick={onNavigate} key={item.to} to={item.to} className={linkClass}><item.icon size={17}/>{item.label}</NavLink>)}</div>}</div> })}
    <div className="mt-2 space-y-1 border-t border-slate-100 pt-2">{standaloneItems.map((item) => <NavLink onClick={onNavigate} key={item.to} to={item.to} className={linkClass}><item.icon size={18}/>{item.label}</NavLink>)}{loggedIn && <NavLink onClick={onNavigate} to="/aktivasi" className={linkClass}><Sparkles size={18}/>{pro ? 'Pro Aktif' : 'Aktivasi Pro'}</NavLink>}{loggedIn && <button type="button" onClick={startLogout} disabled={leaving} className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50"><LogOut size={18}/>{leaving ? 'Keluar…' : 'Keluar'}</button>}</div>
  </nav>
    {askLogout && <Modal title="Keluar dari akun?" onClose={() => { if (!leaving) setAskLogout(false) }} maxWidth="max-w-sm" footer={<>
      <button type="button" autoFocus disabled={leaving} onClick={() => setAskLogout(false)} className="min-h-11 rounded-xl border px-4 py-2 text-sm font-semibold">Batal</button>
      <button type="button" disabled={leaving} onClick={() => void logout()} className={`min-h-11 rounded-xl px-4 py-2 text-sm font-semibold text-white ${wipe ? 'bg-red-600' : 'bg-teal-700'}`}>{leaving ? 'Keluar…' : wipe ? 'Keluar & hapus data' : 'Keluar'}</button>
    </>}>
      <p className="text-sm leading-relaxed text-slate-700">Data kelas tetap tersimpan di perangkat ini dan muncul lagi saat kamu masuk.</p>
      <label className="mt-4 flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 text-sm">
        <input type="checkbox" checked={wipe} onChange={event => setWipe(event.target.checked)} className="mt-0.5 size-5 shrink-0 accent-red-600"/>
        <span><strong className="block text-slate-800">Hapus data dari perangkat ini</strong><span className="text-slate-600">Pilih ini bila memakai HP/laptop bersama. Pastikan sudah sinkron atau membuat cadangan file, karena data siswa di perangkat ini akan dihapus permanen.</span></span>
      </label>
    </Modal>}
  </aside>
}
