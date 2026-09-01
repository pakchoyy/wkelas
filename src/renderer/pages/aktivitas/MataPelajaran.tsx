import { useEffect, useState } from 'react'
import { BookOpen, Plus, Sparkles, Trash2 } from 'lucide-react'
import { useAppStore } from '../../stores/appStore'
import { db } from '../../../lib/db'
import { getPhaseForGrade, getRecommendedMapel } from '../../../shared/mapelRecommendations'
import type { MataPelajaran } from '../../../shared/types'
import Modal from '../../components/Modal'

export default function MataPelajaran() {
  const kelasId = useAppStore((s) => s.kelasAktifId) || 1
  const [data, setData] = useState<MataPelajaran[]>([])
  const [tingkat, setTingkat] = useState('1')
  const [kelas, setKelas] = useState('Kelas aktif')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ nama: '', kode: '' })
  const [toast, setToast] = useState('')
  const load = async () => setData(await window.electronAPI.mapel.list(kelasId))
  useEffect(() => { load(); db.kelas.get(kelasId).then((item) => { if (item) { setTingkat(item.tingkat); setKelas(item.nama_kelas) } }) }, [kelasId])
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 2800); return () => clearTimeout(timer) }, [toast])

  const addPreset = async () => {
    const existing = new Set(data.map((item) => item.nama.trim().toLowerCase()))
    const missing = getRecommendedMapel(tingkat).filter((item) => !existing.has(item.nama.toLowerCase()))
    for (const [index, item] of missing.entries()) await window.electronAPI.mapel.create({ kelas_id: kelasId, nama: item.nama, kode: item.kode, urutan: data.length + index + 1 })
    await load(); setToast(missing.length ? `${missing.length} mapel rekomendasi ditambahkan` : 'Semua mapel rekomendasi sudah tersedia')
  }
  const save = async (event: React.FormEvent) => { event.preventDefault(); await window.electronAPI.mapel.create({ kelas_id: kelasId, ...form, urutan: data.length + 1 }); setShowForm(false); setForm({ nama: '', kode: '' }); await load(); setToast('Mata pelajaran berhasil ditambahkan') }
  const remove = async (item: MataPelajaran) => { if (!window.confirm(`Hapus ${item.nama}? Nilai yang terkait juga akan dihapus.`)) return; await window.electronAPI.mapel.delete(item.id); await load(); setToast('Mata pelajaran berhasil dihapus') }
  const category = (name: string) => /seni/i.test(name) ? 'Seni' : /muatan|bahasa inggris/i.test(name) ? 'Pilihan' : 'Umum'

  return <div className="space-y-4">
    {toast && <div className="fixed left-1/2 top-20 z-[100] -translate-x-1/2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-xl">{toast}</div>}
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-extrabold">Mata Pelajaran</h2><p className="mt-1 text-sm text-slate-500">Master mapel untuk Jadwal, Penilaian, dan Rencana Mengajar.</p></div><div className="flex gap-2"><button onClick={addPreset} className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-700"><Sparkles size={16}/>Gunakan Rekomendasi</button><button onClick={() => setShowForm(true)} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white"><Plus size={16}/>Tambah</button></div></div>
    <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800"><strong>{kelas} · Fase {getPhaseForGrade(tingkat)}</strong><span className="ml-2 text-blue-600">Rekomendasi menyesuaikan tingkat kelas. P5 dikelola melalui Proyek Kokurikuler.</span></div>
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><table className="w-full text-sm"><thead><tr className="bg-slate-50 text-xs uppercase text-slate-500"><th className="w-16 px-4 py-3 text-center">No.</th><th className="px-4 py-3 text-left">Nama Mata Pelajaran</th><th className="px-4 py-3 text-left">Kode</th><th className="px-4 py-3 text-left">Kategori</th><th className="w-20 px-4 py-3 text-center">Aksi</th></tr></thead><tbody>{data.sort((a,b) => a.urutan-b.urutan).map((item,index) => <tr key={item.id} className={`${index%2 ? 'bg-slate-50/60':''} border-t border-slate-100`}><td className="px-4 py-3 text-center text-slate-400">{index+1}</td><td className="px-4 py-3 font-bold text-slate-800"><span className="inline-flex items-center gap-2"><BookOpen size={16} className="text-emerald-600"/>{item.nama}</span></td><td className="px-4 py-3 text-slate-500">{item.kode || '—'}</td><td className="px-4 py-3"><span className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">{category(item.nama)}</span></td><td className="px-4 py-3 text-center"><button onClick={() => remove(item)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={16}/></button></td></tr>)}</tbody></table>{data.length===0 && <div className="py-14 text-center text-sm text-slate-400">Belum ada mata pelajaran. Gunakan rekomendasi sesuai fase.</div>}</div>
    {showForm && <Modal title="Tambah Mata Pelajaran" onClose={() => setShowForm(false)} footer={<button form="mapel-form" className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white">Simpan</button>}><form id="mapel-form" onSubmit={save} className="space-y-4"><label className="block text-sm font-bold">Nama mata pelajaran<input required value={form.nama} onChange={(e)=>setForm({...form,nama:e.target.value})} className="field mt-1.5"/></label><label className="block text-sm font-bold">Kode <span className="font-normal text-slate-400">(opsional)</span><input value={form.kode} onChange={(e)=>setForm({...form,kode:e.target.value})} className="field mt-1.5" placeholder="Contoh: MTK"/></label></form></Modal>}
  </div>
}
