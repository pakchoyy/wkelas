import { Check, ChevronRight, Rocket, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useState } from 'react'

type Step = { label: string; detail: string; to: string; complete: boolean }

export default function QuickStartGuide({ studentCount, scheduleCount, attendanceCount }: { studentCount: number; scheduleCount: number; attendanceCount: number }) {
  const [hidden, setHidden] = useState(() => localStorage.getItem('bgy-quick-start-hidden-v1') === '1')
  const steps: Step[] = [
    { label: 'Tambahkan siswa', detail: studentCount ? `${studentCount} siswa sudah terdaftar` : 'Masukkan data siswa kelasmu', to: '/siswa/data-siswa', complete: studentCount > 0 },
    { label: 'Atur jadwal', detail: scheduleCount ? `${scheduleCount} jam sudah dijadwalkan` : 'Susun mata pelajaran dan jam belajar', to: '/aktivitas/jadwal', complete: scheduleCount > 0 },
    { label: 'Isi presensi pertama', detail: attendanceCount ? 'Presensi pertama sudah tercatat' : 'Catat kehadiran siswa hari ini', to: '/siswa/presensi', complete: attendanceCount > 0 },
  ]
  const completed = steps.filter(step => step.complete).length
  if (hidden || completed === steps.length) return null
  return <section className="rounded-2xl border border-teal-200 bg-gradient-to-r from-teal-50 to-white p-4 shadow-sm sm:p-5" aria-label="Panduan mulai cepat">
    <div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-teal-600 text-white"><Rocket size={19}/></span><div className="min-w-0 flex-1"><h2 className="font-extrabold text-slate-800">Mulai dalam 3 langkah</h2><p className="mt-1 text-sm text-slate-600">{completed} dari 3 langkah selesai.</p></div><button type="button" title="Sembunyikan panduan" aria-label="Sembunyikan panduan mulai cepat" onClick={() => { localStorage.setItem('bgy-quick-start-hidden-v1','1'); setHidden(true) }} className="grid size-10 shrink-0 place-items-center rounded-xl text-slate-500 hover:bg-white"><X size={18}/></button></div>
    <div className="mt-4 grid gap-2 lg:grid-cols-3">{steps.map((step, index) => <Link key={step.label} to={step.to} className="flex min-h-16 items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 hover:border-teal-300">
      <span className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-black ${step.complete ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{step.complete ? <Check size={17}/> : index + 1}</span>
      <span className="min-w-0 flex-1"><strong className="block text-sm text-slate-800">{step.label}</strong><small className="mt-0.5 block text-slate-500">{step.detail}</small></span><ChevronRight size={16} className="shrink-0 text-slate-400"/>
    </Link>)}</div>
  </section>
}
