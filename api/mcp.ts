// MCP admin untuk Dokumen Pak Choy (folder, file, link). Endpoint: /api/mcp
// Autentikasi: Authorization: Bearer <MCP_ADMIN_TOKEN>, atau ?token=<MCP_ADMIN_TOKEN> di alamat konektor.
// Butuh env Vercel: MCP_ADMIN_TOKEN, SUPABASE_SERVICE_ROLE_KEY, dan SUPABASE_URL (atau VITE_SUPABASE_URL).
// File ini sengaja berdiri sendiri (tanpa impor relatif) agar aman dibundel oleh Vercel.
import { createClient } from '@supabase/supabase-js'

// ---------- Tipe & aturan ----------
export type Folder = { id: string; parent_id: string | null; name: string; sort_order: number }
export type Item = {
  id: string; title: string; category: string; description: string; target_grades: number[]
  file_path: string | null; file_name: string | null; file_size: number | null
  link_url: string | null; folder_id: string | null; published: boolean
}
export interface Store {
  folders(): Promise<Folder[]>
  items(): Promise<Item[]>
  createFolder(parentId: string | null, name: string): Promise<Folder>
  updateFolder(id: string, patch: { name?: string; parent_id?: string | null }): Promise<void>
  deleteFolder(id: string): Promise<void>
  addLink(input: { title: string; description: string; url: string; folderId: string | null; published: boolean }): Promise<Item>
  addFile(input: { title: string; description: string; category: string; grades: number[]; folderId: string | null; fileName: string; bytes: Uint8Array; contentType: string; published: boolean }): Promise<Item>
  updateItem(id: string, patch: Partial<Pick<Item, 'title' | 'description' | 'folder_id' | 'published' | 'link_url'>>): Promise<void>
  deleteItem(item: Item): Promise<void>
}

const CATEGORIES = ['CP', 'ATP', 'Prota', 'Promes', 'RPM', 'Modul Ajar', 'LKPD', 'Lainnya']
const EXTENSIONS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'zip', 'png', 'jpg', 'jpeg', 'webp']
const MAX_BYTES = 20 * 1024 * 1024
const MAX_BASE64_BYTES = 3 * 1024 * 1024 // batas muatan permintaan Vercel; file besar pakai add_file_from_url
const MAX_DEPTH = 6
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

class UserError extends Error {}
const fail = (message: string): never => { throw new UserError(message) }

const cleanName = (name: string) => {
  const clean = String(name ?? '').trim().replace(/\s+/g, ' ')
  if (!clean) fail('Nama folder tidak boleh kosong.')
  if (clean.length > 120) fail('Nama folder maksimal 120 karakter.')
  return clean
}
const cleanTitle = (title: string) => {
  const clean = String(title ?? '').trim()
  if (!clean || clean.length > 160) fail('Judul wajib diisi, maksimal 160 karakter.')
  return clean
}
const cleanDescription = (value: unknown) => {
  const text = String(value ?? '').trim()
  if (text.length > 2000) fail('Deskripsi maksimal 2.000 karakter.')
  return text
}
export function cleanUrl(url: string): string {
  const clean = String(url ?? '').trim()
  if (!/^https:\/\/[^\s]+$/.test(clean) || clean.length > 1000) fail('Link harus diawali https:// dan tanpa spasi.')
  try { new URL(clean) } catch { fail('Link tidak valid.') }
  return clean
}

// Jalur dipecah dengan "/" atau ">" (nama folder tidak boleh memuat keduanya).
export function splitPath(path: unknown): string[] {
  const raw = String(path ?? '').trim()
  if (!raw || raw === '/' ) return []
  const parts = raw.split(/\s*[/>›]\s*/).map(part => part.trim().replace(/\s+/g, ' ')).filter(Boolean)
  if (parts.length > MAX_DEPTH) fail(`Jalur terlalu dalam (maksimal ${MAX_DEPTH} tingkat).`)
  return parts
}
const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()
export function findFolder(folders: Folder[], parts: string[]): Folder | null {
  let current: Folder | null = null
  for (const part of parts) {
    const next: Folder | undefined = folders.find(folder => folder.parent_id === (current?.id ?? null) && same(folder.name, part))
    if (!next) return null
    current = next
  }
  return current
}
export function pathOf(folders: Folder[], id: string | null): string {
  const names: string[] = []
  const seen = new Set<string>()
  for (let cur = id ? folders.find(f => f.id === id) : undefined; cur && !seen.has(cur.id); cur = cur.parent_id ? folders.find(f => f.id === cur!.parent_id) : undefined) {
    seen.add(cur.id); names.unshift(cur.name)
  }
  return names.join(' / ')
}
const depthOf = (folders: Folder[], id: string | null) => { let d = 0; const seen = new Set<string>(); for (let cur = id ? folders.find(f => f.id === id) : undefined; cur && !seen.has(cur.id); cur = cur.parent_id ? folders.find(f => f.id === cur!.parent_id) : undefined) { seen.add(cur.id); d++ } return d }
async function resolveFolder(store: Store, path: unknown, create = false): Promise<{ folder: Folder | null; folders: Folder[] }> {
  const parts = splitPath(path)
  let folders = await store.folders()
  let current: Folder | null = null
  for (const part of parts) {
    let next: Folder | undefined = folders.find(f => f.parent_id === (current?.id ?? null) && same(f.name, part))
    if (!next) {
      if (!create) fail(`Folder “${pathOf(folders, current?.id ?? null) ? pathOf(folders, current?.id ?? null) + ' / ' : ''}${part}” tidak ditemukan. Buat dulu dengan create_folder.`)
      if (depthOf(folders, current?.id ?? null) >= MAX_DEPTH) fail(`Folder terlalu dalam (maksimal ${MAX_DEPTH} tingkat).`)
      next = await store.createFolder(current?.id ?? null, cleanName(part))
      folders = [...folders, next]
    }
    current = next
  }
  return { folder: current, folders }
}

// ---------- Unduh file dari link ----------
function blockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, '')
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.internal') || h.endsWith('.local')) return true
  if (/^(127\.|10\.|0\.|169\.254\.|192\.168\.)/.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true
  if (h === '::1' || h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe80')) return true
  return false
}
// Tautan berbagi Google Drive -> tautan unduh langsung.
export function directUrl(url: string): string {
  const m = url.match(/^https:\/\/drive\.google\.com\/file\/d\/([\w-]+)/) || url.match(/^https:\/\/drive\.google\.com\/open\?id=([\w-]+)/)
  return m ? `https://drive.google.com/uc?export=download&id=${m[1]}` : url
}
const MIME: Record<string, string> = { pdf: 'application/pdf', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', zip: 'application/zip', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' }
const extFromMime = (type: string) => Object.entries(MIME).find(([, mime]) => mime === type.split(';')[0].trim().toLowerCase())?.[0]
const extOf = (name: string) => name.split('?')[0].split('.').pop()?.toLowerCase() || ''
export function fileExtension(fileName: string, size: number, fallbackMime = ''): string {
  const ext = EXTENSIONS.includes(extOf(fileName)) ? extOf(fileName) : (extFromMime(fallbackMime) || '')
  if (!EXTENSIONS.includes(ext)) fail('Jenis file tidak didukung. Gunakan PDF, Word, Excel, PowerPoint, gambar, atau ZIP.')
  if (size <= 0 || size > MAX_BYTES) fail('Ukuran file harus lebih dari 0 dan maksimal 20 MB.')
  return ext
}
async function download(url: string, fetchImpl: typeof fetch): Promise<{ bytes: Uint8Array; fileName: string; contentType: string }> {
  const target = new URL(directUrl(cleanUrl(url)))
  if (blockedHost(target.hostname)) fail('Alamat itu tidak diizinkan.')
  const response = await fetchImpl(target.href, { redirect: 'follow', signal: AbortSignal.timeout(25_000) })
  if (!response.ok) fail(`File gagal diunduh dari link (kode ${response.status}). Pastikan link bisa dibuka siapa saja.`)
  if (blockedHost(new URL(response.url || target.href).hostname)) fail('Alamat tujuan tidak diizinkan.')
  const declared = Number(response.headers.get('content-length') || 0)
  if (declared > MAX_BYTES) fail('Ukuran file maksimal 20 MB.')
  const type = response.headers.get('content-type') || ''
  if (/text\/html/i.test(type)) fail('Link mengarah ke halaman web, bukan file. Untuk Google Drive, bagikan file dengan "siapa saja yang memiliki link".')
  const bytes = new Uint8Array(await response.arrayBuffer())
  const disposition = response.headers.get('content-disposition') || ''
  const named = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1] ? decodeURIComponent(disposition.match(/filename\*=UTF-8''([^;]+)/i)![1]) : disposition.match(/filename="?([^";]+)"?/i)?.[1]
  const fileName = named || decodeURIComponent(new URL(response.url || target.href).pathname.split('/').pop() || 'dokumen')
  return { bytes, fileName, contentType: type }
}

// ---------- Alat ----------
type Args = Record<string, unknown>
type Tool = { name: string; description: string; inputSchema: Record<string, unknown>; run: (store: Store, args: Args, env: Env) => Promise<string> }
type Env = { fetch: typeof fetch }

const str = (extra: Record<string, unknown> = {}) => ({ type: 'string', ...extra })
const folderPathProp = { folder_path: str({ description: 'Jalur folder, mis. "Modul/Kelas 1". Kosong = tingkat paling atas. Folder yang belum ada dibuat otomatis.' }) }

const grades = (value: unknown): number[] => {
  if (value == null) return []
  const list = Array.isArray(value) ? value : [value]
  const out = [...new Set(list.map(Number))].sort()
  if (out.some(g => !Number.isInteger(g) || g < 1 || g > 6)) fail('Kelas harus angka 1 sampai 6.')
  return out
}
const findItem = async (store: Store, id: unknown): Promise<Item> => {
  const key = String(id ?? '').trim()
  if (!UUID.test(key)) fail('Isi id item (lihat hasil list_folder).')
  return (await store.items()).find(item => item.id === key) ?? fail('Item tidak ditemukan.')
}
const line = (item: Item, _folders: Folder[]) => `- [${item.link_url ? 'link' : 'file'}] ${item.title} (id: ${item.id})${item.published ? '' : ' [DRAFT]'}${item.link_url ? ` → ${item.link_url}` : item.file_name ? ` · ${item.file_name}` : ''}`

export const TOOLS: Tool[] = [
  {
    name: 'tree',
    description: 'Tampilkan seluruh struktur folder beserta jumlah item di tiap folder.',
    inputSchema: { type: 'object', properties: {} },
    run: async store => {
      const [folders, items] = await Promise.all([store.folders(), store.items()])
      const out: string[] = []
      const walk = (parent: string | null, depth: number) => {
        for (const folder of folders.filter(f => f.parent_id === parent).sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, 'id', { numeric: true }))) {
          out.push(`${'  '.repeat(depth)}📁 ${folder.name} (${items.filter(i => i.folder_id === folder.id).length} item)`)
          walk(folder.id, depth + 1)
        }
      }
      walk(null, 0)
      const root = items.filter(i => !i.folder_id).length
      return (out.length ? out.join('\n') : 'Belum ada folder.') + `\n\nItem di tingkat paling atas: ${root}`
    },
  },
  {
    name: 'list_folder',
    description: 'Lihat isi satu folder: subfolder, file, dan link (dengan id untuk diubah/dihapus). Tanpa folder_path = tingkat paling atas.',
    inputSchema: { type: 'object', properties: { ...folderPathProp } },
    run: async (store, args) => {
      const { folder, folders } = await resolveFolder(store, args.folder_path)
      const items = (await store.items()).filter(i => (i.folder_id ?? null) === (folder?.id ?? null))
      const subs = folders.filter(f => f.parent_id === (folder?.id ?? null))
      const head = `Folder: ${folder ? pathOf(folders, folder.id) : 'paling atas'}`
      return [head, subs.length ? 'Subfolder:\n' + subs.map(s => `- 📁 ${s.name}`).join('\n') : 'Subfolder: (kosong)', items.length ? 'Isi:\n' + items.map(i => line(i, folders)).join('\n') : 'Isi: (kosong)'].join('\n')
    },
  },
  {
    name: 'create_folder',
    description: 'Buat folder, termasuk bertingkat sekaligus. Contoh path "Modul/Kelas 1/Semester 1". Aman diulang: folder yang sudah ada dilewati.',
    inputSchema: { type: 'object', required: ['path'], properties: { path: str({ description: 'Jalur folder lengkap.' }) } },
    run: async (store, args) => {
      const parts = splitPath(args.path)
      if (!parts.length) fail('Isi path folder.')
      const { folder, folders } = await resolveFolder(store, args.path, true)
      return `Folder siap: ${pathOf(folders, folder!.id)}`
    },
  },
  {
    name: 'rename_folder',
    description: 'Ganti nama folder.',
    inputSchema: { type: 'object', required: ['path', 'new_name'], properties: { path: str(), new_name: str() } },
    run: async (store, args) => {
      const { folder } = await resolveFolder(store, args.path)
      if (!folder) fail('Isi path folder yang mau diganti namanya.')
      await store.updateFolder(folder!.id, { name: cleanName(String(args.new_name)) })
      return `Folder diganti namanya menjadi “${cleanName(String(args.new_name))}”.`
    },
  },
  {
    name: 'move_folder',
    description: 'Pindahkan folder (beserta isinya) ke folder lain. to_path kosong = pindah ke tingkat paling atas.',
    inputSchema: { type: 'object', required: ['path'], properties: { path: str(), to_path: str({ description: 'Folder tujuan.' }) } },
    run: async (store, args) => {
      const { folder } = await resolveFolder(store, args.path)
      if (!folder) fail('Isi path folder yang mau dipindah.')
      const { folder: target, folders } = await resolveFolder(store, args.to_path)
      await store.updateFolder(folder!.id, { parent_id: target?.id ?? null })
      return `Folder dipindah ke: ${target ? pathOf(folders, target.id) : 'paling atas'}`
    },
  },
  {
    name: 'delete_folder',
    description: 'Hapus folder. Hanya bisa bila folder kosong (tanpa file, link, atau subfolder).',
    inputSchema: { type: 'object', required: ['path'], properties: { path: str() } },
    run: async (store, args) => {
      const { folder, folders } = await resolveFolder(store, args.path)
      if (!folder) fail('Isi path folder yang mau dihapus.')
      const items = await store.items()
      if (folders.some(f => f.parent_id === folder!.id) || items.some(i => i.folder_id === folder!.id)) fail('Folder masih berisi file, link, atau subfolder. Kosongkan dulu.')
      await store.deleteFolder(folder!.id)
      return `Folder “${folder!.name}” dihapus.`
    },
  },
  {
    name: 'add_link',
    description: 'Tambah link (https) ke sebuah folder. Langsung terbit kecuali published=false.',
    inputSchema: { type: 'object', required: ['title', 'url'], properties: { ...folderPathProp, title: str(), url: str({ description: 'Alamat https://...' }), description: str(), published: { type: 'boolean' } } },
    run: async (store, args) => {
      const { folder, folders } = await resolveFolder(store, args.folder_path, true)
      const item = await store.addLink({ title: cleanTitle(String(args.title)), description: cleanDescription(args.description), url: cleanUrl(String(args.url)), folderId: folder?.id ?? null, published: args.published !== false })
      return `Link ditambahkan di ${folder ? pathOf(folders, folder.id) : 'paling atas'}: ${item.title} (id: ${item.id})`
    },
  },
  {
    name: 'add_file_from_url',
    description: 'Ambil file dari sebuah link lalu simpan ke folder. Cocok untuk file di Google Drive (bagikan "siapa saja yang memiliki link") atau link unduhan langsung. PDF/Word/Excel/PowerPoint/gambar/ZIP, maks 20 MB.',
    inputSchema: { type: 'object', required: ['url'], properties: { ...folderPathProp, url: str(), title: str({ description: 'Judul. Kosong = nama file.' }), description: str(), category: str({ enum: CATEGORIES }), grades: { type: 'array', items: { type: 'integer', minimum: 1, maximum: 6 }, description: 'Khusus kelas tertentu; kosong = semua kelas.' }, published: { type: 'boolean' }, file_name: str({ description: 'Nama file (bila tidak terdeteksi dari link).' }) } },
    run: async (store, args, env) => {
      const got = await download(String(args.url), env.fetch)
      const fileName = String(args.file_name || got.fileName)
      fileExtension(fileName, got.bytes.length, got.contentType)
      const { folder, folders } = await resolveFolder(store, args.folder_path, true)
      const category = args.category ? String(args.category) : 'Lainnya'
      if (!CATEGORIES.includes(category)) fail('Kategori tidak dikenal.')
      const item = await store.addFile({ title: cleanTitle(String(args.title || fileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '))), description: cleanDescription(args.description), category, grades: grades(args.grades), folderId: folder?.id ?? null, fileName, bytes: got.bytes, contentType: got.contentType, published: args.published !== false })
      return `File ditambahkan di ${folder ? pathOf(folders, folder.id) : 'paling atas'}: ${item.title} (${Math.ceil(got.bytes.length / 1024)} KB, id: ${item.id})`
    },
  },
  {
    name: 'add_file_base64',
    description: 'Simpan file kecil (maks ±3 MB) yang isinya dikirim langsung sebagai base64. Untuk file lebih besar gunakan add_file_from_url.',
    inputSchema: { type: 'object', required: ['file_name', 'content_base64'], properties: { ...folderPathProp, file_name: str(), content_base64: str(), title: str(), description: str(), category: str({ enum: CATEGORIES }), grades: { type: 'array', items: { type: 'integer' } }, published: { type: 'boolean' } } },
    run: async (store, args) => {
      const b64 = String(args.content_base64 || '').replace(/^data:[^,]*,/, '').replace(/\s+/g, '')
      if (b64.length > Math.ceil(MAX_BASE64_BYTES * 4 / 3) + 8) fail('File terlalu besar untuk base64 (maks ±3 MB). Pakai add_file_from_url.')
      let bytes: Uint8Array
      try { bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0)) } catch { return fail('Isi base64 tidak valid.') }
      const fileName = String(args.file_name)
      const ext = fileExtension(fileName, bytes.length)
      const { folder, folders } = await resolveFolder(store, args.folder_path, true)
      const category = args.category ? String(args.category) : 'Lainnya'
      if (!CATEGORIES.includes(category)) fail('Kategori tidak dikenal.')
      const item = await store.addFile({ title: cleanTitle(String(args.title || fileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '))), description: cleanDescription(args.description), category, grades: grades(args.grades), folderId: folder?.id ?? null, fileName, bytes, contentType: MIME[ext], published: args.published !== false })
      return `File ditambahkan di ${folder ? pathOf(folders, folder.id) : 'paling atas'}: ${item.title} (${Math.ceil(bytes.length / 1024)} KB, id: ${item.id})`
    },
  },
  {
    name: 'update_item',
    description: 'Ubah judul, deskripsi, status terbit, alamat (untuk link), atau pindahkan item ke folder lain (move_to). Berkas file sendiri tidak bisa diganti; hapus lalu tambah lagi.',
    inputSchema: { type: 'object', required: ['id'], properties: { id: str(), title: str(), description: str(), published: { type: 'boolean' }, url: str(), move_to: str({ description: 'Folder tujuan; kosong "" = paling atas. Dihilangkan = tidak dipindah.' }) } },
    run: async (store, args) => {
      const item = await findItem(store, args.id)
      const patch: Parameters<Store['updateItem']>[1] = {}
      if (args.title !== undefined) patch.title = cleanTitle(String(args.title))
      if (args.description !== undefined) patch.description = cleanDescription(args.description)
      if (args.published !== undefined) patch.published = Boolean(args.published)
      if (args.url !== undefined) { if (!item.link_url) fail('Alamat hanya bisa diubah untuk item link.'); patch.link_url = cleanUrl(String(args.url)) }
      if (args.move_to !== undefined) patch.folder_id = (await resolveFolder(store, args.move_to, true)).folder?.id ?? null
      if (!Object.keys(patch).length) fail('Tidak ada yang diubah.')
      await store.updateItem(item.id, patch)
      return `Item “${patch.title ?? item.title}” diperbarui.`
    },
  },
  {
    name: 'delete_item',
    description: 'Hapus file atau link secara permanen (file ikut dihapus dari penyimpanan).',
    inputSchema: { type: 'object', required: ['id'], properties: { id: str() } },
    run: async (store, args) => {
      const item = await findItem(store, args.id)
      await store.deleteItem(item)
      return `“${item.title}” dihapus.`
    },
  },
]

// ---------- Penyimpanan Supabase ----------
export function supabaseStore(url: string, serviceKey: string): Store {
  const client = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const BUCKET = 'pak-choy-documents'
  const friendly = (error: { code?: string; message?: string } | null, fallback: string) => {
    const msg = `${error?.code || ''} ${error?.message || ''}`
    if (/23505|duplicate|unique/i.test(msg)) return new UserError('Sudah ada folder dengan nama itu di tempat yang sama.')
    if (/23503|foreign key/i.test(msg)) return new UserError('Folder masih berisi file, link, atau subfolder. Kosongkan dulu.')
    if (/terlalu dalam|dirinya sendiri|subfolder/i.test(msg)) return new UserError(error?.message || fallback)
    if (/relation .* does not exist|folder_id|link_url|pak_choy_folders/i.test(msg)) return new UserError('Tabel folder belum ada di Supabase. Jalankan SQL folder dulu.')
    // Pemegang token adalah admin: tampilkan kode/pesan asli supaya penyebab mudah dicari.
    const detail = [error?.code, error?.message].filter(Boolean).join(' ').slice(0, 200)
    console.error('supabase error:', detail)
    return new UserError(detail ? `${fallback} (${detail})` : fallback)
  }
  return {
    async folders() {
      const { data, error } = await client.from('pak_choy_folders').select('id,parent_id,name,sort_order').limit(5000)
      if (error) throw friendly(error, 'Folder gagal dimuat.')
      return data as Folder[]
    },
    async items() {
      const out: Item[] = []
      for (let from = 0; ; from += 500) {
        const { data, error } = await client.from('pak_choy_documents').select('id,title,category,description,target_grades,file_path,file_name,file_size,link_url,folder_id,published').order('created_at').range(from, from + 499)
        if (error) throw friendly(error, 'Daftar dokumen gagal dimuat.')
        out.push(...(data as Item[]))
        if (data.length < 500) return out
      }
    },
    async createFolder(parentId, name) {
      const { data, error } = await client.from('pak_choy_folders').insert({ parent_id: parentId, name }).select('id,parent_id,name,sort_order').single()
      if (error) throw friendly(error, 'Folder belum tersimpan.')
      return data as Folder
    },
    async updateFolder(id, patch) {
      const { error } = await client.from('pak_choy_folders').update(patch).eq('id', id)
      if (error) throw friendly(error, 'Folder belum berubah.')
    },
    async deleteFolder(id) {
      const { error } = await client.from('pak_choy_folders').delete().eq('id', id)
      if (error) throw friendly(error, 'Folder belum terhapus.')
    },
    async addLink({ title, description, url: link, folderId, published }) {
      const { data, error } = await client.from('pak_choy_documents').insert({ title, description, category: 'Lainnya', target_grades: [], link_url: link, folder_id: folderId, published }).select().single()
      if (error) throw friendly(error, 'Link belum tersimpan.')
      return data as Item
    },
    async addFile({ title, description, category, grades: targetGrades, folderId, fileName, bytes, contentType, published }) {
      const id = crypto.randomUUID()
      const ext = extOf(fileName) && EXTENSIONS.includes(extOf(fileName)) ? extOf(fileName) : (extFromMime(contentType) || 'pdf')
      const file_path = `${id}.${ext}`
      const upload = await client.storage.from(BUCKET).upload(file_path, bytes, { contentType: MIME[ext] || contentType || 'application/octet-stream', upsert: false, cacheControl: '0' })
      if (upload.error) throw new UserError('File gagal diunggah ke penyimpanan.')
      const { data, error } = await client.from('pak_choy_documents').insert({ id, title, description, category, target_grades: targetGrades, file_path, file_name: fileName.slice(0, 255), file_size: bytes.length, folder_id: folderId, published }).select().single()
      if (error) {
        await client.storage.from(BUCKET).remove([file_path])
        throw friendly(error, 'Data file belum tersimpan; unggahan dibersihkan.')
      }
      return data as Item
    },
    async updateItem(id, patch) {
      const { error } = await client.from('pak_choy_documents').update(patch).eq('id', id)
      if (error) throw friendly(error, 'Perubahan belum tersimpan.')
    },
    async deleteItem(item) {
      if (item.file_path) {
        // Pengaman database mewajibkan berkas dihapus dari penyimpanan lebih dulu.
        await client.from('pak_choy_documents').update({ published: false }).eq('id', item.id)
        const removed = await client.storage.from(BUCKET).remove([item.file_path])
        if (removed.error) throw new UserError('Berkas gagal dihapus dari penyimpanan. Coba lagi.')
      }
      const { error } = await client.from('pak_choy_documents').delete().eq('id', item.id)
      if (error) throw friendly(error, 'Data belum terhapus. Coba lagi.')
    },
  }
}

// Koneksi dibuat saat pertama dipakai, supaya initialize/tools/list tidak butuh database.
export function lazyStore(factory: () => Store): Store {
  let real: Store | null = null
  const get = () => (real ??= factory())
  return new Proxy({} as Store, { get: (_t, prop) => (...args: unknown[]) => (get() as any)[prop](...args) })
}

// ---------- Protokol MCP (JSON-RPC lewat HTTP) ----------
const SERVER = { name: 'wkelas-dokumen', version: '1.0.0' }
const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, content-type, mcp-session-id, mcp-protocol-version', 'access-control-allow-methods': 'POST, GET, OPTIONS' }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...cors } })

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}
export function authorized(request: Request, token: string | undefined): boolean {
  if (!token || token.length < 24) return false
  const header = request.headers.get('authorization') || ''
  const bearer = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : ''
  const query = new URL(request.url).searchParams.get('token') || ''
  return safeEqual(bearer || query, token)
}

export async function handleRpc(message: any, store: Store, env: Env): Promise<any | null> {
  const id = message?.id
  const reply = (result: unknown) => ({ jsonrpc: '2.0', id, result })
  const error = (code: number, text: string) => ({ jsonrpc: '2.0', id, error: { code, message: text } })
  if (!message || message.jsonrpc !== '2.0' || typeof message.method !== 'string') return error(-32600, 'Permintaan tidak valid.')
  if (id === undefined) return null // notifikasi
  switch (message.method) {
    case 'initialize': return reply({ protocolVersion: message.params?.protocolVersion || '2025-03-26', capabilities: { tools: {} }, serverInfo: SERVER, instructions: 'Kelola folder, file, dan link Dokumen Pak Choy. Mulai dengan tree atau list_folder.' })
    case 'ping': return reply({})
    case 'tools/list': return reply({ tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) })
    case 'tools/call': {
      const tool = TOOLS.find(t => t.name === message.params?.name)
      if (!tool) return error(-32602, 'Alat tidak dikenal.')
      try {
        const text = await tool.run(store, (message.params?.arguments || {}) as Args, env)
        return reply({ content: [{ type: 'text', text }] })
      } catch (e) {
        const text = e instanceof UserError ? e.message : 'Terjadi kesalahan di server. Coba lagi.'
        if (!(e instanceof UserError)) console.error('mcp tool error', tool.name, e instanceof Error ? e.message : e)
        return reply({ content: [{ type: 'text', text }], isError: true })
      }
    }
    default: return error(-32601, 'Metode tidak dikenal.')
  }
}

export async function handleRequest(request: Request, deps: { token?: string; store: () => Store; fetch?: typeof fetch }): Promise<Response> {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (!authorized(request, deps.token)) return json({ error: 'Tidak diizinkan.' }, 401)
  if (request.method === 'GET') return json({ error: 'Gunakan POST.' }, 405)
  if (request.method !== 'POST') return json({ error: 'Metode tidak didukung.' }, 405)
  let body: any
  try { body = await request.json() } catch { return json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'JSON tidak valid.' } }, 400) }
  const env: Env = { fetch: deps.fetch ?? fetch }
  const batch = Array.isArray(body)
  const messages = batch ? body : [body]
  if (messages.length > 20) return json({ error: 'Terlalu banyak permintaan sekaligus.' }, 400)
  const store = lazyStore(deps.store)
  const results = (await Promise.all(messages.map((m: unknown) => handleRpc(m, store, env)))).filter(r => r !== null)
  if (!results.length) return new Response(null, { status: 202, headers: cors })
  return json(batch ? results : results[0])
}

const procEnv = (): Record<string, string | undefined> => (globalThis as any).process?.env ?? {}
async function entry(request: Request): Promise<Response> {
  const env = procEnv()
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL
  const key = env.SUPABASE_SERVICE_ROLE_KEY
  return handleRequest(request, {
    token: env.MCP_ADMIN_TOKEN,
    store: () => {
      if (!url || !key) throw new UserError('Server belum dikonfigurasi (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).')
      return supabaseStore(url, key)
    },
  })
}
export const POST = entry
export const GET = entry
export const OPTIONS = entry
export const maxDuration = 60
