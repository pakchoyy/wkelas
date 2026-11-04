import test from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

await import('fake-indexeddb/auto')
registerHooks({resolve(specifier,context,next) {
  if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) {
    const url = new URL(specifier,context.parentURL)
    if (!/\.[a-z]+$/i.test(url.pathname) && existsSync(fileURLToPath(url)+'.ts')) return next(url.href+'.ts',context)
  }
  return next(specifier,context)
}})
const { decideAutoSync } = await import('../src/lib/cloud-sync.ts')
const synced = { enabled: true, lastFingerprint: 'a', lastSyncAt: 't', remoteAt: 'r1' }

test('auto sync never overwrites data pushed by another device', () => {
  assert.equal(decideAutoSync({ ...synced, enabled: false }, 'b', 'r1'), 'disabled')
  assert.equal(decideAutoSync(synced, 'b', 'r2'), 'remote-newer')
  assert.equal(decideAutoSync(synced, 'a', 'r1'), 'unchanged')
  assert.equal(decideAutoSync(synced, 'b', 'r1'), 'push')
  assert.equal(decideAutoSync(synced, 'b', null), 'push')
})

function fakeCloud() {
  let row = null, n = 0
  const tick = () => `2026-11-04T10:00:0${++n}.000000+00:00`
  return {
    get row() { return row },
    rpc: async (name, args) => {
      if (name !== 'push_user_data') return { data: null, error: { code: 'PGRST202', message: 'not found' } }
      if (row && (!args.p_expected || Date.parse(args.p_expected) !== Date.parse(row.updated_at))) return { data: null, error: { code: 'P0001', message: 'SYNC_CONFLICT' } }
      row = { data: args.p_data, fingerprint: args.p_fingerprint, updated_at: tick() }
      return { data: row.updated_at, error: null }
    },
    from: () => ({ select: cols => ({ eq: () => ({ maybeSingle: async () => ({ data: row && Object.fromEntries(cols.split(',').map(c => [c, row[c]])), error: null }) }) }) }),
  }
}

function fakeBrowser() {
  const store = new Map()
  Object.defineProperty(globalThis, 'localStorage', {configurable:true, value:{getItem:k=>store.get('ls:'+k) ?? null,setItem:(k,v)=>store.set('ls:'+k,String(v)),removeItem:k=>store.delete('ls:'+k)}})
  globalThis.window ??= globalThis
  globalThis.window.dispatchEvent ??= () => true
}

test('push then pull on another device restores data, without uploading document bytes', async () => {
  fakeBrowser()
  const client = fakeCloud()
  const { db, setAccount } = await import('../src/lib/db.ts')
  const { pushSnapshot, pullSnapshot, readSyncState } = await import('../src/lib/cloud-sync.ts')
  setAccount('guru-a')
  await db.todo.add({ judul: 'dari laptop', prioritas: 'normal', created_at: 'x', updated_at: 'x' })
  await db.dokumen_saya.add({ judul: 'RPP', file_data: new Uint8Array([1, 2, 3]), ukuran_file: 3, created_at: 'x', updated_at: 'x' })
  const pushed = await pushSnapshot(client, 'uid-1')
  assert.equal(pushed.enabled, true)
  assert.equal(pushed.remoteAt, client.row.updated_at)
  assert.equal(client.row.data.tables.dokumen_saya[0].judul, 'RPP')
  assert.equal('file_data' in client.row.data.tables.dokumen_saya[0], false, 'document bytes must stay on device')
  // Same device pulls: metadata from cloud, bytes kept locally.
  assert.equal(await pullSnapshot(client, 'uid-1', () => true), true)
  assert.deepEqual([...(await db.dokumen_saya.toArray())[0].file_data], [1, 2, 3])
  await db.delete()

  setAccount('guru-b')
  assert.equal(await db.todo.count(), 0)
  assert.equal(await pullSnapshot(client, 'uid-1', () => true), true)
  assert.equal((await db.todo.toArray())[0].judul, 'dari laptop')
  assert.equal((await db.dokumen_saya.toArray())[0].file_data, undefined)
  assert.equal(readSyncState('uid-1').remoteAt, client.row.updated_at)
  await db.delete()
  setAccount(null)
})

test('a stale device cannot overwrite newer cloud data unless forced', async () => {
  fakeBrowser()
  const client = fakeCloud()
  const { db, setAccount } = await import('../src/lib/db.ts')
  const { pushSnapshot, autoSync, SyncConflictError, readSyncState } = await import('../src/lib/cloud-sync.ts')
  setAccount('guru-c')
  await db.todo.add({ judul: 'A', prioritas: 'normal', created_at: 'x', updated_at: 'x' })
  await pushSnapshot(client, 'uid-2')
  // Another device writes; this device still knows the old version.
  const known = readSyncState('uid-2').remoteAt
  await client.rpc('push_user_data', { p_data: { other: true }, p_fingerprint: 'z', p_expected: known })
  localStorage.setItem('bgy-cloud-sync-uid-2', JSON.stringify({ ...readSyncState('uid-2'), remoteAt: known }))
  await db.todo.add({ judul: 'B', prioritas: 'normal', created_at: 'x', updated_at: 'x' })
  await assert.rejects(pushSnapshot(client, 'uid-2'), SyncConflictError)
  assert.equal(await autoSync(client, 'uid-2', true), 'remote-newer')
  assert.deepEqual(client.row.data, { other: true }, 'cloud untouched')
  await pushSnapshot(client, 'uid-2', { force: true })
  assert.equal(client.row.data.tables.todo.length, 2)
  await db.delete()
  setAccount(null)
})

test('a wiped device pulls cloud data instead of overwriting it with nothing', async () => {
  fakeBrowser()
  const client = fakeCloud()
  const { db, setAccount } = await import('../src/lib/db.ts')
  const { pushSnapshot, bootSync, autoSync } = await import('../src/lib/cloud-sync.ts')
  setAccount('guru-d')
  if (!db.isOpen()) await db.open()
  await db.kelas.add({ nama_kelas: '5A', tingkat: '5', tahun_ajaran: '2026/2027', semester: 1, is_aktif: 1, guru_id: 1, created_at: 'x', updated_at: 'x' })
  await pushSnapshot(client, 'uid-3')
  const cloudBefore = client.row.updated_at
  // Browser data cleared, sync state left behind.
  await db.kelas.clear()
  assert.equal(await autoSync(client, 'uid-3', true), 'remote-newer', 'empty device must not push')
  assert.equal(client.row.updated_at, cloudBefore, 'cloud untouched')
  assert.equal(await bootSync(client, 'uid-3'), 'unchanged')
  assert.equal((await db.kelas.toArray())[0].nama_kelas, '5A', 'class restored from cloud')
  await db.delete()
  setAccount(null)
})
