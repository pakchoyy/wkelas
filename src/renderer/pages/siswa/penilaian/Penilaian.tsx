import { editSubject, addRecommendedSubjects } from '../../../../lib/subject-storage'
import {useUnsavedChanges} from '../../../hooks/useUnsavedChanges'
import { classWeightKey, saveGradeWeights } from '../../../../lib/grade-periods'
import { calculateGrade, DEFAULT_WEIGHTS, readGradeWeights, validateGradeWeights, orderedGradeColumns, nextDailyLabel } from '../../../../shared/grades'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  return <PenilaianKelas key={kelasId} kelasId={kelasId}/>
}
function PenilaianKelas({kelasId}:{kelasId:number}) {
  const { data: rawSiswa, loading: loadingSiswa } = useSiswaList(kelasId)
  const [kelasLabel, setKelasLabel] = useState('Kelas aktif')
  const [tingkat, setTingkat] = useState('1')
  const [mapelList, setMapelList] = useState<MataPelajaran[]>([])
  const [mapelId, setMapelId] = useState<number | null>(null)
  const [komponen, setKomponen] = useState<PenilaianKolom[]>([])
  const [nilaiMap, setNilaiMap] = useState<Record<string, number | null>>({})
  const draftRef = useRef<Record<string,number|null>>({})
  const revisions = useRef<Record<string,number>>({})
  const saveQueue = useRef(Promise.resolve())
  const [saveError,setSaveError] = useState('')
  const [pending,setPending] = useState(0)
  const viewRef = useRef('')
  viewRef.current = `${kelasId}:${mapelId}`
  const [dirty, setDirty] = useState<Set<string>>(new Set())
  const [savingKey, setSavingKey] = useState('')
  const [search, setSearch] = useState('')
  const [showKomponen, setShowKomponen] = useState(false)
  const [showMapel, setShowMapel] = useState(false)
  const [komponenForm, setKomponenForm] = useState({ label: '', bobot: '1', tanggal: '', catatan: '' })
  const [editMapelId, setEditMapelId] = useState<number | null>(null)
  const [mapelBusy, setMapelBusy] = useState(false)
  const mapelLock = useRef(false)
  const [mapelError, setMapelError] = useState('')
  const [mapelForm, setMapelForm] = useState({ nama: '', kode: '' })
  const [editKomponen, setEditKomponen] = useState<PenilaianKolom | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null)
  const [toast, setToast] = useState<Toast | null>(null)
  const [showBobot, setShowBobot] = useState(false)
  const [bobot, setBobot] = useState({ harian: 40, uts: 25, uas: 35 })
  const [bobotDraft, setBobotDraft] = useState({...DEFAULT_WEIGHTS})
  const [bobotError, setBobotError] = useState('')
  const [bobotSaving, setBobotSaving] = useState(false)
  const bobotLock = useRef(false)
  const [weightKey, setWeightKey] = useState('')
  const bobotDirty = showBobot && JSON.stringify(bobotDraft) !== JSON.stringify(bobot)
  const bobotValid = (() => { try { validateGradeWeights(bobotDraft); return true } catch { return false } })()
  const closeBobot = () => { if (!bobotLock.current && (!bobotDirty || window.confirm('Tutup tanpa menyimpan perubahan bobot?'))) setShowBobot(false) }
  const [mobileKomponenId, setMobileKomponenId] = useState<number | null>(null)
  const [columnPage, setColumnPage] = useState(0)
  useUnsavedChanges(dirty.size > 0 || bobotDirty,pending > 0 || bobotSaving)

  const siswa = useMemo(() => rawSiswa.filter((s) => s.nama.toLowerCase().includes(search.toLowerCase())).sort((a, b) => a.nama.localeCompare(b.nama, 'id')), [rawSiswa, search])
  useEffect(() => { db.kelas.get(kelasId).then((k) => { if (!k) return; setTingkat(k.tingkat); setKelasLabel(`${/^kelas\s/i.test(k.nama_kelas) ? k.nama_kelas : `Kelas ${k.nama_kelas}`} · ${k.tahun_ajaran} · Semester ${k.semester}`) }) }, [kelasId])
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const key = await classWeightKey(db,kelasId)
      const setting = await db.pengaturan.get(key)
      const weights = readGradeWeights(setting?.value)
      if (!cancelled) { setBobot(weights); setWeightKey(key) }
    })().catch(() => { if (!cancelled) setSaveError('Bobot nilai gagal dimuat atau tidak valid. Muat ulang halaman sebelum melanjutkan.') })
    return () => { cancelled = true }
  }, [kelasId])
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 3500); return () => clearTimeout(t) }, [toast])

  const loadMapel = useCallback(async () => {
    const list = await window.electronAPI.mapel.list(kelasId)
    const active=list.filter((item:any)=>item.is_aktif!==0)
    setMapelList(active)
    setMapelId((current) => current && active.some((m) => m.id === current) ? current : active[0]?.id || null)
  }, [kelasId])
  const loadKomponen = useCallback(async () => { const view=viewRef.current; if (!mapelId) { setKomponen([]); return }; const rows=await window.electronAPI.kolom.list(mapelId); if(viewRef.current===view)setKomponen(rows) }, [mapelId])
  const ensureFixedScores = useCallback(async () => {
    if (!mapelId) return
    const list = await window.electronAPI.kolom.list(mapelId)
    let changed = false
    if (!list.some((k) => k.label.toUpperCase() === 'UTS')) { await window.electronAPI.kolom.create({ mata_pelajaran_id: mapelId, label: 'UTS', bobot: 1, tanggal: null, urutan: 900 }); changed = true }
    if (!list.some((k) => k.label.toUpperCase() === 'UAS')) { await window.electronAPI.kolom.create({ mata_pelajaran_id: mapelId, label: 'UAS', bobot: 1, tanggal: null, urutan: 901 }); changed = true }
    if (changed) await loadKomponen()
  }, [mapelId, loadKomponen])
  const loadNilai = useCallback(async () => {
    const view=viewRef.current
    if (!mapelId || rawSiswa.length === 0) { setNilaiMap({...draftRef.current}); return }
    const values = await window.electronAPI.nilai.getAll(mapelId, rawSiswa.map((s) => s.id))
    if(viewRef.current!==view)return
    setNilaiMap({...values,...draftRef.current})
    setDirty(new Set(Object.keys(draftRef.current)))
  }, [mapelId, rawSiswa])
  useEffect(() => { loadMapel() }, [loadMapel])
  useEffect(() => { loadKomponen().then(ensureFixedScores); loadNilai() }, [loadKomponen, loadNilai, ensureFixedScores])

  const switchMapel = (id:number) => {
    if(Object.keys(draftRef.current).length) {setSaveError('Masih ada nilai belum tersimpan. Klik Simpan Perubahan sebelum berganti mata pelajaran.');return}
    setSaveError('');setKomponen([]);setNilaiMap({});setMapelId(id)
  }
  const changeNilai = (key:string,raw:string) => {
    const parsed=raw==='' ? null : Math.min(100,Math.max(0,Number(raw)))
    const value=Number.isNaN(parsed) ? null : parsed
    draftRef.current[key]=value;revisions.current[key]=(revisions.current[key] || 0)+1
    setNilaiMap(m=>({...m,[key]:value}));setDirty(new Set(Object.keys(draftRef.current)))
  }
  const saveCell = (siswaId:number,komponenId:number) => {
    const key=`${siswaId}-${komponenId}`
    if(!(key in draftRef.current))return Promise.resolve()
    const value=draftRef.current[key];const revision=revisions.current[key]
    setPending(n=>n+1)
    const task=saveQueue.current.then(async()=>{
      setSavingKey(key)
      try {
        await window.electronAPI.nilai.save(siswaId,komponenId,value)
        if(revisions.current[key]===revision)delete draftRef.current[key]
        setDirty(new Set(Object.keys(draftRef.current)))
      } catch {setSaveError('Nilai gagal disimpan. Isian tetap tersedia. Klik Simpan Perubahan untuk mencoba lagi.')}
      finally {setSavingKey('');setPending(n=>n-1)}
    })
    saveQueue.current=task
    return task
  }
  const saveAll = async () => {
    setSaveError('')
    const keys=Object.keys(draftRef.current)
    await Promise.all(keys.map(key=>{const [sid,kid]=key.split('-').map(Number);return saveCell(sid,kid)}))
    if(!Object.keys(draftRef.current).length)setToast({type:'success',text:'Semua perubahan nilai berhasil disimpan.'})
  }
  const isFixed = (k: PenilaianKolom) => ['UTS', 'UAS'].includes(k.label.toUpperCase())
  const orderedKomponen = orderedGradeColumns(komponen)
  const mobileKomponen = orderedKomponen.find(k => k.id === mobileKomponenId) || orderedKomponen[0]
  const dailyKomponen = orderedKomponen.filter((item) => !isFixed(item))
  const columnLabel = (column: PenilaianKolom) => isFixed(column) ? column.label : `H${dailyKomponen.findIndex(item => item.id === column.id) + 1} · ${column.label}`
  const fixedKomponen = orderedKomponen.filter(isFixed)
  const pageSize = 5
  const totalColumnPages = Math.max(1, Math.ceil(dailyKomponen.length / pageSize))
  const visibleKomponen = [...dailyKomponen.slice(columnPage * pageSize, (columnPage + 1) * pageSize), ...fixedKomponen]
  useEffect(() => { setColumnPage(0) }, [mapelId])
  useEffect(() => { if (columnPage >= totalColumnPages) setColumnPage(totalColumnPages - 1) }, [columnPage, totalColumnPages])
  const average = (sid: number) => { if (!weightKey) return '—'; const result = calculateGrade(komponen,nilaiMap,sid,bobot); return result.akhir === null ? '—' : `${result.akhir.toFixed(1)}${result.lengkap ? '' : ' *'}` }

  const submitMapel = async (e: React.FormEvent) => {
    e.preventDefault(); if(mapelLock.current)return
    mapelLock.current=true;setMapelBusy(true);setMapelError('')
    try {
      if(editMapelId) await editSubject(db,kelasId,editMapelId,mapelForm)
      else { if(!mapelForm.nama.trim()) throw new Error('Nama wajib diisi.'); await window.electronAPI.mapel.create({kelas_id:kelasId,...mapelForm,nama:mapelForm.nama.trim(),urutan:mapelList.length+1}) }
      setEditMapelId(null);setMapelForm({nama:'',kode:''});await loadMapel()
      setToast({type:'success',text:'Mata pelajaran tersimpan.'})
    } catch(error) {setMapelError(error instanceof Error ? error.message : 'Mapel gagal disimpan.')}
    finally {mapelLock.current=false;setMapelBusy(false)}
  }
  const addRecommendations = async () => {
    if(mapelLock.current)return
    mapelLock.current=true;setMapelBusy(true);setMapelError('')
    try {const count=await addRecommendedSubjects(db,kelasId,tingkat);await loadMapel();setToast({type:'success',text:`${count} mapel ditambahkan.`})}
    catch {setMapelError('Rekomendasi gagal ditambahkan.')}
    finally {mapelLock.current=false;setMapelBusy(false)}
  }
  const submitKomponen = async (e: React.FormEvent) => {
    e.preventDefault(); if (!mapelId) return
    const dailyCount = komponen.filter((k) => !isFixed(k)).length
    const data = { mata_pelajaran_id: mapelId, label: komponenForm.label || nextDailyLabel(komponen), bobot: 1, tanggal: komponenForm.tanggal || null, catatan: komponenForm.catatan || null, urutan: editKomponen?.urutan || dailyCount + 1 }
    try { editKomponen ? await window.electronAPI.kolom.update(editKomponen.id, data) : await window.electronAPI.kolom.create(data); setShowKomponen(false); setEditKomponen(null); setKomponenForm({ label: '', bobot: '1', tanggal: '', catatan: '' }); await loadKomponen(); setToast({ type: 'success', text: `Komponen penilaian berhasil ${editKomponen ? 'diperbarui' : 'ditambahkan'}.` }) }
    catch { setToast({ type: 'error', text: 'Komponen penilaian gagal disimpan.' }) }
  }
  const confirmDelete = async () => {
    if (!deleteTarget) return
    if(Object.keys(draftRef.current).length) {window.alert('Simpan perubahan nilai sebelum menghapus mapel atau komponen.');return}
    try {
      if (deleteTarget.type === 'mapel') await window.electronAPI.mapel.delete(deleteTarget.id); else await window.electronAPI.kolom.delete(deleteTarget.id)
      setDeleteTarget(null); await (deleteTarget.type === 'mapel' ? loadMapel() : loadKomponen()); setToast({ type: 'success', text: `${deleteTarget.name} berhasil dihapus.` })
    } catch(error) { window.alert(error instanceof Error ? error.message : 'Data gagal dihapus.') }
  }
  const openKomponen = (item?: PenilaianKolom) => { setEditKomponen(item || null); const nextNo = komponen.filter((k) => !isFixed(k)).length + 1; setKomponenForm(item ? { label: item.label, bobot: '1', tanggal: item.tanggal || '', catatan: item.catatan || '' } : { label: nextDailyLabel(komponen), bobot: '1', tanggal: '', catatan: '' }); setShowKomponen(true) }
  const selectedMapel = mapelList.find((m) => m.id === mapelId)
  const saveBobot = async () => {
    if (bobotLock.current || !weightKey) return
    bobotLock.current = true; setBobotSaving(true); setBobotError('')
    try {
      const saved = await saveGradeWeights(db,kelasId,weightKey,bobotDraft)
      setBobot(saved); setShowBobot(false)
      setToast({type:'success',text:'Persentase nilai berhasil disimpan untuk semua mapel pada semester aktif.'})
    } catch(error) { setBobotError(error instanceof Error ? error.message : 'Bobot gagal disimpan. Isian tetap tersedia; coba lagi.') }
    finally { bobotLock.current = false; setBobotSaving(false) }
  }

  return <div className="max-w-[1440px] mx-auto pb-20">{saveError && <p role="alert" className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{saveError}</p>}{pending > 0 && <p role="status" className="mb-3 text-sm">Menyimpan perubahan nilai...</p>}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-5"><div><div className="flex items-center gap-2"><BookOpen size={21} className="text-emerald-600"/><h1 className="text-xl font-extrabold text-slate-900">Penilaian</h1></div><p className="text-sm text-slate-500 mt-1">{kelasLabel}</p></div><div className="flex flex-wrap gap-2"><button onClick={() => openKomponen()} disabled={!mapelId} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-40 flex gap-2 items-center"><Plus size={16}/>Tambah Ulangan Harian</button><button disabled={!weightKey} onClick={() => { setBobotDraft({...bobot}); setBobotError(''); setShowBobot(true) }} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 flex gap-2 items-center"><Settings2 size={16}/>Pengaturan Nilai</button><button onClick={() => setShowMapel(true)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 flex gap-2 items-center"><BookOpen size={16}/>Mata Pelajaran</button></div></div>

    {mapelList.length === 0 ? <Empty title="Belum ada mata pelajaran" text="Tambahkan mata pelajaran sebelum mulai mengisi nilai." action="Tambah Mata Pelajaran" onAction={() => setShowMapel(true)}/> : <>
      <div className="rounded-2xl bg-white border border-slate-200 p-3 mb-4 flex flex-col md:flex-row gap-3 md:items-center">
        <div className="relative"><select aria-label="Mata pelajaran" value={mapelId || ''} onChange={(e) => switchMapel(Number(e.target.value))} className="appearance-none min-w-0 w-full md:w-64 min-h-11 rounded-xl border border-slate-200 bg-slate-50 pl-4 pr-10 py-2.5 text-base lg:text-sm font-bold text-slate-700 outline-none focus:border-emerald-500">{mapelList.map((m) => <option key={m.id} value={m.id}>{m.nama}{m.kode ? ` (${m.kode})` : ''}</option>)}</select><ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/></div>
        <div className="relative flex-1 max-w-md"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input aria-label="Cari nama siswa" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama siswa..." className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-11 py-2.5 text-base lg:text-sm outline-none focus:bg-white focus:border-emerald-500"/>{search && <button onClick={() => setSearch('')} aria-label="Hapus pencarian" className="absolute right-0 top-1/2 -translate-y-1/2 size-11 grid place-items-center text-slate-400"><X size={14}/></button>}</div>
        {totalColumnPages > 1 && <div className="md:ml-auto hidden lg:flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1"><button disabled={columnPage === 0} onClick={() => setColumnPage((page) => page - 1)} className="rounded-lg p-1.5 hover:bg-white disabled:opacity-30" title="Kolom sebelumnya"><ChevronLeft size={16}/></button><span className="min-w-20 text-center text-xs font-bold text-slate-500">Bagian {columnPage + 1}/{totalColumnPages}</span><button disabled={columnPage === totalColumnPages - 1} onClick={() => setColumnPage((page) => page + 1)} className="rounded-lg p-1.5 hover:bg-white disabled:opacity-30" title="Kolom berikutnya"><ChevronRight size={16}/></button></div>}
      </div>

      <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900"><strong>Mulai dari ulangan harian.</strong> Klik <strong>Tambah Ulangan Harian</strong> untuk membuat kolom nilai baru, beri nama dan tanggalnya, lalu isi nilai tiap siswa. Kolom UTS dan UAS tersedia otomatis; Nilai Akhir mengikuti bobot yang diatur.</div>

      <section className="lg:hidden mb-4" aria-label="Input nilai per komponen">
        <div className="rounded-xl border border-slate-200 bg-white p-4 mb-3">
          <label className="block text-sm font-bold">Komponen nilai<select value={mobileKomponen?.id || ''} onChange={e => setMobileKomponenId(Number(e.target.value))} className="field mt-2">{orderedKomponen.map(k => <option key={k.id} value={k.id}>{columnLabel(k)}{k.tanggal ? ` · ${k.tanggal}` : ''}</option>)}</select></label>
          <p className="mt-2 text-sm text-slate-500">Isi nilai 0–100. Kosong berarti belum dinilai. Nilai disimpan saat berpindah kolom.</p>
          {mobileKomponen && !isFixed(mobileKomponen) && <div className="mt-2 flex flex-wrap gap-2"><button onClick={() => openKomponen(mobileKomponen)} className="min-h-11 rounded-lg border px-3 text-sm">Edit komponen</button><button onClick={() => setDeleteTarget({type:'komponen',id:mobileKomponen.id,name:mobileKomponen.label})} className="min-h-11 rounded-lg border border-red-200 px-3 text-sm text-red-700">Hapus komponen</button></div>}
        </div>
        <div className="space-y-3">{mobileKomponen && siswa.map(student => {
          const key = `${student.id}-${mobileKomponen.id}`
          return <article key={student.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="font-bold break-words">{student.nama}</h3>
            <div className="mt-3 flex flex-wrap items-end justify-between gap-3"><label className="min-w-0 flex-1 text-sm text-slate-600"><span className="block break-words">{columnLabel(mobileKomponen)}</span><input aria-label={`${mobileKomponen.label} untuk ${student.nama}`} type="number" inputMode="decimal" min="0" max="100" step=".5" value={nilaiMap[key] ?? ''} onChange={e => changeNilai(key,e.target.value)} onBlur={() => saveCell(student.id,mobileKomponen.id)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur() } }} className={`mt-1 min-h-11 w-24 rounded-lg border p-2 text-base text-center ${dirty.has(key) ? 'border-amber-400 bg-amber-50' : 'border-slate-200'}`}/></label><p className="text-sm text-slate-500">Nilai akhir <strong className="block text-lg text-emerald-700">{average(student.id)}</strong></p></div>
            <p role="status" className="mt-2 text-xs text-slate-500">{savingKey === key ? 'Menyimpan...' : dirty.has(key) ? 'Perubahan belum tersimpan' : nilaiMap[key] == null ? 'Belum dinilai' : 'Tersimpan'}</p>
          </article>
        })}</div>
        {!siswa.length && <p className="p-6 text-center text-sm text-slate-500">{loadingSiswa ? 'Memuat siswa...' : rawSiswa.length ? 'Tidak ada siswa yang cocok dengan pencarian.' : 'Tambahkan siswa melalui menu Data Siswa.'}</p>}
      </section>
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden"><div className="hidden lg:block overflow-auto max-h-[65vh]"><table className="w-full table-fixed text-xs"><thead className="sticky top-0 z-20"><tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500"><th className="w-8 px-1 py-3 text-center">No.</th><th className="w-36 px-2 py-3 text-left sticky left-0 bg-slate-50 z-30">Nama Siswa</th>{visibleKomponen.map((k) => <th key={k.id} className={`w-[10%] px-1 py-2 text-center ${isFixed(k) ? 'bg-blue-50/70' : ''}`}><div className="text-[9px] tracking-wider mb-1 text-slate-400">{isFixed(k) ? 'NILAI SEMESTER' : 'NILAI HARIAN'}</div><div className="flex justify-center gap-1 items-center"><span title={k.label} className="normal-case text-slate-700 font-bold">{isFixed(k) ? k.label : `H${dailyKomponen.findIndex((item) => item.id === k.id) + 1}`}</span>{!isFixed(k) && <><button onClick={() => openKomponen(k)} className="p-1 text-slate-400 hover:text-emerald-700"><Pencil size={12}/></button><button onClick={() => setDeleteTarget({ type: 'komponen', id: k.id, name: k.label })} className="p-1 text-slate-400 hover:text-red-600"><Trash2 size={12}/></button></>}</div>{k.tanggal && <div className="normal-case text-[10px] text-slate-400 font-normal mt-1">{k.tanggal}</div>}</th>)}<th className="w-[10%] px-1 py-2 text-center bg-emerald-50">Nilai Akhir</th></tr></thead><tbody>{siswa.map((s, index) => <tr key={s.id} className={`${index % 2 ? 'bg-slate-50/60' : 'bg-white'} border-b border-slate-100 hover:bg-emerald-50/40`}><td className="px-3 py-2.5 text-center font-semibold text-slate-400">{index + 1}</td><td className={`px-2 py-2.5 sticky left-0 z-10 font-semibold text-slate-800 ${index % 2 ? 'bg-slate-50' : 'bg-white'}`}>{s.nama}</td>{visibleKomponen.map((k) => { const key = `${s.id}-${k.id}`; return <td key={k.id} className={`px-1.5 py-2 text-center ${isFixed(k) ? 'bg-blue-50/30' : ''}`}><div className="relative inline-block"><input type="number" min="0" max="100" step=".5" value={nilaiMap[key] ?? ''} onChange={(e) => changeNilai(key, e.target.value)} onBlur={() => saveCell(s.id, k.id)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur() } }} className={`w-14 rounded-lg border px-2 py-1.5 text-center font-mono outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 ${dirty.has(key) ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white'}`}/>{savingKey === key && <span className="absolute -right-1 -top-1 w-2 h-2 rounded-full bg-blue-500 animate-pulse"/>}</div></td>})}<td className="px-3 py-2.5 text-center font-extrabold text-emerald-700 bg-emerald-50/40">{average(s.id)}</td></tr>)}</tbody></table>{siswa.length === 0 && !loadingSiswa && <div className="py-14 text-center text-sm text-slate-400">Tidak ada siswa yang cocok dengan pencarian.</div>}</div><div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap gap-3 items-center"><span className="text-xs text-slate-500">Harian {bobot.harian}% + UTS {bobot.uts}% + UAS {bobot.uas}%. * Nilai sementara: komponen belum lengkap.</span>{dirty.size > 0 && <button disabled={pending > 0} onClick={saveAll} className="min-h-11 rounded-lg bg-emerald-600 text-white px-3 py-2 text-xs font-bold flex items-center gap-2"><Save size={14}/>Simpan {dirty.size} Perubahan</button>}</div></div>
    </>}

    {showMapel && <Modal title="Mata Pelajaran" onClose={() => {if(!mapelLock.current)setShowMapel(false)}} maxWidth="max-w-lg">
      {mapelError && <p role="alert" className="mb-2 text-sm text-red-700">{mapelError}</p>}
      <fieldset disabled={mapelBusy} className="min-w-0">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs"><span>Kelas {tingkat} · Fase {getPhaseForGrade(tingkat)}</span><button onClick={addRecommendations} className="min-h-11 rounded-lg bg-emerald-50 px-3 font-semibold text-emerald-700">+ Mapel rekomendasi</button></div>
      <form onSubmit={submitMapel} className="mb-3 flex flex-wrap gap-2">
        <input aria-label="Nama mata pelajaran" required value={mapelForm.nama} onChange={e=>setMapelForm({...mapelForm,nama:e.target.value})} placeholder="Nama mapel" className="field !py-2 flex-1 !w-auto min-w-32"/>
        <input aria-label="Kode mapel" value={mapelForm.kode} onChange={e=>setMapelForm({...mapelForm,kode:e.target.value})} placeholder="Kode" className="field !w-20 !py-2"/>
        <button className="min-h-11 rounded-lg bg-emerald-600 px-3 text-sm font-bold text-white">{editMapelId ? 'Simpan' : 'Tambah'}</button>
        {editMapelId && <button type="button" onClick={()=>{setEditMapelId(null);setMapelForm({nama:'',kode:''})}} className="min-h-11 px-2 text-sm">Batal</button>}
      </form>
      <div className="divide-y rounded-lg border border-slate-200">{mapelList.map(m=><div key={m.id} className="flex items-center gap-2 px-3 py-1"><div className="min-w-0 flex-1"><div className="break-words text-sm font-semibold">{m.nama}</div>{m.kode && <div className="text-xs text-slate-400">{m.kode}</div>}</div><button aria-label={`Edit ${m.nama}`} onClick={()=>{setEditMapelId(m.id);setMapelForm({nama:m.nama,kode:m.kode||''});setMapelError('')}} className="size-11 shrink-0 grid place-items-center text-emerald-700"><Pencil size={16}/></button><button aria-label={`Hapus ${m.nama}`} onClick={()=>setDeleteTarget({type:'mapel',id:m.id,name:m.nama})} className="size-11 shrink-0 grid place-items-center text-red-500"><Trash2 size={16}/></button></div>)}</div>
      </fieldset>
    </Modal>}
    {showKomponen && <Modal title={editKomponen ? 'Edit Nilai Harian' : 'Tambah Nilai Harian'} onClose={() => { setShowKomponen(false); setEditKomponen(null) }} footer={<><button onClick={() => setShowKomponen(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold">Batal</button><button form="komponen-form" className="rounded-xl bg-emerald-600 text-white px-5 py-2.5 text-sm font-bold">Simpan</button></>}><form id="komponen-form" onSubmit={submitKomponen} className="space-y-4"><label className="text-sm font-semibold text-slate-700 block">Nama nilai harian <span className="text-red-500">*</span><input required value={komponenForm.label} onChange={(e) => setKomponenForm({ ...komponenForm, label: e.target.value })} placeholder="Contoh: Harian 1" className="field mt-1.5"/></label><div><div className="text-xs font-bold text-slate-500 mb-2">Pilihan nama</div><div className="flex flex-wrap gap-2">{['Harian', 'Tugas', 'Praktik', 'Projek'].map((x) => <button type="button" key={x} onClick={() => setKomponenForm({ ...komponenForm, label: `${x} ${komponen.filter((k) => !isFixed(k)).length + 1}` })} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold hover:border-emerald-300">{x}</button>)}</div></div><label className="text-sm font-semibold text-slate-700 block">Tanggal <span className="text-slate-400 font-normal">(Opsional)</span><input type="date" value={komponenForm.tanggal} onChange={(e) => setKomponenForm({ ...komponenForm, tanggal: e.target.value })} className="field mt-1.5"/></label><label className="text-sm font-semibold text-slate-700 block">Catatan <span className="text-slate-400 font-normal">(Opsional)</span><input value={komponenForm.catatan} onChange={(e) => setKomponenForm({ ...komponenForm, catatan: e.target.value })} className="field mt-1.5"/></label></form></Modal>}
    {showBobot && <Modal title="Pengaturan Persentase Nilai" onClose={closeBobot} footer={<button disabled={!bobotValid || bobotSaving} onClick={saveBobot} className="rounded-xl bg-emerald-600 text-white px-5 py-2.5 text-sm font-bold disabled:opacity-40">{bobotSaving ? 'Menyimpan...' : 'Simpan'}</button>}>
      {bobotError && <p role="alert" className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{bobotError}</p>}
      <fieldset disabled={bobotSaving} className="min-w-0 space-y-4">
        <p className="text-sm text-slate-500">Berlaku untuk semua mata pelajaran pada semester aktif. Nilai akhir baru berubah setelah bobot berhasil disimpan.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">{([['harian','Harian'],['uts','UTS'],['uas','UAS']] as const).map(([key,label]) => <label key={key} className="text-sm font-bold">{label}<input type="number" min="0" max="100" step="any" value={bobotDraft[key]} onChange={e => setBobotDraft({...bobotDraft,[key]:Number(e.target.value)})} className="field mt-2"/></label>)}</div>
        <div className={`rounded-xl px-4 py-3 font-bold ${bobotValid ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>Total: {Number((bobotDraft.harian + bobotDraft.uts + bobotDraft.uas).toFixed(4))}%{!bobotValid && <p className="mt-1 text-sm font-normal">Setiap bobot harus 0–100% dan totalnya 100%.</p>}</div>
        <p className="text-xs text-slate-500">Harian dihitung dari rata-rata nilai yang sudah diisi. Nilai 0 tetap dihitung; kolom kosong berarti belum dinilai. Tanda * menunjukkan nilai sementara, memakai perbandingan bobot komponen yang tersedia.</p>
      </fieldset>
    </Modal>}
    <ConfirmDialog open={!!deleteTarget} title={deleteTarget?.type === 'mapel' ? 'Hapus Mata Pelajaran' : 'Hapus Komponen Penilaian'} message={deleteTarget?.type === 'mapel' ? `Hapus ${deleteTarget?.name}? Semua komponen dan nilai semua periode ikut terhapus. Mapel yang masih dipakai jadwal/rencana tidak dapat dihapus.` : `Hapus ${deleteTarget?.name}? Semua nilai siswa pada komponen ini akan ikut terhapus.`} onCancel={() => setDeleteTarget(null)} onConfirm={confirmDelete}/>
    {toast && <div className="fixed inset-x-0 top-6 z-[500] flex justify-center pointer-events-none px-4"><div className={`pointer-events-auto flex items-center gap-3 rounded-2xl border bg-white px-5 py-3.5 shadow-xl text-sm font-semibold ${toast.type === 'success' ? 'border-emerald-200 text-emerald-800' : 'border-red-200 text-red-800'}`}>{toast.type === 'success' ? <span className="w-8 h-8 rounded-full bg-emerald-100 grid place-items-center"><CheckCircle2 size={18}/></span> : <span className="w-8 h-8 rounded-full bg-red-100 grid place-items-center"><AlertCircle size={18}/></span>}<span>{toast.text}</span><button onClick={() => setToast(null)} className="ml-3 opacity-50"><X size={15}/></button></div></div>}
  </div>
}

function Empty({ title, text, action, onAction }: { title: string; text: string; action: string; onAction: () => void }) { return <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center"><BookOpen size={36} className="mx-auto text-slate-300 mb-3"/><h2 className="font-bold text-slate-700">{title}</h2><p className="text-sm text-slate-400 mt-1 mb-4">{text}</p><button onClick={onAction} className="rounded-xl bg-emerald-600 text-white px-4 py-2.5 text-sm font-bold"><Plus size={15} className="inline mr-1"/>{action}</button></div> }
