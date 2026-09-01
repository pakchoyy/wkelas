import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { attendancePercent, missingAttendance } from '../src/shared/attendance.ts'

for (const timezone of ['Asia/Jakarta','Asia/Makassar','Asia/Jayapura']) {
  test(`date follows local calendar before UTC midnight in ${timezone}`, () => {
    const code = `import { todayISO } from './src/shared/utils.ts'; import assert from 'node:assert/strict'; assert.equal(todayISO(new Date('2026-09-01T17:30:00Z')), '2026-09-02'); assert.equal(todayISO(new Date('2026-12-31T17:30:00Z')), '2027-01-01');`
    execFileSync(process.execPath, ['--experimental-strip-types','--input-type=module','-e',code], {cwd:process.cwd(),env:{...process.env,TZ:timezone}})
  })
}
test('local calendar also works west of UTC', () => {
  execFileSync(process.execPath, ['--experimental-strip-types','--input-type=module','-e', `import {todayISO} from './src/shared/utils.ts'; import assert from 'node:assert/strict'; assert.equal(todayISO(new Date('2026-09-02T01:00:00Z')),'2026-09-01');`], {env:{...process.env,TZ:'America/New_York'}})
})
test('late students are present, empty records differ from zero attendance', () => {
  assert.equal(attendancePercent(1,1,2),100)
  assert.equal(attendancePercent(0,1,2),50)
  assert.equal(attendancePercent(0,0,2),0)
  assert.equal(attendancePercent(0,0,0),null)
})
test('mass attendance only targets unrecorded students for the selected date', () => {
  const students = [1,2,3,4,5,6].map(id => ({id}))
  const statuses = {1:'H',2:'S',3:'I',4:'A',5:'T'}
  assert.deepEqual(missingAttendance(students,statuses,3,'2026-08-31'),[{siswa_id:6,kelas_id:3,tanggal:'2026-08-31',status:'H'}])
  assert.deepEqual(statuses,{1:'H',2:'S',3:'I',4:'A',5:'T'})
})
test('complete or empty class does not create new attendance', () => {
  assert.deepEqual(missingAttendance([{id:1}],{1:'S'},1,'2026-09-02'),[])
  assert.deepEqual(missingAttendance([],{},1,'2026-09-02'),[])
})
