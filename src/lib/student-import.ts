import type { BgyDatabase } from './db'
import type { SiswaFieldDefinition } from '../shared/types'

export interface StudentImportResult { ok: number; gagal: number; dilewati: number; total: number; pesan: string[] }
const normalized = (value: unknown) => String(value ?? '').trim().replace(/\s+/g,' ').toLocaleLowerCase('id')

export async function importStudentRows(database: BgyDatabase, rows: string[][], fields: SiswaFieldDefinition[], kelasId: number): Promise<StudentImportResult> {
  const result: StudentImportResult = {ok:0,gagal:0,dilewati:0,total:0,pesan:[]}
  if (rows.length < 2) { result.pesan.push('File kosong atau hanya berisi header.'); return result }
  const header = rows[0].map(normalized)
  const nameIndex = header.indexOf('nama'), nisIndex = header.indexOf('nis')
  const jkIndex = header.findIndex(h => ['jk','jenis kelamin','jenis_kelamin'].includes(h))
  const noIndex = header.findIndex(h => ['no absen','no_absen','nomor absen'].includes(h))
  if (nameIndex < 0) { result.pesan.push('Kolom Nama tidak ditemukan. Gunakan template yang disediakan.'); return result }
  const customFields = fields.map(field => ({field,index:header.indexOf(normalized(field.nama_field))}))
  for (const [offset,row] of rows.slice(1).entries()) {
    if (!row.some(cell => String(cell).trim())) continue
    result.total++
    const line = offset + 2
    try {
      const nama = String(row[nameIndex] || '').trim()
      const nis = nisIndex < 0 ? '' : String(row[nisIndex] || '').trim()
      if (!nama) throw new Error('Nama wajib diisi.')
      const jk = jkIndex < 0 ? '' : String(row[jkIndex] || '').trim().toUpperCase()
      if (jk && !['L','P'].includes(jk)) throw new Error('JK harus L atau P.')
      const rawNo = noIndex < 0 ? '' : String(row[noIndex] || '').trim()
      if (rawNo && (!/^\d+$/.test(rawNo) || Number(rawNo) < 1 || !Number.isSafeInteger(Number(rawNo)))) throw new Error('No Absen harus bilangan bulat positif.')
      const values = customFields.map(({field,index}) => {
        const value = index < 0 ? '' : String(row[index] || '').trim()
        if (field.wajib && !value) throw new Error(`${field.nama_field} wajib diisi.`)
        if (value && field.tipe === 'angka' && !Number.isFinite(Number(value))) throw new Error(`${field.nama_field} harus berupa angka.`)
        if (value && field.tipe === 'tanggal' && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0,10) !== value)) throw new Error(`${field.nama_field} harus tanggal valid YYYY-MM-DD.`)
        if (value && field.tipe === 'dropdown' && !JSON.parse(field.pilihan || '[]').includes(value)) throw new Error(`${field.nama_field} tidak sesuai pilihan yang tersedia.`)
        return {field,value}
      })
      const skipped = await database.transaction('rw',[database.siswa,database.siswa_field_values],async () => {
        const existing = await database.siswa.where({kelas_id:kelasId}).filter(s => !s.deleted_at).toArray()
        if (nis && existing.some(s => normalized(s.nis) === normalized(nis))) return 'NIS sudah ada; data lama tidak ditimpa.'
        if (existing.some(s => normalized(s.nama) === normalized(nama) && (!nis || !s.nis?.trim()))) return 'Nama sama tanpa NIS yang dapat membedakan siswa. Periksa data dan lengkapi NIS sebelum mengimpor kembali.'
        const now = new Date().toISOString()
        const id = await database.siswa.add({kelas_id:kelasId,nama,nis:nis || undefined,jenis_kelamin:jk || undefined,no_absen:rawNo ? Number(rawNo) : undefined,created_at:now,updated_at:now})
        for (const {field,value} of values) if (value) await database.siswa_field_values.add({siswa_id:id,field_id:field.id,nilai:value,updated_at:now})
        return null
      })
      if (skipped) { result.dilewati++; result.pesan.push(`Baris ${line}: ${skipped}`) } else result.ok++
    } catch (error) {
      result.gagal++
      result.pesan.push(`Baris ${line}: ${error instanceof Error ? error.message : 'Data gagal disimpan.'}`)
    }
  }
  return result
}
