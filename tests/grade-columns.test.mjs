import test from 'node:test'
import assert from 'node:assert/strict'
import { orderedGradeColumns, nextDailyLabel } from '../src/shared/grades.ts'

test('ten daily columns keep stable order before UTS/UAS even with legacy duplicate names', () => {
  const daily=Array.from({length:10},(_,i)=>({id:i+1,label:'Harian 1',urutan:i+1}))
  const input=[{id:12,label:'UAS',urutan:0},...daily.toReversed(),{id:11,label:'UTS',urutan:0}]
  assert.deepEqual(orderedGradeColumns(input).map(c=>c.id),[1,2,3,4,5,6,7,8,9,10,11,12])
  assert.equal(input[0].id,12)
})
test('new daily label fills numbering gap without colliding with H aliases', () => {
  assert.equal(nextDailyLabel([{label:'H1'},{label:' Harian 3 '},{label:'UTS'}]),'Harian 2')
  assert.equal(nextDailyLabel(Array.from({length:10},(_,i)=>({label:`Harian ${i+1}`}))),'Harian 11')
})
