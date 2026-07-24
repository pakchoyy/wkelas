import { useState, useEffect, useCallback } from 'react'
import { Plus, Settings, Trash2 } from 'lucide-react'
import { useSiswaList } from '../../../hooks/useSiswa'
import { useAppStore } from '../../../stores/appStore'
import type { MataPelajaran, PenilaianKolom } from '../../../../shared/types'

export default function Penilaian() {
  const kelasId = useAppStore((s) => s.kelasAktifId) || 1
  const { data: siswa } = useSiswaList(kelasId)
  const [mapelList, setMapelList] = useState<MataPelajaran[]>([])
  const [mapelId, setMapelId] = useState<number | null>(null)
  const [kolom, setKolom] = useState<PenilaianKolom[]>([])
  const [nilaiMap, setNilaiMap] = useState<Record<string, number | null>>({})
  const [showKolomForm, setShowKolomForm] = useState(false)
  const [showMapelForm, setShowMapelForm] = useState(false)
  const [kolomForm, setKolomForm] = useState({ label: '', bobot: '1.0', tanggal: '' })
  const [mapelForm, setMapelForm] = useState({ nama: '', kode: '' })
  const [editKolom, setEditKolom] = useState<PenilaianKolom | null>(null)

  const loadMapel = useCallback(async () => {
    const res = await window.electronAPI.mapel.list(kelasId)
    setMapelList(res)
  }, [kelasId])

  const loadKolom = useCallback(async () => {
    if (!mapelId) return
    const res = await window.electronAPI.kolom.list(mapelId)
    setKolom(res)
  }, [mapelId])

  const loadNilai = useCallback(async () => {
    if (!mapelId || siswa.length === 0) return
    const res = await window.electronAPI.nilai.getAll(mapelId, siswa.map((s) => s.id))
    const nm: Record<string, number | null> = {}
    for (const r of res) {
      nm[`${r.siswa_id}-${r.kolom_id}`] = r.nilai
    }
    setNilaiMap(nm)
  }, [mapelId, siswa])

  useEffect(() => { loadMapel() }, [loadMapel])
  useEffect(() => { loadKolom() }, [loadKolom])
  useEffect(() => { loadNilai() }, [loadNilai])

  const handleNilaiChange = async (siswaId: number, kolomId: number, nilai: number | null) => {
    setNilaiMap((prev) => ({ ...prev, [`${siswaId}-${kolomId}`]: nilai }))
    await window.electronAPI.nilai.save(siswaId, kolomId, nilai)
  }

  const handleKolomSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mapelId) return
    const data = { mata_pelajaran_id: mapelId, label: kolomForm.label, bobot: parseFloat(kolomForm.bobot), tanggal: kolomForm.tanggal || null, urutan: kolom.length + 1 }
    if (editKolom) {
      await window.electronAPI.kolom.update(editKolom.id, data)
    } else {
      await window.electronAPI.kolom.create(data)
    }
    setShowKolomForm(false)
    setEditKolom(null)
    setKolomForm({ label: '', bobot: '1.0', tanggal: '' })
    loadKolom()
  }

  const handleKolomDelete = async (id: number) => {
    if (!confirm('Hapus kolom ini?')) return
    await window.electronAPI.kolom.delete(id)
    loadKolom()
  }

  const weightedAvg = (siswaId: number) => {
    let totalBobot = 0
    let totalNilai = 0
    for (const k of kolom) {
      const n = nilaiMap[`${siswaId}-${k.id}`]
      if (n !== null && n !== undefined) {
        totalNilai += n * k.bobot
        totalBobot += k.bobot
      }
    }
    return totalBobot > 0 ? (totalNilai / totalBobot).toFixed(1) : '-'
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Penilaian</h2>
        <div className="flex gap-2">
          <button onClick={() => setShowMapelForm(true)} className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold border transition-all duration-200" style={{ borderColor: 'var(--border)' }}>
            <Plus size={16} /> Mapel
          </button>
          <button onClick={() => { setEditKolom(null); setKolomForm({ label: '', bobot: '1.0', tanggal: '' }); setShowKolomForm(true) }}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-all duration-200"
            style={{ background: 'linear-gradient(135deg, #0ea5a0, #0d7a8a)' }}>
            <Plus size={16} /> Kolom
          </button>
        </div>
      </div>

      <div className="mb-4">
        <select
          value={mapelId || ''}
          onChange={(e) => setMapelId(parseInt(e.target.value) || null)}
          className="rounded-lg px-3 py-2.5 text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }}
        >
          <option value="">Pilih mata pelajaran</option>
          {mapelList.map((m) => <option key={m.id} value={m.id}>{m.nama}</option>)}
        </select>
        {mapelId && (
          <button onClick={() => handleKolomDelete(mapelId)} className="ml-2 p-2 hover:text-red-600 transition-colors">
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {mapelId && (
        <div className="rounded-xl overflow-auto" style={{ background: 'var(--card-bg)', boxShadow: 'var(--shadow)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wider" style={{ background: '#f8fafc' }}>
                <th className="px-4 py-3 text-left font-medium sticky left-0" style={{ background: '#f8fafc' }}>Nama</th>
                {kolom.map((k) => (
                  <th key={k.id} className="px-3 py-3 text-center font-medium min-w-[100px]">
                    <div className="flex items-center justify-center gap-1">
                      {k.label}
                      <button onClick={() => { setEditKolom(k); setKolomForm({ label: k.label, bobot: k.bobot.toString(), tanggal: k.tanggal || '' }); setShowKolomForm(true) }} className="text-gray-400 hover:text-[#0ea5a0]">
                        <Settings size={12} />
                      </button>
                      <button onClick={() => handleKolomDelete(k.id)} className="text-gray-400 hover:text-red-600">
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <div className="text-[10px] font-normal text-gray-400">bobot: {k.bobot}</div>
                  </th>
                ))}
                <th className="px-3 py-3 text-center font-medium min-w-[80px]">Rata-rata</th>
              </tr>
            </thead>
            <tbody>
              {siswa.map((s) => (
                <tr key={s.id} className="border-t hover:bg-gray-50/50 transition-colors" style={{ borderColor: 'var(--border)' }}>
                  <td className="px-4 py-2 font-medium sticky left-0" style={{ background: 'var(--card-bg)' }}>{s.nama}</td>
                  {kolom.map((k) => (
                    <td key={k.id} className="px-3 py-2 text-center">
                      <input
                        type="number"
                        value={nilaiMap[`${s.id}-${k.id}`] ?? ''}
                        onChange={(e) => handleNilaiChange(s.id, k.id, e.target.value ? parseFloat(e.target.value) : null)}
                        className="w-20 text-center rounded-lg px-2 py-1 text-sm border font-mono focus:outline-none focus:ring-2 focus:ring-[#0ea5a0]/30"
                        style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }}
                        step="0.5"
                        min="0"
                        max="100"
                      />
                    </td>
                  ))}
                  <td className="px-3 py-2 text-center font-bold text-[#0ea5a0]">
                    {weightedAvg(s.id)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showMapelForm && (
        <Modal title="Tambah Mata Pelajaran" onClose={() => setShowMapelForm(false)}>
          <form onSubmit={async (e) => { e.preventDefault(); await window.electronAPI.mapel.create({ kelas_id: kelasId, ...mapelForm }); setShowMapelForm(false); setMapelForm({ nama: '', kode: '' }); loadMapel() }} className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Nama</label>
              <input value={mapelForm.nama} onChange={(e) => setMapelForm({ ...mapelForm, nama: e.target.value })} className="w-full rounded-lg px-3 py-2.5 text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }} required />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Kode</label>
              <input value={mapelForm.kode} onChange={(e) => setMapelForm({ ...mapelForm, kode: e.target.value })} placeholder="MTK" className="w-full rounded-lg px-3 py-2.5 text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }} />
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button type="button" onClick={() => setShowMapelForm(false)} className="rounded-xl px-4 py-2.5 text-sm font-semibold border" style={{ borderColor: 'var(--border)' }}>Batal</button>
              <button type="submit" className="rounded-xl px-6 py-2.5 text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg, #0ea5a0, #0d7a8a)' }}>Simpan</button>
            </div>
          </form>
        </Modal>
      )}

      {showKolomForm && (
        <Modal title={editKolom ? 'Edit Kolom' : 'Tambah Kolom'} onClose={() => { setShowKolomForm(false); setEditKolom(null) }}>
          <form onSubmit={handleKolomSubmit} className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Label</label>
              <input value={kolomForm.label} onChange={(e) => setKolomForm({ ...kolomForm, label: e.target.value })} placeholder="UH Bab 1" className="w-full rounded-lg px-3 py-2.5 text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Bobot</label>
                <input type="number" step="0.1" value={kolomForm.bobot} onChange={(e) => setKolomForm({ ...kolomForm, bobot: e.target.value })} className="w-full rounded-lg px-3 py-2.5 text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Tanggal</label>
                <input type="date" value={kolomForm.tanggal} onChange={(e) => setKolomForm({ ...kolomForm, tanggal: e.target.value })} className="w-full rounded-lg px-3 py-2.5 text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }} />
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button type="button" onClick={() => { setShowKolomForm(false); setEditKolom(null) }} className="rounded-xl px-4 py-2.5 text-sm font-semibold border" style={{ borderColor: 'var(--border)' }}>Batal</button>
              <button type="submit" className="rounded-xl px-6 py-2.5 text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg, #0ea5a0, #0d7a8a)' }}>{editKolom ? 'Update' : 'Simpan'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl" style={{ background: 'var(--card-bg)', boxShadow: 'var(--shadow-lg)' }}>
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <h3 className="text-sm font-bold">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">✕</button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}
