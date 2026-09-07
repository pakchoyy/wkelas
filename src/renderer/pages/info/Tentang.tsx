import { Link } from 'react-router-dom'
import { BellRing, BookOpenCheck, ExternalLink, LayoutGrid, Rocket } from 'lucide-react'
import { APP_UPDATED_AT, APP_VERSION } from '../../../shared/app-info'
import { BGY_PRODUCTS } from '../../../shared/bgy-products'

const FITUR = ['Presensi harian, rekap semester & Auto Hadir', 'Penilaian, catatan perilaku & rekap nilai', 'Jadwal, Rencana Mengajar & Jurnal Harian', 'Kalender Akademik (otomatis Jatim 2026/2027)', 'Laporan siap cetak & cadangan data .bgy']

export default function Tentang() {
  return <div className="mx-auto max-w-6xl space-y-6">
    <header className="overflow-hidden rounded-2xl bg-gradient-to-br from-teal-700 via-teal-800 to-indigo-900 p-6 text-white sm:p-8">
      <p className="text-xs font-bold uppercase tracking-widest text-teal-200">Bantu Guru Yuk</p>
      <h1 className="mt-1 text-3xl font-black">Wali Kelas</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-teal-50">Aplikasi pendamping wali kelas untuk mengelola administrasi kelas sehari-hari: presensi, penilaian, perangkat mengajar, sampai laporan. Data tersimpan di perangkat ini dan bisa dicadangkan sebagai file .bgy.</p>
      <p className="mt-3 inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-bold">Versi {APP_VERSION} · diperbarui {APP_UPDATED_AT}</p>
    </header>

    <section aria-label="Fitur utama" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-800"><BookOpenCheck size={20} className="text-teal-700"/>Yang bisa dilakukan</h2>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {FITUR.map((fitur) => <li key={fitur} className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700"><span aria-hidden="true" className="mt-1.5 size-2 shrink-0 rounded-full bg-teal-500"/>{fitur}</li>)}
      </ul>
    </section>

    <section aria-label="Jelajahi" className="grid gap-3 sm:grid-cols-3">
      <Link to="/pembaruan" className="flex min-h-20 items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-teal-300 hover:bg-teal-50"><BellRing size={24} className="shrink-0 text-amber-600"/><span><strong className="block text-base text-slate-800">Yang Baru</strong><small className="text-sm text-slate-500">Fitur terbaru aplikasi</small></span></Link>
      <Link to="/mulai" className="flex min-h-20 items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-teal-300 hover:bg-teal-50"><Rocket size={24} className="shrink-0 text-teal-700"/><span><strong className="block text-base text-slate-800">Mulai di Sini</strong><small className="text-sm text-slate-500">Panduan 4 langkah</small></span></Link>
      <Link to="/produk" className="flex min-h-20 items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-teal-300 hover:bg-teal-50"><LayoutGrid size={24} className="shrink-0 text-teal-700"/><span><strong className="block text-base text-slate-800">Produk BGY</strong><small className="text-sm text-slate-500">Alat bantu lainnya</small></span></Link>
    </section>

    <section aria-label="Produk BGY lainnya">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2"><div><h2 className="text-lg font-extrabold text-slate-800">Produk BGY lainnya</h2><p className="text-sm text-slate-500">Alat bantu lain dari Bantu Guru Yuk untuk guru.</p></div><Link to="/produk" className="inline-flex min-h-11 items-center text-sm font-bold text-teal-700 underline underline-offset-4">Lihat semua</Link></div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {BGY_PRODUCTS.map((product) => <article key={product.id} className="flex flex-col rounded-2xl border border-amber-200 bg-gradient-to-b from-amber-50 to-white p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-600">{product.promoText}</p>
          <h3 className="mt-1 font-extrabold text-slate-800">{product.name}</h3>
          <p className="mt-1 flex-1 text-xs leading-5 text-slate-600">{product.description}</p>
          <a href={product.href} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-teal-600 px-3 py-2 text-sm font-bold text-white hover:bg-teal-700">{product.action} <ExternalLink size={15}/></a>
        </article>)}
      </div>
    </section>
  </div>
}
