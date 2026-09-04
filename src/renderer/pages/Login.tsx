import { GraduationCap } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Login() {
  return <main className="grid min-h-dvh place-items-center bg-slate-100 p-4">
    <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
      <div className="text-center"><span className="mx-auto grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-800 text-white"><GraduationCap size={32}/></span><h1 className="mt-4 text-2xl font-black text-slate-900">BGY Wali Kelas</h1><p className="mt-2 text-sm leading-6 text-slate-600">Kelola administrasi kelas dalam satu tempat.</p></div>
      <button type="button" disabled className="mt-7 flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-400"><span className="text-lg font-black">G</span>Masuk dengan Google</button>
      <p className="mt-3 text-center text-xs leading-5 text-slate-500">Login Google akan diaktifkan setelah Supabase tersambung.</p>
      <Link to="/" className="mt-5 flex min-h-12 items-center justify-center rounded-xl bg-teal-600 px-4 text-sm font-bold text-white hover:bg-teal-700">Lanjutkan gratis</Link>
      <aside className="mt-5 rounded-xl bg-emerald-50 p-3 text-xs leading-5 text-emerald-900"><strong>Semua fitur masih gratis.</strong> Tidak ada trial atau batas waktu selama tahap pengembangan dan pengumpulan masukan.</aside>
    </section>
  </main>
}
