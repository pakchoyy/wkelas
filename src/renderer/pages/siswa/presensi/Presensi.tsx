import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, BarChart3, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Cloud, Info, Lightbulb, Settings2, X } from 'lucide-react'
import { useSiswaList } from '../../../hooks/useSiswa'
import { useAppStore } from '../../../stores/appStore'
import { todayISO } from '../../../../shared/utils'
import { db } from '../../../../lib/db'
import Modal from '../../../components/Modal'

const STATUS = ['H', 'S', 'I', 'A', 'T'] as const
type Status = typeof STATUS[number]
type Settings = { autoHadir: boolean; hariSekolah: 5 | 6; semester: 1 | 2; s1Mulai: string; s1Akhir: string; s2Mulai: string; s2Akhir: string }
const defaultSettings: Settings = { autoHadir: true, hariSekolah: 5, semester: 1, s1Mulai: '2026-07-01', s1Akhir: '2026-12-31', s2Mulai: '2027-01-01', s2Akhir: '2027-06-30' }
const config: Record<Status, { label: string; dot: string; soft: string; text: string; line: string }> = {
  H: { label: 'Hadir', dot: 'bg-emerald-500', soft: 'bg-emerald-100', text: 'text-emerald-700', line: 'border-l-emerald-500' },
  S: { label: 'Sakit', dot: 'bg-blue-500', soft: 'bg-blue-100', text: 'text-blue-700', line: 'border-l-blue-500' },
  I: { label: 'Izin', dot: 'bg-amber-500', soft: 'bg-amber-100', text: 'text-amber-700', line: 'border-l-amber-500' },
  A: { label: 'Alpa', dot: 'bg-red-500', soft: 'bg-red-100', text: 'text-red-700', line: 'border-l-red-500' },
  T: { label: 'Terlambat', dot: 'bg-orange-500', soft: 'bg-orange-100', text: 'text-orange-700', line: 'border-l-orange-500' },
}

function SettingsModal({ value, onClose, onSave }: { value: Settings; onClose: () => void; onSave: (v: Settings) => void }) {
  const [form, setForm] = useState(value)
  return <Modal title="Pengaturan Presensi" onClose={onClose} maxWidth="max-w-lg" footer={<><button onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold">Batal</button><button onClick={() => onSave(form)} className="rounded-xl bg-emerald-600 text-white px-5 py-2.5 text-sm font-bold">Simpan Pengaturan</button></>}><div className="space-y-5">
    <div className="rounded-xl border border-slate-200 p-4 flex items-center"><div><div className="font-bold text-sm">Auto Hadir</div><p className="text-xs text-slate-500 mt-1">Mengisi status yang masih kosong sebagai Hadir. Status yang sudah dipilih tidak ditimpa.</p></div><button onClick={() => setForm({ ...form, autoHadir: !form.autoHadir })} className={`ml-auto w-12 h-7 rounded-full p-1 transition ${form.autoHadir ? 'bg-emerald-600' : 'bg-slate-300'}`}><span className={`block w-5 h-5 rounded-full bg-white shadow transition ${form.autoHadir ? 'translate-x-5' : ''}`}/></button></div>
    <label className="text-sm font-bold text-slate-700 block">Hari sekolah<select value={form.hariSekolah} onChange={(e) => setForm({ ...form, hariSekolah: Number(e.target.value) as 5|6 })} className="field mt-2"><option value={5}>Senin–Jumat</option><option value={6}>Senin–Sabtu</option></select></label>
    {[1,2].map((sem) => <div key={sem} className="rounded-xl bg-slate-50 border border-slate-200 p-4"><div className="font-bold text-sm mb-3">Semester {sem}</div><div className="grid grid-cols-2 gap-3"><label className="text-xs font-semibold">Tanggal mulai<input type="date" value={sem === 1 ? form.s1Mulai : form.s2Mulai} onChange={(e) => setForm({ ...form, [sem === 1 ? 's1Mulai' : 's2Mulai']: e.target.value })} className="field mt-1"/></label><label className="text-xs font-semibold">Tanggal akhir<input type="date" value={sem === 1 ? form.s1Akhir : form.s2Akhir} onChange={(e) => setForm({ ...form, [sem === 1 ? 's1Akhir' : 's2Akhir']: e.target.value })} className="field mt-1"/></label></div></div>)}
  </div></Modal>
}

function Rekap({ siswa, records, settings, setSettings }: { siswa: any[]; records: any[]; settings: Settings; setSettings: (v: Settings) => void }) {
  const start = settings.semester === 1 ? settings.s1Mulai : settings.s2Mulai
  const end = settings.semester === 1 ? settings.s1Akhir : settings.s2Akhir
  const filtered = records.filter((r) => r.tanggal >= start && r.tanggal <= end)
  const totalHari = new Set(filtered.map((r) => r.tanggal)).size
  return <div><div className="rounded-2xl bg-white border border-slate-200 p-4 mb-4 flex items-center"><BarChart3 size={20} className="text-emerald-600 mr-3"/><div><div className="font-extrabold">Rekap Presensi Semester {settings.semester}</div><div className="text-xs text-slate-500 mt-1">{start} sampai {end} · {totalHari} hari tercatat</div></div><select value={settings.semester} onChange={(e) => setSettings({ ...settings, semester: Number(e.target.value) as 1|2 })} className="ml-auto field !w-auto"><option value={1}>Semester 1</option><option value={2}>Semester 2</option></select></div>
    <div className="rounded-2xl bg-white border border-slate-200 overflow-x-auto"><table className="w-full text-sm min-w-[700px]"><thead><tr className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200"><th className="px-4 py-3 text-left">No.</th><th className="px-4 py-3 text-left">Nama Siswa</th>{STATUS.map((s) => <th key={s} className="px-4 py-3 text-center">{config[s].label}</th>)}<th className="px-4 py-3 text-center">Kehadiran</th></tr></thead><tbody>{siswa.map((s, i) => { const own = filtered.filter((r) => r.siswa_id === s.id); const c = Object.fromEntries(STATUS.map((st) => [st, own.filter((r) => r.status === st).length])) as Record<Status,number>; const pct = own.length ? Math.round(c.H / own.length * 100) : 0; return <tr key={s.id} className={`${i%2?'bg-slate-50/60':'bg-white'} border-b border-slate-100`}><td className="px-4 py-3">{i+1}</td><td className="px-4 py-3 font-bold">{s.nama}</td>{STATUS.map((st) => <td key={st} className={`px-4 py-3 text-center font-semibold ${config[st].text}`}>{c[st]}</td>)}<td className="px-4 py-3 text-center font-extrabold text-emerald-700">{pct}%</td></tr>})}</tbody></table></div>
  </div>
}

function addDays(date: string, amount: number) { const d = new Date(`${date}T12:00:00`); d.setDate(d.getDate() + amount); return d.toISOString().slice(0, 10) }
function initials(name: string) { return name.split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase() }
function longDate(date: string) { return new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${date}T12:00:00`)) }

export default function Presensi() {
  const kelasId = useAppStore((s) => s.kelasAktifId) || 1
  const { data: rawSiswa, loading } = useSiswaList(kelasId)
  const siswa = useMemo(() => [...rawSiswa].sort((a, b) => a.nama.localeCompare(b.nama, 'id')), [rawSiswa])
  const [tanggal, setTanggal] = useState(todayISO())
  const [statusMap, setStatusMap] = useState<Record<number, Status>>({})
  const [keteranganMap, setKeteranganMap] = useState<Record<number, string>>({})
  const [activeId, setActiveId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [tab, setTab] = useState<'harian' | 'rekap'>('harian')
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const [loadedDate, setLoadedDate] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [rekapRecords, setRekapRecords] = useState<any[]>([])

  useEffect(() => { if (!kelasId || !tanggal) return; ;(async () => {
    const res = await window.electronAPI.presensi.get(kelasId, tanggal)
    const sm: Record<number, Status> = {}; const km: Record<number, string> = {}
    for (const r of res) { sm[r.siswa_id] = r.status as Status; km[r.siswa_id] = r.keterangan || '' }
    setStatusMap(sm); setKeteranganMap(km); setActiveId(null); setLoadedDate(tanggal)
  })() }, [kelasId, tanggal])
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 3500); return () => clearTimeout(t) }, [toast])
  useEffect(() => { setSettingsLoaded(false); db.pengaturan.get(`presensi_${kelasId}`).then((x) => { if (x?.value) try { setSettings({ ...defaultSettings, ...JSON.parse(x.value) }) } catch {}; setSettingsLoaded(true) }) }, [kelasId])
  useEffect(() => { if (tab === 'rekap') window.electronAPI.presensi.listByKelas(kelasId).then(setRekapRecords) }, [tab, kelasId])

  const getStatus = (id: number): Status | null => statusMap[id] || (settings.autoHadir ? 'H' : null)
  const persistStudent = async (id: number, status: Status, note = '') => {
    setSaving(true)
    try { await window.electronAPI.presensi.save([{ siswa_id: id, kelas_id: kelasId, tanggal, status, keterangan: note || undefined }]) }
    catch { setToast({ type: 'error', text: 'Perubahan belum tersimpan. Silakan coba lagi.' }) }
    finally { setSaving(false) }
  }
  const setStatus = (id: number, status: Status) => {
    const note = status === 'H' ? '' : (keteranganMap[id] || '')
    setStatusMap((m) => ({ ...m, [id]: status }))
    if (status === 'H') setKeteranganMap((m) => ({ ...m, [id]: '' }))
    persistStudent(id, status, note)
  }
  const counts = Object.fromEntries(STATUS.map((st) => [st, siswa.filter((s) => getStatus(s.id) === st).length])) as Record<Status, number>
  const selectedDay = new Date(`${tanggal}T12:00:00`).getDay()
  const isSchoolDay = selectedDay >= 1 && selectedDay <= settings.hariSekolah

  useEffect(() => {
    if (!settingsLoaded || loadedDate !== tanggal || !settings.autoHadir || !isSchoolDay || siswa.length === 0) return
    const missing = siswa.filter((student) => !statusMap[student.id])
    if (!missing.length) return
    setStatusMap((current) => ({ ...current, ...Object.fromEntries(missing.map((student) => [student.id, 'H'])) }))
    setSaving(true)
    window.electronAPI.presensi.save(missing.map((student) => ({ siswa_id: student.id, kelas_id: kelasId, tanggal, status: 'H' })))
      .catch(() => setToast({ type: 'error', text: 'Auto Hadir belum berhasil disimpan.' }))
      .finally(() => setSaving(false))
  }, [settingsLoaded, loadedDate, tanggal, settings.autoHadir, isSchoolDay, siswa, statusMap, kelasId])

  const saveSettings = async (next: Settings) => { setSettings(next); await db.pengaturan.put({ key: `presensi_${kelasId}`, value: JSON.stringify(next), updated_at: new Date().toISOString() }); setShowSettings(false); setToast({ type: 'success', text: 'Pengaturan presensi berhasil disimpan.' }) }
  const toggleAutoHadir = async () => { const next = { ...settings, autoHadir: !settings.autoHadir }; setSettings(next); await db.pengaturan.put({ key: `presensi_${kelasId}`, value: JSON.stringify(next), updated_at: new Date().toISOString() }) }
  return <div className="max-w-5xl mx-auto pb-24">
    <div className="flex items-center justify-between mb-4"><div className="flex rounded-xl bg-slate-200/70 p-1"><button onClick={() => setTab('harian')} className={`px-4 py-2 rounded-lg text-sm font-bold ${tab === 'harian' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'}`}>Presensi Harian</button><button onClick={() => setTab('rekap')} className={`px-4 py-2 rounded-lg text-sm font-bold ${tab === 'rekap' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'}`}>Rekap Semester</button></div><button onClick={() => setShowSettings(true)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 flex gap-2 items-center"><Settings2 size={16}/>Pengaturan</button></div>
    {tab === 'rekap' ? <Rekap siswa={siswa} records={rekapRecords} settings={settings} setSettings={setSettings}/> : <>
    <div className="rounded-2xl bg-white border border-slate-200 p-2.5 flex items-center justify-between mb-4">
      <button onClick={() => setTanggal(addDays(tanggal, -1))} className="w-11 h-11 rounded-xl border border-slate-200 grid place-items-center hover:bg-slate-50"><ChevronLeft size={21}/></button>
      <div className="text-center"><h1 className="font-extrabold text-slate-900 capitalize">{longDate(tanggal)}</h1><p className="text-xs text-slate-400 mt-0.5">Presensi harian kelas</p></div>
      <div className="flex gap-2"><label className="relative h-11 w-11 rounded-xl border border-slate-200 grid place-items-center hover:bg-slate-50 cursor-pointer" title="Pilih tanggal"><CalendarDays size={20}/><input type="date" max={todayISO()} value={tanggal} onChange={(e) => e.target.value && setTanggal(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" aria-label="Pilih tanggal"/></label><button disabled={tanggal >= todayISO()} onClick={() => setTanggal(addDays(tanggal, 1))} className="w-11 h-11 rounded-xl border border-slate-200 grid place-items-center hover:bg-slate-50 disabled:opacity-35"><ChevronRight size={21}/></button></div>
    </div>

    <div className="grid grid-cols-2 sm:grid-cols-5 rounded-2xl bg-white border border-slate-200 mb-4 overflow-hidden">{STATUS.map((st) => <div key={st} className="flex items-center justify-center gap-2 px-3 py-3.5 border-b sm:border-b-0 sm:border-r last:border-r-0 border-slate-100"><span className={`w-2.5 h-2.5 rounded-full ${config[st].dot}`}/><span className="text-sm text-slate-600">{config[st].label}</span><strong className="text-slate-900">{counts[st]}</strong></div>)}</div>

    <div className="rounded-2xl bg-gradient-to-r from-amber-50 via-white to-blue-50 border border-slate-200 p-4 mb-4 text-sm">
      <div className="flex gap-2 items-center text-slate-600"><Lightbulb size={17} className="text-amber-500"/><strong className="text-slate-800">Klik kartu siswa</strong><span>untuk mengubah status kehadiran.</span></div>
      <div className="flex gap-2 items-center mt-3 pt-3 border-t border-slate-100"><Info size={17} className="text-blue-500 shrink-0"/><span className="text-slate-600">Auto Hadir mengisi siswa yang belum dicatat sebagai Hadir. Status yang sudah dipilih <strong>tidak berubah</strong>.</span><button onClick={toggleAutoHadir} role="switch" aria-checked={settings.autoHadir} className={`ml-auto shrink-0 w-12 h-7 rounded-full p-1 transition ${settings.autoHadir ? 'bg-emerald-600' : 'bg-slate-300'}`}><span className={`block w-5 h-5 rounded-full bg-white shadow transition ${settings.autoHadir ? 'translate-x-5' : ''}`}/></button></div>
      <div className="flex gap-2 items-center mt-3 pt-3 border-t border-slate-100 text-emerald-700"><Cloud size={17} className={saving ? 'animate-pulse' : ''}/><strong>{saving ? 'Sedang menyimpan...' : 'Tersimpan otomatis'}</strong><span className="text-slate-500">setiap kali status atau keterangan diubah.</span></div>
    </div>

    {!isSchoolDay && <div className="rounded-2xl bg-amber-50 border border-amber-200 text-center px-5 py-12 mb-4"><CalendarDays size={34} className="mx-auto text-amber-500 mb-3"/><div className="font-extrabold text-amber-900">Hari Libur Sekolah</div><p className="text-sm text-amber-700 mt-1">Tidak ada daftar presensi karena tanggal ini bukan hari masuk sekolah.</p></div>}

    {isSchoolDay && (loading ? <div className="py-16 text-center text-slate-400">Memuat siswa...</div> : siswa.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center"><div className="font-bold text-slate-700">Belum ada siswa</div><p className="text-sm text-slate-400 mt-1">Tambahkan siswa terlebih dahulu melalui menu Data Siswa.</p></div> : <div className="space-y-3">{siswa.map((s, index) => {
      const st = getStatus(s.id); const open = activeId === s.id
      return <div key={s.id} className={`rounded-2xl bg-white border border-slate-200 border-l-4 ${st ? config[st].line : 'border-l-slate-300'} overflow-hidden transition shadow-sm hover:shadow-md`}>
        <button onClick={() => setActiveId(open ? null : s.id)} className="w-full px-5 py-4 flex items-center gap-4 text-left"><div className="w-11 h-11 rounded-full bg-gradient-to-br from-teal-500 to-cyan-700 text-white grid place-items-center font-extrabold">{initials(s.nama)}</div><div className="flex-1 min-w-0"><div className="font-extrabold text-slate-900 truncate">{s.nama}</div><div className="text-sm text-slate-400 mt-0.5">No. {index + 1}</div></div>{st ? <span className={`rounded-full px-3.5 py-1.5 text-sm font-bold ${config[st].soft} ${config[st].text}`}>{config[st].label}</span> : <span className="rounded-full px-3.5 py-1.5 text-sm font-bold bg-slate-100 text-slate-500">Belum diisi</span>}</button>
        {open && <div className="px-5 pb-4 pt-1 border-t border-slate-100 bg-slate-50/60"><div className="text-xs font-bold text-slate-500 mb-2.5">Pilih status kehadiran</div><div className="flex flex-wrap gap-2">{STATUS.map((option) => <button key={option} onClick={() => setStatus(s.id, option)} className={`rounded-xl px-3.5 py-2 text-xs font-bold border transition ${st === option ? `${config[option].soft} ${config[option].text} border-current` : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}>{config[option].label}</button>)}</div>{st && st !== 'H' && <input value={keteranganMap[s.id] || ''} onChange={(e) => setKeteranganMap((m) => ({ ...m, [s.id]: e.target.value }))} onBlur={() => persistStudent(s.id, st, keteranganMap[s.id] || '')} placeholder="Keterangan (opsional), misalnya demam atau izin keluarga" className="field mt-3"/>}</div>}
      </div>
    })}</div>)}

    </>}
    {showSettings && <SettingsModal value={settings} onClose={() => setShowSettings(false)} onSave={saveSettings}/>} 
    {toast && <div className="fixed inset-x-0 top-6 z-[500] flex justify-center pointer-events-none px-4"><div className={`pointer-events-auto flex items-center gap-3 rounded-2xl border bg-white px-5 py-3.5 shadow-xl text-sm font-semibold ${toast.type === 'success' ? 'border-emerald-200 text-emerald-800' : 'border-red-200 text-red-800'}`}>{toast.type === 'success' ? <span className="w-8 h-8 rounded-full bg-emerald-100 grid place-items-center"><CheckCircle2 size={18}/></span> : <span className="w-8 h-8 rounded-full bg-red-100 grid place-items-center"><AlertCircle size={18}/></span>}<span>{toast.text}</span><button onClick={() => setToast(null)} className="ml-3 opacity-50"><X size={15}/></button></div></div>}
  </div>
}
