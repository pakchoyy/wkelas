# Database Documentation
## Bantu Guru Yuk | Wali Kelas
**Versi Dokumen:** 1.1.0  
**Tanggal:** Juli 2026  
**Status:** Final Draft

---

## Prinsip Desain Database

| Prinsip | Implementasi |
|---------|--------------|
| **Local First** | Semua data operasional guru disimpan di SQLite lokal |
| **Privasi Siswa** | Data siswa, nilai, presensi tidak pernah keluar dari perangkat |
| **Supabase Minimal** | Supabase hanya menyimpan auth, lisensi, dan konten global |
| **Relasi Eksplisit** | Semua relasi antar tabel menggunakan foreign key |
| **Soft Delete** | Hapus data menggunakan flag `deleted_at`, bukan hapus permanen |
| **Skema Dinamis** | Data siswa dan penilaian menggunakan sistem field/kolom dinamis |

---

## Bagian 1: Database Lokal (SQLite)

Disimpan di perangkat guru. Dibuka setelah login berhasil.  
Path default: `~/AppData/Roaming/bgy-wali-kelas/db/local.db` (Windows)

---

### 1.1 Tabel: `guru`

**Alasan:** Menyimpan profil guru yang sedang menggunakan aplikasi.

| Field | Tipe | Constraint | Deskripsi |
|-------|------|------------|-----------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | |
| `supabase_uid` | TEXT | NOT NULL UNIQUE | UID dari Supabase Auth |
| `nama` | TEXT | NOT NULL | Nama lengkap guru |
| `email` | TEXT | NOT NULL | Email login |
| `nip` | TEXT | | NIP guru (opsional) |
| `nama_sekolah` | TEXT | | Nama sekolah |
| `mata_pelajaran` | TEXT | | Mata pelajaran diampu |
| `foto_url` | TEXT | | Path foto lokal |
| `tahun_ajaran_aktif` | TEXT | NOT NULL | Contoh: `2025/2026` |
| `semester_aktif` | INTEGER | NOT NULL DEFAULT 1 | 1 atau 2 |
| `created_at` | TEXT | NOT NULL | ISO 8601 datetime |
| `updated_at` | TEXT | NOT NULL | ISO 8601 datetime |

---

### 1.2 Tabel: `kelas`

**Alasan:** Kelas aktif dan historis yang pernah diampu guru.

| Field | Tipe | Constraint | Deskripsi |
|-------|------|------------|-----------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | |
| `nama_kelas` | TEXT | NOT NULL | Contoh: `VIII A` |
| `tingkat` | TEXT | NOT NULL | Contoh: `VIII` |
| `tahun_ajaran` | TEXT | NOT NULL | Contoh: `2025/2026` |
| `semester` | INTEGER | NOT NULL | 1 atau 2 |
| `is_aktif` | INTEGER | NOT NULL DEFAULT 1 | 1 = aktif, 0 = arsip |
| `guru_id` | INTEGER | FK → `guru.id` | |
| `created_at` | TEXT | NOT NULL | |
| `updated_at` | TEXT | NOT NULL | |

---

### 1.3 Tabel: `siswa`

**Alasan:** Hanya menyimpan kolom default yang selalu ada. Data tambahan disimpan via sistem Custom Field.

**Kolom default (fixed):**

| Field | Tipe | Constraint | Deskripsi |
|-------|------|------------|-----------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | |
| `kelas_id` | INTEGER | NOT NULL, FK → `kelas.id` | |
| `nama` | TEXT | NOT NULL | Nama lengkap (wajib) |
| `nis` | TEXT | | Nomor Induk Siswa |
| `jenis_kelamin` | TEXT | | `L` atau `P` |
| `no_absen` | INTEGER | | Nomor absen di kelas |
| `deleted_at` | TEXT | | Soft delete |
| `created_at` | TEXT | NOT NULL | |
| `updated_at` | TEXT | NOT NULL | |

> **Semua data lain (NISN, tanggal lahir, alamat, nama ortu, dll.) disimpan via Custom Field — lihat tabel 1.4 dan 1.5.**

**Contoh Data:**
```
id: 1, kelas_id: 1, nama: "Ahmad Fauzi", nis: "20240001",
jenis_kelamin: "L", no_absen: 1, deleted_at: null
```

---

### 1.4 Tabel: `siswa_field_definitions`

**Alasan:** Mendefinisikan kolom tambahan (custom field) untuk data siswa. Dikelola sendiri oleh guru per kelas.

| Field | Tipe | Constraint | Deskripsi |
|-------|------|------------|-----------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | |
| `kelas_id` | INTEGER | NOT NULL, FK → `kelas.id` | Field berlaku per kelas |
| `nama_field` | TEXT | NOT NULL | Label tampil, contoh: `Nama Orang Tua` |
| `slug` | TEXT | NOT NULL | Identifier unik, contoh: `nama_ortu` |
| `tipe` | TEXT | NOT NULL DEFAULT 'teks' | `teks` / `angka` / `tanggal` / `dropdown` |
| `pilihan` | TEXT | | JSON array untuk tipe `dropdown`, contoh: `["Islam","Kristen"]` |
| `wajib` | INTEGER | DEFAULT 0 | 1 = wajib diisi |
| `urutan` | INTEGER | DEFAULT 0 | Urutan tampil di form |
| `created_at` | TEXT | NOT NULL | |
| `updated_at` | TEXT | NOT NULL | |

**Constraint unik:** `(kelas_id, slug)`

**Contoh Data:**
```
id: 1, kelas_id: 1, nama_field: "NISN",          slug: "nisn",         tipe: "teks",    urutan: 1
id: 2, kelas_id: 1, nama_field: "Tanggal Lahir",  slug: "tgl_lahir",    tipe: "tanggal", urutan: 2
id: 3, kelas_id: 1, nama_field: "Tempat Lahir",   slug: "tempat_lahir", tipe: "teks",    urutan: 3
id: 4, kelas_id: 1, nama_field: "Alamat",         slug: "alamat",       tipe: "teks",    urutan: 4
id: 5, kelas_id: 1, nama_field: "Nama Orang Tua", slug: "nama_ortu",    tipe: "teks",    urutan: 5
id: 6, kelas_id: 1, nama_field: "No. HP Ortu",    slug: "hp_ortu",      tipe: "teks",    urutan: 6
id: 7, kelas_id: 1, nama_field: "Agama",          slug: "agama",        tipe: "dropdown",
       pilihan: '["Islam","Kristen","Katolik","Hindu","Buddha","Konghucu"]', urutan: 7
```

---

### 1.5 Tabel: `siswa_field_values`

**Alasan:** Menyimpan nilai dari setiap custom field per siswa (EAV pattern).

| Field | Tipe | Constraint | Deskripsi |
|-------|------|------------|-----------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | |
| `siswa_id` | INTEGER | NOT NULL, FK → `siswa.id` | |
| `field_id` | INTEGER | NOT NULL, FK → `siswa_field_definitions.id` | |
| `nilai` | TEXT | | Nilai field (disimpan sebagai teks, diparse sesuai tipe) |
| `updated_at` | TEXT | NOT NULL | |

**Constraint unik:** `(siswa_id, field_id)`

**Contoh Data:**
```
siswa_id: 1, field_id: 1 (NISN),          nilai: "0012345678"
siswa_id: 1, field_id: 2 (Tgl Lahir),     nilai: "2011-03-15"
siswa_id: 1, field_id: 3 (Tempat Lahir),  nilai: "Madiun"
siswa_id: 1, field_id: 5 (Nama Ortu),     nilai: "Bapak Fauzan"
siswa_id: 1, field_id: 6 (HP Ortu),       nilai: "081234567890"
```

---

### 1.6 Tabel: `presensi`

**Alasan:** Menyimpan catatan ketidakhadiran. Siswa yang tidak ada recordnya di suatu tanggal dianggap **Hadir** secara default — tidak perlu menyimpan baris untuk setiap siswa yang hadir.

| Field | Tipe | Constraint | Deskripsi |
|-------|------|------------|-----------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | |
| `siswa_id` | INTEGER | NOT NULL, FK → `siswa.id` | |
| `kelas_id` | INTEGER | NOT NULL, FK → `kelas.id` | Redundan untuk query cepat |
| `tanggal` | TEXT | NOT NULL | Format: `YYYY-MM-DD` |
| `status` | TEXT | NOT NULL | `S` / `I` / `A` (Sakit/Izin/Alfa) |
| `keterangan` | TEXT | | Isi surat izin, dll. |
| `created_at` | TEXT | NOT NULL | |
| `updated_at` | TEXT | NOT NULL | |

**Constraint unik:** `(siswa_id, tanggal)`

> **Penting:** Tabel ini hanya menyimpan status non-Hadir. Untuk menghitung kehadiran, query: jumlah siswa di kelas dikurangi jumlah baris di tabel ini pada tanggal tersebut = jumlah yang hadir. Siswa tanpa record pada suatu tanggal = Hadir.

**Nilai `status`:**
| Kode | Arti |
|------|------|
| `S` | Sakit |
| `I` | Izin |
| `A` | Alfa (tanpa keterangan) |

**Contoh Data:**
```
// Hari 2025-08-04: 35 siswa di kelas, hanya 2 yang dicatat = 33 hadir

id: 1, siswa_id: 3, kelas_id: 1, tanggal: "2025-08-04", status: "S", keterangan: "Demam, surat dokter"
id: 2, siswa_id: 7, kelas_id: 1, tanggal: "2025-08-04", status: "I", keterangan: "Izin acara keluarga"
```

---

### 1.7 Tabel: `mata_pelajaran`

**Alasan:** Daftar mata pelajaran yang dinilai di kelas. Dikustomisasi per guru.

| Field | Tipe | Constraint | Deskripsi |
|-------|------|------------|-----------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | |
| `kelas_id` | INTEGER | NOT NULL, FK → `kelas.id` | |
| `nama` | TEXT | NOT NULL | Contoh: `Matematika` |
| `kode` | TEXT | | Contoh: `MTK` |
| `urutan` | INTEGER | DEFAULT 0 | |
| `created_at` | TEXT | NOT NULL | |

---

### 1.8 Tabel: `penilaian_kolom`

**Alasan:** Mendefinisikan kolom penilaian dinamis per mata pelajaran. Tidak ada jenis yang hardcoded (tidak ada UH/PTS/PAS bawaan). Guru bebas membuat kolom apa saja.

| Field | Tipe | Constraint | Deskripsi |
|-------|------|------------|-----------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | |
| `mata_pelajaran_id` | INTEGER | NOT NULL, FK → `mata_pelajaran.id` | |
| `label` | TEXT | NOT NULL | Nama kolom bebas: `UH Bab 1`, `Cerpen`, `Hafalan`, dll. |
| `bobot` | REAL | NOT NULL DEFAULT 1.0 | Bobot untuk rata-rata tertimbang |
| `tanggal` | TEXT | | Tanggal penilaian (opsional) |
| `urutan` | INTEGER | DEFAULT 0 | Urutan tampil kolom |
| `catatan` | TEXT | | Catatan tentang kolom ini |
| `created_at` | TEXT | NOT NULL | |
| `updated_at` | TEXT | NOT NULL | |

**Contoh Data:**
```
// Mata Pelajaran: Bahasa Indonesia (id: 2)
id: 1, mata_pelajaran_id: 2, label: "UH Bab 1",         bobot: 1.0, urutan: 1
id: 2, mata_pelajaran_id: 2, label: "Menulis Cerpen",    bobot: 1.5, urutan: 2
id: 3, mata_pelajaran_id: 2, label: "Hafalan Puisi",     bobot: 1.0, urutan: 3
id: 4, mata_pelajaran_id: 2, label: "Pidato",            bobot: 2.0, urutan: 4
id: 5, mata_pelajaran_id: 2, label: "Tugas Kelompok",    bobot: 1.0, urutan: 5

// Mata Pelajaran: Matematika (id: 1)
id: 6, mata_pelajaran_id: 1, label: "UH Bilangan Bulat", bobot: 1.0, urutan: 1
id: 7, mata_pelajaran_id: 1, label: "UH Pecahan",        bobot: 1.0, urutan: 2
id: 8, mata_pelajaran_id: 1, label: "Proyek Statistik",  bobot: 2.0, urutan: 3
```

---

### 1.9 Tabel: `nilai`

**Alasan:** Menyimpan nilai siswa per kolom penilaian dinamis.

| Field | Tipe | Constraint | Deskripsi |
|-------|------|------------|-----------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | |
| `siswa_id` | INTEGER | NOT NULL, FK → `siswa.id` | |
| `kolom_id` | INTEGER | NOT NULL, FK → `penilaian_kolom.id` | |
| `nilai` | REAL | | Skala 0–100 (NULL jika belum diisi) |
| `catatan` | TEXT | | Catatan per nilai |
| `created_at` | TEXT | NOT NULL | |
| `updated_at` | TEXT | NOT NULL | |

**Constraint unik:** `(siswa_id, kolom_id)`

**Contoh Data:**
```
siswa_id: 1, kolom_id: 1 (UH Bil. Bulat),   nilai: 85.0
siswa_id: 1, kolom_id: 2 (Menulis Cerpen),  nilai: 90.0
siswa_id: 1, kolom_id: 3 (Hafalan Puisi),   nilai: 78.0
siswa_id: 2, kolom_id: 1 (UH Bil. Bulat),   nilai: 72.0
siswa_id: 2, kolom_id: 2 (Menulis Cerpen),  nilai: null  ← belum diisi
```

---

### 1.10 Tabel: `perilaku`

**Alasan:** Catatan kejadian perilaku (positif/negatif) per siswa.

| Field | Tipe | Constraint | Deskripsi |
|-------|------|------------|-----------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | |
| `siswa_id` | INTEGER | NOT NULL, FK → `siswa.id` | |
| `tanggal` | TEXT | NOT NULL | Format: `YYYY-MM-DD` |
| `jenis` | TEXT | NOT NULL | `positif` atau `negatif` |
| `kategori` | TEXT | | Contoh: `Kedisiplinan`, `Kerjasama` |
| `deskripsi` | TEXT | NOT NULL | Isi catatan |
| `tindak_lanjut` | TEXT | | |
| `created_at` | TEXT | NOT NULL | |
| `updated_at` | TEXT | NOT NULL | |

---

### 1.11 Tabel: `jadwal`

**Alasan:** Jadwal pelajaran mingguan kelas.

| Field | Tipe | Constraint | Deskripsi |
|-------|------|------------|-----------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | |
| `kelas_id` | INTEGER | NOT NULL, FK → `kelas.id` | |
| `hari` | INTEGER | NOT NULL | 1=Senin s/d 7=Minggu |
| `jam_ke` | INTEGER | NOT NULL | Urutan jam pelajaran |
| `jam_mulai` | TEXT | NOT NULL | Format: `HH:MM` |
| `jam_selesai` | TEXT | NOT NULL | Format: `HH:MM` |
| `mata_pelajaran_id` | INTEGER | FK → `mata_pelajaran.id` | |
| `nama_mapel_custom` | TEXT | | Jika mapel tidak ada di tabel |
| `nama_guru` | TEXT | | Guru pengampu (jika bukan wali kelas) |
| `ruang` | TEXT | | |
| `created_at` | TEXT | NOT NULL | |
| `updated_at` | TEXT | NOT NULL | |

---

### 1.12 Tabel: `kalender_akademik`

| Field | Tipe | Constraint | Deskripsi |
|-------|------|------------|-----------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | |
| `kelas_id` | INTEGER | FK → `kelas.id` | Null jika berlaku untuk semua |
| `tanggal_mulai` | TEXT | NOT NULL | Format: `YYYY-MM-DD` |
| `tanggal_selesai` | TEXT | | Kosong jika satu hari |
| `judul` | TEXT | NOT NULL | |
| `jenis` | TEXT | NOT NULL | `libur_nasional` / `libur_sekolah` / `ujian` / `rapat` / `kegiatan` / `lainnya` |
| `deskripsi` | TEXT | | |
| `created_at` | TEXT | NOT NULL | |

---

### 1.13 Tabel: `rencana_mengajar`

| Field | Tipe | Constraint | Deskripsi |
|-------|------|------------|-----------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | |
| `kelas_id` | INTEGER | NOT NULL, FK → `kelas.id` | |
| `mata_pelajaran_id` | INTEGER | FK → `mata_pelajaran.id` | |
| `tanggal` | TEXT | NOT NULL | |
| `topik` | TEXT | NOT NULL | |
| `tujuan_pembelajaran` | TEXT | | |
| `kegiatan` | TEXT | | |
| `media` | TEXT | | |
| `penilaian` | TEXT | | |
| `catatan` | TEXT | | |
| `status` | TEXT | DEFAULT 'draft' | `draft` / `selesai` |
| `created_at` | TEXT | NOT NULL | |
| `updated_at` | TEXT | NOT NULL | |

---

### 1.14 Tabel: `jurnal_harian`

| Field | Tipe | Constraint | Deskripsi |
|-------|------|------------|-----------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | |
| `kelas_id` | INTEGER | FK → `kelas.id` | |
| `tanggal` | TEXT | NOT NULL | |
| `jam_ke` | TEXT | | Contoh: `1-2` |
| `mata_pelajaran` | TEXT | | |
| `materi` | TEXT | | |
| `kegiatan` | TEXT | | |
| `kendala` | TEXT | | |
| `refleksi` | TEXT | | |
| `created_at` | TEXT | NOT NULL | |
| `updated_at` | TEXT | NOT NULL | |

---

### 1.15 Tabel: `catatan_guru`

| Field | Tipe | Constraint | Deskripsi |
|-------|------|------------|-----------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | |
| `judul` | TEXT | NOT NULL | |
| `isi` | TEXT | | |
| `tag` | TEXT | | Comma-separated |
| `warna` | TEXT | DEFAULT '#ffffff' | |
| `is_pinned` | INTEGER | DEFAULT 0 | |
| `deleted_at` | TEXT | | Soft delete |
| `created_at` | TEXT | NOT NULL | |
| `updated_at` | TEXT | NOT NULL | |

---

### 1.16 Tabel: `todo`

| Field | Tipe | Constraint | Deskripsi |
|-------|------|------------|-----------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | |
| `judul` | TEXT | NOT NULL | |
| `deskripsi` | TEXT | | |
| `prioritas` | TEXT | DEFAULT 'normal' | `rendah` / `normal` / `tinggi` |
| `status` | TEXT | DEFAULT 'belum' | `belum` / `selesai` |
| `deadline` | TEXT | | Format: `YYYY-MM-DD` |
| `completed_at` | TEXT | | |
| `deleted_at` | TEXT | | Soft delete |
| `created_at` | TEXT | NOT NULL | |
| `updated_at` | TEXT | NOT NULL | |

---

### 1.17 Tabel: `dokumen_saya`

**Alasan:** Dokumen pribadi guru (Dokumen Saya) yang diupload sendiri, disimpan di folder lokal aplikasi.

| Field | Tipe | Constraint | Deskripsi |
|-------|------|------------|-----------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | |
| `judul` | TEXT | NOT NULL | |
| `deskripsi` | TEXT | | |
| `kategori` | TEXT | | Label bebas guru |
| `file_path` | TEXT | NOT NULL | Path file lokal absolut |
| `format_file` | TEXT | | `pdf` / `docx` / `xlsx` / dll. |
| `ukuran_file` | INTEGER | | Dalam bytes |
| `deleted_at` | TEXT | | Soft delete |
| `created_at` | TEXT | NOT NULL | |
| `updated_at` | TEXT | NOT NULL | |

**Catatan:** File fisik disimpan di folder `~/AppData/Roaming/bgy-wali-kelas/dokumen-saya/`. Tabel ini menyimpan metadata-nya. File tidak pernah dikirim ke server.

---

### 1.18 Tabel: `perangkat_ajar_cache`

**Alasan:** Cache metadata dokumen resmi yang sudah diunduh dari Supabase, agar bisa diakses offline.

| Field | Tipe | Constraint | Deskripsi |
|-------|------|------------|-----------|
| `id` | TEXT | PRIMARY KEY | UUID dari Supabase `perangkat_ajar.id` |
| `judul` | TEXT | NOT NULL | |
| `jenis` | TEXT | NOT NULL | `CP` / `ATP` / `Prota` / `Promes` / `RPM` / `Modul Ajar` |
| `mata_pelajaran` | TEXT | | |
| `jenjang` | TEXT | | |
| `kelas` | TEXT | | |
| `fase` | TEXT | | |
| `file_path_lokal` | TEXT | | Path file lokal (null jika belum diunduh) |
| `file_url` | TEXT | NOT NULL | URL di Supabase Storage |
| `ukuran_file` | INTEGER | | |
| `format_file` | TEXT | | |
| `versi` | TEXT | | |
| `sudah_diunduh` | INTEGER | DEFAULT 0 | 1 = sudah ada di lokal |
| `diunduh_at` | TEXT | | Waktu terakhir diunduh |
| `updated_at` | TEXT | NOT NULL | |

---

### 1.19 Tabel: `pengaturan`

| Field | Tipe | Constraint | Deskripsi |
|-------|------|------------|-----------|
| `key` | TEXT | PRIMARY KEY | Nama pengaturan |
| `value` | TEXT | NOT NULL | Nilai pengaturan (JSON string) |
| `updated_at` | TEXT | NOT NULL | |

**Contoh Data:**
```
key: "tema",             value: "terang"
key: "kelas_aktif_id",  value: "1"
key: "backup_terakhir", value: "2025-09-01T08:00:00"
key: "notif_aktif",     value: "true"
```

---

### Diagram Relasi — Database Lokal

```
guru
 └──< kelas
         ├──< siswa
         │     ├──< siswa_field_values >── siswa_field_definitions
         │     ├──< presensi
         │     ├──< nilai >── penilaian_kolom >── mata_pelajaran
         │     └──< perilaku
         │
         ├──< mata_pelajaran
         │     └──< penilaian_kolom
         ├──< siswa_field_definitions
         ├──< jadwal >── mata_pelajaran
         ├──< kalender_akademik
         ├──< rencana_mengajar >── mata_pelajaran
         └──< jurnal_harian

guru (global)
 ├── catatan_guru
 ├── todo
 ├── dokumen_saya
 ├── perangkat_ajar_cache
 └── pengaturan
```

---

## Bagian 2: Database Supabase (Remote)

Dikelola di cloud. Hanya data non-personal dan konfigurasi global.

---

### 2.1 Tabel: `users` *(dikelola Supabase Auth)*

| Field | Tipe | Deskripsi |
|-------|------|-----------|
| `id` | UUID | Primary key — digunakan sebagai `supabase_uid` di lokal |
| `email` | TEXT | Email login |
| `created_at` | TIMESTAMPTZ | |
| `last_sign_in_at` | TIMESTAMPTZ | |

---

### 2.2 Tabel: `profiles`

| Field | Tipe | Constraint | Deskripsi |
|-------|------|------------|-----------|
| `id` | UUID | PRIMARY KEY, FK → `auth.users.id` | |
| `nama` | TEXT | NOT NULL | |
| `nama_sekolah` | TEXT | | |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | |
| `updated_at` | TIMESTAMPTZ | | |

---

### 2.3 Tabel: `licenses`

| Field | Tipe | Constraint | Deskripsi |
|-------|------|------------|-----------|
| `id` | UUID | PRIMARY KEY | |
| `user_id` | UUID | NOT NULL, FK → `auth.users.id` | |
| `kode_lisensi` | TEXT | NOT NULL UNIQUE | |
| `tipe` | TEXT | NOT NULL | `trial` / `basic` / `pro` |
| `status` | TEXT | NOT NULL DEFAULT 'aktif' | `aktif` / `nonaktif` / `kedaluwarsa` |
| `tanggal_mulai` | DATE | NOT NULL | |
| `tanggal_selesai` | DATE | | Null = tidak ada batas |
| `catatan_admin` | TEXT | | |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | |
| `updated_at` | TIMESTAMPTZ | | |

---

### 2.4 Tabel: `announcements`

| Field | Tipe | Constraint | Deskripsi |
|-------|------|------------|-----------|
| `id` | UUID | PRIMARY KEY | |
| `judul` | TEXT | NOT NULL | |
| `isi` | TEXT | NOT NULL | Markdown/plain |
| `jenis` | TEXT | NOT NULL DEFAULT 'info' | `info` / `peringatan` / `update` / `penting` |
| `target` | TEXT | DEFAULT 'semua' | `semua` / `pro` / `basic` / `trial` |
| `is_aktif` | BOOLEAN | DEFAULT true | |
| `tanggal_mulai` | DATE | | |
| `tanggal_selesai` | DATE | | |
| `created_by` | UUID | FK → `auth.users.id` | |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | |

---

### 2.5 Tabel: `app_versions`

| Field | Tipe | Constraint | Deskripsi |
|-------|------|------------|-----------|
| `id` | UUID | PRIMARY KEY | |
| `versi` | TEXT | NOT NULL UNIQUE | Contoh: `1.2.0` |
| `platform` | TEXT | NOT NULL | `windows` / `macos` / `all` |
| `tipe` | TEXT | NOT NULL | `stable` / `beta` |
| `changelog` | TEXT | | |
| `url_download` | TEXT | | |
| `is_wajib` | BOOLEAN | DEFAULT false | |
| `tanggal_rilis` | DATE | NOT NULL | |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | |

---

### 2.6 Tabel: `perangkat_ajar`

**Alasan:** Dokumen resmi (CP, ATP, Prota, dll.) yang diupload admin dan diunduh guru. Bukan Dokumen Saya guru.

| Field | Tipe | Constraint | Deskripsi |
|-------|------|------------|-----------|
| `id` | UUID | PRIMARY KEY | |
| `judul` | TEXT | NOT NULL | |
| `jenis` | TEXT | NOT NULL | `CP` / `ATP` / `Prota` / `Promes` / `RPM` / `Modul Ajar` |
| `mata_pelajaran` | TEXT | | |
| `jenjang` | TEXT | | `SD` / `SMP` / `SMA` / `SMK` |
| `kelas` | TEXT | | |
| `fase` | TEXT | | Contoh: `D`, `E`, `F` |
| `deskripsi` | TEXT | | |
| `file_url` | TEXT | NOT NULL | URL file di Supabase Storage |
| `ukuran_file` | INTEGER | | Dalam bytes |
| `format_file` | TEXT | | `pdf` / `docx` / `xlsx` |
| `versi` | TEXT | DEFAULT '1.0' | |
| `is_aktif` | BOOLEAN | DEFAULT true | |
| `uploaded_by` | UUID | FK → `auth.users.id` | Admin yang upload |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | |
| `updated_at` | TIMESTAMPTZ | | |

---

### Diagram Relasi — Database Supabase

```
auth.users
 ├──── profiles           (1:1)
 └──── licenses           (1:N)

announcements             (global)
app_versions              (global)
perangkat_ajar            (global — Dokumen Resmi saja)
```

---

## Ringkasan Pemisahan Data

| Data | Lokasi | Alasan |
|------|--------|--------|
| Profil guru | SQLite + Supabase `profiles` | Lokal = offline; Supabase = referensi akun |
| Data siswa (default) | SQLite `siswa` | Privasi |
| Custom field siswa | SQLite `siswa_field_definitions` + `siswa_field_values` | Privasi + fleksibel |
| Presensi | SQLite `presensi` (non-hadir saja) | Privasi + efisien |
| Kolom penilaian | SQLite `penilaian_kolom` | Dinamis per guru |
| Nilai | SQLite `nilai` | Privasi |
| Perilaku | SQLite `perilaku` | Privasi |
| Jurnal, catatan, todo | SQLite | Data kerja personal |
| Dokumen Saya | SQLite metadata + file lokal | Privasi, tidak pernah ke server |
| Dokumen Resmi (cache) | SQLite `perangkat_ajar_cache` | Akses offline |
| Lisensi | Supabase `licenses` | Validasi terpusat |
| Pengumuman | Supabase `announcements` | Konten global admin |
| Versi app | Supabase `app_versions` | Dikelola admin |
| Dokumen Resmi (sumber) | Supabase `perangkat_ajar` + Storage | Dikelola admin |

---

*Dokumen ini adalah referensi skema database. SQL migration dibuat terpisah berdasarkan dokumen ini.*
