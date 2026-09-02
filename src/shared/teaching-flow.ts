type Slot = { hari: number; jam_ke: number }
export function teachingSlots<T extends Slot>(slots: T[], schoolDays: number, config: { jumlahJam?: number; istirahat?: number[] } = {}): T[] {
  const days = schoolDays === 6 ? 6 : 5
  return slots.filter(slot => slot.hari >= 1 && slot.hari <= days && slot.jam_ke >= 1
    && slot.jam_ke <= (config.jumlahJam || 10) && !config.istirahat?.includes(slot.jam_ke))
}

export function planJournalDraft(kelasId: number, plan: { tanggal: string; topik?: string; kegiatan?: string; mata_pelajaran_id?: number | null }, slot: { jam_ke: number; mata_pelajaran_id?: number; nama_mapel_custom?: string }, subjects: { id?: number; nama: string }[]) {
  const subject = plan.mata_pelajaran_id
    ? subjects.find(item => item.id === plan.mata_pelajaran_id)?.nama
    : (!slot.mata_pelajaran_id ? slot.nama_mapel_custom : 'Umum')
  if (!subject) throw new Error('Mata pelajaran tidak ditemukan. Periksa rencana sebelum membuat jurnal.')
  return { kelas_id: kelasId, tanggal: plan.tanggal, jam_ke: String(slot.jam_ke), mata_pelajaran: subject,
    materi: plan.topik || '', kegiatan: plan.kegiatan || '', kendala: '', refleksi: '' }
}
