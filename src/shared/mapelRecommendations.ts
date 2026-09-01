export type MapelRecommendation = { nama: string; kode: string; optional?: boolean }

const BASE: MapelRecommendation[] = [
  { nama: 'Pendidikan Agama dan Budi Pekerti', kode: 'PABP' },
  { nama: 'Pendidikan Pancasila', kode: 'PP' },
  { nama: 'Bahasa Indonesia', kode: 'BIND' },
  { nama: 'Matematika', kode: 'MTK' },
  { nama: 'Pendidikan Jasmani, Olahraga, dan Kesehatan', kode: 'PJOK' },
  { nama: 'Seni dan Budaya', kode: 'SENI' },
]

export function getGradeNumber(tingkat?: string): number {
  const match = String(tingkat || '').match(/[1-6]/)
  return match ? Number(match[0]) : 1
}

export function getPhaseForGrade(tingkat?: string): 'A' | 'B' | 'C' {
  const grade = getGradeNumber(tingkat)
  return grade <= 2 ? 'A' : grade <= 4 ? 'B' : 'C'
}

export function getRecommendedMapel(tingkat?: string): MapelRecommendation[] {
  const grade = getGradeNumber(tingkat)
  const additions: MapelRecommendation[] = grade >= 3
    ? [{ nama: 'Ilmu Pengetahuan Alam dan Sosial', kode: 'IPAS' }, { nama: 'Bahasa Inggris', kode: 'BING' }]
    : [{ nama: 'Bahasa Inggris', kode: 'BING', optional: true }]
  return [...BASE, ...additions, { nama: 'Muatan Lokal', kode: 'MULOK', optional: true }]
}
