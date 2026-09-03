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
const {BgyDatabase} = await import('../src/lib/db.ts')
const {ensureIndonesianHolidays} = await import('../src/lib/holiday-storage.ts')
const {ensureDefaultGradeColumns, listPeriodColumns} = await import('../src/lib/grade-periods.ts')
const {schoolDayStatus} = await import('../src/shared/school-day.ts')
const {studentTemplateHeaders} = await import('../src/shared/student-template.ts')
const {importStudentRows} = await import('../src/lib/student-import.ts')
async function fixture(t) {
  const db = new BgyDatabase('mobile-followup-' + crypto.randomUUID());t.after(()=>db.delete())
  await db.kelas.add({id:1,nama_kelas:'5A',tahun_ajaran:'2026/2027',semester:1,guru_id:1})
  await db.mata_pelajaran.add({id:1,kelas_id:1,nama:'Matematika'})
  return db
}
test('national defaults are idempotent, preserve records, and exclude holidays from school days',async t=>{
  const db=await fixture(t)
  await db.presensi.add({siswa_id:1,kelas_id:1,tanggal:'2026-08-17',status:'H'})
  await Promise.all([ensureIndonesianHolidays(db,1),ensureIndonesianHolidays(db,1)])
  const days=await db.kalender_akademik.toArray()
  assert.equal(days.length,17)
  assert.equal(schoolDayStatus('2026-08-17',5,days).active,false)
  assert.equal(schoolDayStatus('2026-08-18',5,days).active,true)
  assert.equal(schoolDayStatus('2026-12-24',5,days).active,true)
  assert.equal(await db.presensi.count(),1)
  await ensureIndonesianHolidays(db,1,true)
  assert.equal(schoolDayStatus('2026-12-24',5,await db.kalender_akademik.toArray()).active,false)
  assert.equal(await db.kalender_akademik.count(),25)
})
test('existing holidays are preserved, deleted defaults stay deleted, and unsupported years are not invented',async t=>{
  const db=await fixture(t)
  await db.kalender_akademik.add({kelas_id:1,tanggal_mulai:'2026-12-20',tanggal_selesai:'2026-12-31',jenis:'libur_sekolah',judul:'Libur semester'})
  await ensureIndonesianHolidays(db,1)
  assert.equal((await db.kalender_akademik.toArray()).filter(d=>d.tanggal_mulai==='2026-12-25').length,0)
  const national=(await db.kalender_akademik.toArray()).find(d=>d.tanggal_mulai==='2026-01-01')
  await db.kalender_akademik.delete(national.id)
  const count=await db.kalender_akademik.count();await ensureIndonesianHolidays(db,1)
  assert.equal(await db.kalender_akademik.count(),count)
  await db.kelas.add({id:2,tahun_ajaran:'2027/2028'})
  assert.equal(await ensureIndonesianHolidays(db,2),0)
})
test('holiday seed failure rolls back entries and marker',async t=>{
  const db=await fixture(t)
  db.kalender_akademik.hook('creating',()=>{throw Error('Storage unavailable')})
  await assert.rejects(ensureIndonesianHolidays(db,1),/Storage unavailable/)
  assert.equal(await db.kalender_akademik.count(),0)
  assert.equal(await db.pengaturan.get('libur_nasional_2026_1'),undefined)
})
test('daily and exam columns are created once, without altering scores or resurrecting deleted daily columns',async t=>{
  const db=await fixture(t)
  await db.penilaian_kolom.add({id:1,mata_pelajaran_id:1,label:'UTS',urutan:900,bobot:1})
  await db.nilai.add({siswa_id:1,kolom_id:1,nilai:0})
  await Promise.all([ensureDefaultGradeColumns(db,1),ensureDefaultGradeColumns(db,1)])
  const rows=await listPeriodColumns(db,1)
  assert.deepEqual(rows.map(c=>c.label).sort(),['Harian 1','UAS','UTS'])
  assert.equal((await db.nilai.toArray())[0].nilai,0)
  await db.penilaian_kolom.delete(rows.find(c=>c.label==='Harian 1').id)
  await ensureDefaultGradeColumns(db,1)
  assert.equal((await listPeriodColumns(db,1)).length,2)
  await db.kelas.update(1,{semester:2});await ensureDefaultGradeColumns(db,1)
  assert.equal((await listPeriodColumns(db,1)).length,3)
  assert.equal(await db.penilaian_kolom.count(),5)
})
test('template follows active column order and imports a newly added custom value',async t=>{
  const db=await fixture(t)
  const fields=[{id:1,kelas_id:1,nama_field:'Hobi',slug:'hobi',tipe:'teks',wajib:0,urutan:2},{id:2,kelas_id:1,nama_field:'Alamat',slug:'alamat',tipe:'teks',wajib:0,urutan:1}]
  await db.siswa_field_definitions.bulkAdd(fields)
  const headers=studentTemplateHeaders([...fields,{nama_field:'Nonaktif',is_aktif:0,urutan:0}])
  assert.deepEqual(headers,['Nama','NIS','JK','No Absen','Alamat','Hobi'])
  const result=await importStudentRows(db,[headers,['Siswa Uji','001','L','1','Jalan Uji','Membaca']],fields,1)
  assert.equal(result.ok,1)
  assert.equal((await db.siswa_field_values.toArray()).find(v=>v.field_id===1).nilai,'Membaca')
})
