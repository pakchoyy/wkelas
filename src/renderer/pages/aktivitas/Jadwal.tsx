import { resolveScheduleTime, excelTime, schedulePreset } from '../../../shared/schedule'
import { importSchedule } from '../../../lib/schedule-storage'
import { useState, useEffect, useRef } from 'react'
import { Download, Settings2, Trash2, Upload } from 'lucide-react'
import { useAppStore } from '../../stores/appStore'
import ConfirmDialog from '../../components/ConfirmDialog'
import type { Jadwal as JadwalType, MataPelajaran } from '../../../shared/types'
import { db } from '../../../lib/db'
import Modal from '../../components/Modal'

const HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']
const ISTIRAHAT_UMUM = [{mulai:'09:00',selesai:'09:30'},{mulai:'12:00',selesai:'12:30'}]
export default function Jadwal() {
  const kelasId = useAppStore((s) => s.kelasAktifId) || 1
  const [importing, setImporting] = useState(false)
  const importLock = useRef(false)
  const [importResult, setImportResult] = useState<{ok:number;dilewati:number;gagal:number;pesan:string[]}|null>(null)
  const [data, setData] = useState<JadwalType[]>([])
  const [mapelList, setMapelList] = useState<MataPelajaran[]>([])
  const [showForm, setShowForm] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [usePreset, setUsePreset] = useState(false)
  const [preset, setPreset] = useState({start:'07:00',duration:35,breakAfter:3,breakMinutes:15})
  const settingsLock = useRef(false)
  const [settingsBusy, setSettingsBusy] = useState(false)
  const [settingsError, setSettingsError] = useState('')
  const [settingsDraft, setSettingsDraft] = useState({hariSekolah:5,jumlahJam:10})
  const [settingsBreaks, setSettingsBreaks] = useState<number[]>([])
  const [settingsTimes, setSettingsTimes] = useState<Record<number,{mulai:string;selesai:string}>>({})
  const [hariSekolah, setHariSekolah] = useState<5 | 6>(5)
  const [selectedDay, setSelectedDay] = useState(() => { const day = new Date().getDay(); return day >= 1 && day <= 5 ? day : 1 })
  const activeDay = Math.min(selectedDay, hariSekolah)
  const [jumlahJam, setJumlahJam] = useState(10)
  const [waktuJam, setWaktuJam] = useState<Record<number,{mulai:string;selesai:string}>>({})
  const [istirahat, setIstirahat] = useState<number[]>([])
  const [editId, setEditId] = useState<number | null>(null)
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null)
  const [form, setForm] = useState({ hari: 1, jam_ke: 1, jam_mulai: '07:00', jam_selesai: '08:00', mata_pelajaran_id: '', nama_mapel_custom: '', nama_guru: '', ruang: '' })
  const [confirmImport, setConfirmImport] = useState<{ file: File; rows: number } | null>(null)
  const [pendingImport, setPendingImport] = useState<{ parsed: any[]; errors: string[] } | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)

  const load = async () => {
    setData(await window.electronAPI.jadwal.list(kelasId))
    setMapelList((await window.electronAPI.mapel.list(kelasId)).filter((item:any)=>item.is_aktif!==0))
  }

  useEffect(() => { load(); db.pengaturan.get(`presensi_${kelasId}`).then((x) => { if (x?.value) try { setHariSekolah(JSON.parse(x.value).hariSekolah || 5) } catch {} }); db.pengaturan.get(`jadwal_${kelasId}`).then((x) => { if (x?.value) try { const cfg=JSON.parse(x.value); const total=cfg.jumlahJam||10; setJumlahJam(total); setWaktuJam(cfg.waktuJam||{}); const breaks=Array.isArray(cfg.istirahat) ? cfg.istirahat.filter((jam:number) => jam >= 1 && jam <= total) : []; setIstirahat(breaks.length >= total ? [] : breaks) } catch {} }) }, [kelasId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (!form.mata_pelajaran_id && !form.nama_mapel_custom.trim()) throw new Error('Mata pelajaran wajib diisi')
      await window.electronAPI.jadwal.save({ ...form, kelas_id: kelasId, ...(editId ? { id: editId } : {}), mata_pelajaran_id: form.mata_pelajaran_id ? parseInt(form.mata_pelajaran_id) : null })
      setShowForm(false); setEditId(null)
      setForm({ hari: 1, jam_ke: 1, jam_mulai: '07:00', jam_selesai: '08:00', mata_pelajaran_id: '', nama_mapel_custom: '', nama_guru: '', ruang: '' })
      await load(); setToast({ text: 'Jadwal berhasil disimpan' })
    } catch (error) { setToast({ text: error instanceof Error ? error.message : 'Jadwal gagal disimpan', error: true }) }
  }

  const handleEdit = (item: JadwalType) => {
    setEditId(item.id)
    setForm({ hari: item.hari, jam_ke: item.jam_ke, jam_mulai: item.jam_mulai, jam_selesai: item.jam_selesai, mata_pelajaran_id: item.mata_pelajaran_id?.toString() || '', nama_mapel_custom: item.nama_mapel_custom || '', nama_guru: item.nama_guru || '', ruang: item.ruang || '' })
    setShowForm(true)
  }
  const handleCell = (hari: number, jam: number, item?: JadwalType) => { if (item) return handleEdit(item); setEditId(null); setForm({ hari, jam_ke: jam, jam_mulai: resolveScheduleTime(jam,waktuJam,data).mulai, jam_selesai: resolveScheduleTime(jam,waktuJam,data).selesai, mata_pelajaran_id: '', nama_mapel_custom: '', nama_guru: '', ruang: '' }); setShowForm(true) }
  const storeScheduleSettings = async (nextTimes=waktuJam,nextBreaks=istirahat) => db.pengaturan.put({ key:`jadwal_${kelasId}`,value:JSON.stringify({jumlahJam,waktuJam:nextTimes,istirahat:nextBreaks}),updated_at:new Date().toISOString() })
  const openSettings = () => {
    setSettingsDraft({hariSekolah,jumlahJam}); setUsePreset(false); setSettingsError('')
    setSettingsBreaks([...istirahat]); setSettingsTimes({...waktuJam})
    setShowSettings(true)
  }
  const saveSettings = async () => {
    if (settingsLock.current) return
    settingsLock.current = true; setSettingsBusy(true); setSettingsError('')
    try {
      if (![5,6].includes(settingsDraft.hariSekolah) || !Number.isInteger(settingsDraft.jumlahJam) || settingsDraft.jumlahJam < 1 || settingsDraft.jumlahJam > 16) throw new Error('Pilih 5 atau 6 hari dan 1–16 jam pelajaran.')
      const timing = usePreset ? schedulePreset(settingsDraft.jumlahJam, preset.start, preset.duration, preset.breakAfter, preset.breakMinutes) : null
      const finalBreaks = (timing ? timing.istirahat : settingsBreaks.filter(jam => jam >= 1 && jam <= settingsDraft.jumlahJam)).sort((a,b) => a - b)
      if (finalBreaks.length >= settingsDraft.jumlahJam) throw new Error('Sisakan minimal satu JP untuk pelajaran.')
      const finalTimes = {...settingsTimes, ...(timing ? timing.waktuJam : {})}
      await db.transaction('rw',[db.jadwal,db.pengaturan],async () => {
        const current = await db.jadwal.where({kelas_id:kelasId}).toArray()
        if (current.some(r => r.hari > settingsDraft.hariSekolah || r.jam_ke > settingsDraft.jumlahJam)) throw new Error('Masih ada jadwal di luar batas baru. Pindahkan atau hapus jadwal tersebut terlebih dahulu.')
        if (current.some(row => finalBreaks.includes(row.jam_ke))) throw new Error('Baris istirahat masih berisi mapel. Pindahkan mapelnya sebelum menyimpan.')
        if(timing) for(const row of current) await db.jadwal.update(row.id!,{jam_mulai:timing.waktuJam[row.jam_ke].mulai,jam_selesai:timing.waktuJam[row.jam_ke].selesai})
        const key = `jadwal_${kelasId}`
        const previous = await db.pengaturan.get(key)
        const cfg = previous ? JSON.parse(previous.value) : {}
        await db.pengaturan.put({key,value:JSON.stringify({...cfg,jumlahJam:settingsDraft.jumlahJam,istirahat:finalBreaks,waktuJam:finalTimes}),updated_at:new Date().toISOString()})
        const attendance = await db.pengaturan.get(`presensi_${kelasId}`)
        await db.pengaturan.put({key:`presensi_${kelasId}`,value:JSON.stringify({...attendance ? JSON.parse(attendance.value) : {},hariSekolah:settingsDraft.hariSekolah}),updated_at:new Date().toISOString()})
      })
      setWaktuJam(finalTimes); setIstirahat(finalBreaks)
      await load()
      setHariSekolah(settingsDraft.hariSekolah as 5|6); setJumlahJam(settingsDraft.jumlahJam); setShowSettings(false)
      setToast({text:'Pengaturan jadwal tersimpan'})
    } catch(error) { setSettingsError(error instanceof Error ? error.message : 'Pengaturan gagal disimpan.') }
    finally { settingsLock.current = false; setSettingsBusy(false) }
  }

  const getMapelName = (item: JadwalType) => item.nama_mapel_custom || mapelList.find((m) => m.id === item.mata_pelajaran_id)?.nama || '-'
  const setCell = async (hari: number, jam: number, value: string) => {
    if (value === 'custom') return
    const existing = data.find((item) => item.hari === hari && item.jam_ke === jam)
    try {
      if (!value) { if (existing?.id) await window.electronAPI.jadwal.delete(existing.id) }
      else await window.electronAPI.jadwal.save({ kelas_id: kelasId, hari, jam_ke: jam, jam_mulai: resolveScheduleTime(jam,waktuJam,data).mulai, jam_selesai: resolveScheduleTime(jam,waktuJam,data).selesai, mata_pelajaran_id: Number(value), nama_mapel_custom: '', nama_guru: existing?.nama_guru || '', ruang: existing?.ruang || '', ...(existing?.id ? { id: existing.id } : {}) })
      await load(); setToast({ text: 'Jadwal tersimpan otomatis' })
    } catch (error) { setToast({ text: error instanceof Error ? error.message : 'Jadwal gagal disimpan', error: true }) }
  }

  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(null), 3000); return () => clearTimeout(timer) }, [toast])

  const downloadTemplate = async () => {
    const XLSX = await import('xlsx')
    const rows = [['Hari', 'Jam Ke', 'Mulai', 'Selesai', 'Mata Pelajaran', 'Guru', 'Ruang'], ['Senin', 1, '07:00', '07:35', 'Matematika', '', 'Kelas']]
    const sheet = XLSX.utils.aoa_to_sheet(rows); sheet['!cols'] = [{ wch: 12 }, { wch: 9 }, { wch: 10 }, { wch: 10 }, { wch: 24 }, { wch: 20 }, { wch: 14 }]
    const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, sheet, 'Jadwal'); XLSX.writeFile(workbook, 'template-jadwal-pelajaran.xlsx')
  }

  const uploadTemplate = async (file?: File) => {
    if (!file || importLock.current) return
    importLock.current = true; setImporting(true); setImportResult(null)
    try {
      const XLSX = await import('xlsx')
      const workbook = XLSX.read(await file.arrayBuffer(), {type:'array'})
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[workbook.SheetNames[0]], {defval:''})
      if (!rows.length) throw new Error('File kosong. Gunakan template yang disediakan.')
      const parsed: {line:number;data:any}[] = []; const errors: string[] = []
      rows.forEach((row,index) => {
        const line = index + 2
        try {
          const hari = HARI.findIndex(day => day.toLowerCase() === String(row['Hari'] || '').trim().toLowerCase()) + 1
          const jam = Number(row['Jam Ke'])
          const name = String(row['Mata Pelajaran'] || '').trim()
          const subject = mapelList.find(item => item.nama.toLowerCase() === name.toLowerCase())
          const time = resolveScheduleTime(jam,waktuJam,data)
          parsed.push({line,data:{kelas_id:kelasId,hari,jam_ke:jam,jam_mulai:excelTime(row['Mulai'],time.mulai),jam_selesai:excelTime(row['Selesai'],time.selesai),mata_pelajaran_id:subject?.id || null,nama_mapel_custom:subject ? '' : name,nama_guru:String(row['Guru'] || ''),ruang:String(row['Ruang'] || '')}})
        } catch(error) { errors.push(`Baris ${line}: ${error instanceof Error ? error.message : 'Format tidak valid.'}`) }
      })
      setPendingImport({ parsed, errors })
      setConfirmImport({ file, rows: rows.length })
      importLock.current = false; setImporting(false)
      return
    } catch(error) { setToast({text:error instanceof Error ? error.message : 'File gagal dibaca.',error:true}); importLock.current = false; setImporting(false) }
  }

  const confirmImportAction = async () => {
    if (!pendingImport || !confirmImport) return
    const { parsed, errors } = pendingImport
    setConfirmImport(null)
    setPendingImport(null)
    importLock.current = true; setImporting(true)
    try {
      const result = await importSchedule(db,parsed)
      setImportResult({...result,gagal:result.gagal + errors.length,pesan:[...errors,...result.pesan]})
      await load()
    } catch(error) { setToast({text:error instanceof Error ? error.message : 'File gagal dibaca.',error:true}) }
    finally { importLock.current = false; setImporting(false) }
  }

  return (
    <fieldset disabled={importing} className="min-w-0">
      {importing && <p role="status">Mengimpor jadwal...</p>}
      {importResult && <div role="status" className="mb-4 rounded-xl border bg-white p-4 text-sm"><strong>{importResult.ok} ditambahkan · {importResult.dilewati} dilewati · {importResult.gagal} gagal</strong><div className="mt-2 max-h-48 overflow-y-auto">{importResult.pesan.map((message,index) => <p key={index}>{message}</p>)}</div></div>}
      {toast && <div className={`fixed left-1/2 top-20 w-[calc(100%_-_2rem)] max-w-md z-[100] -translate-x-1/2 rounded-xl px-5 py-3 text-sm font-bold text-white shadow-xl ${toast.error ? 'bg-red-600' : 'bg-emerald-600'}`}>{toast.text}</div>}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-xl font-bold">Jadwal Pelajaran</h2>
        <div className="flex flex-wrap gap-2 [&>button]:px-2 [&>label]:px-2 [&>*]:text-xs sm:[&>*]:text-sm"><button onClick={downloadTemplate} className="action-mint min-h-11 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600"><Download size={16}/><span className="sm:hidden">Template</span><span className="hidden sm:inline">Template Excel</span></button><label className="action-teal min-h-11 flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600"><Upload size={16}/><span className="sm:hidden">Unggah</span><span className="hidden sm:inline">Unggah Excel</span><input type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => { uploadTemplate(e.target.files?.[0]); e.currentTarget.value = '' }}/></label><button onClick={openSettings}
          className="action-primary min-h-11 flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white">
          <Settings2 size={16} /><span className="sm:hidden">Atur</span><span className="hidden sm:inline">Pengaturan</span>
        </button></div>
      </div>

      <section className="lg:hidden" aria-label="Agenda per hari">
        <div className="flex gap-1 pb-1" aria-label="Pilih hari">{HARI.slice(0,hariSekolah).map((day,index) => <button key={day} aria-pressed={activeDay === index + 1} onClick={() => setSelectedDay(index + 1)} className={`min-h-11 min-w-0 flex-1 rounded-lg border px-1 text-xs font-bold ${activeDay === index + 1 ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-200 bg-white text-slate-600'}`}>{day.slice(0,3)}</button>)}</div>
        <h3 className="my-3 font-bold">Jadwal {HARI[activeDay - 1]}</h3>
        <div className="space-y-3">{Array.from({length:jumlahJam},(_,index) => index + 1).map(jam => {
          const item = data.find(record => record.hari === activeDay && record.jam_ke === jam)
          const time = resolveScheduleTime(jam,waktuJam,data)
          const rest = istirahat.includes(jam)
          return <article key={jam} className={`rounded-lg border px-3 py-2 ${rest ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white'}`}>
            <div className="flex items-center justify-between gap-2 text-xs text-slate-500"><strong>{rest ? 'Istirahat' : `JP ${jam-istirahat.filter(row=>row<jam).length}`}</strong><span className="tabular-nums">{time.mulai}–{time.selesai}</span></div>
            <div className="mt-1.5">{rest ? <span className="block text-sm font-semibold text-amber-900">Istirahat</span> : <button onClick={()=>handleCell(activeDay,jam,item)} className="min-h-11 w-full rounded-lg bg-teal-50 px-2 text-left text-sm font-semibold text-teal-800">{item ? getMapelName(item) : '+ Pilih pelajaran'}</button>}</div>
          </article>
        })}</div>
      </section>
      <div className="hidden lg:block rounded-xl overflow-x-auto" style={{ background: 'var(--card-bg)', boxShadow: 'var(--shadow)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider" style={{ background: '#f8fafc' }}>
              <th className="px-3 py-3 text-left">Jam</th><th className="px-3 py-3 text-left">Waktu</th>
              {HARI.slice(0, hariSekolah).map((h, i) => <th key={i} className="px-3 py-3 text-left">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: jumlahJam }, (_, jam) => jam + 1).map((jam) => {
              const time = resolveScheduleTime(jam,waktuJam,data)
              return (
              <tr key={jam} className="border-t" style={{ borderColor: 'var(--border)' }}>
                <td className="px-3 py-2 text-xs font-semibold text-gray-500">{istirahat.includes(jam) ? 'Istirahat' : `JP ${jam-istirahat.filter(row=>row<jam).length}`}</td>
                <td className="whitespace-nowrap px-2 py-2 text-xs tabular-nums text-slate-600">{time.mulai}–{time.selesai}</td>
                {istirahat.includes(jam)?<td colSpan={hariSekolah} className="border-l bg-amber-50 text-center text-xs font-bold uppercase tracking-wider text-amber-700">Istirahat</td>:HARI.slice(0, hariSekolah).map((_, hari) => {
                  const item = data.find((d) => d.hari === hari + 1 && d.jam_ke === jam)
                  return (
                    <td key={hari} className="border-l px-2 py-2 text-xs" style={{ borderColor: 'var(--border)' }}><select value={item?.nama_mapel_custom ? 'custom' : item?.mata_pelajaran_id || ''} onChange={(e)=>setCell(hari+1,jam,e.target.value)} aria-label={`Pelajaran hari ${HARI[hari]} jam ${jam}`} className={`w-full rounded-lg border px-2 py-2 text-xs font-semibold outline-none ${item ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-400'}`}><option value="">— Kosong —</option>{item?.nama_mapel_custom && <option value="custom">{item.nama_mapel_custom}</option>}{mapelList.map((subject)=><option key={subject.id} value={subject.id}>{subject.nama}</option>)}</select></td>
                  )
                })}
              </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-slate-500">Ubah jam & istirahat lewat tombol Pengaturan di atas. Istirahat umum: 09.00–09.30 dan 12.00–12.30.</p>

      {showSettings && <Modal title="Pengaturan Jadwal" onClose={()=>{if(!settingsLock.current)setShowSettings(false)}} footer={<button disabled={settingsBusy} onClick={saveSettings} className="rounded-lg bg-emerald-600 text-white px-4 py-2 text-sm font-bold">{settingsBusy ? 'Menyimpan…' : 'Simpan'}</button>}>
      {settingsError && <p role="alert" className="mb-3 text-sm text-red-700">{settingsError}</p>}
      <fieldset disabled={settingsBusy} className="min-w-0 space-y-4">
      <p className="text-xs text-slate-600">Hari sekolah berlaku juga untuk Presensi, Rencana Mengajar, dan Jurnal.</p><div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><label className="text-xs font-semibold">Hari sekolah<select value={settingsDraft.hariSekolah} onChange={e=>setSettingsDraft({...settingsDraft,hariSekolah:Number(e.target.value)})} className="field mt-1"><option value={5}>Senin–Jumat</option><option value={6}>Senin–Sabtu</option></select></label><label className="text-xs font-semibold">Jumlah baris (termasuk istirahat)<input type="number" min={1} max={16} value={settingsDraft.jumlahJam} onChange={e=>setSettingsDraft({...settingsDraft,jumlahJam:Number(e.target.value)})} className="field mt-1"/></label></div>
      <div className="rounded-xl border border-slate-200 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-bold">Jam istirahat</h3><button disabled={!settingsBreaks.length} onClick={() => { const [first,second] = [...settingsBreaks].sort((a,b)=>a-b); setSettingsTimes(current=>({...current,...(first?{[first]:{...ISTIRAHAT_UMUM[0]}}:{}),...(second?{[second]:{...ISTIRAHAT_UMUM[1]}}:{})})) }} className="min-h-11 rounded-lg border border-amber-300 bg-amber-50 px-3 text-xs font-bold text-amber-800 disabled:opacity-50">Pakai 09.00–09.30 & 12.00–12.30</button></div><p className="mt-1 text-xs text-slate-500">Centang baris yang jadi istirahat. Istirahat pertama otomatis 09.00–09.30, kedua 12.00–12.30 (bisa diubah).</p><div className="mt-2 max-h-56 space-y-2 overflow-y-auto">{Array.from({length:settingsDraft.jumlahJam},(_,i)=>i+1).map(jam => { const checked = settingsBreaks.includes(jam); const time = settingsTimes[jam] || resolveScheduleTime(jam,waktuJam,data); return <div key={jam} className={`flex flex-wrap items-center gap-2 rounded-lg border p-2 ${checked ? 'border-amber-300 bg-amber-50' : 'border-slate-200'}`}><label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={checked} onChange={() => { const checking=!settingsBreaks.includes(jam); const next=checking?[...settingsBreaks,jam].sort((a,b)=>a-b):settingsBreaks.filter(row=>row!==jam); setSettingsBreaks(next); if(checking&&!settingsTimes[jam]){ const umum=ISTIRAHAT_UMUM[next.indexOf(jam)]; if(umum) setSettingsTimes(current=>current[jam]?current:{...current,[jam]:{...umum}}) } }}/>Baris {jam}{checked ? ' · Istirahat' : ''}</label><span className="ml-auto flex items-center gap-1"><input type="time" aria-label={`Mulai baris ${jam}`} value={time.mulai} onChange={e=>setSettingsTimes(current=>({...current,[jam]:{mulai:e.target.value,selesai:current[jam]?.selesai||time.selesai}}))} className="rounded-md border border-slate-200 bg-white px-1 py-1.5 text-xs"/><span className="text-xs">–</span><input type="time" aria-label={`Selesai baris ${jam}`} value={time.selesai} onChange={e=>setSettingsTimes(current=>({...current,[jam]:{mulai:current[jam]?.mulai||time.mulai,selesai:e.target.value}}))} className="rounded-md border border-slate-200 bg-white px-1 py-1.5 text-xs"/></span></div> })}</div></div>
      <div><label className="flex min-h-11 items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={usePreset} onChange={e=>setUsePreset(e.target.checked)}/>Atur ulang semua jam otomatis</label>
      {usePreset && <div className="mt-2 grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3"><label className="text-xs">Mulai<input type="time" value={preset.start} onChange={e=>setPreset({...preset,start:e.target.value})} className="field mt-1"/></label><label className="text-xs">Menit per JP<input type="number" min={10} max={90} value={preset.duration} onChange={e=>setPreset({...preset,duration:Number(e.target.value)})} className="field mt-1"/></label><label className="text-xs">Istirahat setelah JP<input type="number" min={1} max={settingsDraft.jumlahJam-1} value={preset.breakAfter} onChange={e=>setPreset({...preset,breakAfter:Number(e.target.value)})} className="field mt-1"/></label><label className="text-xs">Menit istirahat<input type="number" min={5} max={60} value={preset.breakMinutes} onChange={e=>setPreset({...preset,breakMinutes:Number(e.target.value)})} className="field mt-1"/></label><p className="col-span-2 text-xs text-slate-500">Jam pada semua hari akan mengikuti susunan ini. Mata pelajaran tetap tersimpan.</p></div>}</div>
      <p className="text-xs text-slate-500">JP = jam pelajaran.</p>
      </fieldset></Modal>}

      {showForm && (
        <Modal title={`${editId ? 'Edit' : 'Tambah'} Jadwal`} onClose={() => { if (!importing) setShowForm(false) }} maxWidth="max-w-sm">
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-gray-700 block mb-1">Hari</label>
                  <select value={form.hari} onChange={(e) => setForm({ ...form, hari: parseInt(e.target.value) })} className="min-w-0 min-h-11 w-full rounded-lg px-3 py-2 text-base sm:text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }}>
                    {HARI.slice(0,hariSekolah).map((h, i) => <option key={i} value={i + 1}>{h}</option>)}
                  </select></div>
                <div><label className="text-xs font-medium text-gray-700 block mb-1">Jam ke</label>
                  <input type="number" min={1} max={jumlahJam} value={form.jam_ke} onChange={(e) => setForm({ ...form, jam_ke: parseInt(e.target.value) })} className="min-w-0 min-h-11 w-full rounded-lg px-3 py-2 text-base sm:text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-gray-700 block mb-1">Mulai</label>
                  <input type="time" value={form.jam_mulai} onChange={(e) => setForm({ ...form, jam_mulai: e.target.value })} className="min-w-0 min-h-11 w-full rounded-lg px-3 py-2 text-base sm:text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }} /></div>
                <div><label className="text-xs font-medium text-gray-700 block mb-1">Selesai</label>
                  <input type="time" value={form.jam_selesai} onChange={(e) => setForm({ ...form, jam_selesai: e.target.value })} className="min-w-0 min-h-11 w-full rounded-lg px-3 py-2 text-base sm:text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }} /></div>
              </div>
              <div><label className="text-xs font-medium text-gray-700 block mb-1">Mata Pelajaran</label>
                <select value={form.mata_pelajaran_id} onChange={(e) => setForm({ ...form, mata_pelajaran_id: e.target.value })} className="min-w-0 min-h-11 w-full rounded-lg px-3 py-2 text-base sm:text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }}>
                  <option value="">Pilih...</option>
                  {mapelList.map((m) => <option key={m.id} value={m.id}>{m.nama}</option>)}
                </select></div>
              <div><label className="text-xs font-medium text-gray-700 block mb-1">Atau nama custom</label>
                <input value={form.nama_mapel_custom} onChange={(e) => setForm({ ...form, nama_mapel_custom: e.target.value })} className="min-w-0 min-h-11 w-full rounded-lg px-3 py-2 text-base sm:text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-gray-700 block mb-1">Guru</label>
                  <input value={form.nama_guru} onChange={(e) => setForm({ ...form, nama_guru: e.target.value })} className="min-w-0 min-h-11 w-full rounded-lg px-3 py-2 text-base sm:text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }} /></div>
                <div><label className="text-xs font-medium text-gray-700 block mb-1">Ruang</label>
                  <input value={form.ruang} onChange={(e) => setForm({ ...form, ruang: e.target.value })} className="min-w-0 min-h-11 w-full rounded-lg px-3 py-2 text-base sm:text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }} /></div>
              </div>
              <div className="flex flex-wrap gap-3 justify-end pt-2">
                <button type="button" onClick={async () => { if (editId) { setConfirmDeleteId(editId); return } setShowForm(false) }}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-red-600 border border-red-200" style={{ background: '#fef2f2' }}>
                  <Trash2 size={14} className="inline mr-1" />{editId ? 'Hapus' : 'Batal'}</button>
                <button type="submit" className="rounded-xl px-6 py-2 text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg, #0ea5a0, #0d7a8a)' }}>Simpan</button>
              </div>
            </form>
        </Modal>
      )}
      <ConfirmDialog open={!!confirmImport} title="Impor jadwal?" message={confirmImport ? `Baca ${confirmImport.rows} baris jadwal dari ${confirmImport.file.name}? Slot yang sudah terisi akan dilewati. Data lama tidak ditimpa.` : ''} confirmText="Impor" danger={false} onCancel={() => { setConfirmImport(null); setPendingImport(null); importLock.current = false; setImporting(false) }} onConfirm={confirmImportAction} />
      <ConfirmDialog open={!!confirmDeleteId} title="Hapus jadwal?" message="Jadwal terpilih akan dihapus permanen." onCancel={() => setConfirmDeleteId(null)} onConfirm={async () => { const id = confirmDeleteId; setConfirmDeleteId(null); if (!id) return; await window.electronAPI.jadwal.delete(id); await load(); setToast({ text: 'Jadwal berhasil dihapus' }); setShowForm(false) }} />
    </fieldset>
  )
}
