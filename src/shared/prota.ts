// Minggu efektif, Prota, dan Prosem dihitung dari Kalender Akademik dan Jadwal Wkelas.
// Aturan hari efektif sama dengan Kalender: libur nasional/sekolah, KTS, dan kegiatan puasa
// tidak efektif; hari pengganti dihitung efektif walau di luar hari sekolah biasa.
// Satu minggu dihitung efektif bila setidaknya separuh hari sekolahnya efektif (sama dengan alat Draft TP BGY).

export type CalEvent = { jenis: string; judul: string; tanggal_mulai: string; tanggal_selesai?: string | null }
export type Period = { mulai: string; akhir: string; hariSekolah: number }

const NON_EFEKTIF = ['libur_nasional', 'libur_sekolah', 'kts', 'kpp']
export const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

const pad = (n: number) => String(n).padStart(2, '0')
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const parse = (s: string) => { const d = new Date(`${s}T12:00:00`); return Number.isNaN(d.getTime()) ? null : d }
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }
const covers = (e: CalEvent, day: string) => day >= e.tanggal_mulai && day <= (e.tanggal_selesai || e.tanggal_mulai)

export function dayInfo(day: string, hariSekolah: number, events: CalEvent[]) {
  const d = parse(day)
  const wd = d ? d.getDay() : -1
  const libur = events.find(e => NON_EFEKTIF.includes(e.jenis) && covers(e, day))
  const pengganti = events.some(e => e.jenis === 'pengganti' && covers(e, day))
  const sekolah = (wd >= 1 && wd <= (hariSekolah === 6 ? 6 : 5)) || pengganti
  return { sekolah, efektif: sekolah && !libur, ket: libur?.judul || '' }
}

export type Week = { mulai: string; bulan: number; tahun: number; no: number; hariSekolah: number; hariEfektif: number; efektif: boolean; ket: string }

export function effectiveWeeks(p: Period, events: CalEvent[]): Week[] {
  const a = parse(p.mulai), b = parse(p.akhir)
  if (!a || !b || b < a) return []
  const out: Week[] = []
  let ws = addDays(a, -((a.getDay() + 6) % 7)) // Senin pada/sebelum tanggal mulai
  for (let guard = 0; ws <= b && guard < 60; guard++, ws = addDays(ws, 7)) {
    const days: string[] = []
    for (let i = 0; i < 7; i++) { const d = addDays(ws, i); if (d >= a && d <= b) days.push(iso(d)) }
    const info = days.map(d => ({ d, ...dayInfo(d, p.hariSekolah, events) })).filter(x => x.sekolah)
    if (!info.length) continue
    const efektifCount = info.filter(x => x.efektif).length
    const ref = parse(info[Math.floor(info.length / 2)].d)!
    out.push({
      mulai: iso(ws), bulan: ref.getMonth(), tahun: ref.getFullYear(), no: 0,
      hariSekolah: info.length, hariEfektif: efektifCount,
      efektif: efektifCount * 2 >= info.length,
      ket: info.find(x => !x.efektif)?.ket || '',
    })
  }
  let prev = ''; let n = 0
  for (const w of out) { const k = `${w.tahun}-${w.bulan}`; if (k !== prev) { n = 0; prev = k } w.no = ++n }
  return out
}

export type MonthRow = { bulan: number; tahun: number; label: string; minggu: number; efektif: number; tidakEfektif: number; ket: string }

export function monthSummary(weeks: Week[]): MonthRow[] {
  const rows: MonthRow[] = []
  for (const w of weeks) {
    let r = rows[rows.length - 1]
    if (!r || r.bulan !== w.bulan || r.tahun !== w.tahun) { r = { bulan: w.bulan, tahun: w.tahun, label: `${BULAN[w.bulan]} ${w.tahun}`, minggu: 0, efektif: 0, tidakEfektif: 0, ket: '' }; rows.push(r) }
    r.minggu++
    if (w.efektif) r.efektif++
    else { r.tidakEfektif++; if (w.ket && !r.ket.includes(w.ket)) r.ket = r.ket ? `${r.ket}; ${w.ket}` : w.ket }
  }
  return rows
}

// JP per minggu tiap mapel = banyaknya sel jadwal mapel itu dalam satu minggu.
export function jpPerWeek(jadwal: { mata_pelajaran_id?: number | null }[]): Record<number, number> {
  const jp: Record<number, number> = {}
  for (const j of jadwal) if (j.mata_pelajaran_id) jp[j.mata_pelajaran_id] = (jp[j.mata_pelajaran_id] || 0) + 1
  return jp
}

export type ProtaRow = { mapelId: number; nama: string; jp: number; mingguS1: number; mingguS2: number; jpS1: number; jpS2: number; total: number }

export function prota(mapel: { id: number; nama: string }[], jp: Record<number, number>, s1: Week[], s2: Week[]): ProtaRow[] {
  const e1 = s1.filter(w => w.efektif).length, e2 = s2.filter(w => w.efektif).length
  return mapel.map(m => {
    const j = jp[m.id] || 0
    return { mapelId: m.id, nama: m.nama, jp: j, mingguS1: e1, mingguS2: e2, jpS1: j * e1, jpS2: j * e2, total: j * (e1 + e2) }
  })
}

export type ProsemRow = { mapelId: number; nama: string; jp: number; perBulan: number[]; total: number }

export function prosem(mapel: { id: number; nama: string }[], jp: Record<number, number>, months: MonthRow[]): ProsemRow[] {
  return mapel.map(m => {
    const j = jp[m.id] || 0
    const perBulan = months.map(mo => mo.efektif * j)
    return { mapelId: m.id, nama: m.nama, jp: j, perBulan, total: perBulan.reduce((a, b) => a + b, 0) }
  })
}
