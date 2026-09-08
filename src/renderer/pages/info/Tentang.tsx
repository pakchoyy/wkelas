import { BookOpenCheck, ExternalLink, MessageCircle, Music2, Users } from 'lucide-react'
import { APP_UPDATED_AT, APP_VERSION } from '../../../shared/app-info'
import { BGY_PRODUCTS } from '../../../shared/bgy-products'

const FITUR = ['Presensi harian, rekap semester & Auto Hadir', 'Penilaian, catatan perilaku & rekap nilai', 'Jadwal, Rencana Mengajar & Jurnal Harian', 'Kalender Akademik (otomatis Jatim 2026/2027)', 'Laporan siap cetak & cadangan data .bgy']

export default function Tentang() {
  return <div className="mx-auto max-w-6xl space-y-6">
    <header className="overflow-hidden rounded-2xl bg-gradient-to-br from-teal-800 via-teal-900 to-slate-800 p-6 text-white sm:p-8">
      <p className="text-xs font-bold uppercase tracking-widest text-teal-200">Bantu Guru Yuk</p>
      <h1 className="mt-1 text-3xl font-black tracking-tight">Wali Kelas</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-teal-50">Teman kerja wali kelas SD: absensi, nilai, dan perangkat mengajar beres dalam satu aplikasi. Data tersimpan aman di perangkat ini dan bisa dicadangkan sebagai file .bgy.</p>
      <p className="mt-3 inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-bold">Versi {APP_VERSION} · diperbarui {APP_UPDATED_AT}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/15 pt-4">
        <span className="text-sm font-bold text-teal-100">Dibuat oleh Pak Choy</span>
        <a href="https://www.tiktok.com/@pak.choyy" target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white/15 px-3 py-2 text-xs font-bold text-white hover:bg-white/25"><Music2 size={15}/>TikTok @pak.choyy</a>
        <a href="https://wa.me/6289530713597" target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white/15 px-3 py-2 text-xs font-bold text-white hover:bg-white/25"><MessageCircle size={15}/>WA 0895-3071-3597</a>
        <a href="https://chat.whatsapp.com/CK7joLk242kJxZeXu9GBPu" target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white/15 px-3 py-2 text-xs font-bold text-white hover:bg-white/25"><Users size={15}/>Grup diskusi Wali Kelas<ExternalLink size={13}/></a>
      </div>
    </header>

    <section aria-label="Fitur yang tersedia di BGY Wali Kelas" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-800"><BookOpenCheck size={20} className="text-teal-700"/>Fitur yang tersedia di BGY Wali Kelas</h2>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {FITUR.map((fitur) => <li key={fitur} className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700"><span aria-hidden="true" className="mt-1.5 size-2 shrink-0 rounded-full bg-teal-500"/>{fitur}</li>)}
      </ul>
    </section>

    <section aria-label="Produk BGY lainnya" className="overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-teal-900 to-slate-900 p-5 shadow-sm sm:p-6">
      <h2 className="text-base font-extrabold text-white">Produk BGY lainnya</h2>
      <p className="mt-1 text-sm text-teal-100">Jelajahi alat bantu lain dari Bantu Guru Yuk.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {BGY_PRODUCTS.map((p, i) => <a key={p.id} href={p.href} target="_blank" rel="noreferrer" className="group flex flex-col rounded-2xl bg-white p-4 shadow transition hover:-translate-y-0.5 hover:shadow-lg">
          <span aria-hidden="true" className="grid size-10 place-items-center rounded-xl text-base font-black text-white" style={{ background: `linear-gradient(135deg, ${['#0d9488,#0f766e','#d97706,#b45309','#7c3aed,#5b21b6','#2563eb,#1d4ed8'][i % 4]})` }}>{p.name.charAt(0)}</span>
          <span className="mt-3 text-sm font-extrabold text-slate-900">{p.name}</span>
          <span className="mt-0.5 text-xs font-semibold text-teal-700">{p.promoText}</span>
          <span className="mt-1 flex-1 text-xs leading-5 text-slate-500">{p.description}</span>
          <span className="mt-3 inline-flex min-h-9 items-center justify-center gap-1 rounded-xl bg-teal-700 px-3 text-xs font-bold text-white group-hover:bg-teal-800">{p.action} <ExternalLink size={12}/></span>
        </a>)}
      </div>
    </section>
  </div>
}
