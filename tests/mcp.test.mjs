import test from 'node:test'
import assert from 'node:assert/strict'
import { authorized, directUrl, findFolder, handleRequest, handleRpc, splitPath, TOOLS } from '../api/mcp.ts'

const TOKEN = 'a'.repeat(48)

// Penyimpanan tiruan di memori dengan aturan yang sama seperti database asli.
function memoryStore() {
  let n = 0
  const folders = [], items = [], files = new Map()
  const db = { folders, items, files }
  const depth = id => { let d = 0; for (let c = folders.find(f => f.id === id); c; c = folders.find(f => f.id === c.parent_id)) d++; return d }
  return {
    db,
    folders: async () => folders.map(f => ({ ...f })),
    items: async () => items.map(i => ({ ...i })),
    createFolder: async (parent_id, name) => {
      if (folders.some(f => f.parent_id === parent_id && f.name.toLowerCase() === name.toLowerCase())) throw Object.assign(new Error('Sudah ada folder dengan nama itu di tempat yang sama.'), { name: 'UserError' })
      const row = { id: `f${++n}`, parent_id, name, sort_order: 0 }
      folders.push(row); return row
    },
    updateFolder: async (id, patch) => { Object.assign(folders.find(f => f.id === id), patch) },
    deleteFolder: async id => { folders.splice(folders.findIndex(f => f.id === id), 1) },
    addLink: async ({ title, description, url, folderId, published }) => { const row = { id: `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`, title, description, category: 'Lainnya', target_grades: [], file_path: null, file_name: null, file_size: null, link_url: url, folder_id: folderId, published }; items.push(row); return row },
    addFile: async ({ title, description, category, grades, folderId, fileName, bytes, published }) => { const id = `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`; const row = { id, title, description, category, target_grades: grades, file_path: `${id}.pdf`, file_name: fileName, file_size: bytes.length, link_url: null, folder_id: folderId, published }; items.push(row); files.set(row.file_path, bytes); return row },
    updateItem: async (id, patch) => { Object.assign(items.find(i => i.id === id), patch) },
    deleteItem: async item => { files.delete(item.file_path); items.splice(items.findIndex(i => i.id === item.id), 1) },
  }
}
const env = (fetchImpl) => ({ fetch: fetchImpl || (async () => { throw new Error('tidak ada jaringan di test') }) })
const call = async (store, name, args, fetchImpl) => {
  const res = await handleRpc({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }, store, env(fetchImpl))
  return { text: res.result.content[0].text, error: !!res.result.isError }
}
const pdf = (size = 1000) => new Uint8Array(size).fill(37)
const fakeFetch = (body, headers = {}, status = 200, url = 'https://files.example.com/a.pdf') => async () => ({ ok: status < 400, status, url, headers: new Headers(headers), arrayBuffer: async () => body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength) })

test('token is required via bearer header or ?token=, and short tokens are never accepted', () => {
  const req = (headers = {}, query = '') => new Request(`https://x.test/api/mcp${query}`, { method: 'POST', headers })
  assert.equal(authorized(req({ authorization: `Bearer ${TOKEN}` }), TOKEN), true)
  assert.equal(authorized(req({}, `?token=${TOKEN}`), TOKEN), true)
  assert.equal(authorized(req({ authorization: 'Bearer salah' }), TOKEN), false)
  assert.equal(authorized(req(), TOKEN), false)
  assert.equal(authorized(req({ authorization: 'Bearer abc' }), 'abc'), false, 'token pendek tidak diterima')
  assert.equal(authorized(req({ authorization: `Bearer ${TOKEN}` }), undefined), false)
})

test('HTTP layer: 401 without token, JSON-RPC handshake and tool list with token', async () => {
  const deps = { token: TOKEN, store: () => memoryStore() }
  const post = (body, headers = {}) => handleRequest(new Request('https://x.test/api/mcp', { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) }), deps)
  assert.equal((await post({ jsonrpc: '2.0', id: 1, method: 'ping' })).status, 401)
  const auth = { authorization: `Bearer ${TOKEN}` }
  const init = await (await post({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26' } }, auth)).json()
  assert.equal(init.result.serverInfo.name, 'wkelas-dokumen')
  assert.equal((await post({ jsonrpc: '2.0', method: 'notifications/initialized' }, auth)).status, 202)
  const list = await (await post({ jsonrpc: '2.0', id: 2, method: 'tools/list' }, auth)).json()
  assert.ok(list.result.tools.length >= 10)
  assert.ok(list.result.tools.every(t => t.inputSchema.type === 'object'))
  assert.equal((await handleRequest(new Request('https://x.test/api/mcp', { method: 'GET', headers: auth }), deps)).status, 405)
})

test('missing database config does not break the handshake', async () => {
  const deps = { token: TOKEN, store: () => { throw new Error('Server belum dikonfigurasi') } }
  const res = await handleRequest(new Request('https://x.test/api/mcp', { method: 'POST', headers: { authorization: `Bearer ${TOKEN}` }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }) }), deps)
  assert.equal(res.status, 200)
})

test('paths split on / or › and are limited in depth', () => {
  assert.deepEqual(splitPath('Modul/Kelas 1'), ['Modul', 'Kelas 1'])
  assert.deepEqual(splitPath(' Modul › Kelas  1 '), ['Modul', 'Kelas 1'])
  assert.deepEqual(splitPath(''), [])
  assert.deepEqual(splitPath('/'), [])
  assert.throws(() => splitPath('a/b/c/d/e/f/g'), /terlalu dalam/)
})

test('create_folder makes nested folders and is idempotent', async () => {
  const s = memoryStore()
  assert.match((await call(s, 'create_folder', { path: 'Modul/Kelas 1/Semester 1' })).text, /Modul \/ Kelas 1 \/ Semester 1/)
  await call(s, 'create_folder', { path: 'modul/kelas 1' })
  assert.equal(s.db.folders.length, 3, 'tidak ada folder ganda')
  assert.equal(findFolder(s.db.folders, ['Modul', 'Kelas 1']).name, 'Kelas 1')
  const tree = (await call(s, 'tree', {})).text
  assert.match(tree, /📁 Modul \(0 item\)\n {2}📁 Kelas 1/)
  assert.equal((await call(s, 'create_folder', { path: '' })).error, true)
})

test('add_link validates https and creates missing folders', async () => {
  const s = memoryStore()
  const ok = await call(s, 'add_link', { folder_path: 'LKPD/Kelas 2', title: ' Video ', url: 'https://youtu.be/abc' })
  assert.equal(ok.error, false)
  assert.equal(s.db.items[0].title, 'Video')
  assert.equal(s.db.items[0].published, true)
  assert.equal((await call(s, 'add_link', { title: 'x', url: 'http://tidak-aman.com' })).error, true)
  assert.equal((await call(s, 'add_link', { title: 'x', url: 'javascript:alert(1)' })).error, true)
  assert.equal((await call(s, 'add_link', { title: '', url: 'https://a.b' })).error, true)
  assert.match((await call(s, 'list_folder', { folder_path: 'LKPD/Kelas 2' })).text, /\[link\] Video/)
})

test('add_file_from_url stores a PDF, derives title and converts Google Drive links', async () => {
  const s = memoryStore()
  let requested = ''
  const fetchImpl = async (url) => { requested = url; return fakeFetch(pdf(2048), { 'content-type': 'application/pdf', 'content-disposition': 'attachment; filename="Modul Ajar_IPA.pdf"' }, 200, url)() }
  const res = await call(s, 'add_file_from_url', { url: 'https://drive.google.com/file/d/AbC123/view?usp=sharing', folder_path: 'Modul/Kelas 1', grades: [1, 1] }, fetchImpl)
  assert.equal(res.error, false, res.text)
  assert.equal(requested, 'https://drive.google.com/uc?export=download&id=AbC123')
  assert.equal(s.db.items[0].title, 'Modul Ajar IPA')
  assert.deepEqual(s.db.items[0].target_grades, [1])
  assert.equal(s.db.items[0].file_size, 2048)
  assert.equal(s.db.files.size, 1)
  assert.equal(directUrl('https://example.com/a.pdf'), 'https://example.com/a.pdf')
})

test('add_file_from_url rejects internal hosts, html pages, oversize and wrong types', async () => {
  const s = memoryStore()
  for (const url of ['https://localhost/a.pdf', 'https://127.0.0.1/a.pdf', 'https://169.254.169.254/latest', 'https://10.0.0.5/a.pdf', 'https://192.168.1.2/a.pdf', 'https://db.internal/a.pdf', 'http://example.com/a.pdf']) {
    assert.equal((await call(s, 'add_file_from_url', { url }, fakeFetch(pdf()))).error, true, url)
  }
  assert.match((await call(s, 'add_file_from_url', { url: 'https://x.test/a' }, fakeFetch(pdf(), { 'content-type': 'text/html' }))).text, /halaman web/)
  assert.match((await call(s, 'add_file_from_url', { url: 'https://x.test/a.pdf' }, fakeFetch(pdf(), { 'content-length': String(25 * 1024 * 1024) }))).text, /20 MB/)
  assert.match((await call(s, 'add_file_from_url', { url: 'https://x.test/virus.exe' }, fakeFetch(pdf(), { 'content-type': 'application/octet-stream' }, 200, 'https://x.test/virus.exe'))).text, /tidak didukung/)
  assert.match((await call(s, 'add_file_from_url', { url: 'https://x.test/a.pdf' }, fakeFetch(pdf(), {}, 404))).text, /404/)
  assert.equal(s.db.items.length, 0, 'tidak ada yang tersimpan saat gagal')
  assert.equal(s.db.folders.length, 0, 'tidak ada folder tertinggal saat gagal')
})

test('add_file_base64 accepts small valid files and rejects bad input', async () => {
  const s = memoryStore()
  const b64 = btoa(String.fromCharCode(...pdf(500)))
  assert.equal((await call(s, 'add_file_base64', { file_name: 'cp.pdf', content_base64: b64, title: 'CP Kelas 1' })).error, false)
  assert.equal(s.db.items[0].file_size, 500)
  assert.equal((await call(s, 'add_file_base64', { file_name: 'cp.exe', content_base64: b64 })).error, true)
  assert.equal((await call(s, 'add_file_base64', { file_name: 'cp.pdf', content_base64: '%%%' })).error, true)
  assert.match((await call(s, 'add_file_base64', { file_name: 'cp.pdf', content_base64: 'A'.repeat(5 * 1024 * 1024) })).text, /terlalu besar/)
  assert.equal((await call(s, 'add_file_base64', { file_name: 'cp.pdf', content_base64: b64, category: 'Ngawur' })).error, true)
})

test('update_item edits, moves and unpublishes; only links can change URL', async () => {
  const s = memoryStore()
  await call(s, 'add_link', { title: 'A', url: 'https://a.b' })
  await call(s, 'add_file_base64', { file_name: 'x.pdf', content_base64: btoa('%PDF-1.4 x'), title: 'F' })
  const [link, file] = s.db.items
  assert.equal((await call(s, 'update_item', { id: link.id, title: 'Baru', published: false, move_to: 'Modul/Kelas 1', url: 'https://c.d' })).error, false)
  assert.equal(s.db.items[0].title, 'Baru'); assert.equal(s.db.items[0].published, false); assert.equal(s.db.items[0].link_url, 'https://c.d')
  assert.equal(s.db.items[0].folder_id, findFolder(s.db.folders, ['Modul', 'Kelas 1']).id)
  await call(s, 'update_item', { id: link.id, move_to: '' })
  assert.equal(s.db.items[0].folder_id, null)
  assert.match((await call(s, 'update_item', { id: file.id, url: 'https://c.d' })).text, /hanya bisa diubah untuk item link/)
  assert.match((await call(s, 'update_item', { id: link.id })).text, /Tidak ada yang diubah/)
  assert.match((await call(s, 'update_item', { id: 'bukan-uuid', title: 'x' })).text, /id item/)
  assert.match((await call(s, 'update_item', { id: '00000000-0000-4000-8000-999999999999', title: 'x' })).text, /tidak ditemukan/)
})

test('delete_item removes the stored file; delete_folder only works when empty', async () => {
  const s = memoryStore()
  await call(s, 'add_file_base64', { folder_path: 'Modul', file_name: 'x.pdf', content_base64: btoa('%PDF-1.4 x') })
  assert.match((await call(s, 'delete_folder', { path: 'Modul' })).text, /masih berisi/)
  await call(s, 'create_folder', { path: 'Modul/Kosong' })
  assert.match((await call(s, 'delete_folder', { path: 'Modul' })).text, /masih berisi/, 'berisi subfolder')
  assert.equal((await call(s, 'delete_folder', { path: 'Modul/Kosong' })).error, false)
  const id = s.db.items[0].id
  assert.equal((await call(s, 'delete_item', { id })).error, false)
  assert.equal(s.db.items.length, 0); assert.equal(s.db.files.size, 0, 'berkas ikut terhapus')
  assert.equal((await call(s, 'delete_folder', { path: 'Modul' })).error, false)
  assert.match((await call(s, 'delete_folder', { path: 'Tidak/Ada' })).text, /tidak ditemukan/)
})

test('rename and move folder work', async () => {
  const s = memoryStore()
  await call(s, 'create_folder', { path: 'Modul/Kelas 1' }); await call(s, 'create_folder', { path: 'LKPD' })
  await call(s, 'rename_folder', { path: 'Modul/Kelas 1', new_name: 'Kelas Satu' })
  assert.ok(findFolder(s.db.folders, ['Modul', 'Kelas Satu']))
  await call(s, 'move_folder', { path: 'Modul/Kelas Satu', to_path: 'LKPD' })
  assert.ok(findFolder(s.db.folders, ['LKPD', 'Kelas Satu']))
  await call(s, 'move_folder', { path: 'LKPD/Kelas Satu' })
  assert.ok(findFolder(s.db.folders, ['Kelas Satu']), 'kembali ke paling atas')
})

test('unexpected errors are hidden from the client', async () => {
  const s = memoryStore()
  s.folders = async () => { throw new Error('connection string postgres://secret') }
  const res = await call(s, 'tree', {})
  assert.equal(res.error, true)
  assert.doesNotMatch(res.text, /secret|postgres/)
})

test('every tool has a name, description and object schema', () => {
  const names = new Set()
  for (const tool of TOOLS) {
    assert.ok(tool.name && tool.description.length > 10 && tool.inputSchema.type === 'object', tool.name)
    assert.ok(!names.has(tool.name), `nama ganda ${tool.name}`); names.add(tool.name)
  }
})
