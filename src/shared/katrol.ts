// Katrol nilai: empat metode yang sama dengan alat Katrol Nilai BGY.
// Hanya menghitung; penerapan ke kolom nilai ada di dialog Penilaian.
export type KatrolMethod = 'tambah' | 'kkm' | 'akar' | 'skala'

export const KATROL_METHODS: { value: KatrolMethod; label: string; hint: string }[] = [
  { value: 'tambah', label: 'Tambah poin', hint: 'Semua nilai ditambah angka tetap' },
  { value: 'kkm', label: 'Naik ke KKM', hint: 'Yang di bawah KKM dinaikkan tepat ke KKM' },
  { value: 'akar', label: 'Rumus akar', hint: '√nilai × 10, nilai rendah naik lebih banyak' },
  { value: 'skala', label: 'Skala proporsional', hint: 'Nilai tertinggi dijadikan 100' },
]

export type KatrolParams = { method: KatrolMethod; poin: number; kkm: number; maxKatrol: number }

const round1 = (n: number) => Math.round(n * 10) / 10

// maxNilai = nilai tertinggi di kolom yang sama (dipakai metode skala).
export function katrolScore(nilai: number, p: KatrolParams, maxNilai: number): number {
  let h: number
  switch (p.method) {
    case 'tambah': h = nilai + p.poin; break
    case 'kkm': h = nilai < p.kkm ? p.kkm : nilai; break
    case 'akar': h = Math.sqrt(Math.max(0, nilai)) * 10; break
    case 'skala': h = maxNilai > 0 ? (nilai / maxNilai) * 100 : nilai; break
  }
  return Math.max(0, Math.min(p.maxKatrol, round1(h)))
}

export type KatrolRow = { id: number; nama: string; asli: number; katrol: number; delta: number }

// Nilai kosong (null) tidak ikut dan tidak diubah.
export function katrolRows(students: { id: number; nama: string; nilai: number | null | undefined }[], p: KatrolParams): KatrolRow[] {
  const filled = students.filter((s): s is { id: number; nama: string; nilai: number } => typeof s.nilai === 'number' && Number.isFinite(s.nilai))
  const maxNilai = filled.reduce((m, s) => Math.max(m, s.nilai), 0)
  return filled.map(s => {
    const katrol = katrolScore(s.nilai, p, maxNilai)
    return { id: s.id, nama: s.nama, asli: s.nilai, katrol, delta: round1(katrol - s.nilai) }
  })
}

export function katrolSummary(rows: KatrolRow[], kkm: number) {
  const n = rows.length
  const avg = (key: 'asli' | 'katrol') => n ? round1(rows.reduce((a, r) => a + r[key], 0) / n) : 0
  return {
    jumlah: n,
    rataAsli: avg('asli'),
    rataKatrol: avg('katrol'),
    tuntasAsli: rows.filter(r => r.asli >= kkm).length,
    tuntasKatrol: rows.filter(r => r.katrol >= kkm).length,
    berubah: rows.filter(r => r.delta !== 0).length,
  }
}
