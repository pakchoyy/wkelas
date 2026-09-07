// Kalender Pendidikan Jatim 2026/2027 (Dispendik Provinsi Jawa Timur).
// Ditranskrip dari dokumen "Hari Efektif Sekolah..." untuk TKLB/SDLB/SMPLB/SMA/SMALB/SMK.
// Berlaku untuk sekolah 5 hari maupun 6 hari belajar; LU (Minggu) dan KE (Sabtu)
// sudah ditangani otomatis lewat pengaturan hari sekolah, jadi tidak diisi di sini.
//
// Jenis:
// - libur_nasional: LHB (termasuk yang jatuh di akhir pekan, penting untuk 6 hari)
// - libur_sekolah: CB, LS1, LS2, LHR
// - kts: Kegiatan Tengah Semester (1-3 Okt 2026) — anak tetap masuk (ujian),
//   presensi/jurnal tetap jalan, tetapi TIDAK dihitung hari efektif.
// - kpp: Kegiatan Permulaan Puasa (8-10 Feb 2027) — perlakuan sama seperti kts.
//
// Target hitungan dokumen: 5 hari -> ganjil 115, genap 102; 6 hari -> ganjil 136, genap 123.
export const JATIM_SOURCE = 'Kalender Pendidikan Jatim 2026/2027 (Dispendik Jatim)'

export type JatimSeed = { mulai: string; selesai?: string; judul: string; jenis: 'libur_nasional' | 'libur_sekolah' | 'kts' | 'kpp' | 'pengganti' }

export const JATIM_PERIOD = { s1Mulai: '2026-07-13', s1Akhir: '2026-12-31', s2Mulai: '2027-01-01', s2Akhir: '2027-06-30' }
export const JATIM_EXPECTED = { 5: { ganjil: 115, genap: 102 }, 6: { ganjil: 136, genap: 123 } }

export const JATIM_SEEDS: JatimSeed[] = [
  // --- Libur Hari Besar (LHB) ---
  { mulai: '2026-08-17', judul: 'HUT Republik Indonesia', jenis: 'libur_nasional' },
  { mulai: '2026-08-25', judul: 'Maulid Nabi Muhammad SAW', jenis: 'libur_nasional' },
  { mulai: '2026-12-25', judul: 'Hari Raya Natal', jenis: 'libur_nasional' },
  { mulai: '2027-01-01', judul: 'Tahun Baru Masehi', jenis: 'libur_nasional' },
  { mulai: '2027-01-05', judul: "Isra Mikraj Nabi Muhammad SAW", jenis: 'libur_nasional' },
  { mulai: '2027-02-06', judul: 'Tahun Baru Imlek 2578', jenis: 'libur_nasional' },
  { mulai: '2027-03-09', judul: 'Hari Raya Nyepi 1949', jenis: 'libur_nasional' },
  { mulai: '2027-03-10', selesai: '2027-03-11', judul: 'Hari Raya Idul Fitri 1448 H', jenis: 'libur_nasional' },
  { mulai: '2027-03-26', judul: 'Wafat Isa Almasih', jenis: 'libur_nasional' },
  { mulai: '2027-03-28', judul: 'Hari Paskah', jenis: 'libur_nasional' },
  { mulai: '2027-05-01', judul: 'Hari Buruh Internasional', jenis: 'libur_nasional' },
  { mulai: '2027-05-06', judul: 'Kenaikan Isa Almasih', jenis: 'libur_nasional' },
  { mulai: '2027-05-17', judul: 'Hari Raya Idul Adha', jenis: 'libur_nasional' },
  { mulai: '2027-05-20', judul: 'Hari Raya Waisak 2571', jenis: 'libur_nasional' },
  { mulai: '2027-06-01', judul: 'Hari Lahir Pancasila', jenis: 'libur_nasional' },
  { mulai: '2027-06-06', judul: 'Tahun Baru Hijriyah 1449', jenis: 'libur_nasional' },
  // 16 Jun 2027: sel LHB di grid Jatim, tetapi tidak ada di daftar Libur Hari Besar.
  // Disertakan agar hitungan genap pas 102/123; mohon verifikasi ke Dispendik.
  { mulai: '2027-06-16', judul: 'Libur Hari Besar', jenis: 'libur_nasional' },
  // --- Cuti bersama ---
  { mulai: '2026-12-24', judul: 'Cuti bersama · Hari Raya Natal', jenis: 'libur_sekolah' },
  // --- Libur semester & sekitar hari raya ---
  { mulai: '2026-12-26', selesai: '2027-01-02', judul: 'Libur Semester 1', jenis: 'libur_sekolah' },
  { mulai: '2027-06-21', selesai: '2027-07-10', judul: 'Libur Semester 2', jenis: 'libur_sekolah' },
  { mulai: '2027-03-08', selesai: '2027-03-17', judul: 'Libur Sekitar Hari Raya', jenis: 'libur_sekolah' },
  // --- Kegiatan non-efektif (masuk, tetapi bukan hari efektif belajar) ---
  { mulai: '2026-10-01', selesai: '2026-10-03', judul: 'Kegiatan Tengah Semester', jenis: 'kts' },
  { mulai: '2027-02-08', selesai: '2027-02-10', judul: 'Kegiatan Permulaan Puasa', jenis: 'kpp' },
  // --- Sabtu efektif (dokumen menghitung Sabtu ini sebagai hari efektif
  // untuk sekolah 5 hari; tanpa ini ganjil 5-hari jadi 114, bukan 115) ---
  { mulai: '2026-10-31', judul: 'Hari Efektif Fakultatif', jenis: 'pengganti' },
]
