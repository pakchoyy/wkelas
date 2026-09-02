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
const {gradePeriod,gradeWeightKey,calculateGrade} = await import('../src/shared/grades.ts')
const {validateGradeWeights,readGradeWeights} = await import('../src/shared/grades.ts')
const {saveGradeWeights} = await import('../src/lib/grade-periods.ts')

test('weight validation rejects negative, nonfinite, incomplete and incorrect totals', () => {
  for (const weights of [{harian:-10,uts:40,uas:70},{harian:101,uts:0,uas:-1},{harian:NaN,uts:25,uas:35},{harian:40,uts:25},{harian:50,uts:25,uas:35},{harian:'40',uts:25,uas:35}]) {
    assert.throws(() => validateGradeWeights(weights))
  }
  assert.deepEqual(readGradeWeights(),{harian:40,uts:25,uas:35})
  assert.deepEqual(validateGradeWeights({harian:33.3,uts:33.3,uas:33.4}),{harian:33.3,uts:33.3,uas:33.4})
  assert.throws(() => readGradeWeights('{broken'))
})

test('saved weights affect calculation only after persistence and cannot cross semesters',async t => {
  const db = await fixture(t)
  const key = await classWeightKey(db,1)
  const before = await db.pengaturan.get(key)
  await assert.rejects(saveGradeWeights(db,1,key,{harian:-10,uts:40,uas:70}))
  assert.deepEqual(await db.pengaturan.get(key),before)
  const draft = {harian:0,uts:0,uas:100}
  assert.notDeepEqual(readGradeWeights((await db.pengaturan.get(key)).value),draft)
  await saveGradeWeights(db,1,key,draft)
  assert.deepEqual(readGradeWeights((await db.pengaturan.get(key)).value),draft)
  await saveClassPeriod(db,{...await db.kelas.get(1),semester:2})
  await assert.rejects(saveGradeWeights(db,1,key,{harian:100,uts:0,uas:0}),/Periode/)
  assert.deepEqual(readGradeWeights((await db.pengaturan.get(key)).value),draft)
  assert.deepEqual(readGradeWeights((await db.pengaturan.get(await classWeightKey(db,1))).value),{harian:40,uts:25,uas:35})
})

test('weight storage failure preserves prior weights',async t => {
  const db = await fixture(t)
  const key = await classWeightKey(db,1)
  const before = await db.pengaturan.get(key)
  const fail = () => {throw new Error('Storage unavailable')}
  db.pengaturan.hook('updating',fail)
  await assert.rejects(saveGradeWeights(db,1,key,{harian:100,uts:0,uas:0}),/Storage unavailable/)
  assert.deepEqual(await db.pengaturan.get(key),before)
  db.pengaturan.hook('updating').unsubscribe(fail)
})

test('zero, missing and zero-weight components yield consistent grades for reports', () => {
  const columns=[{id:1,label:'H1'},{id:2,label:'H2'},{id:3,label:'UTS'},{id:4,label:'UAS'}]
  const values={'1-1':0,'1-2':100,'1-3':80,'1-4':90}
  const grade=calculateGrade(columns,values,1)
  assert.equal(grade.harian,50)
  assert.equal(grade.akhir,71.5)
  assert.equal(grade.lengkap,true)
  const partial=calculateGrade(columns,{...values,'1-1':null},1)
  assert.equal(partial.harian,100)
  assert.equal(partial.lengkap,false)
  assert.equal(calculateGrade(columns,{'1-4':0},1,{harian:0,uts:0,uas:100}).lengkap,true)
})
const {ensureGradePeriods,listPeriodColumns,saveClassPeriod,classWeightKey} = await import('../src/lib/grade-periods.ts')
const {createBackupText,restoreBackupText} = await import('../src/lib/backup.ts')
async function fixture(t) {
  const db = new BgyDatabase(`grade-test-${crypto.randomUUID()}`)
  t.after(() => db.delete())
  await db.guru.add({id:1,nama:'Guru'})
  await db.kelas.add({id:1,nama_kelas:'4A',tingkat:'4',tahun_ajaran:'2026/2027',semester:1,guru_id:1})
  await db.mata_pelajaran.add({id:1,kelas_id:1,nama:'Matematika'})
  await db.penilaian_kolom.add({id:1,mata_pelajaran_id:1,label:'UTS'})
  await db.nilai.add({id:1,siswa_id:1,kolom_id:1,nilai:85})
  await db.pengaturan.put({key:'bobot_nilai_1',value:JSON.stringify({harian:50,uts:20,uas:30})})
  return db
}
test('legacy grades survive switching semester and year, returning restores columns and weights', async t => {
  const db = await fixture(t)
  const old = await db.kelas.get(1)
  assert.equal((await listPeriodColumns(db,1))[0].periode,'2026/2027:1')
  await saveClassPeriod(db,{...old,semester:2})
  assert.deepEqual(await listPeriodColumns(db,1),[])
  assert.equal((await db.nilai.get(1)).nilai,85)
  assert.equal(JSON.parse((await db.pengaturan.get(await classWeightKey(db,1))).value).harian,40)
  await db.penilaian_kolom.add({id:2,mata_pelajaran_id:1,label:'UTS',periode:'2026/2027:2'})
  await db.nilai.add({id:2,siswa_id:1,kolom_id:2,nilai:92})
  await saveClassPeriod(db,{...old,tahun_ajaran:'2027/2028',semester:1})
  assert.deepEqual(await listPeriodColumns(db,1),[])
  await saveClassPeriod(db,old)
  assert.deepEqual((await listPeriodColumns(db,1)).map(c => c.id),[1])
  assert.equal(JSON.parse((await db.pengaturan.get(await classWeightKey(db,1))).value).harian,50)
  assert.equal((await db.nilai.get(2)).nilai,92)
})
test('legacy stamping and weight migration are repeatable and class-specific', async t => {
  const db = await fixture(t)
  await db.kelas.add({id:2,nama_kelas:'5A',tingkat:'5',tahun_ajaran:'2025/2026',semester:2,guru_id:1})
  await db.mata_pelajaran.add({id:2,kelas_id:2,nama:'IPA'})
  await db.penilaian_kolom.add({id:2,mata_pelajaran_id:2,label:'UTS'})
  await ensureGradePeriods(db); await ensureGradePeriods(db)
  assert.equal((await db.penilaian_kolom.get(1)).periode,'2026/2027:1')
  assert.equal((await db.penilaian_kolom.get(2)).periode,'2025/2026:2')
  assert.equal(await db.penilaian_kolom.count(),2)
})
test('restored old backup is stamped before changing its class period',async t => {
  const db = await fixture(t)
  const backup = await createBackupText(db)
  await ensureGradePeriods(db)
  await restoreBackupText(db,backup,() => true)
  await saveClassPeriod(db,{...await db.kelas.get(1),semester:2})
  assert.equal((await db.penilaian_kolom.get(1)).periode,'2026/2027:1')
  assert.deepEqual(await listPeriodColumns(db,1),[])
})
test('new backup preserves multiple periods and their scores',async t => {
  const db = await fixture(t); await ensureGradePeriods(db)
  await db.penilaian_kolom.add({id:2,mata_pelajaran_id:1,label:'UTS',periode:'2026/2027:2'})
  await db.nilai.add({id:2,siswa_id:1,kolom_id:2,nilai:91})
  const backup = await createBackupText(db)
  await db.nilai.clear()
  await restoreBackupText(db,backup,() => true)
  assert.equal(await db.nilai.count(),2)
  assert.equal((await db.penilaian_kolom.get(2)).periode,'2026/2027:2')
})
test('invalid period is rejected before class is changed',async t => {
  const db = await fixture(t); const before = await db.kelas.get(1)
  await assert.rejects(saveClassPeriod(db,{...before,tahun_ajaran:'2026/2028'}))
  assert.deepEqual(await db.kelas.get(1),before)
  assert.throws(() => gradePeriod({tahun_ajaran:'2026/2027',semester:3}))
})
test('grade calculation includes more than ten daily columns, preserves zero, marks partial results',() => {
  const columns = Array.from({length:11},(_,i) => ({id:i+1,label:`H${i+1}`}))
  const values = Object.fromEntries(columns.map(c => [`1-${c.id}`,c.id === 11 ? 0 : 100]))
  const result = calculateGrade(columns,values,1)
  assert.equal(result.harian,1000/11)
  assert.equal(result.lengkap,false)
  assert.equal(calculateGrade([],{},1).akhir,null)
  assert.equal(calculateGrade([{id:1,label:'UTS'}],{'1-1':0},1).akhir,0)
})

test('API filters grades by active period and blocks edits from stale tabs',async t => {
  const {activateMainDb} = await import('../src/lib/db.ts')
  const {default:api} = await import('../src/lib/web-api.ts')
  const db = activateMainDb(); t.after(() => db.delete())
  const source = await fixture(t)
  await restoreBackupText(db,await createBackupText(source),() => true)
  assert.equal((await api.nilai.getAll(1,[1]))['1-1'],85)
  const old = await db.kelas.get(1)
  await saveClassPeriod(db,{...old,semester:2})
  assert.deepEqual(await api.nilai.getAll(1,[1]),{})
  await assert.rejects(api.nilai.save(1,1,12),/Periode/)
  await assert.rejects(api.kolom.update(1,{label:'Changed'}),/Periode/)
  await assert.rejects(api.kolom.delete(1),/Periode/)
  const [a,b] = await Promise.all([api.kolom.create({mata_pelajaran_id:1,label:'UTS',bobot:1,urutan:900}),api.kolom.create({mata_pelajaran_id:1,label:'UTS',bobot:1,urutan:900})])
  assert.equal(a.id,b.id)
  await api.nilai.save(1,a.id,91)
  assert.equal((await api.nilai.getAll(1,[1]))[`1-${a.id}`],91)
  assert.deepEqual(await api.nilai.getAll(1,[2]),{})
  await saveClassPeriod(db,old)
  assert.equal((await api.nilai.getAll(1,[1]))['1-1'],85)
})
