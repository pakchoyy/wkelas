import type { BgyDatabase, Kelas } from './db'
import { getRecommendedMapel } from '../shared/mapelRecommendations'

export type NewClass = { nama_kelas: string; tingkat: string; tahun_ajaran: string; semester: number }

function validate(input: NewClass): NewClass {
  const data = { ...input, nama_kelas: input.nama_kelas.trim(), tahun_ajaran: input.tahun_ajaran.trim(), tingkat: String(input.tingkat) }
  if (!data.nama_kelas) throw new Error('Isi nama kelas.')
  if (!/^[1-6]$/.test(data.tingkat)) throw new Error('Pilih tingkat kelas 1 sampai 6.')
  const m = /^(\d{4})\/(\d{4})$/.exec(data.tahun_ajaran)
  if (!m || Number(m[2]) !== Number(m[1]) + 1) throw new Error('Tahun ajaran harus berurutan, misalnya 2027/2028.')
  if (![1, 2].includes(Number(data.semester))) throw new Error('Pilih semester 1 atau 2.')
  return { ...data, semester: Number(data.semester) }
}

export async function listClasses(db: BgyDatabase): Promise<Kelas[]> {
  return (await db.kelas.toArray()).sort((a, b) => b.tahun_ajaran.localeCompare(a.tahun_ajaran) || a.nama_kelas.localeCompare(b.nama_kelas))
}

export async function activateClass(db: BgyDatabase, id: number) {
  await db.transaction('rw', db.kelas, async () => {
    if (!await db.kelas.get(id)) throw new Error('Kelas tidak ditemukan.')
    await db.kelas.toCollection().modify(k => { k.is_aktif = k.id === id ? 1 : 0 })
  })
}

async function addClass(db: BgyDatabase, data: NewClass, guruId: number, now: string) {
  const exists = await db.kelas.filter(k => k.nama_kelas.toLowerCase() === data.nama_kelas.toLowerCase() && k.tahun_ajaran === data.tahun_ajaran).count()
  if (exists) throw new Error(`Kelas ${data.nama_kelas} tahun ${data.tahun_ajaran} sudah ada.`)
  const kelasId = await db.kelas.add({ ...data, is_aktif: 0, guru_id: guruId, created_at: now, updated_at: now })
  await db.mata_pelajaran.bulkAdd(getRecommendedMapel(data.tingkat).map((m, i) => ({ kelas_id: kelasId, nama: m.nama, kode: m.kode, urutan: i + 1, is_aktif: 1, created_at: now })))
  return kelasId
}

export async function createClass(db: BgyDatabase, input: NewClass, fromClassId: number): Promise<number> {
  const data = validate(input)
  return db.transaction('rw', [db.kelas, db.mata_pelajaran], async () => {
    const source = await db.kelas.get(fromClassId)
    if (!source) throw new Error('Kelas asal tidak ditemukan.')
    return addClass(db, data, source.guru_id, new Date().toISOString())
  })
}

// Kenaikan kelas: kelas lama tetap utuh sebagai arsip; siswa aktif dan kolom tambahannya disalin ke kelas baru.
export async function promoteClass(db: BgyDatabase, fromClassId: number, input: NewClass): Promise<{ kelasId: number; siswa: number }> {
  const data = validate(input)
  return db.transaction('rw', [db.kelas, db.mata_pelajaran, db.siswa, db.siswa_field_definitions, db.siswa_field_values], async () => {
    const source = await db.kelas.get(fromClassId)
    if (!source) throw new Error('Kelas asal tidak ditemukan.')
    if (data.tahun_ajaran <= source.tahun_ajaran) throw new Error('Tahun ajaran kelas baru harus setelah tahun ajaran kelas asal.')
    const now = new Date().toISOString()
    const kelasId = await addClass(db, data, source.guru_id, now)
    const fieldMap = new Map<number, number>()
    for (const def of await db.siswa_field_definitions.where({ kelas_id: fromClassId }).toArray()) {
      const { id, ...rest } = def
      fieldMap.set(id!, await db.siswa_field_definitions.add({ ...rest, kelas_id: kelasId, created_at: now, updated_at: now }))
    }
    const students = await db.siswa.where({ kelas_id: fromClassId }).filter(s => !s.deleted_at).toArray()
    for (const student of students) {
      const { id, ...rest } = student
      const newId = await db.siswa.add({ ...rest, kelas_id: kelasId, created_at: now, updated_at: now })
      const values = await db.siswa_field_values.filter(v => v.siswa_id === id).toArray()
      for (const value of values) {
        const fieldId = fieldMap.get(value.field_id)
        if (fieldId) await db.siswa_field_values.add({ siswa_id: newId, field_id: fieldId, nilai: value.nilai, updated_at: now })
      }
    }
    return { kelasId, siswa: students.length }
  })
}

export function nextAcademicYear(tahun: string): string {
  const m = /^(\d{4})\/(\d{4})$/.exec(tahun.trim())
  return m ? `${Number(m[1]) + 1}/${Number(m[2]) + 1}` : tahun
}
