export const MIGRATIONS = [
  {
    version: 1,
    sql: `
      CREATE TABLE IF NOT EXISTS guru (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        supabase_uid TEXT NOT NULL UNIQUE,
        nama TEXT NOT NULL,
        email TEXT NOT NULL,
        nip TEXT,
        nama_sekolah TEXT,
        mata_pelajaran TEXT,
        foto_url TEXT,
        tahun_ajaran_aktif TEXT NOT NULL,
        semester_aktif INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS kelas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nama_kelas TEXT NOT NULL,
        tingkat TEXT NOT NULL,
        tahun_ajaran TEXT NOT NULL,
        semester INTEGER NOT NULL,
        is_aktif INTEGER NOT NULL DEFAULT 1,
        guru_id INTEGER NOT NULL REFERENCES guru(id),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS siswa (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        kelas_id INTEGER NOT NULL REFERENCES kelas(id),
        nama TEXT NOT NULL,
        nis TEXT,
        jenis_kelamin TEXT,
        no_absen INTEGER,
        deleted_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS siswa_field_definitions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        kelas_id INTEGER NOT NULL REFERENCES kelas(id),
        nama_field TEXT NOT NULL,
        slug TEXT NOT NULL,
        tipe TEXT NOT NULL DEFAULT 'teks',
        pilihan TEXT,
        wajib INTEGER DEFAULT 0,
        urutan INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(kelas_id, slug)
      );

      CREATE TABLE IF NOT EXISTS siswa_field_values (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        siswa_id INTEGER NOT NULL REFERENCES siswa(id),
        field_id INTEGER NOT NULL REFERENCES siswa_field_definitions(id),
        nilai TEXT,
        updated_at TEXT NOT NULL,
        UNIQUE(siswa_id, field_id)
      );

      CREATE TABLE IF NOT EXISTS presensi (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        siswa_id INTEGER NOT NULL REFERENCES siswa(id),
        kelas_id INTEGER NOT NULL REFERENCES kelas(id),
        tanggal TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('S','I','A')),
        keterangan TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(siswa_id, tanggal)
      );

      CREATE TABLE IF NOT EXISTS mata_pelajaran (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        kelas_id INTEGER NOT NULL REFERENCES kelas(id),
        nama TEXT NOT NULL,
        kode TEXT,
        urutan INTEGER DEFAULT 0,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS penilaian_kolom (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mata_pelajaran_id INTEGER NOT NULL REFERENCES mata_pelajaran(id),
        label TEXT NOT NULL,
        bobot REAL NOT NULL DEFAULT 1.0,
        tanggal TEXT,
        urutan INTEGER DEFAULT 0,
        catatan TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS nilai (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        siswa_id INTEGER NOT NULL REFERENCES siswa(id),
        kolom_id INTEGER NOT NULL REFERENCES penilaian_kolom(id),
        nilai REAL,
        catatan TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(siswa_id, kolom_id)
      );

      CREATE TABLE IF NOT EXISTS perilaku (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        siswa_id INTEGER NOT NULL REFERENCES siswa(id),
        tanggal TEXT NOT NULL,
        jenis TEXT NOT NULL CHECK(jenis IN ('positif','negatif')),
        kategori TEXT,
        deskripsi TEXT NOT NULL,
        tindak_lanjut TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS jadwal (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        kelas_id INTEGER NOT NULL REFERENCES kelas(id),
        hari INTEGER NOT NULL CHECK(hari BETWEEN 1 AND 7),
        jam_ke INTEGER NOT NULL,
        jam_mulai TEXT NOT NULL,
        jam_selesai TEXT NOT NULL,
        mata_pelajaran_id INTEGER REFERENCES mata_pelajaran(id),
        nama_mapel_custom TEXT,
        nama_guru TEXT,
        ruang TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS kalender_akademik (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        kelas_id INTEGER REFERENCES kelas(id),
        tanggal_mulai TEXT NOT NULL,
        tanggal_selesai TEXT,
        judul TEXT NOT NULL,
        jenis TEXT NOT NULL,
        deskripsi TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS rencana_mengajar (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        kelas_id INTEGER NOT NULL REFERENCES kelas(id),
        mata_pelajaran_id INTEGER REFERENCES mata_pelajaran(id),
        tanggal TEXT NOT NULL,
        topik TEXT NOT NULL,
        tujuan_pembelajaran TEXT,
        kegiatan TEXT,
        media TEXT,
        penilaian TEXT,
        catatan TEXT,
        status TEXT DEFAULT 'draft',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS jurnal_harian (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        kelas_id INTEGER REFERENCES kelas(id),
        tanggal TEXT NOT NULL,
        jam_ke TEXT,
        mata_pelajaran TEXT,
        materi TEXT,
        kegiatan TEXT,
        kendala TEXT,
        refleksi TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS catatan_guru (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        judul TEXT NOT NULL,
        isi TEXT,
        tag TEXT,
        warna TEXT DEFAULT '#ffffff',
        is_pinned INTEGER DEFAULT 0,
        deleted_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS todo (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        judul TEXT NOT NULL,
        deskripsi TEXT,
        prioritas TEXT DEFAULT 'normal',
        status TEXT DEFAULT 'belum',
        deadline TEXT,
        completed_at TEXT,
        deleted_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS dokumen_saya (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        judul TEXT NOT NULL,
        deskripsi TEXT,
        kategori TEXT,
        file_path TEXT NOT NULL,
        format_file TEXT,
        ukuran_file INTEGER,
        deleted_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS perangkat_ajar_cache (
        id TEXT PRIMARY KEY,
        judul TEXT NOT NULL,
        jenis TEXT NOT NULL,
        mata_pelajaran TEXT,
        jenjang TEXT,
        kelas TEXT,
        fase TEXT,
        file_path_lokal TEXT,
        file_url TEXT NOT NULL,
        ukuran_file INTEGER,
        format_file TEXT,
        versi TEXT,
        sudah_diunduh INTEGER DEFAULT 0,
        diunduh_at TEXT,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS pengaturan (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `,
  },
]
