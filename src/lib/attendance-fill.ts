import type { BgyDatabase } from './db'
export async function fillMissingAttendance(db: BgyDatabase, kelasId: number, tanggal: string, studentIds: number[]) {
  return db.transaction('rw',db.presensi,async () => {
    const existing = await db.presensi.where({kelas_id:kelasId,tanggal}).toArray()
    const recorded = new Set(existing.map(row => row.siswa_id))
    const now = new Date().toISOString()
    const missing = [...new Set(studentIds)].filter(id => !recorded.has(id))
    await db.presensi.bulkAdd(missing.map(siswa_id => ({kelas_id:kelasId,siswa_id,tanggal,status:'H',created_at:now,updated_at:now})))
    return db.presensi.where({kelas_id:kelasId,tanggal}).toArray()
  })
}
