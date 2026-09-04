import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Stat from '../../components/StatCard'
import DemoNotice from '../../components/DemoNotice'
import { ArrowRight, BookOpen, CalendarDays, CheckCircle2, ClipboardCheck, Clock3, GraduationCap, ListTodo, Users } from 'lucide-react'
import { db } from '../../../lib/db'
import { useAppStore } from '../../stores/appStore'
import { todayISO } from '../../../shared/utils'
import { schoolDayStatus } from '../../../shared/school-day'
import QuickStartGuide from '../../components/QuickStartGuide'
import BackupReminderBanner from '../../components/BackupReminderBanner'

export default function Dashboard() {
  const [retry, setRetry] = useState(0)
  const [today, setToday] = useState(todayISO())
  useEffect(() => { const refresh = () => setToday(todayISO()); const timer = window.setInterval(refresh, 30000); window.addEventListener('focus', refresh); return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh) } }, [])
  const date = new Date(`${today}T12:00:00`)
  const day = date.getDay() || 7
  const dateLabel = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date)
  const kelasId = useAppStore((s) => s.kelasAktifId) || 1
  const [data, setData] = useState<any>({ siswa: [], jadwal: [], semuaJadwal: [], todo: [], presensi: [], jurnal: [], mapel: [], kalender: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [schoolDays, setSchoolDays] = useState(5)
  useEffect(() => { ;(async () => {
    setLoading(true); setError('')
    try {
      const stored = await db.pengaturan.get(`presensi_${kelasId}`)
      let days = 5
      if (stored?.value) { try { days = JSON.parse(stored.value).hariSekolah === 6 ? 6 : 5 } catch {} }
      setSchoolDays(days)
      const [siswa, jadwal, todo, presensi, kelas, jurnal, mapel, kalender] = await Promise.all([window.electronAPI.siswa.list(kelasId), window.electronAPI.jadwal.list(kelasId), window.electronAPI.todo.list(), window.electronAPI.presensi.get(kelasId, today), db.kelas.get(kelasId), window.electronAPI.jurnal.list(kelasId), window.electronAPI.mapel.list(kelasId), window.electronAPI.kalender.list(kelasId)])
      const guru = kelas?.guru_id ? await db.guru.get(kelas.guru_id) : undefined
      setData({ siswa, jadwal: jadwal.filter((j: any) => j.hari === day).sort((a: any, b: any) => a.jam_ke - b.jam_ke), semuaJadwal: jadwal, todo, presensi: presensi.filter((p: any) => siswa.some((s: any) => s.id === p.siswa_id)), kelas, guru, jurnal, mapel, kalender })
    } catch { setError('Dashboard belum berhasil dimuat. Pilih Coba lagi untuk memuat ulang ringkasan.') } finally { setLoading(false) }
  })() }, [kelasId, today, retry])
  const counts = useMemo(() => { const count = (s: string) => data.presensi.filter((p: any) => p.status === s).length; const todayJournals=data.jurnal.filter((item:any)=>item.tanggal===today); return { hadir: count('H') + count('T'), terlambat: count('T'), sakit: count('S'), izin: count('I'), alpa: count('A'), todo: data.todo.filter((t: any) => t.status !== 'selesai').length, journalMissing: data.jadwal.filter((slot:any)=>!todayJournals.some((item:any)=>String(item.jam_ke)===String(slot.jam_ke)&&item.materi)).length } }, [data, today])
  const lengkap = data.siswa.length > 0 && data.presensi.length >= data.siswa.length
  const schoolDay = schoolDayStatus(today, schoolDays, data.kalender)
  const holiday = !schoolDay.active ? { judul: schoolDay.reason } : null
  const subjectName=(slot:any)=>slot.nama_mapel_custom||data.mapel.find((item:any)=>item.id===slot.mata_pelajaran_id)?.nama||'Mata pelajaran'

  const unavailable = loading || !!error
  const shown = (value: number) => unavailable ? '—' : value

  return <div className="dashboard max-w-[1440px] mx-auto space-y-5">
    <DemoNotice/>
    {!loading && !error && <QuickStartGuide studentCount={data.siswa.length} scheduleCount={data.semuaJadwal.length} attendanceCount={data.presensi.length}/>}
    <BackupReminderBanner/>
    <p role="status" className="sr-only">{loading ? 'Memuat ringkasan kelas…' : error ? '' : 'Ringkasan kelas sudah dimuat.'}</p>
    {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><p>{error}</p><button onClick={() => setRetry(value => value + 1)} className="min-h-11 rounded-lg border border-red-300 bg-white px-4 font-semibold">Coba lagi</button></div>}
    <section className="dashboard-hero relative overflow-hidden rounded-2xl bg-slate-900 p-5 text-white sm:p-7">
      <div aria-hidden="true" className="pointer-events-none absolute -end-16 -top-20 size-72 rounded-full bg-emerald-500/10" />
      <div className="dashboard-welcome relative flex flex-col justify-between gap-6">
        <div className="min-w-0">
          <p className="mb-3 text-xs font-semibold tracking-wide text-slate-300">{dateLabel}</p>
          <h1 className="break-words text-2xl font-bold leading-tight tracking-tight sm:text-3xl">Selamat bekerja, {data.guru?.nama || 'Wali Kelas'}</h1>
          <p className="mt-3 break-words text-sm leading-relaxed text-slate-300">{data.guru?.nama_sekolah || 'Sekolah belum diatur'} · {data.kelas?.nama_kelas || 'Kelas aktif'}</p>
        </div>
        {!unavailable && <Link to={holiday ? '/aktivitas/kalender' : '/siswa/presensi'} className="dashboard-primary flex min-h-12 shrink-0 items-center justify-center gap-3 rounded-xl px-5 py-3 text-sm font-semibold"><ClipboardCheck size={20} aria-hidden="true" className="shrink-0"/><span>{holiday ? 'Lihat kalender akademik' : lengkap ? 'Lihat presensi hari ini' : 'Isi presensi hari ini'}</span><ArrowRight size={17} aria-hidden="true" className="shrink-0"/></Link>}
      </div>
    </section>
    <section aria-label="Ringkasan kelas" aria-busy={loading} className="dashboard-stats">
      <Stat label="Total siswa" value={shown(data.siswa.length)} icon={Users}/>
      <Stat label="Hadir" detail="Termasuk terlambat" value={shown(counts.hadir)} icon={CheckCircle2}/>
      <Stat label="Tidak hadir" detail="Sakit, izin, dan alpa" value={shown(counts.sakit + counts.izin + counts.alpa)} icon={ClipboardCheck}/>
      <Stat label="Jurnal belum diisi" value={shown(holiday ? 0 : counts.journalMissing)} icon={BookOpen}/>
      <Stat label="Tugas tertunda" value={shown(counts.todo)} icon={ListTodo}/>
    </section>
    <section className="dashboard-columns">
      <Panel title="Jadwal hari ini" subtitle={unavailable ? 'Ringkasan jadwal mengajar' : `${data.jadwal.length} kegiatan terjadwal`} icon={CalendarDays} action="Buka jadwal" to="/aktivitas/jadwal">
        {unavailable ? <Empty text={loading ? 'Memuat jadwal…' : 'Jadwal belum bisa dimuat.'}/> : holiday ? <Empty text={`Hari libur: ${holiday.judul}`}/> : data.jadwal.length === 0 ? <Empty text="Belum ada jadwal hari ini. Buka jadwal untuk menambahkan kegiatan mengajar."/> : <><div className="divide-y divide-slate-100">{data.jadwal.slice(0, 5).map((x: any) => <div key={x.id} className="flex items-center gap-3 py-3"><div className="w-14 shrink-0 text-center tabular-nums"><div className="text-xs text-slate-500">Jam {x.jam_ke}</div><div className="mt-1 text-sm font-semibold">{x.jam_mulai || '--:--'}</div></div><div aria-hidden="true" className="h-10 w-1 shrink-0 rounded-full bg-teal-600"/><div className="min-w-0 break-words"><div className="text-sm font-semibold">{subjectName(x)}</div><div className="mt-1 text-xs text-slate-500">Selesai {x.jam_selesai || '--:--'}{x.ruang ? ` · ${x.ruang}` : ''}</div></div></div>)}</div>{data.jadwal.length > 5 && <Link to="/aktivitas/jadwal" className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-[var(--accent)] underline underline-offset-4">Lihat {data.jadwal.length - 5} kegiatan lainnya</Link>}</>}
      </Panel>
      <Panel title="Ringkasan presensi" subtitle={unavailable ? 'Pencatatan kehadiran hari ini' : holiday ? 'Tidak perlu mengisi presensi hari ini' : lengkap ? 'Presensi hari ini sudah lengkap' : `${Math.max(data.siswa.length - data.presensi.length, 0)} siswa belum dicatat`} icon={ClipboardCheck} action={holiday ? 'Buka kalender' : 'Buka presensi'} to={holiday ? '/aktivitas/kalender' : '/siswa/presensi'}>
        {unavailable ? <Empty text={loading ? 'Memuat presensi…' : 'Presensi belum bisa dimuat.'}/> : holiday ? <Empty text={holiday.judul}/> : data.siswa.length === 0 ? <Empty text="Tambahkan siswa terlebih dahulu untuk mulai mencatat kehadiran."/> : <div className="grid grid-cols-2 gap-3"><Attendance label="Hadir" detail="Termasuk terlambat" value={counts.hadir} tone="emerald"/><Attendance label="Sakit" value={counts.sakit} tone="blue"/><Attendance label="Izin" value={counts.izin} tone="amber"/><Attendance label="Alpa" value={counts.alpa} tone="rose"/></div>}
      </Panel>
    </section>
    <section className="dashboard-columns">
      <Panel title="Yang perlu diselesaikan" subtitle="Tugas yang masih tertunda" icon={ListTodo} action="Buka tugas" to="/aktivitas/todo">
        {unavailable ? <Empty text={loading ? 'Memuat tugas…' : 'Daftar tugas belum bisa dimuat.'}/> : counts.todo === 0 ? <Empty text="Tidak ada tugas tertunda. Buka tugas untuk mencatat pekerjaan berikutnya."/> : <><div className="space-y-3">{data.todo.filter((t: any) => t.status !== 'selesai').slice(0, 4).map((t: any) => <div key={t.id} className="rounded-xl bg-slate-50 p-3"><div className="break-words text-sm font-semibold">{t.judul}</div><div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs"><span className={`rounded-md px-2 py-1 font-semibold ${t.prioritas === 'tinggi' ? tones.rose : 'bg-slate-200 text-slate-700'}`}>{t.prioritas === 'tinggi' ? 'Prioritas tinggi' : t.prioritas === 'rendah' ? 'Prioritas rendah' : 'Prioritas normal'}</span><span className="text-slate-600">{t.deadline ? `Tenggat ${deadlineLabel(t.deadline)}` : 'Tanpa tenggat'}</span></div></div>)}</div>{counts.todo > 4 && <Link to="/aktivitas/todo" className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-[var(--accent)] underline underline-offset-4">Lihat {counts.todo - 4} tugas lainnya</Link>}</>}
      </Panel>
      <Panel title="Aksi cepat" subtitle="Langsung ke kebutuhan mengajar" icon={GraduationCap}>
        <div className="grid grid-cols-2 gap-3"><Quick icon={Users} label="Tambah siswa" to="/siswa/data-siswa" state={{openAddStudent:true}}/><Quick icon={BookOpen} label="Isi jurnal" to="/aktivitas/jurnal"/><Quick icon={Clock3} label="Buat rencana" to="/aktivitas/rencana"/><Quick icon={BookOpen} label="Kelola mapel" to="/aktivitas/mapel"/></div>
      </Panel>
    </section>
  </div>
}

const tones: Record<string, string> = { emerald:'bg-emerald-50 text-emerald-800', blue:'bg-blue-50 text-blue-800', amber:'bg-amber-50 text-amber-800', rose:'bg-rose-50 text-rose-800' }
function Panel({title,subtitle,icon:Icon,action,to,children}:any){return <section className="min-w-0 rounded-2xl border border-slate-200 bg-white"><div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3 sm:px-5"><Icon size={19} aria-hidden="true" className="shrink-0 text-slate-500"/><div className="min-w-0 flex-1 basis-36"><h2 className="text-sm font-bold">{title}</h2><p className="mt-1 text-xs leading-relaxed text-slate-500">{subtitle}</p></div>{action && <Link to={to} className="ms-auto inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-xs font-semibold text-[var(--accent)] transition-colors hover:bg-[var(--accent-soft)]">{action}<ArrowRight size={14} aria-hidden="true"/></Link>}</div><div className="p-4 sm:p-5">{children}</div></section>}
function Attendance({label,detail,value,tone}:any){return <div className={`min-w-0 rounded-xl p-4 ${tones[tone]}`}><div className="text-2xl font-bold tabular-nums">{value}</div><div className="mt-1 text-sm font-semibold">{label}</div>{detail && <p className="mt-1 text-xs leading-relaxed">{detail}</p>}</div>}
function Quick({icon:Icon,label,to,state}:any){return <Link to={to} state={state} className="min-w-0 rounded-xl border border-slate-200 p-4 text-start transition-colors hover:border-teal-300 hover:bg-[var(--accent-soft)]"><Icon size={20} aria-hidden="true" className="mb-3 text-[var(--accent)]"/><span className="text-sm font-semibold">{label}</span></Link>}
function Empty({text}:{text:string}){return <div className="grid min-h-28 place-items-center px-2 py-4 text-center text-sm leading-relaxed text-slate-600"><p className="max-w-72">{text}</p></div>}

function deadlineLabel(value: string) {
  const date = new Date(`${value}T12:00:00`)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('id-ID', {day:'numeric',month:'short',year:'numeric'}).format(date)
}
