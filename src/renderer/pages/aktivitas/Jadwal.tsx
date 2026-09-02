import { defaultTime, resolveScheduleTime, excelTime, schedulePreset } from '../../../shared/schedule'
import { updateScheduleTime, importSchedule } from '../../../lib/schedule-storage'
import { useState, useEffect, useRef } from 'react'
import { Download, Settings2, Trash2, Upload } from 'lucide-react'
import { useAppStore } from '../../stores/appStore'
import type { Jadwal as JadwalType, MataPelajaran } from '../../../shared/types'
import { db } from '../../../lib/db'
import Modal from '../../components/Modal'

const HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']
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
  const [hariSekolah, setHariSekolah] = useState<5 | 6>(5)
  const [selectedDay, setSelectedDay] = useState(() => { const day = new Date().getDay(); return day >= 1 && day <= 5 ? day : 1 })
  const activeDay = Math.min(selectedDay, hariSekolah)
  const [timeEditor, setTimeEditor] = useState<{jam:number;mulai:string;selesai:string}|null>(null)
  const [timeSaving, setTimeSaving] = useState(false)
  const timeLock = useRef(false)
  const [timeError, setTimeError] = useState('')
  const [jumlahJam, setJumlahJam] = useState(10)
  const [waktuJam, setWaktuJam] = useState<Record<number,{mulai:string;selesai:string}>>({})
  const [istirahat, setIstirahat] = useState<number[]>([])
  const [editId, setEditId] = useState<number | null>(null)
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null)
  const [form, setForm] = useState({ hari: 1, jam_ke: 1, jam_mulai: '07:00', jam_selesai: '08:00', mata_pelajaran_id: '', nama_mapel_custom: '', nama_guru: '', ruang: '' })

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
  const saveSettings = async () => {
    try {
      if (![5,6].includes(settingsDraft.hariSekolah) || !Number.isInteger(settingsDraft.jumlahJam) || settingsDraft.jumlahJam < 1 || settingsDraft.jumlahJam > 16) throw new Error('Pilih 5 atau 6 hari dan 1–16 jam pelajaran.')
      await db.transaction('rw',[db.jadwal,db.pengaturan],async () => {
        const current = await db.jadwal.where({kelas_id:kelasId}).toArray()
        if (current.some(r => r.hari > settingsDraft.hariSekolah || r.jam_ke > settingsDraft.jumlahJam)) throw new Error('Masih ada jadwal di luar batas baru. Pindahkan atau hapus jadwal tersebut terlebih dahulu.')
        if(timing && current.some(row=>timing.istirahat.includes(row.jam_ke))) throw new Error('Baris istirahat masih berisi mapel. Pindahkan mapelnya sebelum menerapkan contoh waktu.')
        if(timing) for(const row of current) await db.jadwal.update(row.id!,{jam_mulai:timing.waktuJam[row.jam_ke].mulai,jam_selesai:timing.waktuJam[row.jam_ke].selesai})
        const key = `jadwal_${kelasId}`
        const previous = await db.pengaturan.get(key)
        const cfg = previous ? JSON.parse(previous.value) : {}
        await db.pengaturan.put({key,value:JSON.stringify({...cfg,jumlahJam:settingsDraft.jumlahJam,istirahat:(cfg.istirahat || []).filter((jam:number) => jam <= settingsDraft.jumlahJam),...timing}),updated_at:new Date().toISOString()})
        const attendance = await db.pengaturan.get(`presensi_${kelasId}`)
        await db.pengaturan.put({key:`presensi_${kelasId}`,value:JSON.stringify({...attendance ? JSON.parse(attendance.value) : {},hariSekolah:settingsDraft.hariSekolah}),updated_at:new Date().toISOString()})
      })
      if(timing) {setWaktuJam(timing.waktuJam);setIstirahat(timing.istirahat)}
      await load()
      setHariSekolah(settingsDraft.hariSekolah as 5|6); setJumlahJam(settingsDraft.jumlahJam); setIstirahat(current => current.filter(jam => jam <= settingsDraft.jumlahJam)); setShowSettings(false)
    } catch(error) { setToast({text:error instanceof Error ? error.message : 'Pengaturan gagal disimpan.',error:true}) }
  }

  const saveTime = async (jam:number, key:'mulai'|'selesai', value:string) => {
    const time = {...resolveScheduleTime(jam,waktuJam,data),[key]:value}
    try { await updateScheduleTime(db,kelasId,jam,time); setWaktuJam(current => ({...current,[jam]:time})); await load(); setToast({text:'Waktu seluruh hari berhasil disimpan'}) }
    catch(error) {
      const stored = await db.pengaturan.get(`jadwal_${kelasId}`)
      setWaktuJam(stored ? JSON.parse(stored.value).waktuJam || {} : {})
      setToast({text:error instanceof Error ? error.message : 'Waktu gagal disimpan',error:true})
    }
  }

  const toggleBreak = async (jam:number) => {
    if(settingsLock.current)return
    settingsLock.current=true
    try {
      const next = await db.transaction('rw',[db.jadwal,db.pengaturan],async()=>{
        const key=`jadwal_${kelasId}`
        const stored=await db.pengaturan.get(key)
        const cfg=stored ? JSON.parse(stored.value) : {jumlahJam,waktuJam,istirahat:[]}
        const current:number[]=cfg.istirahat || []
        const making=!current.includes(jam)
        if(making && await db.jadwal.where({kelas_id:kelasId,jam_ke:jam}).count()) throw new Error('Pindahkan mapel pada baris ini sebelum menjadikannya jeda.')
        const breaks=making ? [...current,jam] : current.filter(row=>row!==jam)
        if(breaks.length >= jumlahJam) throw new Error('Sisakan minimal satu JP.')
        await db.pengaturan.put({key,value:JSON.stringify({...cfg,istirahat:breaks}),updated_at:new Date().toISOString()})
        return breaks
      })
      setIstirahat(next);setToast({text:'Jeda tersimpan. Mapel tidak dihapus.'})
    } catch(error) {setToast({text:error instanceof Error ? error.message : 'Jeda gagal disimpan.',error:true})}
    finally {settingsLock.current=false}
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
      if (!window.confirm(`Baca ${rows.length} baris jadwal dari ${file.name}? Slot yang sudah terisi akan dilewati. Data lama tidak ditimpa. Baris yang tidak valid akan dilaporkan.`)) return
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
        <div className="flex flex-wrap gap-2"><button onClick={downloadTemplate} className="min-h-11 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600"><Download size={16}/><span className="sm:hidden">Template</span><span className="hidden sm:inline">Template Excel</span></button><label className="min-h-11 flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600"><Upload size={16}/><span className="sm:hidden">Unggah</span><span className="hidden sm:inline">Unggah Excel</span><input type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => { uploadTemplate(e.target.files?.[0]); e.currentTarget.value = '' }}/></label><button onClick={() => { setSettingsDraft({hariSekolah,jumlahJam}); setUsePreset(false);setSettingsError('');setShowSettings(true) }}
          className="min-h-11 flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg, #0ea5a0, #0d7a8a)' }}>
          <Settings2 size={16} /><span className="sm:hidden">Atur</span><span className="hidden sm:inline">Pengaturan</span>
        </button></div>
      </div>

      <section className="lg:hidden" aria-label="Agenda per hari">
        <div className="flex gap-1 pb-1" aria-label="Pilih hari">{HARI.slice(0,hariSekolah).map((day,index) => <button key={day} aria-pressed={activeDay === index + 1} onClick={() => setSelectedDay(index + 1)} className={`min-h-11 min-w-0 flex-1 rounded-lg border px-1 text-xs font-bold ${activeDay === index + 1 ? 'border-teal-600 bg-teal-600 text-white' : 'border-slate-200 bg-white text-slate-600'}`}>{day.slice(0,3)}</button>)}</div>
        <h3 className="my-3 font-bold">Jadwal {HARI[activeDay - 1]}</h3>
        <div className="space-y-3">{Array.from({length:jumlahJam},(_,index) => index + 1).map(jam => {
          const item = data.find(record => record.hari === activeDay && record.jam_ke === jam)
          const time = resolveScheduleTime(jam,waktuJam,data)
          const rest = istirahat.includes(jam)
          return <article key={jam} className={`rounded-lg border px-3 py-2 ${rest ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white'}`}>
            <div className="flex items-center justify-between gap-2 text-xs text-slate-500"><strong>{rest ? 'Jeda' : `JP ${jam-istirahat.filter(row=>row<jam).length}`}</strong><button aria-label={`Atur waktu baris ${jam}`} onClick={()=>{setTimeError('');setTimeEditor({jam,...time})}} className="min-h-11 text-teal-700">{time.mulai}–{time.selesai} · Edit</button></div>
            <div className="flex items-center gap-2">{rest ? <span className="flex-1 text-sm font-semibold">Istirahat</span> : <button onClick={()=>handleCell(activeDay,jam,item)} className="min-h-11 min-w-0 flex-1 rounded-lg bg-teal-50 px-2 text-left text-sm font-semibold text-teal-800">{item ? getMapelName(item) : '+ Pilih pelajaran'}</button>}<button onClick={()=>toggleBreak(jam)} className="min-h-11 shrink-0 px-2 text-xs text-amber-800">{rest ? 'Jadikan JP' : '+ Jeda'}</button></div>
          </article>
        })}</div>
      </section>
      {timeEditor && <Modal title={`Waktu jam ${timeEditor.jam}`} onClose={() => { if (!timeLock.current) setTimeEditor(null) }}>
        <form onSubmit={async e => {
          e.preventDefault()
          if (timeLock.current) return
          timeLock.current = true; setTimeSaving(true); setTimeError('')
          const {jam,mulai,selesai} = timeEditor
          try { await updateScheduleTime(db,kelasId,jam,{mulai,selesai}); setWaktuJam(current => ({...current,[jam]:{mulai,selesai}})); await load(); setTimeEditor(null); setToast({text:'Waktu seluruh hari berhasil disimpan'}) }
          catch(error) { setTimeError(error instanceof Error ? error.message : 'Waktu gagal disimpan.') }
          finally { timeLock.current = false; setTimeSaving(false) }
        }}>
          <p className="mb-4 text-sm text-slate-600">Waktu jam ini berlaku untuk semua hari sekolah.</p>
          <fieldset disabled={timeSaving} className="min-w-0 space-y-3">
            <label className="block text-sm">Mulai<input required type="time" value={timeEditor.mulai} onChange={e => setTimeEditor({...timeEditor,mulai:e.target.value})} className="field mt-1"/></label>
            <label className="block text-sm">Selesai<input required type="time" value={timeEditor.selesai} onChange={e => setTimeEditor({...timeEditor,selesai:e.target.value})} className="field mt-1"/></label>
            {timeError && <p role="alert" className="text-sm text-red-700">{timeError}</p>}
            <button type="submit" className="min-h-11 w-full rounded-xl bg-teal-600 px-4 text-white font-bold">{timeSaving ? 'Menyimpan...' : 'Simpan waktu'}</button>
          </fieldset>
        </form>
      </Modal>}

      <div className="hidden lg:block rounded-xl overflow-x-auto" style={{ background: 'var(--card-bg)', boxShadow: 'var(--shadow)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider" style={{ background: '#f8fafc' }}>
              <th className="px-3 py-3 text-left">Jam</th><th className="px-3 py-3 text-left">Waktu</th>
              {HARI.slice(0, hariSekolah).map((h, i) => <th key={i} className="px-3 py-3 text-left">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: jumlahJam }, (_, jam) => jam + 1).map((jam) => (
              <tr key={jam} className="border-t" style={{ borderColor: 'var(--border)' }}>
                <td className="px-3 py-2 text-xs font-semibold text-gray-500"><div>{istirahat.includes(jam) ? 'Jeda' : `JP ${jam-istirahat.filter(row=>row<jam).length}`}</div><button onClick={()=>toggleBreak(jam)} className="mt-1 text-[10px] font-bold text-amber-600" title="Menandai seluruh hari pada jam ini sebagai istirahat">{istirahat.includes(jam)?'Jadikan JP':'+ Jeda'}</button></td><td className="px-2 py-2 whitespace-nowrap"><div className="flex items-center gap-1"><input type="time" value={waktuJam[jam]?.mulai||data.find(i=>i.jam_ke===jam)?.jam_mulai||defaultTime(jam).mulai} onChange={(e)=>setWaktuJam({...waktuJam,[jam]:{mulai:e.target.value,selesai:waktuJam[jam]?.selesai||data.find(i=>i.jam_ke===jam)?.jam_selesai||defaultTime(jam).selesai}})} onBlur={(e)=>saveTime(jam,'mulai',e.target.value)} className="w-[88px] rounded-md border border-slate-200 bg-slate-50 px-1 py-1.5 text-xs"/><span>–</span><input type="time" value={waktuJam[jam]?.selesai||data.find(i=>i.jam_ke===jam)?.jam_selesai||defaultTime(jam).selesai} onChange={(e)=>setWaktuJam({...waktuJam,[jam]:{mulai:waktuJam[jam]?.mulai||data.find(i=>i.jam_ke===jam)?.jam_mulai||defaultTime(jam).mulai,selesai:e.target.value}})} onBlur={(e)=>saveTime(jam,'selesai',e.target.value)} className="w-[88px] rounded-md border border-slate-200 bg-slate-50 px-1 py-1.5 text-xs"/></div></td>
                {istirahat.includes(jam)?<td colSpan={hariSekolah} className="border-l bg-amber-50 text-center text-xs font-bold uppercase tracking-wider text-amber-700">Istirahat</td>:HARI.slice(0, hariSekolah).map((_, hari) => {
                  const item = data.find((d) => d.hari === hari + 1 && d.jam_ke === jam)
                  return (
                    <td key={hari} className="px-2 py-2 text-xs border-l" style={{ borderColor: 'var(--border)' }}><select value={item?.nama_mapel_custom ? 'custom' : item?.mata_pelajaran_id || ''} onChange={(e)=>setCell(hari+1,jam,e.target.value)} className={`w-full rounded-lg border px-2 py-2 text-xs font-semibold outline-none ${item ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-400'}`}><option value="">— Kosong —</option>{item?.nama_mapel_custom && <option value="custom">{item.nama_mapel_custom}</option>}{mapelList.map((subject)=><option key={subject.id} value={subject.id}>{subject.nama}</option>)}</select><button onClick={() => handleCell(hari+1,jam,item)} className="ml-1 min-h-8 text-[10px] text-teal-700">Edit</button></td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showSettings && <Modal title="Pengaturan Jadwal" onClose={()=>{if(!settingsLock.current)setShowSettings(false)}} footer={<button disabled={settingsBusy} onClick={saveSettings} className="rounded-lg bg-emerald-600 text-white px-4 py-2 text-sm font-bold">{settingsBusy ? 'Menyimpan…' : 'Simpan'}</button>}>
      {settingsError && <p role="alert" className="mb-3 text-sm text-red-700">{settingsError}</p>}
      <fieldset disabled={settingsBusy} className="min-w-0 space-y-3">
      <div className="grid grid-cols-2 gap-3"><label className="text-xs font-semibold">Hari sekolah<select value={settingsDraft.hariSekolah} onChange={e=>setSettingsDraft({...settingsDraft,hariSekolah:Number(e.target.value)})} className="field mt-1"><option value={5}>Senin–Jumat</option><option value={6}>Senin–Sabtu</option></select></label><label className="text-xs font-semibold">Jumlah baris (termasuk jeda)<input type="number" min={1} max={16} value={settingsDraft.jumlahJam} onChange={e=>setSettingsDraft({...settingsDraft,jumlahJam:Number(e.target.value)})} className="field mt-1"/></label></div>
      <label className="flex min-h-11 items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={usePreset} onChange={e=>setUsePreset(e.target.checked)}/>Susun waktu JP + istirahat</label>
      {usePreset && <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3"><label className="text-xs">Mulai<input type="time" value={preset.start} onChange={e=>setPreset({...preset,start:e.target.value})} className="field mt-1"/></label><label className="text-xs">Menit per JP<input type="number" min={10} max={90} value={preset.duration} onChange={e=>setPreset({...preset,duration:Number(e.target.value)})} className="field mt-1"/></label><label className="text-xs">Istirahat setelah JP<input type="number" min={1} max={settingsDraft.jumlahJam-1} value={preset.breakAfter} onChange={e=>setPreset({...preset,breakAfter:Number(e.target.value)})} className="field mt-1"/></label><label className="text-xs">Menit istirahat<input type="number" min={5} max={60} value={preset.breakMinutes} onChange={e=>setPreset({...preset,breakMinutes:Number(e.target.value)})} className="field mt-1"/></label><p className="col-span-2 text-xs text-slate-500">Contoh awal: 35 menit/JP, jeda 15 menit setelah JP 3. Waktu seluruh hari akan disusun ulang; mapel tidak dihapus.</p></div>}
      <p className="text-xs text-slate-500">JP = jam pelajaran. Gunakan + Jeda pada tabel untuk menandai istirahat semua hari.</p>
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
                <button type="button" onClick={async () => { if (editId) { if (!window.confirm('Hapus jadwal ini?')) return; await window.electronAPI.jadwal.delete(editId); await load(); setToast({ text: 'Jadwal berhasil dihapus' }) }; setShowForm(false) }}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-red-600 border border-red-200" style={{ background: '#fef2f2' }}>
                  <Trash2 size={14} className="inline mr-1" />{editId ? 'Hapus' : 'Batal'}</button>
                <button type="submit" className="rounded-xl px-6 py-2 text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg, #0ea5a0, #0d7a8a)' }}>Simpan</button>
              </div>
            </form>
        </Modal>
      )}
    </fieldset>
  )
}
