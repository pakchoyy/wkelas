import { saveCalendarPeriod } from '../../../lib/calendar-storage'
import { ensureJatimCalendar, isJatimSupported } from '../../../lib/holiday-storage'
import { JATIM_SOURCE } from '../../../shared/jatim-calendar'
import { useState, useEffect, useRef } from 'react'
import { CalendarDays, Pencil, Plus, Save, Trash2 } from 'lucide-react'
import { useAppStore } from '../../stores/appStore'
import { todayISO } from '../../../shared/utils'
import type { KalenderAkademik } from '../../../shared/types'
import { db } from '../../../lib/db'
import Modal from '../../components/Modal'
import ConfirmDialog from '../../components/ConfirmDialog'

const JENIS_WARNA: Record<string, string> = { libur_nasional: '#dc2626', libur_sekolah: '#d97706', kts: '#16a34a', kpp: '#ca8a04', pengganti: '#4f46e5', ujian: '#2563eb', rapat: '#7c3aed', kegiatan: '#0ea5a0', lainnya: '#6b7280' }
// kts/kpp: masuk seperti biasa (presensi & jurnal tetap jalan) tetapi bukan hari efektif.
// pengganti: hari di luar jadwal (mis. Sabtu) yang dihitung efektif, mis. kalender Jatim.
const NON_EFEKTIF = ['libur_nasional', 'libur_sekolah', 'kts', 'kpp']
const JENIS_LABEL: Record<string, string> = { libur_nasional: 'Libur Nasional', libur_sekolah: 'Libur Sekolah', kts: 'KTS', kpp: 'Kegiatan Puasa', pengganti: 'Hari Pengganti' }

export default function Kalender() {
  const kelasId = useAppStore((s) => s.kelasAktifId) || 1
  return <KalenderKelas key={kelasId} kelasId={kelasId}/>
}

function KalenderKelas({kelasId}: {kelasId:number}) {
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [ready, setReady] = useState(false)
  const [data, setData] = useState<KalenderAkademik[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ tanggal_mulai: todayISO(), tanggal_selesai: '', judul: '', jenis: 'kegiatan', deskripsi: '' })
  const [period, setPeriod] = useState({ mulai: '2026-07-01', akhir: '2026-12-31', hariSekolah: 5 })
  const [editId,setEditId]=useState<number|null>(null)
  const [semester,setSemester]=useState(1)
  const [toast,setToast]=useState('')
  const [confirmDelete, setConfirmDelete] = useState<KalenderAkademik | null>(null)
  const [view,setView]=useState<'grid'|'daftar'>('grid')
  const [jatimState,setJatimState]=useState<'unknown'|'ready'|'done'|'unsupported'>('unknown')
  const [yearStart,setYearStart]=useState(()=>{const now=new Date();return now.getMonth()>=6?now.getFullYear():now.getFullYear()-1})

  const load = async () => { setData(await window.electronAPI.kalender.list(kelasId)) }
  useEffect(() => { db.kelas.get(kelasId).then((kelas) => { if (!isJatimSupported(kelas?.tahun_ajaran)) { setJatimState('unsupported'); return }; db.pengaturan.get(`kalender_jatim_2026_${kelasId}`).then((marker) => setJatimState(marker ? 'done' : 'ready')) }).catch(() => setJatimState('unsupported')) }, [kelasId])
  const seedJatim = async () => {
    if (lock.current) return
    lock.current = true; setBusy(true); setError('')
    try {
      const count = await ensureJatimCalendar(db, kelasId)
      setJatimState('done')
      await refresh()
      const setting = await db.pengaturan.get(`presensi_${kelasId}`)
      const cfg = setting?.value ? JSON.parse(setting.value) : {}
      setPeriod((current) => ({...current,mulai:semester===1?cfg.s1Mulai||current.mulai:cfg.s2Mulai||current.mulai,akhir:semester===1?cfg.s1Akhir||current.akhir:cfg.s2Akhir||current.akhir,hariSekolah:cfg.hariSekolah||current.hariSekolah}))
      setToast(`Kalender Jatim ditambahkan (${count} kegiatan). Batas semester disamakan.`)
    } catch (error) { setError(error instanceof Error ? error.message : 'Kalender Jatim gagal ditambahkan. Silakan coba lagi.') }
    finally { lock.current = false; setBusy(false) }
  }
  useEffect(() => { Promise.all([load(), Promise.all([db.kelas.get(kelasId), db.pengaturan.get(`presensi_${kelasId}`)]).then(([kelas, setting]) => { let cfg:any={}; if(setting?.value) try{cfg=JSON.parse(setting.value)}catch{}; const sem=kelas?.semester||1; const year=Number(kelas?.tahun_ajaran?.split('/')[0]) || new Date().getFullYear(); setSemester(sem); if(Number.isFinite(year)) setYearStart(year); setPeriod({ mulai: sem===1 ? cfg.s1Mulai||`${year}-07-01` : cfg.s2Mulai||`${year+1}-01-01`, akhir: sem===1 ? cfg.s1Akhir||`${year}-12-31` : cfg.s2Akhir||`${year+1}-06-30`, hariSekolah: cfg.hariSekolah||5 }) })]).then(() => setReady(true)).catch(() => setError('Kalender gagal dimuat. Muat ulang halaman untuk mencoba lagi.')) }, [kelasId])
  useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(''),2800);return()=>clearTimeout(timer)},[toast])

  const effectiveDays = (() => { let count=0; const cursor=new Date(`${period.mulai}T12:00:00`); const end=new Date(`${period.akhir}T12:00:00`); while(cursor<=end){ const day=cursor.getDay(); const iso=todayISO(cursor); const holiday=data.some((item)=>NON_EFEKTIF.includes(item.jenis)&&iso>=item.tanggal_mulai&&iso<=(item.tanggal_selesai||item.tanggal_mulai)); const extra=data.some((item)=>item.jenis==='pengganti'&&iso>=item.tanggal_mulai&&iso<=(item.tanggal_selesai||item.tanggal_mulai)); if((day>=1&&day<=period.hariSekolah||extra)&&!holiday) count++; cursor.setDate(cursor.getDate()+1) } return count })()

  const pad2 = (n:number) => String(n).padStart(2,'0')
  const months = Array.from({length:13},(_,i)=>{const m=(6+i)%12;return {y:yearStart+Math.floor((6+i)/12),m}})
  const JENIS_RANK = ['libur_nasional','libur_sekolah','kts','kpp','pengganti','ujian','rapat','kegiatan','lainnya']
  const eventsOn = (iso:string) => data.filter((item)=>iso>=item.tanggal_mulai&&iso<=(item.tanggal_selesai||item.tanggal_mulai))
  const shortDate = (iso:string) => new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'short'}).format(new Date(`${iso}T12:00:00`))
  const eventRange = (item:KalenderAkademik) => item.tanggal_selesai && item.tanggal_selesai!==item.tanggal_mulai ? `${shortDate(item.tanggal_mulai)}–${shortDate(item.tanggal_selesai)}` : shortDate(item.tanggal_mulai)

  const refresh = async () => { try { await load() } catch { setError('Perubahan tersimpan, tetapi daftar gagal dimuat ulang. Muat ulang halaman.') } }
  const addOn=(iso:string)=>{setFormError('');setEditId(null);setForm({ tanggal_mulai:iso, tanggal_selesai:'', judul:'', jenis:'kegiatan', deskripsi:'' });setShowForm(true)}
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (lock.current) return
    lock.current = true; setBusy(true); setFormError('')
    try {
      await window.electronAPI.kalender.save({...form,kelas_id:kelasId,...(editId ? {id:editId} : {})})
      setShowForm(false); setToast(editId ? 'Kegiatan berhasil diperbarui' : 'Kegiatan berhasil ditambahkan')
      await refresh()
    } catch(error) { setFormError(error instanceof Error ? error.message : 'Kegiatan gagal disimpan. Isian tetap tersedia; silakan coba lagi.') }
    finally { lock.current = false; setBusy(false) }
  }
  const savePeriod = async () => {
    if (lock.current) return
    lock.current = true; setBusy(true); setError('')
    try { await saveCalendarPeriod(db,kelasId,semester,period); setToast('Periode akademik berhasil disimpan') }
    catch(error) { setError(error instanceof Error ? error.message : 'Periode gagal disimpan. Silakan coba lagi.') }
    finally { lock.current = false; setBusy(false) }
  }
  const openEdit=(item:KalenderAkademik)=>{setFormError('');setEditId(item.id);setForm({tanggal_mulai:item.tanggal_mulai,tanggal_selesai:item.tanggal_selesai||'',judul:item.judul,jenis:item.jenis,deskripsi:item.deskripsi||''});setShowForm(true)}
  const remove = async () => {
    if (lock.current || !confirmDelete) return
    const item = confirmDelete
    setConfirmDelete(null)
    lock.current = true; setBusy(true); setError('')
    try { await window.electronAPI.kalender.delete(item.id); setToast('Kegiatan berhasil dihapus'); await refresh() }
    catch { setError('Kegiatan gagal dihapus. Silakan coba lagi.') }
    finally { lock.current = false; setBusy(false) }
  }

  return (
    <div>{error && <p role="alert" className="mb-3 text-red-700">{error}</p>}{!ready && !error && <p role="status">Memuat kalender...</p>}<fieldset disabled={busy || !ready} className="min-w-0">{toast&&<div className="fixed left-1/2 top-20 w-[calc(100%_-_2rem)] max-w-md z-[100] -translate-x-1/2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-xl">{toast}</div>}
      <div className="flex flex-wrap gap-3 items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Kalender Akademik</h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl bg-slate-100 p-1" role="group" aria-label="Tampilan kalender">
            <button aria-pressed={view==='grid'} onClick={()=>setView('grid')} className={`min-h-11 rounded-lg px-4 py-2 text-sm font-bold ${view==='grid'?'bg-white text-teal-700 shadow-sm':'text-slate-500'}`}>Grid</button>
            <button aria-pressed={view==='daftar'} onClick={()=>setView('daftar')} className={`min-h-11 rounded-lg px-4 py-2 text-sm font-bold ${view==='daftar'?'bg-white text-teal-700 shadow-sm':'text-slate-500'}`}>Daftar</button>
          </div>
          <button onClick={() => {setFormError('');setEditId(null);setForm({ tanggal_mulai: todayISO(), tanggal_selesai: '', judul: '', jenis: 'kegiatan', deskripsi: '' });setShowForm(true)}} className="min-h-11 flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg, #0ea5a0, #0d7a8a)' }}><Plus size={16} /> Tambah</button>
        </div>
      </div>

      {jatimState==='ready' && <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm"><p className="font-bold text-emerald-900">Kalender Jatim 2026/2027 belum diisi</p><p className="mt-1 text-xs text-emerald-800">Sekali ketuk: isi libur besar, cuti bersama, libur semester, KTS & hari pengganti, sekalian samakan batas semester resmi. {JATIM_SOURCE}.</p><button disabled={busy} onClick={seedJatim} className="mt-2 min-h-11 rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white disabled:opacity-50">+ Isi kalender Jatim 2026/2027</button></div>}
      <div className="grid gap-4 mb-5 lg:grid-cols-[1fr_260px]"><div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="mb-4 flex items-center gap-2 font-bold"><CalendarDays size={18} className="text-emerald-600"/>Batas Waktu Semester</div><div className="grid gap-3 md:grid-cols-3"><label className="text-xs font-bold text-slate-500">Mulai Semester<input type="date" value={period.mulai} onChange={(e)=>setPeriod({...period,mulai:e.target.value})} className="field mt-1.5"/></label><label className="text-xs font-bold text-slate-500">Akhir Semester<input type="date" value={period.akhir} onChange={(e)=>setPeriod({...period,akhir:e.target.value})} className="field mt-1.5"/></label><label className="text-xs font-bold text-slate-500">Sistem Hari Sekolah<select value={period.hariSekolah} onChange={(e)=>setPeriod({...period,hariSekolah:Number(e.target.value)})} className="field mt-1.5"><option value={5}>Senin–Jumat</option><option value={6}>Senin–Sabtu</option></select></label></div><div className="mt-3 flex flex-wrap gap-3 items-center justify-between"><p className="text-xs text-slate-400">Periode ini digunakan oleh Presensi, Perilaku, Rencana, dan Jurnal.</p><button onClick={savePeriod} className="min-h-11 flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white"><Save size={14}/>Simpan Periode</button></div></div><div className="rounded-2xl bg-indigo-900 p-5 text-white"><div className="text-xs font-bold uppercase tracking-wider text-emerald-300">Hari Efektif Belajar</div><div className="mt-4 text-4xl font-extrabold">{effectiveDays}</div><div className="mt-1 text-xs text-indigo-200">hari setelah akhir pekan dan hari libur</div></div></div>

      {view==='grid' && <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600" aria-label="Keterangan warna">{Object.entries(JENIS_LABEL).map(([jenis,label])=><span key={jenis} className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full" style={{background:JENIS_WARNA[jenis]}}/>{label}</span>)}</div>}
      {view==='grid' && <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
        {months.map(({y,m}) => {
          const daysInMonth=new Date(y,m+1,0).getDate()
          const lead=new Date(y,m,1).getDay()
          const mStart=`${y}-${pad2(m+1)}-01`
          const mEnd=`${y}-${pad2(m+1)}-${pad2(daysInMonth)}`
          const inMonth=data.filter((item)=>item.tanggal_mulai<=mEnd&&(item.tanggal_selesai||item.tanggal_mulai)>=mStart).sort((a,b)=>a.tanggal_mulai.localeCompare(b.tanggal_mulai))
          return <section key={`${y}-${m}`} aria-label={new Intl.DateTimeFormat('id-ID',{month:'long',year:'numeric'}).format(new Date(y,m,1))} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <h3 className="bg-indigo-900 px-4 py-2.5 text-center text-sm font-extrabold text-white">{new Intl.DateTimeFormat('id-ID',{month:'long',year:'numeric'}).format(new Date(y,m,1))}</h3>
            <div className="grid grid-cols-7 text-center text-[11px] font-bold text-slate-500">{['Min','Sen','Sel','Rab','Kam','Jum','Sab'].map(d=><span key={d} className="border-b border-slate-100 py-1.5">{d}</span>)}</div>
            <div className="grid grid-cols-7 gap-px bg-slate-100">
              {Array.from({length:lead}).map((_,i)=><span key={`e${i}`} className="bg-slate-50/60"/>) }
              {Array.from({length:daysInMonth},(_,i)=>i+1).map((d)=>{
                const iso=`${y}-${pad2(m+1)}-${pad2(d)}`
                const evts=eventsOn(iso)
                const dom=evts.slice().sort((a,b)=>JENIS_RANK.indexOf(a.jenis)-JENIS_RANK.indexOf(b.jenis))[0]
                const dow=new Date(y,m,d).getDay()
                const isSun=dow===0
                const weekendOff=isSun||(dow===6&&period.hariSekolah===5)
                const isToday=iso===todayISO()
                return <button key={d} onClick={()=>addOn(iso)} aria-label={`${d} ${new Intl.DateTimeFormat('id-ID',{month:'long'}).format(new Date(y,m,1))}${evts.length?`: ${evts.map(e=>e.judul).join(', ')}`: ''}`} title={evts.length?evts.map(e=>e.judul).join(', '):'Tambah kegiatan'} className={`flex min-h-11 flex-col items-center justify-center gap-0.5 px-0.5 py-1 text-xs ${isSun?'font-extrabold text-red-600':weekendOff?'text-slate-400':'font-semibold text-slate-700'} ${isToday?'ring-2 ring-inset ring-teal-600':''}`} style={{background:dom?`${JENIS_WARNA[dom.jenis]||'#6b7280'}1A`:weekendOff?'#f8fafc':'#ffffff'}}>
                  <span>{d}</span>
                  {evts.length>0 && <span className="flex gap-0.5" aria-hidden="true">{evts.slice(0,3).map(e=><span key={e.id} className="size-1 rounded-full" style={{background:JENIS_WARNA[e.jenis]||'#6b7280'}}/>)}</span>}
                </button>
              })}
            </div>
            <div className="space-y-1 border-t border-slate-100 px-3 py-2">
              {inMonth.length===0 && <p className="py-1 text-xs text-slate-400">Tidak ada libur/kegiatan.</p>}
              {inMonth.map((item)=><button key={item.id} onClick={()=>openEdit(item)} className="flex min-h-8 w-full items-center gap-2 rounded-lg px-1 py-1 text-left text-xs hover:bg-slate-50" title="Edit kegiatan"><span className="size-2.5 shrink-0 rounded-full" style={{background:JENIS_WARNA[item.jenis]||'#6b7280'}}/><span className="shrink-0 font-bold text-slate-500">{eventRange(item)}</span><span className="min-w-0 flex-1 truncate font-semibold text-slate-700">{item.judul}</span></button>)}
            </div>
          </section>
        })}
      </div>}

      {view==='daftar' && <div className="space-y-3">
        {data.map((item) => (
          <div key={item.id} className="rounded-xl p-4 flex items-start gap-3" style={{ background: 'var(--card-bg)', boxShadow: 'var(--shadow)' }}>
            <div className="w-1 h-full rounded-full flex-shrink-0 mt-1" style={{ background: JENIS_WARNA[item.jenis] || '#6b7280', width: 4 }} />
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row gap-2 sm:items-start justify-between">
                <div>
                  <span className="block text-sm font-semibold break-words">{item.judul}</span>
                  <span className="block mt-1 text-sm text-slate-500">{item.tanggal_mulai}{item.tanggal_selesai ? ` - ${item.tanggal_selesai}` : ''}</span>
                </div>
                <div className="flex"><button onClick={()=>openEdit(item)} aria-label={`Edit ${item.judul}`} className="min-h-11 rounded-lg px-3 flex items-center gap-2 text-sm text-teal-700"><Pencil size={16}/>Edit</button><button onClick={()=>setConfirmDelete(item)} aria-label={`Hapus ${item.judul}`} className="min-h-11 rounded-lg px-3 flex items-center gap-2 text-sm text-red-700"><Trash2 size={16}/>Hapus</button></div>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ background: JENIS_WARNA[item.jenis] || '#6b7280' }}>{JENIS_LABEL[item.jenis] || item.jenis.replaceAll('_', ' ')}</span>
              {item.deskripsi && <p className="text-sm mt-2 text-slate-500 whitespace-pre-wrap break-words">{item.deskripsi}</p>}
            </div>
          </div>
        ))}
        {data.length === 0 && <p className="text-sm text-center py-8 text-gray-400">Belum ada event</p>}
      </div>}

      <ConfirmDialog open={!!confirmDelete} title="Hapus kegiatan?" message={confirmDelete ? `Hapus ${confirmDelete.judul}?` : ''} onCancel={() => setConfirmDelete(null)} onConfirm={remove} />
      {showForm && (
        <Modal title={editId ? 'Edit Kegiatan' : 'Tambah Kegiatan'} onClose={() => { if (!busy) setShowForm(false) }}>
            <form onSubmit={handleSubmit} className="space-y-3">{formError && <p role="alert" className="text-sm text-red-700">{formError}</p>}
              <div><label className="text-xs font-medium text-gray-700 block mb-1">Judul</label><input aria-label="Judul kegiatan" value={form.judul} onChange={(e) => setForm({ ...form, judul: e.target.value })} className="min-w-0 min-h-11 w-full rounded-lg px-3 py-2 text-base lg:text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }} required /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-gray-700 block mb-1">Mulai</label><input type="date" aria-label="Tanggal mulai" value={form.tanggal_mulai} onChange={(e) => setForm({ ...form, tanggal_mulai: e.target.value })} className="min-w-0 min-h-11 w-full rounded-lg px-3 py-2 text-base lg:text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }} /></div>
                <div><label className="text-xs font-medium text-gray-700 block mb-1">Selesai</label><input type="date" aria-label="Tanggal selesai (opsional)" value={form.tanggal_selesai} onChange={(e) => setForm({ ...form, tanggal_selesai: e.target.value })} className="min-w-0 min-h-11 w-full rounded-lg px-3 py-2 text-base lg:text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }} /></div>
              </div>
              <div><label className="text-xs font-medium text-gray-700 block mb-1">Jenis</label>
                <select aria-label="Jenis kegiatan" value={form.jenis} onChange={(e) => setForm({ ...form, jenis: e.target.value })} className="min-w-0 min-h-11 w-full rounded-lg px-3 py-2 text-base lg:text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }}>
                  <option value="libur_nasional">Libur Nasional</option>
                  <option value="libur_sekolah">Libur Sekolah</option>
                  <option value="kts">KTS (masuk, non-efektif)</option>
                  <option value="kpp">Kegiatan Puasa (masuk, non-efektif)</option>
                  <option value="pengganti">Hari Pengganti (dihitung efektif)</option>
                  <option value="ujian">Ujian</option>
                  <option value="rapat">Rapat</option>
                  <option value="kegiatan">Kegiatan</option>
                  <option value="lainnya">Lainnya</option>
                </select></div>
              <div><label className="text-xs font-medium text-gray-700 block mb-1">Deskripsi</label><textarea aria-label="Deskripsi kegiatan" value={form.deskripsi} onChange={(e) => setForm({ ...form, deskripsi: e.target.value })} rows={2} className="min-w-0 min-h-11 w-full rounded-lg px-3 py-2 text-base lg:text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }} /></div>
              <div className="flex flex-wrap gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="min-h-11 rounded-xl px-4 py-2 text-sm font-semibold border" style={{ borderColor: 'var(--border)' }}>Batal</button>
                <button type="submit" className="min-h-11 rounded-xl px-6 py-2 text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg, #0ea5a0, #0d7a8a)' }}>Simpan</button>
              </div>
            </form>
        </Modal>
      )}
    </fieldset></div>
  )
}
