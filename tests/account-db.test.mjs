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

const storage = new Map()
Object.defineProperty(globalThis, 'localStorage', {configurable:true, value:{getItem:key=>storage.get(key) ?? null,setItem:(key,value)=>storage.set(key,String(value)),removeItem:key=>storage.delete(key)}})
const { db, setAccount, activateMainDb } = await import('../src/lib/db.ts')

test('each account gets its own local database; first account keeps legacy data', async () => {
  activateMainDb()
  await db.todo.add({judul:'data lama',prioritas:'normal',created_at:'x',updated_at:'x'})

  setAccount('owner-1')
  assert.equal(db.name,'bgy-wali-kelas')
  assert.equal(await db.todo.count(),1)

  setAccount('guru-2')
  assert.equal(db.name,'bgy-wali-kelas-u-guru-2')
  assert.equal(await db.todo.count(),0)
  await db.delete()

  setAccount('owner-1')
  assert.equal(await db.todo.count(),1)
  await db.delete()
  setAccount(null)
})
