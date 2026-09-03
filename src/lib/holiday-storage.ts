import type { BgyDatabase } from './db'
import { COLLECTIVE_LEAVE_2026, NATIONAL_HOLIDAYS_2026, HOLIDAY_SOURCE } from '../shared/indonesia-holidays'

export async function ensureIndonesianHolidays(db: BgyDatabase, kelasId: number, cuti = false) {
  return db.transaction('rw', [db.kelas, db.pengaturan, db.kalender_akademik], async () => {
    const kelas = await db.kelas.get(kelasId)
    if (!kelas) return 0
    const years = kelas.tahun_ajaran.split('/').map(Number)
    if (!years.includes(2026)) return 0
    const key = (cuti ? 'cuti_bersama_2026_' : 'libur_nasional_2026_') + kelasId
    if (await db.pengaturan.get(key)) return 0
    const existing = await db.kalender_akademik.where({kelas_id: kelasId}).toArray()
    let count = 0
    for (const [date, title] of cuti ? COLLECTIVE_LEAVE_2026 : NATIONAL_HOLIDAYS_2026) {
      if (existing.some(e => ['libur_nasional','libur_sekolah'].includes(e.jenis) && date >= e.tanggal_mulai && date <= (e.tanggal_selesai || e.tanggal_mulai))) continue
      await db.kalender_akademik.add({kelas_id:kelasId,tanggal_mulai:date,judul:cuti ? 'Cuti bersama · ' + title : title,jenis:cuti ? 'libur_sekolah' : 'libur_nasional',deskripsi:'Kalender Indonesia 2026 · ' + HOLIDAY_SOURCE,created_at:new Date().toISOString()})
      count++
    }
    await db.pengaturan.put({key,value:'1',updated_at:new Date().toISOString()})
    return count
  })
}
