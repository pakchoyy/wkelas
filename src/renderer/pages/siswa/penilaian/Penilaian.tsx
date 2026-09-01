import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, BookOpen, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Pencil, Plus, Save, Search, Settings2, Sparkles, Trash2, X } from 'lucide-react'
import { useSiswaList } from '../../../hooks/useSiswa'
import { useAppStore } from '../../../stores/appStore'
import { db } from '../../../../lib/db'
import type { MataPelajaran, PenilaianKolom } from '../../../../shared/types'
import Modal from '../../../components/Modal'
import ConfirmDialog from '../../../components/ConfirmDialog'
import { getPhaseForGrade, getRecommendedMapel } from '../../../../shared/mapelRecommendations'

type Toast = { type: 'success' | 'error'; text: string }
type DeleteTarget = { type: 'mapel' | 'komponen'; id: number; name: string } | null

export default function Penilaian() {
  const kelasId = useAppStore((s) => s.kelasAktifId) || 1
  const { data: rawSiswa, loading: loadingSiswa } = useSiswaList(kelasId)
  const [kelasLabel, setKelasLabel] = useState('Kelas aktif')
  const [tingkat, setTingkat] = useState('1')
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
  const [showBobot, setShowBobot] = useState(false)
  const [bobot, setBobot] = useState({ harian: 40, uts: 25, uas: 35 })
  const [columnPage, setColumnPage] = useState(0)

  const siswa = useMemo(() => rawSiswa.filter((s) => s.nama.toLowerCase().includes(search.toLowerCase())).sort((a, b) => a.nama.localeCompare(b.nama, 'id')), [rawSiswa, search])
  useEffect(() => { db.kelas.get(kelasId).then((k) => { if (!k) return; setTingkat(k.tingkat); setKelasLabel(`${/^kelas\s/i.test(k.nama_kelas) ? k.nama_kelas : `Kelas ${k.nama_kelas}`} · ${k.tahun_ajaran} · Semester ${k.semester}`) }) }, [kelasId])
  useEffect(() => { db.pengaturan.get(`bobot_nilai_${kelasId}`).then((x) => { if (x?.value) try { setBobot(JSON.parse(x.value)) } catch {} }) }, [kelasId])
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 3500); return () => clearTimeout(t) }, [toast])

  const loadMapel = useCallback(async () => {
    const list = await window.electronAPI.mapel.list(kelasId)
    setMapelList(list)
    setMapelId((current) => current && list.some((m) => m.id === current) ? current : list[0]?.id || null)
  }, [kelasId])
  const loadKomponen = useCallback(async () => { if (!mapelId) { setKomponen([]); return }; setKomponen(await window.electronAPI.kolom.list(mapelId)) }, [mapelId])
  const ensureFixedScores = useCallback(async () => {
    if (!mapelId) return
    const list = await window.electronAPI.kolom.list(mapelId)
    let changed = false
    for (let i = 1; i <= 10; i++) if (!list.some((k) => k.label.toUpperCase() === `H${i}` || k.label.toUpperCase() === `HARIAN ${i}`)) { await window.electronAPI.kolom.create({ mata_pelajaran_id: mapelId, label: `H${i}`, bobot: 1, tanggal: null, urutan: i }); changed = true }
    if (!list.some((k) => k.label.toUpperCase() === 'UTS')) { await window.electronAPI.kolom.create({ mata_pelajaran_id: mapelId, label: 'UTS', bobot: 1, tanggal: null, urutan: 900 }); changed = true }
    if (!list.some((k) => k.label.toUpperCase() === 'UAS')) { await window.electronAPI.kolom.create({ mata_pelajaran_id: mapelId, label: 'UAS', bobot: 1, tanggal: null, urutan: 901 }); changed = true }
    if (changed) await loadKomponen()
  }, [mapelId, loadKomponen])
  const loadNilai = useCallback(async () => {
    if (!mapelId || rawSiswa.length === 0) { setNilaiMap({}); return }
    const values = await window.electronAPI.nilai.getAll(mapelId, rawSiswa.map((s) => s.id))
    setNilaiMap(values || {})
    setDirty(new Set())
  }, [mapelId, rawSiswa])
  useEffect(() => { loadMapel() }, [loadMapel])
  useEffect(() => { loadKomponen().then(ensureFixedScores); loadNilai() }, [loadKomponen, loadNilai, ensureFixedScores])

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
  const isFixed = (k: PenilaianKolom) => ['UTS', 'UAS'].includes(k.label.toUpperCase())
  const orderedKomponen = [...komponen].sort((a, b) => { const rank = (k: PenilaianKolom) => k.label.toUpperCase() === 'UTS' ? 1 : k.label.toUpperCase() === 'UAS' ? 2 : 0; return rank(a) - rank(b) || a.urutan - b.urutan })
  const dailyKomponen = orderedKomponen.filter((item) => !isFixed(item)).slice(0, 10)
  const fixedKomponen = orderedKomponen.filter(isFixed)
  const pageSize = 5
  const totalColumnPages = Math.max(1, Math.ceil(dailyKomponen.length / pageSize))
  const visibleKomponen = [...dailyKomponen.slice(columnPage * pageSize, (columnPage + 1) * pageSize), ...fixedKomponen]
  useEffect(() => { setColumnPage(0) }, [mapelId])
  useEffect(() => { if (columnPage >= totalColumnPages) setColumnPage(totalColumnPages - 1) }, [columnPage, totalColumnPages])
  const average = (sid: number) => {
    const daily = komponen.filter((k) => !isFixed(k)).map((k) => nilaiMap[`${sid}-${k.id}`]).filter((n): n is number => n !== null && n !== undefined)
    const uts = komponen.find((k) => k.label.toUpperCase() === 'UTS'); const uas = komponen.find((k) => k.label.toUpperCase() === 'UAS')
    const dailyAvg = daily.length ? daily.reduce((a, b) => a + b, 0) / daily.length : null
    const parts = [{ value: dailyAvg, weight: bobot.harian / 100 }, { value: uts ? nilaiMap[`${sid}-${uts.id}`] : null, weight: bobot.uts / 100 }, { value: uas ? nilaiMap[`${sid}-${uas.id}`] : null, weight: bobot.uas / 100 }].filter((x) => x.value !== null && x.value !== undefined)
    const weight = parts.reduce((a, b) => a + b.weight, 0); return weight ? (parts.reduce((a, b) => a + Number(b.value) * b.weight, 0) / weight).toFixed(1) : '—'
  }

  const submitMapel = async (e: React.FormEvent) => {
    e.preventDefault()
    try { const saved = await window.electronAPI.mapel.create({ kelas_id: kelasId, ...mapelForm, urutan: mapelList.length + 1 }); setShowMapel(false); setMapelForm({ nama: '', kode: '' }); await loadMapel(); if (saved?.id) setMapelId(saved.id); setToast({ type: 'success', text: 'Mata pelajaran berhasil ditambahkan.' }) }
    catch { setToast({ type: 'error', text: 'Mata pelajaran gagal ditambahkan.' }) }
  }
  const addRecommendations = async () => {
    const existing = new Set(mapelList.map((item) => item.nama.trim().toLowerCase()))
    const missing = getRecommendedMapel(tingkat).filter((item) => !existing.has(item.nama.toLowerCase()))
    try {
      for (const [index, item] of missing.entries()) await window.electronAPI.mapel.create({ kelas_id: kelasId, nama: item.nama, kode: item.kode, urutan: mapelList.length + index + 1 })
      await loadMapel(); setToast({ type: 'success', text: missing.length ? `${missing.length} mata pelajaran rekomendasi ditambahkan.` : 'Semua mata pelajaran rekomendasi sudah tersedia.' })
    } catch { setToast({ type: 'error', text: 'Rekomendasi mata pelajaran gagal ditambahkan.' }) }
  }
  const submitKomponen = async (e: React.FormEvent) => {
    e.preventDefault(); if (!mapelId) return
    const dailyCount = komponen.filter((k) => !isFixed(k)).length
    const data = { mata_pelajaran_id: mapelId, label: komponenForm.label || `Harian ${dailyCount + 1}`, bobot: 1, tanggal: komponenForm.tanggal || null, catatan: komponenForm.catatan || null, urutan: editKomponen?.urutan || dailyCount + 1 }
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
  const openKomponen = (item?: PenilaianKolom) => { setEditKomponen(item || null); const nextNo = komponen.filter((k) => !isFixed(k)).length + 1; setKomponenForm(item ? { label: item.label, bobot: '1', tanggal: item.tanggal || '', catatan: item.catatan || '' } : { label: `Harian ${nextNo}`, bobot: '1', tanggal: '', catatan: '' }); setShowKomponen(true) }
  const selectedMapel = mapelList.find((m) => m.id === mapelId)
  const saveBobot = async () => { if (bobot.harian + bobot.uts + bobot.uas !== 100) return; await db.pengaturan.put({ key: `bobot_nilai_${kelasId}`, value: JSON.stringify(bobot), updated_at: new Date().toISOString() }); setShowBobot(false); setToast({ type: 'success', text: 'Persentase nilai berhasil disimpan.' }) }

  return <div className="max-w-[1440px] mx-auto pb-20">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-5"><div><div className="flex items-center gap-2"><BookOpen size={21} className="text-emerald-600"/><h1 className="text-xl font-extrabold text-slate-900">Penilaian</h1></div><p className="text-sm text-slate-500 mt-1">{kelasLabel}</p></div><div className="flex flex-wrap gap-2"><button onClick={() => setShowBobot(true)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 flex gap-2 items-center"><Settings2 size={16}/>Pengaturan Nilai</button><button onClick={() => setShowMapel(true)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 flex gap-2 items-center"><BookOpen size={16}/>Mata Pelajaran</button></div></div>

    {mapelList.length === 0 ? <Empty title="Belum ada mata pelajaran" text="Tambahkan mata pelajaran sebelum mulai mengisi nilai." action="Tambah Mata Pelajaran" onAction={() => setShowMapel(true)}/> : <>
      <div className="rounded-2xl bg-white border border-slate-200 p-3 mb-4 flex flex-col md:flex-row gap-3 md:items-center">
        <div className="relative"><select value={mapelId || ''} onChange={(e) => setMapelId(Number(e.target.value))} className="appearance-none min-w-64 rounded-xl border border-slate-200 bg-slate-50 pl-4 pr-10 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-emerald-500">{mapelList.map((m) => <option key={m.id} value={m.id}>{m.nama}{m.kode ? ` (${m.kode})` : ''}</option>)}</select><ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/></div>
        <div className="relative flex-1 max-w-md"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama siswa..." className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-9 py-2.5 text-sm outline-none focus:bg-white focus:border-emerald-500"/>{search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><X size={14}/></button>}</div>
        {totalColumnPages > 1 && <div className="md:ml-auto flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1"><button disabled={columnPage === 0} onClick={() => setColumnPage((page) => page - 1)} className="rounded-lg p-1.5 hover:bg-white disabled:opacity-30" title="Kolom sebelumnya"><ChevronLeft size={16}/></button><span className="min-w-20 text-center text-xs font-bold text-slate-500">Bagian {columnPage + 1}/{totalColumnPages}</span><button disabled={columnPage === totalColumnPages - 1} onClick={() => setColumnPage((page) => page + 1)} className="rounded-lg p-1.5 hover:bg-white disabled:opacity-30" title="Kolom berikutnya"><ChevronRight size={16}/></button></div>}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden"><div className="overflow-y-auto max-h-[65vh]"><table className="w-full table-fixed text-xs"><thead className="sticky top-0 z-20"><tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500"><th className="w-8 px-1 py-3 text-center">No.</th><th className="w-36 px-2 py-3 text-left sticky left-0 bg-slate-50 z-30">Nama Siswa</th>{visibleKomponen.map((k) => <th key={k.id} className={`w-[10%] px-1 py-2 text-center ${isFixed(k) ? 'bg-blue-50/70' : ''}`}><div className="text-[9px] tracking-wider mb-1 text-slate-400">{isFixed(k) ? 'NILAI SEMESTER' : 'NILAI HARIAN'}</div><div className="flex justify-center gap-1 items-center"><span className="normal-case text-slate-700 font-bold">{isFixed(k) ? k.label : `H${dailyKomponen.findIndex((item) => item.id === k.id) + 1}`}</span>{!isFixed(k) && <><button onClick={() => openKomponen(k)} className="p-1 text-slate-400 hover:text-emerald-700"><Pencil size={12}/></button><button onClick={() => setDeleteTarget({ type: 'komponen', id: k.id, name: k.label })} className="p-1 text-slate-400 hover:text-red-600"><Trash2 size={12}/></button></>}</div>{k.tanggal && <div className="normal-case text-[10px] text-slate-400 font-normal mt-1">{k.tanggal}</div>}</th>)}<th className="w-[10%] px-1 py-2 text-center bg-emerald-50">Nilai Akhir</th></tr></thead><tbody>{siswa.map((s, index) => <tr key={s.id} className={`${index % 2 ? 'bg-slate-50/60' : 'bg-white'} border-b border-slate-100 hover:bg-emerald-50/40`}><td className="px-3 py-2.5 text-center font-semibold text-slate-400">{index + 1}</td><td className={`px-2 py-2.5 sticky left-0 z-10 font-semibold text-slate-800 ${index % 2 ? 'bg-slate-50' : 'bg-white'}`}>{s.nama}</td>{visibleKomponen.map((k) => { const key = `${s.id}-${k.id}`; return <td key={k.id} className={`px-1.5 py-2 text-center ${isFixed(k) ? 'bg-blue-50/30' : ''}`}><div className="relative inline-block"><input type="number" min="0" max="100" step=".5" value={nilaiMap[key] ?? ''} onChange={(e) => changeNilai(key, e.target.value)} onBlur={() => saveCell(s.id, k.id)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur() } }} className={`w-14 rounded-lg border px-2 py-1.5 text-center font-mono outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 ${dirty.has(key) ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white'}`}/>{savingKey === key && <span className="absolute -right-1 -top-1 w-2 h-2 rounded-full bg-blue-500 animate-pulse"/>}</div></td>})}<td className="px-3 py-2.5 text-center font-extrabold text-emerald-700 bg-emerald-50/40">{average(s.id)}</td></tr>)}</tbody></table>{siswa.length === 0 && !loadingSiswa && <div className="py-14 text-center text-sm text-slate-400">Tidak ada siswa yang cocok dengan pencarian.</div>}</div><div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center"><span className="text-xs text-slate-500">Nilai Akhir = Harian 40% + UTS 25% + UAS 35%.</span>{dirty.size > 0 && <button onClick={saveAll} className="ml-auto rounded-lg bg-emerald-600 text-white px-3 py-2 text-xs font-bold flex items-center gap-2"><Save size={14}/>Simpan {dirty.size} Perubahan</button>}</div></div>
    </>}

    {showMapel && <Modal title="Kelola Mata Pelajaran" onClose={() => setShowMapel(false)} maxWidth="max-w-lg"><div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4"><div className="flex items-start gap-3"><Sparkles size={19} className="mt-0.5 shrink-0 text-emerald-600"/><div className="flex-1"><div className="text-sm font-bold text-emerald-900">Rekomendasi Kelas {tingkat} · Fase {getPhaseForGrade(tingkat)}</div><p className="mt-1 text-xs text-emerald-700">Menambahkan mapel Kurikulum Merdeka yang belum tersedia. Mapel buatan Anda tetap aman.</p><button type="button" onClick={addRecommendations} className="mt-3 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white">Tambahkan Rekomendasi</button></div></div></div><form onSubmit={submitMapel} className="grid grid-cols-[1fr_110px_auto] gap-2 mb-4"><input required value={mapelForm.nama} onChange={(e) => setMapelForm({ ...mapelForm, nama: e.target.value })} placeholder="Nama mata pelajaran" className="field"/><input value={mapelForm.kode} onChange={(e) => setMapelForm({ ...mapelForm, kode: e.target.value })} placeholder="Kode" className="field"/><button className="rounded-xl bg-emerald-600 text-white px-4 text-sm font-bold">Tambah</button></form><div className="space-y-2">{mapelList.map((m) => <div key={m.id} className="rounded-xl border border-slate-200 p-3 flex items-center"><div><div className="text-sm font-bold text-slate-700">{m.nama}</div><div className="text-xs text-slate-400">{m.kode || 'Tanpa kode'}</div></div><button onClick={() => setDeleteTarget({ type: 'mapel', id: m.id, name: m.nama })} className="ml-auto rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-500 hover:bg-red-50 hover:text-red-700"><Trash2 size={15}/></button></div>)}</div></Modal>}
    {showKomponen && <Modal title={editKomponen ? 'Edit Nilai Harian' : 'Tambah Nilai Harian'} onClose={() => { setShowKomponen(false); setEditKomponen(null) }} footer={<><button onClick={() => setShowKomponen(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold">Batal</button><button form="komponen-form" className="rounded-xl bg-emerald-600 text-white px-5 py-2.5 text-sm font-bold">Simpan</button></>}><form id="komponen-form" onSubmit={submitKomponen} className="space-y-4"><label className="text-sm font-semibold text-slate-700 block">Nama nilai harian <span className="text-red-500">*</span><input required value={komponenForm.label} onChange={(e) => setKomponenForm({ ...komponenForm, label: e.target.value })} placeholder="Contoh: Harian 1" className="field mt-1.5"/></label><div><div className="text-xs font-bold text-slate-500 mb-2">Pilihan nama</div><div className="flex flex-wrap gap-2">{['Harian', 'Tugas', 'Praktik', 'Projek'].map((x) => <button type="button" key={x} onClick={() => setKomponenForm({ ...komponenForm, label: `${x} ${komponen.filter((k) => !isFixed(k)).length + 1}` })} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold hover:border-emerald-300">{x}</button>)}</div></div><label className="text-sm font-semibold text-slate-700 block">Tanggal <span className="text-slate-400 font-normal">(Opsional)</span><input type="date" value={komponenForm.tanggal} onChange={(e) => setKomponenForm({ ...komponenForm, tanggal: e.target.value })} className="field mt-1.5"/></label><label className="text-sm font-semibold text-slate-700 block">Catatan <span className="text-slate-400 font-normal">(Opsional)</span><input value={komponenForm.catatan} onChange={(e) => setKomponenForm({ ...komponenForm, catatan: e.target.value })} className="field mt-1.5"/></label></form></Modal>}
    {showBobot && <Modal title="Pengaturan Persentase Nilai" onClose={() => setShowBobot(false)} footer={<button disabled={bobot.harian + bobot.uts + bobot.uas !== 100} onClick={saveBobot} className="rounded-xl bg-emerald-600 text-white px-5 py-2.5 text-sm font-bold disabled:opacity-40">Simpan</button>}><div className="space-y-4"><p className="text-sm text-slate-500">Total persentase harus 100%.</p><div className="grid grid-cols-3 gap-3">{([['harian','Harian'],['uts','UTS'],['uas','UAS']] as const).map(([key,label]) => <label key={key} className="text-sm font-bold">{label}<input type="number" min="0" max="100" value={bobot[key]} onChange={(e) => setBobot({ ...bobot, [key]: Number(e.target.value) })} className="field mt-2"/></label>)}</div><div className={`rounded-xl px-4 py-3 font-bold ${bobot.harian + bobot.uts + bobot.uas === 100 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>Total: {bobot.harian + bobot.uts + bobot.uas}%</div></div></Modal>}
    <ConfirmDialog open={!!deleteTarget} title={deleteTarget?.type === 'mapel' ? 'Hapus Mata Pelajaran' : 'Hapus Komponen Penilaian'} message={deleteTarget?.type === 'mapel' ? `Hapus ${deleteTarget?.name}? Semua komponen dan nilai di dalamnya akan ikut terhapus.` : `Hapus ${deleteTarget?.name}? Semua nilai siswa pada komponen ini akan ikut terhapus.`} onCancel={() => setDeleteTarget(null)} onConfirm={confirmDelete}/>
    {toast && <div className="fixed inset-x-0 top-6 z-[500] flex justify-center pointer-events-none px-4"><div className={`pointer-events-auto flex items-center gap-3 rounded-2xl border bg-white px-5 py-3.5 shadow-xl text-sm font-semibold ${toast.type === 'success' ? 'border-emerald-200 text-emerald-800' : 'border-red-200 text-red-800'}`}>{toast.type === 'success' ? <span className="w-8 h-8 rounded-full bg-emerald-100 grid place-items-center"><CheckCircle2 size={18}/></span> : <span className="w-8 h-8 rounded-full bg-red-100 grid place-items-center"><AlertCircle size={18}/></span>}<span>{toast.text}</span><button onClick={() => setToast(null)} className="ml-3 opacity-50"><X size={15}/></button></div></div>}
  </div>
}

function Empty({ title, text, action, onAction }: { title: string; text: string; action: string; onAction: () => void }) { return <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center"><BookOpen size={36} className="mx-auto text-slate-300 mb-3"/><h2 className="font-bold text-slate-700">{title}</h2><p className="text-sm text-slate-400 mt-1 mb-4">{text}</p><button onClick={onAction} className="rounded-xl bg-emerald-600 text-white px-4 py-2.5 text-sm font-bold"><Plus size={15} className="inline mr-1"/>{action}</button></div> }
