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
const {importStudentRows} = await import('../src/lib/student-import.ts')
const {saveSchedule,importSchedule,updateScheduleTime} = await import('../src/lib/schedule-storage.ts')
const {defaultTime,resolveScheduleTime,excelTime} = await import('../src/shared/schedule.ts')
async function fixture(t) {
  const db = new BgyDatabase(`import-test-${crypto.randomUUID()}`)
  t.after(() => db.delete())
  await db.mata_pelajaran.add({id:1,kelas_id:1,nama:'Matematika'})
  return db
}
const slot = (extra={}) => ({kelas_id:1,hari:1,jam_ke:2,jam_mulai:'07:40',jam_selesai:'08:15',mata_pelajaran_id:1,...extra})
test('repeat import and repeated rows keep NIS unique and preserve existing data',async t => {
  const db = await fixture(t)
  const rows = [['Nama','NIS','JK'],['Ani','00123','P'],['Ani baru','00123','P']]
  const result = await importStudentRows(db,rows,[],1)
  assert.equal(result.ok,1); assert.equal(result.dilewati,1)
  assert.equal((await importStudentRows(db,rows,[],1)).ok,0)
  assert.equal(await db.siswa.count(),1)
  assert.equal((await db.siswa.toArray())[0].nis,'00123')
  assert.equal((await db.siswa.toArray())[0].nama,'Ani')
})
test('names without identifiers are flagged while equal names with distinct NIS are allowed',async t => {
  const db = await fixture(t)
  let result = await importStudentRows(db,[['Nama','NIS'],['Budi','1'],['Budi','2'],['Budi','']],[],1)
  assert.equal(result.ok,2); assert.equal(result.dilewati,1)
  result = await importStudentRows(db,[['Nama'],['Citra'],[' citra ']],[],1)
  assert.equal(result.ok,1); assert.equal(result.dilewati,1)
})
test('required fields, dropdown, date, gender and attendance number report row errors',async t => {
  const db = await fixture(t)
  const fields = [{id:1,nama_field:'Agama',tipe:'dropdown',pilihan:'["A","B"]',wajib:1},{id:2,nama_field:'Tanggal',tipe:'tanggal',wajib:0}]
  const result = await importStudentRows(db,[['Nama','NIS','JK','No Absen','Agama','Tanggal'],['A','1','X','1','A',''],['B','2','L','1.5','A',''],['C','3','L','1','',''],['D','4','L','1','C',''],['E','5','L','1','A','2026-02-30']],fields,1)
  assert.equal(result.gagal,5); assert.equal(await db.siswa.count(),0)
  assert.match(result.pesan[0],/Baris 2/)
})
test('failed custom-field persistence rolls back the student record',async t => {
  const db = await fixture(t)
  db.siswa_field_values.hook('creating',() => {throw new Error('Simulated quota failure')})
  const result = await importStudentRows(db,[['Nama','Alamat'],['Ani','Jalan 1']],[{id:1,nama_field:'Alamat',tipe:'teks',wajib:0}],1)
  assert.equal(result.gagal,1); assert.equal(await db.siswa.count(),0)
})
test('parallel student imports do not duplicate NIS',async t => {
  const db = await fixture(t)
  const rows = [['Nama','NIS'],['Ani','01']]
  await Promise.all([importStudentRows(db,rows,[],1),importStudentRows(db,rows,[],1)])
  assert.equal(await db.siswa.count(),1)
})
test('time defaults and Excel fractional time agree with second lesson',() => {
  assert.deepEqual(defaultTime(2),{mulai:'07:40',selesai:'08:15'})
  assert.deepEqual(resolveScheduleTime(2,{},[]),defaultTime(2))
  assert.equal(excelTime(460/1440,'00:00'),'07:40')
  assert.equal(excelTime('7:40','00:00'),'07:40')
})
test('repeated schedule import skips an occupied slot without overwriting it',async t => {
  const db = await fixture(t)
  const rows = [{line:2,data:slot()}]
  assert.equal((await importSchedule(db,rows)).ok,1)
  assert.equal((await importSchedule(db,[{line:2,data:slot({nama_guru:'Changed'})}])).dilewati,1)
  assert.equal(await db.jadwal.count(),1)
  assert.equal((await db.jadwal.toArray())[0].nama_guru,undefined)
})
test('concurrent schedule writes cannot duplicate a slot',async t => {
  const db = await fixture(t)
  const results = await Promise.allSettled([saveSchedule(db,slot()),saveSchedule(db,slot())])
  assert.equal(results.filter(r => r.status==='fulfilled').length,1)
  assert.equal(await db.jadwal.count(),1)
})
test('invalid, overlapping, out of range and break slots do not save',async t => {
  const db = await fixture(t)
  await saveSchedule(db,slot())
  for (const data of [slot({jam_ke:3,jam_mulai:'08:00',jam_selesai:'08:35'}),slot({hari:2,jam_mulai:'09:00',jam_selesai:'08:00'}),slot({hari:7}),slot({jam_ke:11})]) await assert.rejects(saveSchedule(db,data))
  await db.pengaturan.put({key:'jadwal_1',value:JSON.stringify({jumlahJam:10,istirahat:[3]})})
  await assert.rejects(saveSchedule(db,slot({jam_ke:3,jam_mulai:'08:20',jam_selesai:'08:55'})),/istirahat/)
  assert.equal(await db.jadwal.count(),1)
})
test('row time edit changes all days atomically and rejects overlaps',async t => {
  const db = await fixture(t)
  await saveSchedule(db,slot()); await saveSchedule(db,slot({hari:2}))
  await updateScheduleTime(db,1,2,{mulai:'07:45',selesai:'08:15'})
  assert.ok((await db.jadwal.toArray()).every(r => r.jam_mulai==='07:45'))
  await saveSchedule(db,slot({jam_ke:3,jam_mulai:'08:20',jam_selesai:'08:55'}))
  await assert.rejects(updateScheduleTime(db,1,2,{mulai:'07:45',selesai:'08:30'}),/bertabrakan/)
  assert.equal((await db.jadwal.toArray())[0].jam_selesai,'08:15')
})
test('spreadsheet reader preserves formatted leading zeros',async () => {
  const XLSX = await import('xlsx')
  const {readStudentFile} = await import('../src/renderer/lib/spreadsheet.ts')
  const workbook = XLSX.utils.book_new()
  const sheet = XLSX.utils.aoa_to_sheet([['Nama','NIS'],['Ani',123]])
  sheet.B2.z = '00000'
  XLSX.utils.book_append_sheet(workbook,sheet,'Siswa')
  const file = new File([XLSX.write(workbook,{type:'array',bookType:'xlsx'})],'siswa.xlsx')
  assert.equal((await readStudentFile(file))[1][1],'00123')
})
