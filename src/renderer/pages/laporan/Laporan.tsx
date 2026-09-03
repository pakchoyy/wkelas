import { classWeightKey } from '../../../lib/grade-periods'
import { calculateGrade, readGradeWeights } from '../../../shared/grades'
import { useState, useEffect, useMemo, useRef } from 'react'
import { FileDown, Printer } from 'lucide-react'
import { useSiswaList } from '../../hooks/useSiswa'
import { useAppStore } from '../../stores/appStore'
import { attendancePercent } from '../../../shared/attendance'
import { db } from '../../../lib/db'
import { compareJournalRows } from '../../../shared/journal-report'
import { matchesReportPeriod, reportTable } from '../../../shared/report-data'

type TabLaporan = 'presensi' | 'nilai' | 'perilaku' | 'jurnal' | 'kalender'

const calendarTypeLabel = (value: string) => ({ libur_nasional: 'Libur Nasional', libur_sekolah: 'Libur Sekolah', kegiatan: 'Kegiatan Sekolah', ujian: 'Ujian', pembagian_rapor: 'Pembagian Rapor' }[value] || value.replaceAll('_', ' '))
const calendarDuration = (start: string, end?: string) => Math.max(1, Math.round((new Date(`${end || start}T12:00:00`).getTime() - new Date(`${start}T12:00:00`).getTime()) / 86400000) + 1)

export default function Laporan() {
  const kelasId = useAppStore((s) => s.kelasAktifId) || 1
  const { data: siswa } = useSiswaList(kelasId)
  const [tab, setTab] = useState<TabLaporan>('presensi')
  const [periodeMulai, setPeriodeMulai] = useState('')
  const [periodeSelesai, setPeriodeSelesai] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [exporting, setExporting] = useState(false)
  const [exportMessage, setExportMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const exportLock = useRef(false)
  const invalidPeriod = tab !== 'nilai' && !!periodeMulai && !!periodeSelesai && periodeMulai > periodeSelesai
  const [data, setData] = useState<any[]>([])
  const [identity,setIdentity]=useState({sekolah:'-',kelas:'-',semester:'-',tahun:'-',guru:'-'})
  const filtered = data.filter(item => matchesReportPeriod(item, tab, periodeMulai, periodeSelesai))
  const reportRows = useMemo(() => {
    if (tab === 'presensi') {
      const rows = new Map<number, any>()
      for (const student of siswa) rows.set(student.id, { siswa_nama: student.nama, hadir: 0, sakit: 0, izin: 0, alpa: 0, terlambat: 0, total_hari: 0, persentase_kehadiran: '—' })
      for (const record of filtered) {
        const row = rows.get(record.siswa_id)
        if (!row) continue
        const key = record.status === 'H' ? 'hadir' : record.status === 'S' ? 'sakit' : record.status === 'I' ? 'izin' : record.status === 'T' ? 'terlambat' : 'alpa'
        row[key] += 1
        row.total_hari += 1
      }
      return Array.from(rows.values()).map((row) => ({ ...row, persentase_kehadiran: row.total_hari ? `${attendancePercent(row.hadir, row.terlambat, row.total_hari)}%` : '—' }))
    }
    if (tab === 'perilaku') {
      const rows = new Map<number, any>()
      for (const student of siswa) rows.set(student.id, { siswa_nama: student.nama, positif: 0, perhatian: 0, catatan_terakhir: '—', tindak_lanjut: '—', tanggal_terakhir: '' })
      for (const record of [...filtered].sort((a, b) => a.tanggal.localeCompare(b.tanggal))) {
        const row = rows.get(record.siswa_id)
        if (!row) continue
        if (record.jenis === 'positif') row.positif += 1
        else row.perhatian += 1
        row.catatan_terakhir = record.kategori || record.deskripsi || '—'
        row.tindak_lanjut = record.tindak_lanjut || '—'
        row.tanggal_terakhir = record.tanggal
      }
      return Array.from(rows.values())
    }
    if (tab === 'jurnal') return [...filtered].sort(compareJournalRows)
    if (tab === 'kalender') return [...filtered].sort((a, b) => a.tanggal_mulai.localeCompare(b.tanggal_mulai)).map((item) => ({ ...item, jenis_label: calendarTypeLabel(item.jenis), jumlah_hari: calendarDuration(item.tanggal_mulai, item.tanggal_selesai) }))
    return filtered
  }, [filtered, siswa, tab])

  const exportExcel = async () => {
    if (exportLock.current || loading || loadError || invalidPeriod || !reportRows.length) return
    exportLock.current = true; setExporting(true); setExportMessage(null)
    try {
    const XLSX = await import('xlsx')
    const report=[['LAPORAN '+tab.toUpperCase()],['Sekolah',identity.sekolah],['Kelas',identity.kelas],['Semester',identity.semester],['Tahun Pelajaran',identity.tahun],['Wali Kelas',identity.guru],['Periode',tab==='nilai' ? `${identity.tahun} Semester ${identity.semester}` : `${periodeMulai||'Semua'} s/d ${periodeSelesai||'Semua'}`],[],...reportTable(tab, reportRows)]
    if (tab === 'nilai') report.push([], ['* Nilai sementara: komponen belum lengkap. Nilai kosong tidak dianggap 0; bobot dihitung dari komponen yang tersedia.'])
    const sheet = XLSX.utils.aoa_to_sheet(report)
    sheet['!cols'] = reportTable(tab, []).at(0)!.map(label => ({ wch: Math.max(18, String(label).length + 4) }))
    const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, sheet, tab); XLSX.writeFile(workbook, `laporan-${tab}.xlsx`)
    setExportMessage({ok:true,text:'File Excel siap diunduh. Periksa folder Unduhan atau notifikasi unduhan browser.'})
    } catch { setExportMessage({ok:false,text:'Excel belum berhasil dibuat. Coba lagi; data laporan tidak berubah.'}) }
    finally { exportLock.current = false; setExporting(false) }
  }

  const tabs: { id: TabLaporan; label: string }[] = [
    { id: 'presensi', label: 'Presensi' },
    { id: 'nilai', label: 'Nilai' },
    { id: 'perilaku', label: 'Catatan Perilaku' },
    { id: 'jurnal', label: 'Jurnal' },
    { id: 'kalender', label: 'Kalender' },
  ]

  useEffect(()=>{db.kelas.get(kelasId).then(async(kelas)=>{if(!kelas)return;const guru=await db.guru.get(kelas.guru_id);setIdentity({sekolah:guru?.nama_sekolah||'-',kelas:kelas.nama_kelas,semester:String(kelas.semester),tahun:kelas.tahun_ajaran,guru:guru?.nama||'-'})})},[kelasId])

  useEffect(() => {
    let cancelled = false
    setLoading(true); setLoadError(''); setData([])
    const update = (rows: any[]) => { if (!cancelled) setData(rows) }
    ;(async () => {
      if (tab === 'presensi') {
        const res = await window.electronAPI.presensi.listByKelas(kelasId)
        update(res)
      } else if (tab === 'perilaku') {
        const mapNama = new Map(siswa.map((s) => [s.id, s.nama]))
        const res = await window.electronAPI.perilaku.list()
        update(res.map((r) => ({ ...r, siswa_nama: mapNama.get(r.siswa_id) || 'Unknown' })))
      } else if (tab === 'jurnal') {
        const res = await window.electronAPI.jurnal.list(kelasId)
        update(res)
      } else if(tab==='kalender') {
        update(await window.electronAPI.kalender.list(kelasId))
      } else if(tab==='nilai') {
        const subjects=(await window.electronAPI.mapel.list(kelasId)).filter((item:any)=>item.is_aktif!==0)
        const setting=await db.pengaturan.get(await classWeightKey(db,kelasId)); const weights=readGradeWeights(setting?.value)
        const result:any[]=[]
        for (const subject of subjects) {
          const columns = await window.electronAPI.kolom.list(subject.id)
          const values = await window.electronAPI.nilai.getAll(subject.id,siswa.map(item => item.id))
          for (const student of siswa) {
            const grade = calculateGrade(columns,values,student.id,weights)
            result.push({siswa_nama:student.nama,mata_pelajaran:subject.nama,rata_harian:grade.harian?.toFixed(1) ?? '—',uts:grade.uts ?? '—',uas:grade.uas ?? '—',nilai_akhir:grade.akhir === null ? '—' : `${grade.akhir.toFixed(1)}${grade.lengkap ? '' : ' *'}`})
          }
        }
        update(result)
      }
    })().catch(() => { if (!cancelled) setLoadError('Laporan gagal dimuat. Muat ulang halaman untuk mencoba lagi.') }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [tab, kelasId, siswa])

  return (
    <div><style>{`@media print{aside,header,button,.no-print{display:none!important}main{overflow:visible!important;padding:0!important}.report{box-shadow:none!important;border:1px solid #999!important}.report .overflow-x-auto{overflow:visible!important}.report table{min-width:0!important;font-size:9px!important}.report th,.report td{padding:5px!important}body{background:white!important}}`}</style>
      <div className="mb-4 no-print"><h2 className="text-xl font-bold">Pusat Laporan</h2><p className="mt-1 text-sm text-slate-500">Pilih jenis laporan, tentukan periode, lalu ekspor atau cetak.</p></div>
      <div className="report mb-4 rounded-xl border border-slate-200 bg-white p-4 text-center"><h1 className="font-extrabold uppercase">Laporan {tabs.find(item=>item.id===tab)?.label}</h1><p className="mt-1 text-sm font-semibold">{identity.sekolah}</p><p className="mt-1 text-xs text-slate-500">{identity.kelas} · Semester {identity.semester} · {identity.tahun} · Wali Kelas: {identity.guru}</p></div>
      <p className="mb-4 text-center text-sm text-slate-600">Periode: {tab === 'nilai' ? identity.tahun + ' · Semester ' + identity.semester : (periodeMulai || 'Semua tanggal') + ' s/d ' + (periodeSelesai || 'Semua tanggal')}</p>
      {tab === 'nilai' && <p className="mb-3 text-xs text-slate-600">* Nilai sementara: komponen penilaian belum lengkap.</p>}
      {exportMessage && <p role={exportMessage.ok ? 'status' : 'alert'} className="no-print mb-3 rounded-xl border border-slate-200 bg-white p-3 text-sm">{exportMessage.text}</p>}

      <div className="flex gap-1 overflow-x-auto mb-4 rounded-xl p-1 no-print" style={{ background: '#f1f5f9' }}>
        {tabs.map((t) => (
          <button aria-pressed={tab === t.id} key={t.id} onClick={() => setTab(t.id)} className={`min-h-11 shrink-0 flex-1 px-3 py-2 text-sm font-semibold rounded-lg transition-all ${tab === t.id ? 'bg-white shadow-sm' : 'text-gray-500'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3 mb-4 no-print">
        {tab !== 'nilai' && <div className="grid w-full sm:w-auto grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="min-w-0 text-sm text-slate-600">Tanggal mulai<input type="date" value={periodeMulai} onChange={e => setPeriodeMulai(e.target.value)} className="field mt-1 min-w-0"/></label>
          <label className="min-w-0 text-sm text-slate-600">Tanggal selesai<input type="date" min={periodeMulai || undefined} value={periodeSelesai} onChange={e => setPeriodeSelesai(e.target.value)} className="field mt-1 min-w-0"/></label>
        </div>}
        {tab === 'nilai' && <p className="text-sm text-slate-500">Nilai periode aktif: {identity.tahun}, semester {identity.semester}. Pilih periode lain di Pengaturan. * Nilai sementara.</p>}
        <div className="flex flex-wrap gap-2 sm:ml-auto">
          <button onClick={exportExcel} disabled={exporting || loading || !!loadError || invalidPeriod || !reportRows.length} className="min-h-11 disabled:opacity-40 flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold border disabled:opacity-40" style={{ borderColor: 'var(--border)' }}><FileDown size={16} /> {exporting ? 'Menyiapkan…' : 'Excel'}</button>
          <button disabled={exporting || loading || !!loadError || invalidPeriod} onClick={()=>window.print()} className="min-h-11 disabled:opacity-40 flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold border" style={{ borderColor: 'var(--border)' }}><Printer size={16} /> Cetak / PDF</button>
        </div>
      </div>

      {loading && <p role="status" className="p-4">Memuat laporan...</p>}
      {loadError && <p role="alert" className="p-4 text-red-700">{loadError}</p>}
      {invalidPeriod && <p role="alert" className="p-4 text-red-700">Tanggal selesai harus sama atau setelah tanggal mulai.</p>}
      {!loading && !loadError && !invalidPeriod && <div className="report rounded-xl overflow-hidden" style={{ background: 'var(--card-bg)', boxShadow: 'var(--shadow)' }}><div className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-500">{tab === 'presensi' ? `${reportRows.length} siswa dalam rekap` : `${reportRows.length} data ditemukan`}</div>
        <div className="lg:hidden print:hidden divide-y divide-slate-100">{reportRows.map((row: any,index: number) => {
          const title = tab === 'jurnal' ? row.mata_pelajaran || 'Umum' : tab === 'kalender' ? row.judul : row.siswa_nama
          const details: [string, any][] = tab === 'presensi' ? [['Hadir',row.hadir],['Sakit',row.sakit],['Izin',row.izin],['Alpa',row.alpa],['Terlambat',row.terlambat],['Hari tercatat',row.total_hari],['Kehadiran',row.persentase_kehadiran]]
            : tab === 'nilai' ? [['Mata pelajaran',row.mata_pelajaran],['Harian',row.rata_harian],['UTS',row.uts],['UAS',row.uas],['Nilai akhir',row.nilai_akhir]]
            : tab === 'perilaku' ? [['Positif',row.positif],['Perlu perhatian',row.perhatian],['Catatan terakhir',row.catatan_terakhir],['Tanggal catatan',row.tanggal_terakhir],['Tindak lanjut',row.tindak_lanjut]]
            : tab === 'jurnal' ? [['Tanggal',row.tanggal],['Jam',row.jam_ke],['Materi',row.materi],['Kegiatan pembelajaran',row.kegiatan],['Kendala',row.kendala],['Refleksi',row.refleksi]]
            : [['Mulai',row.tanggal_mulai],['Selesai',row.tanggal_selesai || row.tanggal_mulai],['Jumlah hari kalender',row.jumlah_hari],['Jenis',row.jenis_label],['Keterangan',row.deskripsi]]
          return <article key={index} className="p-4"><h2 className="font-bold text-slate-800 break-words">{title}</h2><dl className={`mt-3 grid gap-3 text-sm ${tab === 'presensi' ? 'grid-cols-2' : 'grid-cols-1'}`}>{details.map(([label,value]) => <div key={label} className="min-w-0"><dt className="text-slate-500">{label}</dt><dd className="font-medium whitespace-pre-wrap break-words">{value === null || value === undefined || value === '' ? '—' : value}</dd></div>)}</dl></article>
        })}{!reportRows.length && <p className="p-8 text-center text-sm text-slate-500">Belum ada data pada periode ini.</p>}</div>
        <div className="hidden lg:block print:block overflow-x-auto"><table className={`w-full text-sm ${tab === 'jurnal' ? 'min-w-[980px]' : ''}`}>
          <thead>
            <tr className="text-xs uppercase tracking-wider" style={{ background: '#f8fafc' }}>
              {tab!=='nilai'&&tab!=='presensi'&&tab!=='perilaku'&&<th className="px-4 py-3 text-left">Tanggal</th>}
              {tab === 'presensi' && <><th className="px-4 py-3 text-left">Siswa</th><th className="px-3 py-3 text-center">Hadir</th><th className="px-3 py-3 text-center">Sakit</th><th className="px-3 py-3 text-center">Izin</th><th className="px-3 py-3 text-center">Alpa</th><th className="px-3 py-3 text-center">Terlambat</th><th className="px-3 py-3 text-center">Total</th><th className="px-3 py-3 text-center">Kehadiran</th></>}
              {tab === 'perilaku' && <><th className="px-4 py-3 text-left">Siswa</th><th className="px-3 py-3 text-center">Positif</th><th className="px-3 py-3 text-center">Perlu Perhatian</th><th className="px-4 py-3 text-left">Catatan Terakhir</th><th className="px-4 py-3 text-left">Tindak Lanjut</th></>}
              {tab === 'jurnal' && <><th className="px-3 py-3 text-center">Jam</th><th className="px-3 py-3 text-left">Mapel</th><th className="px-3 py-3 text-left">Materi</th><th className="px-3 py-3 text-left">Kegiatan Pembelajaran</th><th className="px-3 py-3 text-left">Kendala</th><th className="px-3 py-3 text-left">Refleksi</th></>}
              {tab === 'nilai' && <><th className="px-4 py-3 text-left">Mata Pelajaran</th><th className="px-4 py-3 text-left">Siswa</th><th className="px-4 py-3 text-center">Harian</th><th className="px-4 py-3 text-center">UTS</th><th className="px-4 py-3 text-center">UAS</th><th className="px-4 py-3 text-center">Nilai Akhir</th></>}
              {tab === 'kalender' && <><th className="px-4 py-3 text-left">Selesai</th><th className="px-3 py-3 text-center">Hari</th><th className="px-4 py-3 text-left">Kegiatan</th><th className="px-4 py-3 text-left">Jenis</th><th className="px-4 py-3 text-left">Keterangan</th></>}
            </tr>
          </thead>
          <tbody>
            {tab === 'presensi' && reportRows.map((r: any) => (
              <tr key={r.siswa_nama} className="border-t border-slate-100 even:bg-slate-50/60">
                <td className="px-4 py-2.5 font-semibold text-slate-700">{r.siswa_nama}</td>
                <td className="px-3 py-2.5 text-center font-bold text-emerald-700">{r.hadir}</td><td className="px-3 py-2.5 text-center text-blue-700">{r.sakit}</td><td className="px-3 py-2.5 text-center text-amber-700">{r.izin}</td><td className="px-3 py-2.5 text-center text-red-700">{r.alpa}</td><td className="px-3 py-2.5 text-center text-orange-700">{r.terlambat}</td><td className="px-3 py-2.5 text-center">{r.total_hari}</td><td className="px-3 py-2.5 text-center"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-extrabold text-emerald-700">{r.persentase_kehadiran}</span></td>
              </tr>
            ))}
            {tab === 'perilaku' && reportRows.map((r: any) => (
              <tr key={r.siswa_nama} className="border-t border-slate-100 even:bg-slate-50/60">
                <td className="px-4 py-2.5 font-semibold text-slate-700">{r.siswa_nama}</td>
                <td className="px-3 py-2.5 text-center"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">{r.positif}</span></td>
                <td className="px-3 py-2.5 text-center"><span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">{r.perhatian}</span></td>
                <td className="px-4 py-2.5"><div className="text-sm font-semibold">{r.catatan_terakhir}</div>{r.tanggal_terakhir && <div className="mt-0.5 text-xs text-slate-400">{r.tanggal_terakhir}</div>}</td>
                <td className="px-4 py-2.5 text-xs text-slate-600">{r.tindak_lanjut}</td>
              </tr>
            ))}
            {tab === 'jurnal' && reportRows.map((r: any, index: number) => (
              <tr key={r.id} className={`border-t border-slate-100 align-top ${index % 2 ? 'bg-slate-50/60' : ''}`}>
                <td className="whitespace-nowrap px-4 py-2.5 font-semibold text-slate-700">{r.tanggal}</td>
                <td className="px-3 py-2.5 text-center">{r.jam_ke || '—'}</td>
                <td className="px-3 py-2.5 font-semibold">{r.mata_pelajaran || 'Umum'}</td>
                <td className="px-3 py-2.5 text-xs text-slate-700">{r.materi || '—'}</td>
                <td className="px-3 py-2.5 text-xs text-slate-600">{r.kegiatan || '—'}</td>
                <td className="px-3 py-2.5 text-xs text-slate-600">{r.kendala || '—'}</td>
                <td className="px-3 py-2.5 text-xs text-slate-600">{r.refleksi || '—'}</td>
              </tr>
            ))}
            {tab === 'nilai' && filtered.map((r:any,index:number)=><tr key={`${r.mata_pelajaran}-${r.siswa_nama}-${index}`} className="border-t border-slate-100"><td className="px-4 py-2 font-semibold">{r.mata_pelajaran}</td><td className="px-4 py-2">{r.siswa_nama}</td><td className="px-4 py-2 text-center">{r.rata_harian}</td><td className="px-4 py-2 text-center">{r.uts}</td><td className="px-4 py-2 text-center">{r.uas}</td><td className="px-4 py-2 text-center font-extrabold text-emerald-700">{r.nilai_akhir}</td></tr>)}
            {tab==='kalender'&&reportRows.map((r:any,index:number)=><tr key={r.id} className={`border-t border-slate-100 ${index%2?'bg-slate-50/60':''}`}><td className="whitespace-nowrap px-4 py-2.5">{r.tanggal_mulai}</td><td className="whitespace-nowrap px-4 py-2.5">{r.tanggal_selesai||r.tanggal_mulai}</td><td className="px-3 py-2.5 text-center font-bold">{r.jumlah_hari}</td><td className="px-4 py-2.5 font-semibold text-slate-700">{r.judul}</td><td className="px-4 py-2.5"><span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">{r.jenis_label}</span></td><td className="px-4 py-2.5 text-xs text-slate-600">{r.deskripsi||'—'}</td></tr>)}
            {reportRows.length === 0 && (
              <tr><td className="px-4 py-8 text-center text-sm text-gray-400" colSpan={8}>Belum ada data</td></tr>
            )}
          </tbody>
        </table></div>
      </div>}
    </div>
  )
}
