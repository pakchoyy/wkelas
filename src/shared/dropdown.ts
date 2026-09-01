export function decodeDropdown(raw?: string): string[] {
  let options: unknown
  try { options = JSON.parse(raw || '[]') } catch { throw new Error('Pilihan dropdown tersimpan tidak valid. Periksa data kolom sebelum mengubahnya.') }
  if (!Array.isArray(options) || options.some(value => typeof value !== 'string')) throw new Error('Pilihan dropdown harus berupa daftar teks.')
  return options
}
export function dropdownText(raw?: string): string {
  return decodeDropdown(raw).join('\n')
}
export function encodeDropdown(text: string): string {
  const values = text.split(/\r?\n/).map(value => value.trim()).filter(Boolean)
  if (!values.length) throw new Error('Isi minimal satu pilihan dropdown.')
  if (new Set(values).size !== values.length) throw new Error('Pilihan dropdown tidak boleh berulang.')
  return JSON.stringify(values)
}
export function safeDropdownOptions(raw?: string): string[] {
  try { return decodeDropdown(raw) } catch { return [] }
}
