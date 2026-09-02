import test from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { existsSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
// Install with: pnpm --dir <temp>/wkelas-grade-tests add fake-indexeddb --ignore-scripts
await import(pathToFileURL(join(process.env.GRADE_TEST_DEPS || join(tmpdir(),'wkelas-grade-tests'), 'node_modules/fake-indexeddb/auto/index.mjs')).href)
registerHooks({resolve(specifier,context,next) {
  if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) {
    const url = new URL(specifier,context.parentURL)
    if (!/\.[a-z]+$/i.test(url.pathname) && existsSync(fileURLToPath(url)+'.ts')) return next(url.href+'.ts',context)
  }
  return next(specifier,context)
}})
const {BgyDatabase} = await import('../src/lib/db.ts')

const { initialSetup, saveInitialClass } = await import('../src/lib/onboarding.ts')
const full = { ...initialSetup(new Date(2026,8,2)), namaKelas:'Kelas 2', tingkat:'2', namaSekolah:'Sekolah Uji', namaWali:'Guru Uji' }
async function fixture(t) { const db = new BgyDatabase('setup-test-' + crypto.randomUUID()); t.after(() => db.delete()); return db }
test('academic defaults follow July boundary', () => {
 assert.equal(initialSetup(new Date(2026,5,30)).tahunAjaran,'2025/2026')
 assert.equal(initialSetup(new Date(2026,5,30)).semester,2)
 assert.equal(initialSetup(new Date(2026,6,1)).tahunAjaran,'2026/2027')
 assert.equal(initialSetup(new Date(2026,6,1)).semester,1)
})
test('skip creates editable starter class without fake subjects or students', async t => {
 const db = await fixture(t)
 const id = await saveInitialClass(db,initialSetup(),true)
 assert.equal((await db.kelas.get(id)).nama_kelas,'Kelas Saya')
 assert.equal(await db.mata_pelajaran.count(),0)
 assert.equal(await db.siswa.count(),0)
 assert.equal((await db.pengaturan.get('fase_aktif')).value,'A')
})
test('parallel setup and reopening keep one class and its identity', async t => {
 const db = await fixture(t)
 const [a,b] = await Promise.all([saveInitialClass(db,full),saveInitialClass(db,full)])
 assert.equal(a,b)
 assert.equal(await db.kelas.count(),1)
 assert.equal(await db.guru.count(),1)
 assert.ok(await db.mata_pelajaran.count()>0)
 db.close(); await db.open()
 assert.equal((await db.kelas.get(a)).nama_kelas,'Kelas 2')
 assert.equal((await db.guru.toArray())[0].nama,'Guru Uji')
})
test('invalid input never creates partial setup', async t => {
 const db = await fixture(t)
 for (const data of [{...full,tingkat:'7'},{...full,tahunAjaran:'2026/2028'},{...full,namaSekolah:'  '},{...full,semester:3}]) await assert.rejects(saveInitialClass(db,data))
 assert.equal(await db.kelas.count(),0)
 assert.equal(await db.guru.count(),0)
})
test('failed subject write rolls back teacher and class', async t => {
 const db = await fixture(t)
 const fail = () => { throw new Error('test write failure') }
 db.mata_pelajaran.hook('creating',fail)
 await assert.rejects(saveInitialClass(db,full))
 assert.equal(await db.kelas.count(),0)
 assert.equal(await db.guru.count(),0)
 assert.equal(await db.pengaturan.count(),0)
 db.mata_pelajaran.hook('creating').unsubscribe(fail)
 await saveInitialClass(db,full)
 assert.equal(await db.kelas.count(),1)
})
