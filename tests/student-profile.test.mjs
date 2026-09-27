import test from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
registerHooks({resolve(specifier,context,next) {
  if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) {
    const url = new URL(specifier,context.parentURL)
    if (!/\.[a-z]+$/i.test(url.pathname) && existsSync(fileURLToPath(url)+'.ts')) return next(url.href+'.ts',context)
  }
  return next(specifier,context)
}})
const { summarizeAttendance, profileAlerts } = await import('../src/shared/student-profile.ts')

test('attendance summary matches report formula and date range', () => {
  const rows = [{status:'H',tanggal:'2026-09-01'},{status:'T',tanggal:'2026-09-02'},{status:'A',tanggal:'2026-09-03'},{status:'S',tanggal:'2026-10-01'}]
  assert.deepEqual(summarizeAttendance(rows), {H:1,S:1,I:0,A:1,T:1,total:4,percent:50})
  assert.equal(summarizeAttendance(rows,'2026-09-01','2026-09-30').total, 3)
  assert.equal(summarizeAttendance([]).percent, null)
})

test('alerts flag absence, low grades and repeated concerns only', () => {
  const ok = summarizeAttendance([{status:'H',tanggal:'x'}])
  assert.deepEqual(profileAlerts(ok,[{mapel:'IPA',akhir:80},{mapel:'IPS',akhir:null}],1), [])
  const bad = {H:5,S:0,I:0,A:3,T:0,total:8,percent:63}
  assert.deepEqual(profileAlerts(bad,[{mapel:'Matematika',akhir:70}],2), ['Alpa 3 kali','Kehadiran 63% (di bawah 85%)','Nilai di bawah 75: Matematika','2 catatan perilaku perlu perhatian'])
})

test('attendance percent alert waits for enough recorded days', () => {
  assert.deepEqual(profileAlerts({H:0,S:1,I:0,A:0,T:0,total:1,percent:0},[],0), [])
})

test('custom thresholds drive alerts and bad settings fall back to defaults', async () => {
  const { readThresholds } = await import('../src/shared/student-profile.ts')
  const att = {H:8,S:0,I:0,A:2,T:0,total:10,percent:80}
  assert.deepEqual(profileAlerts(att,[{mapel:'IPA',akhir:72}],0,{nilai:70,kehadiran:75}), [])
  assert.deepEqual(profileAlerts(att,[{mapel:'IPA',akhir:72}],0,{nilai:80,kehadiran:90}), ['Kehadiran 80% (di bawah 90%)','Nilai di bawah 80: IPA'])
  assert.deepEqual(readThresholds('{"nilai":200,"kehadiran":85}'), {nilai:75,kehadiran:85})
  assert.deepEqual(readThresholds('{"nilai":70,"kehadiran":80}'), {nilai:70,kehadiran:80})
})
