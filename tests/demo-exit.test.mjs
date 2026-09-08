import test from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { existsSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

await import(pathToFileURL(join(process.env.GRADE_TEST_DEPS || join(tmpdir(),'wkelas-grade-tests'), 'node_modules/fake-indexeddb/auto/index.mjs')).href)
registerHooks({resolve(specifier,context,next) {
  if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) {
    const url = new URL(specifier,context.parentURL)
    if (!/\.[a-z]+$/i.test(url.pathname) && existsSync(fileURLToPath(url)+'.ts')) return next(url.href+'.ts',context)
  }
  return next(specifier,context)
}})

const storage = new Map()
Object.defineProperty(globalThis, 'localStorage', {configurable:true, value:{getItem:key=>storage.get(key) ?? null,setItem:(key,value)=>storage.set(key,String(value)),removeItem:key=>storage.delete(key)}})
const { db, activateMainDb, isDemoMode } = await import('../src/lib/db.ts')
const { seedDemoData, clearDemoDb } = await import('../src/lib/demo-data.ts')

test('deleting demo data returns to an empty usable class', async () => {
  const main = activateMainDb()
  await main.delete()
  await main.open()

  await seedDemoData()
  assert.equal(isDemoMode(), true)

  await clearDemoDb()
  assert.equal(isDemoMode(), false)
  assert.equal(await db.kelas.count(), 1)
  assert.equal(await db.siswa.count(), 0)
  assert.equal(await db.jadwal.count(), 0)
  assert.equal(await db.nilai.count(), 0)

  db.close()
})
