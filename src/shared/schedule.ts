// Jam bawaan dihitung berurutan dari 07:00: tiap JP = menitJP (bawaan 40),
// tiap baris istirahat = 30 menit. Jadi baris setelah istirahat tidak lagi
// "bocor" ke jam yang salah (mis. istirahat tampil jam 11).
export function defaultTime(jam: number, menitJP = 40, istirahat: number[] = []) {
  const format = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2,'0')}:${String(minutes % 60).padStart(2,'0')}`
  let minute = 7 * 60
  for (let row = 1; row <= jam; row++) {
    const durasi = istirahat.includes(row) ? 30 : menitJP
    if (row === jam) return {mulai:format(minute),selesai:format(minute + durasi)}
    minute += durasi
  }
  return {mulai:format(minute),selesai:format(minute + menitJP)}
}

export function schedulePreset(total: number, start: string, duration: number, breakAfter: number, breakMinutes: number) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(start) || !Number.isInteger(total) || total < 2 || total > 16
    || !Number.isInteger(duration) || duration < 10 || duration > 90 || !Number.isInteger(breakAfter) || breakAfter < 1 || breakAfter >= total
    || !Number.isInteger(breakMinutes) || breakMinutes < 5 || breakMinutes > 60) throw new Error('Periksa jam mulai, durasi JP, dan letak istirahat.')
  let minute = Number(start.slice(0,2))*60 + Number(start.slice(3))
  const format = (value:number) => `${String(Math.floor(value/60)).padStart(2,'0')}:${String(value%60).padStart(2,'0')}`
  const waktuJam: Record<number,{mulai:string;selesai:string}> = {}
  for(let row=1;row<=total;row++) {
    const end = minute + (row === breakAfter+1 ? breakMinutes : duration)
    if(end>=1440) throw new Error('Jadwal melewati tengah malam.')
    waktuJam[row]={mulai:format(minute),selesai:format(end)};minute=end
  }
  return {waktuJam,istirahat:[breakAfter+1]}
}
export function resolveScheduleTime(jam: number, configured: Record<number,{mulai:string;selesai:string}>, records: {jam_ke:number;jam_mulai:string;jam_selesai:string}[], menitJP = 40, istirahat: number[] = []) {
  const saved = records.find(record => record.jam_ke === jam)
  const fallback = defaultTime(jam, menitJP, istirahat)
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
