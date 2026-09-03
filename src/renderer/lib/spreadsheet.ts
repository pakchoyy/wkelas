import { db } from '../../lib/db'
import { studentTemplateHeaders } from '../../shared/student-template'
import { importStudentRows } from '../../lib/student-import'
import type { SiswaFieldDefinition } from '../../../shared/types'

async function getXLSX(): Promise<typeof import('xlsx')> {
  return await import('xlsx')
}

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

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return value.toISOString().split('T')[0]
  return String(value).trim()
}

export async function downloadTemplate(fields: SiswaFieldDefinition[]): Promise<void> {
  const XLSX = await getXLSX()
  const header = studentTemplateHeaders(fields)
  const sheet = XLSX.utils.aoa_to_sheet([header])
  sheet['!cols'] = [
    { wch: 22 }, { wch: 12 }, { wch: 6 }, { wch: 10 },
    ...header.slice(4).map(() => ({ wch: 20 })),
  ]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, sheet, 'Siswa')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Petunjuk'],['Isi siswa pada sheet Siswa. NIS sebaiknya disimpan sebagai teks agar nol awal tetap ada.'],['JK: L atau P. Tanggal: YYYY-MM-DD. Baris dengan NIS yang sudah ada akan dilewati.']]), 'Petunjuk')
  XLSX.writeFile(wb, 'template-import-siswa.xlsx')
}

export interface ImportResult {
  ok: number
  dilewati?: number
  gagal: number
  total: number
  pesan: string[]
}

function rowToStrings(row: unknown[]): string[] {
  return row.map(cellToString)
}

export async function importRows(rows: string[][], fields: SiswaFieldDefinition[], kelasId: number): Promise<ImportResult> {
  return importStudentRows(db, rows, fields, kelasId)
}

export async function readStudentFile(file: File): Promise<string[][]> {
  const extension = file.name.split('.').pop()?.toLowerCase()
  if (extension === 'csv') return parseCSV(await file.text())
  if (!['xlsx','xls'].includes(extension || '')) throw new Error('Gunakan file Excel atau CSV.')
  const XLSX = await getXLSX()
  const workbook = XLSX.read(await file.arrayBuffer(), {type:'array'})
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  return XLSX.utils.sheet_to_json<unknown[]>(sheet,{header:1,defval:'',raw:false}).map(rowToStrings)
}

export function importSiswaCSV(
  text: string,
  fields: SiswaFieldDefinition[],
  kelasId: number
): Promise<ImportResult> {
  return importRows(parseCSV(text), fields, kelasId)
}

export async function importSiswaXLSX(
  buffer: ArrayBuffer,
  fields: SiswaFieldDefinition[],
  kelasId: number
): Promise<ImportResult> {
  const XLSX = await getXLSX()
  const wb = XLSX.read(buffer, { type: 'array' })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '', raw: false })
  return importRows(raw.map(rowToStrings), fields, kelasId)
}
