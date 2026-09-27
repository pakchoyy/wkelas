import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, CalendarCheck, Heart, Printer, ScrollText, UserRound } from 'lucide-react'
import { db, type Perilaku, type Presensi, type Siswa } from '../../../../lib/db'
import { classWeightKey } from '../../../../lib/grade-periods'
import { calculateGrade, readGradeWeights } from '../../../../shared/grades'
import { PASSING_GRADE, profileAlerts, summarizeAttendance } from '../../../../shared/student-profile'
import { useAppStore } from '../../../stores/appStore'

type Grade = { mapel: string; harian: number | null; uts: number | null; uas: number | null; akhir: number | null; lengkap: boolean }
type Profile = {
  siswa: Siswa
  kelas: string; periode: string; sekolah: string; wali: string
  fields: { label: string; value: string }[]
  presensi: Presensi[]
  grades: Grade[]
  perilaku: Perilaku[]
}

const STATUS_LABEL: Record<string, string> = { H: 'Hadir', S: 'Sakit', I: 'Izin', A: 'Alpa', T: 'Terlambat' }
const fmtDate = (value: string) => { const d = new Date(`${value}T00:00:00`); return Number.isNaN(d.getTime()) ? value : new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(d) }
const num = (value: number | null, digits = 1) => value === null ? '—' : Number.isInteger(value) ? String(value) : value.toFixed(digits)

async function loadProfile(id: number, kelasId: number): Promise<Profile | null> {
  const siswa = await db.siswa.get(id)
  if (!siswa || siswa.kelas_id !== kelasId || siswa.deleted_at) return null
  const kelas = await db.kelas.get(kelasId)
  const guru = kelas?.guru_id ? await db.guru.get(kelas.guru_id) : undefined
  const defs = (await db.siswa_field_definitions.where({ kelas_id: kelasId }).toArray()).sort((a, b) => a.urutan - b.urutan)
  const vals = await db.siswa_field_values.filter(v => v.siswa_id === id).toArray()
  const fields = defs.map(def => ({ label: def.nama_field, value: vals.find(v => v.field_id === def.id)?.nilai || '' })).filter(f => f.value)
  const presensi = (await db.presensi.where({ kelas_id: kelasId }).filter(p => p.siswa_id === id).toArray()).sort((a, b) => b.tanggal.localeCompare(a.tanggal))
  const weights = readGradeWeights((await db.pengaturan.get(await classWeightKey(db, kelasId)))?.value)
  const subjects = (await window.electronAPI.mapel.list(kelasId)).filter((m: any) => m.is_aktif !== 0)
  const grades: Grade[] = []
  for (const subject of subjects) {
    const columns = await window.electronAPI.kolom.list(subject.id)
    const values = await window.electronAPI.nilai.getAll(subject.id, [id])
    grades.push({ mapel: subject.nama, ...calculateGrade(columns, values, id, weights) })
  }
  const perilaku = (await db.perilaku.where({ siswa_id: id }).toArray()).sort((a, b) => b.tanggal.localeCompare(a.tanggal))
  return { siswa, kelas: kelas?.nama_kelas || '', periode: kelas ? `${kelas.tahun_ajaran} · Semester ${kelas.semester}` : '', sekolah: guru?.nama_sekolah || '', wali: guru?.nama || '', fields, presensi, grades, perilaku }
}

export default function ProfilSiswa() {
  const kelasId = useAppStore(s => s.kelasAktifId) || 1
  const id = Number(useParams().id)
  const [data, setData] = useState<Profile | null | undefined>(undefined)
  const [error, setError] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  useEffect(() => {
    let cancelled = false
    setData(undefined); setError('')
    loadProfile(id, kelasId).then(result => { if (!cancelled) setData(result) }, () => { if (!cancelled) setError('Profil siswa gagal dimuat. Muat ulang halaman.') })
    return () => { cancelled = true }
  }, [id, kelasId])

  const back = <Link to="/siswa/data-siswa" className="no-print inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-bold text-slate-600 hover:bg-slate-100"><ArrowLeft size={17}/>Data Siswa</Link>
  if (error) return <div className="space-y-3">{back}<p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p></div>
  if (data === undefined) return <p role="status" className="p-4 text-sm text-slate-500">Memuat profil…</p>
  if (!data) return <div className="space-y-3">{back}<p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Siswa tidak ditemukan di kelas aktif.</p></div>

  const { siswa } = data
  const hadir = summarizeAttendance(data.presensi, start, end)
  const absences = data.presensi.filter(p => p.status !== 'H' && (!start || p.tanggal >= start) && (!end || p.tanggal <= end))
  const perilaku = data.perilaku.filter(p => (!start || p.tanggal >= start) && (!end || p.tanggal <= end))
  const concerns = perilaku.filter(p => p.jenis !== 'positif').length
  const finals = data.grades.filter(g => g.akhir !== null)
  const average = finals.length ? finals.reduce((sum, g) => sum + g.akhir!, 0) / finals.length : null
  const alerts = profileAlerts(hadir, data.grades, concerns)

  return <div className="print-portrait mx-auto max-w-5xl space-y-4">
    <div className="no-print flex flex-wrap items-center justify-between gap-2">{back}<button onClick={() => window.print()} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-teal-700 px-4 text-sm font-bold text-white hover:bg-teal-800"><Printer size={17}/>Cetak</button></div>

    <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-teal-50 text-teal-700"><UserRound size={24}/></span>
        <div className="min-w-0 flex-1">
          <h1 className="break-words text-xl font-extrabold text-slate-900">{siswa.nama}</h1>
          <p className="mt-0.5 text-sm text-slate-600">NIS {siswa.nis || '—'} · {siswa.jenis_kelamin === 'L' ? 'Laki-laki' : siswa.jenis_kelamin === 'P' ? 'Perempuan' : 'Jenis kelamin —'} · No. absen {siswa.no_absen ?? '—'}</p>
          <p className="text-sm text-slate-500">{[data.kelas, data.periode, data.sekolah].filter(Boolean).join(' · ')}</p>
        </div>
      </div>
      {data.fields.length > 0 && <dl className="mt-4 grid gap-x-6 gap-y-2 border-t border-slate-100 pt-3 text-sm sm:grid-cols-2">{data.fields.map(f => <div key={f.label} className="flex gap-2"><dt className="shrink-0 text-slate-500">{f.label}:</dt><dd className="min-w-0 break-words font-semibold text-slate-800">{f.value}</dd></div>)}</dl>}
    </section>

    <div className="no-print flex flex-wrap items-end gap-3 text-sm">
      <label className="font-semibold text-slate-700">Dari tanggal<input type="date" value={start} onChange={e => setStart(e.target.value)} className="field mt-1"/></label>
      <label className="font-semibold text-slate-700">Sampai<input type="date" value={end} onChange={e => setEnd(e.target.value)} className="field mt-1"/></label>
      {(start || end) && <button onClick={() => { setStart(''); setEnd('') }} className="min-h-11 rounded-xl px-3 font-bold text-teal-700 hover:bg-teal-50">Semua tanggal</button>}
      <p className="w-full text-xs text-slate-500">Rentang tanggal berlaku untuk presensi dan perilaku. Nilai mengikuti periode aktif ({data.periode}).</p>
    </div>
    {(start || end) && <p className="hidden text-sm print:block">Rentang: {start ? fmtDate(start) : 'awal'} s/d {end ? fmtDate(end) : 'sekarang'}</p>}

    {alerts.length > 0 && <section className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><AlertTriangle size={20} className="shrink-0 text-amber-700"/><div><h2 className="font-bold">Perlu perhatian</h2><ul className="mt-1 list-disc pl-5">{alerts.map(a => <li key={a}>{a}</li>)}</ul></div></section>}

    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat label="Kehadiran" value={hadir.percent === null ? '—' : `${hadir.percent}%`} detail={`${hadir.total} hari tercatat`}/>
      <Stat label="Tidak hadir" value={String(hadir.S + hadir.I + hadir.A)} detail={`S ${hadir.S} · I ${hadir.I} · A ${hadir.A}`}/>
      <Stat label="Rata-rata nilai akhir" value={num(average)} detail={`${finals.length} dari ${data.grades.length} mapel`}/>
      <Stat label="Catatan perilaku" value={String(perilaku.length)} detail={`${perilaku.length - concerns} positif · ${concerns} perhatian`}/>
    </div>

    <section className="rounded-2xl border border-slate-200 bg-white">
      <h2 className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 font-bold text-slate-900"><ScrollText size={18} className="text-teal-700"/>Nilai {data.periode}</h2>
      {data.grades.length === 0 ? <p className="p-4 text-sm text-slate-500">Belum ada mata pelajaran aktif.</p> :
      <div className="overflow-x-auto"><table className="report w-full text-sm"><thead><tr className="bg-slate-50 text-left text-xs uppercase text-slate-500"><th className="px-4 py-2.5">Mata pelajaran</th><th className="px-3 py-2.5 text-right">Harian</th><th className="px-3 py-2.5 text-right">UTS</th><th className="px-3 py-2.5 text-right">UAS</th><th className="px-4 py-2.5 text-right">Akhir</th></tr></thead>
        <tbody>{data.grades.map(g => <tr key={g.mapel} className="border-t border-slate-100"><td className="px-4 py-2.5 font-semibold text-slate-800">{g.mapel}</td><td className="px-3 py-2.5 text-right tabular-nums">{num(g.harian)}</td><td className="px-3 py-2.5 text-right tabular-nums">{num(g.uts)}</td><td className="px-3 py-2.5 text-right tabular-nums">{num(g.uas)}</td><td className={`px-4 py-2.5 text-right font-bold tabular-nums ${g.akhir !== null && g.akhir < PASSING_GRADE ? 'text-red-700' : 'text-slate-900'}`}>{g.akhir === null ? '—' : `${num(g.akhir)}${g.lengkap ? '' : ' *'}`}</td></tr>)}</tbody></table>
        <p className="px-4 py-2 text-xs text-slate-500">* Sementara: komponen nilai belum lengkap. Merah: di bawah {PASSING_GRADE}.</p></div>}
    </section>

    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-2xl border border-slate-200 bg-white">
        <h2 className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 font-bold text-slate-900"><CalendarCheck size={18} className="text-teal-700"/>Riwayat tidak hadir</h2>
        {absences.length === 0 ? <p className="p-4 text-sm text-slate-500">{hadir.total ? 'Selalu hadir pada rentang ini.' : 'Belum ada catatan presensi.'}</p> :
        <ul className="divide-y divide-slate-100 text-sm">{absences.slice(0, 30).map(p => <li key={p.id} className="flex items-start justify-between gap-3 px-4 py-2.5"><span><span className="font-semibold text-slate-800">{fmtDate(p.tanggal)}</span>{p.keterangan && <span className="block text-slate-500">{p.keterangan}</span>}</span><span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${p.status === 'A' ? 'bg-red-100 text-red-800' : p.status === 'T' ? 'bg-amber-100 text-amber-900' : 'bg-sky-100 text-sky-900'}`}>{STATUS_LABEL[p.status] || p.status}</span></li>)}</ul>}
        {absences.length > 30 && <p className="px-4 pb-3 text-xs text-slate-500">Menampilkan 30 dari {absences.length} catatan terbaru.</p>}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white">
        <h2 className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 font-bold text-slate-900"><Heart size={18} className="text-teal-700"/>Catatan perilaku</h2>
        {perilaku.length === 0 ? <p className="p-4 text-sm text-slate-500">Belum ada catatan perilaku.</p> :
        <ul className="divide-y divide-slate-100 text-sm">{perilaku.map(p => <li key={p.id} className="px-4 py-2.5"><div className="flex items-center justify-between gap-3"><span className="font-semibold text-slate-800">{fmtDate(p.tanggal)}{p.kategori ? ` · ${p.kategori}` : ''}</span><span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${p.jenis === 'positif' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}>{p.jenis === 'positif' ? 'Positif' : 'Perhatian'}</span></div><p className="mt-1 whitespace-pre-wrap break-words text-slate-600">{p.deskripsi}</p>{p.tindak_lanjut && <p className="mt-1 text-slate-500">Tindak lanjut: {p.tindak_lanjut}</p>}</li>)}</ul>}
      </section>
    </div>

    {data.wali && <div className="hidden pt-10 text-sm print:flex print:justify-end"><div className="text-center"><p>Wali Kelas,</p><p className="mt-16 font-bold underline">{data.wali}</p></div></div>}
  </div>
}

function Stat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-1 text-2xl font-extrabold tabular-nums text-slate-900">{value}</p><p className="mt-0.5 text-xs text-slate-500">{detail}</p></div>
}
