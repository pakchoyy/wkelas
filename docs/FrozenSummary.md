# FrozenSummary.md
## Bantu Guru Yuk | Wali Kelas
**Versi:** 1.0.0  
**Tanggal:** Juli 2026  
**Status:** FINAL — Tidak boleh diubah saat implementasi

> Dokumen ini berisi seluruh keputusan desain final proyek BGY Wali Kelas. Semua yang tercantum di sini bersifat **frozen** dan menjadi acuan utama implementasi. Perubahan hanya boleh dilakukan melalui revisi dokumen eksplisit oleh Pak Choy sebelum implementasi dimulai.

---

## 1. Arsitektur Sistem

### Local First + Offline First
- Aplikasi berjalan **penuh tanpa internet**
- Semua data kerja guru tersimpan di **SQLite lokal**
- Internet hanya diperlukan untuk: login pertama, validasi lisensi, download dokumen resmi, cek pengumuman
- Semua query ke data operasional menggunakan SQLite — tidak ada loading dari server saat mengajar

### Pemisahan Data Ketat
| Supabase (Remote) | SQLite (Lokal) | File Lokal |
|-------------------|----------------|------------|
| Auth, lisensi, pengumuman, versi, dokumen resmi | Semua data guru dan siswa | Dokumen Saya, foto siswa, file dokumen resmi yang diunduh |

**Tidak pernah ke Supabase:** data siswa, presensi, nilai, perilaku, jurnal, catatan, todo, dokumen saya.

---

## 2. Stack Teknologi (Final)

| Layer | Teknologi |
|-------|-----------|
| Desktop Framework | Electron / Tauri (cross-platform) |
| Frontend | React + TypeScript |
| Database Lokal | SQLite (better-sqlite3 / rusqlite) |
| Remote Backend | Supabase (Auth + Database + Storage) |
| Styling | Tailwind CSS |
| Build | Electron Builder / Tauri CLI |
| State | Zustand / Context API |

---

## 3. Admin Panel

- Terpisah dari distribusi aplikasi guru
- Hanya diakses oleh Pak Choy
- **Kapabilitas:** kelola lisensi, upload dokumen resmi, kirim pengumuman, kelola versi
- **Tidak bisa:** akses data siswa, nilai, presensi, jurnal, atau Dokumen Saya guru
- Privasi data guru sepenuhnya terlindungi

---

## 4. Sidebar Final

```
● Dashboard
▼ Siswa
    Data Siswa
    Presensi
    Penilaian
    Perilaku
▼ Aktivitas Mengajar
    Jadwal
    Rencana Mengajar
    Kalender Akademik
    Jurnal Harian
    Catatan Guru
    ToDo
● Perangkat Ajar  ← satu item, dua tab di dalam
● Laporan
● Pengaturan
```

**Catatan Sidebar:** Perangkat Ajar adalah satu menu dengan dua tab internal (Dokumen Resmi + Dokumen Saya). Bukan dua item sidebar terpisah, bukan enam item (CP/ATP/dll) seperti di versi awal.

---

## 5. Dashboard Final

Dashboard menampilkan **6 widget** berikut — tidak lebih, tidak kurang untuk MVP:

| Widget | Sumber Data | Aksi |
|--------|-------------|------|
| Jadwal Hari Ini | `jadwal` (SQLite) | Klik → halaman Jadwal |
| Rencana Mengajar Hari Ini | `rencana_mengajar` (SQLite) | Klik → detail rencana |
| ToDo | `todo` (SQLite) — 3 terdekat deadline | Centang toggle langsung; Klik lihat semua |
| Pengumuman BGY | `announcements` (Supabase/cache) | Klik → detail pengumuman |
| Statistik Singkat | `siswa` + `presensi` (SQLite) | Klik Isi Presensi |
| Notifikasi Versi | `app_versions` (Supabase) — hanya jika online & ada update | Klik → Pengaturan Versi |

---

## 6. Data Siswa — Custom Field (Final)

### Kolom Default (Fixed — selalu ada)
- Nama *(wajib)*
- NIS
- Jenis Kelamin (`L` / `P`)
- No. Absen

### Kolom Tambahan (Dynamic — Custom Field)
Semua kolom lain bersifat **dinamis**. Guru mengelola sendiri via halaman "Kelola Field":
- Tambah field baru
- Edit label field
- Hapus field
- Atur urutan tampil (drag-and-drop)

### Tipe Field yang Didukung
- `teks` — input teks bebas
- `angka` — input numerik
- `tanggal` — date picker
- `dropdown` — pilihan dari daftar yang guru definisikan

### Implementasi Database
Menggunakan pola **EAV (Entity-Attribute-Value)**:
- `siswa` — kolom default saja
- `siswa_field_definitions` — definisi field per kelas
- `siswa_field_values` — nilai field per siswa

---

## 7. Presensi — Default Hadir (Final)

### Prinsip Utama
- Saat buka halaman presensi, **semua siswa default = Hadir**
- Guru **hanya menandai siswa yang TIDAK hadir** (Sakit / Izin / Alfa)
- Tidak ada pengisian satu per satu untuk seluruh kelas

### UX Presensi
1. Daftar siswa tampil, semua status = Hadir
2. Guru klik baris/tombol siswa yang tidak hadir → toggle status
3. Toggle urutan: Hadir → Sakit → Izin → Alfa → Hadir (atau pilih langsung)
4. Keterangan opsional muncul otomatis untuk non-Hadir
5. Ringkasan real-time: "Hadir: 33 | S: 1 | I: 1 | A: 0"
6. Tekan Simpan → hanya record non-Hadir yang disimpan ke database

### Implementasi Database
- Tabel `presensi` **hanya menyimpan status non-Hadir** (S/I/A)
- Siswa tanpa record pada suatu tanggal = Hadir
- Menghitung hadir: `total siswa kelas − COUNT(presensi WHERE tanggal = hari ini)`

---

## 8. Penilaian — Kolom Dinamis (Final)

### Prinsip Utama
- **Tidak ada jenis penilaian hardcoded** — tidak ada UH/PTS/PAS bawaan
- Guru bebas membuat kolom penilaian apapun per mata pelajaran

### Contoh Kolom yang Bisa Dibuat Guru
`UH Bab 1` · `Menulis Cerpen` · `Hafalan Surah` · `Pidato` · `Tugas Kelompok` · `Proyek Akhir` · `UH Pecahan` · `Praktik IPA` — semua bebas

### Setiap Kolom Memiliki
- **Label** — nama bebas
- **Bobot** — untuk rata-rata tertimbang (default: 1.0)
- **Tanggal** — opsional
- **Urutan** — diatur guru

### UX Penilaian
- Tabel: baris = siswa, kolom = kolom penilaian yang dibuat guru
- Kolom terakhir: rata-rata tertimbang otomatis
- Input nilai langsung di sel (Tab/Enter untuk navigasi)
- Nilai kosong = belum diisi (tidak dihitung dalam rata-rata)

### Implementasi Database
- `penilaian_kolom` — definisi kolom per mata pelajaran
- `nilai` — nilai siswa per kolom (`siswa_id × kolom_id`)
- Rata-rata = `SUM(nilai × bobot) / SUM(bobot)`

---

## 9. Perangkat Ajar — Dua Kategori (Final)

### 🏫 Dokumen Resmi
- Dikelola oleh Admin BGY (Pak Choy)
- Disimpan di Supabase Storage
- Guru lihat daftar → unduh → simpan lokal → bisa akses offline
- Cache metadata di SQLite lokal (`perangkat_ajar_cache`)
- Dokumen: CP, ATP, Prota, Promes, RPM, Modul Ajar

### 👨‍🏫 Dokumen Saya
- Dikelola sendiri oleh guru
- Guru upload file dari perangkat lokal
- Disimpan di folder lokal aplikasi (`dokumen-saya/`)
- **Tidak pernah dikirim ke server**
- Guru bisa beri label/kategori sendiri
- Metadata tersimpan di SQLite (`dokumen_saya`)

### UX Perangkat Ajar
- Satu menu "Perangkat Ajar" di sidebar
- Di dalam halaman: dua tab — **Dokumen Resmi** | **Dokumen Saya**

---

## 10. Login & Autentikasi

- **Email + Password** via Supabase Auth
- Setelah login berhasil → cek lisensi di tabel `licenses`
- Lisensi tidak aktif → blokir akses dengan pesan
- Session disimpan di keychain sistem → login otomatis sesi berikutnya (tanpa internet)
- **Demo Mode**: tanpa login, data contoh in-memory, tidak tersimpan, banner "DEMO MODE" selalu tampil
- **Lupa Password**: reset via email Supabase

---

## 11. Backup & Restore

### Backup
- **Manual** dari Pengaturan → Backup & Restore
- Format: file enkripsi tunggal `.bgy`
- Isi: seluruh database SQLite + metadata Dokumen Saya
- File fisik Dokumen Saya **tidak termasuk** dalam backup (backup manual oleh guru)
- Lokasi simpan: dipilih guru (folder lokal / flashdisk / dll.)
- Tidak ada cloud sync

### Restore
1. Pilih file `.bgy`
2. Sistem validasi file
3. Sistem buat backup failsafe otomatis
4. Decrypt → timpa SQLite lokal
5. Aplikasi restart otomatis
6. Dashboard tampil dengan data hasil restore

---

## 12. Scope MVP — Yang Termasuk

- [x] Autentikasi (Login + Demo Mode)
- [x] Validasi lisensi
- [x] Data siswa dengan Custom Field
- [x] Presensi (default Hadir, toggle non-hadir)
- [x] Penilaian (kolom dinamis, tanpa jenis hardcoded)
- [x] Catatan perilaku siswa
- [x] Jadwal pelajaran
- [x] Rencana mengajar
- [x] Kalender akademik
- [x] Jurnal harian guru
- [x] Catatan guru
- [x] ToDo list
- [x] Perangkat Ajar — Dokumen Resmi (dari Admin)
- [x] Perangkat Ajar — Dokumen Saya (upload guru)
- [x] Dashboard dengan 6 widget
- [x] Laporan dasar (presensi, nilai, perilaku, jurnal)
- [x] Backup & Restore lokal
- [x] Pengaturan (profil, tahun ajaran, lisensi, versi)
- [x] Notifikasi pengumuman dari Admin
- [x] Cek versi & info update

## 12. Scope MVP — Yang TIDAK Termasuk

- [ ] Sinkronisasi cloud data siswa
- [ ] Kolaborasi multi-guru
- [ ] Aplikasi mobile
- [ ] Integrasi DAPODIK / e-rapor
- [ ] AI / otomasi
- [ ] Multi-bahasa
- [ ] Multi-kelas aktif simultan

---

## 13. Non-Functional Requirements Final

| Kriteria | Target |
|----------|--------|
| Buka aplikasi | < 3 detik |
| Navigasi antar menu | < 500ms |
| Query SQLite | < 200ms (kelas ≤ 40 siswa) |
| Ukuran instalasi | < 150 MB |
| OS minimum | Windows 10 64-bit / macOS 11 |
| RAM minimum | 4 GB |
| Storage minimum | 500 MB kosong |

---

---

## 14. Prioritas Dokumen

Urutan acuan implementasi:

1. **FrozenSummary.md** — keputusan final, tidak boleh diubah saat implementasi
2. **Design.md** — desain UI/UX dan komponen
3. **UserFlow.md** — alur pengguna dan navigasi
4. **Database.md** — skema dan relasi database
5. **PRD.md** — kebutuhan dan scope produk
6. **ProjectArchitecture.md** — struktur dan arsitektur teknis

Jika terdapat konflik antar dokumen, implementasi harus mengikuti dokumen dengan prioritas yang lebih tinggi.

---

*Dokumen ini adalah kontrak desain BGY Wali Kelas MVP. Tidak ada keputusan di sini yang boleh diubah unilateral saat implementasi. Semua perubahan harus melalui revisi dokumen eksplisit.*
