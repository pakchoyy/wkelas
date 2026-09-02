import type { BgyDatabase } from './db'
import { getRecommendedMapel } from '../shared/mapelRecommendations'

export async function addRecommendedSubjects(db: BgyDatabase, kelasId: number, tingkat: string) {
  return db.transaction('rw', db.mata_pelajaran, async () => {
    const current = await db.mata_pelajaran.where({ kelas_id: kelasId }).toArray()
    const names = new Set(current.map(item => item.nama.trim().toLowerCase()))
    const codes = new Set(current.map(item => item.kode?.trim().toLowerCase()).filter(Boolean))
    const missing = getRecommendedMapel(tingkat).filter(item => !names.has(item.nama.trim().toLowerCase()) && (!item.kode || !codes.has(item.kode.trim().toLowerCase())))
    const last = Math.max(0, ...current.map(item => item.urutan || 0))
    const created_at = new Date().toISOString()
    await db.mata_pelajaran.bulkAdd(missing.map((item, index) => ({ kelas_id: kelasId, nama: item.nama, kode: item.kode, is_aktif: 1, urutan: last + index + 1, created_at })))
    return missing.length
  })
}
export async function deleteSubject(db: BgyDatabase, id: number) {
  return db.transaction('rw',[db.mata_pelajaran,db.jadwal,db.rencana_mengajar,db.penilaian_kolom,db.nilai],async () => {
    const schedules = await db.jadwal.filter(row => row.mata_pelajaran_id === id).count()
    const plans = await db.rencana_mengajar.where({mata_pelajaran_id:id}).count()
    if (schedules || plans) throw new Error(`Mapel masih dipakai oleh ${schedules} jadwal dan ${plans} rencana. Pindahkan atau hapus referensi tersebut terlebih dahulu.`)
    const columns = await db.penilaian_kolom.where({mata_pelajaran_id:id}).primaryKeys()
    if (columns.length) await db.nilai.where('kolom_id').anyOf(columns).delete()
    await db.penilaian_kolom.where({mata_pelajaran_id:id}).delete()
    await db.mata_pelajaran.delete(id)
    return {success:true}
  })
}
