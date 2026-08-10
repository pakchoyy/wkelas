import { useState, useEffect } from 'react'
import { FileDown, Printer } from 'lucide-react'
import { useSiswaList } from '../../hooks/useSiswa'
import { useAppStore } from '../../stores/appStore'

type TabLaporan = 'presensi' | 'nilai' | 'perilaku' | 'jurnal'

export default function Laporan() {
  const kelasId = useAppStore((s) => s.kelasAktifId) || 1
  const { data: siswa } = useSiswaList(kelasId)
  const [tab, setTab] = useState<TabLaporan>('presensi')
  const [periodeMulai, setPeriodeMulai] = useState('')
  const [periodeSelesai, setPeriodeSelesai] = useState('')
  const [data, setData] = useState<any[]>([])

  const tabs: { id: TabLaporan; label: string }[] = [
    { id: 'presensi', label: 'Presensi' },
    { id: 'nilai', label: 'Nilai' },
    { id: 'perilaku', label: 'Perilaku' },
    { id: 'jurnal', label: 'Jurnal' },
  ]

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
      }
    })()
  }, [tab, kelasId, siswa])

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Laporan</h2>

      <div className="flex gap-1 mb-4 rounded-xl p-1" style={{ background: '#f1f5f9' }}>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${tab === t.id ? 'bg-white shadow-sm' : 'text-gray-500'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3 mb-4">
        <input type="date" value={periodeMulai} onChange={(e) => setPeriodeMulai(e.target.value)} className="rounded-lg px-3 py-2 text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }} />
        <span className="text-xs text-gray-400">s/d</span>
        <input type="date" value={periodeSelesai} onChange={(e) => setPeriodeSelesai(e.target.value)} className="rounded-lg px-3 py-2 text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }} />
        <div className="flex gap-2 ml-auto">
          <button className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold border" style={{ borderColor: 'var(--border)' }}><FileDown size={16} /> PDF</button>
          <button className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold border" style={{ borderColor: 'var(--border)' }}><Printer size={16} /> Cetak</button>
        </div>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--card-bg)', boxShadow: 'var(--shadow)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider" style={{ background: '#f8fafc' }}>
              <th className="px-4 py-3 text-left">Tanggal</th>
              {tab === 'presensi' && <th className="px-4 py-3 text-left">Siswa</th>}
              {tab === 'presensi' && <th className="px-4 py-3 text-left">Status</th>}
              {tab === 'perilaku' && <th className="px-4 py-3 text-left">Siswa</th>}
              {tab === 'perilaku' && <th className="px-4 py-3 text-left">Jenis</th>}
              {tab === 'perilaku' && <th className="px-4 py-3 text-left">Deskripsi</th>}
              {tab === 'jurnal' && <th className="px-4 py-3 text-left">Mapel</th>}
              {tab === 'jurnal' && <th className="px-4 py-3 text-left">Materi</th>}
              {tab === 'nilai' && <th className="px-4 py-3 text-left" colSpan={3}>Pilih tab Penilaian untuk rekap nilai</th>}
            </tr>
          </thead>
          <tbody>
            {tab === 'presensi' && data.map((r: any) => (
              <tr key={r.id} className="border-t" style={{ borderColor: 'var(--border)' }}>
                <td className="px-4 py-2">{r.tanggal}</td>
                <td className="px-4 py-2">{r.siswa_nama}</td>
                <td className="px-4 py-2"><span className={`text-xs font-semibold px-2 py-0.5 rounded-full text-white ${r.status === 'S' ? 'bg-blue-500' : r.status === 'I' ? 'bg-amber-500' : 'bg-red-500'}`}>{r.status}</span></td>
              </tr>
            ))}
            {tab === 'perilaku' && data.map((r: any) => (
              <tr key={r.id} className="border-t" style={{ borderColor: 'var(--border)' }}>
                <td className="px-4 py-2">{r.tanggal}</td>
                <td className="px-4 py-2">{r.siswa_nama}</td>
                <td className="px-4 py-2"><span className={`text-xs font-semibold px-2 py-0.5 rounded-full text-white ${r.jenis === 'positif' ? 'bg-green-500' : 'bg-red-500'}`}>{r.jenis}</span></td>
                <td className="px-4 py-2 text-xs">{r.deskripsi}</td>
              </tr>
            ))}
            {tab === 'jurnal' && data.map((r: any) => (
              <tr key={r.id} className="border-t" style={{ borderColor: 'var(--border)' }}>
                <td className="px-4 py-2">{r.tanggal}</td>
                <td className="px-4 py-2">{r.mata_pelajaran || '-'}</td>
                <td className="px-4 py-2 text-xs">{r.materi || '-'}</td>
              </tr>
            ))}
            {tab === 'nilai' && (
              <tr><td className="px-4 py-8 text-center text-sm text-gray-400" colSpan={3}>Buka menu Siswa → Penilaian untuk input dan lihat nilai</td></tr>
            )}
            {data.length === 0 && tab !== 'nilai' && (
              <tr><td className="px-4 py-8 text-center text-sm text-gray-400" colSpan={5}>Belum ada data</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
