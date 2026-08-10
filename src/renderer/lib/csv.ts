import type { SiswaFieldDefinition } from '../../../shared/types'

export function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      field = ''
      if (row.some((f) => f.trim() !== '')) rows.push(row)
      row = []
    } else {
      field += c
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    if (row.some((f) => f.trim() !== '')) rows.push(row)
  }
  return rows
}

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

export function buildTemplateCSV(fields: SiswaFieldDefinition[]): string {
  const header = ['Nama', 'NIS', 'JK', 'No Absen', ...fields.map((f) => f.nama_field)]
  const contoh = ['Ahmad Fauzi', '2025001', 'L', '1', ...fields.map(() => 'Isi sesuai field')]
  const rows = [header, contoh]
  return '\uFEFF' + rows.map((r) => r.map(escapeCsv).join(',')).join('\n')
}

export function downloadCSV(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export interface ImportResult {
  ok: number
  gagal: number
  total: number
  pesan: string[]
}

export async function importSiswaCSV(
  text: string,
  fields: SiswaFieldDefinition[],
  kelasId: number
): Promise<ImportResult> {
  const rows = parseCSV(text)
  const pesan: string[] = []

  if (rows.length < 2) {
    return { ok: 0, gagal: 0, total: 0, pesan: ['File kosong atau hanya berisi header.'] }
  }

  const header = rows[0].map((h) => h.trim().toLowerCase())
  const colNama = header.indexOf('nama')
  const colNis = header.indexOf('nis')
  const colJk = header.findIndex((h) => h === 'jk' || h === 'jenis kelamin' || h === 'jenis_kelamin')
  const colAbsen = header.findIndex((h) => h === 'no absen' || h === 'no_absen' || h === 'nomor absen')
  const fieldCols = fields
    .map((f) => ({ field: f, col: header.indexOf(f.nama_field.toLowerCase()) }))
    .filter((x) => x.col >= 0)

  if (colNama < 0) {
    return { ok: 0, gagal: 0, total: 0, pesan: ['Kolom "Nama" tidak ditemukan pada file. Pastikan template tidak diubah.'] }
  }

  let ok = 0
  let gagal = 0

  for (const row of rows.slice(1)) {
    const nama = (row[colNama] || '').trim()
    if (!nama) continue
    try {
      const data: Record<string, unknown> = { kelas_id: kelasId, nama }
      if (colNis >= 0) data.nis = (row[colNis] || '').trim() || null
      if (colJk >= 0) {
        const jk = (row[colJk] || '').trim().toUpperCase().slice(0, 1)
        data.jenis_kelamin = jk === 'L' || jk === 'P' ? jk : null
      }
      if (colAbsen >= 0) {
        const n = parseInt(row[colAbsen] || '', 10)
        data.no_absen = isNaN(n) ? null : n
      }

      const saved = await window.electronAPI.siswa.create(data)
      for (const { field, col } of fieldCols) {
        const nilai = (row[col] || '').trim()
        if (nilai) await window.electronAPI.fieldVal.set(saved.id, field.id, nilai)
      }
      ok++
    } catch {
      gagal++
    }
  }

  if (gagal > 0) pesan.push(`${gagal} baris gagal diimpor.`)
  if (ok === 0) pesan.push('Tidak ada siswa yang berhasil diimpor.')
  return { ok, gagal, total: rows.length - 1, pesan }
}
