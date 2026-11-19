// Bank Tujuan Pembelajaran (TP) dari alat Draft TP BGY, tanpa AI.
// Struktur: bank[cp][kelas][semester][mapel] = daftar TP.
export type TpBank = Record<string, Record<string, Record<string, Record<string, string[]>>>>

export const TP_SOURCES = [
  { value: 'cp2025', label: 'Mapel umum', detail: 'Capaian Pembelajaran BSKAP 046/2025' },
  { value: 'cp2026', label: 'Pendidikan Agama', detail: 'Capaian Pembelajaran BKPDM No. 020 Tahun 2026' },
] as const

// Batas panjang deskripsi TP di aplikasi e-Rapor.
export const ERAPOR_MAX = 100

export function mapelOptions(bank: TpBank | null, cp: string, kelas: number, semester: number): string[] {
  return Object.keys(bank?.[cp]?.[String(kelas)]?.[String(semester)] || {})
}

export function tpList(bank: TpBank | null, cp: string, kelas: number, semester: number, mapel: string): string[] {
  return [...(bank?.[cp]?.[String(kelas)]?.[String(semester)]?.[mapel] || [])]
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

// Cocokkan nama mapel di Wkelas dengan nama di bank (mis. "PJOK", "IPAS", "Pendidikan Pancasila").
export function matchMapel(options: string[], wkelasNama: string): string | null {
  const n = norm(wkelasNama)
  if (!n) return null
  const alias: Record<string, string> = { 'ppkn': 'pendidikan pancasila', 'pkn': 'pendidikan pancasila', 'ipa': 'ipas', 'ips': 'ipas', 'pai': 'pendidikan agama islam dan budi pekerti', 'agama islam': 'pendidikan agama islam dan budi pekerti', 'penjas': 'pjok', 'b indonesia': 'bahasa indonesia', 'b inggris': 'bahasa inggris', 'seni budaya': 'seni rupa' }
  const target = alias[n] || n
  return options.find(o => norm(o) === target)
    || options.find(o => norm(o).startsWith(target) || target.startsWith(norm(o)))
    || options.find(o => norm(o).includes(target))
    || null
}

export function lengthStatus(tp: string): 'ok' | 'panjang' {
  return tp.trim().length <= ERAPOR_MAX ? 'ok' : 'panjang'
}
