# Design Documentation
## Bantu Guru Yuk | Wali Kelas
**Versi Dokumen:** 1.0.0
**Tanggal:** Juli 2026
**Status:** Final Draft

> **Acuan Visual Detail:** Seluruh warna, tipografi, spacing, radius, shadow, dan komponen UI library mengacu pada `DESIGN_GUIDE.md`. Dokumen ini hanya berisi keputusan desain spesifik untuk aplikasi Wali Kelas.

---

## 1. Prinsip Desain

| Prinsip | Deskripsi |
|---------|-----------|
| **Sederhana** | Antarmuka minimal, fokus pada tugas guru sehari-hari |
| **Offline-ready** | Semua halaman berfungsi penuh tanpa koneksi internet |
| **Default Terisi** | Presensi default Hadir, form default siap isi — kurangi klik |
| **Dinamis** | Custom field siswa dan kolom penilaian dirender otomatis |
| **Konsisten** | Pola interaksi seragam di seluruh modul |

---

## 2. Layout Aplikasi

### 2.1 Struktur Halaman

```
┌──────────────────────────────────────────────────────────┐
│  HEADER (sticky, h-48px, bg-gradient teal)               │
├──────────────┬───────────────────────────────────────────┤
│   SIDEBAR    │           KONTEN UTAMA                    │
│   w-64 fixed │    (flex-1, overflow-auto)                │
│   left       │                                           │
│              │  +--------------------------------------+ │
│  ● Dashboard │  |  Action Bar (buttons, search)       | │
│  ▼ Siswa     │  +--------------------------------------+ │
│    Data Siswa│  +--------------------------------------+ │
│    Presensi  │  |  Table / Card Grid / Form            | │
│    Penilaian │  |                                      | │
│    Perilaku  │  |                                      | │
│  ▼ Aktivitas │  +--------------------------------------+ │
│    Jadwal    │  +--------------------------------------+ │
│    Rencana   │  |  Footer count / Pagination           | │
│    Kalender  │  +--------------------------------------+ │
│    Jurnal    │                                           │
│    Catatan   │                                           │
│    ToDo      │                                           │
│  ● Perangkat │                                           │
│    Ajar (2tab)│                                           │
│  ● Laporan   │                                           │
│  ● Pengaturan│                                           │
│              │                                           │
│  [Nama Guru] │                                           │
│  [Kelas Aktif]│                                          │
│  [Logout]    │                                           │
└──────────────┴───────────────────────────────────────────┘
```

### 2.2 Header

- Sticky di atas layar, tinggi `48px`
- Background `bg-gradient-bgy` (teal gradient: `#0ea5a0 → #0d7a8a → #2d6a7f`)
- Logo + brand name di kiri
- Dropdown pilih kelas aktif di tengah
- Nama guru + avatar di kanan (klik → menu dropdown: Profil | Logout)
- `z-index: 300`, shadow: `0 2px 10px rgba(0,0,0,.18)`

### 2.3 Sidebar

- Desktop: sticky, lebar `256px` (`w-64`), tampil selalu
- Background putih, border kanan
- Menu aktif: teal highlight dengan background `rgba(14,165,160,0.1)`
- Grup menu (Siswa, Aktivitas) collapsible
- Perangkat Ajar adalah satu item dengan dua tab di dalam halaman (bukan submenu)
- Bottom section: nama guru, kelas aktif, logout

### 2.4 Konten Utama

- Padding: `p-4 md:p-6`
- Background abu-abu kebiruan ( `var(--bg)` )
- Animasi masuk: slide-up 0.3s ease-out

---

## 3. Komponen UI

Komponen UI library (`Button`, `Input`, `Select`, `Modal`, `Alert`, `ConfirmDialog`, `LoadingSpinner`, dll.) mengikuti pola yang sudah didefinisikan di `DESIGN_GUIDE.md` — termasuk variant, size, color token, radius, shadow, dan state (hover/active/disabled).

### 3.1 Tabel Data

- Header sticky saat scroll, `bg-gray-50`, uppercase label (`text-xs`, tracking-wider)
- Baris bergantian putih dan `bg-gray-50` (striped)
- Baris bisa diklik untuk detail
- Kolom bisa diurutkan
- Pencarian/filter di action bar

### 3.2 Form Input

- Label di atas field (`text-sm`, `text-gray-700`, `font-medium`)
- Validasi inline (error muncul di bawah field)
- Tombol Simpan di bawah form
- Form dinamis untuk Custom Field siswa (tipe field menentukan kontrol render)

### 3.3 Status Badge

| Warna | Makna |
|-------|-------|
| Hijau (`#16a34a`) | Hadir / Selesai / Aktif / Positif |
| Kuning (`#d97706`) | Izin / Draft / Sedang berlangsung |
| Merah (`#dc2626`) | Alfa / Gagal / Negatif |
| Biru | Sakit / Info |

### 3.4 Dialog Konfirmasi

- Modal overlay dengan backdrop blur
- Icon warning (amber), title, message
- Cancel / Confirm buttons
- Untuk penghapusan: tombol konfirmasi merah (danger variant)

---

## 4. Desain Halaman Utama

### 4.1 Dashboard

6 widget dalam grid `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`:

| Jadwal Hari Ini | Rencana Mengajar Hari Ini | ToDo |
| Pengumuman BGY | Statistik Singkat | Notifikasi Versi |

Setiap widget: card putih (`bg-white`, `rounded-xl`, `shadow`), judul di atas, konten di tengah, klik → navigasi.

### 4.2 Data Siswa

- Daftar siswa dalam tabel dengan kolom default + custom field
- Tombol aksi: Tambah, Import CSV, Kelola Field
- Klik baris → Detail Siswa
- Form tambah/edit: dirender dinamis dari definisi field

### 4.3 Presensi

- Tabel siswa dengan kolom: No, Nama, Status (toggle)
- Status default: semua Hadir
- Klik baris → toggle: Hadir → Sakit → Izin → Alfa → Hadir
- Ringkasan real-time di atas tabel

### 4.4 Penilaian

- Dropdown pilih mata pelajaran
- Tabel: baris = siswa, kolom = kolom penilaian yang dibuat guru
- Kolom terakhir = rata-rata tertimbang (read-only)
- Input nilai langsung di sel (Tab/Enter navigasi)
- Kosong = belum diisi

### 4.5 Perangkat Ajar

- Tab bar: Dokumen Resmi | Dokumen Saya
- Dokumen Resmi: daftar dari Supabase/SQLite cache, unduh untuk offline
- Dokumen Saya: daftar file lokal, upload dari perangkat

---

## 5. Pola Interaksi

| Aksi | Perilaku |
|------|----------|
| Simpan data | Simpan ke SQLite lokal, feedback alert/notifikasi |
| Hapus data | ConfirmDialog dulu, soft delete |
| Navigasi | Sidebar → halaman baru; tidak ada nested routing dalam |
| Toggle centang (Todo) | Langsung update status, tanpa tombol simpan |
| Edit inline (Penilaian) | Simpan per sel (on blur) atau tombol Simpan Semua |

---

## 6. Warna & Tema

Mengadopsi sistem warna dari `DESIGN_GUIDE.md`:

| Peran | Warna |
|-------|-------|
| **Primary Brand** | Teal `#0ea5a0` |
| **Gradient** | `#0ea5a0 → #0d7a8a → #2d6a7f` |
| **Background Page** | Abu-abu kebiruan ( `var(--bg)` ) |
| **Card / Surface** | Putih ( `var(--card-bg)` ) |
| **Border** | `var(--border)` |
| **Success** | `#16a34a` |
| **Warning** | `#d97706` |
| **Danger** | `#dc2626` |

Tema terang sebagai default. Tema gelap opsional (post-MVP) — CSS variables sudah siap.

---

## 7. Tipografi

Mengadopsi sistem tipografi dari `DESIGN_GUIDE.md`:

| Elemen | Ukuran | Weight |
|--------|--------|--------|
| Header Brand | `0.95rem` | 800 |
| Sidebar Item | `0.875rem` | 600 |
| Dashboard Value | `1.5rem` | 700 |
| Table Header | `0.75rem` | 500, uppercase |
| Table Cell / Body | `0.875rem` | 400–500 |
| Button | `0.875rem` | 600 |
| Label | `0.875rem` | 500 |
| Small / Caption | `0.75rem` | 400 |

Font: `'Segoe UI', system-ui, sans-serif`. Monospace untuk nilai numerik di tabel penilaian.

---

## 8. Responsif & Window Size

- Minimal window size: 1024×768
- Optimal: 1366×768 (resolusi laptop standar)
- Tidak ada tampilan mobile (desktop-only untuk MVP)
- Breakpoint: `md: 768px`, `lg: 1024px`

---

## 9. Ikon

Menggunakan **Lucide React** untuk seluruh ikon antarmuka, sesuai standar `DESIGN_GUIDE.md`.

---

*Dokumen ini adalah referensi desain UI/UX Wali Kelas. Detail visual lengkap (warna, spacing, radius, shadow, komponen) ada di `DESIGN_GUIDE.md`. Seluruh keputusan desain mengacu pada FrozenSummary.md sebagai prioritas tertinggi.*
