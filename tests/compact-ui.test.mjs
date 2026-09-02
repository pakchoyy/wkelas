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

const {fillMissingAttendance}=await import('../src/lib/attendance-fill.ts')
const {editSubject}=await import('../src/lib/subject-storage.ts')
const {schedulePreset}=await import('../src/shared/schedule.ts')
async function fixture(t) {const db=new BgyDatabase(`compact-ui-${crypto.randomUUID()}`);t.after(()=>db.delete());return db}

test('auto attendance fills missing students without overwriting existing status or notes',async t=>{
 const db=await fixture(t)
 await db.presensi.add({kelas_id:1,siswa_id:1,tanggal:'2026-09-01',status:'A',keterangan:'Sudah dicatat'})
 await Promise.all([fillMissingAttendance(db,1,'2026-09-01',[1,2]),fillMissingAttendance(db,1,'2026-09-01',[1,2])])
 const rows=await db.presensi.toArray()
 assert.equal(rows.length,2)
 assert.equal(rows.find(r=>r.siswa_id===1).status,'A')
 assert.equal(rows.find(r=>r.siswa_id===1).keterangan,'Sudah dicatat')
 assert.equal(rows.find(r=>r.siswa_id===2).status,'H')
 await fillMissingAttendance(db,1,'2026-09-02',[1])
 assert.equal((await db.presensi.where({tanggal:'2026-09-01'}).toArray()).length,2)
})
test('subject edits retain references and reject duplicate name and wrong class',async t=>{
 const db=await fixture(t)
 await db.mata_pelajaran.bulkAdd([{id:1,kelas_id:1,nama:'MTK',urutan:1},{id:2,kelas_id:1,nama:'Bahasa'}])
 await db.penilaian_kolom.add({id:1,mata_pelajaran_id:1,label:'H1'})
 await editSubject(db,1,1,{nama:' Matematika ',kode:'MTK'})
 assert.equal((await db.mata_pelajaran.get(1)).nama,'Matematika')
 assert.equal((await db.penilaian_kolom.get(1)).mata_pelajaran_id,1)
 await assert.rejects(editSubject(db,1,1,{nama:'bahasa',kode:''}),/digunakan/)
 await assert.rejects(editSubject(db,2,1,{nama:'Lain',kode:''}),/tidak ditemukan/)
})
test('JP preset places a real break without a hidden five-minute gap',()=>{
 const preset=schedulePreset(10,'07:00',35,3,15)
 assert.deepEqual(preset.istirahat,[4])
 assert.deepEqual(preset.waktuJam[3],{mulai:'08:10',selesai:'08:45'})
 assert.deepEqual(preset.waktuJam[4],{mulai:'08:45',selesai:'09:00'})
 assert.deepEqual(preset.waktuJam[5],{mulai:'09:00',selesai:'09:35'})
 assert.throws(()=>schedulePreset(3,'07:00',35,3,15))
 assert.throws(()=>schedulePreset(10,'23:00',35,3,15))
})

