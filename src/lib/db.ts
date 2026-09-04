import Dexie, { type Table } from 'dexie'

export interface Guru { id?: number; supabase_uid: string; nama: string; email: string; nip?: string; nama_sekolah?: string; mata_pelajaran?: string; foto_url?: string; tahun_ajaran_aktif: string; semester_aktif: number; created_at: string; updated_at: string }
export interface Kelas { id?: number; nama_kelas: string; tingkat: string; tahun_ajaran: string; semester: number; is_aktif: number; guru_id: number; created_at: string; updated_at: string }
export interface Siswa { id?: number; kelas_id: number; nama: string; nis?: string; jenis_kelamin?: string; no_absen?: number; deleted_at?: string; created_at: string; updated_at: string }
export interface SiswaFieldDef { id?: number; kelas_id: number; nama_field: string; slug: string; tipe: string; pilihan?: string; wajib: number; urutan: number; created_at: string; updated_at: string }
export interface SiswaFieldVal { id?: number; siswa_id: number; field_id: number; nilai?: string; updated_at: string }
export interface Presensi { id?: number; siswa_id: number; kelas_id: number; tanggal: string; status: string; keterangan?: string; created_at: string; updated_at: string }
export interface MataPelajaran { id?: number; kelas_id: number; nama: string; kode?: string; urutan: number; is_aktif?: number; created_at: string }
export interface PenilaianKolom { periode?: string; id?: number; mata_pelajaran_id: number; label: string; bobot: number; tanggal?: string; urutan: number; catatan?: string; created_at: string; updated_at: string }
export interface Nilai { id?: number; siswa_id: number; kolom_id: number; nilai?: number; catatan?: string; created_at: string; updated_at: string }
export interface Perilaku { id?: number; siswa_id: number; tanggal: string; jenis: string; kategori?: string; deskripsi: string; tindak_lanjut?: string; created_at: string; updated_at: string }
export interface Jadwal { id?: number; kelas_id: number; hari: number; jam_ke: number; jam_mulai: string; jam_selesai: string; mata_pelajaran_id?: number; nama_mapel_custom?: string; nama_guru?: string; ruang?: string; created_at: string; updated_at: string }
export interface KalenderAkademik { id?: number; kelas_id?: number; tanggal_mulai: string; tanggal_selesai?: string; judul: string; jenis: string; deskripsi?: string; created_at: string }
export interface RencanaMengajar { id?: number; kelas_id: number; mata_pelajaran_id?: number; tanggal: string; topik: string; tujuan_pembelajaran?: string; kegiatan?: string; media?: string; penilaian?: string; catatan?: string; status?: string; created_at: string; updated_at: string }
export interface JurnalHarian { id?: number; kelas_id?: number; tanggal: string; jam_ke?: string; mata_pelajaran?: string; materi?: string; kegiatan?: string; kendala?: string; refleksi?: string; created_at: string; updated_at: string }
export interface CatatanGuru { id?: number; judul: string; isi?: string; tag?: string; warna?: string; is_pinned: number; deleted_at?: string; created_at: string; updated_at: string }
export interface Todo { id?: number; judul: string; deskripsi?: string; prioritas: string; status?: string; deadline?: string; completed_at?: string; deleted_at?: string; created_at: string; updated_at: string }
export interface DokumenSaya { id?: number; judul: string; deskripsi?: string; kategori?: string; file_data?: Uint8Array; format_file?: string; ukuran_file?: number; deleted_at?: string; created_at: string; updated_at: string }
export interface PerangkatAjarCache { id: string; judul: string; jenis: string; deskripsi?: string; mata_pelajaran?: string; jenjang?: string; kelas?: string; fase?: string; file_data?: Uint8Array; file_url: string; ukuran_file?: number; format_file?: string; versi?: string; status?: 'draft' | 'terbit'; sudah_diunduh: number; diunduh_at?: string; created_at?: string; updated_at: string }
export interface Pengaturan { key: string; value: string; updated_at: string }

export class BgyDatabase extends Dexie {
  guru!: Table<Guru, number>
  kelas!: Table<Kelas, number>
  siswa!: Table<Siswa, number>
  siswa_field_definitions!: Table<SiswaFieldDef, number>
  siswa_field_values!: Table<SiswaFieldVal, number>
  presensi!: Table<Presensi, number>
  mata_pelajaran!: Table<MataPelajaran, number>
  penilaian_kolom!: Table<PenilaianKolom, number>
  nilai!: Table<Nilai, number>
  perilaku!: Table<Perilaku, number>
  jadwal!: Table<Jadwal, number>
  kalender_akademik!: Table<KalenderAkademik, number>
  rencana_mengajar!: Table<RencanaMengajar, number>
  jurnal_harian!: Table<JurnalHarian, number>
  catatan_guru!: Table<CatatanGuru, number>
  todo!: Table<Todo, number>
  dokumen_saya!: Table<DokumenSaya, number>
  perangkat_ajar_cache!: Table<PerangkatAjarCache, string>
  pengaturan!: Table<Pengaturan, string>

  constructor(name = 'bgy-wali-kelas') {
    super(name)
    this.version(1).stores({
      guru: '++id, supabase_uid',
      kelas: '++id, guru_id, is_aktif',
      siswa: '++id, kelas_id, deleted_at',
      siswa_field_definitions: '++id, kelas_id, &slug',
      siswa_field_values: '++id, &[siswa_id+field_id]',
      presensi: '++id, &[siswa_id+tanggal], kelas_id, tanggal',
      mata_pelajaran: '++id, kelas_id, kode',
      penilaian_kolom: '++id, mata_pelajaran_id',
      nilai: '++id, &[siswa_id+kolom_id], kolom_id',
      perilaku: '++id, siswa_id, tanggal',
      jadwal: '++id, kelas_id, hari',
      kalender_akademik: '++id, kelas_id',
      rencana_mengajar: '++id, kelas_id, mata_pelajaran_id, tanggal',
      jurnal_harian: '++id, kelas_id, tanggal',
      catatan_guru: '++id, deleted_at',
      todo: '++id, deleted_at',
      dokumen_saya: '++id, deleted_at',
      perangkat_ajar_cache: 'id',
      pengaturan: '&key',
    })
  }
}

const MAIN_DB_NAME = 'bgy-wali-kelas'
export const DEMO_DB_NAME = 'bgy-wali-kelas-demo'
const DEMO_MODE_KEY = 'bgy-demo-mode'

function savedDemoMode(): boolean {
  try { return localStorage.getItem(DEMO_MODE_KEY) === 'true' } catch { return false }
}

let demoSelected = savedDemoMode()
export function isDemoMode(): boolean { return demoSelected }

let activeDb: BgyDatabase | null = null

function getMainDb(): BgyDatabase {
  if (!activeDb || activeDb.name !== MAIN_DB_NAME) {
    activeDb = new BgyDatabase()
  }
  return activeDb
}

function getDemoDb(): BgyDatabase {
  if (!activeDb || activeDb.name !== DEMO_DB_NAME) {
    activeDb = new BgyDatabase(DEMO_DB_NAME)
  }
  return activeDb
}

export function activateMainDb(): BgyDatabase {
  try { localStorage.removeItem(DEMO_MODE_KEY) } catch {}
  demoSelected = false
  return getMainDb()
}

export function activateDemoDb(): BgyDatabase {
  try { localStorage.setItem(DEMO_MODE_KEY, 'true') } catch {}
  demoSelected = true
  return getDemoDb()
}

export const db = new Proxy({} as BgyDatabase, {
  get(_target, prop: string) {
    const d = activeDb || (demoSelected ? getDemoDb() : getMainDb())
    const value = (d as any)[prop]
    return typeof value === 'function' ? (value as Function).bind(d) : value
  },
})
