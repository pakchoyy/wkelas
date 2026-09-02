import type { BgyDatabase } from './db'
import { getPhaseForGrade, getRecommendedMapel } from '../shared/mapelRecommendations'

export type SetupData = {
  namaKelas: string; tingkat: string; tahunAjaran: string; semester: number
  namaSekolah: string; namaWali: string; nip: string
}

export function initialSetup(date = new Date()): SetupData {
  const start = date.getFullYear() - (date.getMonth() < 6 ? 1 : 0)
  return { namaKelas: '', tingkat: '1', tahunAjaran: `${start}/${start + 1}`, semester: date.getMonth() < 6 ? 2 : 1, namaSekolah: '', namaWali: '', nip: '' }
}

export async function saveInitialClass(db: BgyDatabase, data: SetupData, skip = false) {
  const setup = { ...data, namaKelas: data.namaKelas.trim(), namaSekolah: data.namaSekolah.trim(), namaWali: data.namaWali.trim(), nip: data.nip.trim(), tahunAjaran: data.tahunAjaran.trim() }
  if (skip) { setup.namaKelas ||= 'Kelas Saya'; setup.namaWali ||= 'Wali Kelas'; setup.tingkat ||= '1' }
  if (!/^[1-6]$/.test(setup.tingkat)) throw new Error('Pilih tingkat kelas SD 1 sampai 6.')
  if (!/^\d{4}\/\d{4}$/.test(setup.tahunAjaran) || Number(setup.tahunAjaran.slice(5)) !== Number(setup.tahunAjaran.slice(0,4)) + 1) throw new Error('Tahun ajaran harus berurutan, misalnya 2026/2027.')
  if (![1,2].includes(setup.semester)) throw new Error('Pilih semester 1 atau 2.')
  if (!setup.namaKelas || !setup.namaWali || (!skip && !setup.namaSekolah)) throw new Error('Lengkapi nama kelas, sekolah, dan wali kelas.')
  return db.transaction('rw', [db.guru, db.kelas, db.mata_pelajaran, db.pengaturan], async () => {
    const existing = await db.kelas.where('is_aktif').equals(1).first() || await db.kelas.orderBy('id').first()
    if (existing?.id) return existing.id
    const timestamp = new Date().toISOString()
    const guruId = await db.guru.add({ supabase_uid: 'local', nama: setup.namaWali, email: 'admin@lokal', nip: setup.nip, nama_sekolah: setup.namaSekolah, tahun_ajaran_aktif: setup.tahunAjaran, semester_aktif: setup.semester, created_at: timestamp, updated_at: timestamp })
    const kelasId = await db.kelas.add({ nama_kelas: setup.namaKelas, tingkat: setup.tingkat, tahun_ajaran: setup.tahunAjaran, semester: setup.semester, is_aktif: 1, guru_id: guruId, created_at: timestamp, updated_at: timestamp })
    if (!skip) await db.mata_pelajaran.bulkAdd(getRecommendedMapel(setup.tingkat).map((mapel,index) => ({kelas_id:kelasId,nama:mapel.nama,kode:mapel.kode,urutan:index+1,is_aktif:1,created_at:timestamp})))
    await db.pengaturan.bulkPut([{key:'fase_aktif',value:getPhaseForGrade(setup.tingkat),updated_at:timestamp},{key:'onboarding_complete',value:'true',updated_at:timestamp}])
    return kelasId
  })
}
