import { attendancePercent } from './attendance'

export type ProfileThresholds = { nilai: number; kehadiran: number }
export const DEFAULT_THRESHOLDS: ProfileThresholds = { nilai: 75, kehadiran: 85 }
export const thresholdKey = (kelasId: number) => `ambang_profil_${kelasId}`

export function validateThresholds(value: unknown): ProfileThresholds {
  const v = value as ProfileThresholds
  if (![v?.nilai, v?.kehadiran].every(n => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 100)) throw new Error('Batas nilai dan kehadiran harus angka 0–100.')
  return { nilai: v.nilai, kehadiran: v.kehadiran }
}
export function readThresholds(stored?: string | null): ProfileThresholds {
  try { return stored ? validateThresholds(JSON.parse(stored)) : { ...DEFAULT_THRESHOLDS } } catch { return { ...DEFAULT_THRESHOLDS } }
}

export type AttendanceSummary = { H: number; S: number; I: number; A: number; T: number; total: number; percent: number | null }

export function summarizeAttendance(records: { status: string; tanggal: string }[], start = '', end = ''): AttendanceSummary {
  const summary = { H: 0, S: 0, I: 0, A: 0, T: 0, total: 0 }
  for (const record of records) {
    if ((start && record.tanggal < start) || (end && record.tanggal > end)) continue
    const key = (['H', 'S', 'I', 'T'].includes(record.status) ? record.status : 'A') as keyof typeof summary
    summary[key]++
    summary.total++
  }
  return { ...summary, percent: attendancePercent(summary.H, summary.T, summary.total) }
}

export function profileAlerts(attendance: AttendanceSummary, finals: { mapel: string; akhir: number | null }[], concerns: number, limits: ProfileThresholds = DEFAULT_THRESHOLDS): string[] {
  const alerts: string[] = []
  if (attendance.A >= 3) alerts.push(`Alpa ${attendance.A} kali`)
  if (attendance.total >= 5 && attendance.percent !== null && attendance.percent < limits.kehadiran) alerts.push(`Kehadiran ${attendance.percent}% (di bawah ${limits.kehadiran}%)`)
  const low = finals.filter(item => item.akhir !== null && item.akhir < limits.nilai).map(item => item.mapel)
  if (low.length) alerts.push(`Nilai di bawah ${limits.nilai}: ${low.join(', ')}`)
  if (concerns >= 2) alerts.push(`${concerns} catatan perilaku perlu perhatian`)
  return alerts
}
