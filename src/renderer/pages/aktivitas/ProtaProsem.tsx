import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarRange, Download, Info } from 'lucide-react'
import { db } from '../../../lib/db'
import { ensureJatimCalendar, isJatimSupported } from '../../../lib/holiday-storage'
import { useAppStore } from '../../stores/appStore'
import { effectiveWeeks, jpPerWeek, monthSummary, prosem, prota, type CalEvent, type Period } from '../../../shared/prota'

type Tab = 'minggu' | 'prota' | 'prosem'

export default function ProtaProsem() {
  const kelasId = useAppStore((s) => s.kelasAktifId) || 1
  return <ProtaKelas key={kelasId} kelasId={kelasId}/>
}

function ProtaKelas({ kelasId }: { kelasId: number }) {
  const [tab, setTab] = useState<Tab>('minggu')
  const [sem, setSem] = useState(1)
  const [state, setState] = useState<{ kelasLabel: string; s1: Period; s2: Period; events: CalEvent[]; mapel: { id: number; nama: string }[]; jp: Record<number, number> } | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      // Sama seperti Kalender: kalender libur bawaan disiapkan bila belum pernah dibuat.
      const kelas0 = await db.kelas.get(kelasId)
      if (isJatimSupported(kelas0?.tahun_ajaran) && !(await db.pengaturan.get(`kalender_jatim_2026_${kelasId}`))) {
        try { await ensureJatimCalendar(db, kelasId) } catch { /* lanjut tanpa libur bawaan */ }
      }
      const [kelas, setting, events, mapelRaw, jadwal] = await Promise.all([
        db.kelas.get(kelasId),
        db.pengaturan.get(`presensi_${kelasId}`),
        window.electronAPI.kalender.list(kelasId),
        window.electronAPI.mapel.list(kelasId),
        db.jadwal.where('kelas_id').equals(kelasId).toArray(),
      ])
      let cfg: Record<string, any> = {}
      if (setting?.value) try { cfg = JSON.parse(setting.value) } catch { /* pakai bawaan */ }
      const year = Number(String(kelas?.tahun_ajaran || '').split('/')[0]) || new Date().getFullYear()
      const hariSekolah = cfg.hariSekolah === 6 ? 6 : 5
      // Sama dengan Kalender Akademik: periode tersimpan, atau bawaan Jul–Des dan Jan–Jun.
      const s1 = { mulai: cfg.s1Mulai || `${year}-07-01`, akhir: cfg.s1Akhir || `${year}-12-31`, hariSekolah }
      const s2 = { mulai: cfg.s2Mulai || `${year + 1}-01-01`, akhir: cfg.s2Akhir || `${year + 1}-06-30`, hariSekolah }
      const mapel = (mapelRaw as any[]).filter(m => m.is_aktif !== 0).map(m => ({ id: m.id as number, nama: String(m.nama) }))
      const label = kelas ? `${/^kelas\s/i.test(kelas.nama_kelas) ? kelas.nama_kelas : `Kelas ${kelas.nama_kelas}`} · ${kelas.tahun_ajaran}` : 'Kelas aktif'
      if (!cancelled) { setState({ kelasLabel: label, s1, s2, events: events as CalEvent[], mapel, jp: jpPerWeek(jadwal) }); setSem(kelas?.semester === 2 ? 2 : 1) }
    })().catch(() => { if (!cancelled) setError('Data belum bisa dimuat. Muat ulang halaman.') })
    return () => { cancelled = true }
  }, [kelasId])

  const calc = useMemo(() => {
    if (!state) return null
    const w1 = effectiveWeeks(state.s1, state.events), w2 = effectiveWeeks(state.s2, state.events)
    const m1 = monthSummary(w1), m2 = monthSummary(w2)
    return { w1, w2, m1, m2, prota: prota(state.mapel, state.jp, w1, w2), ps1: prosem(state.mapel, state.jp, m1), ps2: prosem(state.mapel, state.jp, m2) }
  }, [state])

  const exportExcel = async () => {
    if (!state || !calc) return
    const XLSX = await import('xlsx')
    const wb = XLSX.utils.book_new()
    const minggu = (label: string, rows: typeof calc.m1) => [[`Rincian Minggu Efektif ${label}`], [state.kelasLabel], [], ['Bulan', 'Jumlah Minggu', 'Minggu Efektif', 'Minggu Tidak Efektif', 'Keterangan'], ...rows.map(r => [r.label, r.minggu, r.efektif, r.tidakEfektif, r.ket]), ['Jumlah', rows.reduce((a, r) => a + r.minggu, 0), rows.reduce((a, r) => a + r.efektif, 0), rows.reduce((a, r) => a + r.tidakEfektif, 0), '']]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(minggu('Semester 1', calc.m1)), 'Minggu Efektif S1')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(minggu('Semester 2', calc.m2)), 'Minggu Efektif S2')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Program Tahunan (Prota)'], [state.kelasLabel], [], ['Mata Pelajaran', 'JP/Minggu', 'Minggu Efektif S1', 'JP Semester 1', 'Minggu Efektif S2', 'JP Semester 2', 'Total JP'], ...calc.prota.map(r => [r.nama, r.jp, r.mingguS1, r.jpS1, r.mingguS2, r.jpS2, r.total])]), 'Prota')
    const ps = (rows: typeof calc.ps1, months: typeof calc.m1) => [['Mata Pelajaran', 'JP/Minggu', ...months.map(m => m.label), 'Total JP'], ...rows.map(r => [r.nama, r.jp, ...r.perBulan, r.total])]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Program Semester 1 (Prosem)'], [state.kelasLabel], [], ...ps(calc.ps1, calc.m1)]), 'Prosem S1')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Program Semester 2 (Prosem)'], [state.kelasLabel], [], ...ps(calc.ps2, calc.m2)]), 'Prosem S2')
    XLSX.writeFile(wb, `Prota-Prosem-${state.kelasLabel.replace(/[^\w-]+/g, '-')}.xlsx`)
  }

  if (error) return <p role="alert" className="text-sm text-red-700">{error}</p>
  if (!state || !calc) return <p role="status" className="text-sm text-slate-500">Menghitung minggu efektif…</p>
  const months = sem === 1 ? calc.m1 : calc.m2
  const ps = sem === 1 ? calc.ps1 : calc.ps2
  const noJadwal = !Object.keys(state.jp).length
  const period = sem === 1 ? state.s1 : state.s2
  const fmt = (d: string) => new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${d}T12:00:00`))
  const th = 'px-3 py-2 text-left text-xs font-bold text-slate-500'
  const td = 'px-3 py-2 text-sm text-slate-700'

  return <div className="mx-auto max-w-5xl space-y-4 pb-16">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><div className="flex items-center gap-2"><CalendarRange size={21} className="text-teal-700"/><h1 className="text-xl font-extrabold text-slate-900">Prota &amp; Prosem</h1></div><p className="mt-1 text-sm text-slate-500">{state.kelasLabel} · dihitung otomatis dari Kalender Akademik dan Jadwal</p></div>
      <button type="button" onClick={() => void exportExcel()} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-teal-700 px-4 text-sm font-bold text-white hover:bg-teal-800"><Download size={16}/>Unduh Excel</button>
    </div>

    <div className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2.5 text-xs leading-5 text-sky-900"><Info size={16} className="mt-0.5 shrink-0"/><p>Minggu dihitung efektif bila minimal separuh hari sekolahnya efektif. Libur, KTS, dan kegiatan puasa diambil dari <Link to="/aktivitas/kalender" className="font-bold underline">Kalender Akademik</Link>; JP per minggu dari <Link to="/aktivitas/jadwal" className="font-bold underline">Jadwal</Link>. Ubah di sana, hasil di sini ikut berubah.</p></div>

    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex gap-1 rounded-xl bg-slate-200/70 p-1">{([['minggu', 'Minggu Efektif'], ['prota', 'Prota'], ['prosem', 'Prosem']] as const).map(([v, l]) => <button key={v} type="button" aria-pressed={tab === v} onClick={() => setTab(v)} className={`min-h-11 rounded-lg px-3 text-sm font-bold ${tab === v ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500'}`}>{l}</button>)}</div>
      {tab !== 'prota' && <div className="flex gap-1 rounded-xl bg-slate-200/70 p-1">{[1, 2].map(s => <button key={s} type="button" aria-pressed={sem === s} onClick={() => setSem(s)} className={`min-h-11 rounded-lg px-3 text-sm font-bold ${sem === s ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500'}`}>{s === 1 ? 'Ganjil' : 'Genap'}</button>)}</div>}
    </div>

    {tab !== 'minggu' && noJadwal && <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Jadwal pelajaran belum diisi, jadi JP per minggu masih 0. <Link to="/aktivitas/jadwal" className="font-bold underline">Isi Jadwal</Link> dulu.</p>}

    {tab === 'minggu' && <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <p className="border-b border-slate-100 px-4 py-3 text-sm text-slate-600">Semester {sem === 1 ? 'Ganjil' : 'Genap'}: {fmt(period.mulai)} – {fmt(period.akhir)} · {period.hariSekolah} hari sekolah</p>
      <div className="overflow-x-auto"><table className="w-full min-w-[520px]"><thead className="bg-slate-50"><tr><th scope="col" className={th}>Bulan</th><th scope="col" className={`${th} text-right`}>Minggu</th><th scope="col" className={`${th} text-right`}>Efektif</th><th scope="col" className={`${th} text-right`}>Tidak efektif</th><th scope="col" className={th}>Keterangan</th></tr></thead>
        <tbody className="divide-y divide-slate-100">{months.map(m => <tr key={m.label}><td className={`${td} font-semibold`}>{m.label}</td><td className={`${td} text-right`}>{m.minggu}</td><td className={`${td} text-right font-bold text-emerald-700`}>{m.efektif}</td><td className={`${td} text-right ${m.tidakEfektif ? 'font-bold text-red-600' : 'text-slate-400'}`}>{m.tidakEfektif}</td><td className={`${td} text-xs text-slate-500`}>{m.ket || '—'}</td></tr>)}
          <tr className="bg-slate-50 font-extrabold"><td className={td}>Jumlah</td><td className={`${td} text-right`}>{months.reduce((a, m) => a + m.minggu, 0)}</td><td className={`${td} text-right text-emerald-700`}>{months.reduce((a, m) => a + m.efektif, 0)}</td><td className={`${td} text-right`}>{months.reduce((a, m) => a + m.tidakEfektif, 0)}</td><td/></tr></tbody></table></div>
    </section>}

    {tab === 'prota' && <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="overflow-x-auto"><table className="w-full min-w-[640px]"><thead className="bg-slate-50"><tr><th scope="col" className={th}>Mata pelajaran</th><th scope="col" className={`${th} text-right`}>JP/minggu</th><th scope="col" className={`${th} text-right`}>Ganjil (minggu × JP)</th><th scope="col" className={`${th} text-right`}>Genap (minggu × JP)</th><th scope="col" className={`${th} text-right`}>Total JP</th></tr></thead>
      <tbody className="divide-y divide-slate-100">{calc.prota.map(r => <tr key={r.mapelId}><td className={`${td} font-semibold`}>{r.nama}</td><td className={`${td} text-right`}>{r.jp || <span className="text-slate-400">0</span>}</td><td className={`${td} text-right`}>{r.mingguS1} × {r.jp} = <strong>{r.jpS1}</strong></td><td className={`${td} text-right`}>{r.mingguS2} × {r.jp} = <strong>{r.jpS2}</strong></td><td className={`${td} text-right font-extrabold text-teal-800`}>{r.total}</td></tr>)}</tbody></table></div></section>}

    {tab === 'prosem' && <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="overflow-x-auto"><table className="w-full min-w-[640px]"><thead className="bg-slate-50"><tr><th scope="col" className={`${th} sticky left-0 bg-slate-50`}>Mata pelajaran</th><th scope="col" className={`${th} text-right`}>JP/mg</th>{months.map(m => <th key={m.label} scope="col" className={`${th} text-right`}>{m.label.split(' ')[0].slice(0, 3)}<span className="block font-normal">{m.efektif} mg</span></th>)}<th scope="col" className={`${th} text-right`}>Total</th></tr></thead>
      <tbody className="divide-y divide-slate-100">{ps.map(r => <tr key={r.mapelId}><td className={`${td} sticky left-0 bg-white font-semibold`}>{r.nama}</td><td className={`${td} text-right`}>{r.jp}</td>{r.perBulan.map((v, i) => <td key={i} className={`${td} text-right`}>{v || <span className="text-slate-300">0</span>}</td>)}<td className={`${td} text-right font-extrabold text-teal-800`}>{r.total}</td></tr>)}</tbody></table></div></section>}
  </div>
}
