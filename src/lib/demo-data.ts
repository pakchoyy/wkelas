import { activateDemoDb, activateMainDb } from './db'

const iso = (d: Date) => d.toISOString()
const now = iso(new Date())

function dateOffset(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

const NAMA_SISWA: Array<[string, string]> = [
  ['Ahmad Fauzi', 'L'],
  ['Anisa Rahma', 'P'],
  ['Bagas Pratama', 'L'],
  ['Citra Ayu Lestari', 'P'],
  ['Dewi Anggraini', 'P'],
  ['Eko Prasetyo', 'L'],
  ['Fajar Nugroho', 'L'],
  ['Fitri Handayani', 'P'],
  ['Gilang Ramadhan', 'L'],
  ['Intan Permatasari', 'P'],
  ['Joko Susilo', 'L'],
  ['Kartika Sari', 'P'],
  ['Lukman Hakim', 'L'],
  ['Maya Puspita', 'P'],
  ['Nanda Saputra', 'L'],
  ['Putri Amelia', 'P'],
  ['Rizky Ananda', 'L'],
  ['Siti Nurhaliza', 'P'],
  ['Yoga Saputra', 'L'],
  ['Zahra Aulia', 'P'],
]

const ALAMAT = ['Jl. Merdeka No. 12', 'Jl. Sudirman No. 8', 'Perum Griya Asri Blok C5', 'Jl. Melati No. 3', 'Kp. Sukamaju RT 03', 'Jl. Kenanga No. 21', 'Perum Bumi Indah Blok A2', 'Jl. Ahmad Yani No. 45', 'Kp. Cibiru RT 02', 'Jl. Anggrek No. 17', 'Perum Taman Sari Blok D1', 'Jl. Pahlawan No. 9', 'Kp. Babakan RT 05', 'Jl. Diponegoro No. 33', 'Perum Puri Mas Blok B7', 'Jl. Cempaka No. 6', 'Kp. Kebon Jeruk RT 01', 'Jl. Gatot Subroto No. 28', 'Perum Griya Ceria Blok E3', 'Jl. Mawar No. 14']
const ORANG_TUA = ['Bapak Hadi', 'Ibu Sri Wahyuni', 'Bapak Dedi', 'Ibu Ratna Dewi', 'Bapak Agus', 'Ibu Lilis', 'Bapak Bambang', 'Ibu Yanti', 'Bapak Surya', 'Ibu Nining', 'Bapak Tono', 'Ibu Rina', 'Bapak Junaedi', 'Ibu Farida', 'Bapak Ujang', 'Ibu Aisyah', 'Bapak Hendra', 'Ibu Nurjanah', 'Bapak Rudi', 'Ibu Dewi Sari']
const NO_HP = ['0812-3456-7801', '0813-9876-5402', '0857-2345-6712', '0812-7766-5534', '0838-1122-3345', '0819-4455-6678', '0856-9900-1122', '0812-2233-4456', '0878-5566-7789', '0813-8899-0011', '0852-3344-5567', '0811-6677-8899', '0831-2233-4455', '0812-7788-9900', '0857-1122-3344', '0819-3344-5566', '0838-9900-1122', '0812-5566-7788', '0856-4455-6677', '0813-1122-3344']

function nilaiFor(siswaId: number, kolomId: number): number {
  return 65 + ((siswaId * 7 + kolomId * 3) % 36)
}

export async function seedDemoData(): Promise<void> {
  const db = activateDemoDb()

  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) {
      await table.clear()
    }

    await db.guru.add({ id: 1, supabase_uid: 'demo', nama: 'Budi Santoso, S.Pd.', email: 'demo@bgy.app', nip: '198501012010011001', nama_sekolah: 'SMP Negeri 1 Nusantara', mata_pelajaran: 'Matematika', tahun_ajaran_aktif: '2025/2026', semester_aktif: 1, created_at: now, updated_at: now })

    await db.kelas.add({ id: 1, nama_kelas: '7A', tingkat: '7', tahun_ajaran: '2025/2026', semester: 1, is_aktif: 1, guru_id: 1, created_at: now, updated_at: now })

    const siswaIds = NAMA_SISWA.map((_, i) => i + 1)
    for (const [i, [nama, jk]] of NAMA_SISWA.entries()) {
      await db.siswa.add({ id: i + 1, kelas_id: 1, nama, nis: `2025${String(i + 1).padStart(3, '0')}`, jenis_kelamin: jk, no_absen: i + 1, created_at: now, updated_at: now })
    }

    const fields = [
      { id: 1, nama_field: 'Alamat', slug: 'alamat', tipe: 'teks', wajib: 0, urutan: 1 },
      { id: 2, nama_field: 'Nama Orang Tua', slug: 'nama_orang_tua', tipe: 'teks', wajib: 1, urutan: 2 },
      { id: 3, nama_field: 'No. HP Orang Tua', slug: 'no_hp_orang_tua', tipe: 'teks', wajib: 0, urutan: 3 },
    ]
    for (const f of fields) {
      await db.siswa_field_definitions.add({ ...f, kelas_id: 1, pilihan: null, created_at: now, updated_at: now })
    }

    for (const [i, siswaId] of siswaIds.entries()) {
      await db.siswa_field_values.add({ siswa_id: siswaId, field_id: 1, nilai: ALAMAT[i], updated_at: now })
      await db.siswa_field_values.add({ siswa_id: siswaId, field_id: 2, nilai: ORANG_TUA[i], updated_at: now })
      await db.siswa_field_values.add({ siswa_id: siswaId, field_id: 3, nilai: NO_HP[i], updated_at: now })
    }

    const mapel = [
      { id: 1, nama: 'Matematika', kode: 'MTK', urutan: 1 },
      { id: 2, nama: 'Bahasa Indonesia', kode: 'BIN', urutan: 2 },
      { id: 3, nama: 'Bahasa Inggris', kode: 'BIG', urutan: 3 },
      { id: 4, nama: 'IPA', kode: 'IPA', urutan: 4 },
      { id: 5, nama: 'IPS', kode: 'IPS', urutan: 5 },
      { id: 6, nama: 'PPKn', kode: 'PPKN', urutan: 6 },
      { id: 7, nama: 'Seni Budaya', kode: 'SBK', urutan: 7 },
      { id: 8, nama: 'PJOK', kode: 'PJOK', urutan: 8 },
    ]
    for (const m of mapel) {
      await db.mata_pelajaran.add({ ...m, kelas_id: 1, created_at: now })
    }

    const kolom = [
      { id: 1, label: 'PH 1', bobot: 1, urutan: 1 },
      { id: 2, label: 'PH 2', bobot: 1, urutan: 2 },
      { id: 3, label: 'PTS', bobot: 2, urutan: 3 },
      { id: 4, label: 'PAS', bobot: 3, urutan: 4 },
    ]
    for (const k of kolom) {
      await db.penilaian_kolom.add({ ...k, mata_pelajaran_id: 1, tanggal: null, catatan: null, created_at: now, updated_at: now })
    }

    for (const siswaId of siswaIds) {
      for (const k of kolom) {
        await db.nilai.add({ siswa_id: siswaId, kolom_id: k.id, nilai: nilaiFor(siswaId, k.id), catatan: null, created_at: now, updated_at: now })
      }
    }

    const presensiHari = [dateOffset(-4), dateOffset(-2), dateOffset(-1), dateOffset(0)]
    const presensiKhusus: Record<string, [number, string, string]> = {
      [`3-${dateOffset(-4)}`]: [3, 'S', 'Demam'],
      [`8-${dateOffset(-2)}`]: [8, 'I', 'Acara keluarga'],
      [`12-${dateOffset(-1)}`]: [12, 'A', ''],
      [`19-${dateOffset(-4)}`]: [19, 'S', 'Sakit perut'],
      [`15-${dateOffset(0)}`]: [15, 'I', 'Izin kegiatan pramuka'],
      [`6-${dateOffset(0)}`]: [6, 'S', 'Sakit gigi'],
    }
    for (const tgl of presensiHari) {
      for (const siswaId of siswaIds) {
        const khusus = presensiKhusus[`${siswaId}-${tgl}`]
        const status = khusus ? khusus[1] : 'H'
        const keterangan = khusus ? khusus[2] : undefined
        if (status === 'H') continue
        await db.presensi.add({ siswa_id: siswaId, kelas_id: 1, tanggal: tgl, status, keterangan, created_at: now, updated_at: now })
      }
    }

    const perilaku = [
      { siswa_id: 1, tanggal: dateOffset(-6), jenis: 'positif', kategori: 'Prestasi', deskripsi: 'Juara 1 lomba matematika tingkat kabupaten', tindak_lanjut: 'Diberikan apresiasi di kelas' },
      { siswa_id: 3, tanggal: dateOffset(-3), jenis: 'positif', kategori: 'Kerjasama', deskripsi: 'Membantu teman yang kesulitan memahami materi', tindak_lanjut: null },
      { siswa_id: 7, tanggal: dateOffset(-1), jenis: 'positif', kategori: 'Kepemimpinan', deskripsi: 'Memimpin diskusi kelompok dengan baik', tindak_lanjut: null },
      { siswa_id: 12, tanggal: dateOffset(-5), jenis: 'negatif', kategori: 'Kedisiplinan', deskripsi: 'Terlambat masuk kelas tiga kali dalam seminggu', tindak_lanjut: 'Pemanggilan orang tua' },
      { siswa_id: 15, tanggal: dateOffset(-2), jenis: 'negatif', kategori: 'Kedisiplinan', deskripsi: 'Berbicara saat pelajaran berlangsung', tindak_lanjut: 'Teguran lisan' },
      { siswa_id: 19, tanggal: dateOffset(0), jenis: 'negatif', kategori: 'Kedisiplinan', deskripsi: 'Tidak mengumpulkan tugas', tindak_lanjut: 'Bimbingan lanjutan' },
    ]
    for (const p of perilaku) {
      await db.perilaku.add({ ...p, created_at: now, updated_at: now })
    }

    const jadwal: Array<[number, number, string, string, number, string, string]> = [
      [1, 1, '07:00', '08:20', 1, 'Budi Santoso, S.Pd.', 'R. 7A'],
      [1, 2, '08:20', '09:40', 1, 'Budi Santoso, S.Pd.', 'R. 7A'],
      [1, 3, '10:00', '11:20', 2, 'Sri Lestari, M.Pd.', 'R. 7A'],
      [1, 4, '11:20', '12:40', 2, 'Sri Lestari, M.Pd.', 'R. 7A'],
      [1, 5, '13:00', '14:20', 8, 'Asep Hidayat, S.Pd.', 'Lapangan'],
      [2, 1, '07:00', '08:20', 4, 'Dewi Murni, S.Si.', 'Lab IPA'],
      [2, 2, '08:20', '09:40', 4, 'Dewi Murni, S.Si.', 'Lab IPA'],
      [2, 3, '10:00', '11:20', 3, 'Rina Marlina, S.Pd.', 'R. 7A'],
      [2, 4, '11:20', '12:40', 3, 'Rina Marlina, S.Pd.', 'R. 7A'],
      [2, 5, '13:00', '14:20', 5, 'Tatang Suryana, S.Pd.', 'R. 7A'],
      [3, 1, '07:00', '08:20', 6, 'Neni Rosita, S.Pd.', 'R. 7A'],
      [3, 2, '08:20', '09:40', 1, 'Budi Santoso, S.Pd.', 'R. 7A'],
      [3, 3, '10:00', '11:20', 2, 'Sri Lestari, M.Pd.', 'R. 7A'],
      [3, 4, '11:20', '12:40', 4, 'Dewi Murni, S.Si.', 'Lab IPA'],
      [3, 5, '13:00', '14:20', 7, 'Euis Karlina, S.Pd.', 'R. Seni'],
      [4, 1, '07:00', '08:20', 1, 'Budi Santoso, S.Pd.', 'R. 7A'],
      [4, 2, '08:20', '09:40', 5, 'Tatang Suryana, S.Pd.', 'R. 7A'],
      [4, 3, '10:00', '11:20', 5, 'Tatang Suryana, S.Pd.', 'R. 7A'],
      [4, 4, '11:20', '12:40', 3, 'Rina Marlina, S.Pd.', 'R. 7A'],
      [4, 5, '13:00', '14:20', 8, 'Asep Hidayat, S.Pd.', 'Lapangan'],
      [5, 1, '07:00', '08:00', 6, 'Neni Rosita, S.Pd.', 'R. 7A'],
      [5, 2, '08:00', '09:00', 2, 'Sri Lestari, M.Pd.', 'R. 7A'],
      [5, 3, '09:00', '10:00', 7, 'Euis Karlina, S.Pd.', 'R. Seni'],
      [5, 4, '10:00', '11:00', 4, 'Dewi Murni, S.Si.', 'Lab IPA'],
    ]
    for (const [hari, jamKe, mulai, selesai, mapelId, guru, ruang] of jadwal) {
      await db.jadwal.add({ kelas_id: 1, hari, jam_ke: jamKe, jam_mulai: mulai, jam_selesai: selesai, mata_pelajaran_id: mapelId, nama_mapel_custom: null, nama_guru: guru, ruang, created_at: now, updated_at: now })
    }

    const kalender = [
      { tanggal_mulai: dateOffset(-20), tanggal_selesai: dateOffset(-16), judul: 'MPLS Peserta Didik Baru', jenis: 'kegiatan', deskripsi: 'Pengenalan lingkungan sekolah untuk kelas 7' },
      { tanggal_mulai: dateOffset(7), tanggal_selesai: dateOffset(11), judul: 'PTS Semester Ganjil', jenis: 'ujian', deskripsi: 'Penilaian Tengah Semester' },
      { tanggal_mulai: dateOffset(14), tanggal_selesai: null, judul: 'Rapat Evaluasi Hasil PTS', jenis: 'rapat', deskripsi: 'Rapat seluruh dewan guru' },
      { tanggal_mulai: dateOffset(21), tanggal_selesai: null, judul: 'Peringatan Hari Guru Nasional', jenis: 'libur_nasional', deskripsi: null },
      { tanggal_mulai: dateOffset(30), tanggal_selesai: null, judul: 'Libur Maulid Nabi Muhammad SAW', jenis: 'libur_nasional', deskripsi: null },
      { tanggal_mulai: dateOffset(60), tanggal_selesai: dateOffset(60), judul: 'Pembagian Rapor Semester Ganjil', jenis: 'kegiatan', deskripsi: 'Pengambilan rapor oleh orang tua' },
    ]
    for (const k of kalender) {
      await db.kalender_akademik.add({ ...k, kelas_id: 1, created_at: now })
    }

    const rencana = [
      { tanggal: dateOffset(-2), mata_pelajaran_id: 1, topik: 'Bilangan Bulat dan Operasinya', tujuan_pembelajaran: 'Siswa dapat melakukan operasi hitung bilangan bulat', kegiatan: 'Diskusi dan latihan soal', media: 'Buku paket, papan tulis', penilaian: 'Kuis singkat', catatan: 'Materi tersampaikan dengan baik', status: 'selesai' },
      { tanggal: dateOffset(-1), mata_pelajaran_id: 1, topik: 'Latihan Soal Bilangan Bulat', tujuan_pembelajaran: 'Siswa dapat menyelesaikan soal cerita bilangan bulat', kegiatan: 'Kerja kelompok dan presentasi', media: 'LKS', penilaian: 'Hasil kerja kelompok', catatan: null, status: 'selesai' },
      { tanggal: dateOffset(1), mata_pelajaran_id: 1, topik: 'Pecahan dan Operasinya', tujuan_pembelajaran: 'Siswa memahami konsep pecahan', kegiatan: 'Pembelajaran berbasis proyek', media: 'Media manipulatif', penilaian: 'Observasi', catatan: null, status: 'draft' },
      { tanggal: dateOffset(2), mata_pelajaran_id: 4, topik: 'Klasifikasi Makhluk Hidup', tujuan_pembelajaran: 'Siswa dapat mengelompokkan makhluk hidup', kegiatan: 'Praktikum sederhana', media: 'Mikroskop, spesimen', penilaian: 'Laporan praktikum', catatan: null, status: 'draft' },
      { tanggal: dateOffset(3), mata_pelajaran_id: 2, topik: 'Teks Deskripsi', tujuan_pembelajaran: 'Siswa dapat menulis teks deskripsi', kegiatan: 'Menulis kreatif', media: 'Contoh teks', penilaian: 'Hasil tulisan', catatan: null, status: 'draft' },
    ]
    for (const r of rencana) {
      await db.rencana_mengajar.add({ ...r, kelas_id: 1, created_at: now, updated_at: now })
    }

    const jurnal = [
      { tanggal: dateOffset(-4), jam_ke: '5', mata_pelajaran: 'PJOK', materi: 'Senam Kebugaran Jasmani', kegiatan: 'Pemanasan dan latihan senam', kendala: 'Cuaca panas', refleksi: 'Siswa antusias mengikuti', created_at: now, updated_at: now },
      { tanggal: dateOffset(-3), jam_ke: '1-2', mata_pelajaran: 'IPA', materi: 'Pengukuran', kegiatan: 'Praktikum pengukuran panjang', kendala: null, refleksi: 'Perlu pendampingan lebih untuk kelompok tertentu', created_at: now, updated_at: now },
      { tanggal: dateOffset(-2), jam_ke: '1-2', mata_pelajaran: 'Matematika', materi: 'Bilangan Bulat', kegiatan: 'Diskusi dan latihan soal', kendala: null, refleksi: 'Sebagian siswa masih bingung operasi campuran', created_at: now, updated_at: now },
      { tanggal: dateOffset(-1), jam_ke: '3-4', mata_pelajaran: 'Bahasa Indonesia', materi: 'Teks Deskripsi', kegiatan: 'Membaca dan mengidentifikasi struktur teks', kendala: 'Kurang media', refleksi: 'Materi berjalan lancar', created_at: now, updated_at: now },
      { tanggal: dateOffset(0), jam_ke: '1-2', mata_pelajaran: 'Matematika', materi: 'Latihan Soal Operasi Bilangan Bulat', kegiatan: 'Kerja kelompok dan presentasi', kendala: null, refleksi: 'Hasil latihan cukup baik', created_at: now, updated_at: now },
    ]
    for (const j of jurnal) {
      await db.jurnal_harian.add({ ...j, kelas_id: 1 })
    }

    const catatan = [
      { judul: 'Rapat Wali Kelas', isi: 'Persiapan pembagian rapor dan evaluasi PTS. Undangan disampaikan ke orang tua.', tag: 'rapat', warna: '#eff6ff', is_pinned: 1 },
      { judul: 'Catatan Siswa Berprestasi', isi: 'Ahmad Fauzi juara matematika, Bagas dan Maya aktif di organisasi.', tag: 'prestasi', warna: '#f0fdf4', is_pinned: 0 },
      { judul: 'Materi Minggu Depan', isi: 'Siapkan materi pecahan, koreksi PR, dan ulangan harian.', tag: 'perencanaan', warna: '#fefce8', is_pinned: 0 },
      { judul: 'Evaluasi PH 1', isi: 'Rata-rata PH 1 Matematika 78. Perlu pengayaan untuk materi operasi campuran.', tag: 'evaluasi', warna: '#faf5ff', is_pinned: 0 },
    ]
    for (const c of catatan) {
      await db.catatan_guru.add({ ...c, deleted_at: null, created_at: now, updated_at: now })
    }

    const todo = [
      { judul: 'Persiapan materi Pecahan', deskripsi: 'Siapkan LKS dan media manipulatif', prioritas: 'tinggi', status: 'belum', deadline: dateOffset(1) },
      { judul: 'Koreksi PR Matematika', deskripsi: 'Kelas 7A', prioritas: 'normal', status: 'belum', deadline: dateOffset(0) },
      { judul: 'Input Nilai PH 2', deskripsi: 'Input ke aplikasi', prioritas: 'tinggi', status: 'selesai', deadline: dateOffset(-1), completed_at: now },
      { judul: 'Laporan kemajuan siswa', deskripsi: 'Persiapan laporan untuk kepala sekolah', prioritas: 'normal', status: 'belum', deadline: dateOffset(3) },
      { judul: 'Undangan rapat orang tua', deskripsi: 'Kirim undangan via WA', prioritas: 'rendah', status: 'belum', deadline: dateOffset(5) },
    ]
    for (const t of todo) {
      await db.todo.add({ ...t, deleted_at: null, created_at: now, updated_at: now })
    }
  })
}

export function resetToMainDb(): void {
  activateMainDb()
}

export async function clearDemoDb(): Promise<void> {
  const db = activateDemoDb()
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) {
      await table.clear()
    }
  })
}
