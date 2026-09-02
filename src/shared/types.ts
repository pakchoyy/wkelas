export interface Guru {
  id: number
  supabase_uid: string
  nama: string
  email: string
  nip?: string
  nama_sekolah?: string
  mata_pelajaran?: string
  foto_url?: string
  tahun_ajaran_aktif: string
  semester_aktif: number
  created_at: string
  updated_at: string
}

export interface Kelas {
  id: number
  nama_kelas: string
  tingkat: string
  tahun_ajaran: string
  semester: number
  is_aktif: number
  guru_id: number
  created_at: string
  updated_at: string
}

export interface Siswa {
  id: number
  kelas_id: number
  nama: string
  nis?: string
  jenis_kelamin?: string
  no_absen?: number
  deleted_at?: string
  created_at: string
  updated_at: string
}

export interface SiswaFieldDefinition {
  id: number
  kelas_id: number
  nama_field: string
  slug: string
  tipe: 'teks' | 'angka' | 'tanggal' | 'dropdown'
  pilihan?: string
  wajib: number
  urutan: number
  is_aktif?: number
  created_at: string
  updated_at: string
}

export interface SiswaFieldValue {
  id: number
  siswa_id: number
  field_id: number
  nilai?: string
  updated_at: string
}

export interface Presensi {
  id: number
  siswa_id: number
  kelas_id: number
  tanggal: string
  status: 'S' | 'I' | 'A'
  keterangan?: string
  created_at: string
  updated_at: string
}

export interface MataPelajaran {
  id: number
  kelas_id: number
  nama: string
  is_aktif?: number
  kode?: string
  urutan: number
  created_at: string
}

export interface PenilaianKolom {
  periode?: string
  id: number
  mata_pelajaran_id: number
  label: string
  bobot: number
  tanggal?: string
  urutan: number
  catatan?: string
  created_at: string
  updated_at: string
}

export interface Nilai {
  id: number
  siswa_id: number
  kolom_id: number
  nilai?: number
  catatan?: string
  created_at: string
  updated_at: string
}

export interface Perilaku {
  id: number
  siswa_id: number
  tanggal: string
  jenis: 'positif' | 'negatif'
  kategori?: string
  deskripsi: string
  tindak_lanjut?: string
  created_at: string
  updated_at: string
}

export interface Jadwal {
  id: number
  kelas_id: number
  hari: number
  jam_ke: number
  jam_mulai: string
  jam_selesai: string
  mata_pelajaran_id?: number
  nama_mapel_custom?: string
  nama_guru?: string
  ruang?: string
  created_at: string
  updated_at: string
}

export interface KalenderAkademik {
  id: number
  kelas_id?: number
  tanggal_mulai: string
  tanggal_selesai?: string
  judul: string
  jenis: string
  deskripsi?: string
  created_at: string
}

export interface RencanaMengajar {
  id: number
  kelas_id: number
  mata_pelajaran_id?: number
  tanggal: string
  topik: string
  tujuan_pembelajaran?: string
  kegiatan?: string
  media?: string
  penilaian?: string
  catatan?: string
  status: string
  created_at: string
  updated_at: string
}

export interface JurnalHarian {
  id: number
  kelas_id?: number
  tanggal: string
  jam_ke?: string
  mata_pelajaran?: string
  materi?: string
  kegiatan?: string
  kendala?: string
  refleksi?: string
  created_at: string
  updated_at: string
}

export interface CatatanGuru {
  id: number
  judul: string
  isi?: string
  tag?: string
  warna: string
  is_pinned: number
  deleted_at?: string
  created_at: string
  updated_at: string
}

export interface Todo {
  id: number
  judul: string
  deskripsi?: string
  prioritas: string
  status: string
  deadline?: string
  completed_at?: string
  deleted_at?: string
  created_at: string
  updated_at: string
}

export interface DokumenSaya {
  id: number
  judul: string
  deskripsi?: string
  kategori?: string
  file_path: string
  format_file?: string
  ukuran_file?: number
  deleted_at?: string
  created_at: string
  updated_at: string
}

export interface PerangkatAjarCache {
  id: string
  judul: string
  jenis: string
  mata_pelajaran?: string
  jenjang?: string
  kelas?: string
  fase?: string
  file_path_lokal?: string
  file_url: string
  ukuran_file?: number
  format_file?: string
  versi?: string
  sudah_diunduh: number
  diunduh_at?: string
  updated_at: string
}

export interface Pengaturan {
  key: string
  value: string
  updated_at: string
}
