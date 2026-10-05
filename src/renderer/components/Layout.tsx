import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Menu, X } from 'lucide-react'
import AnnouncementAlert from './AnnouncementAlert'
import Header from './Header'
import Sidebar from './Sidebar'
import RunningPromo from './RunningPromo'
import PwaInstallPrompt from './PwaInstallPrompt'
import { useCloudAutoSync } from '../hooks/useCloudAutoSync'
import { useUnreadAnnouncements } from '../hooks/useUnreadAnnouncements'
import { resolveQuickNavOptions, type QuickNavOption } from './quick-nav-options'
import { readQuickNav } from '../../lib/quick-nav'
import { notifyDueTasks } from '../../lib/task-reminder'
import { hasPendingActivation } from '../../lib/pro-license'

const HOME_LINK = { to: '/', label: 'Beranda', icon: LayoutDashboard }

export default function Layout() {
  const [menuOpen,setMenuOpen] = useState(false)
  const drawer = useRef<HTMLDialogElement>(null)
  const main = useRef<HTMLElement>(null)
  const location = useLocation()
  useEffect(() => {
    setMenuOpen(false)
    main.current?.scrollTo({top:0,left:0})
    if (location.pathname !== '/bantuan') sessionStorage.setItem('bgy-last-page', location.pathname)
  },[location.pathname])
  useEffect(() => {
    const dialog = drawer.current
    if (!dialog) return
    if (menuOpen && !dialog.open) dialog.showModal()
    if (!menuOpen && dialog.open) dialog.close()
  },[menuOpen])
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)')
    const closeOnDesktop = () => { if (desktop.matches) setMenuOpen(false) }
    desktop.addEventListener('change',closeOnDesktop)
    return () => desktop.removeEventListener('change',closeOnDesktop)
  },[])
  const navigate = useNavigate()
  // Link aktivasi dari halaman pembelian dibuka sebelum login: lanjutkan setelah masuk.
  useEffect(() => { if (location.pathname !== '/aktivasi' && hasPendingActivation()) navigate('/aktivasi', { replace: true }) }, [location.pathname, navigate])
  const sync = useCloudAutoSync()
  // Pengumuman dulu, alert install belakangan: prompt ditahan selama masih ada yang belum dibaca,
  // tapi maksimal 30 detik agar tidak hilang selamanya bila lonceng tak pernah dibuka.
  const unread = useUnreadAnnouncements()
  const [installGrace, setInstallGrace] = useState(false)
  useEffect(() => {
    if (unread === 0) return
    const timer = window.setTimeout(() => setInstallGrace(true), 30000)
    return () => window.clearTimeout(timer)
  }, [unread])
  useEffect(() => {
    const run = () => { if (document.visibilityState === 'visible') void notifyDueTasks().catch(() => {}) }
    run()
    document.addEventListener('visibilitychange', run)
    return () => document.removeEventListener('visibilitychange', run)
  }, [])
  // Beranda + Menu dikunci; 3 slot tengah bebas dipilih di Pengaturan > Personalisasi.
  const [customNav, setCustomNav] = useState<QuickNavOption[]>(() => resolveQuickNavOptions(null))
  useEffect(() => {
    let cancelled = false
    const load = () => { void readQuickNav().then((paths) => { if (!cancelled) setCustomNav(resolveQuickNavOptions(paths)) }).catch(() => {}) }
    load()
    window.addEventListener('bgy-quick-nav', load)
    return () => { cancelled = true; window.removeEventListener('bgy-quick-nav', load) }
  }, [])
  const quickLinks = [HOME_LINK, ...customNav]
  const quickActive = quickLinks.some(link => link.to === location.pathname)
  return (
    <div className="app-layout flex h-dvh min-h-0 flex-col overflow-hidden">
      <a href="#main-content" className="skip-link" onClick={event => { event.preventDefault(); main.current?.focus(); main.current?.scrollTo({top:0}); }}>Lewati ke konten utama</a>
      <Header onOpenMenu={() => setMenuOpen(true)} menuOpen={menuOpen} announcementCount={unread ?? 0} syncDecision={sync}/>
      {unread !== null && unread > 0 ? <AnnouncementAlert/> : null}
      {unread !== null && unread > 0 && !installGrace ? null : <PwaInstallPrompt/>}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="hidden w-64 shrink-0 lg:flex"><Sidebar/></div>
        <main ref={main} id="main-content" tabIndex={-1} className="min-h-0 min-w-0 flex-1 overflow-auto overscroll-y-auto p-3 sm:p-4 lg:p-6">
          {sync === 'remote-newer' && location.pathname !== '/pengaturan' && <div role="status" className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900"><span>Ada data lebih baru di cloud dari perangkat lain. Sinkron otomatis ditahan agar tidak saling menimpa.</span><Link to="/pengaturan" state={{tab:'backup'}} className="inline-flex min-h-10 items-center rounded-lg bg-sky-700 px-3 font-bold text-white hover:bg-sky-800">Tinjau</Link></div>}
          <div className="min-w-0 animate-slide-up"><Outlet/></div>
        </main>
      </div>
      <RunningPromo/>
      <nav aria-label="Navigasi cepat" className="mobile-navigation grid shrink-0 grid-cols-5 border-t border-slate-200 bg-white lg:hidden" style={{paddingBottom:'env(safe-area-inset-bottom)'}}>
        {quickLinks.map(({to,label,icon:Icon}) => <NavLink key={to} to={to} end={to === '/'} className={({isActive}) => `flex min-h-12 flex-col items-center justify-center gap-1 text-xs font-semibold ${isActive ? 'bg-teal-50 text-teal-700' : 'text-slate-500'}`}><Icon size={19}/>{label}</NavLink>)}
        <button onClick={() => setMenuOpen(true)} aria-expanded={menuOpen} aria-controls="mobile-menu" className={`flex min-h-12 flex-col items-center justify-center gap-1 text-xs font-semibold ${!quickActive ? 'bg-teal-50 text-teal-700' : 'text-slate-500'}`}><Menu size={19}/>Menu</button>
      </nav>
      <dialog ref={drawer} id="mobile-menu" aria-labelledby="mobile-menu-title" onClose={() => setMenuOpen(false)} onClick={event => { const bounds=event.currentTarget.getBoundingClientRect(); if(event.target===event.currentTarget && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) setMenuOpen(false) }} className="fixed inset-y-0 left-0 m-0 h-dvh max-h-none w-80 max-w-[calc(100vw-3rem)] flex-col border-0 bg-white p-0 text-slate-800 shadow-xl open:flex backdrop:bg-slate-950/45">
        <div className="flex shrink-0 items-center justify-between border-b px-4 py-3"><h2 id="mobile-menu-title" className="font-bold">Menu Wali Kelas</h2><button onClick={() => setMenuOpen(false)} aria-label="Tutup menu" className="grid size-11 place-items-center rounded-xl hover:bg-slate-100"><X size={19}/></button></div>
        <Sidebar onNavigate={() => setMenuOpen(false)}/>
      </dialog>
    </div>
  )
}
