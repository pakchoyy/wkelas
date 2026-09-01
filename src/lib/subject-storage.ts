import type { BgyDatabase } from './db'
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
