import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { ClipboardCheck, ClipboardList, LayoutDashboard, Menu, X } from 'lucide-react'
import Header from './Header'
import Sidebar from './Sidebar'
import RunningPromo from './RunningPromo'

const quickLinks = [
  {to:'/',label:'Beranda',icon:LayoutDashboard},
  {to:'/siswa/presensi',label:'Presensi',icon:ClipboardCheck},
  {to:'/aktivitas/jurnal',label:'Jurnal',icon:ClipboardList},
]

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
  const quickActive = quickLinks.some(link => link.to === location.pathname)
  return (
    <div className="app-layout flex h-dvh min-h-0 flex-col overflow-hidden">
      <a href="#main-content" className="skip-link" onClick={event => { event.preventDefault(); main.current?.focus(); main.current?.scrollTo({top:0}); }}>Lewati ke konten utama</a>
      <Header onOpenMenu={() => setMenuOpen(true)} menuOpen={menuOpen}/>
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="hidden w-64 shrink-0 lg:flex"><Sidebar/></div>
        <main ref={main} id="main-content" tabIndex={-1} className="min-h-0 min-w-0 flex-1 overflow-auto overscroll-contain p-3 sm:p-4 lg:p-6">
          <div className="min-w-0 animate-slide-up"><Outlet/></div>
        </main>
      </div>
      <RunningPromo/>
      <nav aria-label="Navigasi cepat" className="mobile-navigation grid shrink-0 grid-cols-4 border-t border-slate-200 bg-white lg:hidden" style={{paddingBottom:'env(safe-area-inset-bottom)'}}>
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
