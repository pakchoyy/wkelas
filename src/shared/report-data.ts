export type ReportKind = 'presensi' | 'nilai' | 'perilaku' | 'jurnal' | 'kalender'

export function matchesReportPeriod(item: Record<string, any>, kind: ReportKind, start: string, end: string) {
  if (kind === 'nilai') return true
  const first = kind === 'kalender' ? item.tanggal_mulai : item.tanggal
  const last = kind === 'kalender' ? item.tanggal_selesai || first : first
  return !!first && (!start || last >= start) && (!end || first <= end)
}

const columns: Record<ReportKind, [string, string][]> = {
  presensi: [['siswa_nama','Nama Siswa'],['hadir','Hadir'],['sakit','Sakit'],['izin','Izin'],['alpa','Alpa'],['terlambat','Terlambat'],['total_hari','Hari Tercatat'],['persentase_kehadiran','Kehadiran']],
  nilai: [['mata_pelajaran','Mata Pelajaran'],['siswa_nama','Nama Siswa'],['rata_harian','Rata-rata Harian'],['uts','UTS'],['uas','UAS'],['nilai_akhir','Nilai Akhir']],
  perilaku: [['siswa_nama','Nama Siswa'],['positif','Positif'],['perhatian','Perlu Perhatian'],['catatan_terakhir','Catatan Terakhir'],['tanggal_terakhir','Tanggal Catatan'],['tindak_lanjut','Tindak Lanjut']],
  jurnal: [['tanggal','Tanggal'],['jam_ke','Jam'],['mata_pelajaran','Mata Pelajaran'],['materi','Materi'],['kegiatan','Kegiatan Pembelajaran'],['kendala','Kendala'],['refleksi','Refleksi']],
  kalender: [['tanggal_mulai','Mulai'],['tanggal_selesai','Selesai'],['jumlah_hari','Jumlah Hari Kalender'],['judul','Kegiatan'],['jenis_label','Jenis'],['deskripsi','Keterangan']],
}

export function reportTable(kind: ReportKind, rows: Record<string, any>[]) {
  return [columns[kind].map(([, label]) => label), ...rows.map(row => columns[kind].map(([key]) => {
    const value = kind === 'kalender' && key === 'tanggal_selesai' ? row[key] || row.tanggal_mulai : row[key]
    return value === null || value === undefined || value === '' ? '—' : value
  }))]
}
