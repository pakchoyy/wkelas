import test from 'node:test'
import assert from 'node:assert/strict'
import { backupFingerprint, backupIsDue, readBackupHistory, backupReminder } from '../src/lib/backup-history.ts'

test('backup fingerprint ignores export time but detects changed and deleted records',async () => {
  const snapshot = {createdAt:'first',tables:{siswa:[{id:1,nama:'A'}]}}
  const hash = await backupFingerprint(JSON.stringify(snapshot))
  assert.equal(await backupFingerprint(JSON.stringify({...snapshot,createdAt:'later'})),hash)
  assert.notEqual(await backupFingerprint(JSON.stringify({tables:{siswa:[{id:1,nama:'B'}]}})),hash)
  assert.notEqual(await backupFingerprint(JSON.stringify({tables:{siswa:[]}})),hash)
})
test('history tolerates missing and malformed device metadata', () => {
  for (const raw of [null,'broken','{}','null']) assert.equal(readBackupHistory(raw),null)
})
test('reminders distinguish changed data, old backup and unchanged data', () => {
  const history={startedAt:'2026-09-01T00:00:00Z',filename:'backup.bgy',fingerprint:'a'.repeat(64)}
  assert.deepEqual(readBackupHistory(JSON.stringify(history)),history)
  assert.match(backupReminder(null,'x'),/Belum ada/)
  assert.match(backupReminder(history,'b'.repeat(64)),/perubahan data/)
  assert.match(backupReminder(history,history.fingerprint,Date.parse('2026-10-02')),/30 hari/)
  assert.match(backupReminder(history,history.fingerprint,Date.parse('2026-09-02')),/sama/)
  assert.equal(backupIsDue(history,Date.parse('2026-09-30')),false)
  assert.equal(backupIsDue(history,Date.parse('2026-10-02')),true)
})
