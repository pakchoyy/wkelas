import { useState, useEffect } from 'react'
import { Download, Settings2, Trash2, Upload } from 'lucide-react'
import { useAppStore } from '../../stores/appStore'
import type { Jadwal as JadwalType, MataPelajaran } from '../../../shared/types'
import { db } from '../../../lib/db'
import Modal from '../../components/Modal'

const HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']
const defaultTime = (jam: number) => {
  const start = 7 * 60 + (jam - 1) * 40
  const format = (value: number) => `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`
  return { mulai: format(start), selesai: format(start + 35) }
}

export default function Jadwal() {
  const kelasId = useAppStore((s) => s.kelasAktifId) || 1
  const [data, setData] = useState<JadwalType[]>([])
  const [mapelList, setMapelList] = useState<MataPelajaran[]>([])
  const [showForm, setShowForm] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [hariSekolah, setHariSekolah] = useState<5 | 6>(5)
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
  const handleCell = (hari: number, jam: number, item?: JadwalType) => { if (item) return handleEdit(item); setEditId(null); setForm({ hari, jam_ke: jam, ...defaultTime(jam), mata_pelajaran_id: '', nama_mapel_custom: '', nama_guru: '', ruang: '' }); setShowForm(true) }
  const storeScheduleSettings = async (nextTimes=waktuJam,nextBreaks=istirahat) => db.pengaturan.put({ key:`jadwal_${kelasId}`,value:JSON.stringify({jumlahJam,waktuJam:nextTimes,istirahat:nextBreaks}),updated_at:new Date().toISOString() })
  const saveSettings = async () => { await storeScheduleSettings(); const p = await db.pengaturan.get(`presensi_${kelasId}`); let cfg: any = {}; if (p?.value) try { cfg = JSON.parse(p.value) } catch {}; await db.pengaturan.put({ key: `presensi_${kelasId}`, value: JSON.stringify({ ...cfg, hariSekolah }), updated_at: new Date().toISOString() }); setShowSettings(false) }
  const saveTime=async(jam:number,key:'mulai'|'selesai',value:string)=>{const current=waktuJam[jam]||{mulai:data.find(i=>i.jam_ke===jam)?.jam_mulai||'07:00',selesai:data.find(i=>i.jam_ke===jam)?.jam_selesai||'07:35'};const next={...waktuJam,[jam]:{...current,[key]:value}};setWaktuJam(next);for(const item of data.filter(i=>i.jam_ke===jam))await window.electronAPI.jadwal.save({...item,jam_mulai:next[jam].mulai,jam_selesai:next[jam].selesai});await storeScheduleSettings(next,istirahat);await load();setToast({text:'Waktu tersimpan otomatis'})}
  const toggleBreak=async(jam:number)=>{const making=!istirahat.includes(jam);if(making&&data.some(i=>i.jam_ke===jam)&&!window.confirm('Jadikan jam ini istirahat? Isi mapel pada baris ini akan dihapus.'))return;if(making){for(const item of data.filter(i=>i.jam_ke===jam))await window.electronAPI.jadwal.delete(item.id)}const next=making?[...istirahat,jam]:istirahat.filter(i=>i!==jam);setIstirahat(next);await storeScheduleSettings(waktuJam,next);await load();setToast({text:making?'Baris dijadikan istirahat':'Baris pelajaran diaktifkan'})}

  const getMapelName = (item: JadwalType) => item.nama_mapel_custom || mapelList.find((m) => m.id === item.mata_pelajaran_id)?.nama || '-'
  const setCell = async (hari: number, jam: number, value: string) => {
    const existing = data.find((item) => item.hari === hari && item.jam_ke === jam)
    try {
      if (!value) { if (existing?.id) await window.electronAPI.jadwal.delete(existing.id) }
      else await window.electronAPI.jadwal.save({ kelas_id: kelasId, hari, jam_ke: jam, jam_mulai: waktuJam[jam]?.mulai || existing?.jam_mulai || '07:00', jam_selesai: waktuJam[jam]?.selesai || existing?.jam_selesai || '07:35', mata_pelajaran_id: Number(value), nama_mapel_custom: '', nama_guru: existing?.nama_guru || '', ruang: existing?.ruang || '', ...(existing?.id ? { id: existing.id } : {}) })
      await load(); setToast({ text: 'Jadwal tersimpan otomatis' })
    } catch { setToast({ text: 'Jadwal gagal disimpan', error: true }) }
  }

  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(null), 3000); return () => clearTimeout(timer) }, [toast])

  const downloadTemplate = async () => {
    const XLSX = await import('xlsx')
    const rows = [['Hari', 'Jam Ke', 'Mulai', 'Selesai', 'Mata Pelajaran', 'Guru', 'Ruang'], ['Senin', 1, '07:00', '07:35', 'Matematika', '', 'Kelas']]
    const sheet = XLSX.utils.aoa_to_sheet(rows); sheet['!cols'] = [{ wch: 12 }, { wch: 9 }, { wch: 10 }, { wch: 10 }, { wch: 24 }, { wch: 20 }, { wch: 14 }]
    const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, sheet, 'Jadwal'); XLSX.writeFile(workbook, 'template-jadwal-pelajaran.xlsx')
  }

  const uploadTemplate = async (file?: File) => {
    if (!file) return
    try {
      const XLSX = await import('xlsx'); const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' }); const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' }); if (!rows.length) throw new Error('Template masih kosong')
      let imported = 0
      for (const row of rows) {
        const dayName = String(row['Hari'] || '').trim().toLowerCase(); const hari = HARI.findIndex((name) => name.toLowerCase() === dayName) + 1
        const jam = Number(row['Jam Ke']); const subjectName = String(row['Mata Pelajaran'] || '').trim()
        if (!hari || !jam || !subjectName) continue
        const subject = mapelList.find((item) => item.nama.toLowerCase() === subjectName.toLowerCase())
        await window.electronAPI.jadwal.save({ kelas_id: kelasId, hari, jam_ke: jam, jam_mulai: String(row['Mulai'] || '07:00'), jam_selesai: String(row['Selesai'] || '07:35'), mata_pelajaran_id: subject?.id || null, nama_mapel_custom: subject ? '' : subjectName, nama_guru: String(row['Guru'] || ''), ruang: String(row['Ruang'] || '') })
        imported++
      }
      if (!imported) throw new Error('Tidak ada baris yang dapat dibaca. Gunakan template yang disediakan.')
      await load(); setToast({ text: `${imported} jadwal berhasil diimpor` })
    } catch (error) { setToast({ text: error instanceof Error ? error.message : 'Template gagal diunggah', error: true }) }
  }

  return (
    <div>
      {toast && <div className={`fixed left-1/2 top-20 z-[100] -translate-x-1/2 rounded-xl px-5 py-3 text-sm font-bold text-white shadow-xl ${toast.error ? 'bg-red-600' : 'bg-emerald-600'}`}>{toast.text}</div>}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Jadwal Pelajaran</h2>
        <div className="flex flex-wrap gap-2"><button onClick={downloadTemplate} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600"><Download size={16}/>Template Excel</button><label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600"><Upload size={16}/>Unggah Excel<input type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => { uploadTemplate(e.target.files?.[0]); e.currentTarget.value = '' }}/></label><button onClick={() => setShowSettings(true)}
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg, #0ea5a0, #0d7a8a)' }}>
          <Settings2 size={16} /> Pengaturan
        </button></div>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--card-bg)', boxShadow: 'var(--shadow)' }}>
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
                <td className="px-3 py-2 text-xs font-semibold text-gray-500"><div>Jam {jam}</div><button onClick={()=>toggleBreak(jam)} className="mt-1 text-[10px] font-bold text-amber-600" title="Menandai seluruh hari pada jam ini sebagai istirahat">{istirahat.includes(jam)?'Batalkan istirahat':'Istirahat semua hari'}</button></td><td className="px-2 py-2 whitespace-nowrap"><div className="flex items-center gap-1"><input type="time" value={waktuJam[jam]?.mulai||data.find(i=>i.jam_ke===jam)?.jam_mulai||defaultTime(jam).mulai} onChange={(e)=>setWaktuJam({...waktuJam,[jam]:{mulai:e.target.value,selesai:waktuJam[jam]?.selesai||data.find(i=>i.jam_ke===jam)?.jam_selesai||defaultTime(jam).selesai}})} onBlur={(e)=>saveTime(jam,'mulai',e.target.value)} className="w-[92px] rounded-lg border px-1 py-2 text-xs"/><span>–</span><input type="time" value={waktuJam[jam]?.selesai||data.find(i=>i.jam_ke===jam)?.jam_selesai||defaultTime(jam).selesai} onChange={(e)=>setWaktuJam({...waktuJam,[jam]:{mulai:waktuJam[jam]?.mulai||data.find(i=>i.jam_ke===jam)?.jam_mulai||defaultTime(jam).mulai,selesai:e.target.value}})} onBlur={(e)=>saveTime(jam,'selesai',e.target.value)} className="w-[92px] rounded-lg border px-1 py-2 text-xs"/></div></td>
                {istirahat.includes(jam)?<td colSpan={hariSekolah} className="border-l bg-amber-50 text-center text-xs font-bold uppercase tracking-wider text-amber-700">Istirahat</td>:HARI.slice(0, hariSekolah).map((_, hari) => {
                  const item = data.find((d) => d.hari === hari + 1 && d.jam_ke === jam)
                  return (
                    <td key={hari} className="px-2 py-2 text-xs border-l" style={{ borderColor: 'var(--border)' }}><select value={item?.mata_pelajaran_id || ''} onChange={(e)=>setCell(hari+1,jam,e.target.value)} className={`w-full rounded-lg border px-2 py-2 text-xs font-semibold outline-none ${item ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-400'}`}><option value="">— Kosong —</option>{mapelList.map((subject)=><option key={subject.id} value={subject.id}>{subject.nama}</option>)}</select></td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showSettings && <Modal title="Pengaturan Jadwal" onClose={() => setShowSettings(false)} footer={<button onClick={saveSettings} className="rounded-xl bg-emerald-600 text-white px-5 py-2.5 text-sm font-bold">Simpan Pengaturan</button>}><div className="space-y-4"><label className="text-sm font-bold block">Hari sekolah<select value={hariSekolah} onChange={(e) => setHariSekolah(Number(e.target.value) as 5|6)} className="field mt-2"><option value={5}>Senin–Jumat</option><option value={6}>Senin–Sabtu</option></select></label><label className="text-sm font-bold block">Jumlah jam pelajaran per hari<input type="number" min={1} max={16} value={jumlahJam} onChange={(e) => setJumlahJam(Math.max(1, Math.min(16, Number(e.target.value))))} className="field mt-2"/></label><p className="text-xs text-slate-500">Pilih mata pelajaran pada setiap kotak. Tombol <strong>Istirahat semua hari</strong> hanya dipakai bila seluruh kelas istirahat pada jam tersebut; satu kali klik akan menghapus mapel pada baris itu.</p></div></Modal>}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl" style={{ background: 'var(--card-bg)', boxShadow: 'var(--shadow-lg)' }}>
            <div className="flex items-center justify-between px-4 py-3 border-b"><h3 className="text-sm font-bold">{editId ? 'Edit' : 'Tambah'} Jadwal</h3><button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded-lg">✕</button></div>
            <form onSubmit={handleSubmit} className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-gray-700 block mb-1">Hari</label>
                  <select value={form.hari} onChange={(e) => setForm({ ...form, hari: parseInt(e.target.value) })} className="w-full rounded-lg px-3 py-2 text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }}>
                    {HARI.map((h, i) => <option key={i} value={i + 1}>{h}</option>)}
                  </select></div>
                <div><label className="text-xs font-medium text-gray-700 block mb-1">Jam ke</label>
                  <input type="number" value={form.jam_ke} onChange={(e) => setForm({ ...form, jam_ke: parseInt(e.target.value) })} className="w-full rounded-lg px-3 py-2 text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-gray-700 block mb-1">Mulai</label>
                  <input type="time" value={form.jam_mulai} onChange={(e) => setForm({ ...form, jam_mulai: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }} /></div>
                <div><label className="text-xs font-medium text-gray-700 block mb-1">Selesai</label>
                  <input type="time" value={form.jam_selesai} onChange={(e) => setForm({ ...form, jam_selesai: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }} /></div>
              </div>
              <div><label className="text-xs font-medium text-gray-700 block mb-1">Mata Pelajaran</label>
                <select value={form.mata_pelajaran_id} onChange={(e) => setForm({ ...form, mata_pelajaran_id: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }}>
                  <option value="">Pilih...</option>
                  {mapelList.map((m) => <option key={m.id} value={m.id}>{m.nama}</option>)}
                </select></div>
              <div><label className="text-xs font-medium text-gray-700 block mb-1">Atau nama custom</label>
                <input value={form.nama_mapel_custom} onChange={(e) => setForm({ ...form, nama_mapel_custom: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-gray-700 block mb-1">Guru</label>
                  <input value={form.nama_guru} onChange={(e) => setForm({ ...form, nama_guru: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }} /></div>
                <div><label className="text-xs font-medium text-gray-700 block mb-1">Ruang</label>
                  <input value={form.ruang} onChange={(e) => setForm({ ...form, ruang: e.target.value })} className="w-full rounded-lg px-3 py-2 text-sm border" style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }} /></div>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={async () => { if (editId) { await window.electronAPI.jadwal.delete(editId); await load(); setToast({ text: 'Jadwal berhasil dihapus' }) }; setShowForm(false) }}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-red-600 border border-red-200" style={{ background: '#fef2f2' }}>
                  <Trash2 size={14} className="inline mr-1" />Hapus</button>
                <button type="submit" className="rounded-xl px-6 py-2 text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg, #0ea5a0, #0d7a8a)' }}>Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
