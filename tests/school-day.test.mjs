import test from 'node:test'
import assert from 'node:assert/strict'
import { schoolDayStatus } from '../src/shared/school-day.ts'

test('five-day school closes on Saturday and Sunday', () => {
  assert.equal(schoolDayStatus('2026-09-04', 5, []).active, true)
  assert.equal(schoolDayStatus('2026-09-05', 5, []).active, false)
  assert.equal(schoolDayStatus('2026-09-06', 5, []).active, false)
})
test('six-day school opens on Saturday but not Sunday', () => {
  assert.equal(schoolDayStatus('2026-09-05', 6, []).active, true)
  assert.equal(schoolDayStatus('2026-09-06', 6, []).active, false)
})
test('holidays include both endpoints while ordinary events keep school open', () => {
  const event = { jenis: 'libur_sekolah', judul: 'Libur Semester', tanggal_mulai: '2026-09-01', tanggal_selesai: '2026-09-03' }
  for (const date of ['2026-09-01', '2026-09-02', '2026-09-03']) {
    assert.deepEqual(schoolDayStatus(date, 5, [event]), { active: false, reason: event.judul })
  }
  assert.equal(schoolDayStatus('2026-09-04', 5, [event]).active, true)
  assert.equal(schoolDayStatus('2026-09-02', 5, [{ ...event, jenis: 'ujian' }]).active, true)
})
