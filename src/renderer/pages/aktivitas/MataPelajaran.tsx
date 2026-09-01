import { useEffect, useState, useRef } from 'react'
import { BookOpen, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react'
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
  const [editId, setEditId] = useState<number|null>(null)
  const [saving, setSaving] = useState(false)
  const busyRef = useRef(false)
  const [error, setError] = useState('')
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
  const closeForm = () => { if (busyRef.current) return; setShowForm(false); setEditId(null); setForm({nama:'',kode:''}); setError('') }
  const openNew = () => { if (busyRef.current) return; setEditId(null); setForm({nama:'',kode:''}); setError(''); setShowForm(true) }
  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    if (busyRef.current) return
    busyRef.current = true; setSaving(true); setError('')
    try {
      const nama = form.nama.trim(), kode = form.kode.trim()
      if (!nama) throw new Error('Nama mata pelajaran wajib diisi.')
      await db.transaction('rw',db.mata_pelajaran,async () => {
        const current = await db.mata_pelajaran.where({kelas_id:kelasId}).toArray()
        if (current.some(item => item.id !== editId && (item.nama.trim().toLowerCase() === nama.toLowerCase() || kode && item.kode?.trim().toLowerCase() === kode.toLowerCase()))) throw new Error('Nama atau kode mata pelajaran sudah digunakan, termasuk mapel nonaktif.')
        if (editId) {
          if (!current.some(item => item.id === editId)) throw new Error('Mata pelajaran tidak ditemukan. Muat ulang halaman.')
          await db.mata_pelajaran.update(editId,{nama,kode})
        } else await window.electronAPI.mapel.create({kelas_id:kelasId,nama,kode,urutan:current.length+1,is_aktif:1})
      })
      setShowForm(false); setEditId(null); setForm({nama:'',kode:''})
      await load(); setToast(editId ? 'Mata pelajaran berhasil diperbarui' : 'Mata pelajaran berhasil ditambahkan')
    } catch(error) { setError(error instanceof Error ? error.message : 'Mata pelajaran gagal disimpan. Silakan coba lagi.') }
    finally { busyRef.current = false; setSaving(false) }
  }
  const edit=(item:MataPelajaran)=>{if(busyRef.current)return;setError('');setEditId(item.id);setForm({nama:item.nama,kode:item.kode||''});setShowForm(true)}
  const toggleActive=async(item:any)=>{await db.mata_pelajaran.update(item.id,{is_aktif:item.is_aktif===0?1:0});await load();setToast(item.is_aktif===0?'Mata pelajaran diaktifkan':'Mata pelajaran dinonaktifkan')}
  const remove = async (item: MataPelajaran) => { if (!window.confirm(`Hapus ${item.nama}? Nilai semua periode terkait juga akan dihapus. Mapel yang masih dipakai jadwal/rencana tidak dapat dihapus.`)) return; try { await window.electronAPI.mapel.delete(item.id); await load(); setToast('Mata pelajaran berhasil dihapus') } catch(error) {window.alert(error instanceof Error ? error.message : 'Mapel gagal dihapus.')} }
  const category = (name: string) => /seni/i.test(name) ? 'Seni' : /muatan|bahasa inggris/i.test(name) ? 'Pilihan' : 'Umum'

  return <div className="space-y-4">
    {toast && <div className="fixed left-1/2 top-20 z-[100] -translate-x-1/2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-xl">{toast}</div>}
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-extrabold">Mata Pelajaran</h2><p className="mt-1 text-sm text-slate-500">Master mapel untuk Jadwal, Penilaian, dan Rencana Mengajar.</p></div><div className="flex gap-2"><button onClick={addPreset} className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-700"><Sparkles size={16}/>Gunakan Rekomendasi</button><button onClick={openNew} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white"><Plus size={16}/>Tambah</button></div></div>
    <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800"><strong>{kelas} · Fase {getPhaseForGrade(tingkat)}</strong><span className="ml-2 text-blue-600">Rekomendasi menyesuaikan tingkat kelas.</span></div>
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><table className="w-full text-sm"><thead><tr className="bg-slate-50 text-xs uppercase text-slate-500"><th className="w-16 px-4 py-3 text-center">No.</th><th className="px-4 py-3 text-left">Nama Mata Pelajaran</th><th className="px-4 py-3 text-left">Kode</th><th className="px-4 py-3 text-left">Kategori</th><th className="w-24 px-4 py-3 text-center">Status</th><th className="w-28 px-4 py-3 text-center">Aksi</th></tr></thead><tbody>{data.sort((a,b) => a.urutan-b.urutan).map((item,index) => <tr key={item.id} className={`${index%2 ? 'bg-slate-50/60':''} border-t border-slate-100`}><td className="px-4 py-3 text-center text-slate-400">{index+1}</td><td className="px-4 py-3 font-bold text-slate-800"><span className="inline-flex items-center gap-2"><BookOpen size={16} className="text-emerald-600"/>{item.nama}</span></td><td className="px-4 py-3 text-slate-500">{item.kode || '—'}</td><td className="px-4 py-3"><span className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">{category(item.nama)}</span></td><td className="px-4 py-3 text-center"><button onClick={()=>toggleActive(item)} role="switch" aria-checked={(item as any).is_aktif!==0} aria-label={`Aktifkan ${item.nama}`} className={`inline-flex h-6 w-11 rounded-full p-1 transition ${(item as any).is_aktif===0?'bg-slate-300':'bg-emerald-500'}`}><span className={`h-4 w-4 rounded-full bg-white transition ${(item as any).is_aktif===0?'':'translate-x-5'}`}/></button></td><td className="px-4 py-3 text-center"><button onClick={()=>edit(item)} className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600"><Pencil size={16}/></button><button onClick={() => remove(item)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={16}/></button></td></tr>)}</tbody></table>{data.length===0 && <div className="py-14 text-center text-sm text-slate-400">Belum ada mata pelajaran. Gunakan rekomendasi sesuai fase.</div>}</div>
    {showForm && <Modal title={editId?"Edit Mata Pelajaran":"Tambah Mata Pelajaran"} onClose={closeForm} footer={<button disabled={saving} form="mapel-form" className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white">{saving ? 'Menyimpan...' : 'Simpan'}</button>}><form id="mapel-form" onSubmit={save} className="space-y-4">{error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}<fieldset disabled={saving} className="space-y-4"><label className="block text-sm font-bold">Nama mata pelajaran<input required value={form.nama} onChange={(e)=>setForm({...form,nama:e.target.value})} className="field mt-1.5"/></label><label className="block text-sm font-bold">Kode <span className="font-normal text-slate-400">(opsional)</span><input value={form.kode} onChange={(e)=>setForm({...form,kode:e.target.value})} className="field mt-1.5" placeholder="Contoh: MTK"/></label></fieldset></form></Modal>}
  </div>
}
