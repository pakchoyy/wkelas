import { useState, useEffect, useMemo } from 'react'
import { FileDown, Printer } from 'lucide-react'
import { useSiswaList } from '../../hooks/useSiswa'
import { useAppStore } from '../../stores/appStore'
import { db } from '../../../lib/db'

type TabLaporan = 'presensi' | 'nilai' | 'perilaku' | 'jurnal' | 'kalender'

export default function Laporan() {
  const kelasId = useAppStore((s) => s.kelasAktifId) || 1
  const { data: siswa } = useSiswaList(kelasId)
  const [tab, setTab] = useState<TabLaporan>('presensi')
  const [periodeMulai, setPeriodeMulai] = useState('')
  const [periodeSelesai, setPeriodeSelesai] = useState('')
  const [data, setData] = useState<any[]>([])
  const [identity,setIdentity]=useState({sekolah:'-',kelas:'-',semester:'-',tahun:'-',guru:'-'})
  const filtered = tab==='nilai' ? data : data.filter((item) => {const date=item.tanggal||item.tanggal_mulai;return (!periodeMulai || date >= periodeMulai) && (!periodeSelesai || date <= periodeSelesai)})
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
      return Array.from(rows.values()).map((row) => ({ ...row, persentase_kehadiran: row.total_hari ? `${Math.round(((row.hadir + row.terlambat) / row.total_hari) * 100)}%` : '—' }))
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
    if (tab === 'jurnal') return [...filtered].sort((a, b) => `${a.tanggal}-${a.jam_ke || ''}`.localeCompare(`${b.tanggal}-${b.jam_ke || ''}`))
    return filtered
  }, [filtered, siswa, tab])

  const exportExcel = async () => {
    const XLSX = await import('xlsx')
    const report=[['LAPORAN '+tab.toUpperCase()],['Sekolah',identity.sekolah],['Kelas',identity.kelas],['Semester',identity.semester],['Tahun Pelajaran',identity.tahun],['Wali Kelas',identity.guru],['Periode',periodeMulai||'Semua','s/d',periodeSelesai||'Semua'],[],...XLSX.utils.sheet_to_json<any[]>(XLSX.utils.json_to_sheet(reportRows),{header:1})]
    const sheet = XLSX.utils.aoa_to_sheet(report)
    const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, sheet, tab); XLSX.writeFile(workbook, `laporan-${tab}.xlsx`)
  }

  const tabs: { id: TabLaporan; label: string }[] = [
    { id: 'presensi', label: 'Presensi' },
    { id: 'nilai', label: 'Nilai' },
    { id: 'perilaku', label: 'Perilaku' },
    { id: 'jurnal', label: 'Jurnal' },
    { id: 'kalender', label: 'Kalender' },
  ]

  useEffect(()=>{db.kelas.get(kelasId).then(async(kelas)=>{if(!kelas)return;const guru=await db.guru.get(kelas.guru_id);setIdentity({sekolah:guru?.nama_sekolah||'-',kelas:kelas.nama_kelas,semester:String(kelas.semester),tahun:kelas.tahun_ajaran,guru:guru?.nama||'-'})})},[kelasId])

  useEffect(() => {
    (async () => {
      if (tab === 'presensi') {
        const res = await window.electronAPI.presensi.listByKelas(kelasId)
        setData(res)
      } else if (tab === 'perilaku') {
        const mapNama = new Map(siswa.map((s) => [s.id, s.nama]))
        const res = await window.electronAPI.perilaku.list()
        setData(res.map((r) => ({ ...r, siswa_nama: mapNama.get(r.siswa_id) || 'Unknown' })))
      } else if (tab === 'jurnal') {
        const res = await window.electronAPI.jurnal.list(kelasId)
        setData(res)
      } else if(tab==='kalender') {
        setData(await window.electronAPI.kalender.list(kelasId))
      } else if(tab==='nilai') {
        const subjects=(await window.electronAPI.mapel.list(kelasId)).filter((item:any)=>item.is_aktif!==0)
        const setting=await db.pengaturan.get(`bobot_nilai_${kelasId}`);let weights={harian:40,uts:25,uas:35};if(setting?.value)try{weights={...weights,...JSON.parse(setting.value)}}catch{}
        const result:any[]=[]
        for(const subject of subjects){const columns=await window.electronAPI.kolom.list(subject.id);const values=await window.electronAPI.nilai.getAll(subject.id,siswa.map(item=>item.id));const fixed=(label:string)=>columns.find((column:any)=>column.label.toUpperCase()===label);const daily=columns.filter((column:any)=>!['UTS','UAS'].includes(column.label.toUpperCase())).slice(0,10);for(const student of siswa){const dailyValues=daily.map((column:any)=>values[`${student.id}-${column.id}`]).filter((value:any)=>value!==null&&value!==undefined);const dailyAverage=dailyValues.length?dailyValues.reduce((sum:number,value:number)=>sum+Number(value),0)/dailyValues.length:null;const uts=fixed('UTS');const uas=fixed('UAS');const parts=[{value:dailyAverage,weight:weights.harian},{value:uts?values[`${student.id}-${uts.id}`]:null,weight:weights.uts},{value:uas?values[`${student.id}-${uas.id}`]:null,weight:weights.uas}].filter(item=>item.value!==null&&item.value!==undefined);const totalWeight=parts.reduce((sum,item)=>sum+item.weight,0);result.push({siswa_nama:student.nama,mata_pelajaran:subject.nama,rata_harian:dailyAverage?.toFixed(1)||'—',uts:uts?values[`${student.id}-${uts.id}`]??'—':'—',uas:uas?values[`${student.id}-${uas.id}`]??'—':'—',nilai_akhir:totalWeight?(parts.reduce((sum,item)=>sum+Number(item.value)*item.weight,0)/totalWeight).toFixed(1):'—'})}}
        setData(result)
      }
    })()
  }, [tab, kelasId, siswa])

  return (
    <div><style>{`@media print{aside,header,button,.no-print{display:none!important}main{overflow:visible!important;padding:0!important}.report{box-shadow:none!important;border:1px solid #999!important}.report .overflow-x-auto{overflow:visible!important}.report table{min-width:0!important;font-size:9px!important}.report th,.report td{padding:5px!important}body{background:white!important}}`}</style>
      <div className="mb-4 no-print"><h2 className="text-xl font-bold">Pusat Laporan</h2><p className="mt-1 text-sm text-slate-500">Pilih jenis laporan, tentukan periode, lalu ekspor atau cetak.</p></div>
      <div className="report mb-4 rounded-xl border border-slate-200 bg-white p-4 text-center"><h1 className="font-extrabold uppercase">Laporan {tabs.find(item=>item.id===tab)?.label}</h1><p className="mt-1 text-sm font-semibold">{identity.sekolah}</p><p className="mt-1 text-xs text-slate-500">{identity.kelas} · Semester {identity.semester} · {identity.tahun} · Wali Kelas: {identity.guru}</p></div>

      <div className="flex gap-1 mb-4 rounded-xl p-1 no-print" style={{ background: '#f1f5f9' }}>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${tab === t.id ? 'bg-white shadow-sm' : 'text-gray-500'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3 mb-4 no-print">
        <input type="date" value={periodeMulai} onChange={(e) => setPeriodeMulai(e.target.value)} className="rounded-lg px-3 py-2 text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }} />
        <span className="text-xs text-gray-400">s/d</span>
        <input type="date" value={periodeSelesai} onChange={(e) => setPeriodeSelesai(e.target.value)} className="rounded-lg px-3 py-2 text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }} />
        <div className="flex gap-2 ml-auto">
          <button onClick={exportExcel} disabled={!reportRows.length} className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold border disabled:opacity-40" style={{ borderColor: 'var(--border)' }}><FileDown size={16} /> Excel</button>
          <button onClick={()=>window.print()} className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold border" style={{ borderColor: 'var(--border)' }}><Printer size={16} /> Cetak / PDF</button>
        </div>
      </div>

      <div className="report rounded-xl overflow-hidden" style={{ background: 'var(--card-bg)', boxShadow: 'var(--shadow)' }}><div className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-500">{tab === 'presensi' ? `${reportRows.length} siswa dalam rekap` : `${reportRows.length} data ditemukan`}</div>
        <div className="overflow-x-auto"><table className={`w-full text-sm ${tab === 'jurnal' ? 'min-w-[980px]' : ''}`}>
          <thead>
            <tr className="text-xs uppercase tracking-wider" style={{ background: '#f8fafc' }}>
              {tab!=='nilai'&&tab!=='presensi'&&tab!=='perilaku'&&<th className="px-4 py-3 text-left">Tanggal</th>}
              {tab === 'presensi' && <><th className="px-4 py-3 text-left">Siswa</th><th className="px-3 py-3 text-center">Hadir</th><th className="px-3 py-3 text-center">Sakit</th><th className="px-3 py-3 text-center">Izin</th><th className="px-3 py-3 text-center">Alpa</th><th className="px-3 py-3 text-center">Terlambat</th><th className="px-3 py-3 text-center">Total</th><th className="px-3 py-3 text-center">Kehadiran</th></>}
              {tab === 'perilaku' && <><th className="px-4 py-3 text-left">Siswa</th><th className="px-3 py-3 text-center">Positif</th><th className="px-3 py-3 text-center">Perlu Perhatian</th><th className="px-4 py-3 text-left">Catatan Terakhir</th><th className="px-4 py-3 text-left">Tindak Lanjut</th></>}
              {tab === 'jurnal' && <><th className="px-3 py-3 text-center">Jam</th><th className="px-3 py-3 text-left">Mapel</th><th className="px-3 py-3 text-left">Materi</th><th className="px-3 py-3 text-left">Kegiatan Pembelajaran</th><th className="px-3 py-3 text-left">Kendala</th><th className="px-3 py-3 text-left">Refleksi</th></>}
              {tab === 'nilai' && <><th className="px-4 py-3 text-left">Mata Pelajaran</th><th className="px-4 py-3 text-left">Siswa</th><th className="px-4 py-3 text-center">Harian</th><th className="px-4 py-3 text-center">UTS</th><th className="px-4 py-3 text-center">UAS</th><th className="px-4 py-3 text-center">Nilai Akhir</th></>}
              {tab === 'kalender' && <><th className="px-4 py-3 text-left">Kegiatan</th><th className="px-4 py-3 text-left">Jenis</th></>}
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
            {tab==='kalender'&&filtered.map((r:any)=><tr key={r.id} className="border-t border-slate-100"><td className="px-4 py-2">{r.tanggal_mulai}{r.tanggal_selesai?` – ${r.tanggal_selesai}`:''}</td><td className="px-4 py-2 font-semibold">{r.judul}</td><td className="px-4 py-2 capitalize">{r.jenis.replace('_',' ')}</td></tr>)}
            {reportRows.length === 0 && (
              <tr><td className="px-4 py-8 text-center text-sm text-gray-400" colSpan={8}>Belum ada data</td></tr>
            )}
          </tbody>
        </table></div>
      </div>
    </div>
  )
}
