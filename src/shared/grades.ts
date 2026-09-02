export function gradePeriod(kelas: { tahun_ajaran: string; semester: number }): string {
  const match = /^(\d{4})\/(\d{4})$/.exec(kelas.tahun_ajaran.trim())
  if (!match || Number(match[2]) !== Number(match[1]) + 1 || ![1, 2].includes(Number(kelas.semester))) throw new Error('Isi tahun ajaran seperti 2026/2027 dan semester 1 atau 2.')
  return `${kelas.tahun_ajaran.trim()}:${Number(kelas.semester)}`
}
export const gradeWeightKey = (kelasId: number, period: string) => `bobot_nilai_${kelasId}_${period}`
export const DEFAULT_WEIGHTS = { harian: 40, uts: 25, uas: 35 }
export type GradeWeights = typeof DEFAULT_WEIGHTS
export function validateGradeWeights(value: unknown): GradeWeights {
  const weights = value as GradeWeights
  const parts = [weights?.harian, weights?.uts, weights?.uas]
  if (parts.some(n => typeof n !== 'number' || !Number.isFinite(n) || n < 0 || n > 100)
    || Math.abs(parts.reduce((sum, n) => sum + n, 0) - 100) > 0.000001) {
    throw new Error('Setiap bobot harus 0–100% dan totalnya harus 100%.')
  }
  return { harian: weights.harian, uts: weights.uts, uas: weights.uas }
}
export function readGradeWeights(stored?: string): GradeWeights {
  return stored ? validateGradeWeights(JSON.parse(stored)) : { ...DEFAULT_WEIGHTS }
}

export function orderedGradeColumns<T extends { id?: number; label: string; urutan?: number }>(columns: T[]) {
  const rank = (column: T) => column.label.trim().toUpperCase() === 'UTS' ? 1 : column.label.trim().toUpperCase() === 'UAS' ? 2 : 0
  return [...columns].sort((a, b) => rank(a) - rank(b) || (a.urutan || 0) - (b.urutan || 0) || (a.id || 0) - (b.id || 0))
}
export function nextDailyLabel(columns: { label: string }[]) {
  const used = new Set(columns.map(column => column.label.trim().toLowerCase()))
  let index = 1
  while (used.has(`harian ${index}`) || used.has(`h${index}`)) index++
  return `Harian ${index}`
}

export function calculateGrade(columns: { id?: number; label: string }[], values: Record<string, number | null>, studentId: number, weights = DEFAULT_WEIGHTS) {
  const value = (column?: {id?:number}) => column ? values[`${studentId}-${column.id}`] ?? null : null
  const daily = columns.filter(c => !['UTS', 'UAS'].includes(c.label.toUpperCase()))
  const dailyValues = daily.map(value).filter((n): n is number => n !== null)
  const harian = dailyValues.length ? dailyValues.reduce((sum, n) => sum + n, 0) / dailyValues.length : null
  const uts = value(columns.find(c => c.label.toUpperCase() === 'UTS'))
  const uas = value(columns.find(c => c.label.toUpperCase() === 'UAS'))
  const parts = [{value:harian,weight:weights.harian},{value:uts,weight:weights.uts},{value:uas,weight:weights.uas}].filter(p => p.value !== null && p.weight > 0)
  const total = parts.reduce((sum,p) => sum + p.weight,0)
  return { harian, uts, uas, akhir: total ? parts.reduce((sum,p) => sum + p.value! * p.weight,0) / total : null, lengkap: (weights.harian === 0 || daily.length > 0 && dailyValues.length === daily.length) && (weights.uts === 0 || uts !== null) && (weights.uas === 0 || uas !== null) }
}
