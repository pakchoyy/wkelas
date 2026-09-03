# Pemeriksaan dan perapian tampilan — 3 September 2026

## Cakupan

Dashboard, header, sidebar, navigasi ponsel, dan aturan tampilan bersama. Pemeriksaan mencakup kondisi kosong, berisi data, memuat, gagal membaca data, dan pemulihan melalui Coba lagi. Halaman modul lainnya belum diaudit; pintasan Tambah siswa diperiksa sampai dialog terbuka.

Stack aktual: React, Vite, Tailwind CSS, Lucide, dan variabel CSS. Acuan proyek: `docs/Design.md` dan `docs/DESIGN_GUIDE.md`. Identitas teal, kartu putih, ukuran sidebar, serta pola navigasi yang sudah ada dipertahankan. Tidak ditemukan AGENTS.md di pencarian workspace.

| Domain | Bukti yang diperiksa | Hasil |
| --- | --- | --- |
| Accessibility | Kontrol dashboard, tautan, skip link, Escape pada drawer, focus return, label prioritas, reduced motion | Perbaikan diterapkan; screen reader belum diverifikasi |
| Layout | Dashboard dan navigasi di lebar 320, 390, 768, 1024, 1280, 1440 px; nama panjang; bagian bawah halaman | Tidak ada overflow horizontal dalam skenario uji |
| Writing | Label aksi, kondisi kosong, loading, error, label hari libur, prioritas | Label dan arahan diperjelas |
| Typography | Ukuran teks navigasi, pembungkusan nama, heading, angka statistik | Label ponsel minimal 12 px; angka tabular; teks panjang membungkus |
| Colors | Warna tombol utama, menu aktif, teks sekunder dan titik gradien header | Pasangan yang diukur memenuhi 4,5:1 |
| UI | Kartu statistik, ikon, panel, indikator aktif, hover/press dan reduced motion | Tampilan kartu konsisten dan warna kategori dibatasi pada status |

## Temuan dan perbaikan

Lokasi merujuk file setelah perbaikan. Semua baris di bawah sudah ditangani.

| Severity | Domain | Location | Before | After | Why |
| --- | --- | --- | --- | --- | --- |
| HIGH | Colors | `src/renderer/components/Sidebar.tsx:33`; `src/renderer/globals.css:10`; `src/renderer/pages/dashboard/Dashboard.tsx:53` | Menu teal terang dan tulisan putih pada tombol emerald kurang kontras | Menu menggunakan aksen #0f766e; tombol memakai aksen yang sama | Menu naik dari 2,91:1 menjadi 5,25:1; tombol naik dari 2,54:1 menjadi 5,47:1 |
| HIGH | Accessibility | `src/renderer/pages/dashboard/Dashboard.tsx:73` | Prioritas tugas hanya dibedakan titik berwarna | Label Prioritas tinggi / Prioritas normal | Makna status tetap terbaca tanpa membedakan warna |
| HIGH | Writing | `src/renderer/pages/dashboard/Dashboard.tsx:39` | Nilai nol dan pesan tidak ada tugas dapat tampil saat data belum selesai dimuat | Placeholder angka, pesan memuat, status error, tombol Coba lagi | Mencegah data yang belum diketahui terbaca sebagai ringkasan yang sudah lengkap |
| MEDIUM | Layout | `src/renderer/globals.css:38`; `src/renderer/pages/dashboard/Dashboard.tsx:84` | Lima statistik menyisakan satu kartu sempit di layar kecil; judul dan aksi panel berdesakan | Kartu terakhir memenuhi baris pada layar kecil; panel membungkus; kolom mengikuti ruang konten | Hierarki tetap jelas di ponsel dan tablet |
| MEDIUM | Accessibility | `src/renderer/components/Layout.tsx:38`; `src/renderer/globals.css:28` | Tidak ada pintasan melewati navigasi berulang | Skip link memindahkan fokus ke main; indikator fokus yang terlihat | Pengguna keyboard dapat langsung menuju konten |
| MEDIUM | Accessibility | `src/renderer/pages/dashboard/Dashboard.tsx:53`; `src/renderer/pages/dashboard/Dashboard.tsx:86` | Navigasi dashboard menggunakan tombol | Tautan router dengan tujuan dan state yang sesuai | Mendukung semantik tautan dan membuka tujuan di tab lain |
| MEDIUM | Typography | `src/renderer/components/Header.tsx:37`; `src/renderer/pages/dashboard/Dashboard.tsx:49` | Nama bisa terpotong; angka statistik tanpa angka tabular; navigasi ponsel 10 px | Nama membungkus, angka tabular, navigasi ponsel 12 px | Menjaga keterbacaan dan kestabilan ukuran angka |
| LOW | UI | `src/renderer/pages/dashboard/Dashboard.tsx:83` | Semua statistik menggunakan warna kategori berbeda | Statistik netral, warna dipakai pada ringkasan status | Mengurangi persaingan visual dengan aksi utama |
| LOW | Writing | `src/renderer/pages/dashboard/Dashboard.tsx:64` | Daftar ringkas tidak menyebut jumlah sisa; tombol hari libur memakai nama hari libur | Tautan jumlah kegiatan/tugas lainnya; Lihat kalender akademik | Tujuan aksi dan konten lanjutan lebih jelas |

## Verifikasi

Lulus:

- `npm run build`: berhasil. Peringatan ukuran bundle lebih dari 500 kB tetap ada.
- Microsoft Edge headless, konteks browser terpisah dengan data sintetis: kondisi kosong dan berisi data; screenshot desktop dan ponsel diperiksa.
- Resize ke 320, 390, 768, 1024, 1280, 1440 px: scrollWidth main tidak melebihi clientWidth.
- Nama wali kelas sangat panjang tanpa spasi di 320 px: tidak menyebabkan overflow horizontal.
- Skip link → Enter: fokus berpindah ke main; indikator fokus solid terlihat melalui computed style.
- Buka menu → Escape: drawer menutup dan fokus kembali ke Buka menu.
- Tambah siswa: dialog terbuka dari pintasan dashboard.
- Pembacaan data ditahan: lima statistik menampilkan placeholder, bukan nol.
- Pembacaan data dibuat gagal → pulihkan sumber → Coba lagi: dashboard berhasil dimuat kembali.
- Reduced motion: animasi masuk bernilai none.
- RTL di 320 px: tidak ada overflow horizontal; ini bukan verifikasi lokalisasi lengkap.
- Tidak ada browser runtime error pada skenario tersebut.
- Kontras terukur: tombol 5,47:1; menu aktif 5,25:1; teks sekunder #64748b pada putih 4,76:1. Putih pada titik warna gradien header: 5,47:1–7,06:1. Pengukuran gradien ini memakai titik warnanya, bukan audit setiap piksel.

Not verified / batasan:

- `node node_modules/typescript/bin/tsc --noEmit` berhenti pada konfigurasi proyek: `baseUrl` sudah dihapus di TypeScript yang terpasang, dan paths masih memakai jalur nonrelatif. Ini bukan hasil pemeriksaan tipe kode yang tuntas.
- Zoom browser 200%, pembaca layar, forced-colors, serta audit aksesibilitas otomatis lengkap belum dijalankan.
- Tidak ada tema gelap pada cakupan ini; halaman modul lain, mode demo, dan seluruh kombinasi kalender belum diuji.
- Pengujian memakai penyimpanan browser terpisah, bukan data pengguna.

## Verdict

Approve untuk cakupan dan skenario yang telah diperiksa. Tidak ada temuan HIGH yang masih terbuka pada cakupan tersebut; ini bukan persetujuan aksesibilitas menyeluruh atau audit seluruh aplikasi.
