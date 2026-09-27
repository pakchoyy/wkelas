import test from 'node:test'
import assert from 'node:assert/strict'
const { reminderSummary } = await import('../src/shared/task-reminder.ts')

test('summary counts due and late active tasks only', () => {
  const t = [
    { deadline:'2026-09-27' }, { deadline:'2026-09-27', status:'selesai' },
    { deadline:'2026-09-20' }, { deadline:'2026-09-20', deleted_at:'x' }, { deadline:'2026-10-01' }, {},
  ]
  assert.equal(reminderSummary(t,'2026-09-27').body, '1 tugas jatuh tempo hari ini dan 1 tugas terlambat. Ketuk untuk membuka.')
  assert.equal(reminderSummary([{ deadline:'2026-10-01' }],'2026-09-27'), null)
})
