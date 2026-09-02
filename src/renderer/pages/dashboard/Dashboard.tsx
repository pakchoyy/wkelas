import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, BookOpen, CalendarDays, CheckCircle2, ClipboardCheck, Clock3, GraduationCap, ListTodo, Users } from 'lucide-react'
import { db } from '../../../lib/db'
import { useAppStore } from '../../stores/appStore'
import { todayISO } from '../../../shared/utils'
import { schoolDayStatus } from '../../../shared/school-day'

export default function Dashboard() {
  const navigate = useNavigate()
  const [today, setToday] = useState(todayISO())
  useEffect(() => { const refresh = () => setToday(todayISO()); const timer = window.setInterval(refresh, 30000); window.addEventListener('focus', refresh); return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh) } }, [])
  const date = new Date(`${today}T12:00:00`)
  const day = date.getDay() || 7
  const dateLabel = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date)
  const kelasId = useAppStore((s) => s.kelasAktifId) || 1
  const [data, setData] = useState<any>({ siswa: [], jadwal: [], todo: [], presensi: [], jurnal: [], mapel: [], kalender: [] })
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
      setData({ siswa, jadwal: jadwal.filter((j: any) => j.hari === day).sort((a: any, b: any) => a.jam_ke - b.jam_ke), todo, presensi: presensi.filter((p: any) => siswa.some((s: any) => s.id === p.siswa_id)), kelas, guru, jurnal, mapel, kalender })
    } catch { setError('Dashboard belum berhasil dimuat. Muat ulang halaman untuk mencoba lagi.') } finally { setLoading(false) }
  })() }, [kelasId, today])
  const counts = useMemo(() => { const count = (s: string) => data.presensi.filter((p: any) => p.status === s).length; const todayJournals=data.jurnal.filter((item:any)=>item.tanggal===today); return { hadir: count('H') + count('T'), terlambat: count('T'), sakit: count('S'), izin: count('I'), alpa: count('A'), todo: data.todo.filter((t: any) => t.status !== 'selesai').length, journalMissing: data.jadwal.filter((slot:any)=>!todayJournals.some((item:any)=>String(item.jam_ke)===String(slot.jam_ke)&&item.materi)).length } }, [data, today])
  const lengkap = data.siswa.length > 0 && data.presensi.length >= data.siswa.length
  const schoolDay = schoolDayStatus(today, schoolDays, data.kalender)
  const holiday = !schoolDay.active ? { judul: schoolDay.reason } : null
  const subjectName=(slot:any)=>slot.nama_mapel_custom||data.mapel.find((item:any)=>item.id===slot.mata_pelajaran_id)?.nama||'Mata pelajaran'

  return <div className="max-w-[1440px] mx-auto space-y-5">
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    <section className="rounded-2xl bg-slate-900 text-white p-6 md:p-7 overflow-hidden relative">
      <div className="absolute -right-16 -top-20 w-72 h-72 rounded-full bg-emerald-500/10" />
      <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6"><div><div className="text-emerald-300 text-xs font-bold uppercase tracking-[.14em] mb-2">{dateLabel}</div><h1 className="text-2xl md:text-3xl font-extrabold">Selamat bekerja, {data.guru?.nama || 'Wali Kelas'} 👋</h1><p className="text-slate-400 mt-2 text-sm">{data.guru?.nama_sekolah || 'Sekolah belum diatur'} · {data.kelas?.nama_kelas || 'Kelas aktif'}</p></div>
        <button onClick={() => navigate(holiday?'/aktivitas/kalender':'/siswa/presensi')} className="shrink-0 rounded-xl bg-emerald-500 hover:bg-emerald-400 px-5 py-3.5 font-bold flex items-center justify-center gap-2"><ClipboardCheck size={20}/>{holiday?holiday.judul:lengkap ? 'Lihat Presensi Hari Ini' : 'Isi Presensi Hari Ini'}<ArrowRight size={17}/></button></div>
    </section>
    <section className="grid grid-cols-2 lg:grid-cols-5 gap-3"><Stat label="Total siswa" value={data.siswa.length} icon={Users} tone="emerald"/><Stat label="Hadir (termasuk terlambat)" value={counts.hadir} icon={CheckCircle2} tone="blue"/><Stat label="Tidak hadir" value={counts.sakit + counts.izin + counts.alpa} icon={ClipboardCheck} tone="amber"/><Stat label="Jurnal belum diisi" value={holiday?0:counts.journalMissing} icon={BookOpen} tone="rose"/><Stat label="Tugas tertunda" value={counts.todo} icon={ListTodo} tone="violet"/></section>
    <section className="grid lg:grid-cols-[1.15fr_.85fr] gap-5">
      <Panel title="Jadwal Hari Ini" subtitle={`${data.jadwal.length} kegiatan terjadwal`} icon={CalendarDays} action="Buka jadwal" onAction={() => navigate('/aktivitas/jadwal')}>
        {loading ? <Empty text="Memuat jadwal..."/> : holiday ? <Empty text={`Hari libur: ${holiday.judul}`}/> : data.jadwal.length === 0 ? <Empty text="Belum ada jadwal untuk hari ini."/> : <div className="divide-y divide-slate-100">{data.jadwal.slice(0, 5).map((x: any) => <div key={x.id} className="py-3 flex items-center gap-4"><div className="w-14 text-center"><div className="text-xs text-slate-400">Jam {x.jam_ke}</div><div className="text-sm font-bold">{x.jam_mulai || '--:--'}</div></div><div className="w-1 h-10 rounded-full bg-emerald-400"/><div><div className="font-bold text-sm">{subjectName(x)}</div><div className="text-xs text-slate-500 mt-1">{x.jam_selesai || '--:--'} {x.ruang ? `· ${x.ruang}` : ''}</div></div></div>)}</div>}
      </Panel>
      <Panel title="Ringkasan Presensi" subtitle={loading ? 'Memuat presensi…' : holiday ? 'Tidak perlu mengisi presensi hari ini' : lengkap ? 'Presensi hari ini sudah lengkap' : `${Math.max(data.siswa.length - data.presensi.length, 0)} siswa belum dicatat`} icon={ClipboardCheck} action={holiday ? 'Kalender' : 'Kelola'} onAction={() => navigate(holiday ? '/aktivitas/kalender' : '/siswa/presensi')}>{holiday ? <Empty text={holiday.judul}/> : <div className="grid grid-cols-2 gap-3 mt-2"><Attendance label="Hadir termasuk terlambat" value={counts.hadir} tone="emerald"/><Attendance label="Sakit" value={counts.sakit} tone="blue"/><Attendance label="Izin" value={counts.izin} tone="amber"/><Attendance label="Alpa" value={counts.alpa} tone="rose"/></div>}</Panel>
    </section>
    <section className="grid lg:grid-cols-[1.15fr_.85fr] gap-5">
      <Panel title="Yang Perlu Diselesaikan" subtitle="Daftar pekerjaan terdekat" icon={ListTodo} action="Semua tugas" onAction={() => navigate('/aktivitas/todo')}>
        {counts.todo === 0 ? <Empty text="Tidak ada tugas tertunda. Kerja bagus!"/> : <div className="space-y-2">{data.todo.filter((t: any) => t.status !== 'selesai').slice(0, 4).map((t: any) => <div key={t.id} className="flex gap-3 items-center rounded-xl border border-slate-100 p-3"><span className={`w-2 h-2 rounded-full ${t.prioritas === 'tinggi' ? 'bg-rose-500' : 'bg-amber-400'}`}/><div className="flex-1 text-sm font-semibold">{t.judul}</div><span className="text-xs text-slate-400">{t.deadline || 'Tanpa batas'}</span></div>)}</div>}
      </Panel>
      <Panel title="Aksi Cepat" subtitle="Mulai tanpa mencari menu" icon={GraduationCap}><div className="grid grid-cols-2 gap-3"><Quick icon={Users} label="Tambah siswa" go={() => navigate('/siswa/data-siswa')}/><Quick icon={BookOpen} label="Isi jurnal" go={() => navigate('/aktivitas/jurnal')}/><Quick icon={Clock3} label="Buat rencana" go={() => navigate('/aktivitas/rencana')}/><Quick icon={BookOpen} label="Kelola mapel" go={() => navigate('/aktivitas/mapel')}/></div></Panel>
    </section>
  </div>
}

const tones: Record<string, string> = { emerald:'bg-emerald-50 text-emerald-700', blue:'bg-blue-50 text-blue-700', amber:'bg-amber-50 text-amber-700', violet:'bg-violet-50 text-violet-700', rose:'bg-rose-50 text-rose-700' }
function Stat({label,value,icon:Icon,tone}:any){return <div className="rounded-2xl bg-white border border-slate-200 p-4 md:p-5 flex items-center justify-between"><div><div className="text-xs font-semibold text-slate-500">{label}</div><div className="text-2xl font-extrabold mt-1">{value}</div></div><div className={`w-11 h-11 rounded-xl grid place-items-center ${tones[tone]}`}><Icon size={21}/></div></div>}
function Panel({title,subtitle,icon:Icon,action,onAction,children}:any){return <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden"><div className="px-5 py-4 border-b border-slate-100 flex items-center"><div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 grid place-items-center mr-3"><Icon size={18}/></div><div><h2 className="text-sm font-extrabold">{title}</h2><p className="text-xs text-slate-500 mt-0.5">{subtitle}</p></div>{action&&<button onClick={onAction} className="ml-auto text-xs font-bold text-emerald-700">{action} →</button>}</div><div className="p-5">{children}</div></div>}
function Attendance({label,value,tone}:any){return <div className={`rounded-xl p-4 ${tones[tone]}`}><div className="text-2xl font-extrabold">{value}</div><div className="text-xs font-bold mt-1">{label}</div></div>}
function Quick({icon:Icon,label,go}:any){return <button onClick={go} className="rounded-xl border border-slate-200 p-4 text-left hover:border-emerald-300 hover:bg-emerald-50/50 transition"><Icon size={19} className="text-emerald-600 mb-3"/><span className="text-sm font-bold">{label}</span></button>}
function Empty({text}:{text:string}){return <div className="min-h-28 grid place-items-center text-sm text-slate-400">{text}</div>}
