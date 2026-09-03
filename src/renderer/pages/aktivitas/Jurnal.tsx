import {useUnsavedChanges} from '../../hooks/useUnsavedChanges'
import { compareJournalRows, journalReportBody, journalWordHtml } from '../../../shared/journal-report'
import { saveJournalField } from '../../../lib/journal-storage'
import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarDays, FileOutput, FileSpreadsheet, FileText, Pencil, Plus, Printer, Trash2 } from 'lucide-react'
import { useAppStore } from '../../stores/appStore'
import { todayISO } from '../../../shared/utils'
import { db } from '../../../lib/db'
import Modal from '../../components/Modal'
import { teachingSlots } from '../../../shared/teaching-flow'
import { schoolDayStatus } from '../../../shared/school-day'
import TeachingWeekNavigator from '../../components/TeachingWeekNavigator'

type Form = { tanggal: string; jam_ke: string; mata_pelajaran: string; materi: string; kegiatan: string; kendala: string; refleksi: string }
const blank = (): Form => ({ tanggal: todayISO(), jam_ke: '', mata_pelajaran: '', materi: '', kegiatan: '', kendala: '', refleksi: '' })
const dateLabel = (value: string) => new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(`${value}T12:00:00`))
const monday = (value: string) => { const date=new Date(`${value}T12:00:00`); const day=date.getDay()||7; date.setDate(date.getDate()-day+1); return date }
const iso = (date: Date) => todayISO(date)
const shift = (date: Date, days: number) => { const next=new Date(date); next.setDate(next.getDate()+days); return next }

export default function Jurnal() {
  const kelasId = useAppStore((s) => s.kelasAktifId) || 1
  return <JurnalKelas key={kelasId} kelasId={kelasId}/>
}

function JurnalKelas({kelasId}: {kelasId:number}) {
  const [quickError, setQuickError] = useState('')
  const [pending, setPending] = useState(0)
  const [drafts, setDrafts] = useState<Record<string,string>>({})
  const queue = useRef(Promise.resolve())
  const [data, setData] = useState<any[]>([])
  const [identity, setIdentity] = useState({ kelas: '-', semester: '-', tahun: '-', sekolah: '-', guru: '-' })
  const [month, setMonth] = useState(todayISO().slice(0, 7))
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState<Form>(blank())
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null)
  const [weekAnchor, setWeekAnchor] = useState(todayISO())
  const [schoolDays,setSchoolDays] = useState(5)
  const [selectedDay,setSelectedDay] = useState(()=>Math.min(4,Math.max(0,new Date().getDay()-1)))
  const [jadwal, setJadwal] = useState<any[]>([])
  const [mapel, setMapel] = useState<any[]>([])
  const [holidays, setHolidays] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const saveLock = useRef(false)
  const [formError, setFormError] = useState('')
  const [showExport, setShowExport] = useState(false)
  useUnsavedChanges(Object.keys(drafts).length > 0,pending > 0 || saving)

  const load = async () => { const [journals,schedules,subjects,calendar,attendance,scheduleConfig]=await Promise.all([window.electronAPI.jurnal.list(kelasId),window.electronAPI.jadwal.list(kelasId),window.electronAPI.mapel.list(kelasId),window.electronAPI.kalender.list(kelasId),db.pengaturan.get(`presensi_${kelasId}`),db.pengaturan.get(`jadwal_${kelasId}`)]); setData(journals); setSchoolDays(attendance && JSON.parse(attendance.value).hariSekolah === 6 ? 6 : 5); setJadwal(teachingSlots(schedules, attendance ? JSON.parse(attendance.value).hariSekolah : 5, scheduleConfig ? JSON.parse(scheduleConfig.value) : {})); setMapel(subjects); setHolidays(calendar) }
  useEffect(() => {
    load().catch(() => setQuickError('Jurnal gagal dimuat. Muat ulang halaman.'))
    db.kelas.get(kelasId).then(async (kelas) => {
      if (!kelas) return
      const guru = await db.guru.get(kelas.guru_id)
      setIdentity({ kelas: kelas.nama_kelas, semester: String(kelas.semester), tahun: kelas.tahun_ajaran, sekolah: guru?.nama_sekolah || '-', guru: guru?.nama || '-' })
    })
  }, [kelasId])
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(null), 3000); return () => clearTimeout(timer) }, [toast])

  const rows = useMemo(() => data.filter((item) => item.tanggal?.startsWith(month)).sort(compareJournalRows), [data, month])
  const monthName = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date(`${month}-01T12:00:00`))
  const weekStart=monday(weekAnchor)
  const isHoliday=(date:string)=>holidays.some((item)=>['libur_nasional','libur_sekolah'].includes(item.jenis)&&date>=item.tanggal_mulai&&date<=(item.tanggal_selesai||item.tanggal_mulai))
  const weeklyRows=jadwal.flatMap((slot)=>{ const tanggal=iso(shift(weekStart,slot.hari-1)); if(isHoliday(tanggal)) return []; const subject=slot.nama_mapel_custom||mapel.find((item)=>item.id===slot.mata_pelajaran_id)?.nama||'Pelajaran'; const journal=data.find((item)=>item.tanggal===tanggal&&String(item.jam_ke)===String(slot.jam_ke)); return [{slot,tanggal,subject,journal}] }).sort((a,b)=>a.tanggal.localeCompare(b.tanggal)||a.slot.jam_ke-b.slot.jam_ke)
  const selectedDate=iso(shift(weekStart,Math.min(selectedDay,schoolDays-1)))
  const selectedStatus=schoolDayStatus(selectedDate,schoolDays,holidays)
  const dayRows=weeklyRows.filter(row=>row.tanggal===selectedDate)
  const openNew = () => { setFormError(''); setEditId(null); setForm({ ...blank(), tanggal: month === todayISO().slice(0, 7) ? todayISO() : `${month}-01` }); setShowForm(true) }
  const openEdit = (item: any) => { setFormError(''); setEditId(item.id); setForm({ tanggal: item.tanggal || todayISO(), jam_ke: item.jam_ke || '', mata_pelajaran: item.mata_pelajaran || '', materi: item.materi || '', kegiatan: item.kegiatan || '', kendala: item.kendala || '', refleksi: item.refleksi || '' }); setShowForm(true) }

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    if (saveLock.current) return
    saveLock.current = true; setSaving(true); setFormError('')
    try { await window.electronAPI.jurnal.save({ ...form, kelas_id: kelasId, ...(editId ? { id: editId } : {}) }); setShowForm(false); await load(); setToast({ text: editId ? 'Jurnal berhasil diperbarui' : 'Jurnal berhasil ditambahkan' }) }
    catch { setFormError('Jurnal gagal disimpan. Isian tetap tersedia; silakan coba lagi.') }
    finally { saveLock.current = false; setSaving(false) }
  }
  const remove = async () => { if (!editId || !window.confirm('Hapus jurnal ini?')) return; await window.electronAPI.jurnal.delete(editId); setShowForm(false); await load(); setToast({ text: 'Jurnal berhasil dihapus' }) }
  const persistField = (target: {id?:number;kelas_id:number;tanggal:string;jam_ke:string;mata_pelajaran:string}, field: 'materi'|'kegiatan'|'kendala'|'refleksi', value: string, draftKey: string) => {
    setPending(n => n + 1)
    queue.current = queue.current.then(async () => {
      try {
        const saved = await saveJournalField(db,target,field,value)
        if (saved) setData(current => [...current.filter(item => item.id !== saved.id),saved])
        setDrafts(current => { if (current[draftKey] !== value) return current; const next = {...current}; delete next[draftKey]; return next })
      } catch(error) { setQuickError(error instanceof Error ? error.message : 'Jurnal gagal disimpan. Isian tetap tersedia; keluar dari kolom untuk mencoba lagi.') }
      finally { setPending(n => n - 1) }
    })
  }
  const quickSave = (item: any, field: 'materi'|'kegiatan'|'kendala'|'refleksi', value: string) => {
    const key = `record-${item.id}-${field}`
    if (drafts[key] === undefined) return
    persistField({id:item.id,kelas_id:kelasId,tanggal:item.tanggal,jam_ke:String(item.jam_ke || ''),mata_pelajaran:item.mata_pelajaran},field,value,key)
  }
  const quickWeeklySave = (row:any, field:'materi'|'kegiatan'|'kendala'|'refleksi', value:string) => {
    const key = `slot-${row.tanggal}-${row.slot.id}-${field}`
    if (drafts[key] === undefined) return
    persistField({kelas_id:kelasId,tanggal:row.tanggal,jam_ke:String(row.slot.jam_ke),mata_pelajaran:row.subject},field,value,key)
  }


  const exportExcel = async () => {
    const XLSX = await import('xlsx')
    const report = [['JURNAL HARIAN MENGAJAR GURU'], ['Sekolah', identity.sekolah, '', 'Bulan', monthName], ['Kelas', identity.kelas, '', 'Semester', identity.semester], ['Tahun Pelajaran', identity.tahun, '', 'Guru', identity.guru], [], ['No', 'Hari / Tanggal', 'Jam', 'Mata Pelajaran', 'Materi', 'Kegiatan Pembelajaran', 'Kendala', 'Refleksi'], ...rows.map((item, index) => [index + 1, dateLabel(item.tanggal), item.jam_ke || '', item.mata_pelajaran || '', item.materi || '', item.kegiatan || '', item.kendala || '', item.refleksi || ''])]
    const sheet = XLSX.utils.aoa_to_sheet(report); sheet['!cols'] = [{ wch: 5 }, { wch: 24 }, { wch: 9 }, { wch: 20 }, { wch: 28 }, { wch: 36 }, { wch: 24 }, { wch: 28 }]
    const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, sheet, 'Jurnal Harian'); XLSX.writeFile(workbook, `jurnal-harian-${identity.kelas}-${month}.xlsx`); setToast({ text: 'Laporan Excel berhasil dibuat' })
  }
  const exportWord = () => {
    if (pending || Object.keys(drafts).length) { setQuickError('Simpan semua isian sebelum ekspor.'); return }
    const content = journalWordHtml(journalReportBody(identity,monthName,rows))
    const url = URL.createObjectURL(new Blob(['\ufeff', content], { type: 'application/msword' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `jurnal-harian-${identity.kelas}-${month}.doc`; document.body.appendChild(anchor); anchor.click(); anchor.remove(); window.setTimeout(() => URL.revokeObjectURL(url),1000); setShowExport(false); setToast({ text: 'Dokumen Word berhasil dibuat' })
  }
  const exportPdf = () => { if (pending || Object.keys(drafts).length) {setQuickError('Simpan semua isian sebelum mencetak.');return}; setShowExport(false); window.print() }

  return <div className="journal-page space-y-4">
    <style>{`@media print {
      @page { size: A4 landscape; margin: 12mm; }
      .app-layout > header, .app-layout > div > div:first-child, .mobile-navigation, dialog { display:none!important; }
      .app-layout, .app-layout > div, .app-layout main { display:block!important;height:auto!important;overflow:visible!important; }
      .app-layout main { padding:0!important; }
      .animate-slide-up { animation:none!important;transform:none!important; }
      .journal-page > :not(.journal-print) { display:none!important; }
      .journal-page > .journal-print { display:block!important;margin:0!important;color:black;background:white;font:9pt Arial,sans-serif; }
      .journal-print h1 {font-size:15pt;margin-bottom:8pt;}
      .journal-print p {margin-bottom:10pt;}
      .journal-print table {width:100%;border-collapse:collapse;table-layout:fixed;}
      .journal-print thead {display:table-header-group;}
      .journal-print th,.journal-print td {border:1px solid #555;padding:5pt;vertical-align:top;overflow-wrap:anywhere;}
      .journal-print th:first-child {width:5%;}
      .journal-print th:nth-child(2) {width:11%;}
      .journal-print th:nth-child(3) {width:6%;}
      .journal-print tr {break-inside:auto;}
    }`}</style>
    <section className="journal-print hidden" aria-label="Laporan jurnal untuk cetak" dangerouslySetInnerHTML={{__html:journalReportBody(identity,monthName,rows)}}/>

    {quickError && <div role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{quickError} Isian yang gagal tetap tersedia; fokuskan kembali kolom lalu keluar untuk mencoba lagi.<button onClick={() => setQuickError('')} className="ml-2 min-h-11 underline">Tutup pesan</button></div>}

    {toast && <div className={`fixed left-1/2 top-20 w-[calc(100%_-_2rem)] max-w-md z-[100] -translate-x-1/2 rounded-xl px-5 py-3 text-sm font-bold text-white shadow-xl ${toast.error ? 'bg-red-600' : 'bg-emerald-600'}`}>{toast.text}</div>}
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-extrabold text-slate-900">Jurnal Harian Mengajar</h2><p className="mt-1 text-sm text-slate-500">Pilih hari, lalu isi jurnal sesuai pelajaran.</p></div><div className="flex flex-wrap gap-2"><div className="relative"><button onClick={() => setShowExport((open) => !open)} disabled={!rows.length || pending > 0 || Object.keys(drafts).length > 0} className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-bold text-emerald-700 disabled:opacity-40"><FileOutput size={17}/>Ekspor</button>{showExport && <div className="absolute left-0 sm:left-auto sm:right-0 top-full z-30 mt-2 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl"><button onClick={() => { exportExcel(); setShowExport(false) }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold hover:bg-emerald-50"><FileSpreadsheet size={16} className="text-emerald-600"/>Excel (.xlsx)</button><button onClick={exportWord} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold hover:bg-blue-50"><FileText size={16} className="text-blue-600"/>Word (.doc)</button><button onClick={exportPdf} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold hover:bg-red-50"><Printer size={16} className="text-red-600"/>PDF (Cetak)</button></div>}</div><button onClick={openNew} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white"><Plus size={17}/>Tambah Jurnal</button></div></div>

    <section className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"><strong className="text-slate-800">{identity.sekolah}</strong><span className="text-slate-500">{identity.kelas} · Semester {identity.semester} · {identity.tahun}</span><span className="lg:ml-auto text-slate-500">Wali Kelas: <strong className="text-slate-700">{identity.guru}</strong></span></section>
    <TeachingWeekNavigator value={weekAnchor} schoolDays={schoolDays} selectedDay={Math.min(selectedDay,schoolDays-1)} onChange={setWeekAnchor} onSelectDay={setSelectedDay} holidays={holidays}/>
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white" aria-label="Isian jurnal harian">
      <div className={`flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3 ${selectedStatus.active ? 'border-slate-200 bg-slate-50' : 'border-rose-200 bg-rose-100 text-rose-900'}`}>
        <h3 className="text-sm font-bold">{dateLabel(selectedDate)}</h3>
        {selectedStatus.active && dayRows.length>0 && <span className="text-xs text-slate-500 lg:hidden">Geser untuk kolom lainnya →</span>}
      </div>
      {!selectedStatus.active ? <div className="flex min-h-40 flex-col items-center justify-center bg-rose-50 p-5 text-center text-rose-800"><CalendarDays size={28} className="mb-2"/><strong>{selectedStatus.reason}</strong><p className="mt-1 text-sm">Tidak ada kegiatan mengajar pada hari libur.</p></div> : dayRows.length===0 ? <div className="p-8 text-center text-sm text-slate-500">Belum ada jadwal pelajaran pada hari ini.<a href="#/aktivitas/jadwal" className="mx-auto mt-3 block w-fit rounded-lg border border-slate-200 px-3 py-3 font-semibold text-teal-700">Buka Jadwal Pelajaran</a></div> : <>
        <div className="overflow-x-auto" role="region" aria-label="Geser untuk mengisi jurnal" tabIndex={0}>
          <table className="w-full min-w-[1040px] table-fixed text-sm"><thead><tr className="bg-slate-50 text-xs text-slate-600">
            <th className="sticky left-0 z-10 w-36 bg-slate-50 px-3 py-3 text-left">Pelajaran / jam</th>
            {['Materi','Kegiatan pembelajaran','Kendala','Refleksi'].map(label=><th key={label} className="w-52 px-3 py-3 text-left">{label}</th>)}
            <th className="w-20 px-2 py-3">Form</th>
          </tr></thead><tbody>{dayRows.map(row=><tr key={`${row.tanggal}-${row.slot.id}`} className="border-t border-slate-100 align-top">
            <th scope="row" className="sticky left-0 z-10 bg-white px-3 py-3 text-left text-xs"><span className="block font-bold">{row.subject}</span><span className="mt-1 block font-normal text-slate-500">Jam {row.slot.jam_ke}</span><span className="block font-normal text-slate-500">{row.slot.jam_mulai}–{row.slot.jam_selesai}</span></th>
            {(['materi','kegiatan','kendala','refleksi'] as const).map((field,index)=><td key={field} className="p-2"><textarea aria-label={`${['Materi','Kegiatan pembelajaran','Kendala','Refleksi'][index]} ${row.subject} jam ${row.slot.jam_ke}`} rows={3} value={drafts[`slot-${row.tanggal}-${row.slot.id}-${field}`] ?? row.journal?.[field] ?? ''} onChange={e=>setDrafts(current=>({...current,[`slot-${row.tanggal}-${row.slot.id}-${field}`]:e.target.value}))} onBlur={e=>quickWeeklySave(row,field,e.target.value)} placeholder={index<2 ? 'Tulis di sini' : 'Opsional'} className="field resize-y text-sm"/></td>)}
            <td className="px-2 py-3"><button aria-label={`Buka form jurnal ${row.subject} jam ${row.slot.jam_ke}`} disabled={pending>0 || Object.keys(drafts).length>0} onClick={()=>{if(row.journal) openEdit(row.journal);else {setEditId(null);setFormError('');setForm({...blank(),tanggal:row.tanggal,jam_ke:String(row.slot.jam_ke),mata_pelajaran:row.subject});setShowForm(true)}}} className="grid size-11 place-items-center rounded-lg border border-slate-200 text-teal-700 disabled:opacity-40"><Pencil size={17}/></button></td>
          </tr>)}</tbody></table>
        </div>
        <p role="status" className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">{pending ? 'Menyimpan jurnal…' : Object.keys(drafts).length ? 'Ada isian yang belum tersimpan.' : 'Isian tersimpan otomatis saat pindah kolom.'}</p>
      </>}
    </section>
    <div className="flex flex-wrap gap-3 items-center justify-between rounded-xl border border-slate-200 bg-white p-3"><div><div className="text-xs font-bold uppercase tracking-wider text-slate-400">Periode Laporan</div><div className="mt-0.5 font-bold capitalize text-slate-800">{monthName}</div></div><input type="month" value={month} aria-label="Bulan laporan jurnal" onChange={(event) => { if (event.target.value) setMonth(event.target.value) }} className="field !w-auto" /></div>

    <div className="lg:hidden print:hidden space-y-3" aria-label="Jurnal bulanan">{rows.map(item => <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-500">{dateLabel(item.tanggal)} · Jam {item.jam_ke || '—'}</p>
      <h3 className="mt-1 font-bold break-words">{item.mata_pelajaran || 'Umum'}</h3>
      <dl className="mt-3 space-y-3 text-sm">{([['materi','Materi'],['kegiatan','Kegiatan'],['kendala','Kendala'],['refleksi','Refleksi']] as const).map(([key,label]) => <div key={key}><dt className="font-semibold text-slate-500">{label}</dt><dd className="whitespace-pre-wrap break-words">{item[key] || '—'}</dd></div>)}</dl>
      <button onClick={() => openEdit(item)} className="mt-3 min-h-11 rounded-xl bg-emerald-50 px-4 text-sm font-bold text-emerald-700">Edit jurnal</button>
    </article>)}{!rows.length && <p className="p-6 text-center text-sm text-slate-500">Belum ada jurnal pada bulan ini.</p>}</div>
    <div className="hidden lg:block print:block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-xs"><thead><tr className="bg-slate-100 text-slate-600"><th className="px-2 py-3">No.</th><th className="px-3 py-3 text-left">Hari / Tanggal</th><th className="px-2 py-3">Jam</th><th className="px-3 py-3 text-left">Mata Pelajaran</th><th className="px-3 py-3 text-left">Materi</th><th className="px-3 py-3 text-left">Kegiatan Pembelajaran</th><th className="px-3 py-3 text-left">Kendala / Refleksi</th><th className="px-2 py-3">Aksi</th></tr></thead><tbody>{rows.map((item, index) => <tr key={item.id} className={`${index % 2 ? 'bg-slate-50/70' : 'bg-white'} border-t border-slate-100 align-top hover:bg-emerald-50/40`}><td className="px-2 py-3 text-center text-slate-400">{index + 1}</td><td className="px-3 py-3 font-semibold capitalize text-slate-700">{dateLabel(item.tanggal)}</td><td className="px-2 py-3 text-center">{item.jam_ke || '—'}</td><td className="px-3 py-3 font-bold text-slate-700">{item.mata_pelajaran || 'Umum'}</td><td className="px-2 py-2"><input value={drafts[`record-${item.id}-materi`] ?? item.materi ?? ''} onChange={e => setDrafts(current => ({...current,[`record-${item.id}-materi`]:e.target.value}))} onBlur={(e)=>quickSave(item,'materi',e.target.value)} placeholder="Isi materi" className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-xs outline-none hover:border-slate-200 focus:border-emerald-400 focus:bg-white"/></td><td className="px-2 py-2"><textarea value={drafts[`record-${item.id}-kegiatan`] ?? item.kegiatan ?? ''} onChange={e => setDrafts(current => ({...current,[`record-${item.id}-kegiatan`]:e.target.value}))} onBlur={(e)=>quickSave(item,'kegiatan',e.target.value)} placeholder="Isi kegiatan" rows={2} className="w-full resize-none rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-xs outline-none hover:border-slate-200 focus:border-emerald-400 focus:bg-white"/></td><td className="px-3 py-3 text-slate-600">{item.kendala && <div><strong>Kendala:</strong> {item.kendala}</div>}{item.refleksi && <div className="mt-1"><strong>Refleksi:</strong> {item.refleksi}</div>}{!item.kendala && !item.refleksi && '—'}</td><td className="px-2 py-3 text-center"><button onClick={() => openEdit(item)} className="rounded-lg p-2 text-slate-400 hover:bg-emerald-50 hover:text-emerald-700"><Pencil size={15}/></button></td></tr>)}</tbody></table></div>{rows.length === 0 && <div className="py-16 text-center"><div className="font-bold text-slate-600">Belum ada jurnal pada bulan ini</div><p className="mt-1 text-sm text-slate-400">Tambahkan jurnal atau buat dari Rencana Mengajar.</p></div>}</div>

    {showForm && <Modal title={editId ? 'Edit Jurnal Harian' : 'Tambah Jurnal Harian'} onClose={() => { if (!saveLock.current) setShowForm(false) }} maxWidth="max-w-2xl" footer={<>{editId && <button type="button" disabled={saving} onClick={remove} className="mr-auto flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-bold text-red-600"><Trash2 size={16}/>Hapus</button>}<button type="submit" disabled={saving} form="journal-form" className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white">{saving ? 'Menyimpan...' : 'Simpan Jurnal'}</button></>}><form id="journal-form" onSubmit={save}>{formError && <p role="alert" className="mb-3 text-sm text-red-700">{formError}</p>}<fieldset disabled={saving} className="min-w-0 space-y-4"><div className="grid grid-cols-1 gap-3 sm:grid-cols-3"><label className="text-xs font-bold text-slate-600">Tanggal<input required type="date" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} className="field mt-1.5"/></label><label className="text-xs font-bold text-slate-600">Jam ke<input value={form.jam_ke} onChange={(e) => setForm({ ...form, jam_ke: e.target.value })} placeholder="1–2" className="field mt-1.5"/></label><label className="text-xs font-bold text-slate-600">Mata pelajaran<input required value={form.mata_pelajaran} onChange={(e) => setForm({ ...form, mata_pelajaran: e.target.value })} className="field mt-1.5"/></label></div><label className="block text-xs font-bold text-slate-600">Materi<input required value={form.materi} onChange={(e) => setForm({ ...form, materi: e.target.value })} className="field mt-1.5"/></label><label className="block text-xs font-bold text-slate-600">Kegiatan pembelajaran<textarea value={form.kegiatan} onChange={(e) => setForm({ ...form, kegiatan: e.target.value })} rows={3} className="field mt-1.5" placeholder="Pembukaan, inti, dan penutup"/></label><div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><label className="text-xs font-bold text-slate-600">Kendala <span className="font-normal text-slate-400">(opsional)</span><textarea value={form.kendala} onChange={(e) => setForm({ ...form, kendala: e.target.value })} rows={2} className="field mt-1.5"/></label><label className="text-xs font-bold text-slate-600">Refleksi <span className="font-normal text-slate-400">(opsional)</span><textarea value={form.refleksi} onChange={(e) => setForm({ ...form, refleksi: e.target.value })} rows={2} className="field mt-1.5"/></label></div></fieldset></form></Modal>}
  </div>
}
