# Project Architecture
## Bantu Guru Yuk | Wali Kelas
**Versi Dokumen:** 1.1.0  
**Tanggal:** Juli 2026  
**Status:** Final Draft

---

## 1. Gambaran Umum Sistem

**BGY Wali Kelas** adalah aplikasi desktop untuk guru wali kelas. Dirancang dengan prinsip **Local First** dan **Offline First** — semua aktivitas mengajar berjalan tanpa koneksi internet. Koneksi hanya diperlukan untuk autentikasi, validasi lisensi, dan mengambil konten dari server.

```
┌─────────────────────────────────────────────────────────────────┐
│                         BGY Wali Kelas                          │
│                                                                 │
│  ┌──────────────────┐          ┌──────────────────────────────┐ │
│  │   Admin Panel    │          │       Aplikasi Guru          │ │
│  │  (Pak Choy only) │          │     (Guru Wali Kelas)        │ │
│  └────────┬─────────┘          └──────────────┬───────────────┘ │
│           │                                   │                 │
│           ▼                                   ▼                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                      Supabase                           │   │
│  │  Auth · Lisensi · Pengumuman · Versi · Perangkat Resmi  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                   │                             │
│                                   ▼                             │
│                       ┌───────────────────┐                     │
│                       │   SQLite Lokal    │                     │
│                       │  (Data Guru/Siswa)│                     │
│                       └───────────────────┘                     │
│                                   │                             │
│                                   ▼                             │
│                       ┌───────────────────┐                     │
│                       │   File Lokal      │                     │
│                       │  (Dokumen Saya)   │                     │
│                       └───────────────────┘                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Komponen Utama

### 2.1 Admin Panel

Digunakan eksklusif oleh pemilik aplikasi (Pak Choy). Bukan bagian dari distribusi kepada guru.

| Menu | Fungsi |
|------|--------|
| Dashboard | Ringkasan aktivitas sistem |
| Lisensi | Generate, aktifkan, nonaktifkan lisensi |
| Perangkat Ajar Resmi | Upload/kelola dokumen CP, ATP, Prota, Promes, dll. |
| Pengumuman | Kirim notifikasi ke semua pengguna aktif |
| Versi Aplikasi | Kelola info update dan changelog |
| Pengguna | Pantau akun terdaftar |

**Batasan Admin Panel:**
- Tidak dapat mengakses data siswa, nilai, presensi, atau jurnal guru
- Tidak dapat mengakses Dokumen Saya milik guru
- Hanya mengelola konfigurasi dan konten global

---

### 2.2 Aplikasi Guru

Antarmuka utama yang digunakan guru di perangkat masing-masing.

#### Struktur Menu (Sidebar Final)

```
Aplikasi Guru
│
├── Dashboard
│   ├── Widget: Jadwal Hari Ini
│   ├── Widget: Rencana Mengajar Hari Ini
│   ├── Widget: ToDo
│   ├── Widget: Pengumuman BGY
│   ├── Widget: Statistik Singkat
│   └── Widget: Notifikasi Versi
│
├── Siswa
│   ├── Data Siswa (dengan Custom Field)
│   ├── Presensi (default Hadir, toggle non-hadir)
│   ├── Penilaian (kolom dinamis)
│   └── Perilaku
│
├── Aktivitas Mengajar
│   ├── Jadwal
│   ├── Rencana Mengajar
│   ├── Kalender Akademik
│   ├── Jurnal Harian
│   ├── Catatan Guru
│   └── ToDo
│
├── Perangkat Ajar
│   ├── [Tab] 🏫 Dokumen Resmi (dari Admin)
│   └── [Tab] 👨‍🏫 Dokumen Saya (upload guru)
│
├── Laporan
│
└── Pengaturan
```

---

## 3. Arsitektur Data

### 3.1 Data Lokal (SQLite)

Seluruh data operasional guru disimpan di SQLite.

| Entitas | Deskripsi |
|---------|-----------|
| `guru` | Profil guru |
| `kelas` | Kelas aktif dan historis |
| `siswa` | Data identitas default siswa (Nama, NIS, Jenis Kelamin, No. Absen) |
| `siswa_field_definitions` | Definisi custom field siswa per kelas |
| `siswa_field_values` | Nilai custom field per siswa |
| `presensi` | Catatan ketidakhadiran saja (non-Hadir). Hadir = tidak ada record. |
| `mata_pelajaran` | Mata pelajaran per kelas |
| `penilaian_kolom` | Definisi kolom penilaian dinamis per mata pelajaran |
| `nilai` | Nilai siswa per kolom penilaian |
| `perilaku` | Catatan perilaku siswa |
| `jadwal` | Jadwal pelajaran mingguan |
| `kalender_akademik` | Event dan kegiatan sekolah |
| `rencana_mengajar` | Rencana mengajar per pertemuan |
| `jurnal_harian` | Jurnal mengajar guru |
| `catatan_guru` | Catatan bebas guru |
| `todo` | Daftar tugas guru |
| `dokumen_saya` | Metadata dokumen pribadi guru |
| `perangkat_ajar_cache` | Cache metadata dokumen resmi yang sudah diunduh |
| `pengaturan` | Konfigurasi lokal aplikasi |

### 3.2 Data Remote (Supabase)

Hanya data non-sensitif dan konfigurasi global.

| Tabel | Deskripsi | Diakses Oleh |
|-------|-----------|--------------|
| `users` | Akun autentikasi | Supabase Auth |
| `profiles` | Data tambahan akun guru | Admin, App |
| `licenses` | Status dan masa berlaku lisensi | Admin, App |
| `announcements` | Pengumuman dari admin | Admin, App |
| `app_versions` | Info versi dan changelog | Admin, App |
| `perangkat_ajar` | Dokumen Resmi CP, ATP, dll. | Admin (write), App (read) |

> **Aturan Ketat:** Data siswa, presensi, nilai, jurnal, dan Dokumen Saya **tidak pernah** dikirim ke Supabase.

### 3.3 File Lokal

| Jenis | Lokasi | Deskripsi |
|-------|--------|-----------|
| Database SQLite | `~/AppData/Roaming/bgy-wali-kelas/db/local.db` | Semua data guru |
| Dokumen Saya | `~/AppData/Roaming/bgy-wali-kelas/dokumen-saya/` | File yang diupload guru |
| Perangkat Ajar Resmi | `~/AppData/Roaming/bgy-wali-kelas/perangkat-ajar/` | File yang diunduh dari Supabase |

---

## 4. Desain Sistem Dinamis

### 4.1 Custom Field Siswa

Data siswa menggunakan pendekatan **EAV (Entity-Attribute-Value)** untuk kolom tambahan:

```
siswa (fixed columns)
 ├── id, nama, nis, jenis_kelamin, no_absen
 │
 └── siswa_field_values (dynamic columns)
       ├── field_id → siswa_field_definitions
       │              (nama_field, tipe, urutan, pilihan)
       └── nilai (TEXT, diparse sesuai tipe)
```

**Kolom default (fixed):** Nama, NIS, Jenis Kelamin, No. Absen  
**Kolom dinamis (custom):** Semua lainnya — dikelola guru per kelas

### 4.2 Kolom Penilaian Dinamis

Penilaian menggunakan sistem kolom yang sepenuhnya fleksibel:

```
mata_pelajaran
 └──< penilaian_kolom (definisi kolom: label, bobot, urutan)
         └──< nilai (siswa_id × kolom_id = nilai)
```

Tidak ada jenis penilaian hardcoded. Guru mendefinisikan semua kolom sendiri.

### 4.3 Presensi Efisien (Default Hadir)

```
Logika presensi:
- Tabel presensi hanya menyimpan status NON-HADIR (S/I/A)
- Siswa yang tidak ada record = HADIR secara default
- Menghitung hadir: total siswa - count(presensi hari ini) = hadir
- Guru hanya berinteraksi dengan siswa yang tidak hadir
```

---

## 5. Alur Autentikasi

```
[Guru buka aplikasi]
        │
        ▼
[Pilih Mode]
   ├── Demo Mode ──────────► [Data contoh in-memory, tidak tersimpan]
   │
   └── Login
           │
           ▼
   [Email + Password]
           │
           ▼
   [Supabase Auth]
           │
     ┌─────┴──────┐
   Gagal         Berhasil
     │               │
     ▼               ▼
  [Error]       [Cek Lisensi]
                     │
               ┌─────┴──────┐
            Tidak Valid    Valid
               │               │
               ▼               ▼
          [Pesan blokir] [Buka SQLite Lokal]
                              │
                              ▼
                       [Masuk Dashboard]
```

---

## 6. Sistem Backup & Restore

| Aspek | Detail |
|-------|--------|
| Format | File tunggal terenkripsi `.bgy` |
| Isi backup | Seluruh database SQLite + metadata Dokumen Saya |
| File fisik (Dokumen Saya) | **Tidak termasuk** dalam backup — guru backup manual |
| Lokasi | Dipilih sendiri oleh guru |
| Trigger | Manual dari Pengaturan |
| Cloud Sync | Tidak ada |
| Restore | Muat file `.bgy` → validasi → backup failsafe otomatis → timpa SQLite → restart |

---

## 7. Mode Aplikasi

| Mode | Deskripsi | Penyimpanan |
|------|-----------|-------------|
| **Login Guru** | Mode normal dengan akun aktif dan lisensi valid | SQLite lokal |
| **Demo** | Mode eksplorasi tanpa login, data contoh bawaan | In-memory (tidak ada) |

---

## 8. Teknologi

| Layer | Teknologi |
|-------|-----------|
| Framework Desktop | Electron / Tauri |
| Frontend | React + TypeScript |
| Database Lokal | SQLite (via better-sqlite3 / rusqlite) |
| Backend Remote | Supabase (Auth, Database, Storage) |
| State Management | Zustand / Context API |
| Styling | Tailwind CSS |
| Build & Packaging | Electron Builder / Cargo + Tauri CLI |

---

## 9. Prinsip Arsitektur

| Prinsip | Implementasi |
|---------|--------------|
| **Local First** | Semua operasi baca/tulis ke SQLite lokal, bukan ke server |
| **Offline First** | Aplikasi berjalan penuh tanpa internet; online hanya untuk auth & lisensi |
| **Minimal Surface** | Supabase hanya menyentuh data non-personal |
| **Skema Dinamis** | Custom field siswa & kolom penilaian = tidak ada hardcode di schema |
| **Privasi Siswa** | Data siswa tidak pernah meninggalkan perangkat guru |
| **Presensi Efisien** | Hanya menyimpan ketidakhadiran — default hadir = tidak ada record |

---

## 10. Struktur Direktori Proyek (Rencana)

```
bgy-wali-kelas/
├── src/
│   ├── main/                   # Electron/Tauri main process
│   │   ├── db/                 # SQLite handler
│   │   │   ├── migrations/     # SQL migration files
│   │   │   ├── siswa.ts        # Queries: siswa + custom field
│   │   │   ├── presensi.ts     # Queries: presensi (default hadir)
│   │   │   └── penilaian.ts    # Queries: kolom dinamis + nilai
│   │   ├── backup/             # Backup & restore logic
│   │   ├── file-manager/       # Dokumen Saya file handling
│   │   └── updater/            # App version checker
│   ├── renderer/               # React frontend
│   │   ├── pages/
│   │   │   ├── dashboard/      # Widget: jadwal, rencana, todo, pengumuman, statistik
│   │   │   ├── siswa/
│   │   │   │   ├── data-siswa/ # + custom field manager
│   │   │   │   ├── presensi/   # Toggle-based UI
│   │   │   │   ├── penilaian/  # Dynamic column table
│   │   │   │   └── perilaku/
│   │   │   ├── aktivitas/
│   │   │   ├── perangkat-ajar/ # Tab: Dokumen Resmi + Dokumen Saya
│   │   │   ├── laporan/
│   │   │   └── pengaturan/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── stores/
│   └── shared/                 # Types & utilities
├── admin-panel/                # Admin web app (terpisah)
│   └── ...
├── public/
└── package.json
```

---

*Dokumen ini adalah referensi arsitektur. Setiap perubahan desain teknis harus diperbarui di sini sebelum implementasi.*
