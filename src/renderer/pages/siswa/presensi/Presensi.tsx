import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Info, Lightbulb, Save, X } from 'lucide-react'
import { useSiswaList } from '../../../hooks/useSiswa'
import { useAppStore } from '../../../stores/appStore'
import { todayISO } from '../../../../shared/utils'

const STATUS = ['H', 'S', 'I', 'A', 'T'] as const
type Status = typeof STATUS[number]
const config: Record<Status, { label: string; dot: string; soft: string; text: string; line: string }> = {
  H: { label: 'Hadir', dot: 'bg-emerald-500', soft: 'bg-emerald-100', text: 'text-emerald-700', line: 'border-l-emerald-500' },
  S: { label: 'Sakit', dot: 'bg-blue-500', soft: 'bg-blue-100', text: 'text-blue-700', line: 'border-l-blue-500' },
  I: { label: 'Izin', dot: 'bg-amber-500', soft: 'bg-amber-100', text: 'text-amber-700', line: 'border-l-amber-500' },
  A: { label: 'Alpa', dot: 'bg-red-500', soft: 'bg-red-100', text: 'text-red-700', line: 'border-l-red-500' },
  T: { label: 'Terlambat', dot: 'bg-orange-500', soft: 'bg-orange-100', text: 'text-orange-700', line: 'border-l-orange-500' },
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

  useEffect(() => { if (!kelasId || !tanggal) return; ;(async () => {
    const res = await window.electronAPI.presensi.get(kelasId, tanggal)
    const sm: Record<number, Status> = {}; const km: Record<number, string> = {}
    for (const r of res) { sm[r.siswa_id] = r.status as Status; km[r.siswa_id] = r.keterangan || '' }
    setStatusMap(sm); setKeteranganMap(km); setActiveId(null)
  })() }, [kelasId, tanggal])
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 3500); return () => clearTimeout(t) }, [toast])

  const getStatus = (id: number) => statusMap[id] || 'H'
  const setStatus = (id: number, status: Status) => { setStatusMap((m) => ({ ...m, [id]: status })); if (status === 'H') setKeteranganMap((m) => ({ ...m, [id]: '' })) }
  const counts = Object.fromEntries(STATUS.map((st) => [st, siswa.filter((s) => getStatus(s.id) === st).length])) as Record<Status, number>
  const hadirkanSemua = () => { setStatusMap(Object.fromEntries(siswa.map((s) => [s.id, 'H']))); setKeteranganMap({}); setToast({ type: 'success', text: 'Semua siswa ditandai hadir. Tekan Simpan Presensi untuk menyimpan.' }) }

  const save = async () => {
    setSaving(true)
    try {
      await window.electronAPI.presensi.save(siswa.map((s) => ({ siswa_id: s.id, kelas_id: kelasId, tanggal, status: getStatus(s.id), keterangan: keteranganMap[s.id] || undefined })))
      setToast({ type: 'success', text: `Presensi ${longDate(tanggal)} berhasil disimpan.` })
    } catch { setToast({ type: 'error', text: 'Presensi gagal disimpan. Silakan coba lagi.' }) }
    finally { setSaving(false) }
  }

  return <div className="max-w-5xl mx-auto pb-24">
    <div className="rounded-2xl bg-white border border-slate-200 p-2.5 flex items-center justify-between mb-4">
      <button onClick={() => setTanggal(addDays(tanggal, -1))} className="w-11 h-11 rounded-xl border border-slate-200 grid place-items-center hover:bg-slate-50"><ChevronLeft size={21}/></button>
      <div className="text-center"><h1 className="font-extrabold text-slate-900 capitalize">{longDate(tanggal)}</h1><p className="text-xs text-slate-400 mt-0.5">Presensi harian kelas</p></div>
      <div className="flex gap-2"><label className="w-11 h-11 rounded-xl border border-slate-200 grid place-items-center hover:bg-slate-50 cursor-pointer relative"><CalendarDays size={20}/><input type="date" max={todayISO()} value={tanggal} onChange={(e) => e.target.value && setTanggal(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer"/></label><button disabled={tanggal >= todayISO()} onClick={() => setTanggal(addDays(tanggal, 1))} className="w-11 h-11 rounded-xl border border-slate-200 grid place-items-center hover:bg-slate-50 disabled:opacity-35"><ChevronRight size={21}/></button></div>
    </div>

    <div className="grid grid-cols-2 sm:grid-cols-5 rounded-2xl bg-white border border-slate-200 mb-4 overflow-hidden">{STATUS.map((st) => <div key={st} className="flex items-center justify-center gap-2 px-3 py-3.5 border-b sm:border-b-0 sm:border-r last:border-r-0 border-slate-100"><span className={`w-2.5 h-2.5 rounded-full ${config[st].dot}`}/><span className="text-sm text-slate-600">{config[st].label}</span><strong className="text-slate-900">{counts[st]}</strong></div>)}</div>

    <div className="rounded-2xl bg-white border border-slate-200 p-4 mb-4 text-sm">
      <div className="flex gap-2 items-center text-slate-600"><Lightbulb size={17} className="text-amber-500"/><strong className="text-slate-800">Klik kartu siswa</strong><span>untuk mengubah status kehadiran.</span></div>
      <div className="flex gap-2 items-center mt-3 pt-3 border-t border-slate-100"><Info size={17} className="text-blue-500"/><span className="text-slate-600">Semua siswa otomatis dianggap <strong className="text-emerald-700">Hadir</strong>.</span><button onClick={hadirkanSemua} className="ml-auto text-emerald-700 font-bold hover:underline">Hadirkan Semua</button></div>
    </div>

    {loading ? <div className="py-16 text-center text-slate-400">Memuat siswa...</div> : siswa.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center"><div className="font-bold text-slate-700">Belum ada siswa</div><p className="text-sm text-slate-400 mt-1">Tambahkan siswa terlebih dahulu melalui menu Data Siswa.</p></div> : <div className="space-y-3">{siswa.map((s, index) => {
      const st = getStatus(s.id); const open = activeId === s.id
      return <div key={s.id} className={`rounded-2xl bg-white border border-slate-200 border-l-4 ${config[st].line} overflow-hidden transition shadow-sm hover:shadow-md`}>
        <button onClick={() => setActiveId(open ? null : s.id)} className="w-full px-5 py-4 flex items-center gap-4 text-left"><div className="w-11 h-11 rounded-full bg-gradient-to-br from-teal-500 to-cyan-700 text-white grid place-items-center font-extrabold">{initials(s.nama)}</div><div className="flex-1 min-w-0"><div className="font-extrabold text-slate-900 truncate">{s.nama}</div><div className="text-sm text-slate-400 mt-0.5">No. {index + 1}</div></div><span className={`rounded-full px-3.5 py-1.5 text-sm font-bold ${config[st].soft} ${config[st].text}`}>{config[st].label}</span></button>
        {open && <div className="px-5 pb-4 pt-1 border-t border-slate-100 bg-slate-50/60"><div className="text-xs font-bold text-slate-500 mb-2.5">Pilih status kehadiran</div><div className="flex flex-wrap gap-2">{STATUS.map((option) => <button key={option} onClick={() => setStatus(s.id, option)} className={`rounded-xl px-3.5 py-2 text-xs font-bold border transition ${st === option ? `${config[option].soft} ${config[option].text} border-current` : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}>{config[option].label}</button>)}</div>{st !== 'H' && <input value={keteranganMap[s.id] || ''} onChange={(e) => setKeteranganMap((m) => ({ ...m, [s.id]: e.target.value }))} placeholder="Keterangan (opsional), misalnya demam atau izin keluarga" className="field mt-3"/>}</div>}
      </div>
    })}</div>}

    {siswa.length > 0 && <div className="fixed bottom-5 right-6 z-40"><button onClick={save} disabled={saving} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3.5 font-bold shadow-xl flex items-center gap-2 disabled:opacity-50"><Save size={18}/>{saving ? 'Menyimpan...' : 'Simpan Presensi'}</button></div>}
    {toast && <div className="fixed inset-x-0 top-6 z-[500] flex justify-center pointer-events-none px-4"><div className={`pointer-events-auto flex items-center gap-3 rounded-2xl border bg-white px-5 py-3.5 shadow-xl text-sm font-semibold ${toast.type === 'success' ? 'border-emerald-200 text-emerald-800' : 'border-red-200 text-red-800'}`}>{toast.type === 'success' ? <span className="w-8 h-8 rounded-full bg-emerald-100 grid place-items-center"><CheckCircle2 size={18}/></span> : <span className="w-8 h-8 rounded-full bg-red-100 grid place-items-center"><AlertCircle size={18}/></span>}<span>{toast.text}</span><button onClick={() => setToast(null)} className="ml-3 opacity-50"><X size={15}/></button></div></div>}
  </div>
}
