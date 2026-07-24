# Product Requirements Document (PRD)
## Bantu Guru Yuk | Wali Kelas
**Versi Dokumen:** 1.1.0  
**Tanggal:** Juli 2026  
**Status:** Final Draft  
**Pemilik Produk:** Pak Choy (BGY)

---

## 1. Ringkasan Produk

**BGY Wali Kelas** adalah aplikasi desktop yang dirancang khusus untuk guru wali kelas di Indonesia. Aplikasi ini membantu guru mengelola seluruh administrasi kelas — dari data siswa, presensi, penilaian, jurnal harian, hingga perangkat ajar — dalam satu platform yang sederhana dan dapat berjalan tanpa koneksi internet.

---

## 2. Latar Belakang & Permasalahan

| # | Masalah | Dampak |
|---|---------|--------|
| 1 | Administrasi tersebar di berbagai file (Excel, Word, kertas) | Data tidak terorganisir, mudah hilang |
| 2 | Tidak ada satu tempat untuk semua tugas wali kelas | Guru harus berpindah aplikasi terus-menerus |
| 3 | Solusi yang ada berbasis cloud dan bergantung internet | Tidak bisa digunakan di sekolah dengan koneksi buruk |
| 4 | Perangkat ajar (CP, ATP, Prota, dll.) tidak mudah diakses | Guru kesulitan mengacu ke dokumen resmi saat mengajar |
| 5 | Tidak ada sistem backup data yang mudah | Data bisa hilang jika perangkat rusak |

---

## 3. Target Pengguna

**Pengguna Utama:** Guru Wali Kelas SD, SMP, SMA/SMK di Indonesia  
**Pengguna Sekunder:** Admin BGY (Pak Choy) — mengelola lisensi, konten, dan pengumuman

---

## 4. Tujuan Produk

| Tujuan | Indikator Keberhasilan |
|--------|----------------------|
| Sentralisasi administrasi wali kelas | Semua data kelas ada dalam satu aplikasi |
| Berjalan penuh tanpa internet | 100% fitur utama dapat digunakan offline |
| Mudah digunakan guru tanpa pelatihan | Onboarding mandiri < 15 menit |
| Data siswa aman di perangkat lokal | Tidak ada data pribadi siswa yang keluar dari perangkat |
| Backup mudah dan dapat diandalkan | Backup & restore < 5 langkah |

---

## 5. Scope MVP

### Termasuk dalam MVP

- [x] Autentikasi (Login, Demo Mode)
- [x] Validasi lisensi
- [x] Manajemen data siswa dengan **Custom Field**
- [x] Presensi harian (default Hadir, toggle per siswa)
- [x] Penilaian siswa dengan **kolom dinamis**
- [x] Catatan perilaku siswa
- [x] Jadwal pelajaran
- [x] Jurnal harian guru
- [x] Catatan guru
- [x] ToDo list guru
- [x] Kalender akademik
- [x] Rencana mengajar
- [x] Akses perangkat ajar — Dokumen Resmi (dari Admin) dan Dokumen Saya (upload guru)
- [x] Laporan dasar
- [x] Backup & Restore lokal
- [x] Pengaturan aplikasi
- [x] Notifikasi pengumuman dari admin
- [x] Cek versi & informasi update
- [x] Dashboard informatif (Jadwal Hari Ini, Rencana Mengajar, ToDo, Pengumuman, Statistik, Notifikasi Versi)

### Tidak Termasuk dalam MVP

- Sinkronisasi cloud data siswa
- Kolaborasi multi-guru dalam satu kelas
- Aplikasi mobile
- Integrasi dengan sistem sekolah (DAPODIK, e-rapor)
- AI/fitur otomasi lanjutan
- Multi-bahasa

---

## 6. Fitur Detail

### 6.1 Autentikasi

| Fitur | Deskripsi |
|-------|-----------|
| Login | Email + password via Supabase Auth |
| Demo Mode | Akses penuh dengan data contoh, tidak disimpan |
| Logout | Sesi dihapus, database lokal tetap tersimpan |
| Lupa Password | Reset via email (Supabase) |

---

### 6.2 Modul Siswa

#### Data Siswa — Custom Field

Kolom default yang selalu ada:
- **Nama** (wajib)
- **NIS**
- **Jenis Kelamin**
- **No. Absen**

Semua kolom tambahan bersifat **dinamis** — guru mengelola sendiri melalui sistem Custom Field:
- Tambah field baru (tipe: teks, angka, tanggal, dropdown)
- Ubah label field
- Hapus field
- Atur urutan tampil field

Contoh field yang bisa ditambahkan guru:
- NISN, Tanggal Lahir, Tempat Lahir, Alamat, Nama Orang Tua, No. HP Orang Tua, dll.

**Implikasi UX:**
- Halaman tambah/edit siswa dirender dinamis berdasarkan definisi field aktif
- Import CSV memetakan kolom CSV ke field yang terdefinisi

#### Presensi

- Default seluruh siswa = **Hadir** setiap hari baru dibuka
- Guru hanya mengubah siswa yang **Sakit / Izin / Alfa** dengan toggle/klik
- Tidak perlu mengisi satu per satu untuk seluruh kelas
- Rekap presensi per minggu dan bulan

#### Penilaian — Kolom Dinamis

Tidak ada jenis penilaian yang hardcoded (tidak ada UH/PTS/PAS bawaan).  
Guru membuat sendiri **kolom penilaian** per mata pelajaran, contoh:
- "UH Bab 1", "Cerpen", "Hafalan", "Pidato", "Tugas Kelompok", "Proyek Akhir"

Setiap kolom penilaian memiliki:
- Label (nama bebas)
- Bobot (untuk kalkulasi rata-rata tertimbang)
- Tanggal penilaian (opsional)

Guru dapat menambah, mengedit, menghapus, dan mengurutkan kolom kapan saja.  
Rata-rata otomatis dihitung berdasarkan bobot.

#### Perilaku

- Pencatatan kejadian positif dan negatif
- Kategori perilaku yang dapat dikustomisasi
- Riwayat catatan per siswa

---

### 6.3 Modul Aktivitas Mengajar

#### Jadwal Pelajaran
- Input jadwal mingguan
- Tampilan grid jadwal per hari

#### Rencana Mengajar
- Buat dan simpan rencana mengajar per pertemuan

#### Kalender Akademik
- Input hari libur, ujian, dan kegiatan sekolah
- Tampilan kalender bulanan

#### Jurnal Harian
- Catatan harian aktivitas mengajar
- Terhubung ke tanggal dan jadwal

#### Catatan Guru
- Catatan bebas (format teks sederhana)
- Organisasi berdasarkan tanggal atau tag

#### ToDo
- Daftar tugas dengan status selesai/belum
- Prioritas opsional
- Filter berdasarkan status

---

### 6.4 Modul Perangkat Ajar

Perangkat ajar dibagi menjadi **dua kategori**:

#### 🏫 Dokumen Resmi
Dokumen resmi Kurikulum Merdeka yang dikelola oleh Admin BGY dan diunduh ke aplikasi guru.

| Dokumen | Deskripsi |
|---------|-----------|
| CP | Capaian Pembelajaran per fase |
| ATP | Alur Tujuan Pembelajaran |
| Prota | Program Tahunan |
| Promes | Program Semester |
| RPM | Rencana Pelaksanaan Modul |
| Modul Ajar | Modul ajar lengkap per topik |

**Alur Akses Dokumen Resmi:**
1. Admin upload dokumen ke Supabase Storage
2. Guru buka tab Dokumen Resmi
3. Aplikasi cek koneksi → unduh daftar dari Supabase
4. Guru unduh dokumen → disimpan lokal
5. Dokumen dapat dibuka offline setelah diunduh

#### 👨‍🏫 Dokumen Saya
Dokumen pribadi guru yang diupload dan dikelola sendiri oleh guru.

- Guru upload dari perangkat lokal (PDF, DOCX, dll.)
- Disimpan di folder lokal aplikasi
- Bisa diberi label/kategori sendiri
- Tidak pernah dikirim ke server

---

### 6.5 Dashboard

Dashboard menampilkan ringkasan harian yang langsung berguna:

| Widget | Konten |
|--------|--------|
| **Jadwal Hari Ini** | Daftar pelajaran hari ini dari tabel `jadwal` |
| **Rencana Mengajar Hari Ini** | Rencana mengajar yang terjadwal hari ini |
| **ToDo** | Todo aktif, 3 terdekat deadline atau yang belum selesai |
| **Pengumuman** | Pengumuman terbaru dari Supabase (atau cache offline) |
| **Statistik Singkat** | Total siswa, presensi hari ini (H/I/S/A), rata-rata kehadiran bulan ini |
| **Notifikasi Versi** | Info versi baru (jika ada update tersedia) |

---

### 6.6 Laporan

| Laporan | Deskripsi |
|---------|-----------|
| Rekap Presensi | Per siswa, per kelas, per periode |
| Rekap Nilai | Per siswa, per mata pelajaran, per kolom penilaian |
| Catatan Perilaku | Ringkasan per siswa |
| Jurnal Mengajar | Rekap jurnal per periode |

Format output: PDF dan/atau cetak langsung.

---

### 6.7 Backup & Restore

| Aspek | Detail |
|-------|--------|
| Trigger | Manual dari menu Pengaturan |
| Format output | File enkripsi tunggal `.bgy` |
| Lokasi simpan | Dipilih guru (folder lokal, flashdisk, dll.) |
| Restore | Pilih file backup → timpa database aktif |
| Cloud | Tidak ada |

---

### 6.8 Pengaturan

- Profil guru (nama, sekolah, mata pelajaran, kelas ampu)
- Tahun ajaran aktif
- Manajemen backup
- Informasi lisensi
- Cek versi & update
- Tema tampilan (terang/gelap — opsional MVP)

---

## 7. Non-Functional Requirements

### 7.1 Performa

| Kriteria | Target |
|----------|--------|
| Waktu buka aplikasi | < 3 detik pada spesifikasi minimum |
| Respons navigasi antar menu | < 500ms |
| Query database lokal | < 200ms untuk data kelas standar (< 40 siswa) |
| Ukuran instalasi | < 150 MB |

### 7.2 Spesifikasi Minimum Perangkat

| Komponen | Minimum |
|----------|---------|
| OS | Windows 10 64-bit / macOS 11 |
| RAM | 4 GB |
| Storage | 500 MB ruang kosong |
| Prosesor | Intel Core i3 generasi ke-7 atau setara |
| Koneksi Internet | Tidak wajib (hanya untuk login & sync konten) |

### 7.3 Keamanan

| Aspek | Implementasi |
|-------|--------------|
| Autentikasi | Supabase Auth (JWT) |
| Session | Token disimpan secara aman di keychain sistem |
| Database lokal | Enkripsi SQLite (SQLCipher) — opsional MVP |
| Backup | File backup terenkripsi |
| Data transfer | HTTPS untuk semua komunikasi dengan Supabase |
| Privasi siswa | Data siswa tidak pernah dikirim ke server manapun |
| Dokumen Saya | Tersimpan lokal, tidak pernah diupload |

### 7.4 Ketersediaan

| Kondisi | Perilaku Aplikasi |
|---------|-------------------|
| Online | Fitur penuh + sync konten baru |
| Offline | Semua fitur berjalan normal kecuali login pertama |
| Koneksi terputus saat pakai | Aplikasi tetap berjalan, tidak ada interupsi |

---

## 8. Arsitektur Teknis

### 8.1 Stack Teknologi

| Layer | Teknologi |
|-------|-----------|
| Desktop Framework | Electron / Tauri |
| Frontend | React + TypeScript |
| Database Lokal | SQLite |
| Remote Backend | Supabase (Auth, Database, Storage) |
| Styling | Tailwind CSS |
| Build | Electron Builder / Tauri CLI |

### 8.2 Pemisahan Data

```
Supabase (Remote)              SQLite (Lokal)
─────────────────              ──────────────
✓ Akun user                   ✓ Data siswa (field dinamis)
✓ Lisensi                     ✓ Definisi custom field siswa
✓ Pengumuman                  ✓ Presensi
✓ Versi app                   ✓ Kolom penilaian (dinamis)
✓ Perangkat ajar resmi        ✓ Nilai
                               ✓ Perilaku
✗ Data siswa                   ✓ Jurnal harian
✗ Nilai                        ✓ Catatan guru
✗ Presensi                     ✓ Jadwal
✗ Jurnal                       ✓ Rencana mengajar
✗ Dokumen Saya                 ✓ Pengaturan
                               ✓ Dokumen Saya (path lokal)
```

---

## 9. Lisensi

| Aspek | Detail |
|-------|--------|
| Model | Per perangkat atau per akun (TBD) |
| Validasi | Online saat login; cached untuk offline |
| Pengelolaan | Admin Panel oleh Pak Choy |
| Masa berlaku | Berdasarkan tanggal yang di-set admin |
| Demo Mode | Tersedia tanpa lisensi |

---

## 10. Admin Panel

Terpisah dari aplikasi guru. Diakses hanya oleh Pak Choy.

| Kapabilitas | Deskripsi |
|-------------|-----------|
| Kelola lisensi | Generate, aktifkan, nonaktifkan |
| Upload perangkat ajar resmi | Tambah/update dokumen CP, ATP, dll. ke Supabase |
| Kirim pengumuman | Push notifikasi ke semua pengguna |
| Kelola versi | Publish info update dan changelog |
| Pantau pengguna | Lihat akun terdaftar dan status lisensi |

**Batasan:** Admin tidak memiliki akses ke data apapun milik guru atau siswa. Admin tidak dapat melihat Dokumen Saya guru.

---

## 11. Rencana Pengembangan Selanjutnya (Post-MVP)

| Fitur | Prioritas |
|-------|-----------|
| Export rapor PDF | Tinggi |
| Integrasi e-rapor | Sedang |
| Notifikasi pengingat (deadline, jadwal) | Sedang |
| Multi-kelas (satu guru, beberapa kelas) | Sedang |
| Aplikasi mobile (Android) | Rendah |
| Integrasi DAPODIK | Rendah |
| Fitur AI (analisis nilai, rekomendasi) | Rendah |

---

*Dokumen ini adalah acuan pengembangan MVP. Perubahan scope harus didiskusikan dan diperbarui sebelum implementasi dimulai.*
