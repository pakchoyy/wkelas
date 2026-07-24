import { useState, useEffect } from 'react'
import { Save } from 'lucide-react'
import { useSiswaList } from '../../../hooks/useSiswa'
import { useAppStore } from '../../../stores/appStore'
import { todayISO } from '../../../../shared/utils'

const STATUS_ORDER = ['H', 'S', 'I', 'A'] as const
type Status = typeof STATUS_ORDER[number]

export default function Presensi() {
  const kelasId = useAppStore((s) => s.kelasAktifId) || 1
  const { data: siswa } = useSiswaList(kelasId)
  const [tanggal, setTanggal] = useState(todayISO())
  const [statusMap, setStatusMap] = useState<Record<number, Status>>({})
  const [keteranganMap, setKeteranganMap] = useState<Record<number, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!kelasId || !tanggal) return
    ;(async () => {
      const res = await window.electronAPI.presensi.get(kelasId, tanggal)
      const sm: Record<number, Status> = {}
      const km: Record<number, string> = {}
      for (const r of res) {
        sm[r.siswa_id] = r.status
        km[r.siswa_id] = r.keterangan || ''
      }
      setStatusMap(sm)
      setKeteranganMap(km)
    })()
  }, [kelasId, tanggal])

  const toggleStatus = (siswaId: number) => {
    setStatusMap((prev) => {
      const current = prev[siswaId] || 'H'
      const idx = STATUS_ORDER.indexOf(current)
      const next = STATUS_ORDER[(idx + 1) % STATUS_ORDER.length]
      const newMap = { ...prev, [siswaId]: next }
      if (next === 'H') delete newMap[siswaId]
      return newMap
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const records = siswa
        .filter((s) => (statusMap[s.id] || 'H') !== 'H')
        .map((s) => ({
          siswa_id: s.id,
          kelas_id: kelasId,
          tanggal,
          status: statusMap[s.id],
          keterangan: keteranganMap[s.id] || undefined,
        }))
      await window.electronAPI.presensi.save(records)
    } finally {
      setSaving(false)
    }
  }

  const counts = { H: 0, S: 0, I: 0, A: 0 }
  for (const s of siswa) {
    const st = statusMap[s.id] || 'H'
    counts[st]++
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Presensi</h2>
        <input
          type="date"
          value={tanggal}
          onChange={(e) => setTanggal(e.target.value)}
          className="rounded-lg px-3 py-2 text-sm border"
          style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }}
        />
      </div>

      <div className="flex gap-3 mb-4 text-sm font-semibold">
        <span className="text-green-600">Hadir: {counts.H}</span>
        <span className="text-blue-600">Sakit: {counts.S}</span>
        <span className="text-amber-600">Izin: {counts.I}</span>
        <span className="text-red-600">Alfa: {counts.A}</span>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--card-bg)', boxShadow: 'var(--shadow)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider" style={{ background: '#f8fafc' }}>
              <th className="px-6 py-4 text-left font-medium">No</th>
              <th className="px-6 py-4 text-left font-medium">Nama</th>
              <th className="px-6 py-4 text-center font-medium">Status</th>
              <th className="px-6 py-4 text-left font-medium">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {siswa.map((s, i) => {
              const st = statusMap[s.id] || 'H'
              const statusColor: Record<Status, string> = { H: '#16a34a', S: '#2563eb', I: '#d97706', A: '#dc2626' }
              return (
                <tr key={s.id} className="border-t hover:bg-gray-50/50 transition-colors" style={{ borderColor: 'var(--border)' }}>
                  <td className="px-6 py-3">{s.no_absen || i + 1}</td>
                  <td className="px-6 py-3 font-medium">{s.nama}</td>
                  <td className="px-6 py-3 text-center">
                    <button
                      onClick={() => toggleStatus(s.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all duration-200 active:scale-[0.95]"
                      style={{ background: statusColor[st] }}
                    >
                      {st === 'H' ? 'Hadir' : st === 'S' ? 'Sakit' : st === 'I' ? 'Izin' : 'Alfa'}
                    </button>
                  </td>
                  <td className="px-6 py-3">
                    {st !== 'H' && (
                      <input
                        value={keteranganMap[s.id] || ''}
                        onChange={(e) => setKeteranganMap({ ...keteranganMap, [s.id]: e.target.value })}
                        placeholder="Keterangan..."
                        className="w-full rounded-lg px-3 py-1.5 text-xs border"
                        style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }}
                      />
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-4 flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
        style={{ background: 'linear-gradient(135deg, #0ea5a0, #0d7a8a)' }}
      >
        <Save size={16} /> {saving ? 'Menyimpan...' : 'Simpan Presensi'}
      </button>
    </div>
  )
}
