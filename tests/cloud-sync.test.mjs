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

test('push then pull on another account-less device restores the same data', async () => {
  const store = new Map()
  Object.defineProperty(globalThis, 'localStorage', {configurable:true, value:{getItem:k=>store.get('ls:'+k) ?? null,setItem:(k,v)=>store.set('ls:'+k,String(v)),removeItem:k=>store.delete('ls:'+k)}})
  globalThis.window ??= globalThis
  globalThis.window.dispatchEvent ??= () => true
  let n = 0
  const files = new Map()
  const client = { storage: { from: () => ({
    upload: async (path, blob) => { files.set(path, { blob, at: 't' + (++n) }); return { error: null } },
    list: async (dir) => ({ data: [...files].filter(([p]) => p.startsWith(dir + '/')).map(([p, f]) => ({ name: p.split('/').pop(), updated_at: f.at })), error: null }),
    download: async (path) => ({ data: files.get(path)?.blob, error: null }),
  }) } }
  const { db, setAccount } = await import('../src/lib/db.ts')
  const { pushSnapshot, pullSnapshot, readSyncState } = await import('../src/lib/cloud-sync.ts')
  setAccount('guru-a')
  await db.todo.add({ judul: 'dari laptop', prioritas: 'normal', created_at: 'x', updated_at: 'x' })
  const pushed = await pushSnapshot(client, 'uid-1')
  assert.equal(pushed.enabled, true)
  assert.equal(pushed.remoteAt, 't1')
  await db.delete()

  setAccount('guru-b')
  assert.equal(await db.todo.count(), 0)
  assert.equal(await pullSnapshot(client, 'uid-1', () => true), true)
  assert.equal((await db.todo.toArray())[0].judul, 'dari laptop')
  assert.equal(readSyncState('uid-1').remoteAt, 't1')
  await db.delete()
  setAccount(null)
})
