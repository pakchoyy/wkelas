export function defaultTime(jam: number) {
  const start = 7 * 60 + (jam - 1) * 40
  const format = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2,'0')}:${String(minutes % 60).padStart(2,'0')}`
  return {mulai:format(start),selesai:format(start + 35)}
}
export function resolveScheduleTime(jam: number, configured: Record<number,{mulai:string;selesai:string}>, records: {jam_ke:number;jam_mulai:string;jam_selesai:string}[]) {
  const saved = records.find(record => record.jam_ke === jam)
  const fallback = defaultTime(jam)
  return {mulai:configured[jam]?.mulai || saved?.jam_mulai || fallback.mulai,selesai:configured[jam]?.selesai || saved?.jam_selesai || fallback.selesai}
}
export function excelTime(value: unknown, fallback: string): string {
  if (value === '' || value == null) return fallback
  if (typeof value === 'number' && value >= 0 && value < 1) {
    const minutes = Math.round(value * 1440)
    return `${String(Math.floor(minutes / 60)).padStart(2,'0')}:${String(minutes % 60).padStart(2,'0')}`
  }
  const match = /^(\d{1,2}):(\d{2})(?::00)?$/.exec(String(value).trim())
  if (!match) throw new Error('Waktu harus HH:MM atau sel waktu Excel.')
  return `${match[1].padStart(2,'0')}:${match[2]}`
}
export function validateTime(mulai: string, selesai: string) {
  const valid = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
  if (!valid(mulai) || !valid(selesai) || mulai >= selesai) throw new Error('Waktu selesai harus setelah mulai, dengan format HH:MM.')
}
