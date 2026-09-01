export function gradePeriod(kelas: { tahun_ajaran: string; semester: number }): string {
  const match = /^(\d{4})\/(\d{4})$/.exec(kelas.tahun_ajaran.trim())
  if (!match || Number(match[2]) !== Number(match[1]) + 1 || ![1, 2].includes(Number(kelas.semester))) throw new Error('Isi tahun ajaran seperti 2026/2027 dan semester 1 atau 2.')
  return `${kelas.tahun_ajaran.trim()}:${Number(kelas.semester)}`
}
export const gradeWeightKey = (kelasId: number, period: string) => `bobot_nilai_${kelasId}_${period}`
export const DEFAULT_WEIGHTS = { harian: 40, uts: 25, uas: 35 }

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
