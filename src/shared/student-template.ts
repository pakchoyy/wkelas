import type { SiswaFieldDefinition } from './types'
export function studentTemplateHeaders(fields: SiswaFieldDefinition[]) {
  return ['Nama', 'NIS', 'JK', 'No Absen', ...fields.filter(f => f.is_aktif !== 0).toSorted((a,b) => a.urutan - b.urutan).map(f => f.nama_field)]
}
