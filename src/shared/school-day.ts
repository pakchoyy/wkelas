type CalendarEvent = { jenis: string; judul: string; tanggal_mulai: string; tanggal_selesai?: string }

export function schoolDayStatus(date: string, schoolDays: number, events: CalendarEvent[]) {
  const day = new Date(`${date}T12:00:00`).getDay()
  const holiday = events.find(event => ['libur_nasional', 'libur_sekolah'].includes(event.jenis) && date >= event.tanggal_mulai && date <= (event.tanggal_selesai || event.tanggal_mulai))
  const active = Number.isFinite(day) && day >= 1 && day <= (schoolDays === 6 ? 6 : 5) && !holiday
  return { active, reason: holiday?.judul || (active ? '' : 'Hari Libur Sekolah') }
}
