export type MapelRecommendation = { nama: string; kode: string; optional?: boolean }
export type Jenjang = 'SD' | 'SMP' | 'SMA'
export type Fase = 'A' | 'B' | 'C' | 'D' | 'E' | 'F'

// Kelas 1–12 dikelompokkan per jenjang untuk pilihan tingkat.
export const GRADE_GROUPS: { jenjang: Jenjang; label: string; grades: number[] }[] = [
  { jenjang: 'SD', label: 'SD / MI', grades: [1, 2, 3, 4, 5, 6] },
  { jenjang: 'SMP', label: 'SMP / MTs', grades: [7, 8, 9] },
  { jenjang: 'SMA', label: 'SMA / SMK / MA', grades: [10, 11, 12] },
]
export const MAX_GRADE = 12

export function isValidGrade(tingkat: unknown): boolean {
  return /^(?:[1-9]|1[0-2])$/.test(String(tingkat ?? '').trim())
}

export function getGradeNumber(tingkat?: string): number {
  const match = String(tingkat || '').match(/\d{1,2}/)
  const n = match ? Number(match[0]) : 1
  return n >= 1 && n <= MAX_GRADE ? n : 1
}

export function jenjangOf(tingkat?: string | number): Jenjang {
  const g = getGradeNumber(String(tingkat ?? ''))
  return g <= 6 ? 'SD' : g <= 9 ? 'SMP' : 'SMA'
}

// Fase Kurikulum Merdeka: A (1–2), B (3–4), C (5–6), D (7–9), E (10), F (11–12).
export function getPhaseForGrade(tingkat?: string): Fase {
  const g = getGradeNumber(tingkat)
  return g <= 2 ? 'A' : g <= 4 ? 'B' : g <= 6 ? 'C' : g <= 9 ? 'D' : g === 10 ? 'E' : 'F'
}

const AGAMA: MapelRecommendation = { nama: 'Pendidikan Agama dan Budi Pekerti', kode: 'PABP' }
const PANCASILA: MapelRecommendation = { nama: 'Pendidikan Pancasila', kode: 'PP' }
const BINDO: MapelRecommendation = { nama: 'Bahasa Indonesia', kode: 'BIND' }
const MTK: MapelRecommendation = { nama: 'Matematika', kode: 'MTK' }
const PJOK: MapelRecommendation = { nama: 'Pendidikan Jasmani, Olahraga, dan Kesehatan', kode: 'PJOK' }
const SENI: MapelRecommendation = { nama: 'Seni dan Budaya', kode: 'SENI' }
const BING: MapelRecommendation = { nama: 'Bahasa Inggris', kode: 'BING' }
const INFORMATIKA: MapelRecommendation = { nama: 'Informatika', kode: 'INF' }
const MULOK: MapelRecommendation = { nama: 'Muatan Lokal', kode: 'MULOK', optional: true }

// Mapel umum per jenjang. Mapel pilihan SMA kelas 11–12 berbeda tiap sekolah, jadi ditambahkan guru sendiri.
export function getRecommendedMapel(tingkat?: string): MapelRecommendation[] {
  const g = getGradeNumber(tingkat)
  if (g <= 6) {
    const additions: MapelRecommendation[] = g >= 3
      ? [{ nama: 'Ilmu Pengetahuan Alam dan Sosial', kode: 'IPAS' }, BING]
      : [{ ...BING, optional: true }]
    return [AGAMA, PANCASILA, BINDO, MTK, PJOK, SENI, ...additions, MULOK]
  }
  if (g <= 9) {
    return [AGAMA, PANCASILA, BINDO, MTK, { nama: 'Ilmu Pengetahuan Alam', kode: 'IPA' }, { nama: 'Ilmu Pengetahuan Sosial', kode: 'IPS' }, BING, PJOK, INFORMATIKA, SENI, { nama: 'Prakarya', kode: 'PKY', optional: true }, MULOK]
  }
  if (g === 10) {
    return [AGAMA, PANCASILA, BINDO, MTK, BING, { nama: 'Fisika', kode: 'FIS' }, { nama: 'Kimia', kode: 'KIM' }, { nama: 'Biologi', kode: 'BIO' }, { nama: 'Sosiologi', kode: 'SOS' }, { nama: 'Ekonomi', kode: 'EKO' }, { nama: 'Geografi', kode: 'GEO' }, { nama: 'Sejarah', kode: 'SEJ' }, INFORMATIKA, PJOK, SENI, MULOK]
  }
  return [AGAMA, PANCASILA, BINDO, MTK, BING, { nama: 'Sejarah', kode: 'SEJ' }, PJOK, SENI, MULOK]
}

// Nama kelas saat naik kelas: ganti angka tingkat di depan, bukan digit pertama ("10 IPA" -> "11 IPA").
export function nextClassName(nama: string, fromGrade: number, toGrade: number): string {
  const re = new RegExp(`(^|\\D)${fromGrade}(?!\\d)`)
  // Tidak ada angka tingkat (mis. "XI-2"): biarkan, guru mengganti sendiri.
  return re.test(nama) ? nama.replace(re, (_m, pre: string) => `${pre}${toGrade}`) : nama
}
