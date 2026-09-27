import { attendancePercent } from './attendance'

export const PASSING_GRADE = 75

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

export function profileAlerts(attendance: AttendanceSummary, finals: { mapel: string; akhir: number | null }[], concerns: number): string[] {
  const alerts: string[] = []
  if (attendance.A >= 3) alerts.push(`Alpa ${attendance.A} kali`)
  if (attendance.total >= 5 && attendance.percent !== null && attendance.percent < 85) alerts.push(`Kehadiran ${attendance.percent}% (di bawah 85%)`)
  const low = finals.filter(item => item.akhir !== null && item.akhir < PASSING_GRADE).map(item => item.mapel)
  if (low.length) alerts.push(`Nilai di bawah ${PASSING_GRADE}: ${low.join(', ')}`)
  if (concerns >= 2) alerts.push(`${concerns} catatan perilaku perlu perhatian`)
  return alerts
}
