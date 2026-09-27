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
const { BgyDatabase } = await import('../src/lib/db.ts')
const { createClass, promoteClass, activateClass, listClasses, nextAcademicYear } = await import('../src/lib/class-manager.ts')

async function fixture(t) {
  const db = new BgyDatabase('class-' + crypto.randomUUID()); t.after(() => db.delete())
  const now = 'x'
  const guru = await db.guru.add({ supabase_uid:'u', nama:'Guru', email:'e', tahun_ajaran_aktif:'2026/2027', semester_aktif:1, created_at:now, updated_at:now })
  const kelas = await db.kelas.add({ nama_kelas:'4A', tingkat:'4', tahun_ajaran:'2026/2027', semester:2, is_aktif:1, guru_id:guru, created_at:now, updated_at:now })
  const field = await db.siswa_field_definitions.add({ kelas_id:kelas, nama_field:'Alamat', slug:'alamat', tipe:'teks', wajib:0, urutan:1, created_at:now, updated_at:now })
  const a = await db.siswa.add({ kelas_id:kelas, nama:'Ani', nis:'001', created_at:now, updated_at:now })
  await db.siswa.add({ kelas_id:kelas, nama:'Keluar', deleted_at:'2026-10-01', created_at:now, updated_at:now })
  await db.siswa_field_values.add({ siswa_id:a, field_id:field, nilai:'Jl. Mawar', updated_at:now })
  await db.presensi.add({ siswa_id:a, kelas_id:kelas, tanggal:'2026-09-01', status:'H', created_at:now, updated_at:now })
  return { db, kelas }
}

test('create class adds recommended subjects and rejects duplicates', async t => {
  const { db, kelas } = await fixture(t)
  const id = await createClass(db, { nama_kelas:'5B', tingkat:'5', tahun_ajaran:'2026/2027', semester:1 }, kelas)
  assert.ok((await db.mata_pelajaran.where({kelas_id:id}).count()) > 5)
  await assert.rejects(createClass(db, { nama_kelas:'5b', tingkat:'5', tahun_ajaran:'2026/2027', semester:1 }, kelas), /sudah ada/)
  await activateClass(db, id)
  assert.deepEqual((await db.kelas.toArray()).map(k => k.is_aktif).sort(), [0,1])
  assert.equal((await listClasses(db)).length, 2)
})

test('promotion copies active students and custom fields, keeps old class intact', async t => {
  const { db, kelas } = await fixture(t)
  await assert.rejects(promoteClass(db, kelas, { nama_kelas:'5A', tingkat:'5', tahun_ajaran:'2026/2027', semester:1 }), /setelah/)
  const { kelasId, siswa } = await promoteClass(db, kelas, { nama_kelas:'5A', tingkat:'5', tahun_ajaran:nextAcademicYear('2026/2027'), semester:1 })
  assert.equal(siswa, 1)
  const [copy] = await db.siswa.where({kelas_id:kelasId}).toArray()
  assert.equal(copy.nama, 'Ani')
  const [def] = await db.siswa_field_definitions.where({kelas_id:kelasId}).toArray()
  assert.equal(def.slug, 'alamat')
  assert.equal((await db.siswa_field_values.filter(v => v.siswa_id === copy.id).first()).nilai, 'Jl. Mawar')
  assert.equal(await db.presensi.where({kelas_id:kelasId}).count(), 0)
  assert.equal(await db.siswa.where({kelas_id:kelas}).count(), 2)
  assert.equal((await db.kelas.get(kelasId)).tahun_ajaran, '2027/2028')
})

test('existing v1 database upgrades and allows same field slug in two classes', async t => {
  const { default: Dexie } = await import('dexie')
  const name = 'upgrade-' + crypto.randomUUID()
  const old = new Dexie(name)
  old.version(1).stores({ siswa_field_definitions: '++id, kelas_id, &slug' })
  await old.table('siswa_field_definitions').add({ kelas_id:1, nama_field:'Alamat', slug:'alamat', tipe:'teks', wajib:0, urutan:1 })
  old.close()
  const db = new BgyDatabase(name); t.after(() => db.delete())
  assert.equal(await db.siswa_field_definitions.count(), 1)
  await db.siswa_field_definitions.add({ kelas_id:2, nama_field:'Alamat', slug:'alamat', tipe:'teks', wajib:0, urutan:1, created_at:'x', updated_at:'x' })
  await assert.rejects(db.siswa_field_definitions.add({ kelas_id:2, nama_field:'Alamat', slug:'alamat', tipe:'teks', wajib:0, urutan:1, created_at:'x', updated_at:'x' }))
})
