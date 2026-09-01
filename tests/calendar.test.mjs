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
const {saveCalendar,saveCalendarPeriod,validateDateRange} = await import('../src/lib/calendar-storage.ts')
async function fixture(t) { const db = new BgyDatabase(`calendar-${crypto.randomUUID()}`); t.after(() => db.delete()); return db }
const event = {kelas_id:1,judul:'Ujian',jenis:'ujian',tanggal_mulai:'2026-09-02',tanggal_selesai:''}
test('invalid dates and reversed ranges do not create calendar events', async t => {
 const db = await fixture(t)
 for (const tanggal_mulai of ['', '2026-02-30', 'invalid']) await assert.rejects(saveCalendar(db,{...event,tanggal_mulai}))
 await assert.rejects(saveCalendar(db,{...event,tanggal_selesai:'2026-09-01'}))
 assert.equal(await db.kalender_akademik.count(),0)
 validateDateRange('2028-02-29','2028-02-29')
})
test('single day and multi-day events save; invalid edits preserve previous values', async t => {
 const db = await fixture(t)
 const saved = await saveCalendar(db,event)
 await assert.rejects(saveCalendar(db,{...saved,tanggal_selesai:'2026-01-01'}))
 assert.equal((await db.kalender_akademik.get(saved.id)).tanggal_selesai,'')
 const updated = await saveCalendar(db,{...saved,tanggal_selesai:'2026-09-04'})
 assert.equal(updated.tanggal_selesai,'2026-09-04')
 await assert.rejects(saveCalendar(db,{...updated,kelas_id:2}))
})
test('period validation preserves settings and valid updates retain the other semester', async t => {
 const db = await fixture(t)
 const before = {s2Mulai:'2027-01-01',s2Akhir:'2027-06-30',hariSekolah:5}
 await db.pengaturan.put({key:'presensi_1',value:JSON.stringify(before)})
 await assert.rejects(saveCalendarPeriod(db,1,1,{mulai:'2026-12-31',akhir:'2026-07-01',hariSekolah:5}))
 await assert.rejects(saveCalendarPeriod(db,1,1,{mulai:'2026-07-01',akhir:'',hariSekolah:5}))
 assert.deepEqual(JSON.parse((await db.pengaturan.get('presensi_1')).value),before)
 await saveCalendarPeriod(db,1,1,{mulai:'2026-07-01',akhir:'2026-12-31',hariSekolah:6})
 const after=JSON.parse((await db.pengaturan.get('presensi_1')).value)
 assert.equal(after.s2Akhir,before.s2Akhir); assert.equal(after.s1Mulai,'2026-07-01'); assert.equal(after.hariSekolah,6)
})
test('database write failure does not create an event', async t => {
 const db = await fixture(t)
 db.kalender_akademik.hook('creating',()=>{throw new Error('Simulated storage failure')})
 await assert.rejects(saveCalendar(db,event),/Simulated storage failure/)
 assert.equal(await db.kalender_akademik.count(),0)
})
