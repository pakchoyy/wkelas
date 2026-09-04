import { BookOpenCheck, CalendarClock, CheckCircle2, FileSpreadsheet, Settings2, Users } from 'lucide-react'
import { Link } from 'react-router-dom'

const steps = [
  { number: 1, title: 'Periksa identitas kelas', description: 'Pastikan nama sekolah, wali kelas, tahun ajaran, dan semester sudah benar.', to: '/pengaturan', state: { tab: 'profil' }, action: 'Buka pengaturan', icon: Settings2 },
  { number: 2, title: 'Masukkan data siswa', description: 'Tambahkan satu per satu atau impor banyak siswa sekaligus dari Excel.', to: '/siswa/data-siswa', state: { openImport: true }, action: 'Impor data siswa', icon: Users },
  { number: 3, title: 'Atur mata pelajaran', description: 'Siapkan daftar mata pelajaran sebelum menyusun jadwal dan penilaian.', to: '/aktivitas/mapel', action: 'Kelola mata pelajaran', icon: BookOpenCheck },
  { number: 4, title: 'Susun jadwal kelas', description: 'Atur jam pelajaran dan waktu istirahat agar jurnal harian lebih mudah diisi.', to: '/aktivitas/jadwal', action: 'Buka jadwal', icon: CalendarClock },
]

export default function MulaiDiSini() {
  return <div className="mx-auto max-w-5xl space-y-6 pb-12">
    <header className="rounded-2xl bg-slate-900 p-6 text-white sm:p-8"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-teal-500"><CheckCircle2 size={23}/></span><div><h1 className="text-2xl font-black">Mulai di Sini</h1><p className="mt-1 text-sm text-slate-300">Siapkan kelas sampai siap dipakai dalam empat langkah.</p></div></div></header>
    <section className="grid gap-4 md:grid-cols-2">{steps.map(({icon: Icon, ...step}) => <article key={step.number} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-teal-50 font-black text-teal-700">{step.number}</span><Icon className="ml-auto text-slate-400" size={21}/></div>
      <h2 className="mt-4 text-lg font-extrabold text-slate-800">{step.title}</h2><p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{step.description}</p>
      <Link to={step.to} state={step.state} className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-teal-700">{step.action}</Link>
    </article>)}</section>
    <aside className="flex gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900"><FileSpreadsheet className="mt-0.5 shrink-0" size={19}/><p>Format Excel siswa dapat diunduh dari jendela impor. Periksa hasil impor sebelum melanjutkan ke presensi.</p></aside>
  </div>
}
