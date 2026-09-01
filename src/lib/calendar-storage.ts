import type { BgyDatabase } from './db'

export function validateDateRange(start: string, end?: string) {
  const valid = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value
  if (!valid(start) || (end && !valid(end))) throw new Error('Isi tanggal yang valid.')
  if (end && end < start) throw new Error('Tanggal selesai harus sama atau setelah tanggal mulai.')
}

export async function saveCalendar(db: BgyDatabase, data: any) {
  validateDateRange(data.tanggal_mulai, data.tanggal_selesai)
  if (!String(data.judul || '').trim()) throw new Error('Judul kegiatan wajib diisi.')
  return db.transaction('rw', db.kalender_akademik, async () => {
    const value = {...data, judul: data.judul.trim()}
    if (data.id) {
      const old = await db.kalender_akademik.get(data.id)
      if (!old || old.kelas_id !== data.kelas_id) throw new Error('Kegiatan tidak ditemukan di kelas ini. Muat ulang halaman.')
      await db.kalender_akademik.update(data.id, value)
      return db.kalender_akademik.get(data.id)
    }
    const id = await db.kalender_akademik.add({...value, created_at: new Date().toISOString()})
    return db.kalender_akademik.get(id)
  })
}

export async function saveCalendarPeriod(db: BgyDatabase, kelasId: number, semester: number, period: {mulai:string;akhir:string;hariSekolah:number}) {
  validateDateRange(period.mulai, period.akhir)
  if (!period.akhir || ![1,2].includes(semester) || ![5,6].includes(period.hariSekolah)) throw new Error('Lengkapi periode dan hari sekolah yang valid.')
  await db.transaction('rw', db.pengaturan, async () => {
    const key = `presensi_${kelasId}`
    const item = await db.pengaturan.get(key)
    const cfg = item?.value ? JSON.parse(item.value) : {}
    await db.pengaturan.put({key, value:JSON.stringify({...cfg,hariSekolah:period.hariSekolah,[semester === 1 ? 's1Mulai' : 's2Mulai']:period.mulai,[semester === 1 ? 's1Akhir' : 's2Akhir']:period.akhir}),updated_at:new Date().toISOString()})
  })
}
