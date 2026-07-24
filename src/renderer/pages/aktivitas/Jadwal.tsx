import { useState, useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useAppStore } from '../../stores/appStore'
import type { Jadwal as JadwalType, MataPelajaran } from '../../../shared/types'

const HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']

export default function Jadwal() {
  const kelasId = useAppStore((s) => s.kelasAktifId) || 1
  const [data, setData] = useState<JadwalType[]>([])
  const [mapelList, setMapelList] = useState<MataPelajaran[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState({ hari: 1, jam_ke: 1, jam_mulai: '07:00', jam_selesai: '08:00', mata_pelajaran_id: '', nama_mapel_custom: '', nama_guru: '', ruang: '' })

  const load = async () => {
    setData(await window.electronAPI.jadwal.list(kelasId))
    setMapelList(await window.electronAPI.mapel.list(kelasId))
  }

  useEffect(() => { load() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await window.electronAPI.jadwal.save({ ...form, kelas_id: kelasId, id: editId, mata_pelajaran_id: form.mata_pelajaran_id ? parseInt(form.mata_pelajaran_id) : null })
    setShowForm(false)
    setEditId(null)
    setForm({ hari: 1, jam_ke: 1, jam_mulai: '07:00', jam_selesai: '08:00', mata_pelajaran_id: '', nama_mapel_custom: '', nama_guru: '', ruang: '' })
    load()
  }

  const handleEdit = (item: JadwalType) => {
    setEditId(item.id)
    setForm({ hari: item.hari, jam_ke: item.jam_ke, jam_mulai: item.jam_mulai, jam_selesai: item.jam_selesai, mata_pelajaran_id: item.mata_pelajaran_id?.toString() || '', nama_mapel_custom: item.nama_mapel_custom || '', nama_guru: item.nama_guru || '', ruang: item.ruang || '' })
    setShowForm(true)
  }

  const getMapelName = (item: JadwalType) => item.nama_mapel_custom || mapelList.find((m) => m.id === item.mata_pelajaran_id)?.nama || '-'

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Jadwal Pelajaran</h2>
        <button onClick={() => { setEditId(null); setForm({ hari: 1, jam_ke: 1, jam_mulai: '07:00', jam_selesai: '08:00', mata_pelajaran_id: '', nama_mapel_custom: '', nama_guru: '', ruang: '' }); setShowForm(true) }}
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg, #0ea5a0, #0d7a8a)' }}>
          <Plus size={16} /> Tambah
        </button>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--card-bg)', boxShadow: 'var(--shadow)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider" style={{ background: '#f8fafc' }}>
              <th className="px-3 py-3 text-left">Jam</th>
              {HARI.slice(0, 5).map((h, i) => <th key={i} className="px-3 py-3 text-left">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 10 }, (_, jam) => jam + 1).map((jam) => (
              <tr key={jam} className="border-t" style={{ borderColor: 'var(--border)' }}>
                <td className="px-3 py-2 text-xs font-semibold text-gray-500">Jam {jam}</td>
                {HARI.slice(0, 5).map((_, hari) => {
                  const item = data.find((d) => d.hari === hari + 1 && d.jam_ke === jam)
                  return (
                    <td key={hari} className="px-3 py-2 text-xs border-l cursor-pointer hover:bg-gray-50" style={{ borderColor: 'var(--border)' }}
                      onClick={() => item && handleEdit(item)}>
                      {item ? (
                        <div>
                          <span className="font-semibold text-[#0ea5a0]">{getMapelName(item)}</span>
                          <div className="text-gray-400">{item.jam_mulai}-{item.jam_selesai}</div>
                        </div>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl" style={{ background: 'var(--card-bg)', boxShadow: 'var(--shadow-lg)' }}>
            <div className="flex items-center justify-between px-4 py-3 border-b"><h3 className="text-sm font-bold">{editId ? 'Edit' : 'Tambah'} Jadwal</h3><button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded-lg">✕</button></div>
            <form onSubmit={handleSubmit} className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-gray-700 block mb-1">Hari</label>
                  <select value={form.hari} onChange={(e) => setForm({ ...form, hari: parseInt(e.target.value) })} className="w-full rounded-lg px-3 py-2 text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }}>
                    {HARI.map((h, i) => <option key={i} value={i + 1}>{h}</option>)}
                  </select></div>
                <div><label className="text-xs font-medium text-gray-700 block mb-1">Jam ke</label>
                  <input type="number" value={form.jam_ke} onChange={(e) => setForm({ ...form, jam_ke: parseInt(e.target.value) })} className="w-full rounded-lg px-3 py-2 text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-gray-700 block mb-1">Mulai</label>
                  <input type="time" value={form.jam_mulai} onChange={(e) => setForm({ ...form, jam_mulai: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }} /></div>
                <div><label className="text-xs font-medium text-gray-700 block mb-1">Selesai</label>
                  <input type="time" value={form.jam_selesai} onChange={(e) => setForm({ ...form, jam_selesai: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }} /></div>
              </div>
              <div><label className="text-xs font-medium text-gray-700 block mb-1">Mata Pelajaran</label>
                <select value={form.mata_pelajaran_id} onChange={(e) => setForm({ ...form, mata_pelajaran_id: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }}>
                  <option value="">Pilih...</option>
                  {mapelList.map((m) => <option key={m.id} value={m.id}>{m.nama}</option>)}
                </select></div>
              <div><label className="text-xs font-medium text-gray-700 block mb-1">Atau nama custom</label>
                <input value={form.nama_mapel_custom} onChange={(e) => setForm({ ...form, nama_mapel_custom: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-gray-700 block mb-1">Guru</label>
                  <input value={form.nama_guru} onChange={(e) => setForm({ ...form, nama_guru: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }} /></div>
                <div><label className="text-xs font-medium text-gray-700 block mb-1">Ruang</label>
                  <input value={form.ruang} onChange={(e) => setForm({ ...form, ruang: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }} /></div>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => { if (editId) { window.electronAPI.jadwal.delete(editId); load() }; setShowForm(false) }}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-red-600 border border-red-200" style={{ background: '#fef2f2' }}>
                  <Trash2 size={14} className="inline mr-1" />Hapus</button>
                <button type="submit" className="rounded-xl px-6 py-2 text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg, #0ea5a0, #0d7a8a)' }}>Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
