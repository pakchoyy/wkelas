import type { BgyDatabase } from './db'
import { validateTime } from '../shared/schedule'

export async function saveSchedule(database: BgyDatabase, data: any) {
  return database.transaction('rw',[database.jadwal,database.pengaturan,database.mata_pelajaran],async () => {
    const [setting, attendance] = await Promise.all([database.pengaturan.get(`jadwal_${data.kelas_id}`),database.pengaturan.get(`presensi_${data.kelas_id}`)])
    const cfg = setting ? JSON.parse(setting.value) : {}
    const days = attendance ? JSON.parse(attendance.value).hariSekolah || 5 : 5
    if (!Number.isInteger(data.hari) || data.hari < 1 || data.hari > days) throw new Error('Hari berada di luar hari sekolah yang diatur.')
    if (!Number.isInteger(data.jam_ke) || data.jam_ke < 1 || data.jam_ke > (cfg.jumlahJam || 10)) throw new Error('Jam ke berada di luar jumlah jam pelajaran.')
    if (cfg.istirahat?.includes(data.jam_ke)) throw new Error('Slot ini digunakan untuk istirahat.')
    validateTime(data.jam_mulai,data.jam_selesai)
    if (data.mata_pelajaran_id) {
      const subject = await database.mata_pelajaran.get(data.mata_pelajaran_id)
      if (!subject || subject.kelas_id !== data.kelas_id || subject.is_aktif === 0) throw new Error('Mata pelajaran tidak tersedia untuk kelas ini.')
    } else if (!data.nama_mapel_custom?.trim()) throw new Error('Mata pelajaran wajib diisi.')
    const all = await database.jadwal.where({kelas_id:data.kelas_id}).toArray()
    const same = all.filter(r => r.hari === data.hari && r.jam_ke === data.jam_ke && r.id !== data.id)
    if (same.length) throw new Error('Slot jadwal sudah terisi. Edit slot yang ada untuk mengubahnya.')
    if (data.id && !all.some(r => r.id === data.id)) throw new Error('Jadwal tidak ditemukan. Muat ulang halaman.')
    if (all.some(r => r.id !== data.id && r.hari === data.hari && r.jam_ke !== data.jam_ke && data.jam_mulai < r.jam_selesai && data.jam_selesai > r.jam_mulai)) throw new Error('Waktu bertabrakan dengan jam pelajaran lain pada hari yang sama.')
    const fixed = cfg.waktuJam?.[data.jam_ke]
    const row = all.find(r => r.id !== data.id && r.jam_ke === data.jam_ke)
    if (fixed && (fixed.mulai !== data.jam_mulai || fixed.selesai !== data.jam_selesai) || row && (row.jam_mulai !== data.jam_mulai || row.jam_selesai !== data.jam_selesai)) throw new Error('Waktu slot berbeda dari baris jadwal. Ubah melalui kolom Waktu agar berlaku untuk semua hari.')
    const now = new Date().toISOString()
    if (data.id) { await database.jadwal.update(data.id,{...data,updated_at:now}); return database.jadwal.get(data.id) }
    const id = await database.jadwal.add({...data,created_at:now,updated_at:now})
    return database.jadwal.get(id)
  })
}

export async function updateScheduleTime(database: BgyDatabase, kelasId: number, jam: number, time: {mulai:string;selesai:string}) {
  validateTime(time.mulai,time.selesai)
  await database.transaction('rw',[database.jadwal,database.pengaturan],async () => {
    const records = await database.jadwal.where({kelas_id:kelasId}).toArray()
    const affected = records.filter(r => r.jam_ke === jam)
    if (affected.some(r => records.some(other => other.hari === r.hari && other.jam_ke !== jam && time.mulai < other.jam_selesai && time.selesai > other.jam_mulai))) throw new Error('Waktu bertabrakan dengan jam pelajaran lain.')
    const key = `jadwal_${kelasId}`
    const stored = await database.pengaturan.get(key)
    const cfg = stored ? JSON.parse(stored.value) : {}
    await database.jadwal.where({kelas_id:kelasId}).filter(r => r.jam_ke === jam).modify({jam_mulai:time.mulai,jam_selesai:time.selesai,updated_at:new Date().toISOString()})
    await database.pengaturan.put({key,value:JSON.stringify({...cfg,waktuJam:{...cfg.waktuJam,[jam]:time}}),updated_at:new Date().toISOString()})
  })
}

export async function importSchedule(database: BgyDatabase, rows: {line:number;data:any}[]) {
  const result = {ok:0,dilewati:0,gagal:0,pesan:[] as string[]}
  for (const {line,data} of rows) {
    try {
      const skipped = await database.transaction('rw',[database.jadwal,database.pengaturan,database.mata_pelajaran],async () => {
        if (await database.jadwal.where({kelas_id:data.kelas_id}).filter(r => r.hari === data.hari && r.jam_ke === data.jam_ke).first()) return true
        await saveSchedule(database,data)
        return false
      })
      if (skipped) { result.dilewati++; result.pesan.push(`Baris ${line}: slot sudah terisi; data lama tidak ditimpa.`) } else result.ok++
    } catch(error) { result.gagal++; result.pesan.push(`Baris ${line}: ${error instanceof Error ? error.message : 'Gagal menyimpan.'}`) }
  }
  return result
}
