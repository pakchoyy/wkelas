import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, BarChart3, CalendarDays, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Settings2, X } from 'lucide-react'
import { useSiswaList } from '../../../hooks/useSiswa'
import { useAppStore } from '../../../stores/appStore'
import { todayISO } from '../../../../shared/utils'
import { attendancePercent, missingAttendance } from '../../../../shared/attendance'
import { schoolDayStatus } from '../../../../shared/school-day'
import { db } from '../../../../lib/db'
import Modal from '../../../components/Modal'
import HolidaySettings from '../../../components/HolidaySettings'
import CalendarDateButton from '../../../components/CalendarDateButton'

const STATUS = ['H', 'S', 'I', 'A', 'T'] as const
type Status = typeof STATUS[number]
type Settings = { hariSekolah: 5 | 6; semester: 1 | 2; s1Mulai: string; s1Akhir: string; s2Mulai: string; s2Akhir: string }
const defaultSettings: Settings = { hariSekolah: 5, semester: 1, s1Mulai: '2026-07-01', s1Akhir: '2026-12-31', s2Mulai: '2027-01-01', s2Akhir: '2027-06-30' }
const config: Record<Status, { label: string; dot: string; soft: string; text: string; line: string }> = {
  H: { label: 'Hadir', dot: 'bg-emerald-500', soft: 'bg-emerald-100', text: 'text-emerald-700', line: 'border-l-emerald-500' },
  S: { label: 'Sakit', dot: 'bg-blue-500', soft: 'bg-blue-100', text: 'text-blue-700', line: 'border-l-blue-500' },
  I: { label: 'Izin', dot: 'bg-amber-500', soft: 'bg-amber-100', text: 'text-amber-700', line: 'border-l-amber-500' },
  A: { label: 'Alpa', dot: 'bg-red-500', soft: 'bg-red-100', text: 'text-red-700', line: 'border-l-red-500' },
  T: { label: 'Terlambat', dot: 'bg-orange-500', soft: 'bg-orange-100', text: 'text-orange-700', line: 'border-l-orange-500' },
}

function SettingsModal({ value, onClose, onSave, kelasId, onCalendarChanged }: { value: Settings; onClose: () => void; onSave: (v: Settings) => void; kelasId:number; onCalendarChanged:()=>void }) {
  const [form, setForm] = useState(value)
  const [tab,setTab] = useState('sekolah')
  return <Modal title="Pengaturan Presensi" onClose={onClose} maxWidth="max-w-lg" footer={tab === 'sekolah' ? <><button onClick={onClose} className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-semibold">Batal</button><button onClick={() => onSave(form)} className="min-h-11 rounded-xl bg-teal-700 px-4 text-sm font-semibold text-white">Simpan pengaturan</button></> : undefined}>
    <div className="mb-4 flex gap-2"><button aria-pressed={tab === 'sekolah'} onClick={() => setTab('sekolah')} className={'min-h-11 rounded-lg px-3 text-sm font-semibold ' + (tab === 'sekolah' ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-600')}>Hari sekolah</button><button aria-pressed={tab === 'libur'} onClick={() => setTab('libur')} className={'min-h-11 rounded-lg px-3 text-sm font-semibold ' + (tab === 'libur' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-600')}>Hari libur</button></div>
    {tab === 'libur' ? <HolidaySettings kelasId={kelasId} onChanged={onCalendarChanged}/> : <div className="space-y-4">
      <label className="block text-sm font-semibold">Hari sekolah<select value={form.hariSekolah} onChange={e => setForm({...form,hariSekolah:Number(e.target.value) as 5|6})} className="field mt-2"><option value={5}>Senin–Jumat</option><option value={6}>Senin–Sabtu</option></select></label>
      {[1,2].map(sem => <div key={sem} className="rounded-xl border border-slate-200 p-3"><h3 className="mb-2 text-sm font-semibold">Semester {sem}</h3><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold">Tanggal mulai<input type="date" value={sem === 1 ? form.s1Mulai : form.s2Mulai} onChange={e => setForm({...form,[sem === 1 ? 's1Mulai' : 's2Mulai']:e.target.value})} className="field mt-1"/></label><label className="text-xs font-semibold">Tanggal akhir<input type="date" value={sem === 1 ? form.s1Akhir : form.s2Akhir} onChange={e => setForm({...form,[sem === 1 ? 's1Akhir' : 's2Akhir']:e.target.value})} className="field mt-1"/></label></div></div>)}
    </div>}
  </Modal>
}

function Rekap({ siswa, records, settings, setSettings }: { siswa: any[]; records: any[]; settings: Settings; setSettings: (v: Settings) => void }) {
  const start = settings.semester === 1 ? settings.s1Mulai : settings.s2Mulai
  const end = settings.semester === 1 ? settings.s1Akhir : settings.s2Akhir
  const filtered = records.filter((r) => r.tanggal >= start && r.tanggal <= end)
  const totalHari = new Set(filtered.map((r) => r.tanggal)).size
  return <div><div className="rounded-2xl bg-white border border-slate-200 p-4 mb-4 flex flex-wrap gap-3 items-center"><BarChart3 size={20} className="text-emerald-600 mr-3"/><div><div className="font-extrabold">Rekap Presensi Semester {settings.semester}</div><div className="text-xs text-slate-500 mt-1">{start} sampai {end} · {totalHari} hari tercatat</div></div><select value={settings.semester} onChange={(e) => setSettings({ ...settings, semester: Number(e.target.value) as 1|2 })} className="ml-auto field !w-auto"><option value={1}>Semester 1</option><option value={2}>Semester 2</option></select></div>
    <div className="space-y-3 md:hidden">{siswa.map((student, index) => {
      const own = filtered.filter(r => r.siswa_id === student.id)
      const counts = Object.fromEntries(STATUS.map(st => [st, own.filter(r => r.status === st).length])) as Record<Status, number>
      const pct = attendancePercent(counts.H, counts.T, own.length)
      return <article key={student.id} className="rounded-xl border border-slate-200 bg-white p-3">
        <h3 className="font-bold break-words">{index + 1}. {student.nama}</h3>
        <dl className="mt-3 grid grid-cols-5 gap-1 text-xs">{STATUS.map(st => <div key={st} className="flex flex-col items-center gap-1"><dt>{st === 'T' ? 'Telat' : config[st].label}</dt><dd className={`font-bold ${config[st].text}`}>{counts[st]}</dd></div>)}</dl>
        <p className="mt-3 border-t pt-2 text-sm font-bold text-emerald-700">Kehadiran: {pct === null ? 'Belum dicatat' : `${pct}%`}</p>
      </article>
    })}</div>
    <div className="hidden md:block rounded-2xl bg-white border border-slate-200 overflow-x-auto"><table className="w-full text-sm min-w-[700px]"><thead><tr className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200"><th className="px-4 py-3 text-left">No.</th><th className="px-4 py-3 text-left">Nama Siswa</th>{STATUS.map((s) => <th key={s} className="px-4 py-3 text-center">{config[s].label}</th>)}<th className="px-4 py-3 text-center">Kehadiran</th></tr></thead><tbody>{siswa.map((s, i) => { const own = filtered.filter((r) => r.siswa_id === s.id); const c = Object.fromEntries(STATUS.map((st) => [st, own.filter((r) => r.status === st).length])) as Record<Status,number>; const pct = attendancePercent(c.H, c.T, own.length); return <tr key={s.id} className={`${i%2?'bg-slate-50/60':'bg-white'} border-b border-slate-100`}><td className="px-4 py-3">{i+1}</td><td className="px-4 py-3 font-bold">{s.nama}</td>{STATUS.map((st) => <td key={st} className={`px-4 py-3 text-center font-semibold ${config[st].text}`}>{c[st]}</td>)}<td className="px-4 py-3 text-center font-extrabold text-emerald-700">{pct === null ? '—' : `${pct}%`}</td></tr>})}</tbody></table></div>
  </div>
}

function addDays(date: string, amount: number) { const d = new Date(`${date}T12:00:00`); d.setDate(d.getDate() + amount); return todayISO(d) }
function longDate(date: string) { return new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${date}T12:00:00`)) }

export default function Presensi() {
  const kelasId = useAppStore((s) => s.kelasAktifId) || 1
  return <PresensiKelas key={kelasId} kelasId={kelasId}/>
}
function PresensiKelas({kelasId}:{kelasId:number}) {
  const { data: rawSiswa, loading } = useSiswaList(kelasId)
  const siswa = useMemo(() => [...rawSiswa].sort((a, b) => a.nama.localeCompare(b.nama, 'id')), [rawSiswa])
  const [autoHadir, setAutoHadir] = useState(false)
  const autoAttempt = useRef('')
  const [calendarVersion,setCalendarVersion] = useState(0)
  const [tanggal, setTanggal] = useState(todayISO())
  const [statusMap, setStatusMap] = useState<Record<number, Status>>({})
  const [keteranganMap, setKeteranganMap] = useState<Record<number, string>>({})
  const [activeId, setActiveId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [tab, setTab] = useState<'harian' | 'rekap'>('harian')
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const savingRef = useRef(false)
  const savedNotes = useRef<Record<number, string>>({})
  const viewRef = useRef('')
  viewRef.current = `${kelasId}:${tanggal}`
  const [loadedDate, setLoadedDate] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [rekapRecords, setRekapRecords] = useState<any[]>([])
  const [holidays, setHolidays] = useState<any[]>([])

  useEffect(() => {
    let cancelled = false
    setLoadedDate(''); setLoadError(''); setSaveError('')
    Promise.all([window.electronAPI.kalender.list(kelasId), window.electronAPI.presensi.get(kelasId, tanggal)])
      .then(([calendar, records]) => {
        if (cancelled) return
        const sm: Record<number, Status> = {}; const km: Record<number, string> = {}
        for (const r of records) { sm[r.siswa_id] = r.status as Status; km[r.siswa_id] = r.keterangan || '' }
        setHolidays(calendar); setStatusMap(sm); setKeteranganMap(km); savedNotes.current = km
        setActiveId(null); setLoadedDate(tanggal)
      }).catch(() => { if (!cancelled) setLoadError('Presensi gagal dimuat. Muat ulang halaman untuk mencoba lagi.') })
    return () => { cancelled = true }
  }, [kelasId, tanggal, calendarVersion])
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 3500); return () => clearTimeout(t) }, [toast])
  useEffect(() => {
    let cancelled = false
    setSettingsLoaded(false)
    Promise.all([db.pengaturan.get(`presensi_${kelasId}`), db.kelas.get(kelasId)]).then(([setting, kelas]) => {
      if (cancelled) return
      const startYear = Number(kelas?.tahun_ajaran?.split('/')[0]) || new Date().getFullYear()
      let stored = {}; if (setting?.value) try { stored = JSON.parse(setting.value) } catch {}
      setSettings({ ...defaultSettings, s1Mulai: `${startYear}-07-01`, s1Akhir: `${startYear}-12-31`, s2Mulai: `${startYear + 1}-01-01`, s2Akhir: `${startYear + 1}-06-30`, ...stored, semester: kelas?.semester === 2 ? 2 : 1 })
      setSettingsLoaded(true)
    }).catch(() => { if (!cancelled) setLoadError('Pengaturan gagal dimuat. Muat ulang halaman untuk mencoba lagi.') })
    return () => { cancelled = true }
  }, [kelasId])
  useEffect(() => { if (tab === 'rekap') window.electronAPI.presensi.listByKelas(kelasId).then(setRekapRecords) }, [tab, kelasId])

  const getStatus = (id: number): Status | null => statusMap[id] || null
  const persistStudent = async (id: number, status: Status, note = '', closeAfterSave = false) => {
    if (savingRef.current || loadedDate !== tanggal || !settingsLoaded) return
    const view = viewRef.current
    savingRef.current = true; setSaving(true); setSaveError('')
    try {
      await window.electronAPI.presensi.save([{ siswa_id: id, kelas_id: kelasId, tanggal, status, keterangan: note || undefined }])
      if (viewRef.current === view) {
        setStatusMap(m => ({ ...m, [id]: status })); setKeteranganMap(m => ({ ...m, [id]: note }))
        savedNotes.current = { ...savedNotes.current, [id]: note }
        if (closeAfterSave) setActiveId(current => current === id ? null : current)
      }
    } catch {
      if (viewRef.current === view) {
        setKeteranganMap(m => ({ ...m, [id]: savedNotes.current[id] || '' }))
        setSaveError('Perubahan gagal disimpan. Status dan keterangan sebelumnya tetap digunakan. Silakan ulangi perubahan.')
      }
    } finally { savingRef.current = false; setSaving(false) }
  }
  const setStatus = (id: number, status: Status) => {
    persistStudent(id, status, status === 'H' ? '' : (keteranganMap[id] || ''), true)
  }
  const counts = Object.fromEntries(STATUS.map((st) => [st, siswa.filter((s) => getStatus(s.id) === st).length])) as Record<Status, number>
  const holiday = holidays.find((item) => ['libur_nasional','libur_sekolah'].includes(item.jenis) && tanggal >= item.tanggal_mulai && tanggal <= (item.tanggal_selesai || item.tanggal_mulai))
  const isSchoolDay = schoolDayStatus(tanggal, settings.hariSekolah, holidays).active

  const fillHadir = async () => {
    if (savingRef.current || !isSchoolDay || loadedDate !== tanggal || !settingsLoaded) return
    const records = missingAttendance(siswa, statusMap, kelasId, tanggal)
    if (!records.length || !window.confirm(`Isi ${records.length} siswa yang belum dicatat sebagai Hadir pada ${longDate(tanggal)}? Status yang sudah diisi tidak berubah.`)) return
    const view = viewRef.current
    savingRef.current = true; setSaving(true); setSaveError('')
    try {
      await window.electronAPI.presensi.save(records)
      if (viewRef.current === view) setStatusMap(current => ({ ...current, ...Object.fromEntries(records.map(r => [r.siswa_id, 'H' as Status])) }))
    } catch { if (viewRef.current === view) setSaveError('Pengisian Hadir gagal disimpan. Data sebelumnya tetap digunakan. Silakan coba lagi.') }
    finally { savingRef.current = false; setSaving(false) }
  }

  useEffect(() => {
    const key = `${kelasId}:${tanggal}`
    if (!autoHadir || tab !== 'harian' || loading || !settingsLoaded || loadedDate !== tanggal || !isSchoolDay || !siswa.length || autoAttempt.current === key) return
    autoAttempt.current = key
    void fillHadir()
  }, [autoHadir, kelasId, tanggal, loadedDate, settingsLoaded, loading, isSchoolDay, siswa, tab])

  const saveSettings = async (next: Settings) => {
    if (!next.s1Mulai || !next.s1Akhir || !next.s2Mulai || !next.s2Akhir || next.s1Mulai > next.s1Akhir || next.s2Mulai > next.s2Akhir) {
      setToast({type:'error', text:'Tanggal akhir semester harus sama atau setelah tanggal mulai.'}); return
    }
    try { await db.pengaturan.put({ key: `presensi_${kelasId}`, value: JSON.stringify(next), updated_at: new Date().toISOString() }); setSettings(next); setShowSettings(false) }
    catch { setToast({type:'error',text:'Pengaturan gagal disimpan. Silakan coba lagi.'}) }
  }
  return <div className="max-w-5xl mx-auto pb-4">
    {loadError && <div role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-red-700">{loadError}<button onClick={() => window.location.reload()} className="ml-3 underline">Muat ulang</button></div>}
    {saveError && <div role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-red-700">{saveError}</div>}
    {!loadError && (!settingsLoaded || loadedDate !== tanggal) && <p role="status">Memuat presensi...</p>}
    <fieldset disabled={saving || !settingsLoaded} className="min-w-0">
    <div className="flex items-center justify-between gap-2 mb-3"><div className="flex gap-1 rounded-xl p-1"><button aria-pressed={tab === 'harian'} onClick={() => setTab('harian')} className={`tab-mint min-h-11 px-3 sm:px-4 py-2 rounded-lg text-sm font-bold ${tab === 'harian' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'}`}><span className="sm:hidden">Harian</span><span className="hidden sm:inline">Presensi Harian</span></button><button aria-pressed={tab === 'rekap'} onClick={() => setTab('rekap')} className={`tab-teal min-h-11 px-3 sm:px-4 py-2 rounded-lg text-sm font-bold ${tab === 'rekap' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'}`}><span className="sm:hidden">Rekap</span><span className="hidden sm:inline">Rekap Semester</span></button></div><button onClick={() => setShowSettings(true)} aria-label="Pengaturan presensi" className="action-teal min-h-11 shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 flex gap-2 items-center"><Settings2 size={16}/><span className="hidden sm:inline">Pengaturan</span></button></div>
    {tab === 'rekap' ? <Rekap siswa={siswa} records={rekapRecords} settings={settings} setSettings={setSettings}/> : <>
    <div className="rounded-xl bg-white border border-slate-200 p-2 mb-3">
      <div className="grid grid-cols-[44px_minmax(0,1fr)_44px_44px] gap-2 items-center">
        <button aria-label="Tanggal sebelumnya" onClick={() => setTanggal(addDays(tanggal, -1))} className="action-mint size-11 rounded-xl border border-slate-200 grid place-items-center"><ChevronLeft size={21}/></button>
        <h1 className="text-center text-sm font-bold text-slate-900"><span className="sm:hidden">{new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'short',year:'numeric'}).format(new Date(tanggal + 'T12:00:00'))}</span><span className="hidden sm:inline">{longDate(tanggal)}</span></h1>
        <CalendarDateButton value={tanggal} onChange={setTanggal} max={todayISO()} label="Pilih tanggal presensi"/>
        <button aria-label="Tanggal berikutnya" disabled={tanggal >= todayISO()} onClick={() => setTanggal(addDays(tanggal, 1))} className="action-mint size-11 rounded-xl border border-slate-200 grid place-items-center disabled:opacity-35"><ChevronRight size={21}/></button>
      </div>
    </div>

    <div className="grid grid-cols-5 rounded-xl bg-white border border-slate-200 mb-3 overflow-hidden">{STATUS.map(st => <div key={st} className={"flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-1 py-2.5 border-r last:border-r-0 border-white " + config[st].soft + " " + config[st].text}><strong className="text-lg sm:text-base">{counts[st]}</strong><span className="text-xs sm:text-sm">{st === 'T' ? 'Telat' : config[st].label}</span></div>)}</div>

    <div className="mb-3 rounded-xl border border-slate-200 bg-white px-3 py-1">
      <div className="flex items-center justify-between gap-2"><div className="min-w-0 flex-1 py-2"><strong className="text-sm">Auto Hadir</strong><p className="text-xs text-slate-500">Isi semua Hadir pada tanggal ini.</p></div><button type="button" role="switch" aria-checked={autoHadir} aria-label="Auto Hadir" onClick={() => { autoAttempt.current = ''; setAutoHadir(v => !v) }} className="min-h-11 min-w-11 self-start flex items-center"><span className={`relative h-6 w-11 rounded-full transition-colors ${autoHadir ? 'bg-emerald-600' : 'bg-slate-300'}`}><span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform ${autoHadir ? 'translate-x-5' : 'translate-x-0.5'} left-0`}/></span></button></div>
      {saving && <p role="status" className="pb-2 text-xs text-slate-500">Menyimpan…</p>}
      {saveError && autoHadir && <button onClick={fillHadir} className="min-h-11 text-sm text-red-700 underline">Coba isi Hadir lagi</button>}
    </div>

    {!isSchoolDay && <div className="rounded-2xl bg-amber-50 border border-amber-200 text-center px-5 py-12 mb-4"><CalendarDays size={34} className="mx-auto text-amber-500 mb-3"/><div className="font-extrabold text-amber-900">{holiday?.judul || 'Hari Libur Sekolah'}</div><p className="text-sm text-amber-700 mt-1">Tidak ada daftar presensi karena tanggal ini bukan hari efektif belajar.</p></div>}

    {isSchoolDay && ((loading || loadedDate !== tanggal) ? <div className="py-16 text-center text-slate-400">Memuat siswa...</div> : siswa.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center"><div className="font-bold text-slate-700">Belum ada siswa</div><p className="text-sm text-slate-400 mt-1">Tambahkan siswa terlebih dahulu melalui menu Data Siswa.</p></div> : <div className="space-y-2">{siswa.map((s, index) => {
      const st = getStatus(s.id); const open = activeId === s.id
      return <div key={s.id} className={`rounded-xl bg-white border border-slate-200 border-l-4 ${st ? config[st].line : 'border-l-slate-300'} overflow-hidden`}>
        <button onClick={() => setActiveId(open ? null : s.id)} aria-expanded={open} aria-controls={`presensi-${s.id}`} className="w-full min-h-16 px-3 py-2 flex items-center gap-2 text-left">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-teal-50 text-xs font-semibold text-teal-800">{index + 1}</span>
          <span className="min-w-0 flex-1"><span className="block break-words text-sm font-semibold text-slate-900">{s.nama}</span>{keteranganMap[s.id] && <span className="block break-words text-xs text-slate-500">{keteranganMap[s.id]}</span>}</span>
          <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${st ? config[st].soft + ' ' + config[st].text : 'bg-slate-100 text-slate-600'}`}>{st ? config[st].label : 'Belum diisi'}</span>
          <ChevronDown size={15} className={`shrink-0 text-slate-500 ${open ? 'rotate-180' : ''}`}/>
        </button>
        {open && <div id={`presensi-${s.id}`} className="px-2 pb-3 pt-2 border-t border-slate-100 bg-slate-50/60"><div className="grid grid-cols-5 gap-1.5">{STATUS.map(option => <button key={option} aria-label={config[option].label} aria-pressed={st === option} onClick={() => setStatus(s.id, option)} className={`min-h-11 min-w-0 rounded-lg px-1 py-2 text-xs sm:text-sm font-semibold border ${st === option ? config[option].soft + ' ' + config[option].text + ' border-current' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}>{option === 'T' ? 'Telat' : config[option].label}</button>)}</div>{st && st !== 'H' && <input aria-label={`Keterangan untuk ${s.nama}`} value={keteranganMap[s.id] || ''} onChange={e => setKeteranganMap(m => ({ ...m, [s.id]: e.target.value }))} onBlur={() => persistStudent(s.id, st, keteranganMap[s.id] || '')} placeholder="Keterangan (opsional)" className="field mt-2"/>}</div>}
      </div>
    })}</div>)}

    </>}
    </fieldset>
    {showSettings && <SettingsModal kelasId={kelasId} onCalendarChanged={() => setCalendarVersion(v => v + 1)} value={settings} onClose={() => setShowSettings(false)} onSave={saveSettings}/>}
    {toast && <div className="fixed inset-x-0 top-6 z-[500] flex justify-center pointer-events-none px-4"><div className={`pointer-events-auto flex items-center gap-3 rounded-2xl border bg-white px-5 py-3.5 shadow-xl text-sm font-semibold ${toast.type === 'success' ? 'border-emerald-200 text-emerald-800' : 'border-red-200 text-red-800'}`}>{toast.type === 'success' ? <span className="w-8 h-8 rounded-full bg-emerald-100 grid place-items-center"><CheckCircle2 size={18}/></span> : <span className="w-8 h-8 rounded-full bg-red-100 grid place-items-center"><AlertCircle size={18}/></span>}<span>{toast.text}</span><button aria-label="Tutup pemberitahuan" onClick={() => setToast(null)} className="ml-3 opacity-50"><X size={15}/></button></div></div>}
  </div>
}
