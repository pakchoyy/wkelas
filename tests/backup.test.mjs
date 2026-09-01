import test from 'node:test'
import assert from 'node:assert/strict'
import { BACKUP_TABLES, parseBackup, createBackupText, restoreBackupText } from '../src/lib/backup.ts'

const fixture = () => Object.fromEntries(BACKUP_TABLES.map(name => [name, name === 'guru' ? [{id:1,nama:'Guru Contoh'}] : []]))
function database(tables, failOn) {
  let transactions = 0
  let clears = 0
  let data = structuredClone(tables)
  return {
    tables: BACKUP_TABLES,
    get transactions() { return transactions },
    get clears() { return clears },
    get data() { return data },
    table(name) { return {
      async toArray() { return structuredClone(data[name]) },
      async clear() { clears++; data[name] = [] },
      async bulkAdd(records) { if (name === failOn) throw new Error('Simulated storage failure'); data[name].push(...records) },
    } },
    async transaction(mode, names, action) {
      transactions++
      assert.deepEqual(names, BACKUP_TABLES)
      const before = structuredClone(data)
      try { return await action() } catch (error) { data = before; throw error }
    },
  }
}

test('rejects malformed, incomplete, unrelated, and empty backups', () => {
  for (const value of ['bad json', '{}', '[]', 'null', JSON.stringify({siswa:[]}), JSON.stringify(Object.fromEntries(BACKUP_TABLES.map(name => [name,[]])))]) assert.throws(() => parseBackup(value))
})
test('rejects missing table, unexpected table, wrong record types and duplicate keys', () => {
  const missing = fixture(); delete missing.nilai
  const extra = {...fixture(), unexpected:[]}
  const wrong = fixture(); wrong.siswa = [{id:1,kelas_id:'1',nama:'Siswa'}]
  const duplicate = fixture(); duplicate.guru.push({...duplicate.guru[0]})
  for (const value of [missing,extra,wrong,duplicate]) assert.throws(() => parseBackup(JSON.stringify(value)))
})
test('reads the previous full-table backup format', () => {
  assert.equal(parseBackup(JSON.stringify(fixture())).guru[0].nama, 'Guru Contoh')
})
test('reads legacy byte objects and preserves binary content including zero and 255', () => {
  const data = fixture()
  data.dokumen_saya = [{id:1,judul:'Dokumen',ukuran_file:4,file_data:{0:0,1:128,2:255,3:10}}]
  assert.deepEqual(parseBackup(JSON.stringify(data)).dokumen_saya[0].file_data, new Uint8Array([0,128,255,10]))
})
test('rejects damaged bytes and mismatched file sizes', () => {
  for (const bytes of [[256],[-1],[1.5],['1'],{1:1},[1,2]]) {
    const data = fixture(); data.dokumen_saya = [{id:1,judul:'Dokumen',ukuran_file:1,file_data:bytes}]
    assert.throws(() => parseBackup(JSON.stringify(data)))
  }
})
test('new export round-trips documents and takes one read transaction', async () => {
  const data = fixture(); data.dokumen_saya = [{id:1,judul:'Dokumen',ukuran_file:3,file_data:new Uint8Array([0,42,255])}]
  const db = database(data)
  const text = await createBackupText(db)
  assert.equal(JSON.parse(text).version,1)
  assert.deepEqual(parseBackup(text).dokumen_saya[0].file_data, data.dokumen_saya[0].file_data)
  assert.equal(db.transactions,1)
})
test('rejects unsupported versions', () => {
  assert.throws(() => parseBackup(JSON.stringify({format:'bgy-wali-kelas-backup',version:2,tables:fixture()})))
})
test('invalid input never asks confirmation or starts a write transaction', async () => {
  const db = database(fixture())
  await assert.rejects(restoreBackupText(db,'{}',() => { assert.fail('must not confirm') }))
  assert.equal(db.transactions,0); assert.equal(db.clears,0)
})
test('cancelled valid restore leaves data untouched', async () => {
  const db = database(fixture())
  assert.equal(await restoreBackupText(db,JSON.stringify(fixture()),() => false),false)
  assert.equal(db.transactions,0); assert.equal(db.clears,0)
})
test('accepted restore replaces all tables in one write transaction', async () => {
  const db = database(fixture()); const replacement = fixture(); replacement.guru[0].nama = 'Guru Baru'
  assert.equal(await restoreBackupText(db,JSON.stringify(replacement),() => true),true)
  assert.equal(db.transactions,1); assert.equal(db.clears,BACKUP_TABLES.length)
  assert.equal(db.data.guru[0].nama,'Guru Baru')
})
test('write errors propagate out of transaction so storage can roll back', async () => {
  const original = fixture(); const db = database(original,'nilai')
  await assert.rejects(restoreBackupText(db,JSON.stringify(fixture()),() => true),/Simulated storage failure/)
  assert.deepEqual(db.data,original)
})
