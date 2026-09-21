import type { BgyDatabase } from './db'

function nowISO() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19)
}

export async function deleteAllActiveStudents(database: BgyDatabase, kelasId: number) {
  return database.transaction('rw', [database.siswa, database.siswa_field_values, database.presensi, database.nilai, database.perilaku], async () => {
    const students = await database.siswa.where({ kelas_id: kelasId }).filter(student => !student.deleted_at).toArray()
    const studentIds = students.map(student => student.id).filter((id): id is number => typeof id === 'number')
    if (!studentIds.length) return { count: 0 }

    const idSet = new Set(studentIds)
    await database.siswa_field_values.filter(row => idSet.has(row.siswa_id)).delete()
    await database.presensi.filter(row => row.kelas_id === kelasId && idSet.has(row.siswa_id)).delete()
    await database.nilai.filter(row => idSet.has(row.siswa_id)).delete()
    await database.perilaku.filter(row => idSet.has(row.siswa_id)).delete()
    await database.siswa.where('id').anyOf(studentIds).modify({ deleted_at: nowISO() })

    return { count: studentIds.length }
  })
}
