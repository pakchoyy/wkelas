# User Flow Documentation
## Bantu Guru Yuk | Wali Kelas
**Versi Dokumen:** 1.1.0  
**Tanggal:** Juli 2026  
**Status:** Final Draft

---

## Konvensi Diagram

```
[Layar / Halaman]       → navigasi / aksi pengguna
(Proses sistem)         → proses internal, tidak terlihat pengguna
<Keputusan>             → kondisi bercabang
{Data / Input}          → form input atau data yang diproses
✓                       → sukses / valid
✗                       → gagal / tidak valid
```

---

## FLOW 0 — Buka Aplikasi

```
[Pengguna buka aplikasi]
         │
         ▼
(Cek session lokal)
         │
    ┌────┴────┐
   Ada       Tidak ada
    │              │
    ▼              ▼
(Validasi      [Layar Awal]
 token ke       ├── [Login]
 Supabase)      └── [Demo Mode]
    │
 ┌──┴──┐
✓ Valid  ✗ Expired
    │         │
    ▼         ▼
[Dashboard] [Layar Login]
```

---

## FLOW 1 — Login

```
[Layar Awal]
     │
     ├──► [Tombol: Login]
     │           │
     │           ▼
     │    {Email + Password}
     │           │
     │           ▼
     │    (Kirim ke Supabase Auth)
     │           │
     │      ┌────┴────┐
     │    ✓ Auth    ✗ Auth
     │      │           │
     │      ▼           ▼
     │  (Cek Lisensi) [Tampilkan error]
     │      │
     │   ┌──┴──┐
     │ ✓ Aktif  ✗ Tidak aktif
     │   │             │
     │   ▼             ▼
     │ (Buka        [Pesan: "Lisensi tidak aktif"]
     │  SQLite)
     │   │
     │   ▼
     │ [Dashboard]
     │
     └──► [Tombol: Demo Mode]
                 │
                 ▼
         (Load data contoh ke memory)
                 │
                 ▼
         [Dashboard — Mode Demo]
         (Banner "DEMO MODE" selalu tampil)
```

---

## FLOW 2 — Dashboard

Dashboard adalah layar utama setelah login. Menampilkan ringkasan harian yang langsung berguna.

```
[Dashboard]
     │
     ├── Widget: Jadwal Hari Ini
     │   └── Daftar pelajaran hari ini (dari tabel jadwal)
     │       [Klik item] → [Halaman Jadwal]
     │
     ├── Widget: Rencana Mengajar Hari Ini
     │   └── Rencana mengajar yang terjadwal hari ini
     │       [Klik item] → [Detail Rencana Mengajar]
     │       [Tombol: + Buat Rencana] → [Form Rencana Baru]
     │
     ├── Widget: ToDo
     │   ├── Todo aktif: 3 terdekat deadline / belum selesai
     │   ├── [Centang] → toggle selesai langsung dari dashboard
     │   └── [Lihat Semua] → [Halaman ToDo]
     │
     ├── Widget: Pengumuman BGY
     │   └── Pengumuman terbaru dari Supabase
     │       (cache jika offline)
     │       [Klik] → [Detail Pengumuman]
     │
     ├── Widget: Statistik Singkat
     │   ├── Total siswa di kelas aktif
     │   ├── Presensi hari ini: H / S / I / A
     │   ├── Rata-rata kehadiran bulan ini
     │   └── [Tombol: Isi Presensi] → [Halaman Presensi]
     │
     └── Widget: Notifikasi Versi
         └── Tampil jika ada versi baru tersedia (online)
             [Klik] → [Pengaturan → Versi & Update]
```

**Langkah:**
1. Dashboard tampil otomatis setelah login
2. Sistem ambil data jadwal hari ini, rencana mengajar hari ini, todo aktif dari SQLite
3. Statistik presensi dihitung: total siswa − jumlah record presensi hari ini = hadir
4. Sistem cek pengumuman dari Supabase (jika online) → tampil dari cache jika offline
5. Setiap widget bisa diklik untuk navigasi ke modul terkait

---

## FLOW 3 — Modul Siswa

### 3.1 Data Siswa

```
[Menu: Siswa → Data Siswa]
          │
          ▼
[Daftar Siswa]
(Kolom tampil: No. Absen | Nama | NIS | Jenis Kelamin + kolom custom aktif)
(Filter: pencarian nama / NIS)
          │
     ┌────┼────────────┬──────────────┐
     │    │            │              │
     ▼    ▼            ▼              ▼
[Tambah] [Klik Siswa] [Import CSV] [Kelola Field]
     │         │            │              │
     ▼         ▼            ▼              ▼
  {Form      [Detail      (Preview      [Halaman
   Dinamis]   Siswa]       data CSV)    Kelola
     │           │            │         Custom Field]
     │        ┌──┴──┐         ▼
     │      [Edit] [Hapus] (Simpan)
     │        │       │
     │        ▼      Ya
     │    {Form     (Soft delete)
     │     Edit}
     │        │
     └───────►▼
          [Daftar Siswa]
```

**Form Tambah/Edit Siswa (Dinamis):**

Form dirender berdasarkan definisi field aktif:
1. **Kolom default** (selalu tampil): Nama, NIS, Jenis Kelamin, No. Absen
2. **Custom Field** yang sudah didefinisikan guru: tampil sesuai urutan yang diatur

**Kelola Custom Field:**
1. Buka [Kelola Field] dari halaman Data Siswa
2. Lihat daftar field yang sudah ada
3. Tambah field baru: isi label, pilih tipe (teks/angka/tanggal/dropdown), set urutan
4. Edit label atau urutan field yang ada
5. Hapus field (dengan konfirmasi: "Hapus field ini akan menghapus semua nilainya")
6. Drag-and-drop untuk mengatur urutan tampil

**CRUD Data Siswa:**

*Tambah Siswa:*
1. Tekan **+ Tambah Siswa**
2. Isi form dinamis sesuai field yang terdefinisi
3. Tekan **Simpan**
4. Sistem simpan ke `siswa` (kolom default) + `siswa_field_values` (custom field)

*Edit Siswa:*
1. Klik nama siswa → halaman Detail Siswa
2. Tekan **Edit** → form dinamis terbuka dengan data terisi
3. Ubah dan simpan

*Hapus Siswa:*
1. Dari Detail Siswa, tekan **Hapus**
2. Konfirmasi → soft delete (`deleted_at`)

*Import CSV:*
1. Tekan **Import dari CSV**
2. Pilih file CSV
3. Sistem tampilkan mapping: kolom CSV → field terdefinisi
4. Guru cocokkan kolom
5. Preview → Konfirmasi → Simpan

---

### 3.2 Presensi

**Prinsip: Default Hadir. Guru hanya menandai yang tidak hadir.**

```
[Menu: Siswa → Presensi]
          │
          ▼
[Pilih Tanggal]
(Default: hari ini)
          │
          ▼
[Daftar Siswa]
(Semua siswa tampil dengan status default = HADIR)
(Siswa yang sudah pernah ditandai muncul statusnya)
          │
          ▼
[Guru klik siswa yang TIDAK hadir]
          │
     ┌────┴────────────────────────┐
     │   Toggle status siswa:      │
     │   HADIR → SAKIT → IZIN → ALFA → HADIR
     │   (klik berulang atau pilih dari popup)
     └─────────────────────────────┘
          │
          ▼
[Opsional: Tambah keterangan]
(Muncul otomatis jika status bukan Hadir)
          │
          ▼
[Tampil ringkasan real-time]
"Hadir: 33 | Sakit: 1 | Izin: 1 | Alfa: 0"
          │
          ▼
[Tombol: Simpan Presensi]
(Sistem hanya menyimpan siswa non-Hadir ke tabel presensi)
```

**Langkah Isi Presensi:**
1. Buka menu **Presensi**
2. Tanggal default = hari ini (bisa diganti)
3. Seluruh daftar siswa tampil — semua statusnya **Hadir** (default)
4. Siswa yang sudah pernah ditandai pada tanggal ini tampil dengan statusnya
5. Guru klik nama/baris siswa yang tidak hadir → toggle status: Hadir → Sakit → Izin → Alfa → Hadir
6. Atau guru klik tombol status langsung (S / I / A) di baris siswa
7. Keterangan opsional muncul otomatis untuk status non-Hadir
8. Ringkasan real-time tampil di bagian atas
9. Tekan **Simpan Presensi**
10. Sistem upsert record non-Hadir ke tabel `presensi` (record Hadir tidak disimpan)
11. Siswa yang sebelumnya ditandai tapi dikembalikan ke Hadir → recordnya dihapus

**Lihat Rekap Presensi:**
1. Pilih tab **Rekap**
2. Pilih rentang: mingguan / bulanan / custom
3. Sistem query: total siswa − jumlah record di `presensi` = jumlah hadir
4. Tabel rekap per siswa tampil

---

### 3.3 Penilaian

**Prinsip: Tidak ada jenis penilaian bawaan. Guru membuat kolom sendiri.**

```
[Menu: Siswa → Penilaian]
          │
          ▼
[Pilih Mata Pelajaran]
          │
          ▼
[Tampilan Tabel Nilai]
(Baris: siswa | Kolom: kolom penilaian yang sudah dibuat guru)
(Kolom terakhir: Rata-rata tertimbang)
          │
     ┌────┼────────────────────┐
     │    │                    │
     ▼    ▼                    ▼
[Input  [Kelola Kolom]    [Edit Nilai]
 Nilai   Penilaian]         Lama]
     │         │
     │         ▼
     │   [Daftar Kolom Penilaian]
     │    ├── Tambah Kolom Baru
     │    │   {label, bobot, tanggal}
     │    ├── Edit kolom (label, bobot)
     │    ├── Hapus kolom
     │    └── Drag-and-drop urutan
     │
     ▼
[Input nilai langsung di sel tabel]
(Enter/Tab untuk pindah sel)
          │
          ▼
(Simpan otomatis per sel atau tombol Simpan Semua)
          │
          ▼
[Rata-rata tertimbang dihitung otomatis]
```

**Langkah Kelola Kolom Penilaian:**
1. Tekan **Kelola Kolom**
2. Lihat daftar kolom yang sudah ada untuk mata pelajaran ini
3. Tambah kolom: isi label bebas (contoh: "UH Bab 3"), set bobot, set tanggal opsional
4. Edit atau hapus kolom yang ada
5. Atur urutan kolom

**Langkah Input Nilai:**
1. Pilih mata pelajaran
2. Tabel tampil: baris = siswa, kolom = kolom penilaian yang sudah dibuat
3. Klik sel → ketik nilai
4. Tab/Enter untuk pindah ke sel berikutnya
5. Nilai NULL (kosong) = belum diisi, tidak dihitung dalam rata-rata
6. Rata-rata tertimbang diperbarui otomatis setiap nilai diisi

---

### 3.4 Perilaku

```
[Menu: Siswa → Perilaku]
          │
          ▼
[Daftar Catatan Perilaku]
(Filter: per siswa / per kategori / per jenis)
          │
     ┌────┴────────┐
     │             │
     ▼             ▼
[+ Tambah]    [Klik Catatan]
     │               │
     ▼            [Edit/Hapus]
{Form:
 pilih siswa,
 jenis (positif/negatif),
 kategori, deskripsi,
 tindak lanjut}
     │
     ▼
(Simpan ke tabel perilaku)
```

---

## FLOW 4 — Modul Aktivitas Mengajar

### 4.1 Jadwal Pelajaran

```
[Menu: Aktivitas → Jadwal]
          │
          ▼
[Grid Jadwal Mingguan]
(Baris: jam ke | Kolom: Senin-Jumat)
          │
     ┌────┴────┐
     │         │
     ▼         ▼
[Klik slot] [Tab: List View]
kosong]
     │
     ▼
{Form: jam mulai, jam selesai,
 mata pelajaran, nama guru, ruang}
     │
     ▼
(Simpan ke tabel jadwal)
```

### 4.2 Rencana Mengajar

```
[Menu: Aktivitas → Rencana Mengajar]
          │
          ▼
[Daftar Rencana]
(Filter: per tanggal / mata pelajaran / status)
          │
     ┌────┴────┐
     │         │
     ▼         ▼
[+ Tambah]  [Klik Rencana]
     │             │
     ▼          [Edit/Hapus/
{Form:          Ubah Status]
 tanggal,
 mata pelajaran,
 topik,
 tujuan pembelajaran,
 kegiatan, media,
 penilaian, catatan}
     │
     ▼
(Simpan, status: draft/selesai)
```

### 4.3 Kalender Akademik

```
[Menu: Aktivitas → Kalender]
          │
          ▼
[Tampilan Kalender Bulanan]
(Event ditandai dengan warna per jenis)
          │
     ┌────┴────┐
     │         │
     ▼         ▼
[Klik         [+ Tambah Event]
 tanggal]          │
     │             ▼
[Event hari      {Form: judul,
 itu tampil]      tanggal mulai/selesai,
                  jenis, deskripsi}
```

### 4.4 Jurnal Harian

```
[Menu: Aktivitas → Jurnal Harian]
          │
          ▼
[Daftar Jurnal per Tanggal]
          │
     ┌────┴────┐
     │         │
     ▼         ▼
[+ Tambah]  [Klik Jurnal]
     │             │
     ▼         [Edit/Hapus]
{Form:
 tanggal, jam ke,
 mata pelajaran, materi,
 kegiatan, kendala,
 refleksi}
```

### 4.5 Catatan Guru

```
[Menu: Aktivitas → Catatan]
          │
          ▼
[Daftar Catatan]
(Pin di atas, filter per tag)
          │
     ┌────┴────┐
     │         │
     ▼         ▼
[+ Tambah]  [Klik Catatan]
     │             │
     ▼         [Edit/Pin/Hapus]
{Form: judul, isi, tag, warna}
```

### 4.6 ToDo

```
[Menu: Aktivitas → ToDo]
          │
          ▼
[Daftar Todo]
(Filter: belum/selesai | Sort: deadline/prioritas)
          │
     ┌────┴────────────────┐
     │                     │
     ▼                     ▼
[+ Tambah]            [Klik Centang]
     │                 (toggle selesai)
     ▼
{Form: judul, deskripsi,
 prioritas, deadline}
```

---

## FLOW 5 — Modul Perangkat Ajar

Perangkat ajar dibagi menjadi dua tab terpisah.

```
[Menu: Perangkat Ajar]
          │
     ┌────┴──────────────────┐
     │                       │
     ▼                       ▼
[Tab: 🏫 Dokumen Resmi]  [Tab: 👨‍🏫 Dokumen Saya]
```

### 5.1 Dokumen Resmi

```
[Tab: Dokumen Resmi]
          │
          ▼
<Cek koneksi internet>
     │              │
Online           Offline
     │              │
(Ambil daftar    (Tampilkan
 dari Supabase)   dari cache lokal)
     │              │
     └──────────────┘
          │
          ▼
[Daftar Dokumen]
(Filter: jenis / jenjang / mata pelajaran / fase)
          │
          ▼
[Klik Dokumen]
     │
     ├─ Sudah diunduh → [Buka file lokal]
     │
     └─ Belum diunduh
              │
         <Online?>
          │      │
         Ya     Tidak
          │      │
     (Unduh   [Pesan: "Perlu
      file)    koneksi untuk unduh"]
          │
          ▼
     (Simpan ke lokal,
      update cache)
          │
          ▼
     [Buka file]
```

### 5.2 Dokumen Saya

```
[Tab: Dokumen Saya]
          │
          ▼
[Daftar Dokumen Saya]
(Filter: kategori)
          │
     ┌────┴──────────────┐
     │                   │
     ▼                   ▼
[+ Upload Dokumen]   [Klik Dokumen]
     │                     │
     ▼                ┌────┴────┐
(Dialog pilih        [Buka]   [Edit/Hapus]
 file dari lokal)     │
     │             (Buka file dengan
     ▼              aplikasi sistem)
{Form:
 judul, kategori,
 deskripsi (opsional)}
     │
     ▼
(Salin file ke folder
 dokumen-saya/ lokal)
     │
     ▼
(Simpan metadata ke
 tabel dokumen_saya)
     │
     ▼
[Dokumen tampil di daftar]
```

**Catatan:** Dokumen Saya tidak pernah dikirim ke server. Tersimpan sepenuhnya di perangkat guru.

---

## FLOW 6 — Laporan

```
[Menu: Laporan]
          │
     ┌────┼──────────────────────┐
     │    │          │           │
     ▼    ▼          ▼           ▼
[Rekap  [Rekap   [Catatan    [Jurnal
 Presensi] Nilai]  Perilaku]   Mengajar]
     │    │
     ▼    ▼
{Pilih parameter:
 periode / siswa / mata pelajaran}
     │
     ▼
[Preview laporan]
     │
     ├── [Export PDF] → pilih lokasi simpan
     └── [Cetak] → dialog cetak sistem
```

---

## FLOW 7 — Pengaturan

```
[Menu: Pengaturan]
          │
     ┌────┼──────────────────────────────┐
     │    │          │          │        │
     ▼    ▼          ▼          ▼        ▼
[Profil [Tahun  [Backup &  [Lisensi] [Versi &
 Guru]   Ajaran] Restore]            Update]
```

### 7.1 Edit Profil Guru
1. Edit: nama, NIP, nama sekolah, mata pelajaran, foto
2. Simpan → update tabel `guru`

### 7.2 Ganti Tahun Ajaran / Kelas
1. Pilih tahun ajaran dan semester dari dropdown
2. Atau buat kelas baru: isi nama kelas, tingkat
3. Konfirmasi → set `kelas_aktif_id` di `pengaturan`

### 7.3 Lisensi
1. Tampil: tipe lisensi, status, masa berlaku
2. Tombol **Aktifkan Lisensi**: input kode lisensi manual

### 7.4 Versi & Update
1. Tampil: versi saat ini, info versi terbaru (jika online)
2. Jika ada update: tampil changelog dan tombol **Unduh Update**

---

## FLOW 8 — Backup

```
[Pengaturan → Backup & Restore]
          │
          ▼
[Halaman Backup & Restore]
(Tampil: backup terakhir + tanggalnya)
          │
     ┌────┴────────────┐
     │                 │
     ▼                 ▼
[Tombol: Backup]  [Tombol: Restore]
     │                 │
     ▼            (lihat Flow 9)
[Pilih Lokasi Simpan]
     │
     ▼
(Kumpulkan seluruh data SQLite)
     │
     ▼
(Generate file .bgy terenkripsi)
     │
     ▼
(Simpan ke lokasi dipilih)
     │
     ▼
[Notifikasi sukses]
"Backup berhasil: /Documents/bgy-backup-2025-09-01.bgy"
```

**Langkah Backup:**
1. Buka **Pengaturan → Backup & Restore**
2. Tekan **Buat Backup Sekarang**
3. Dialog folder sistem → pilih lokasi simpan
4. Sistem kumpulkan seluruh data SQLite (termasuk metadata Dokumen Saya, tapi bukan file fisiknya)
5. Enkripsi ke file `.bgy`
6. Notifikasi sukses

> **Saran:** Simpan file backup ke flashdisk atau folder cloud (Google Drive) secara manual.

---

## FLOW 9 — Restore

```
[Tombol: Restore dari File]
          │
          ▼
[Peringatan]
"Restore akan mengganti SELURUH data. Lanjutkan?"
          │
     ┌────┴────┐
  Batal       Ya
     │          │
     ▼          ▼
[Kembali]  [Pilih File .bgy]
                │
                ▼
         (Validasi file)
                │
           ┌────┴────┐
        ✓ Valid   ✗ Tidak valid
           │           │
           ▼           ▼
     (Backup otomatis [Pesan error]
      data sekarang
      sebagai failsafe)
           │
           ▼
     (Decrypt & tulis ke SQLite)
           │
           ▼
     [Notifikasi: "Restore berhasil"]
           │
           ▼
     (Aplikasi restart otomatis)
```

---

## FLOW 10 — Logout

```
[Klik nama/avatar guru di sidebar]
          │
          ▼
[Menu kecil: Profil | Keluar]
          │
          ▼ (Klik Keluar)
[Konfirmasi: "Yakin ingin keluar?"]
          │
     ┌────┴────┐
  Batal       Ya
     │          │
     ▼          ▼
[Tutup menu] (Hapus session dari keychain)
                 │
                 ▼
             (Tutup koneksi SQLite)
                 │
                 ▼
             [Layar Awal]
```

> **Catatan:** Data di SQLite tidak terhapus saat logout.

---

## FLOW 11 — Ganti Kelas Aktif

```
[Sidebar — nama kelas aktif]
          │
          ▼
[Dropdown: pilih kelas]
          │
     ┌────┴──────────┐
     │               │
     ▼               ▼
[Pilih kelas    [+ Buat Kelas Baru]
 yang ada]           │
     │            {Form: nama kelas,
     │             tingkat, tahun ajaran,
     │             semester}
     │               │
     └───────────────┘
                 │
                 ▼
         [Seluruh modul reload
          dengan data kelas baru]
```

---

## Ringkasan Navigasi Utama (Sidebar Final)

```
┌─────────────────────────────────────────────────────────┐
│                    BGY Wali Kelas                        │
├──────────────┬──────────────────────────────────────────┤
│   SIDEBAR    │              KONTEN UTAMA                 │
│              │                                           │
│ ● Dashboard  │  [Berubah sesuai menu yang dipilih]       │
│              │                                           │
│ ▼ Siswa      │                                           │
│   Data Siswa │                                           │
│   Presensi   │                                           │
│   Penilaian  │                                           │
│   Perilaku   │                                           │
│              │                                           │
│ ▼ Aktivitas  │                                           │
│   Jadwal     │                                           │
│   Rencana    │                                           │
│   Kalender   │                                           │
│   Jurnal     │                                           │
│   Catatan    │                                           │
│   ToDo       │                                           │
│              │                                           │
│ ▼ Perangkat  │                                           │
│   Ajar       │                                           │
│   (2 tab:    │                                           │
│   Resmi /    │                                           │
│   Saya)      │                                           │
│              │                                           │
│ ● Laporan    │                                           │
│              │                                           │
│ ● Pengaturan │                                           │
│              │                                           │
├──────────────┤                                           │
│ [Nama Guru]  │                                           │
│ [Kelas Aktif]│                                           │
│ [Logout]     │                                           │
└──────────────┴──────────────────────────────────────────┘
```

**Perubahan dari versi sebelumnya:** Submenu Perangkat Ajar disederhanakan menjadi satu item dengan dua tab di dalam halaman (Dokumen Resmi & Dokumen Saya).

---

## Ringkasan CRUD per Modul

| Modul | Create | Read | Update | Delete |
|-------|--------|------|--------|--------|
| Data Siswa | ✓ | ✓ | ✓ | Soft delete |
| Custom Field | ✓ | ✓ | ✓ | ✓ (dengan konfirmasi) |
| Presensi | Toggle saja | ✓ | Toggle | Auto (jika Hadir) |
| Kolom Penilaian | ✓ | ✓ | ✓ | ✓ |
| Nilai | ✓ | ✓ | ✓ | ✓ |
| Perilaku | ✓ | ✓ | ✓ | ✓ |
| Jadwal | ✓ | ✓ | ✓ | ✓ |
| Rencana Mengajar | ✓ | ✓ | ✓ | ✓ |
| Kalender Akademik | ✓ | ✓ | ✓ | ✓ |
| Jurnal Harian | ✓ | ✓ | ✓ | ✓ |
| Catatan Guru | ✓ | ✓ | ✓ | Soft delete |
| ToDo | ✓ | ✓ | ✓ | Soft delete |
| Perangkat Ajar Resmi | Admin only | ✓ | Admin only | Admin only |
| Dokumen Saya | ✓ (upload) | ✓ | ✓ | Soft delete |
| Laporan | — | ✓ | — | — |
| Pengaturan | — | ✓ | ✓ | — |

---

*Dokumen ini adalah referensi flow produk. Perubahan UX harus diperbarui di sini sebelum implementasi.*
