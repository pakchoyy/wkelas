import type { BgyDatabase } from './db'
import { COLLECTIVE_LEAVE_2026, NATIONAL_HOLIDAYS_2026, HOLIDAY_SOURCE } from '../shared/indonesia-holidays'
import { JATIM_PERIOD, JATIM_SEEDS, JATIM_SOURCE } from '../shared/jatim-calendar'

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

export function isJatimSupported(tahunAjaran: string | null | undefined) {
  const years = String(tahunAjaran || '').split('/').map(Number)
  return years[0] === 2026 && years[1] === 2027
}

// Isi kalender Jatim 2026/2027 + samakan batas semester resmi.
// Aman diulang: ada penanda per kelas dan entri yang tanggalnya sudah
// tertutup libur lain (mis. libur nasional otomatis) dilewati.
export async function ensureJatimCalendar(db: BgyDatabase, kelasId: number) {
  return db.transaction('rw', [db.kelas, db.pengaturan, db.kalender_akademik], async () => {
    const kelas = await db.kelas.get(kelasId)
    if (!kelas || !isJatimSupported(kelas.tahun_ajaran)) return 0
    const key = 'kalender_jatim_2026_' + kelasId
    if (await db.pengaturan.get(key)) return 0
    const existing = await db.kalender_akademik.where({kelas_id: kelasId}).toArray()
    const covered = (tanggal: string) => existing.some(e =>
      ['libur_nasional','libur_sekolah','kts','kpp','pengganti'].includes(e.jenis)
      && tanggal >= e.tanggal_mulai && tanggal <= (e.tanggal_selesai || e.tanggal_mulai))
    let count = 0
    for (const seed of JATIM_SEEDS) {
      if (existing.some(e => e.judul === seed.judul && e.tanggal_mulai === seed.mulai)) continue
      // Lewati tanggal tunggal yang sudah tertutup libur lain (mis. HUT RI
      // dari impor nasional otomatis). Rentang selalu dimasukkan karena
      // tumpang tindih sebagian tidak merusak hitungan hari efektif.
      if (!seed.selesai && covered(seed.mulai)) continue
      await db.kalender_akademik.add({kelas_id:kelasId,tanggal_mulai:seed.mulai,...(seed.selesai ? {tanggal_selesai:seed.selesai} : {}),judul:seed.judul,jenis:seed.jenis,deskripsi:JATIM_SOURCE,created_at:new Date().toISOString()})
      count++
    }
    const settingKey = `presensi_${kelasId}`
    const setting = await db.pengaturan.get(settingKey)
    const cfg = setting?.value ? JSON.parse(setting.value) : {}
    await db.pengaturan.put({key:settingKey,value:JSON.stringify({...cfg,hariSekolah:cfg.hariSekolah || 5,s1Mulai:JATIM_PERIOD.s1Mulai,s1Akhir:JATIM_PERIOD.s1Akhir,s2Mulai:JATIM_PERIOD.s2Mulai,s2Akhir:JATIM_PERIOD.s2Akhir}),updated_at:new Date().toISOString()})
    await db.pengaturan.put({key,value:'1',updated_at:new Date().toISOString()})
    return count
  })
}
