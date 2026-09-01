export function attendancePercent(hadir: number, terlambat: number, total: number): number | null {
  return total > 0 ? Math.round((hadir + terlambat) / total * 100) : null
}

export function missingAttendance(students: { id: number }[], statuses: Record<number, string>, kelasId: number, tanggal: string) {
  return students.filter(student => !statuses[student.id]).map(student => ({ siswa_id: student.id, kelas_id: kelasId, tanggal, status: 'H' }))
}
