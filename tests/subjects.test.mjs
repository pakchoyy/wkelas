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
const {BgyDatabase}=await import('../src/lib/db.ts')
const {deleteSubject}=await import('../src/lib/subject-storage.ts')
async function fixture(t){const db=new BgyDatabase(`subject-${crypto.randomUUID()}`);t.after(()=>db.delete());await db.mata_pelajaran.add({id:1,kelas_id:1,nama:'Matematika'});await db.penilaian_kolom.add({id:1,mata_pelajaran_id:1});await db.nilai.add({id:1,siswa_id:1,kolom_id:1,nilai:90});return db}
test('schedule references block deletion without removing scores',async t=>{
 const db=await fixture(t);await db.jadwal.add({kelas_id:1,mata_pelajaran_id:1})
 await assert.rejects(deleteSubject(db,1),/1 jadwal/)
 assert.ok(await db.mata_pelajaran.get(1));assert.equal(await db.nilai.count(),1)
})
test('plan references block deletion and are preserved',async t=>{
 const db=await fixture(t);await db.rencana_mengajar.add({kelas_id:1,mata_pelajaran_id:1})
 await assert.rejects(deleteSubject(db,1),/1 rencana/)
 assert.equal(await db.rencana_mengajar.count(),1);assert.equal(await db.penilaian_kolom.count(),1)
})
test('unreferenced subject deletion removes only its columns and scores',async t=>{
 const db=await fixture(t);await db.penilaian_kolom.add({id:2,mata_pelajaran_id:2});await db.nilai.add({id:2,siswa_id:1,kolom_id:2,nilai:70})
 await deleteSubject(db,1)
 assert.equal(await db.mata_pelajaran.count(),0);assert.equal(await db.penilaian_kolom.count(),1);assert.equal((await db.nilai.get(2)).nilai,70)
})
test('failure during cascade rolls back scores and columns',async t=>{
 const db=await fixture(t);db.mata_pelajaran.hook('deleting',()=>{throw new Error('Storage failure')})
 await assert.rejects(deleteSubject(db,1),/Storage failure/)
 assert.ok(await db.mata_pelajaran.get(1));assert.equal(await db.penilaian_kolom.count(),1);assert.equal(await db.nilai.count(),1)
})
