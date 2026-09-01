import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, BookOpen, CheckCircle2, ChevronDown, Pencil, Plus, Save, Search, Settings2, Trash2, X } from 'lucide-react'
import { useSiswaList } from '../../../hooks/useSiswa'
import { useAppStore } from '../../../stores/appStore'
import { db } from '../../../../lib/db'
import type { MataPelajaran, PenilaianKolom } from '../../../../shared/types'
import Modal from '../../../components/Modal'
import ConfirmDialog from '../../../components/ConfirmDialog'

type Toast = { type: 'success' | 'error'; text: string }
type DeleteTarget = { type: 'mapel' | 'komponen'; id: number; name: string } | null

export default function Penilaian() {
  const kelasId = useAppStore((s) => s.kelasAktifId) || 1
  const { data: rawSiswa, loading: loadingSiswa } = useSiswaList(kelasId)
  const [kelasLabel, setKelasLabel] = useState('Kelas aktif')
  const [mapelList, setMapelList] = useState<MataPelajaran[]>([])
  const [mapelId, setMapelId] = useState<number | null>(null)
  const [komponen, setKomponen] = useState<PenilaianKolom[]>([])
  const [nilaiMap, setNilaiMap] = useState<Record<string, number | null>>({})
  const [dirty, setDirty] = useState<Set<string>>(new Set())
  const [savingKey, setSavingKey] = useState('')
  const [search, setSearch] = useState('')
  const [showKomponen, setShowKomponen] = useState(false)
  const [showMapel, setShowMapel] = useState(false)
  const [komponenForm, setKomponenForm] = useState({ label: '', bobot: '1', tanggal: '', catatan: '' })
  const [mapelForm, setMapelForm] = useState({ nama: '', kode: '' })
  const [editKomponen, setEditKomponen] = useState<PenilaianKolom | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null)
  const [toast, setToast] = useState<Toast | null>(null)

  const siswa = useMemo(() => rawSiswa.filter((s) => s.nama.toLowerCase().includes(search.toLowerCase())).sort((a, b) => a.nama.localeCompare(b.nama, 'id')), [rawSiswa, search])
  useEffect(() => { db.kelas.get(kelasId).then((k) => k && setKelasLabel(`${/^kelas\s/i.test(k.nama_kelas) ? k.nama_kelas : `Kelas ${k.nama_kelas}`} · ${k.tahun_ajaran} · Semester ${k.semester}`)) }, [kelasId])
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 3500); return () => clearTimeout(t) }, [toast])

  const loadMapel = useCallback(async () => {
    const list = await window.electronAPI.mapel.list(kelasId)
    setMapelList(list)
    setMapelId((current) => current && list.some((m) => m.id === current) ? current : list[0]?.id || null)
  }, [kelasId])
  const loadKomponen = useCallback(async () => { if (!mapelId) { setKomponen([]); return }; setKomponen(await window.electronAPI.kolom.list(mapelId)) }, [mapelId])
  const loadNilai = useCallback(async () => {
    if (!mapelId || rawSiswa.length === 0) { setNilaiMap({}); return }
    const values = await window.electronAPI.nilai.getAll(mapelId, rawSiswa.map((s) => s.id))
    setNilaiMap(values || {})
    setDirty(new Set())
  }, [mapelId, rawSiswa])
  useEffect(() => { loadMapel() }, [loadMapel])
  useEffect(() => { loadKomponen(); loadNilai() }, [loadKomponen, loadNilai])

  const changeNilai = (key: string, raw: string) => {
    const value = raw === '' ? null : Math.min(100, Math.max(0, Number(raw)))
    setNilaiMap((m) => ({ ...m, [key]: Number.isNaN(value) ? null : value }))
    setDirty((d) => new Set(d).add(key))
  }
  const saveCell = async (siswaId: number, komponenId: number) => {
    const key = `${siswaId}-${komponenId}`
    if (!dirty.has(key)) return
    setSavingKey(key)
    try {
      await window.electronAPI.nilai.save(siswaId, komponenId, nilaiMap[key] ?? null)
      setDirty((d) => { const next = new Set(d); next.delete(key); return next })
    } catch { setToast({ type: 'error', text: 'Nilai gagal disimpan. Silakan coba lagi.' }) }
    finally { setSavingKey('') }
  }
  const saveAll = async () => {
    const keys = [...dirty]
    try {
      for (const key of keys) { const [sid, kid] = key.split('-').map(Number); await window.electronAPI.nilai.save(sid, kid, nilaiMap[key] ?? null) }
      setDirty(new Set()); setToast({ type: 'success', text: `${keys.length} perubahan nilai berhasil disimpan.` })
    } catch { setToast({ type: 'error', text: 'Sebagian nilai gagal disimpan. Silakan coba lagi.' }) }
  }
  const average = (sid: number) => {
    let total = 0, weight = 0
    for (const k of komponen) { const n = nilaiMap[`${sid}-${k.id}`]; if (n !== null && n !== undefined) { total += n * k.bobot; weight += k.bobot } }
    return weight ? (total / weight).toFixed(1) : '—'
  }

  const submitMapel = async (e: React.FormEvent) => {
    e.preventDefault()
    try { const saved = await window.electronAPI.mapel.create({ kelas_id: kelasId, ...mapelForm, urutan: mapelList.length + 1 }); setShowMapel(false); setMapelForm({ nama: '', kode: '' }); await loadMapel(); if (saved?.id) setMapelId(saved.id); setToast({ type: 'success', text: 'Mata pelajaran berhasil ditambahkan.' }) }
    catch { setToast({ type: 'error', text: 'Mata pelajaran gagal ditambahkan.' }) }
  }
  const submitKomponen = async (e: React.FormEvent) => {
    e.preventDefault(); if (!mapelId) return
    const data = { mata_pelajaran_id: mapelId, label: komponenForm.label, bobot: Math.max(.1, Number(komponenForm.bobot) || 1), tanggal: komponenForm.tanggal || null, catatan: komponenForm.catatan || null, urutan: editKomponen?.urutan || komponen.length + 1 }
    try { editKomponen ? await window.electronAPI.kolom.update(editKomponen.id, data) : await window.electronAPI.kolom.create(data); setShowKomponen(false); setEditKomponen(null); setKomponenForm({ label: '', bobot: '1', tanggal: '', catatan: '' }); await loadKomponen(); setToast({ type: 'success', text: `Komponen penilaian berhasil ${editKomponen ? 'diperbarui' : 'ditambahkan'}.` }) }
    catch { setToast({ type: 'error', text: 'Komponen penilaian gagal disimpan.' }) }
  }
  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      if (deleteTarget.type === 'mapel') await window.electronAPI.mapel.delete(deleteTarget.id); else await window.electronAPI.kolom.delete(deleteTarget.id)
      setDeleteTarget(null); await (deleteTarget.type === 'mapel' ? loadMapel() : loadKomponen()); setToast({ type: 'success', text: `${deleteTarget.name} berhasil dihapus.` })
    } catch { setToast({ type: 'error', text: 'Data gagal dihapus.' }) }
  }
  const openKomponen = (item?: PenilaianKolom) => { setEditKomponen(item || null); setKomponenForm(item ? { label: item.label, bobot: String(item.bobot), tanggal: item.tanggal || '', catatan: item.catatan || '' } : { label: '', bobot: '1', tanggal: '', catatan: '' }); setShowKomponen(true) }
  const selectedMapel = mapelList.find((m) => m.id === mapelId)

  return <div className="max-w-[1440px] mx-auto pb-20">
    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-5"><div><div className="flex items-center gap-2"><BookOpen size={21} className="text-emerald-600"/><h1 className="text-xl font-extrabold text-slate-900">Penilaian</h1></div><p className="text-sm text-slate-500 mt-1">{kelasLabel}</p></div><div className="flex flex-wrap gap-2"><button onClick={() => setShowMapel(true)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 flex gap-2 items-center"><Settings2 size={16}/>Kelola Mata Pelajaran</button><button disabled={!mapelId} onClick={() => openKomponen()} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white px-4 py-2.5 text-sm font-bold flex gap-2 items-center"><Plus size={16}/>Tambah Penilaian</button></div></div>

    {mapelList.length === 0 ? <Empty title="Belum ada mata pelajaran" text="Tambahkan mata pelajaran sebelum mulai mengisi nilai." action="Tambah Mata Pelajaran" onAction={() => setShowMapel(true)}/> : <>
      <div className="rounded-2xl bg-white border border-slate-200 p-3 mb-4 flex flex-col md:flex-row gap-3 md:items-center">
        <div className="relative"><select value={mapelId || ''} onChange={(e) => setMapelId(Number(e.target.value))} className="appearance-none min-w-64 rounded-xl border border-slate-200 bg-slate-50 pl-4 pr-10 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-emerald-500">{mapelList.map((m) => <option key={m.id} value={m.id}>{m.nama}{m.kode ? ` (${m.kode})` : ''}</option>)}</select><ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/></div>
        <div className="relative flex-1 max-w-md"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama siswa..." className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-9 py-2.5 text-sm outline-none focus:bg-white focus:border-emerald-500"/>{search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><X size={14}/></button>}</div>
        <div className="md:ml-auto text-xs font-semibold text-slate-500">{komponen.length} komponen · {rawSiswa.length} siswa</div>
      </div>

      {komponen.length === 0 ? <Empty title={`${selectedMapel?.nama} belum memiliki penilaian`} text="Buat komponen seperti Tugas, Formatif, Praktik, atau Projek." action="Tambah Penilaian" onAction={() => openKomponen()}/> : <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden"><div className="overflow-auto max-h-[65vh]"><table className="w-full min-w-[760px] text-sm"><thead className="sticky top-0 z-20"><tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500"><th className="w-14 px-3 py-3.5 text-center">No.</th><th className="px-4 py-3.5 text-left min-w-56 sticky left-0 bg-slate-50 z-30">Nama Siswa</th>{komponen.map((k) => <th key={k.id} className="px-3 py-3 min-w-32 text-center"><div className="flex justify-center gap-1 items-center"><span className="normal-case text-slate-700 font-bold">{k.label}</span><button onClick={() => openKomponen(k)} className="p-1 text-slate-400 hover:text-emerald-700"><Pencil size={12}/></button><button onClick={() => setDeleteTarget({ type: 'komponen', id: k.id, name: k.label })} className="p-1 text-slate-400 hover:text-red-600"><Trash2 size={12}/></button></div><div className="normal-case text-[10px] text-slate-400 font-normal mt-1">Bobot {k.bobot}{k.tanggal ? ` · ${k.tanggal}` : ''}</div></th>)}<th className="px-3 py-3 min-w-24 text-center">Rata-rata</th></tr></thead><tbody>{siswa.map((s, index) => <tr key={s.id} className={`${index % 2 ? 'bg-slate-50/60' : 'bg-white'} border-b border-slate-100 hover:bg-emerald-50/40`}><td className="px-3 py-2.5 text-center font-semibold text-slate-400">{index + 1}</td><td className={`px-4 py-2.5 sticky left-0 z-10 font-semibold text-slate-800 ${index % 2 ? 'bg-slate-50' : 'bg-white'}`}>{s.nama}</td>{komponen.map((k) => { const key = `${s.id}-${k.id}`; return <td key={k.id} className="px-3 py-2 text-center"><div className="relative inline-block"><input data-score="true" type="number" min="0" max="100" step=".5" value={nilaiMap[key] ?? ''} onChange={(e) => changeNilai(key, e.target.value)} onBlur={() => saveCell(s.id, k.id)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); (e.currentTarget as HTMLInputElement).blur() } }} className={`w-20 rounded-lg border px-2 py-1.5 text-center font-mono outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 ${dirty.has(key) ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white'}`}/>{savingKey === key && <span className="absolute -right-1 -top-1 w-2 h-2 rounded-full bg-blue-500 animate-pulse"/>}</div></td>})}<td className="px-3 py-2.5 text-center font-extrabold text-emerald-700">{average(s.id)}</td></tr>)}</tbody></table>{siswa.length === 0 && !loadingSiswa && <div className="py-14 text-center text-sm text-slate-400">Tidak ada siswa yang cocok dengan pencarian.</div>}</div><div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center"><span className="text-xs text-slate-500">Nilai tersimpan saat keluar dari sel.</span>{dirty.size > 0 && <button onClick={saveAll} className="ml-auto rounded-lg bg-emerald-600 text-white px-3 py-2 text-xs font-bold flex items-center gap-2"><Save size={14}/>Simpan {dirty.size} Perubahan</button>}</div></div>}
    </>}

    {showMapel && <Modal title="Kelola Mata Pelajaran" onClose={() => setShowMapel(false)} maxWidth="max-w-lg"><form onSubmit={submitMapel} className="grid grid-cols-[1fr_110px_auto] gap-2 mb-4"><input required value={mapelForm.nama} onChange={(e) => setMapelForm({ ...mapelForm, nama: e.target.value })} placeholder="Nama mata pelajaran" className="field"/><input value={mapelForm.kode} onChange={(e) => setMapelForm({ ...mapelForm, kode: e.target.value })} placeholder="Kode" className="field"/><button className="rounded-xl bg-emerald-600 text-white px-4 text-sm font-bold">Tambah</button></form><div className="space-y-2">{mapelList.map((m) => <div key={m.id} className="rounded-xl border border-slate-200 p-3 flex items-center"><div><div className="text-sm font-bold text-slate-700">{m.nama}</div><div className="text-xs text-slate-400">{m.kode || 'Tanpa kode'}</div></div><button onClick={() => setDeleteTarget({ type: 'mapel', id: m.id, name: m.nama })} className="ml-auto rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-500 hover:bg-red-50 hover:text-red-700"><Trash2 size={15}/></button></div>)}</div></Modal>}
    {showKomponen && <Modal title={editKomponen ? 'Edit Komponen Penilaian' : 'Tambah Komponen Penilaian'} onClose={() => { setShowKomponen(false); setEditKomponen(null) }} footer={<><button onClick={() => setShowKomponen(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold">Batal</button><button form="komponen-form" className="rounded-xl bg-emerald-600 text-white px-5 py-2.5 text-sm font-bold">Simpan</button></>}><form id="komponen-form" onSubmit={submitKomponen} className="space-y-4"><label className="text-sm font-semibold text-slate-700 block">Nama penilaian <span className="text-red-500">*</span><input required value={komponenForm.label} onChange={(e) => setKomponenForm({ ...komponenForm, label: e.target.value })} placeholder="Contoh: Formatif Bab 1" className="field mt-1.5"/></label><div><div className="text-xs font-bold text-slate-500 mb-2">Pilihan cepat</div><div className="flex flex-wrap gap-2">{['Tugas', 'Formatif', 'Sumatif', 'Praktik', 'Projek'].map((x) => <button type="button" key={x} onClick={() => setKomponenForm({ ...komponenForm, label: x })} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold hover:border-emerald-300">{x}</button>)}</div></div><div className="grid grid-cols-2 gap-3"><label className="text-sm font-semibold text-slate-700">Bobot<input type="number" min=".1" step=".1" value={komponenForm.bobot} onChange={(e) => setKomponenForm({ ...komponenForm, bobot: e.target.value })} className="field mt-1.5"/><span className="block text-[11px] text-slate-400 font-normal mt-1">Bobot 2 dihitung dua kali bobot 1.</span></label><label className="text-sm font-semibold text-slate-700">Tanggal <span className="text-slate-400 font-normal">(Opsional)</span><input type="date" value={komponenForm.tanggal} onChange={(e) => setKomponenForm({ ...komponenForm, tanggal: e.target.value })} className="field mt-1.5"/></label></div><label className="text-sm font-semibold text-slate-700 block">Catatan <span className="text-slate-400 font-normal">(Opsional)</span><input value={komponenForm.catatan} onChange={(e) => setKomponenForm({ ...komponenForm, catatan: e.target.value })} className="field mt-1.5"/></label></form></Modal>}
    <ConfirmDialog open={!!deleteTarget} title={deleteTarget?.type === 'mapel' ? 'Hapus Mata Pelajaran' : 'Hapus Komponen Penilaian'} message={deleteTarget?.type === 'mapel' ? `Hapus ${deleteTarget?.name}? Semua komponen dan nilai di dalamnya akan ikut terhapus.` : `Hapus ${deleteTarget?.name}? Semua nilai siswa pada komponen ini akan ikut terhapus.`} onCancel={() => setDeleteTarget(null)} onConfirm={confirmDelete}/>
    {toast && <div className="fixed inset-x-0 top-6 z-[500] flex justify-center pointer-events-none px-4"><div className={`pointer-events-auto flex items-center gap-3 rounded-2xl border bg-white px-5 py-3.5 shadow-xl text-sm font-semibold ${toast.type === 'success' ? 'border-emerald-200 text-emerald-800' : 'border-red-200 text-red-800'}`}>{toast.type === 'success' ? <span className="w-8 h-8 rounded-full bg-emerald-100 grid place-items-center"><CheckCircle2 size={18}/></span> : <span className="w-8 h-8 rounded-full bg-red-100 grid place-items-center"><AlertCircle size={18}/></span>}<span>{toast.text}</span><button onClick={() => setToast(null)} className="ml-3 opacity-50"><X size={15}/></button></div></div>}
  </div>
}

function Empty({ title, text, action, onAction }: { title: string; text: string; action: string; onAction: () => void }) { return <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center"><BookOpen size={36} className="mx-auto text-slate-300 mb-3"/><h2 className="font-bold text-slate-700">{title}</h2><p className="text-sm text-slate-400 mt-1 mb-4">{text}</p><button onClick={onAction} className="rounded-xl bg-emerald-600 text-white px-4 py-2.5 text-sm font-bold"><Plus size={15} className="inline mr-1"/>{action}</button></div> }
