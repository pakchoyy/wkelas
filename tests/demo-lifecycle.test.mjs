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
const {BgyDatabase, DEMO_DB_NAME, db, activateMainDb, isDemoMode} = await import('../src/lib/db.ts')
const {seedDemoData, clearDemoDb} = await import('../src/lib/demo-data.ts')

test('sample data persists, deletion returns to private data, and failed operations preserve selection', async () => {
  const main = activateMainDb()
  await main.guru.add({id:91,nama:'Guru Pribadi'})
  await main.kelas.add({id:91,nama_kelas:'Kelas Pribadi',is_aktif:1,guru_id:91})
  await main.siswa.add({id:91,kelas_id:91,nama:'Siswa Pribadi'})
  const original = BgyDatabase.prototype.transaction
  try {
    BgyDatabase.prototype.transaction = function(...args) { if(this.name===DEMO_DB_NAME) return Promise.reject(new Error('simulated storage failure')); return original.apply(this,args) }
    await assert.rejects(seedDemoData(),/simulated storage failure/)
    assert.equal(isDemoMode(),false)
    assert.equal(db.name,'bgy-wali-kelas')
  } finally { BgyDatabase.prototype.transaction = original }

  await seedDemoData()
  assert.equal(isDemoMode(),true)
  assert.equal(db.name,DEMO_DB_NAME)
  assert.equal((await db.guru.get(1)).nama,'Budi Santoso, S.Pd.')
  assert.equal((await db.kelas.get(1)).tingkat,'5')
  assert.ok(await db.siswa.count()>0)
  assert.ok(await db.jadwal.count()>0)
  assert.ok(await db.nilai.count()>0)
  await db.siswa.add({kelas_id:1,nama:'Tambahan saat mencoba'})

  // A fresh module instance represents initialization after a page reload.
  const reloaded = await import('../src/lib/db.ts?demo-reload-test')
  assert.equal(reloaded.isDemoMode(),true)
  assert.equal(reloaded.db.name,DEMO_DB_NAME)
  assert.ok(await reloaded.db.siswa.filter(row=>row.nama==='Tambahan saat mencoba').count())

  try {
    BgyDatabase.prototype.transaction = function(...args) { if(this.name===DEMO_DB_NAME) return Promise.reject(new Error('simulated delete failure')); return original.apply(this,args) }
    await assert.rejects(clearDemoDb(),/simulated delete failure/)
    assert.equal(isDemoMode(),true)
    assert.ok(await db.siswa.count()>0)
  } finally { BgyDatabase.prototype.transaction = original }

  await clearDemoDb()
  assert.equal(isDemoMode(),false)
  assert.equal(storage.has('bgy-demo-mode'),false)
  assert.equal(db.name,'bgy-wali-kelas')
  assert.deepEqual(await db.siswa.toArray(),[{id:91,kelas_id:91,nama:'Siswa Pribadi'}])
  assert.equal((await db.guru.get(91)).nama,'Guru Pribadi')
  assert.equal((await db.kelas.get(91)).nama_kelas,'Kelas Pribadi')
  const demo = new BgyDatabase(DEMO_DB_NAME)
  for(const table of demo.tables) assert.equal(await table.count(),0,table.name)
  demo.close(); reloaded.db.close(); db.close(); main.close()
})
