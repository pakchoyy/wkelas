// Logika murni untuk folder Dokumen Pak Choy (tanpa akses jaringan, mudah diuji).
export type ChoyFolder = { id: string; parent_id: string | null; name: string; sort_order: number; created_at: string }
export const MAX_FOLDER_DEPTH = 6

export function validateFolderName(name: string): string {
  const clean = name.trim().replace(/\s+/g, ' ')
  if (!clean) throw new Error('Isi nama folder.')
  if (clean.length > 120) throw new Error('Nama folder maksimal 120 karakter.')
  return clean
}

export function validateLinkUrl(url: string): string {
  const clean = url.trim()
  if (!/^https:\/\/[^\s]+$/.test(clean) || clean.length > 1000) throw new Error('Link harus diawali https:// dan tanpa spasi.')
  try { new URL(clean) } catch { throw new Error('Link tidak valid.') }
  return clean
}

const byName = (a: ChoyFolder, b: ChoyFolder) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, 'id', { numeric: true })

export function childFolders(folders: ChoyFolder[], parentId: string | null): ChoyFolder[] {
  return folders.filter(folder => folder.parent_id === parentId).sort(byName)
}

// Dari folder paling atas sampai folder terpilih. Aman terhadap data rusak (putaran).
export function folderPath(folders: ChoyFolder[], id: string | null): ChoyFolder[] {
  const byId = new Map(folders.map(folder => [folder.id, folder]))
  const path: ChoyFolder[] = []
  const seen = new Set<string>()
  for (let current = id ? byId.get(id) : undefined; current && !seen.has(current.id); current = current.parent_id ? byId.get(current.parent_id) : undefined) {
    seen.add(current.id)
    path.unshift(current)
  }
  return path
}

export function pathLabel(folders: ChoyFolder[], id: string | null): string {
  return id ? folderPath(folders, id).map(folder => folder.name).join(' › ') : 'Paling atas'
}

// Semua folder beserta label jalurnya, untuk pilihan "pindahkan ke folder".
export function folderOptions(folders: ChoyFolder[]): { id: string | null; label: string }[] {
  const options: { id: string | null; label: string }[] = [{ id: null, label: 'Paling atas' }]
  const walk = (parent: string | null) => {
    for (const folder of childFolders(folders, parent)) {
      options.push({ id: folder.id, label: pathLabel(folders, folder.id) })
      walk(folder.id)
    }
  }
  walk(null)
  return options
}

// Folder yang terlihat guru: hanya yang (termasuk subfoldernya) berisi item terbit.
export function visibleFolderIds(folders: ChoyFolder[], items: { folder_id: string | null; published: boolean }[]): Set<string> {
  const byId = new Map(folders.map(folder => [folder.id, folder]))
  const visible = new Set<string>()
  for (const item of items) {
    if (!item.published) continue
    const seen = new Set<string>()
    for (let current = item.folder_id ? byId.get(item.folder_id) : undefined; current && !seen.has(current.id); current = current.parent_id ? byId.get(current.parent_id) : undefined) {
      seen.add(current.id)
      visible.add(current.id)
    }
  }
  return visible
}

export function isFolderEmpty(folders: ChoyFolder[], items: { folder_id: string | null }[], id: string): boolean {
  return !folders.some(folder => folder.parent_id === id) && !items.some(item => item.folder_id === id)
}

// Keterangan jenis link yang ramah dibaca guru (pengganti tulisan "Link").
export function linkKind(url: string | null | undefined): string {
  if (!url) return 'Link'
  let host = ''
  try { host = new URL(url).hostname.replace(/^www\./, '') } catch { return 'Link' }
  if (host === 'drive.google.com') return /\/folders\//.test(url) ? 'Folder Google Drive' : 'File Google Drive'
  if (host === 'docs.google.com') return 'Dokumen Google'
  if (host === 'youtube.com' || host === 'youtu.be' || host === 'm.youtube.com') return 'Video YouTube'
  if (host === 's.id' || host === 'bit.ly') return 'Tautan unduhan'
  return host
}

// Link publik folder Ref Dokumen (tanpa login).
export function publicFolderUrl(origin: string, folderId: string | null): string {
  return `${origin.replace(/\/+$/, '')}/ref${folderId ? `/${folderId}` : ''}`
}
