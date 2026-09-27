import Dexie, { type Table } from 'dexie'

export interface Guru { id?: number; supabase_uid: string; nama: string; email: string; nip?: string | null; nama_sekolah?: string | null; mata_pelajaran?: string | null; foto_url?: string | null; tahun_ajaran_aktif: string; semester_aktif: number; created_at: string; updated_at: string }
export interface Kelas { id?: number; nama_kelas: string; tingkat: string; tahun_ajaran: string; semester: number; is_aktif: number; guru_id: number; created_at: string; updated_at: string }
export interface Siswa { id?: number; kelas_id: number; nama: string; nis?: string | null; jenis_kelamin?: string | null; no_absen?: number | null; deleted_at?: string | null; created_at: string; updated_at: string }
export interface SiswaFieldDef { id?: number; kelas_id: number; nama_field: string; slug: string; tipe: string; pilihan?: string | null; wajib: number; urutan: number; created_at: string; updated_at: string }
export interface SiswaFieldVal { id?: number; siswa_id: number; field_id: number; nilai?: string | null; updated_at: string }
export interface Presensi { id?: number; siswa_id: number; kelas_id: number; tanggal: string; status: string; keterangan?: string | null; created_at: string; updated_at: string }
export interface MataPelajaran { id?: number; kelas_id: number; nama: string; kode?: string | null; urutan: number; is_aktif?: number | null; created_at: string }
export interface PenilaianKolom { periode?: string | null; id?: number; mata_pelajaran_id: number; label: string; bobot: number; tanggal?: string | null; urutan: number; catatan?: string | null; created_at: string; updated_at: string }
export interface Nilai { id?: number; siswa_id: number; kolom_id: number; nilai?: number | null; catatan?: string | null; created_at: string; updated_at: string }
export interface Perilaku { id?: number; siswa_id: number; tanggal: string; jenis: string; kategori?: string | null; deskripsi: string; tindak_lanjut?: string | null; created_at: string; updated_at: string }
export interface Jadwal { id?: number; kelas_id: number; hari: number; jam_ke: number; jam_mulai: string; jam_selesai: string; mata_pelajaran_id?: number; nama_mapel_custom?: string | null; nama_guru?: string | null; ruang?: string | null; created_at: string; updated_at: string }
export interface KalenderAkademik { id?: number; kelas_id?: number; tanggal_mulai: string; tanggal_selesai?: string | null; judul: string; jenis: string; deskripsi?: string | null; created_at: string }
export interface RencanaMengajar { id?: number; kelas_id: number; mata_pelajaran_id?: number; tanggal: string; topik: string; tujuan_pembelajaran?: string | null; kegiatan?: string | null; media?: string | null; penilaian?: string | null; catatan?: string | null; status?: string | null; created_at: string; updated_at: string }
export interface JurnalHarian { id?: number; kelas_id?: number; tanggal: string; jam_ke?: string | null; mata_pelajaran?: string | null; materi?: string | null; kegiatan?: string | null; kendala?: string | null; refleksi?: string | null; created_at: string; updated_at: string }
export interface CatatanGuru { id?: number; judul: string; isi?: string | null; tag?: string | null; warna?: string | null; is_pinned: number; deleted_at?: string | null; created_at: string; updated_at: string }
export interface Todo { id?: number; judul: string; deskripsi?: string | null; prioritas: string; status?: string | null; deadline?: string | null; completed_at?: string | null; deleted_at?: string | null; created_at: string; updated_at: string }
export interface DokumenSaya { id?: number; judul: string; deskripsi?: string | null; kategori?: string | null; file_data?: Uint8Array; format_file?: string | null; ukuran_file?: number | null; deleted_at?: string | null; created_at: string; updated_at: string }
export interface PerangkatAjarCache { id: string; judul: string; jenis: string; deskripsi?: string | null; mata_pelajaran?: string | null; jenjang?: string | null; kelas?: string | null; fase?: string | null; file_data?: Uint8Array; file_url: string; ukuran_file?: number | null; format_file?: string | null; versi?: string | null; status?: 'draft' | 'terbit'; sudah_diunduh: number; diunduh_at?: string | null; created_at?: string | null; updated_at: string }
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
    // Slug kolom tambahan cukup unik per kelas agar tiap kelas bisa punya kolom yang sama.
    this.version(2).stores({
      siswa_field_definitions: '++id, kelas_id, slug, &[kelas_id+slug]',
    })
  }
}

const MAIN_DB_NAME = 'bgy-wali-kelas'
export const DEMO_DB_NAME = 'bgy-wali-kelas-demo'
const DEMO_MODE_KEY = 'bgy-demo-mode'
// Akun pertama yang login di browser ini mewarisi database lama (sebelum ada akun).
const LEGACY_OWNER_KEY = 'bgy-legacy-db-owner'

let accountUid: string | null = null

export function accountDbName(uid: string | null): string {
  if (!uid) return MAIN_DB_NAME
  try {
    const owner = localStorage.getItem(LEGACY_OWNER_KEY)
    if (!owner) { localStorage.setItem(LEGACY_OWNER_KEY, uid); return MAIN_DB_NAME }
    if (owner === uid) return MAIN_DB_NAME
  } catch {}
  return `${MAIN_DB_NAME}-u-${uid.replace(/[^a-zA-Z0-9-]/g, '')}`
}

// Dipanggil saat sesi akun berubah agar data tiap guru terpisah di perangkat yang sama.
export function setAccount(uid: string | null): void {
  accountUid = uid
  if (!demoSelected) getMainDb()
}

function savedDemoMode(): boolean {
  try { return localStorage.getItem(DEMO_MODE_KEY) === 'true' } catch { return false }
}

let demoSelected = savedDemoMode()
export function isDemoMode(): boolean { return demoSelected }

let activeDb: BgyDatabase | null = null

function getMainDb(): BgyDatabase {
  const name = accountDbName(accountUid)
  if (!activeDb || activeDb.name !== name) {
    activeDb = new BgyDatabase(name)
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
