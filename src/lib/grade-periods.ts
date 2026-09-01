import type { BgyDatabase } from './db'
import { gradePeriod, gradeWeightKey, DEFAULT_WEIGHTS } from '../shared/grades'

// Stamp old columns before any change of the class period. Their IDs and scores stay intact.
export async function ensureGradePeriods(database: BgyDatabase) {
  await database.transaction('rw', [database.kelas, database.mata_pelajaran, database.penilaian_kolom, database.pengaturan], async () => {
    for (const kelas of await database.kelas.toArray()) {
      const markerKey = `nilai_periode_awal_${kelas.id}`
      const marker = await database.pengaturan.get(markerKey)
      const period = marker?.value || gradePeriod(kelas)
      if (!marker) await database.pengaturan.put({key:markerKey,value:period,updated_at:new Date().toISOString()})
      const subjects = await database.mata_pelajaran.where({kelas_id:kelas.id!}).toArray()
      for (const subject of subjects) {
        await database.penilaian_kolom.where({mata_pelajaran_id:subject.id!}).filter(column => !column.periode).modify({periode:period})
      }
      const key = gradeWeightKey(kelas.id!,period)
      if (!await database.pengaturan.get(key)) {
        const old = await database.pengaturan.get(`bobot_nilai_${kelas.id}`)
        await database.pengaturan.put({key,value:old?.value || JSON.stringify(DEFAULT_WEIGHTS),updated_at:new Date().toISOString()})
      }
    }
  })
}

export async function subjectPeriod(database: BgyDatabase, mapelId: number) {
  const subject = await database.mata_pelajaran.get(mapelId)
  const kelas = subject && await database.kelas.get(subject.kelas_id)
  if (!kelas) throw new Error('Mata pelajaran atau kelas tidak ditemukan.')
  return gradePeriod(kelas)
}

export async function listPeriodColumns(database: BgyDatabase, mapelId: number) {
  await ensureGradePeriods(database)
  const period = await subjectPeriod(database,mapelId)
  return database.penilaian_kolom.where({mata_pelajaran_id:mapelId}).filter(column => column.periode === period).toArray()
}

export async function classWeightKey(database: BgyDatabase, kelasId: number) {
  await ensureGradePeriods(database)
  const kelas = await database.kelas.get(kelasId)
  if (!kelas) throw new Error('Kelas tidak ditemukan.')
  return gradeWeightKey(kelasId,gradePeriod(kelas))
}

export async function saveClassPeriod(database: BgyDatabase, kelas: any) {
  const nextPeriod = gradePeriod(kelas)
  await ensureGradePeriods(database)
  await database.transaction('rw',[database.kelas,database.guru,database.pengaturan],async () => {
    const old = await database.kelas.get(kelas.id)
    if (!old) throw new Error('Kelas tidak ditemukan.')
    await database.kelas.update(kelas.id,{nama_kelas:kelas.nama_kelas,tingkat:kelas.tingkat,tahun_ajaran:kelas.tahun_ajaran.trim(),semester:Number(kelas.semester),updated_at:new Date().toISOString()})
    await database.guru.update(old.guru_id,{tahun_ajaran_aktif:kelas.tahun_ajaran.trim(),semester_aktif:Number(kelas.semester),updated_at:new Date().toISOString()})
    const key = gradeWeightKey(kelas.id,nextPeriod)
    if (!await database.pengaturan.get(key)) await database.pengaturan.put({key,value:JSON.stringify(DEFAULT_WEIGHTS),updated_at:new Date().toISOString()})
  })
}
