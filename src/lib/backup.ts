import type { BgyDatabase } from './db'

export const BACKUP_TABLES = ['guru', 'kelas', 'siswa', 'siswa_field_definitions', 'siswa_field_values', 'presensi', 'mata_pelajaran', 'penilaian_kolom', 'nilai', 'perilaku', 'jadwal', 'kalender_akademik', 'rencana_mengajar', 'jurnal_harian', 'catatan_guru', 'todo', 'dokumen_saya', 'perangkat_ajar_cache', 'pengaturan'] as const
export type BackupTables = Record<typeof BACKUP_TABLES[number], Record<string, any>[]>
const FORMAT = 'bgy-wali-kelas-backup'
const object = (value: unknown): value is Record<string, any> => !!value && typeof value === 'object' && !Array.isArray(value)
const invalid = () => new Error('File cadangan tidak lengkap atau rusak. Data saat ini tidak diubah.')
const required: Record<typeof BACKUP_TABLES[number], string[]> = {
  guru: ['nama'], kelas: ['nama_kelas'], siswa: ['nama'], siswa_field_definitions: ['nama_field', 'slug', 'tipe'],
  siswa_field_values: [], presensi: ['tanggal', 'status'], mata_pelajaran: ['nama'], penilaian_kolom: ['label'],
  nilai: [], perilaku: ['tanggal', 'jenis'], jadwal: [], kalender_akademik: ['tanggal_mulai', 'judul', 'jenis'],
  rencana_mengajar: ['tanggal', 'topik'], jurnal_harian: ['tanggal'], catatan_guru: ['judul'], todo: ['judul'],
  dokumen_saya: ['judul'], perangkat_ajar_cache: ['judul'], pengaturan: ['value'],
}
const numeric: Partial<Record<typeof BACKUP_TABLES[number], string[]>> = {
  kelas: ['guru_id'], siswa: ['kelas_id'], siswa_field_definitions: ['kelas_id'], siswa_field_values: ['siswa_id', 'field_id'],
  presensi: ['siswa_id', 'kelas_id'], mata_pelajaran: ['kelas_id'], penilaian_kolom: ['mata_pelajaran_id'],
  nilai: ['siswa_id', 'kolom_id'], perilaku: ['siswa_id'], jadwal: ['kelas_id', 'hari', 'jam_ke'], rencana_mengajar: ['kelas_id'],
}

function decodeBytes(value: unknown): Uint8Array {
  // Old backups serialized Uint8Array as an object with numeric keys.
  let bytes: unknown[]
  if (Array.isArray(value)) bytes = value
  else if (object(value)) {
    const keys = Object.keys(value)
    if (keys.some((key, index) => key !== String(index))) throw invalid()
    bytes = keys.map(key => value[key])
  } else throw invalid()
  if (bytes.some(byte => !Number.isInteger(byte) || Number(byte) < 0 || Number(byte) > 255)) throw invalid()
  return Uint8Array.from(bytes as number[])
}

export function parseBackup(text: string): BackupTables {
  let raw: unknown
  try { raw = JSON.parse(text) } catch { throw invalid() }
  if (!object(raw)) throw invalid()
  let source = raw
  if ('format' in raw || 'version' in raw || 'tables' in raw) {
    if (raw.format !== FORMAT || raw.version !== 1 || !object(raw.tables)) throw invalid()
    source = raw.tables
  }
  if (Object.keys(source).length !== BACKUP_TABLES.length || BACKUP_TABLES.some(name => !Array.isArray(source[name]))) throw invalid()
  const tables = {} as BackupTables
  let count = 0
  for (const name of BACKUP_TABLES) {
    const keys = new Set<string | number>()
    tables[name] = source[name].map((record: unknown) => {
      if (!object(record)) throw invalid()
      const key = name === 'pengaturan' ? record.key : record.id
      const stringKey = name === 'pengaturan' || name === 'perangkat_ajar_cache'
      if (stringKey ? typeof key !== 'string' || !key.trim() : !Number.isSafeInteger(key) || key <= 0) throw invalid()
      if (keys.has(key)) throw invalid()
      keys.add(key)
      if (required[name].some(field => typeof record[field] !== 'string')) throw invalid()
      if ((numeric[name] || []).some(field => !Number.isSafeInteger(record[field]) || record[field] <= 0)) throw invalid()
      const copy = { ...record }
      if (name === 'dokumen_saya' || name === 'perangkat_ajar_cache') {
        if (copy.file_data != null) {
          copy.file_data = decodeBytes(copy.file_data)
          if (copy.ukuran_file != null && copy.ukuran_file !== copy.file_data.length) throw invalid()
        }
      }
      count++
      return copy
    })
  }
  if (!count) throw new Error('Cadangan ini kosong. Data saat ini tidak diubah.')
  return tables
}

export async function createBackupText(database: BgyDatabase): Promise<string> {
  const tables = {} as BackupTables
  await database.transaction('r', database.tables, async () => {
    for (const name of BACKUP_TABLES) tables[name] = await database.table(name).toArray()
  })
  const text = JSON.stringify({ format: FORMAT, version: 1, createdAt: new Date().toISOString(), tables }, (_key, value) => value instanceof Uint8Array ? Array.from(value) : value)
  parseBackup(text)
  return text
}

export async function restoreBackupText(database: BgyDatabase, text: string, confirm: (tables: BackupTables) => boolean | Promise<boolean>): Promise<boolean> {
  const tables = parseBackup(text)
  if (!await confirm(tables)) return false
  await database.transaction('rw', database.tables, async () => {
    for (const name of BACKUP_TABLES) await database.table(name).clear()
    for (const name of BACKUP_TABLES) await database.table(name).bulkAdd(tables[name])
  })
  return true
}
