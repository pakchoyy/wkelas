import TeachingWeekNavigator from '../../components/TeachingWeekNavigator'
import { createJournalDraft } from '../../../lib/journal-storage'
import { useEffect, useMemo, useRef, useState } from 'react'
import { BookOpen, CalendarDays, ClipboardCheck, Plus, Trash2 } from 'lucide-react'
import type { Jadwal, MataPelajaran, RencanaMengajar } from '../../../shared/types'
import { todayISO } from '../../../shared/utils'
import { db } from '../../../lib/db'
import Modal from '../../components/Modal'
import { teachingSlots, planJournalDraft } from '../../../shared/teaching-flow'
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges'
import { useAppStore } from '../../stores/appStore'

const HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

type FormState = {
  tanggal: string
  mata_pelajaran_id: string
  topik: string
  tujuan_pembelajaran: string
  kegiatan: string
  media: string
  penilaian: string
  status: string
}

const emptyForm = (tanggal = todayISO()): FormState => ({
  tanggal, mata_pelajaran_id: '', topik: '', tujuan_pembelajaran: '', kegiatan: '',
  media: '', penilaian: '', status: 'draft'
})

const toISO = (date: Date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

const fromISO = (value: string) => {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

const mondayOf = (value: string) => {
  const date = fromISO(value)
  const day = date.getDay() || 7
  date.setDate(date.getDate() - day + 1)
  return date
}

const addDays = (date: Date, amount: number) => {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}

export default function Rencana() {
  const kelasId = useAppStore((s) => s.kelasAktifId) || 1
  return <RencanaKelas key={kelasId} kelasId={kelasId}/>
}
function RencanaKelas({kelasId}:{kelasId:number}) {
  const [busy,setBusy] = useState(false)
  const lock = useRef(false)
  const [formError,setFormError] = useState('')
  const [data, setData] = useState<RencanaMengajar[]>([])
  const [jadwal, setJadwal] = useState<Jadwal[]>([])
  const [mapel, setMapel] = useState<MataPelajaran[]>([])
  const [hariSekolah, setHariSekolah] = useState<5 | 6>(5)
  const [selectedDay,setSelectedDay] = useState(() => Math.min(4,Math.max(0,new Date().getDay()-1)))
  const [anchorDate, setAnchorDate] = useState(todayISO())
  const [editing, setEditing] = useState<RencanaMengajar | null>(null)
  const [selectedJadwal, setSelectedJadwal] = useState<Jadwal | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [showForm, setShowForm] = useState(false)
  const [toast, setToast] = useState<{ message: string; error?: boolean } | null>(null)
  const baseline = useRef('')
  const dirty = showForm && JSON.stringify(form) !== baseline.current
  useUnsavedChanges(dirty, busy)
  const closeForm = () => { if (!lock.current && (!dirty || window.confirm('Tutup tanpa menyimpan perubahan rencana?'))) setShowForm(false) }
  const [holidays, setHolidays] = useState<any[]>([])

  const load = async () => {
    const [plans, schedules, subjects, calendar, attendance, scheduleConfig] = await Promise.all([
      window.electronAPI.rencana.list(kelasId),
      window.electronAPI.jadwal.list(kelasId),
      window.electronAPI.mapel.list(kelasId), window.electronAPI.kalender.list(kelasId),
      db.pengaturan.get(`presensi_${kelasId}`), db.pengaturan.get(`jadwal_${kelasId}`)
    ])
    const schoolDays = attendance ? JSON.parse(attendance.value).hariSekolah : 5
    setHariSekolah(schoolDays === 6 ? 6 : 5)
    setJadwal(teachingSlots(schedules, schoolDays, scheduleConfig ? JSON.parse(scheduleConfig.value) : {}))
    setData(plans)
    setMapel(subjects)
    setHolidays(calendar)
  }

  useEffect(() => {
    load().catch(() => setToast({message:'Rencana gagal dimuat. Muat ulang halaman.',error:true}))
  }, [kelasId])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 2600)
    return () => window.clearTimeout(timer)
  }, [toast])

  const weekStart = useMemo(() => mondayOf(anchorDate), [anchorDate])
  const days = useMemo(() => Array.from({ length: hariSekolah }, (_, index) => addDays(weekStart, index)), [weekStart, hariSekolah])
  const mapelName = (item?: Jadwal | null, mapelId?: number) =>
    item?.nama_mapel_custom || mapel.find((subject) => subject.id === (item?.mata_pelajaran_id || mapelId))?.nama || 'Pelajaran'

  const findPlan = (date: string, schedule: Jadwal) => data.find((plan) =>
    plan.tanggal === date && schedule.mata_pelajaran_id
      ? plan.mata_pelajaran_id === schedule.mata_pelajaran_id
      : plan.tanggal === date && !plan.mata_pelajaran_id
  )

  const openPlan = (date: string, schedule: Jadwal, plan?: RencanaMengajar) => {
    setFormError('')
    setSelectedJadwal(schedule)
    setEditing(plan || null)
    const initial = plan ? {
      tanggal: plan.tanggal,
      mata_pelajaran_id: plan.mata_pelajaran_id?.toString() || '',
      topik: plan.topik || '',
      tujuan_pembelajaran: plan.tujuan_pembelajaran || '',
      kegiatan: plan.kegiatan || '',
      media: plan.media || '',
      penilaian: plan.penilaian || '',
      status: plan.status || 'draft'
    } : { ...emptyForm(date), mata_pelajaran_id: schedule.mata_pelajaran_id?.toString() || '' }
    baseline.current = JSON.stringify(initial)
    setForm(initial)
    setShowForm(true)
  }

  const savePlan = async (event: React.FormEvent) => {
    event.preventDefault()
    if (lock.current) return
    lock.current=true;setBusy(true);setFormError('')
    try {
      await window.electronAPI.rencana.save({
        ...form,
        id: editing?.id,
        kelas_id: kelasId,
        mata_pelajaran_id: form.mata_pelajaran_id ? Number(form.mata_pelajaran_id) : null
      })
      setShowForm(false)
      try { await load(); setToast({message:editing ? 'Rencana berhasil diperbarui' : 'Rencana berhasil disimpan'}) } catch { setToast({message:'Rencana tersimpan, tetapi daftar gagal dimuat ulang.',error:true}) }
    } catch {
      setFormError('Rencana gagal disimpan. Isian tetap tersedia; silakan coba lagi.')
    } finally {lock.current=false;setBusy(false)}
  }

  const removePlan = async () => {
    if (!editing || lock.current || !window.confirm('Hapus rencana mengajar ini?')) return
    lock.current=true;setBusy(true);setFormError('')
    try {await window.electronAPI.rencana.delete(editing.id);setShowForm(false);await load()}
    catch {setFormError('Rencana gagal dihapus atau daftar gagal dimuat ulang.')}
    finally {lock.current=false;setBusy(false)}
  }
  const createJournal = async () => {
    if (!editing || !selectedJadwal || lock.current) return
    if (dirty) { setFormError('Simpan perubahan rencana terlebih dahulu, lalu buat draft jurnal.'); return }
    lock.current=true;setBusy(true);setFormError('')
    try {
      await createJournalDraft(db,planJournalDraft(kelasId,{...form,mata_pelajaran_id:form.mata_pelajaran_id ? Number(form.mata_pelajaran_id) : null},selectedJadwal,mapel))
      setShowForm(false);setToast({message:'Draft Jurnal berhasil dibuat'})
    } catch(error) {setFormError(error instanceof Error ? error.message : 'Draft Jurnal gagal dibuat.')}
    finally {lock.current=false;setBusy(false)}
  }

  const statusStyle = (status: string) => status === 'selesai'
    ? 'bg-emerald-100 text-emerald-700'
    : status === 'ditunda' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'

  return (
    <div className="space-y-4">
      {toast && <div className={`fixed left-1/2 top-20 w-[calc(100%_-_2rem)] max-w-md z-[100] -translate-x-1/2 rounded-xl px-5 py-3 text-sm font-bold text-white shadow-xl ${toast.error ? 'bg-red-600' : 'bg-emerald-600'}`}>{toast.message}</div>}

      <div>
        <h2 className="text-xl font-bold">Rencana Mengajar</h2>
        <p className="hidden md:block mt-1 text-sm text-slate-500">Isi rencana langsung dari jadwal pelajaran minggu ini.</p>
      </div>

      <TeachingWeekNavigator value={anchorDate} schoolDays={hariSekolah} selectedDay={Math.min(selectedDay,hariSekolah-1)} onChange={setAnchorDate} onSelectDay={setSelectedDay} holidays={holidays} desktopTabs={false}/>
      <p className="text-xs text-slate-500">Pilih hari, lalu pilih pelajaran untuk mengisi rencana.</p>

      <div className="grid grid-cols-1 gap-3 pb-2 md:grid-cols-2 xl:grid-cols-3">
        {days.map((date, dayIndex) => {
          const dateISO = toISO(date)
          const slots = jadwal.filter((item) => item.hari === dayIndex + 1).sort((a, b) => a.jam_ke - b.jam_ke)
          const isToday = dateISO === todayISO()
          const holiday = holidays.find((item) => ['libur_nasional','libur_sekolah'].includes(item.jenis) && dateISO >= item.tanggal_mulai && dateISO <= (item.tanggal_selesai || item.tanggal_mulai))
          return (
            <section key={dateISO} className={`${dayIndex === Math.min(selectedDay,hariSekolah-1) ? 'block' : 'hidden md:block'} md:min-h-[330px] overflow-hidden rounded-2xl border ${holiday ? 'border-rose-200' : isToday ? 'border-emerald-400' : 'border-slate-200'} ${holiday ? 'bg-rose-50' : ['bg-blue-50/50','bg-emerald-50/50','bg-violet-50/50','bg-amber-50/50','bg-cyan-50/50','bg-rose-50/50'][dayIndex]}`}>
              <header className={`border-b px-4 py-3 ${holiday ? 'bg-rose-100 text-rose-900' : isToday ? 'bg-emerald-600 text-white' : ['bg-blue-100/70 text-blue-900','bg-emerald-100/70 text-emerald-900','bg-violet-100/70 text-violet-900','bg-amber-100/70 text-amber-900','bg-cyan-100/70 text-cyan-900','bg-rose-100/70 text-rose-900'][dayIndex]}`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold">{HARI[dayIndex]}</span>
                  {isToday && <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold">HARI INI</span>}
                </div>
                <span className={`text-xs ${isToday && !holiday ? 'text-emerald-50' : 'text-slate-500'}`}>{date.getDate()} {BULAN[date.getMonth()]} {date.getFullYear()}</span>
              </header>
              <div className="space-y-2 p-3">
                {holiday ? <div className="flex min-h-[160px] md:min-h-[190px] flex-col items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-3 text-center"><CalendarDays size={26} className="mb-2 text-rose-600"/><p className="text-sm font-bold text-rose-800">{holiday.judul}</p><p className="mt-1 text-xs text-rose-700">Tidak ada rencana mengajar pada hari libur.</p></div> : slots.map((slot) => {
                  const plan = findPlan(dateISO, slot)
                  return (
                    <button key={slot.id} onClick={() => openPlan(dateISO, slot, plan)} className="w-full rounded-xl border bg-white p-3 text-left transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md" style={{ borderColor: 'var(--border)' }}>
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Jam {slot.jam_ke} · {slot.jam_mulai}–{slot.jam_selesai}</div>
                          <div className="mt-1 text-sm font-bold text-slate-800">{mapelName(slot)}</div>
                        </div>
                        {plan ? <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${statusStyle(plan.status)}`}>{plan.status || 'draft'}</span> : <Plus size={16} className="text-emerald-600" />}
                      </div>
                      {plan ? <><div className="text-sm font-semibold text-slate-700">{plan.topik}</div>{plan.kegiatan && <div className="mt-2 rounded-lg bg-slate-50 px-2.5 py-2 text-xs text-slate-600"><span className="font-bold text-slate-700">Kegiatan: </span>{plan.kegiatan}</div>}</> : <div className="rounded-lg border border-dashed border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">+ Isi rencana</div>}
                    </button>
                  )
                })}
                {!holiday && slots.length === 0 && <div className="flex min-h-[72px] md:min-h-[190px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white px-3 text-center"><BookOpen size={26} className="mb-2 text-slate-300" /><p className="text-xs font-semibold text-slate-400">Belum ada jadwal pelajaran</p><p className="mt-1 text-[11px] text-slate-400">Isi terlebih dahulu di menu Jadwal.</p></div>}
              </div>
            </section>
          )
        })}
      </div>

      {showForm && <Modal title={`${editing ? 'Edit' : 'Isi'} Rencana · ${mapelName(selectedJadwal, Number(form.mata_pelajaran_id))}`} onClose={closeForm} maxWidth="max-w-2xl" footer={<>
        {editing && <button disabled={busy} onClick={removePlan} className="mr-auto flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-bold text-red-600"><Trash2 size={16} /> Hapus</button>}
        {editing && <button disabled={busy} onClick={createJournal} className="flex items-center gap-2 rounded-xl border border-emerald-200 px-4 py-2.5 text-sm font-bold text-emerald-700"><ClipboardCheck size={16} /> Buat Draft Jurnal</button>}
        <button disabled={busy} type="submit" form="rencana-form" className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white">Simpan Rencana</button>
      </>}>
        <form id="rencana-form" onSubmit={savePlan}><p className="mb-3 text-xs text-slate-500">Draft jurnal menyalin tanggal, jam, materi, dan kegiatan dari rencana tersimpan. Simpan perubahan terlebih dahulu; jurnal yang sudah ada tidak ditimpa.</p>{formError && <p role="alert" className="mb-3 text-sm text-red-700">{formError}</p>}<fieldset disabled={busy} className="min-w-0 space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="text-xs font-bold text-slate-600">Tanggal<input type="date" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} className="field mt-1.5" required /></label>
            <label className="text-xs font-bold text-slate-600 sm:col-span-2">Mata pelajaran<select value={form.mata_pelajaran_id} onChange={(e) => setForm({ ...form, mata_pelajaran_id: e.target.value })} className="field mt-1.5"><option value="">Tanpa mata pelajaran</option>{mapel.filter(item => item.is_aktif !== 0 || String(item.id) === form.mata_pelajaran_id).map((item) => <option key={item.id} value={item.id}>{item.nama}</option>)}</select></label>
          </div>
          <label className="block text-xs font-bold text-slate-600">Topik / materi <span className="text-red-500">*</span><input value={form.topik} onChange={(e) => setForm({ ...form, topik: e.target.value })} className="field mt-1.5" placeholder="Contoh: Penjumlahan dua angka" required /></label>
          <label className="block text-xs font-bold text-slate-600">Tujuan pembelajaran <span className="font-normal text-slate-400">(opsional)</span><textarea value={form.tujuan_pembelajaran} onChange={(e) => setForm({ ...form, tujuan_pembelajaran: e.target.value })} className="field mt-1.5" rows={2} placeholder="Siswa mampu..." /></label>
          <label className="block text-xs font-bold text-slate-600">Kegiatan pembelajaran <span className="font-normal text-slate-400">(opsional)</span><textarea value={form.kegiatan} onChange={(e) => setForm({ ...form, kegiatan: e.target.value })} className="field mt-1.5" rows={3} placeholder="Pembukaan, kegiatan inti, penutup..." /></label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-xs font-bold text-slate-600">Media <span className="font-normal text-slate-400">(opsional)</span><input value={form.media} onChange={(e) => setForm({ ...form, media: e.target.value })} className="field mt-1.5" placeholder="Buku, video, LKPD..." /></label>
            <label className="text-xs font-bold text-slate-600">Penilaian <span className="font-normal text-slate-400">(opsional)</span><input value={form.penilaian} onChange={(e) => setForm({ ...form, penilaian: e.target.value })} className="field mt-1.5" placeholder="Observasi, kuis..." /></label>
          </div>
          <label className="block text-xs font-bold text-slate-600">Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="field mt-1.5"><option value="draft">Draft</option><option value="selesai">Selesai</option><option value="ditunda">Ditunda</option></select></label>
        </fieldset></form>
      </Modal>}
    </div>
  )
}
